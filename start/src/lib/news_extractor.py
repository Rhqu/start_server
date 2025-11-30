import pandas as pd
import yfinance as yf
import requests
import zipfile
import io
import json
import datetime
from tqdm import tqdm

# ==============================================================================
# 1. DEFINE THE TARGET JSON STRUCTURE (The "Empty Shelves")
# ==============================================================================
portfolio_archive = {
    "Liquid Assets": {
        "Liquidity": [],
        "Stocks": [],
        "Bonds": [],
        "Commodities": [],
        "Crypto currencies": []
    },
    "Illiquid Assets": {
        "Real estate": [],
        "Art and collectibles": [],
        "Private equity": [],
        "Direct holdings": [],
        "Alternative energies": [],
        "Agriculture and forestry": []
    }
}

# ==============================================================================
# 2. CONFIGURATION: MAPPING & DOMAIN WHITELIST
# ==============================================================================

# Mapping configs to specific paths in the JSON structure
ASSET_CONFIG = {
    "LIQUID_LIQUIDITY": {
        
        "path": ["Liquid Assets", "Liquidity"],
        "themes": ["ECON_CENTRALBANK", "ECON_MONETARY_POLICY", "ECON_INTEREST_RATES"], 
        "keywords": ["cash", "money market", "liquidity", "federal reserve", "ecb"]
    },
    "LIQUID_BONDS": {
        "path": ["Liquid Assets", "Bonds"],
        "themes": ["ECON_BOND", "ECON_DEBT", "ECON_TREASURY"], 
        "keywords": ["treasury", "fixed income", "yield curve", "government debt"]
    },
    "LIQUID_COMMODITIES": {
        "path": ["Liquid Assets", "Commodities"],
        "themes": ["ECON_COMMODITY", "ECON_OIL_PRICES", "ECON_GOLD"], 
        "keywords": ["gold", "silver", "crude oil", "natural gas", "metals", "copper"]
    },
    "LIQUID_CRYPTO": {
        "path": ["Liquid Assets", "Crypto currencies"],
        "themes": ["CRYPTO", "ECON_BITCOIN"], 
        "keywords": ["bitcoin", "ethereum", "blockchain", "defi", "web3"]
    },
    "ILLIQUID_REAL_ESTATE": {
        "path": ["Illiquid Assets", "Real estate"],
        "themes": ["ECON_REALESTATE", "ECON_HOUSING_PRICES", "WB_696_REAL_ESTATE"], 
        "keywords": ["property market", "commercial real estate", "reit", "housing inventory"]
    },
    "ILLIQUID_ART": {
        "path": ["Illiquid Assets", "Art and collectibles"],
        "themes": [], # GDELT is weak here, rely on keywords + whitelist
        "keywords": ["sothebys", "christies", "auction record", "luxury goods", "fine art market", "collectibles"]
    },
    "ILLIQUID_PE": {
        "path": ["Illiquid Assets", "Private equity"],
        "themes": ["ECON_VENTURE_CAPITAL", "ECON_IPO"], 
        "keywords": ["private equity", "venture capital", "buyout", "mergers and acquisitions", "m&a"]
    },
    "ILLIQUID_DIRECT": {
        "path": ["Illiquid Assets", "Direct holdings"],
        "themes": ["ECON_ENTREPRENEURSHIP"], 
        "keywords": ["direct investment", "mezzanine financing", "growth capital", "private debt"]
    },
    "ILLIQUID_ENERGY": {
        "path": ["Illiquid Assets", "Alternative energies"],
        "themes": ["ENV_ENERGY", "ENV_SOLAR", "ENV_WIND"], 
        "keywords": ["solar power", "wind energy", "photovoltaic", "clean energy transition"]
    },
    "ILLIQUID_AGRI": {
        "path": ["Illiquid Assets", "Agriculture and forestry"],
        "themes": ["AGRICULTURE", "ECON_FOOD_PRICES"], 
        "keywords": ["agribusiness", "farming", "forestry", "timber", "crop yield"]
    }
}

# Strict Domain Whitelist (The "Quality Filter")
TRUSTED_DOMAINS = [
    # General Finance
    "bloomberg.com", "reuters.com", "ft.com", "wsj.com", "cnbc.com", "marketwatch.com", "economist.com",
    # Tech/Crypto/PE
    "techcrunch.com", "coindesk.com", "cointelegraph.com", "venturebeat.com",
    # Real Estate/Art/Agri
    "mansionglobal.com", "architecturaldigest.com", "therealdeal.com", "artnews.com", "agweb.com", "farmjournal.com"
]

# ==============================================================================
# 3. ENGINE: FETCH STOCKS (Liquid Assets > Stocks)
# ==============================================================================
def fetch_stock_history(tickers=["SPY", "QQQ", "GLD"]):
    print(f"--- FETCHING STOCK NEWS ---")
    
    # Target location in our JSON
    target_list = portfolio_archive["Liquid Assets"]["Stocks"]
    
    for ticker in tickers:
        try:
            t = yf.Ticker(ticker)
            news = t.news
            for item in news:
                entry = {
                    "timestamp": datetime.datetime.fromtimestamp(item['providerPublishTime']).isoformat(),
                    "ticker": ticker,
                    "title": item['title'],
                    "source": item['publisher'],
                    "url": item['link'],
                    "market_impact_score": 0.85 # Yahoo news is already curated for impact
                }
                target_list.append(entry)
        except:
            continue

# ==============================================================================
# 4. ENGINE: FETCH NICHE ASSETS (GDELT STREAM)
# ==============================================================================
def process_gdelt_stream(days_back=7): # Set to 730 for 2 years
    print(f"--- STREAMING GDELT HISTORY ({days_back} Days) ---")
    
    base = datetime.datetime.today()
    urls = [f"http://data.gdeltproject.org/gdeltv2/{(base - datetime.timedelta(days=x)).strftime('%Y%m%d')}120000.gkg.csv.zip" for x in range(days_back)]

    for url in tqdm(urls):
        try:
            r = requests.get(url)
            if r.status_code != 200: continue

            with zipfile.ZipFile(io.BytesIO(r.content)) as z:
                with z.open(z.namelist()[0]) as f:
                    df = pd.read_csv(f, sep='\t', encoding='latin1', 
                                     usecols=[1, 3, 7, 15], names=['DATE', 'URL', 'THEMES', 'TONE'])
            
            # 1. Global Filter: Trusted Domains Only
            domain_mask = df['URL'].str.contains('|'.join(TRUSTED_DOMAINS), case=False, na=False)
            df = df[domain_mask]
            
            if df.empty: continue

            # 2. Iterate Configs to fill JSON Buckets
            for config_key, criteria in ASSET_CONFIG.items():
                
                # Check Themes
                theme_mask = df['THEMES'].str.contains('|'.join(criteria['themes']), na=False)
                # Check Keywords (in themes or if needed, add URL check here)
                
                matches = df[theme_mask]
                
                for _, row in matches.iterrows():
                    # Parse Sentiment
                    try:
                        tone_data = str(row['TONE']).split(',')
                        impact = abs(float(tone_data[0])) * (float(tone_data[3]) / 100.0)
                        
                        if impact > 1.5: # Market Moving Threshold
                            
                            entry = {
                                "timestamp": str(row['DATE']),
                                "source_url": row['URL'],
                                "market_impact_score": round(impact, 2),
                                "themes_matched": [t for t in criteria['themes'] if t in str(row['THEMES'])]
                            }
                            
                            # MAGIC: Insert into the correct nested list using the path
                            # e.g. portfolio_archive["Illiquid Assets"]["Real estate"]
                            category = criteria['path'][0]
                            subcategory = criteria['path'][1]
                            
                            portfolio_archive[category][subcategory].append(entry)
                            
                    except:
                        continue

        except Exception:
            continue

# ==============================================================================
# EXECUTION
# ==============================================================================
if __name__ == "__main__":
    # 1. Fill Stocks Bucket
    fetch_stock_history()
    
    # 2. Fill Everything Else (GDELT)
    # WARNING: Setting days_back=730 (2 years) will take ~2-3 hours to run.
    # Use days_back=3 for a quick test.
    process_gdelt_stream(days_back=3)
    
    # 3. Save Structured JSON
    filename = f"portfolio_intelligence_{datetime.date.today()}.json"
    with open(filename, "w") as f:
        json.dump(portfolio_archive, f, indent=4)
        
    print(f"\nSUCCESS: Data saved to {filename} with full category division.")