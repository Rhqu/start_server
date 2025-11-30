"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  LandmarkIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  XCircleIcon,
  MinusCircleIcon,
  AlertCircleIcon,
  MessageCircleIcon,
  RepeatIcon,
  HeartIcon,
  TwitterIcon,
} from "lucide-react";
import { Loader } from "./loader";

/** Social media source type */
export type SocialSource = "truthsocial" | "twitter";

/** Post sentiment type */
export type PostSentiment = "bullish" | "bearish" | "neutral";

/** Overall sentiment type */
export type OverallSentiment = "bullish" | "bearish" | "neutral" | "mixed";

/** Citation from a social media post */
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

/** Source breakdown showing posts per platform */
export interface SourceBreakdown {
  truthSocial: number;
  twitter: number;
}

/** Government impact analysis result */
export interface GovImpactResult {
  sentiment: {
    overall: OverallSentiment;
    score: number;
    explanation: string;
  };
  summary: string;
  governmentActions: string[];
  citations: PostCitation[];
  externalInsights: string;
  keyTakeaways: string[];
  sourceBreakdown?: SourceBreakdown;
}

/** Props for GovImpactPanel component */
export interface GovImpactPanelProps {
  sector: string;
  result: GovImpactResult | null;
  isLoading: boolean;
  error?: string | null;
}

/** Truth Social icon component */
function TruthSocialIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm0-8h-2V7h2v2zm4 8h-2v-4h2v4zm0-6h-2V9h2v2z" />
    </svg>
  );
}

/** Source badge component */
function SourceBadge({ source }: { source: SocialSource }) {
  if (source === "twitter") {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 font-medium">
        <TwitterIcon className="size-3" />
        Twitter
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 font-medium">
      <TruthSocialIcon className="size-3" />
      Truth Social
    </span>
  );
}

/** Post card component */
function PostCard({ citation }: { citation: PostCitation }) {
  const avatarColors: Record<SocialSource, string> = {
    twitter: "from-sky-400 to-blue-600",
    truthsocial: "from-red-500 to-rose-600",
  };

  return (
    <div className="rounded-xl border bg-card p-4 hover:bg-muted/30 transition-colors">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className={cn(
            "size-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 bg-gradient-to-br",
            avatarColors[citation.source]
          )}
        >
          {citation.author_display_name?.[0]?.toUpperCase() || "?"}
        </div>

        <div className="flex-1 min-w-0">
          {/* Author info with source badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-foreground truncate">
              {citation.author_display_name || "Anonymous"}
            </span>
            <span className="text-muted-foreground text-sm">
              @{citation.author_handle || "unknown"}
            </span>
            <SourceBadge source={citation.source} />
          </div>

          {/* Post content */}
          <p className="mt-2 text-[15px] leading-relaxed text-foreground">
            {citation.quote}
          </p>

          {/* Engagement stats */}
          <div className="flex items-center gap-6 mt-3 text-muted-foreground">
            <span className="flex items-center gap-1.5 text-sm hover:text-blue-500 transition-colors">
              <MessageCircleIcon className="size-4" />
              {citation.replies_count || 0}
            </span>
            <span className="flex items-center gap-1.5 text-sm hover:text-green-500 transition-colors">
              <RepeatIcon className="size-4" />
              {citation.reblogs_count || 0}
            </span>
            <span className="flex items-center gap-1.5 text-sm hover:text-red-500 transition-colors">
              <HeartIcon className="size-4" />
              {citation.favourites_count || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Sentiment indicator */}
      <div className="mt-3 pt-3 border-t flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Sentiment</span>
        <span
          className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full",
            citation.sentiment === "bullish"
              ? "bg-green-500/15 text-green-600 dark:text-green-400"
              : citation.sentiment === "bearish"
                ? "bg-red-500/15 text-red-600 dark:text-red-400"
                : "bg-gray-500/15 text-gray-600"
          )}
        >
          {citation.sentiment}
        </span>
      </div>
    </div>
  );
}

const sentimentConfig: Record<
  OverallSentiment,
  {
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    icon: typeof CheckCircleIcon;
  }
> = {
  bullish: {
    label: "Bullish",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-500/15",
    borderColor: "border-green-500/30",
    icon: CheckCircleIcon,
  },
  bearish: {
    label: "Bearish",
    color: "text-[#b22222] dark:text-[#b22222]",
    bgColor: "bg-[#b22222]/15",
    borderColor: "border-[#b22222]/30",
    icon: XCircleIcon,
  },
  neutral: {
    label: "Neutral",
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-500/15",
    borderColor: "border-gray-500/30",
    icon: MinusCircleIcon,
  },
  mixed: {
    label: "Mixed",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-500/15",
    borderColor: "border-orange-500/30",
    icon: AlertCircleIcon,
  },
};

export function GovImpactPanel({
  sector,
  result,
  isLoading,
  error,
}: GovImpactPanelProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center justify-center gap-3 py-8">
          <Loader />
          <span className="text-muted-foreground">
            Analyzing government impact on {sector}...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border bg-card p-5">
        <div className="bg-[#b22222]/10 border border-[#b22222]/30 rounded-lg p-4 flex gap-3">
          <XCircleIcon className="size-5 text-[#b22222] shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-[#b22222] dark:text-[#b22222]">
              Analysis Error
            </div>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  const sentimentOverall = result.sentiment?.overall || "neutral";
  const config = sentimentConfig[sentimentOverall] || sentimentConfig.neutral;
  const SentimentIcon = config.icon;
  const citations = result.citations || [];
  const governmentActions = result.governmentActions || [];
  const keyTakeaways = result.keyTakeaways || [];
  const sentimentScore = result.sentiment?.score ?? 0;
  const sentimentPercent = ((sentimentScore + 1) / 2) * 100;

  // Calculate source counts from citations
  const truthSocialCitations = citations.filter(
    (c) => c.source === "truthsocial"
  );
  const twitterCitations = citations.filter((c) => c.source === "twitter");

  // Use sourceBreakdown if available, otherwise count from citations
  const sourceBreakdown = result.sourceBreakdown || {
    truthSocial: truthSocialCitations.length,
    twitter: twitterCitations.length,
  };

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <LandmarkIcon className="size-5" />
        Government Impact Analysis —{" "}
        {sector.charAt(0).toUpperCase() + sector.slice(1)}
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          className={cn(
            "rounded-lg p-4 text-center border",
            config.bgColor,
            config.borderColor
          )}
        >
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
            Sentiment
          </div>
          <div
            className={cn(
              "text-xl font-bold flex items-center justify-center gap-2",
              config.color
            )}
          >
            <SentimentIcon className="size-5" />
            {config.label}
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
            Score
          </div>
          <div className="text-xl font-bold text-foreground">
            {sentimentScore > 0 ? "+" : ""}
            {sentimentScore.toFixed(2)}
          </div>
          <Progress value={sentimentPercent} className="mt-2 h-2" />
        </div>

        <div className="bg-sky-500/10 rounded-lg p-4 text-center border border-sky-500/20">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center justify-center gap-1">
            <TwitterIcon className="size-3" />
            Twitter
          </div>
          <div className="text-xl font-bold text-sky-600 dark:text-sky-400">
            {sourceBreakdown.twitter}
          </div>
        </div>

        <div className="bg-red-500/10 rounded-lg p-4 text-center border border-red-500/20">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center justify-center gap-1">
            <TruthSocialIcon className="size-3" />
            Truth Social
          </div>
          <div className="text-xl font-bold text-red-600 dark:text-red-400">
            {sourceBreakdown.truthSocial}
          </div>
        </div>
      </div>

      {result.sentiment?.explanation && (
        <div
          className={cn(
            "rounded-lg p-3 border text-sm",
            config.bgColor,
            config.borderColor
          )}
        >
          <span className={cn("font-medium", config.color)}>
            {result.sentiment.explanation}
          </span>
        </div>
      )}

      <div className="border-t pt-4">
        <h3 className="text-sm font-medium mb-2">Summary</h3>
        <p className="text-sm text-muted-foreground">{result.summary}</p>
      </div>

      {result.externalInsights && (
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium mb-2">External News Insights</h3>
          <p className="text-sm text-muted-foreground">
            {result.externalInsights}
          </p>
        </div>
      )}

      {governmentActions.length > 0 && (
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium mb-2">
            Government Actions Identified
          </h3>
          <div className="flex flex-wrap gap-2">
            {governmentActions.map((action, i) => (
              <span
                key={i}
                className="text-xs px-3 py-1.5 rounded-full bg-muted font-medium"
              >
                {action}
              </span>
            ))}
          </div>
        </div>
      )}

      {keyTakeaways.length > 0 && (
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium mb-2">Key Takeaways</h3>
          <ul className="space-y-1">
            {keyTakeaways.map((takeaway, i) => (
              <li
                key={i}
                className="text-sm text-muted-foreground flex items-start gap-2"
              >
                <span className="text-primary mt-1">•</span>
                {takeaway}
              </li>
            ))}
          </ul>
        </div>
      )}

      {citations.length > 0 && (
        <Collapsible className="border-t pt-4">
          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
            <MessageCircleIcon className="size-4" />
            View {citations.length} Social Media Post
            {citations.length > 1 ? "s" : ""} ({sourceBreakdown.twitter} Twitter
            , {sourceBreakdown.truthSocial} Truth Social)
            <ChevronDownIcon className="size-4" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-3">
            {citations.map((citation, i) => (
              <PostCard key={i} citation={citation} />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
