/**
 * Strict types for social media posts from Truth Social and Twitter APIs.
 */

/** Supported social media sources */
export type SocialSource = 'truthsocial' | 'twitter';

/** Sentiment values for post analysis */
export type PostSentiment = 'bullish' | 'bearish' | 'neutral';

/**
 * Normalized social media post with strict typing.
 * Common format for both Truth Social and Twitter posts.
 */
export interface SocialPost {
  /** Unique post ID from the source platform */
  id: string;
  /** Citation ID for AI referencing (1-indexed) */
  citationId: number;
  /** Post text content (HTML stripped) */
  content: string;
  /** Total engagement score (replies + reblogs/retweets + likes) */
  engagement: number;
  /** Author's handle/username */
  author_handle: string;
  /** Author's display name */
  author_display_name: string;
  /** Author's follower count */
  author_followers: number;
  /** Number of replies/comments */
  replies_count: number;
  /** Number of reblogs/retweets */
  reblogs_count: number;
  /** Number of likes/favorites */
  favourites_count: number;
  /** Post creation timestamp (ISO string or null) */
  created_at: string | null;
  /** Source platform */
  source: SocialSource;
  /** Direct URL to the post */
  url: string;
}

/**
 * Raw post from Truth Social API.
 */
export interface TruthSocialRawPost {
  id: number | string;
  content?: string;
  engagement?: number;
  author_handle?: string;
  author_display_name?: string;
  author_followers?: number;
  replies_count?: number;
  reblogs_count?: number;
  favourites_count?: number;
  created_at?: string | null;
  url?: string;
}

/**
 * Raw post from X API 2.0 (normalized format from x-api-client).
 */
export interface TwitterRawPost {
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

/**
 * Response from social media APIs.
 */
export interface SocialApiResponse {
  sector: string;
  hashtags: string[];
  posts: TruthSocialRawPost[] | TwitterRawPost[];
  post_count?: number;
  source?: SocialSource;
  is_filtered?: boolean;
  sources?: string[];
}

/**
 * Combined posts result for government impact analysis.
 */
export interface CombinedPostsResult {
  posts: SocialPost[];
  truthSocialCount: number;
  twitterCount: number;
  hashtags: string[];
  errors: string[];
}

/**
 * Citation in AI response with source information.
 */
export interface PostCitation {
  postId: number;
  quote: string;
  sentiment: PostSentiment;
  source: SocialSource;
  author_handle: string;
  author_display_name: string;
  replies_count: number;
  reblogs_count: number;
  favourites_count: number;
}

/**
 * Government impact analysis result.
 */
export interface GovImpactResult {
  sentiment: {
    overall: 'bullish' | 'bearish' | 'neutral' | 'mixed';
    score: number;
    explanation: string;
  };
  summary: string;
  governmentActions: string[];
  citations: PostCitation[];
  externalInsights: string;
  keyTakeaways: string[];
  sourceBreakdown: {
    truthSocial: number;
    twitter: number;
  };
}

/** Minimum posts required from each source */
export const MIN_POSTS_PER_SOURCE = 5;

/** API base URLs */
export const TRUTHSOCIAL_API_BASE = 'http://localhost:8000';

/**
 * Normalize a Truth Social post to the common SocialPost format.
 */
export function normalizeTruthSocialPost(
  post: TruthSocialRawPost,
  index: number
): SocialPost {
  const id = String(post.id);
  const handle = post.author_handle || 'unknown';

  return {
    id,
    citationId: index + 1,
    content: stripHtml(post.content || ''),
    engagement: post.engagement || 0,
    author_handle: handle,
    author_display_name: post.author_display_name || 'Anonymous',
    author_followers: post.author_followers || 0,
    replies_count: post.replies_count || 0,
    reblogs_count: post.reblogs_count || 0,
    favourites_count: post.favourites_count || 0,
    created_at: post.created_at || null,
    source: 'truthsocial',
    url: post.url || `https://truthsocial.com/@${handle}/posts/${id}`,
  };
}

/**
 * Normalize a Twitter/X post to the common SocialPost format.
 */
export function normalizeTwitterPost(
  post: TwitterRawPost,
  index: number
): SocialPost {
  return {
    id: post.id,
    citationId: index + 1,
    content: stripHtml(post.content),
    engagement: post.engagement,
    author_handle: post.author_handle,
    author_display_name: post.author_display_name,
    author_followers: post.author_followers,
    replies_count: post.replies_count,
    reblogs_count: post.retweets_count, // Map retweets to reblogs
    favourites_count: post.likes_count, // Map likes to favourites
    created_at: post.created_at,
    source: 'twitter',
    url: post.url,
  };
}

/**
 * Strip HTML tags from content.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Filter posts by minimum engagement or follower count.
 */
export function filterQualityPosts(
  posts: SocialPost[],
  minEngagement: number = 5,
  minFollowers: number = 1000
): SocialPost[] {
  return posts.filter(
    (p) => p.engagement >= minEngagement || p.author_followers >= minFollowers
  );
}
