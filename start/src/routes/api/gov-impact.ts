import { createFileRoute } from "@tanstack/react-router";
import { openai } from "@ai-sdk/openai";
import { stepCountIs, streamText, tool } from "ai";
import { z } from "zod";
import { getConnectors, fetchConnectorData, formatConnectorDataForAI } from "@/lib/connector-service";
import type { AssetCategory } from "@/lib/config/asset-categories";
import {
  type SocialPost,
  type TruthSocialRawPost,
  type TwitterRawPost,
  type SocialApiResponse,
  type CombinedPostsResult,
  normalizeTruthSocialPost,
  normalizeTwitterPost,
  filterQualityPosts,
  TRUTHSOCIAL_API_BASE,
  MIN_POSTS_PER_SOURCE,
} from "@/lib/types/social-post";
import { searchXTweets } from "@/lib/x-api-client";

// In-memory cache for sector data (5-minute TTL)
const sectorCache = new Map<string, { data: CombinedPostsResult & { connectorContext: string }; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

/** Valid sector types */
const VALID_SECTORS = [
  "liquidity",
  "stocks",
  "bonds",
  "commodities",
  "crypto",
  "real-estate",
  "art-collectibles",
  "private-equity",
  "direct-holdings",
  "alternative-energy",
  "agriculture",
] as const;

type ValidSector = (typeof VALID_SECTORS)[number];

/**
 * Fetch posts from Truth Social API.
 */
async function fetchTruthSocialPosts(
  sector: string,
  limit: number
): Promise<{ posts: TruthSocialRawPost[]; hashtags: string[]; error?: string }> {
  try {
    const response = await fetch(
      `${TRUTHSOCIAL_API_BASE}/sectors/${sector}/trending?limit=${limit}`
    );

    if (!response.ok) {
      console.log("[GovImpact] Truth Social API error:", response.status);
      return { posts: [], hashtags: [], error: `HTTP ${response.status}` };
    }

    const data = (await response.json()) as SocialApiResponse;
    console.log("[GovImpact] Truth Social returned", data.posts?.length || 0, "posts");

    return {
      posts: (data.posts || []) as TruthSocialRawPost[],
      hashtags: data.hashtags || [],
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[GovImpact] Truth Social fetch error:", errorMsg);
    return { posts: [], hashtags: [], error: errorMsg };
  }
}

/**
 * Fetch posts from X API 2.0 directly.
 */
async function fetchTwitterPosts(
  sector: string,
  limit: number
): Promise<{ posts: TwitterRawPost[]; hashtags: string[]; error?: string }> {
  console.log("[GovImpact] Fetching from X API 2.0 for sector:", sector);

  const result = await searchXTweets(sector, limit);

  if (result.error) {
    console.log("[GovImpact] X API error:", result.error);
    return { posts: [], hashtags: result.hashtags, error: result.error };
  }

  console.log("[GovImpact] X API returned", result.tweets.length, "tweets");

  return {
    posts: result.tweets as TwitterRawPost[],
    hashtags: result.hashtags,
  };
}

/**
 * Fetch connector data for government analytics.
 */
async function fetchGovConnectorData(sector: string): Promise<string> {
  try {
    const allConnectors = await getConnectors();
    const govConnectors = allConnectors.filter(
      (c) =>
        c.enabled &&
        c.categories.includes(sector as AssetCategory) &&
        c.tools?.includes("government")
    );

    console.log(
      "[GovImpact] Found",
      govConnectors.length,
      "government connectors for sector:",
      sector
    );

    if (govConnectors.length === 0) return "";

    const results = await Promise.all(
      govConnectors.map((c) => fetchConnectorData(c))
    );
    return formatConnectorDataForAI(results);
  } catch (err) {
    console.error("[GovImpact] Connector fetch error:", err);
    return "";
  }
}

/**
 * Combine and normalize posts from both sources.
 */
function combineAndNormalizePosts(
  truthSocialPosts: TruthSocialRawPost[],
  twitterPosts: TwitterRawPost[],
  truthSocialHashtags: string[],
  twitterHashtags: string[]
): CombinedPostsResult {
  const errors: string[] = [];

  // Normalize Truth Social posts
  const normalizedTruthSocial: SocialPost[] = truthSocialPosts.map((post, idx) =>
    normalizeTruthSocialPost(post, idx)
  );

  // Normalize Twitter posts (start citation IDs after Truth Social)
  const twitterStartIdx = normalizedTruthSocial.length;
  const normalizedTwitter: SocialPost[] = twitterPosts.map((post, idx) =>
    normalizeTwitterPost(post, twitterStartIdx + idx)
  );

  // Filter for quality
  const qualityTruthSocial = filterQualityPosts(normalizedTruthSocial);
  const qualityTwitter = filterQualityPosts(normalizedTwitter);

  console.log(
    "[GovImpact] Quality posts - TruthSocial:",
    qualityTruthSocial.length,
    "Twitter:",
    qualityTwitter.length
  );

  // Log availability but don't treat as errors - sources may be unavailable
  if (qualityTruthSocial.length === 0) {
    console.log("[GovImpact] No Truth Social posts available");
  }
  if (qualityTwitter.length === 0) {
    console.log("[GovImpact] No Twitter posts available");
  }

  // Warn only if we have no posts at all
  if (qualityTruthSocial.length === 0 && qualityTwitter.length === 0) {
    errors.push("No quality posts available from any source");
  }

  // Combine all available posts
  const combinedPosts: SocialPost[] = [];

  // Add all Truth Social posts
  combinedPosts.push(...qualityTruthSocial);

  // Add all Twitter posts
  combinedPosts.push(...qualityTwitter);

  // Re-assign citation IDs after combining
  combinedPosts.forEach((post, idx) => {
    post.citationId = idx + 1;
  });

  // Combine hashtags (deduplicate)
  const allHashtags = [...new Set([...truthSocialHashtags, ...twitterHashtags])];

  return {
    posts: combinedPosts,
    truthSocialCount: qualityTruthSocial.length,
    twitterCount: qualityTwitter.length,
    hashtags: allHashtags,
    errors,
  };
}

const governmentImpactTool = tool({
  description:
    "Fetches trending posts from Truth Social AND Twitter for a market sector to analyze US government impact.",
  inputSchema: z.object({
    sector: z
      .enum(VALID_SECTORS)
      .describe("The asset category to analyze"),
    limit: z
      .number()
      .int()
      .min(10)
      .max(30)
      .default(15)
      .describe("Number of posts to fetch per source (minimum 10 to ensure at least 5 quality posts each)"),
  }),
  execute: async ({ sector, limit }): Promise<{
    sector: string;
    posts: SocialPost[];
    postCount: number;
    truthSocialCount: number;
    twitterCount: number;
    hashtags: string[];
    connectorContext: string;
    errors: string[];
  }> => {
    console.log("[GovImpact Tool] Fetching posts for sector:", sector, "limit:", limit);

    // Validate sector
    if (!sector || !VALID_SECTORS.includes(sector as ValidSector)) {
      console.log("[GovImpact Tool] Invalid sector:", sector);
      return {
        sector: sector || "unknown",
        posts: [],
        postCount: 0,
        truthSocialCount: 0,
        twitterCount: 0,
        hashtags: [],
        connectorContext: "",
        errors: ["Invalid sector specified"],
      };
    }

    // Check cache first
    const cacheKey = `${sector}-${limit}`;
    const cached = sectorCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log("[GovImpact Tool] Returning cached data for:", sector);
      return {
        sector,
        posts: cached.data.posts,
        postCount: cached.data.posts.length,
        truthSocialCount: cached.data.truthSocialCount,
        twitterCount: cached.data.twitterCount,
        hashtags: cached.data.hashtags,
        connectorContext: cached.data.connectorContext,
        errors: cached.data.errors,
      };
    }

    // Fetch from all sources in parallel
    const [truthSocialResult, twitterResult, connectorData] = await Promise.all([
      fetchTruthSocialPosts(sector, limit),
      fetchTwitterPosts(sector, limit),
      fetchGovConnectorData(sector),
    ]);

    // Track fetch errors
    const fetchErrors: string[] = [];
    if (truthSocialResult.error) {
      fetchErrors.push(`Truth Social: ${truthSocialResult.error}`);
    }
    if (twitterResult.error) {
      fetchErrors.push(`Twitter: ${twitterResult.error}`);
    }

    // Combine and normalize posts
    const combined = combineAndNormalizePosts(
      truthSocialResult.posts,
      twitterResult.posts,
      truthSocialResult.hashtags,
      twitterResult.hashtags
    );

    // Merge errors
    const allErrors = [...fetchErrors, ...combined.errors];

    console.log("[GovImpact Tool] Combined result:", {
      totalPosts: combined.posts.length,
      truthSocial: combined.truthSocialCount,
      twitter: combined.twitterCount,
      errors: allErrors.length,
    });

    if (combined.posts[0]) {
      console.log(
        "[GovImpact Tool] Sample post:",
        combined.posts[0].source,
        "-",
        combined.posts[0].content?.substring(0, 150)
      );
    }

    const result = {
      ...combined,
      connectorContext: connectorData,
    };

    // Cache the result
    sectorCache.set(cacheKey, { data: result, timestamp: Date.now() });

    return {
      sector,
      posts: combined.posts,
      postCount: combined.posts.length,
      truthSocialCount: combined.truthSocialCount,
      twitterCount: combined.twitterCount,
      hashtags: combined.hashtags,
      connectorContext: connectorData,
      errors: allErrors,
    };
  },
});

const systemPrompt = `You are an unbiased political and economic analyst. Your task is to analyze social media posts from available sources (Truth Social and/or Twitter), plus external news sources, to understand how US government actions, policies, or statements are affecting a specific market sector.

When the user asks you to analyze a sector:
1. FIRST call the governmentImpact tool with limit=15 to fetch trending posts from available platforms
2. The tool returns posts with a "source" field indicating "truthsocial" or "twitter"
3. The tool also returns "connectorContext" containing news/data from external sources
4. The tool returns "truthSocialCount" and "twitterCount" showing how many posts from each source
5. Analyze ALL available data sources for government-related content: tariffs, regulations, executive orders, legislation, Fed policy, trade deals, sanctions, subsidies, taxes, etc.

Your response MUST be valid JSON with this exact structure:
{
  "sentiment": {
    "overall": "bullish" | "bearish" | "neutral" | "mixed",
    "score": -1.0 to 1.0,
    "explanation": "Brief explanation of the sentiment score"
  },
  "summary": "3-5 sentence comprehensive summary combining insights from available social media sources and external news",
  "governmentActions": ["action1", "action2", ...],
  "citations": [
    {
      "postId": 1,
      "quote": "relevant excerpt from post (50-150 chars)",
      "sentiment": "bullish" | "bearish" | "neutral",
      "source": "truthsocial" | "twitter",
      "author_handle": "copy from post data",
      "author_display_name": "copy from post data",
      "replies_count": 0,
      "reblogs_count": 0,
      "favourites_count": 0
    }
  ],
  "externalInsights": "Summary of key insights from external news sources (connectorContext). Include specific headlines or data points. If no connector data, say 'No external news sources configured.'",
  "keyTakeaways": ["takeaway1", "takeaway2", "takeaway3"],
  "sourceBreakdown": {
    "truthSocial": 5,
    "twitter": 0
  }
}

CRITICAL REQUIREMENTS:
- Include citations from ALL available sources (check truthSocialCount and twitterCount)
- If Truth Social has posts, include at least 5 citations from it
- If Twitter has posts, include at least 5 citations from it
- If only one source is available, include at least 5 citations from that source
- Total citations should be at least 5 (more if multiple sources available)
- For each citation, include the "source" field indicating where it came from
- Analyze and reference the connectorContext data in externalInsights if available
- Be objective and factual. Do not inject political bias.
- Present evidence from multiple perspectives if available.
- For each citation, copy author_handle, author_display_name, replies_count, reblogs_count, and favourites_count directly from the post data.
- The sentiment score should be: -1.0 (very bearish) to 1.0 (very bullish), 0 is neutral.
- sourceBreakdown should reflect the actual number of citations from each platform (can be 0 if unavailable)

Do not include any text outside the JSON object. Do not wrap in markdown code blocks.`;

export const Route = createFileRoute("/api/gov-impact")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        console.log("[API] /api/gov-impact POST request received");

        // Check for API key
        if (!process.env.OPENAI_API_KEY) {
          console.error("[API] OPENAI_API_KEY is not set!");
          return new Response(
            JSON.stringify({ error: "OPENAI_API_KEY is not configured" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        try {
          const body = (await request.json()) as { messages: Array<{ role: string; content: string }> };
          const { messages } = body;
          console.log("[API] Messages:", JSON.stringify(messages, null, 2));

          // Convert simple messages to CoreMessage format
          const coreMessages = messages.map((msg) => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          }));

          const result = streamText({
            model: openai("gpt-4o"),
            system: systemPrompt,
            messages: coreMessages,
            tools: {
              governmentImpact: governmentImpactTool,
            },
            toolChoice: "auto",
            stopWhen: stepCountIs(4),
            onStepFinish: (step) => {
              console.log("[API] Step finished:", {
                stepType: step.stepType,
                text: step.text?.substring(0, 500),
                toolCalls: step.toolCalls?.map((tc) => ({
                  toolName: tc.toolName,
                  args: tc.args,
                })),
              });
            },
          });

          console.log("[API] Returning text stream response");
          return result.toTextStreamResponse();
        } catch (error) {
          console.error("[API] Gov-impact error:", error);
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          return new Response(JSON.stringify({ error: errorMessage }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
