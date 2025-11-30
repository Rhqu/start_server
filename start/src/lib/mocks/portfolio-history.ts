/**
 * Mock portfolio history and news event generators for timeline demo
 */

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
  | "technology"
  | "healthcare"
  | "energy"
  | "financials";

export interface PortfolioPoint {
  /** ISO timestamp */
  time: string;
  /** Portfolio value in EUR */
  value: number;
}

export interface NewsEvent {
  title: string;
  time: string;
  description: string;
  category: AssetCategory;
  sentiment: "positive" | "negative" | "neutral";
  impact: number; // -1 to 1 scale
}

export interface CorrelationResult {
  category: AssetCategory;
  correlation: number; // -1 to 1
  volatility: number; // percentage
  newsCount: number;
  sentiment: "bullish" | "bearish" | "mixed";
  keyDrivers: string[];
}

// Asset category metadata - DEPRECATED: Use @/lib/config/asset-categories instead
// Keeping for backward compatibility with existing mock data
export const assetCategoriesLegacy: Record<string, { label: string; color: string }> = {
  technology: { label: "Technology", color: "#3b82f6" },
  healthcare: { label: "Healthcare", color: "#22c55e" },
  energy: { label: "Energy", color: "#f97316" },
  financials: { label: "Financials", color: "#a855f7" },
};

/**
 * Generate mock portfolio history with realistic-looking fluctuations
 * Includes special volatility periods for specific scenarios
 */
export function generateMockPortfolioHistory(
  startDate: Date,
  endDate: Date,
  points: number = 100,
  category: AssetCategory = "technology",
  seed: number = 1
): PortfolioPoint[] {
  const result: PortfolioPoint[] = [];
  const startTime = startDate.getTime();
  const endTime = endDate.getTime();
  const interval = (endTime - startTime) / (points - 1);

  const baseValues: Record<string, number> = {
    technology: 150000,
    healthcare: 120000,
    energy: 80000,
    financials: 100000,
    liquidity: 50000,
    stocks: 150000,
    bonds: 80000,
    commodities: 70000,
    crypto: 30000,
    "real-estate": 200000,
    "art-collectibles": 100000,
    "private-equity": 180000,
    "direct-holdings": 120000,
    "alternative-energy": 90000,
    agriculture: 60000,
  };

  let value = baseValues[category] || 100000;

  const seededRandom = (s: number) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };

  for (let i = 0; i < points; i++) {
    const time = new Date(startTime + interval * i);
    const month = time.getMonth();

    let volatilityMultiplier = 1;
    let driftAdjust = 0;

    // Technology: High volatility May-July (tariff impact)
    if (category === "technology" && month >= 4 && month <= 6) {
      volatilityMultiplier = 3.5;
      driftAdjust = -0.15;
    }

    // Energy: volatility in winter
    if (category === "energy" && (month >= 10 || month <= 1)) {
      volatilityMultiplier = 2;
    }

    // Healthcare: more stable
    if (category === "healthcare") {
      volatilityMultiplier = 0.6;
    }

    const baseChange = (seededRandom(seed + i * 7 + category.length) - 0.48 + driftAdjust) * 2500;
    const change = baseChange * volatilityMultiplier;
    const minValue = (baseValues[category] || 100000) * 0.5;
    value = Math.max(minValue, value + change);

    result.push({
      time: time.toISOString(),
      value: Math.round(value * 100) / 100,
    });
  }

  return result;
}

// Pre-generated mock data for each category (past year)
const oneYearAgo = new Date();
oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

export const mockPortfolioByCategory: Partial<Record<AssetCategory, PortfolioPoint[]>> = {
  // Legacy categories (with special logic in generation function)
  technology: generateMockPortfolioHistory(oneYearAgo, new Date(), 365, "technology", 42),
  healthcare: generateMockPortfolioHistory(oneYearAgo, new Date(), 365, "healthcare", 123),
  energy: generateMockPortfolioHistory(oneYearAgo, new Date(), 365, "energy", 789),
  financials: generateMockPortfolioHistory(oneYearAgo, new Date(), 365, "financials", 456),

  // New categories (using generic generation logic)
  liquidity: generateMockPortfolioHistory(oneYearAgo, new Date(), 365, "liquidity" as any, 101),
  stocks: generateMockPortfolioHistory(oneYearAgo, new Date(), 365, "stocks" as any, 202),
  bonds: generateMockPortfolioHistory(oneYearAgo, new Date(), 365, "bonds" as any, 303),
  commodities: generateMockPortfolioHistory(oneYearAgo, new Date(), 365, "commodities" as any, 404),
  crypto: generateMockPortfolioHistory(oneYearAgo, new Date(), 365, "crypto" as any, 505),
  "real-estate": generateMockPortfolioHistory(oneYearAgo, new Date(), 365, "real-estate" as any, 606),
  "art-collectibles": generateMockPortfolioHistory(oneYearAgo, new Date(), 365, "art-collectibles" as any, 707),
  "private-equity": generateMockPortfolioHistory(oneYearAgo, new Date(), 365, "private-equity" as any, 808),
  "direct-holdings": generateMockPortfolioHistory(oneYearAgo, new Date(), 365, "direct-holdings" as any, 909),
  "alternative-energy": generateMockPortfolioHistory(oneYearAgo, new Date(), 365, "alternative-energy" as any, 111),
  agriculture: generateMockPortfolioHistory(oneYearAgo, new Date(), 365, "agriculture" as any, 222),
};

export const mockPortfolioHistory = mockPortfolioByCategory.technology;

// Category-specific news databases
const technologyNews: Omit<NewsEvent, "time">[] = [
  {
    title: "US Announces New Tariffs on Chinese Tech Imports",
    description: "The administration unveiled sweeping tariffs targeting semiconductors, consumer electronics, and tech components from China, sending shockwaves through global supply chains.",
    category: "technology",
    sentiment: "negative",
    impact: -0.8,
  },
  {
    title: "China Retaliates with Export Restrictions on Rare Earths",
    description: "Beijing responds to US tariffs by limiting exports of critical rare earth minerals essential for chip manufacturing.",
    category: "technology",
    sentiment: "negative",
    impact: -0.7,
  },
  {
    title: "Tech Giants Warn of Supply Chain Disruptions",
    description: "Apple, NVIDIA, and Microsoft issue profit warnings citing tariff-related cost increases and delivery delays.",
    category: "technology",
    sentiment: "negative",
    impact: -0.6,
  },
  {
    title: "Semiconductor Stocks Plunge on Tariff Uncertainty",
    description: "Philadelphia Semiconductor Index drops 8% as investors flee chip stocks amid escalating trade tensions.",
    category: "technology",
    sentiment: "negative",
    impact: -0.9,
  },
  {
    title: "Trade Talks Resume, Markets Cautiously Optimistic",
    description: "US and China agree to restart negotiations, providing temporary relief to battered tech stocks.",
    category: "technology",
    sentiment: "positive",
    impact: 0.4,
  },
  {
    title: "NVIDIA Reports Record AI Revenue Despite Headwinds",
    description: "Data center demand for AI chips offsets some tariff impacts as NVIDIA beats earnings expectations.",
    category: "technology",
    sentiment: "positive",
    impact: 0.6,
  },
  {
    title: "Apple Accelerates Vietnam Production Shift",
    description: "iPhone maker speeds up supply chain diversification to reduce China exposure amid ongoing trade war.",
    category: "technology",
    sentiment: "neutral",
    impact: 0.2,
  },
  {
    title: "EU Proposes Tech Sovereignty Initiative",
    description: "European Commission unveils €50B plan to boost domestic chip manufacturing and reduce US/Asia dependence.",
    category: "technology",
    sentiment: "neutral",
    impact: 0.1,
  },
];

const healthcareNews: Omit<NewsEvent, "time">[] = [
  {
    title: "FDA Approves Breakthrough Alzheimer's Treatment",
    description: "Eli Lilly receives approval for novel therapy showing significant cognitive improvement in clinical trials.",
    category: "healthcare",
    sentiment: "positive",
    impact: 0.7,
  },
  {
    title: "Medicare Drug Price Negotiations Begin",
    description: "Government starts historic negotiations on prices for 10 high-cost medications under Inflation Reduction Act.",
    category: "healthcare",
    sentiment: "negative",
    impact: -0.5,
  },
  {
    title: "Pfizer Acquires Cancer Biotech for $43B",
    description: "Pharmaceutical giant expands oncology portfolio with major acquisition, signaling sector consolidation.",
    category: "healthcare",
    sentiment: "positive",
    impact: 0.4,
  },
  {
    title: "Healthcare Spending Growth Slows",
    description: "CMS reports lowest increase in healthcare expenditures in a decade, raising margin concerns for providers.",
    category: "healthcare",
    sentiment: "negative",
    impact: -0.3,
  },
  {
    title: "Weight Loss Drug Demand Surges",
    description: "Novo Nordisk and Eli Lilly struggle to meet unprecedented demand for GLP-1 medications.",
    category: "healthcare",
    sentiment: "positive",
    impact: 0.8,
  },
  {
    title: "Biotech IPO Window Opens",
    description: "Several biotech companies successfully price IPOs as investor appetite returns to the sector.",
    category: "healthcare",
    sentiment: "positive",
    impact: 0.3,
  },
];

const energyNews: Omit<NewsEvent, "time">[] = [
  {
    title: "OPEC+ Announces Production Cuts",
    description: "Oil cartel agrees to reduce output by 2 million barrels per day, sending crude prices higher.",
    category: "energy",
    sentiment: "positive",
    impact: 0.7,
  },
  {
    title: "US Strategic Reserve Release Pressures Prices",
    description: "Biden administration authorizes additional 50 million barrel release to combat high gasoline prices.",
    category: "energy",
    sentiment: "negative",
    impact: -0.5,
  },
  {
    title: "European Gas Prices Spike on Supply Concerns",
    description: "TTF natural gas futures surge 30% as pipeline maintenance raises winter shortage fears.",
    category: "energy",
    sentiment: "positive",
    impact: 0.6,
  },
  {
    title: "Renewable Energy Investment Hits Record",
    description: "Global clean energy spending surpasses $500B for first time, pressuring traditional energy valuations.",
    category: "energy",
    sentiment: "negative",
    impact: -0.4,
  },
  {
    title: "Major Oil Discovery in Guyana",
    description: "ExxonMobil announces 10th significant find in Stabroek Block, boosting long-term production outlook.",
    category: "energy",
    sentiment: "positive",
    impact: 0.5,
  },
  {
    title: "Carbon Tax Proposals Gain Momentum",
    description: "G20 nations discuss coordinated carbon pricing, raising concerns for fossil fuel producers.",
    category: "energy",
    sentiment: "negative",
    impact: -0.6,
  },
];

const financialsNews: Omit<NewsEvent, "time">[] = [
  {
    title: "Fed Signals Rate Cuts Coming",
    description: "Federal Reserve Chair indicates pivot to monetary easing as inflation cools, boosting bank stocks.",
    category: "financials",
    sentiment: "positive",
    impact: 0.7,
  },
  {
    title: "Regional Bank Concerns Resurface",
    description: "Commercial real estate exposure raises concerns about smaller banks' balance sheet health.",
    category: "financials",
    sentiment: "negative",
    impact: -0.6,
  },
  {
    title: "JPMorgan Reports Record Trading Revenue",
    description: "Largest US bank beats estimates on strong fixed income and equity trading performance.",
    category: "financials",
    sentiment: "positive",
    impact: 0.5,
  },
  {
    title: "Basel III Endgame Rules Delayed",
    description: "Regulators postpone stricter capital requirements, providing relief to large banks.",
    category: "financials",
    sentiment: "positive",
    impact: 0.4,
  },
  {
    title: "Credit Card Delinquencies Rise",
    description: "Consumer credit stress indicators climb to post-pandemic highs, raising loss provision concerns.",
    category: "financials",
    sentiment: "negative",
    impact: -0.5,
  },
  {
    title: "M&A Activity Rebounds in Financial Sector",
    description: "Investment banking fees surge as deal-making recovers after two-year slump.",
    category: "financials",
    sentiment: "positive",
    impact: 0.6,
  },
];

const newsByCategory: Record<AssetCategory, Omit<NewsEvent, "time">[]> = {
  technology: technologyNews,
  healthcare: healthcareNews,
  energy: energyNews,
  financials: financialsNews,
};

/**
 * Generate mock news events for a given time range and category
 */
export function generateMockNewsEvents(
  start: Date,
  end: Date,
  category: AssetCategory,
  count: number = 5
): NewsEvent[] {
  const startTime = start.getTime();
  const endTime = end.getTime();
  const duration = endTime - startTime;

  const categoryNews = newsByCategory[category];

  let newsPool = [...categoryNews];
  const startMonth = start.getMonth();
  const endMonth = end.getMonth();

  // For technology May-July, prioritize tariff-related (negative) news
  if (category === "technology" && startMonth >= 4 && endMonth <= 6) {
    newsPool = newsPool.sort((a, b) => a.impact - b.impact);
  } else {
    newsPool = newsPool.sort(() => Math.random() - 0.5);
  }

  const selected = newsPool.slice(0, Math.min(count, newsPool.length));

  return selected
    .map((event, index) => {
      const offset = (duration / (count + 1)) * (index + 1);
      const jitter = (Math.random() - 0.5) * (duration / count / 2);
      const eventTime = new Date(startTime + offset + jitter);
      return {
        ...event,
        time: eventTime.toISOString(),
      };
    })
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
}

/**
 * Calculate correlation between news sentiment and price movement
 */
export function calculateCorrelation(
  data: PortfolioPoint[],
  events: NewsEvent[],
  start: Date,
  end: Date,
  category: AssetCategory
): CorrelationResult {
  const filteredData = data.filter((p) => {
    const t = new Date(p.time).getTime();
    return t >= start.getTime() && t <= end.getTime();
  });

  if (filteredData.length < 2) {
    return {
      category,
      correlation: 0,
      volatility: 0,
      newsCount: events.length,
      sentiment: "mixed",
      keyDrivers: [],
    };
  }

  const returns: number[] = [];
  for (let i = 1; i < filteredData.length; i++) {
    const ret = (filteredData[i].value - filteredData[i - 1].value) / filteredData[i - 1].value;
    returns.push(ret);
  }

  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance) * Math.sqrt(252) * 100;

  const avgImpact = events.length > 0
    ? events.reduce((sum, e) => sum + e.impact, 0) / events.length
    : 0;

  const startMonth = start.getMonth();
  const endMonth = end.getMonth();

  let correlation: number;
  let keyDrivers: string[];

  if (category === "technology" && startMonth >= 4 && endMonth <= 6) {
    correlation = -0.85;
    keyDrivers = [
      "US-China tariff escalation",
      "Supply chain disruptions",
      "Semiconductor export restrictions",
      "Trade policy uncertainty",
    ];
  } else if (category === "healthcare") {
    correlation = 0.45;
    keyDrivers = ["FDA approvals", "Drug pricing policy", "M&A activity"];
  } else if (category === "energy") {
    correlation = 0.72;
    keyDrivers = ["OPEC production decisions", "Geopolitical tensions", "Seasonal demand"];
  } else {
    correlation = 0.55;
    keyDrivers = ["Interest rate policy", "Credit conditions", "Regulatory environment"];
  }

  correlation = Math.max(-1, Math.min(1, correlation + (Math.random() - 0.5) * 0.1));

  const sentiment: "bullish" | "bearish" | "mixed" =
    avgImpact > 0.2 ? "bullish" : avgImpact < -0.2 ? "bearish" : "mixed";

  return {
    category,
    correlation: Math.round(correlation * 100) / 100,
    volatility: Math.round(volatility * 10) / 10,
    newsCount: events.length,
    sentiment,
    keyDrivers,
  };
}
