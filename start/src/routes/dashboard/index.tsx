"use client";

import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Loader } from "@/components/ai-elements/loader";
import { PortfolioChart } from "@/components/portfolio-chart";
import * as Timeline from "@/components/ui/timeline";
import { Button } from "@/components/ui/button";
import {
  mockPortfolioByCategory,
  type CorrelationResult,
} from "@/lib/mocks/portfolio-history";
import { RecipeTree } from "@/components/ai-elements/RecipeTree";
import { FailureTree } from "@/components/ai-elements/FailureTree";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { motion, AnimatePresence } from "motion/react";
import { ButtonGroup, ButtonGroupSeparator } from "@/components/ui/button-group";
import {
  assetCategories,
  type AssetCategory,
} from "@/lib/config/asset-categories";
import { type MarketEvent } from "@/lib/schemas/market-events";
import {
  CalendarIcon,
  TrendingUpIcon,
  NewspaperIcon,
  ActivityIcon,
  AlertTriangleIcon,
  TrendingDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ExternalLinkIcon,
  LandmarkIcon,
} from "lucide-react";
import { GovImpactPanel, type GovImpactResult } from "@/components/ai-elements/GovImpactPanel";
import { formatCurrency, formatPercent } from "@/components/portfolio";
import {
  analyzeCategoryOutlierDelta,
  type CategoryOutlierAnalysis,
  type OutlierAsset,
  type OutlierMetric,
} from "@/lib/analysis/category-outliers";
import { getPortfolioSnapshotByDate } from "@/lib/qplix";
import type { PerformanceRecipe } from "@/lib/schemas/performance-recipe";
import type { PerformanceFailure } from "@/lib/schemas/performance-failure";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardPage,
});

function DashboardInner() {
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory>("stocks");
  const [selectedRange, setSelectedRange] = useState<{
    start: Date;
    end: Date;
  } | null>(null);
  const [events, setEvents] = useState<MarketEvent[]>([]);
  const [correlation, setCorrelation] = useState<CorrelationResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [rangeOutliers, setRangeOutliers] = useState<CategoryOutlierAnalysis | null>(null);
  const [rangeOutlierError, setRangeOutlierError] = useState<string | null>(null);
  const [isLoadingRangeOutliers, setIsLoadingRangeOutliers] = useState(false);
  const [recipeAnalysis, setRecipeAnalysis] = useState<PerformanceRecipe | null>(null);
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(false);
  const [recipeError, setRecipeError] = useState<string | null>(null);
  const recipeKeyRef = useRef<string | null>(null);
  const [failureAnalysis, setFailureAnalysis] = useState<PerformanceFailure | null>(null);
  const [isLoadingFailure, setIsLoadingFailure] = useState(false);
  const [failureError, setFailureError] = useState<string | null>(null);
  const failureKeyRef = useRef<string | null>(null);
  const lastEventsRef = useRef<MarketEvent[]>([]);
  const outlierMetric: OutlierMetric = "totalPerformance";
  const toDueDate = (date: Date) => date.toISOString().split("T")[0];

  const loadRangeOutliers = async (
    rangeStart: Date,
    rangeEnd: Date,
    category: AssetCategory,
  ) => {
    setIsLoadingRangeOutliers(true);
    setRangeOutliers(null);
    setRangeOutlierError(null);

    try {
      const [startSnapshot, endSnapshot] = await Promise.all([
        getPortfolioSnapshotByDate({ data: { dueDate: toDueDate(rangeStart) } }),
        getPortfolioSnapshotByDate({ data: { dueDate: toDueDate(rangeEnd) } }),
      ]);

      const analysis = analyzeCategoryOutlierDelta(startSnapshot, endSnapshot, {
        category,
        metric: outlierMetric,
        startDate: toDueDate(rangeStart),
        endDate: toDueDate(rangeEnd),
      });

      setRangeOutliers(analysis);
    } catch (error) {
      console.error("[DASHBOARD] Range outlier error:", error);
      setRangeOutlierError(
        error instanceof Error ? error.message : "Failed to analyze range outliers",
      );
    } finally {
      setIsLoadingRangeOutliers(false);
    }
  };

  // Government impact analysis state
  const [govImpact, setGovImpact] = useState<GovImpactResult | null>(null);
  const [isAnalyzingGov, setIsAnalyzingGov] = useState(false);
  const [govError, setGovError] = useState<string | null>(null);

  const handleRangeSelect = (start: Date | null, end: Date | null) => {
    if (start && end) {
      setSelectedRange({ start, end });
    } else {
      setSelectedRange(null);
    }
    setEvents([]);
    setCorrelation(null);
    setRangeOutliers(null);
    setRangeOutlierError(null);
    setRecipeAnalysis(null);
    setRecipeError(null);
    recipeKeyRef.current = null;
    setFailureAnalysis(null);
    setFailureError(null);
    failureKeyRef.current = null;
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category as AssetCategory);
    setEvents([]);
    setCorrelation(null);
    setGovImpact(null);
    setGovError(null);
    setRangeOutliers(null);
    setRangeOutlierError(null);
    setRecipeAnalysis(null);
    setRecipeError(null);
    recipeKeyRef.current = null;
    setFailureAnalysis(null);
    setFailureError(null);
    failureKeyRef.current = null;
  };

  const handleGenerateTimeline = async () => {
    if (!selectedRange) {
      console.log('[DASHBOARD] No range selected');
      return;
    }

    loadRangeOutliers(selectedRange.start, selectedRange.end, selectedCategory);

    console.log('[DASHBOARD] Starting timeline generation...', {
      category: selectedCategory,
      startDate: selectedRange.start.toISOString(),
      endDate: selectedRange.end.toISOString(),
    });

    setIsGenerating(true);

    try {
      console.log('[DASHBOARD] Fetching from /api/market-events...');
      const response = await fetch('/api/market-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: selectedCategory,
          startDate: selectedRange.start.toISOString(),
          endDate: selectedRange.end.toISOString(),
        }),
      });

      console.log('[DASHBOARD] Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[DASHBOARD] Response error:', errorText);
        throw new Error('Failed to fetch events');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      console.log('[DASHBOARD] Starting to read stream...');

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log('[DASHBOARD] Stream complete');
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Process complete lines (newline-delimited JSON)
        const lines = buffer.split('\n');
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const parsed = JSON.parse(line);
            console.log('[DASHBOARD] Received partial update:', {
              eventCount: parsed.events?.length ?? 0
            });

            if (parsed.events && Array.isArray(parsed.events)) {
              // Only show completed events (all except the last one which might be streaming)
              // This prevents the "typing" effect on the UI
              if (parsed.events.length > 1) {
                setEvents(parsed.events.slice(0, -1));
              }
              // Store the full list for the final update
              lastEventsRef.current = parsed.events;
            }
          } catch (e) {
            console.error('[DASHBOARD] Failed to parse line:', line, e);
          }
        }
      }

      console.log('[DASHBOARD] Final buffer length:', buffer.length);
    } catch (error) {
      console.error('[DASHBOARD] Timeline generation error:', error);
    } finally {
      // Ensure we show the full list of events at the end
      if (lastEventsRef.current && lastEventsRef.current.length > 0) {
        setEvents(lastEventsRef.current);
      }
      setIsGenerating(false);
      console.log('[DASHBOARD] Generation finished');
    }
  };

  const handleAnalyzeGovImpact = async () => {
    setIsAnalyzingGov(true);
    setGovError(null);
    setGovImpact(null);

    // Use the selected category directly - gov-impact API supports all 11 categories
    const sector = selectedCategory;

    try {
      const response = await fetch("/api/gov-impact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Analyze how the US government is currently affecting the ${sector} sector. Fetch trending posts and provide an unbiased assessment.`,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      // Read streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
      }

      console.log("[Dashboard] Full response:", fullText);

      // Remove markdown code blocks if present
      let cleanText = fullText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

      // Extract JSON object
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]) as GovImpactResult;
          console.log("[Dashboard] Parsed result:", parsed);
          setGovImpact(parsed);
        } catch (parseError) {
          console.error("[Dashboard] JSON parse error:", parseError);
          console.error("[Dashboard] Attempted to parse:", jsonMatch[0].substring(0, 500));
          setGovError("Failed to parse analysis response");
        }
      } else {
        console.log("[Dashboard] No JSON found in response");
        setGovError("No valid analysis found in response");
      }
    } catch (error) {
      console.error("[Dashboard] Gov impact error:", error);
      setGovError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsAnalyzingGov(false);
    }
  };

  const formatDateRange = () => {
    if (!selectedRange) return "";
    const opts: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      year: "numeric",
    };
    return `${selectedRange.start.toLocaleDateString("en-US", opts)} — ${selectedRange.end.toLocaleDateString("en-US", opts)}`;
  };

  const getImpactScoreLabel = (score: number): string => {
    if (score >= 5) return 'Extremely Positive';
    if (score >= 4) return 'Very Positive';
    if (score >= 3) return 'Strong Positive';
    if (score >= 2) return 'Moderate Positive';
    if (score >= 1) return 'Slight Positive';
    if (score <= -5) return 'Extremely Negative';
    if (score <= -4) return 'Very Negative';
    if (score <= -3) return 'Strong Negative';
    if (score <= -2) return 'Moderate Negative';
    if (score <= -1) return 'Slight Negative';
    return 'Neutral';
  };

  const safeDate = (dateStr: string | undefined) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return null;
      return date;
    } catch {
      return null;
    }
  };

  const getImpactScoreBadge = (score: number) => {
    let colorClass = '';
    let bgClass = '';
    let icon = null;

    if (score >= 4) {
      colorClass = 'text-green-700 dark:text-green-300';
      bgClass = 'bg-green-500/20 border-green-500/40';
      icon = <ArrowUpIcon className="size-3" />;
    } else if (score >= 2) {
      colorClass = 'text-green-600 dark:text-green-400';
      bgClass = 'bg-green-500/15 border-green-500/30';
      icon = <ArrowUpIcon className="size-3" />;
    } else if (score >= 1) {
      colorClass = 'text-green-600 dark:text-green-500';
      bgClass = 'bg-green-500/10 border-green-500/20';
      icon = <ArrowUpIcon className="size-3" />;
    } else if (score <= -4) {
      colorClass = 'text-red-700 dark:text-red-300';
      bgClass = 'bg-red-500/20 border-red-500/40';
      icon = <ArrowDownIcon className="size-3" />;
    } else if (score <= -2) {
      colorClass = 'text-red-600 dark:text-red-400';
      bgClass = 'bg-red-500/15 border-red-500/30';
      icon = <ArrowDownIcon className="size-3" />;
    } else if (score <= -1) {
      colorClass = 'text-red-600 dark:text-red-500';
      bgClass = 'bg-red-500/10 border-red-500/20';
      icon = <ArrowDownIcon className="size-3" />;
    } else {
      colorClass = 'text-gray-600 dark:text-gray-400';
      bgClass = 'bg-gray-500/10 border-gray-500/20';
    }
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${bgClass} ${colorClass}`}>
        {icon}
        <span>{getImpactScoreLabel(score)}</span>
      </div>
    );
  };

  useEffect(() => {
    if (
      !rangeOutliers ||
      !selectedRange ||
      isGenerating ||
      rangeOutliers.winners.length === 0 ||
      events.length === 0
    ) {
      return;
    }

    const startDateKey =
      rangeOutliers.period?.startDate ?? toDueDate(selectedRange.start);
    const endDateKey = rangeOutliers.period?.endDate ?? toDueDate(selectedRange.end);
    const winners = rangeOutliers.winners.slice(0, 5);
    const winnerKey = winners.map((w) => `${w.asset}:${w.metricValue.toFixed(2)}`).join("|");
    const eventKey = events.slice(0, 6).map((e) => e.title).join("|");
    const cacheKey = `${selectedCategory}-${startDateKey}-${endDateKey}-${winnerKey}-${eventKey}`;

    if (recipeKeyRef.current === cacheKey) {
      return;
    }

    recipeKeyRef.current = cacheKey;

    const fetchRecipe = async () => {
      setIsLoadingRecipe(true);
      setRecipeError(null);
      setRecipeAnalysis(null);

      try {
        const response = await fetch("/api/performance-recipe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: selectedCategory,
            startDate: startDateKey,
            endDate: endDateKey,
            winners: winners.map((w) => ({
              asset: w.asset,
              subgroup: w.subgroup,
              metricValue: w.metricValue,
              shareOfCategory: w.shareOfCategory,
              deltaTwr: w.deltaTwr ?? null,
              startPerformance: w.startPerformance ?? null,
              endPerformance: w.endPerformance ?? null,
              path: w.path ?? [],
            })),
            events: events.slice(0, 8),
          }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let fullText = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullText += decoder.decode(value, { stream: true });
        }

        const jsonMatch = fullText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("No JSON found in analysis response");
        }

        const parsed: PerformanceRecipe = JSON.parse(jsonMatch[0]);
        setRecipeAnalysis(parsed);
      } catch (error) {
        console.error("[DASHBOARD] Performance recipe error:", error);
        setRecipeError(error instanceof Error ? error.message : String(error));
      } finally {
        setIsLoadingRecipe(false);
      }
    };

    void fetchRecipe();
  }, [rangeOutliers, events, selectedCategory, selectedRange, isGenerating]);

  useEffect(() => {
    if (
      !rangeOutliers ||
      !selectedRange ||
      isGenerating ||
      rangeOutliers.losers.length === 0 ||
      events.length === 0
    ) {
      return;
    }

    const startDateKey =
      rangeOutliers.period?.startDate ?? toDueDate(selectedRange.start);
    const endDateKey = rangeOutliers.period?.endDate ?? toDueDate(selectedRange.end);
    const losers = rangeOutliers.losers.slice(0, 5);
    const loserKey = losers.map((l) => `${l.asset}:${l.metricValue.toFixed(2)}`).join("|");
    const eventKey = events.slice(0, 6).map((e) => e.title).join("|");
    const cacheKey = `${selectedCategory}-${startDateKey}-${endDateKey}-${loserKey}-${eventKey}`;

    if (failureKeyRef.current === cacheKey) {
      return;
    }

    failureKeyRef.current = cacheKey;

    const fetchFailure = async () => {
      setIsLoadingFailure(true);
      setFailureError(null);
      setFailureAnalysis(null);

      try {
        const response = await fetch("/api/performance-failure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: selectedCategory,
            startDate: startDateKey,
            endDate: endDateKey,
            losers: losers.map((l) => ({
              asset: l.asset,
              subgroup: l.subgroup,
              metricValue: l.metricValue,
              shareOfCategory: l.shareOfCategory,
              deltaTwr: l.deltaTwr ?? null,
              startPerformance: l.startPerformance ?? null,
              endPerformance: l.endPerformance ?? null,
              path: l.path ?? [],
            })),
            events: events.slice(0, 8),
          }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let fullText = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullText += decoder.decode(value, { stream: true });
        }

        const jsonMatch = fullText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("No JSON found in failure analysis response");
        }

        const parsed: PerformanceFailure = JSON.parse(jsonMatch[0]);
        setFailureAnalysis(parsed);
      } catch (error) {
        console.error("[DASHBOARD] Performance failure error:", error);
        setFailureError(error instanceof Error ? error.message : String(error));
      } finally {
        setIsLoadingFailure(false);
      }
    };

    void fetchFailure();
  }, [rangeOutliers, events, selectedCategory, selectedRange, isGenerating]);

  const formatMetricValue = (value: number, metric: OutlierMetric) => {
    if (metric === "twr") {
      return `${(value * 100).toFixed(2)}%`;
    }
    return formatCurrency(value);
  };

  const renderOutlierList = (
    items: OutlierAsset[],
    variant: "winner" | "loser",
    metric: OutlierMetric,
  ) => {
    if (items.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">
          {variant === "winner"
            ? "No standout winners in this snapshot."
            : "No notable losers in this snapshot."}
        </p>
      );
    }

    const containerVariants = {
      hidden: {},
      show: {
        transition: {
          staggerChildren: 0.08,
        },
      },
    };

    const itemVariants = {
      hidden: { opacity: 0, y: 12 },
      show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 250, damping: 26 } },
    };

    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-3"
      >
        {items.map((asset) => (
          <motion.div
            key={`${asset.asset}-${asset.subgroup}`}
            variants={itemVariants}
            className="rounded-lg border bg-card/60 p-3 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{asset.asset}</p>
                <p className="text-xs text-muted-foreground">{asset.subgroup}</p>
              </div>
              <div
                className={`text-sm font-semibold ${
                  variant === "winner" ? "text-emerald-600/90" : "text-[#b22222]/90"
                }`}
              >
                {formatMetricValue(asset.metricValue, metric)}
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
              <span>{(Math.abs(asset.shareOfCategory) * 100).toFixed(1)}% of category</span>
              {typeof asset.deltaTwr === "number" ? (
                <span>Δ {formatPercent(asset.deltaTwr)}</span>
              ) : (
                typeof asset.twr === "number" && <span>{formatPercent(asset.twr)}</span>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>
    );
  };

  const getCorrelationColor = (corr: number) => {
    if (corr < -0.5) return "text-[#b22222]/90";
    if (corr < 0) return "text-orange-500/90";
    if (corr < 0.5) return "text-yellow-500/90";
    return "text-emerald-600/90";
  };

  const splitSummary = (summary: string) => {
    if (!summary) return { lead: "", detail: "" };
    const trimmed = summary.trim();
    const sentences = trimmed.split(/(?<=[.!?])\s+/);
    if (sentences.length <= 1 || trimmed.length < 160) {
      return { lead: trimmed, detail: "" };
    }
    const lead = sentences[0];
    const detail = sentences.slice(1).join(" ").trim();
    return { lead, detail };
  };

  const renderSummaryBlock = (
    summary: string,
    variant: "success" | "failure",
  ) => {
    if (!summary) return null;

    const { lead, detail } = splitSummary(summary);
    const toggleLabel =
      variant === "success" ? "Read full success narrative" : "Read full failure narrative";

    return (
      <div className="mt-4 text-xs text-muted-foreground space-y-1">
        {lead && <p className="leading-relaxed">{lead}</p>}
        {detail && (
          <Collapsible>
            <CollapsibleTrigger className="text-[11px] underline-offset-4 hover:underline text-primary/80">
              {toggleLabel}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <p className="mt-1 leading-relaxed text-muted-foreground">{detail}</p>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    );
  };
  const topWinners = rangeOutliers?.winners.slice(0, 4) ?? [];
  const topLosers = rangeOutliers?.losers.slice(0, 4) ?? [];
  const metricLabel =
    (rangeOutliers?.metric ?? outlierMetric) === "twr"
      ? "Time-weighted return"
      : "Total performance";

  return (
    <div className="flex flex-1 flex-col h-full">
      <header className="border-b p-4 shrink-0">
        <h1 className="text-xl font-semibold text-center flex items-center justify-center gap-2">
          <ActivityIcon className="size-5" />
          Portfolio Timeline & Correlation Analysis
        </h1>
        <p className="text-center text-muted-foreground text-sm mt-1">
          Drag on the chart to select a time range, then generate the timeline analysis
        </p>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-16">
          <PortfolioChart
            events={events}
            onRangeSelect={handleRangeSelect}
            onCategoryChange={handleCategoryChange}
          />

          <div className="flex items-center justify-center gap-4">
            <div className="flex-1 border-t border-dashed border-muted-foreground/30" />
            <ButtonGroup>
              <Button
                size="lg"
                onClick={handleGenerateTimeline}
                disabled={!selectedRange || isGenerating}
                className="gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader />
                    Generating...
                  </>
                ) : (
                  <>
                    <NewspaperIcon className="size-4" />
                    Generate News Timeline
                  </>
                )}
              </Button>
              <ButtonGroupSeparator />
              <Button
                size="lg"
                variant="outline"
                onClick={handleAnalyzeGovImpact}
                disabled={isAnalyzingGov}
                className="gap-2"
              >
                {isAnalyzingGov ? (
                  <>
                    <Loader />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <LandmarkIcon className="size-4" />
                    Analyze Gov Impact
                  </>
                )}
              </Button>
            </ButtonGroup>
            <div className="flex-1 border-t border-dashed border-muted-foreground/30" />
          </div>

          {events.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Sources:</span>
              {events.filter(e => e.source).map((event, i) => (
                <a
                  key={i}
                  href={event.articleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md bg-muted border shadow-sm hover:bg-muted/80 transition-colors animate-in fade-in zoom-in-95 duration-300"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <span>{event.source}</span>
                  <span className="text-muted-foreground">
                    {safeDate(event.timestamp)?.toLocaleDateString("en-US", { month: "short", day: "numeric" }) ?? ""}
                  </span>
                  {event.impactScore >= 1 ? (
                    <ArrowUpIcon className="size-3 text-green-500" />
                  ) : event.impactScore <= -1 ? (
                    <ArrowDownIcon className="size-3 text-red-500" />
                  ) : null}
                </a>
              ))}
            </div>
          )}

          {correlation && (
            <div className="rounded-xl border bg-card p-5 space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUpIcon className="size-5" />
                Correlation Analysis
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    News-Price Correlation
                  </div>
                  <div className={`text-2xl font-bold ${getCorrelationColor(correlation.correlation)}`}>
                    {correlation.correlation > 0 ? "+" : ""}
                    {correlation.correlation.toFixed(2)}
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Annualized Volatility
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {correlation.volatility.toFixed(1)}%
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Market Sentiment
                  </div>
                  <div
                    className={`text-2xl font-bold ${
                      correlation.sentiment === "bullish"
                        ? "text-emerald-600/90"
                        : correlation.sentiment === "bearish"
                        ? "text-[#b22222]/90"
                        : "text-yellow-500/90"
                    }`}
                  >
                    {correlation.sentiment.charAt(0).toUpperCase() + correlation.sentiment.slice(1)}
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    News Events
                  </div>
                  <div className="text-2xl font-bold text-foreground">{correlation.newsCount}</div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <AlertTriangleIcon className="size-4 text-yellow-500" />
                  Key Drivers
                </h3>
                <div className="flex flex-wrap gap-2">
                  {correlation.keyDrivers.map((driver, i) => (
                    <span
                      key={i}
                      className="text-xs px-3 py-1.5 rounded-full bg-muted font-medium"
                    >
                      {driver}
                    </span>
                  ))}
                </div>
              </div>

              {selectedCategory === "stocks" &&
                correlation.correlation < -0.5 &&
                correlation.volatility > 30 && (
                  <div className="bg-[#b22222]/10 border border-[#b22222]/30 rounded-lg p-4 flex gap-3">
                    <TrendingDownIcon className="size-5 text-[#b22222]/90 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-[#b22222] dark:text-[#b22222]">
                        High Volatility Period Detected
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        This period shows significant negative correlation ({correlation.correlation.toFixed(2)})
                        between news sentiment and price movement, with elevated volatility of{" "}
                        {correlation.volatility.toFixed(1)}%. The primary driver was the US-China tariff
                        escalation impacting semiconductor and technology supply chains.
                      </p>
                    </div>
                  </div>
                )}
            </div>
          )}

          {(govImpact || isAnalyzingGov || govError) && (
            <GovImpactPanel
              sector={selectedCategory}
              result={govImpact}
              isLoading={isAnalyzingGov}
              error={govError}
            />
          )}

          {events.length > 0 && (
            <>
              <AnimatePresence mode="wait">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: false, margin: "-200px" }}
                  transition={{ duration: 0.5 }}
                  className="rounded-xl border bg-card p-5"
                >
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <CalendarIcon className="size-5" />
                    News Timeline ({events.length} events)
                  </h2>
                <Timeline.Root>
                  {events.map((event, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 25,
                        delay: index * 0.05,
                      }}
                      layout
                    >
                      <Timeline.Item>
                      <Timeline.Dot
                        style={{ backgroundColor: assetCategories[selectedCategory].color }}
                      >
                        <CalendarIcon className="size-3 text-white" />
                      </Timeline.Dot>
                      <Timeline.Connector />
                      <Timeline.Content>
                        <Timeline.Header>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Timeline.Title>{event.title}</Timeline.Title>
                            {getImpactScoreBadge(event.impactScore)}
                          </div>
                          <Timeline.Time>
                            {(() => {
                              const date = safeDate(event.timestamp);
                              return date
                                ? date.toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })
                                : "Loading date...";
                            })()}
                          </Timeline.Time>
                        </Timeline.Header>
                        <Timeline.Description>{event.description}</Timeline.Description>
                        <a
                          href={event.articleUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                        >
                          <ExternalLinkIcon className="size-3" />
                          Read on {event.source}
                        </a>
                      </Timeline.Content>
                    </Timeline.Item>
                  </motion.div>
                    ))}
                  </Timeline.Root>
                </motion.div>
              </AnimatePresence>

              {rangeOutliers && !isLoadingRangeOutliers && (
                <AnimatePresence mode="wait">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: false, margin: "-200px" }}
                    transition={{ duration: 0.5 }}
                    className="rounded-xl border bg-card p-5 space-y-4"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h2 className="text-lg font-semibold flex items-center gap-2">
                        <TrendingUpIcon className="size-5" />
                        Outlier Highlights — {assetCategories[selectedCategory].label}
                      </h2>
                      <div className="text-xs text-muted-foreground flex flex-col text-right">
                        <span>Metric: {metricLabel}</span>
                        {rangeOutliers?.period && (
                          <span>
                            {rangeOutliers.period.startDate} → {rangeOutliers.period.endDate}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <ArrowUpIcon className="size-4 text-emerald-600/90" />
                            <h3 className="text-sm font-semibold">Best performers</h3>
                          </div>
                          {renderOutlierList(topWinners, "winner", rangeOutliers.metric)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <ArrowDownIcon className="size-4 text-[#b22222]/90" />
                            <h3 className="text-sm font-semibold">Worst performers</h3>
                          </div>
                          {renderOutlierList(topLosers, "loser", rangeOutliers.metric)}
                        </div>
                      </div>

                      <Separator />

                      <div className="grid gap-6 lg:grid-cols-2">
                        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-900/10 p-4 shadow-sm">
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                              <ActivityIcon className="size-4 text-muted-foreground" />
                              <h3 className="text-sm font-semibold">Recipe for Success</h3>
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              Metric: {metricLabel}
                            </span>
                          </div>

                          {isLoadingRecipe && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Loader className="size-4" />
                              Analyzing top performers...
                            </div>
                          )}

                          {!isLoadingRecipe && recipeError && (
                            <div className="text-xs text-muted-foreground bg-muted/40 border border-muted/60 rounded-lg p-3">
                              {recipeError}
                            </div>
                          )}

                          {!isLoadingRecipe && recipeAnalysis && (
                            <>
                              <RecipeTree analysis={recipeAnalysis} />
                              {renderSummaryBlock(recipeAnalysis.summary, "success")}
                            </>
                          )}
                        </div>

                        <div className="rounded-xl border border-[#b22222]/20 dark:border-red-800/50 bg-[#b22222]/5 dark:bg-red-900/10 p-4 shadow-sm">
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                              <AlertTriangleIcon className="size-4 text-[#b22222]/80" />
                              <h3 className="text-sm font-semibold">Recipe for Failure</h3>
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              Metric: {metricLabel}
                            </span>
                          </div>

                          {isLoadingFailure && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Loader className="size-4" />
                              Analyzing drawdowns...
                            </div>
                          )}

                          {!isLoadingFailure && failureError && (
                            <div className="text-xs text-muted-foreground bg-muted/40 border border-muted/60 rounded-lg p-3">
                              {failureError}
                            </div>
                          )}

                          {!isLoadingFailure && failureAnalysis && (
                            <>
                              <FailureTree analysis={failureAnalysis} align="right" />
                              {renderSummaryBlock(failureAnalysis.summary, "failure")}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}
            </>
          )}

          {!selectedRange && events.length === 0 && (
            <div className="text-center text-muted-foreground py-10 border border-dashed rounded-xl">
              <NewspaperIcon className="size-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Drag on the chart to select a time range</p>
              <p className="text-sm mt-1">Then click "Generate Timeline & Analysis" to see results</p>
            </div>
          )}

          {selectedRange && events.length === 0 && !isGenerating && (
            <div className="text-center text-muted-foreground py-10 border border-dashed rounded-xl">
              <CalendarIcon className="size-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Range selected: {formatDateRange()}</p>
              <p className="text-sm mt-1">Click "Generate Timeline & Analysis" to see results</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DashboardPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader />
      </div>
    );
  }

  return <DashboardInner />;
}
