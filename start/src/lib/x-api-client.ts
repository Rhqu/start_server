/**
 * X API 2.0 Client for fetching tweets.
 * Uses Bearer token authentication with recent search endpoint.
 */

/** X API 2.0 tweet public metrics */
interface XPublicMetrics {
  retweet_count: number;
  reply_count: number;
  like_count: number;
  quote_count?: number;
  bookmark_count?: number;
  impression_count?: number;
}

/** X API 2.0 user public metrics */
interface XUserPublicMetrics {
  followers_count: number;
  following_count: number;
  tweet_count: number;
  listed_count?: number;
}

/** X API 2.0 tweet object */
interface XTweet {
  id: string;
  text: string;
  author_id: string;
  created_at?: string;
  public_metrics?: XPublicMetrics;
}

/** X API 2.0 user object */
interface XUser {
  id: string;
  name: string;
  username: string;
  public_metrics?: XUserPublicMetrics;
}

/** X API 2.0 response includes */
interface XIncludes {
  users?: XUser[];
}

/** X API 2.0 search response */
interface XSearchResponse {
  data?: XTweet[];
  includes?: XIncludes;
  meta?: {
    newest_id?: string;
    oldest_id?: string;
    result_count?: number;
    next_token?: string;
  };
  errors?: Array<{
    title: string;
    detail: string;
    type: string;
  }>;
}

/** Normalized tweet for internal use */
export interface NormalizedXTweet {
  id: string;
  content: string;
  engagement: number;
  author_handle: string;
  author_display_name: string;
  author_followers: number;
  replies_count: number;
  retweets_count: number;
  likes_count: number;
  created_at: string | null;
  url: string;
}

/** Sector query configuration with government policy focus */
interface SectorQueryConfig {
  keywords: string[];      // Sector-specific terms
  policyTerms: string[];   // Government/policy terms
}

const SECTOR_QUERIES: Record<string, SectorQueryConfig> = {
  liquidity: {
    keywords: ['Fed', '"Federal Reserve"', '"interest rates"', '"monetary policy"'],
    policyTerms: ['"rate hike"', '"rate cut"', 'FOMC', 'Powell', '"quantitative easing"', '"central bank"'],
  },
  stocks: {
    keywords: ['"stock market"', '"S&P 500"', 'NYSE', 'equities', 'Dow'],
    policyTerms: ['SEC', 'regulation', 'tariff', '"trade war"', 'antitrust', 'Congress'],
  },
  bonds: {
    keywords: ['treasury', 'bonds', 'yields', '"fixed income"', '"government debt"'],
    policyTerms: ['"debt ceiling"', 'Treasury', '"fiscal policy"', 'deficit', '"bond market"'],
  },
  commodities: {
    keywords: ['oil', 'gold', 'commodities', 'crude', 'metals'],
    policyTerms: ['OPEC', 'sanctions', 'tariff', '"strategic reserve"', '"trade policy"'],
  },
  crypto: {
    keywords: ['bitcoin', 'crypto', 'cryptocurrency', 'ethereum'],
    policyTerms: ['SEC', 'regulation', 'Gensler', 'CFTC', 'enforcement', '"crypto regulation"'],
  },
  'real-estate': {
    keywords: ['housing', '"real estate"', 'mortgage', 'REIT'],
    policyTerms: ['HUD', '"mortgage rates"', '"housing policy"', 'FHA', '"home prices"'],
  },
  'art-collectibles': {
    keywords: ['art', 'auction', 'collectibles', 'Sothebys', 'Christies'],
    policyTerms: ['tariff', 'import', 'tax', 'regulation', 'cultural'],
  },
  'private-equity': {
    keywords: ['"private equity"', '"venture capital"', 'IPO', 'M&A'],
    policyTerms: ['SEC', 'FTC', 'antitrust', 'regulation', 'merger'],
  },
  'direct-holdings': {
    keywords: ['investment', 'acquisition', 'stake', 'ownership'],
    policyTerms: ['CFIUS', 'regulation', 'foreign', 'Commerce', 'Treasury'],
  },
  'alternative-energy': {
    keywords: ['solar', 'renewable', 'EV', '"clean energy"', 'wind'],
    policyTerms: ['IRA', 'DOE', 'EPA', 'subsidies', 'climate', '"energy policy"'],
  },
  agriculture: {
    keywords: ['agriculture', 'farming', 'crops', 'wheat', 'corn'],
    policyTerms: ['USDA', '"farm bill"', 'subsidies', 'tariff', '"food prices"'],
  },
};

/** Government official accounts per sector */
const GOV_ACCOUNTS: Record<string, string[]> = {
  liquidity: ['federalreserve', 'USTreasury', 'NewYorkFed', 'AtlantaFed', 'staboralouisfed'],
  stocks: ['SECGov', 'GaryGensler', 'SECEnforcement'],
  bonds: ['USTreasury', 'federalreserve', 'NewYorkFed'],
  commodities: ['CFTC', 'USDA', 'SecAg'],
  crypto: ['SECGov', 'CFTC', 'GaryGensler'],
  'real-estate': ['HUDgov', 'FHA', 'FHFA'],
  'art-collectibles': ['NEAarts', 'NEHgov'],
  'private-equity': ['SECGov', 'FTC', 'JusticeATR'],
  'direct-holdings': ['CommerceGov', 'SBAgov', 'USTreasury'],
  'alternative-energy': ['ABORADOE', 'EPA', 'ABORAEERE'],
  agriculture: ['USDA', 'SecAg', 'FarmersGov'],
};

/** Quality thresholds */
const MIN_ENGAGEMENT = 100;  // Minimum total engagement (likes + retweets + replies)
const MIN_FOLLOWERS = 10000; // Minimum author followers for non-gov accounts

const X_API_BASE = 'https://api.twitter.com/2';

/**
 * Execute a single X API search query.
 */
async function executeSearch(
  query: string,
  maxResults: number,
  token: string
): Promise<{ data: XSearchResponse | null; error?: string }> {
  const params = new URLSearchParams({
    query,
    max_results: String(Math.min(Math.max(maxResults, 10), 100)),
    'tweet.fields': 'created_at,public_metrics,author_id',
    'user.fields': 'name,username,public_metrics',
    expansions: 'author_id',
  });

  const url = `${X_API_BASE}/tweets/search/recent?${params}`;

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[X API] Query error:', response.status, errorText);
      return { data: null, error: `HTTP ${response.status}` };
    }

    const data: XSearchResponse = await response.json();
    return { data };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { data: null, error: errorMsg };
  }
}

/**
 * Normalize X API response to internal tweet format.
 */
function normalizeTweets(data: XSearchResponse): NormalizedXTweet[] {
  if (!data.data || data.data.length === 0) return [];

  const userMap = new Map<string, XUser>();
  if (data.includes?.users) {
    for (const user of data.includes.users) {
      userMap.set(user.id, user);
    }
  }

  return data.data.map((tweet) => {
    const user = userMap.get(tweet.author_id);
    const metrics = tweet.public_metrics || {
      reply_count: 0,
      retweet_count: 0,
      like_count: 0,
    };

    return {
      id: tweet.id,
      content: tweet.text,
      engagement: metrics.reply_count + metrics.retweet_count + metrics.like_count,
      author_handle: user?.username || 'unknown',
      author_display_name: user?.name || 'Anonymous',
      author_followers: user?.public_metrics?.followers_count || 0,
      replies_count: metrics.reply_count,
      retweets_count: metrics.retweet_count,
      likes_count: metrics.like_count,
      created_at: tweet.created_at || null,
      url: `https://x.com/${user?.username || 'i'}/status/${tweet.id}`,
    };
  });
}

/**
 * Check if a tweet is from a government official account.
 */
function isGovAccount(handle: string, sector: string): boolean {
  const govAccounts = GOV_ACCOUNTS[sector] || [];
  return govAccounts.some(acc => acc.toLowerCase() === handle.toLowerCase());
}

/**
 * Filter tweets for quality: high engagement, high followers, or gov officials.
 */
function filterQualityTweets(tweets: NormalizedXTweet[], sector: string): NormalizedXTweet[] {
  return tweets.filter(tweet =>
    tweet.engagement >= MIN_ENGAGEMENT ||
    tweet.author_followers >= MIN_FOLLOWERS ||
    isGovAccount(tweet.author_handle, sector)
  );
}

/**
 * Search recent tweets for a sector using X API 2.0.
 * Uses government policy-focused queries combining sector + policy terms.
 */
export async function searchXTweets(
  sector: string,
  limit: number = 15,
  bearerToken?: string
): Promise<{ tweets: NormalizedXTweet[]; hashtags: string[]; error?: string }> {
  const token = bearerToken || process.env.X_BEARER_TOKEN;

  if (!token) {
    console.error('[X API] No bearer token provided');
    return { tweets: [], hashtags: [], error: 'X_BEARER_TOKEN not configured' };
  }

  const sectorConfig = SECTOR_QUERIES[sector];
  const govAccounts = GOV_ACCOUNTS[sector];

  if (!sectorConfig) {
    console.error('[X API] Unknown sector:', sector);
    return { tweets: [], hashtags: [], error: `Unknown sector: ${sector}` };
  }

  // Build policy-focused query: (sector terms) AND (policy terms)
  const keywordPart = sectorConfig.keywords.slice(0, 2).join(' OR ');
  const policyPart = sectorConfig.policyTerms.slice(0, 3).join(' OR ');
  const policyQuery = `(${keywordPart}) (${policyPart}) -is:retweet lang:en`;

  // Build government accounts query
  const govQuery = govAccounts?.length
    ? `(${govAccounts.slice(0, 4).map(acc => `from:${acc}`).join(' OR ')}) -is:retweet`
    : null;

  console.log('[X API] Searching sector:', sector);
  console.log('[X API] Policy query:', policyQuery);
  if (govQuery) console.log('[X API] Gov query:', govQuery);

  // Execute queries in parallel
  const queries: Promise<{ data: XSearchResponse | null; error?: string }>[] = [
    executeSearch(policyQuery, 50, token), // Request more to filter
  ];

  if (govQuery) {
    queries.push(executeSearch(govQuery, 20, token));
  }

  const results = await Promise.all(queries);
  const errors: string[] = [];

  // Collect all tweets
  let allTweets: NormalizedXTweet[] = [];

  // Process policy query results
  if (results[0].data) {
    const policyTweets = normalizeTweets(results[0].data);
    console.log('[X API] Policy search returned:', policyTweets.length, 'tweets');
    allTweets.push(...policyTweets);
  } else if (results[0].error) {
    errors.push(`Policy search: ${results[0].error}`);
  }

  // Process gov results
  if (results[1]?.data) {
    const govTweets = normalizeTweets(results[1].data);
    console.log('[X API] Gov search returned:', govTweets.length, 'tweets');
    // Mark gov tweets as high priority by ensuring they pass filter
    allTweets.push(...govTweets);
  } else if (results[1]?.error) {
    errors.push(`Gov search: ${results[1].error}`);
  }

  // Dedupe by tweet ID
  const seenIds = new Set<string>();
  const uniqueTweets = allTweets.filter(tweet => {
    if (seenIds.has(tweet.id)) return false;
    seenIds.add(tweet.id);
    return true;
  });

  console.log('[X API] Unique tweets before filtering:', uniqueTweets.length);

  // Filter for quality
  const qualityTweets = filterQualityTweets(uniqueTweets, sector);
  console.log('[X API] Quality tweets after filtering:', qualityTweets.length);

  // Sort by engagement (gov officials will naturally rank if they have engagement)
  qualityTweets.sort((a, b) => {
    // Prioritize gov accounts slightly
    const aIsGov = isGovAccount(a.author_handle, sector) ? 1 : 0;
    const bIsGov = isGovAccount(b.author_handle, sector) ? 1 : 0;
    if (aIsGov !== bIsGov) return bIsGov - aIsGov;
    return b.engagement - a.engagement;
  });

  // Return top N
  const finalTweets = qualityTweets.slice(0, limit);

  console.log('[X API] Returning', finalTweets.length, 'tweets for sector:', sector);

  return {
    tweets: finalTweets,
    hashtags: sectorConfig.keywords,
    error: errors.length > 0 ? errors.join('; ') : undefined,
  };
}
