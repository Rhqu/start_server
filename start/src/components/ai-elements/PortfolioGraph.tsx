"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ReferenceArea,
  ReferenceLine,
  ReferenceDot,
  Label,
} from "recharts";
import { cn } from "@/lib/utils";
import type { PortfolioPoint } from "@/lib/mocks/portfolio-history";
import { assetCategories, type AssetCategory } from "@/lib/config/asset-categories";
import type { MarketEvent } from "@/lib/schemas/market-events";
import {
  ChartConfig,
  ChartContainer,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  TrendingUpIcon, 
  TrendingDownIcon, 
  MinusIcon,
  RotateCcw, 
  MousePointer2, 
  StickyNote, 
  Trash2 
} from "lucide-react";

// Types for zoom and annotations
interface ZoomDomain {
  startIndex: number;
  endIndex: number;
}

interface ChartAnnotation {
  id: string;
  date: string;
  value: number;
  type: "auto" | "user";
  label: string;
  color?: string;
}

type InteractionMode = "select" | "annotate";

const ZOOM_CONSTANTS = {
  MIN_VISIBLE_POINTS: 5,
  ZOOM_SENSITIVITY: 0.1,
};

interface PortfolioGraphProps {
  data?: PortfolioPoint[];
  category: AssetCategory;
  events?: MarketEvent[];
  onRangeSelect?: (start: Date, end: Date) => void;
  onCategoryChange?: (category: AssetCategory) => void;
  className?: string;
}

type TimeRange = "7d" | "30d" | "90d" | "365d";

export function PortfolioGraph({
  data,
  category,
  events = [],
  onRangeSelect,
  onCategoryChange,
  className,
}: PortfolioGraphProps) {
  const categoryMeta = assetCategories[category];
  const [timeRange, setTimeRange] = React.useState<TimeRange>("90d");

  // Selection state for drag-to-select
  const [refAreaLeft, setRefAreaLeft] = React.useState<string | null>(null);
  const [refAreaRight, setRefAreaRight] = React.useState<string | null>(null);
  const [isSelecting, setIsSelecting] = React.useState(false);
  const [selectedRange, setSelectedRange] = React.useState<{ start: string; end: string } | null>(null);

  // Hover state for event dots
  const [hoveredEvent, setHoveredEvent] = React.useState<{ index: number; x: number; y: number } | null>(null);
  
  // Track current price on hover
  const [currentPrice, setCurrentPrice] = React.useState<number | null>(null);

  // Zoom state
  const [zoomDomain, setZoomDomain] = React.useState<ZoomDomain | null>(null);
  const chartContainerRef = React.useRef<HTMLDivElement>(null);

  // Annotation state
  const [userAnnotations, setUserAnnotations] = React.useState<ChartAnnotation[]>([]);
  const [annotationDialogOpen, setAnnotationDialogOpen] = React.useState(false);
  const [annotationTarget, setAnnotationTarget] = React.useState<{ date: string; value: number } | null>(null);
  const [noteText, setNoteText] = React.useState("");

  // Interaction mode
  const [interactionMode, setInteractionMode] = React.useState<InteractionMode>("select");

  // Filter data based on time range
  const filteredData = React.useMemo(() => {
    if (!data || data.length === 0) return [];

    const now = new Date();
    const daysMap: Record<TimeRange, number> = {
      "7d": 7,
      "30d": 30,
      "90d": 90,
      "365d": 365,
    };
    const days = daysMap[timeRange];
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return data
      .filter((d) => new Date(d.time) >= cutoff)
      .map((d) => ({
        ...d,
        date: new Date(d.time).toISOString().split("T")[0],
      }));
  }, [data, timeRange]);

  // Apply zoom to get visible data
  const visibleData = React.useMemo(() => {
    if (!zoomDomain) return filteredData;
    return filteredData.slice(zoomDomain.startIndex, zoomDomain.endIndex + 1);
  }, [filteredData, zoomDomain]);

  // Calculate Y-axis domain based on visible data for better detail
  const yDomain = React.useMemo((): [number | "dataMin" | "dataMax", number | "dataMin" | "dataMax"] => {
    // If we want "max aggressive" scaling, we can just use dataMin/dataMax
    // But since we have zoom, we might want to calculate it from visibleData
    if (visibleData.length === 0) return ['dataMin', 'dataMax'];
    
    // For max aggressive scaling, we want the domain to be tight around the visible data
    const values = visibleData.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    // We can add a tiny bit of padding so points aren't cut off at the very edge, 
    // but keep it very aggressive as requested
    const padding = (max - min) * 0.02; // 2% padding
    return [Math.floor(min - padding), Math.ceil(max + padding)];
  }, [visibleData]);

  // Reset zoom when time range changes
  React.useEffect(() => {
    setZoomDomain(null);
  }, [timeRange]);

  const formatValue = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Auto-annotations for high/low/current
  const autoAnnotations = React.useMemo((): ChartAnnotation[] => {
    if (visibleData.length === 0) return [];

    const annotations: ChartAnnotation[] = [];

    // Find max value
    const maxPoint = visibleData.reduce((max, p) =>
      p.value > max.value ? p : max, visibleData[0]);
    annotations.push({
      id: "auto-high",
      date: maxPoint.date,
      value: maxPoint.value,
      type: "auto",
      label: `High: ${formatValue(maxPoint.value)}`,
      color: "#22c55e",
    });

    // Find min value
    const minPoint = visibleData.reduce((min, p) =>
      p.value < min.value ? p : min, visibleData[0]);
    annotations.push({
      id: "auto-low",
      date: minPoint.date,
      value: minPoint.value,
      type: "auto",
      label: `Low: ${formatValue(minPoint.value)}`,
      color: "#ef4444",
    });

    // Current (last) value
    const currentPoint = visibleData[visibleData.length - 1];
    if (currentPoint.date !== maxPoint.date && currentPoint.date !== minPoint.date) {
      annotations.push({
        id: "auto-current",
        date: currentPoint.date,
        value: currentPoint.value,
        type: "auto",
        label: `Current: ${formatValue(currentPoint.value)}`,
        color: categoryMeta.color,
      });
    }

    return annotations;
  }, [visibleData, categoryMeta.color]);

  // Combine all annotations
  const allAnnotations = React.useMemo(() => {
    return [...autoAnnotations, ...userAnnotations];
  }, [autoAnnotations, userAnnotations]);

  // Wheel handler for zoom
  const handleWheel = React.useCallback((e: WheelEvent) => {
    e.preventDefault();

    const container = chartContainerRef.current;
    if (!container || filteredData.length === 0) return;

    // Get mouse position relative to chart
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const chartWidth = rect.width - 100; // Account for margins
    const mouseRatio = Math.max(0, Math.min(1, (mouseX - 70) / chartWidth));

    // Current visible range
    const currentStart = zoomDomain?.startIndex ?? 0;
    const currentEnd = zoomDomain?.endIndex ?? filteredData.length - 1;
    const currentRange = currentEnd - currentStart;

    // Calculate zoom direction
    const zoomIn = e.deltaY < 0;
    const zoomFactor = zoomIn
      ? 1 - ZOOM_CONSTANTS.ZOOM_SENSITIVITY
      : 1 + ZOOM_CONSTANTS.ZOOM_SENSITIVITY;

    // New range calculation
    let newRange = Math.round(currentRange * zoomFactor);
    newRange = Math.max(ZOOM_CONSTANTS.MIN_VISIBLE_POINTS, newRange);
    newRange = Math.min(filteredData.length - 1, newRange);

    // Calculate new start/end centered on mouse position
    const rangeChange = currentRange - newRange;

    let newStart = Math.round(currentStart + rangeChange * mouseRatio);
    let newEnd = newStart + newRange;

    // Clamp to valid bounds
    if (newStart < 0) {
      newStart = 0;
      newEnd = newRange;
    }
    if (newEnd >= filteredData.length) {
      newEnd = filteredData.length - 1;
      newStart = Math.max(0, newEnd - newRange);
    }

    // Check if we've zoomed out to full range
    if (newRange >= filteredData.length - 1) {
      setZoomDomain(null);
    } else {
      setZoomDomain({ startIndex: newStart, endIndex: newEnd });
    }
  }, [filteredData, zoomDomain]);

  // Attach wheel event listener
  React.useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const chartConfig = {
    value: {
      label: categoryMeta.label,
      color: categoryMeta.color,
    },
  } satisfies ChartConfig;

  // Mouse handlers for drag selection
  const handleMouseDown = (e: { activeLabel?: string | number }) => {
    if (e.activeLabel) {
      setRefAreaLeft(String(e.activeLabel));
      setIsSelecting(true);
    }
  };

  const handleMouseMove = (e: any) => {
    if (isSelecting && e.activeLabel) {
      setRefAreaRight(String(e.activeLabel));
    }
    
    if (e.activePayload && e.activePayload.length > 0) {
      setCurrentPrice(e.activePayload[0].value);
    } else {
      setCurrentPrice(null);
    }
  };

  const handleMouseUp = () => {
    if (refAreaLeft && refAreaRight) {
      // Ensure start is before end
      const left = new Date(refAreaLeft);
      const right = new Date(refAreaRight);
      const start = left < right ? refAreaLeft : refAreaRight;
      const end = left < right ? refAreaRight : refAreaLeft;
      
      setSelectedRange({ start, end });
      onRangeSelect?.(new Date(start), new Date(end));
    }
    setRefAreaLeft(null);
    setRefAreaRight(null);
    setIsSelecting(false);
  };

  const handleMouseLeave = () => {
    handleMouseUp();
    setCurrentPrice(null);
  };

  const clearSelection = () => {
    setSelectedRange(null);
    setRefAreaLeft(null);
    setRefAreaRight(null);
    setIsSelecting(false);
  };

  // Process events to match chart data format
  const chartEvents = React.useMemo(() => {
    if (!events || events.length === 0 || !filteredData || filteredData.length === 0) return [];

    return events
        .map(event => {
          if (!event.timestamp) return null;
          const dateObj = new Date(event.timestamp);
          if (isNaN(dateObj.getTime())) return null;
          
          const eventDate = dateObj.toISOString().split("T")[0];
          // Find closest data point
        const dataPoint = filteredData.find(d => d.date === eventDate) ||
                         filteredData.reduce((prev, curr) => {
                           const prevDiff = Math.abs(new Date(prev.date).getTime() - new Date(eventDate).getTime());
                           const currDiff = Math.abs(new Date(curr.date).getTime() - new Date(eventDate).getTime());
                           return currDiff < prevDiff ? curr : prev;
                         });

        return {
          ...event,
          date: eventDate,
          value: dataPoint?.value,
          shortTitle: (event.title?.length ?? 0) > 30 ? event.title.substring(0, 27) + '...' : (event.title ?? 'Untitled'),
        };
        })
        .filter((e): e is NonNullable<typeof e> => e !== null && e.value !== undefined);
  }, [events, filteredData]);

  const getEventIcon = (impactScore: number) => {
    if (impactScore > 0) return TrendingUpIcon;
    if (impactScore < 0) return TrendingDownIcon;
    return MinusIcon;
  };

  const getEventColor = (impactScore: number) => {
    if (impactScore >= 3) return '#16a34a'; // green-600
    if (impactScore >= 1) return '#22c55e'; // green-500
    if (impactScore <= -3) return '#dc2626'; // red-600
    if (impactScore <= -1) return '#ef4444'; // red-500
    return '#6b7280'; // gray-500
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

  // Annotation handlers
  const handleChartClick = (e: { activeLabel?: string; activePayload?: Array<{ value: number }> }) => {
    if (interactionMode !== "annotate") return;
    if (e.activeLabel && e.activePayload?.[0]?.value !== undefined) {
      setAnnotationTarget({
        date: String(e.activeLabel),
        value: e.activePayload[0].value,
      });
      setNoteText("");
      setAnnotationDialogOpen(true);
    }
  };

  const handleSaveAnnotation = () => {
    if (!annotationTarget || !noteText.trim()) return;

    const newAnnotation: ChartAnnotation = {
      id: `user-${Date.now()}`,
      date: annotationTarget.date,
      value: annotationTarget.value,
      type: "user",
      label: noteText.trim(),
    };

    setUserAnnotations((prev) => [...prev, newAnnotation]);
    setAnnotationDialogOpen(false);
    setAnnotationTarget(null);
    setNoteText("");
  };

  const handleDeleteAnnotation = (id: string) => {
    setUserAnnotations((prev) => prev.filter((a) => a.id !== id));
  };

  // Reset zoom
  const resetZoom = () => {
    setZoomDomain(null);
  };

  // Calculate zoom percentage for display
  const zoomPercentage = zoomDomain
    ? Math.round(((zoomDomain.endIndex - zoomDomain.startIndex + 1) / filteredData.length) * 100)
    : 100;

  return (
    <TooltipProvider>
      <div className={cn("flex flex-col gap-4", className)}>
        {/* Header with time range selector */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: categoryMeta.color }}
            />
            <span className="text-sm font-medium">{categoryMeta.label}</span>
            {zoomDomain && (
              <span className="text-xs text-muted-foreground">
                ({zoomPercentage}% view)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Mode toggle */}
            <div className="flex items-center gap-0.5 border rounded-md p-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={interactionMode === "select" ? "default" : "ghost"}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setInteractionMode("select")}
                  >
                    <MousePointer2 className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Select range</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={interactionMode === "annotate" ? "default" : "ghost"}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setInteractionMode("annotate")}
                  >
                    <StickyNote className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add note</TooltipContent>
              </Tooltip>
            </div>

            {/* Reset zoom button */}
            {zoomDomain && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetZoom}
                className="h-7 text-xs gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </Button>
            )}

            {selectedRange && (
              <button
                onClick={clearSelection}
                className="text-xs text-primary hover:underline"
              >
                Clear selection
              </button>
            )}
            <Select value={timeRange} onValueChange={(v: TimeRange) => setTimeRange(v)}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="365d">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Chart */}
        <div ref={chartContainerRef} className="relative">
          <ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full">
            <AreaChart
              data={visibleData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              onMouseDown={interactionMode === "select" ? handleMouseDown : undefined}
              onMouseMove={interactionMode === "select" ? handleMouseMove : undefined}
              onMouseUp={interactionMode === "select" ? handleMouseUp : undefined}
              onMouseLeave={interactionMode === "select" ? handleMouseLeave : undefined}
              onClick={handleChartClick}
            >
              <defs>
                <linearGradient id={`fill-${category}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={categoryMeta.color} stopOpacity={0.6} />
                  <stop offset="95%" stopColor={categoryMeta.color} stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={70}
                domain={yDomain}
                tickFormatter={(value) => formatValue(value)}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={categoryMeta.color}
                strokeWidth={2}
                fill={`url(#fill-${category})`}
                isAnimationActive={true}
                animationDuration={300}
                baseValue={yDomain[0]}
              />
              
              {/* Selection reference area while dragging */}
              {isSelecting && refAreaLeft && refAreaRight && (
                <ReferenceArea
                  x1={refAreaLeft}
                  x2={refAreaRight}
                  fill={categoryMeta.color}
                  fillOpacity={0.3}
                  stroke={categoryMeta.color}
                  strokeWidth={1}
                />
              )}

              {/* Confirmed selection */}
              {selectedRange && (
                <ReferenceArea
                  x1={selectedRange.start}
                  x2={selectedRange.end}
                  fill={categoryMeta.color}
                  fillOpacity={0.25}
                  stroke={categoryMeta.color}
                  strokeWidth={2}
                />
              )}

              {/* Selection boundaries */}
              {selectedRange && (
                <>
                  <ReferenceLine
                    x={selectedRange.start}
                    stroke={categoryMeta.color}
                    strokeWidth={2}
                  />
                  <ReferenceLine
                    x={selectedRange.end}
                    stroke={categoryMeta.color}
                    strokeWidth={2}
                  />
                </>
              )}

              {/* Annotations */}
              {allAnnotations.map((annotation) => (
                <ReferenceDot
                  key={annotation.id}
                  x={annotation.date}
                  y={annotation.value}
                  r={annotation.type === "auto" ? 5 : 7}
                  fill={annotation.color ?? categoryMeta.color}
                  stroke="white"
                  strokeWidth={2}
                >
                  <Label
                    value={annotation.type === "auto" ? annotation.label : ""}
                    position="top"
                    offset={12}
                    className="text-[10px] fill-current"
                  />
                </ReferenceDot>
              ))}

              {/* Vertical line for hovered event */}
              {hoveredEvent !== null && chartEvents[hoveredEvent.index] && (
                <ReferenceLine
                  x={chartEvents[hoveredEvent.index].date}
                  stroke={getEventColor(chartEvents[hoveredEvent.index].impactScore)}
                  strokeDasharray="3 3"
                  strokeWidth={1}
                  opacity={0.8}
                />
              )}

              {/* Event markers */}
              {chartEvents.map((event, idx) => (
                <ReferenceDot
                  key={idx}
                  x={event.date}
                  y={event.value}
                  r={hoveredEvent?.index === idx ? 10 : 8}
                  fill={getEventColor(event.impactScore)}
                  stroke="#fff"
                  strokeWidth={2}
                  style={{ cursor: 'pointer' }}
                  shape={(props: any) => {
                    const { cx, cy, r, fill, stroke, strokeWidth } = props;
                    return (
                      <g>
                        <circle
                          cx={cx}
                          cy={cy}
                          r={r}
                          fill={fill}
                          stroke={stroke}
                          strokeWidth={strokeWidth}
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={() => setHoveredEvent({ index: idx, x: cx, y: cy })}
                          onMouseLeave={() => setHoveredEvent(null)}
                          onClick={() => window.open(event.articleUrl, '_blank', 'noopener,noreferrer')}
                        />
                      </g>
                    );
                  }}
                />
              ))}
            </AreaChart>
          </ChartContainer>

          {/* Current Price Display (Bottom Right) */}
          {currentPrice !== null && (
            <div className="absolute bottom-8 right-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded border shadow-sm z-10 pointer-events-none">
              <span className="text-xs font-mono font-medium text-foreground">
                {formatValue(currentPrice)}
              </span>
            </div>
          )}

          {/* Hover tooltip for event dots */}
          {hoveredEvent !== null && chartEvents[hoveredEvent.index] && (
            <div 
              className="absolute z-[100] pointer-events-none transition-all duration-75 ease-out"
              style={{
                left: hoveredEvent.x,
                top: hoveredEvent.y,
                transform: hoveredEvent.y < 100 ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
                marginTop: hoveredEvent.y < 100 ? '12px' : '-12px',
              }}
            >
              <div
                className="rounded-lg border shadow-lg p-2 max-w-[200px]"
                style={{
                  backgroundColor: 'var(--background)',
                  borderColor: getEventColor(chartEvents[hoveredEvent.index].impactScore),
                }}
              >
                <div className="flex items-start gap-1.5 mb-1">
                  <div
                    className="w-1.5 h-1.5 rounded-full mt-1 shrink-0"
                    style={{ backgroundColor: getEventColor(chartEvents[hoveredEvent.index].impactScore) }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold line-clamp-2 leading-tight">
                      {chartEvents[hoveredEvent.index].title}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                        {(() => {
                          const date = new Date(chartEvents[hoveredEvent.index].timestamp);
                          return isNaN(date.getTime())
                            ? "..."
                            : date.toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                            });
                        })()}
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-muted-foreground line-clamp-2 mb-1.5 leading-tight">
                  {chartEvents[hoveredEvent.index].description}
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span
                    className="font-semibold"
                    style={{ color: getEventColor(chartEvents[hoveredEvent.index].impactScore) }}
                  >
                    {getImpactScoreLabel(chartEvents[hoveredEvent.index].impactScore)}
                  </span>
                  <span className="text-muted-foreground opacity-70">
                    Click to read →
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Event labels below chart */}
        {chartEvents.length > 0 && (
          <div className="flex flex-wrap gap-2 px-2">
            {chartEvents.map((event, idx) => {
              const Icon = getEventIcon(event.impactScore);
              return (
                <div
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs border"
                  style={{
                    backgroundColor: `${getEventColor(event.impactScore)}15`,
                    borderColor: `${getEventColor(event.impactScore)}40`,
                    color: getEventColor(event.impactScore),
                  }}
                >
                  <Icon className="size-3" />
                  <span className="font-medium">{event.shortTitle}</span>
                    <span className="text-[10px] opacity-70">
                      {(() => {
                        const date = new Date(event.timestamp);
                        return isNaN(date.getTime()) 
                          ? "..." 
                          : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                      })()}
                    </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Selection summary */}
        {selectedRange && (
          <div
            className="px-3 py-2 rounded-lg text-xs font-medium"
            style={{ backgroundColor: `${categoryMeta.color}15`, color: categoryMeta.color }}
          >
            Selected: {new Date(selectedRange.start).toLocaleDateString("en-US", { month: "short", day: "numeric" })} — {new Date(selectedRange.end).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </div>
        )}

        {/* Category selector dropdown */}
        {onCategoryChange && (
          <div className="flex items-center justify-center pt-2 border-t">
            <Select value={category} onValueChange={(v: AssetCategory) => onCategoryChange(v)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(assetCategories) as AssetCategory[]).map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: assetCategories[cat].color }}
                      />
                      {assetCategories[cat].label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* User annotations list */}
        {userAnnotations.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Notes</div>
            <div className="space-y-1">
              {userAnnotations.map((annotation) => (
                <div
                  key={annotation.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/50 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: categoryMeta.color }}
                    />
                    <span className="truncate">{annotation.label}</span>
                    <span className="text-muted-foreground shrink-0">
                      {new Date(annotation.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteAnnotation(annotation.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Annotation dialog */}
        <Dialog open={annotationDialogOpen} onOpenChange={setAnnotationDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Add Note</DialogTitle>
              <DialogDescription>
                {annotationTarget && (
                  <>
                    Add a note for{" "}
                    {new Date(annotationTarget.date).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                    <span className="block text-foreground font-medium mt-1">
                      Value: {formatValue(annotationTarget.value)}
                    </span>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Enter your note..."
                className="min-h-[100px]"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAnnotationDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveAnnotation} disabled={!noteText.trim()}>
                Save Note
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
