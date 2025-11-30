export type AssetCategory =
  | "liquidity"
  | "stocks"
  | "bonds"
  | "commodities"
  | "crypto"
  | "real-estate"
  | "art-collectibles"
  | "private-equity"
  | "direct-holdings"
  | "alternative-energy"
  | "agriculture"

export interface CategoryConfig {
  label: string
  color: string
  keywords: string[]
  theme?: string
  searchContext: string
}

export const assetCategories: Record<AssetCategory, CategoryConfig> = {
  // Liquid Assets
  liquidity: {
    label: "Liquidity",
    color: "#06b6d4",
    keywords: [
      "cash",
      "money market",
      "liquidity",
      "central bank",
      "federal reserve",
      "ECB",
      "monetary policy",
    ],
    theme: "ECON_CENTRALBANK",
    searchContext:
      "central bank policies, interest rates, monetary policy decisions",
  },
  stocks: {
    label: "Stocks",
    color: "#3b82f6",
    keywords: [
      "stock market",
      "equity",
      "shares",
      "nasdaq",
      "dow jones",
      "s&p 500",
      "trading",
    ],
    theme: "ECON_STOCKMARKET",
    searchContext: "stock market movements, equity indices, major company earnings",
  },
  bonds: {
    label: "Bonds",
    color: "#8b5cf6",
    keywords: [
      "bonds",
      "treasury",
      "fixed income",
      "yield",
      "interest rates",
      "government debt",
    ],
    theme: "ECON_BOND",
    searchContext:
      "bond yields, treasury auctions, credit markets, sovereign debt",
  },
  commodities: {
    label: "Commodities",
    color: "#f59e0b",
    keywords: [
      "commodities",
      "gold",
      "silver",
      "oil",
      "natural gas",
      "metals",
      "copper",
    ],
    theme: "ECON_COMMODITY",
    searchContext:
      "commodity prices, resource markets, precious metals, energy markets",
  },
  crypto: {
    label: "Crypto currencies",
    color: "#f97316",
    keywords: [
      "bitcoin",
      "ethereum",
      "cryptocurrency",
      "crypto",
      "blockchain",
      "defi",
      "web3",
    ],
    theme: "CRYPTO",
    searchContext:
      "cryptocurrency markets, blockchain technology, digital assets, crypto regulation",
  },

  // Illiquid Assets
  "real-estate": {
    label: "Real estate",
    color: "#ec4899",
    keywords: [
      "real estate",
      "property",
      "housing market",
      "commercial property",
      "reit",
    ],
    theme: "ECON_REALESTATE",
    searchContext:
      "real estate markets, property prices, commercial real estate, housing data",
  },
  "art-collectibles": {
    label: "Art and collectibles",
    color: "#a855f7",
    keywords: ["art auction", "collectibles", "sotheby", "christie", "luxury goods"],
    searchContext:
      "art market, auction results, collectibles trading, luxury asset valuations",
  },
  "private-equity": {
    label: "Private equity",
    color: "#6366f1",
    keywords: [
      "private equity",
      "venture capital",
      "m&a",
      "acquisitions",
      "buyout",
    ],
    theme: "ECON_VENTURE_CAPITAL",
    searchContext:
      "private equity deals, venture capital funding, mergers and acquisitions",
  },
  "direct-holdings": {
    label: "Direct holdings",
    color: "#14b8a6",
    keywords: ["direct investment", "mezzanine financing", "growth capital"],
    searchContext:
      "direct investments, private placements, growth capital markets",
  },
  "alternative-energy": {
    label: "Alternative energies",
    color: "#10b981",
    keywords: [
      "solar",
      "wind power",
      "renewable energy",
      "clean energy",
      "photovoltaic",
    ],
    theme: "ENV_ENERGY",
    searchContext:
      "renewable energy markets, clean tech investments, green energy policy",
  },
  agriculture: {
    label: "Agriculture and forestry",
    color: "#84cc16",
    keywords: [
      "agriculture",
      "farming",
      "forestry",
      "agribusiness",
      "crop prices",
      "timber",
    ],
    theme: "AGRICULTURE",
    searchContext:
      "agricultural commodity markets, crop yields, farming industry, timber prices",
  },
}
