"use client";

import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Loader } from "@/components/ai-elements/loader";
import { PortfolioGraph } from "@/components/ai-elements/PortfolioGraph";
import * as Timeline from "@/components/ui/timeline";
import { Button } from "@/components/ui/button";
import {
  mockPortfolioByCategory,
  generateMockNewsEvents,
  calculateCorrelation,
  type NewsEvent,
  type CorrelationResult,
} from "@/lib/mocks/portfolio-history";
import {
  assetCategories,
  type AssetCategory,
} from "@/lib/config/asset-categories";
import {
  CalendarIcon,
  TrendingUpIcon,
  NewspaperIcon,
  ActivityIcon,
  AlertTriangleIcon,
  TrendingDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "lucide-react";

export const Route = createFileRoute("/demo/object")({
  component: ObjectDemoPage,
});

function ObjectDemoInner() {
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory>("stocks");
  const [selectedRange, setSelectedRange] = useState<{
    start: Date;
    end: Date;
  } | null>(null);
  const [events, setEvents] = useState<NewsEvent[]>([]);
  const [correlation, setCorrelation] = useState<CorrelationResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleRangeSelect = (start: Date, end: Date) => {
    setSelectedRange({ start, end });
    setEvents([]);
    setCorrelation(null);
  };

  const handleCategoryChange = (category: AssetCategory) => {
    setSelectedCategory(category);
    setSelectedRange(null);
    setEvents([]);
    setCorrelation(null);
  };

  const handleGenerateTimeline = async () => {
    if (!selectedRange) return;

    setIsGenerating(true);
    await new Promise((resolve) => setTimeout(resolve, 600));

    const daysDiff = Math.ceil(
      (selectedRange.end.getTime() - selectedRange.start.getTime()) / (1000 * 60 * 60 * 24)
    );
    const eventCount = Math.min(8, Math.max(3, Math.floor(daysDiff / 30) + 2));

    const generatedEvents = generateMockNewsEvents(
      selectedRange.start,
      selectedRange.end,
      selectedCategory,
      eventCount
    );

    const correlationResult = calculateCorrelation(
      mockPortfolioByCategory[selectedCategory],
      generatedEvents,
      selectedRange.start,
      selectedRange.end,
      selectedCategory
    );

    setEvents(generatedEvents);
    setCorrelation(correlationResult);
    setIsGenerating(false);
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

  const getSentimentBadge = (sentiment: NewsEvent["sentiment"]) => {
    const styles = {
      positive: "bg-emerald-600/15 text-emerald-600 dark:text-emerald-500 border-emerald-600/30",
      negative: "bg-[#b22222]/15 text-[#b22222] dark:text-[#b22222] border-[#b22222]/30",
      neutral: "bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/30",
    };
    const icons = {
      positive: <ArrowUpIcon className="size-3" />,
      negative: <ArrowDownIcon className="size-3" />,
      neutral: null,
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border flex items-center gap-1 ${styles[sentiment]}`}>
        {icons[sentiment]}
        {sentiment}
      </span>
    );
  };

  const getCorrelationColor = (corr: number) => {
    if (corr < -0.5) return "text-[#b22222]/90";
    if (corr < 0) return "text-orange-500/90";
    if (corr < 0.5) return "text-yellow-500/90";
    return "text-emerald-600/90";
  };

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
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Single Chart with Category Dropdown */}
          <div className="rounded-xl border bg-card p-4">
            <PortfolioGraph
              data={mockPortfolioByCategory[selectedCategory]}
              category={selectedCategory}
              onRangeSelect={handleRangeSelect}
              onCategoryChange={handleCategoryChange}
            />
          </div>

          {/* Generate Button */}
          <div className="flex items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={handleGenerateTimeline}
              disabled={!selectedRange || isGenerating}
              className="gap-2"
              style={
                selectedRange
                  ? { backgroundColor: assetCategories[selectedCategory].color }
                  : undefined
              }
            >
              {isGenerating ? (
                <>
                  <Loader />
                  Analyzing...
                </>
              ) : (
                <>
                  <NewspaperIcon className="size-4" />
                  Generate Timeline & Analysis
                </>
              )}
            </Button>
            {selectedRange && (
              <span className="text-sm text-muted-foreground">{formatDateRange()}</span>
            )}
          </div>

          {/* Correlation Analysis Card */}
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

              {/* Key Drivers */}
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

              {/* Special Note for Technology May-July */}
              {selectedCategory === "technology" &&
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

          {/* Timeline Results */}
          {events.length > 0 && (
            <div className="rounded-xl border bg-card p-5">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CalendarIcon className="size-5" />
                News Timeline ({events.length} events)
              </h2>
              <Timeline.Root>
                {events.map((event, index) => (
                  <Timeline.Item key={index}>
                    <Timeline.Dot
                      style={{ backgroundColor: assetCategories[event.category].color }}
                    >
                      <CalendarIcon className="size-3 text-white" />
                    </Timeline.Dot>
                    <Timeline.Connector />
                    <Timeline.Content>
                      <Timeline.Header>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Timeline.Title>{event.title}</Timeline.Title>
                          {getSentimentBadge(event.sentiment)}
                        </div>
                        <Timeline.Time>
                          {new Date(event.time).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </Timeline.Time>
                      </Timeline.Header>
                      <Timeline.Description>{event.description}</Timeline.Description>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Impact Score:{" "}
                        <span
                          className={`font-semibold ${
                            event.impact > 0 ? "text-emerald-600/90" : event.impact < 0 ? "text-[#b22222]/90" : ""
                          }`}
                        >
                          {event.impact > 0 ? "+" : ""}
                          {(event.impact * 100).toFixed(0)}%
                        </span>
                      </div>
                    </Timeline.Content>
                  </Timeline.Item>
                ))}
              </Timeline.Root>
            </div>
          )}

          {/* Empty state */}
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

function ObjectDemoPage() {
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

  return <ObjectDemoInner />;
}
