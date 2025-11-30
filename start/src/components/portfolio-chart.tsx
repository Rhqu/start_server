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
  Customized,
} from "recharts";
import { TrendingUpIcon, TrendingDownIcon, MinusIcon, ChevronDown, X, ZoomInIcon } from "lucide-react";
import type { MarketEvent } from "@/lib/schemas/market-events";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePortfolioTimeseries } from "@/hooks/use-portfolio-timeseries";

const CATEGORY_COLORS: Record<string, string> = {
  Stocks: "var(--chart-1)",
  Bonds: "var(--chart-2)",
  Commodities: "var(--chart-3)",
  Liquidity: "var(--chart-4)",
  "Alternative investments": "var(--chart-5)",
  "Real estate": "hsl(200, 70%, 50%)",
  "Private equity": "hsl(280, 70%, 50%)",
  "Art and collectibles": "hsl(320, 70%, 50%)",
  "Direct holdings": "hsl(160, 70%, 50%)",
  "Agriculture and forestry": "hsl(80, 70%, 50%)",
  "Alternative energies": "hsl(40, 70%, 50%)",
};

const LIQUID_CATEGORIES = [
  "Stocks",
  "Bonds",
  "Commodities",
  "Liquidity",
  "Alternative investments",
];

const ILLIQUID_CATEGORIES = [
  "Real estate",
  "Private equity",
  "Art and collectibles",
  "Direct holdings",
  "Agriculture and forestry",
  "Alternative energies",
];

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `€${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `€${(value / 1_000).toFixed(0)}K`;
  }
  return `€${value.toFixed(0)}`;
}

// Map chart categories to API AssetCategory
const CATEGORY_TO_ASSET: Record<string, string> = {
  "Stocks": "stocks",
  "Bonds": "bonds",
  "Commodities": "commodities",
  "Liquidity": "liquidity",
  "Alternative investments": "crypto",
  "Real estate": "real-estate",
  "Private equity": "private-equity",
  "Art and collectibles": "art-collectibles",
  "Direct holdings": "direct-holdings",
  "Agriculture and forestry": "agriculture",
  "Alternative energies": "alternative-energy",
};

interface PortfolioChartProps {
  events?: MarketEvent[];
  onRangeSelect?: (start: Date | null, end: Date | null) => void;
  onCategoryChange?: (category: string) => void;
}

// Event helpers
const getEventIcon = (impactScore: number) => {
  if (impactScore > 0) return TrendingUpIcon;
  if (impactScore < 0) return TrendingDownIcon;
  return MinusIcon;
};

const getEventColor = (impactScore: number) => {
  if (impactScore >= 3) return '#16a34a';
  if (impactScore >= 1) return '#22c55e';
  if (impactScore <= -3) return '#dc2626';
  if (impactScore <= -1) return '#ef4444';
  return '#6b7280';
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

export function PortfolioChart({ events = [], onRangeSelect, onCategoryChange }: PortfolioChartProps) {
  const { data, loading, error } = usePortfolioTimeseries();
  const [timeRange, setTimeRange] = React.useState("90d");
  const [assetType, setAssetType] = React.useState<"liquid" | "illiquid">("liquid");
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>(LIQUID_CATEGORIES);
  const [customStart, setCustomStart] = React.useState("");
  const [customEnd, setCustomEnd] = React.useState("");

  // Selection state for drag-to-select
  const [refAreaLeft, setRefAreaLeft] = React.useState<string | null>(null);
  const [refAreaRight, setRefAreaRight] = React.useState<string | null>(null);
  const [isSelecting, setIsSelecting] = React.useState(false);
  const [selectedRange, setSelectedRange] = React.useState<{
    start: string;
    end: string;
  } | null>(null);

  // Hover state for event dots
  const [hoveredEvent, setHoveredEvent] = React.useState<{ index: number; x: number; y: number } | null>(null);

  // Hover state for chart data (for fixed tooltip bar)
  const [hoveredData, setHoveredData] = React.useState<{
    date: string;
    values: { name: string; value: number; color: string }[];
    total: number;
  } | null>(null);

  // Notify parent of category changes (use first selected category)
  const prevCategoryRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (selectedCategories.length > 0) {
      const primaryCategory = selectedCategories[0];
      const assetCategory = CATEGORY_TO_ASSET[primaryCategory];
      if (assetCategory && assetCategory !== prevCategoryRef.current) {
        prevCategoryRef.current = assetCategory;
        onCategoryChange?.(assetCategory);
      }
    }
  }, [selectedCategories]);

  // Button position for investigate button
  const [buttonPos, setButtonPos] = React.useState<{ x: number; y: number } | null>(null);
  const chartRef = React.useRef<HTMLDivElement>(null);

  // Process events - needs to be before early returns to maintain hook order
  const chartEvents = React.useMemo(() => {
    if (!data || !events || events.length === 0 || selectedCategories.length === 0) return [];

    // Build chart data first
    const chartData = data.data.map((point) => {
      const row: Record<string, string | number> = { date: point.date };
      for (const cat of selectedCategories) {
        row[cat] = point.categories[cat]?.nav ?? 0;
      }
      return row;
    });

    if (chartData.length === 0) return [];

    return events
      .map(event => {
        if (!event.timestamp) return null;
        const dateObj = new Date(event.timestamp);
        if (isNaN(dateObj.getTime())) return null;

        const eventDate = dateObj.toISOString().split("T")[0];
        const dataPoint = chartData.find(d => (d.date as string).split("T")[0] === eventDate);
        if (!dataPoint) return null;

        const totalValue = selectedCategories.reduce(
          (sum, cat) => sum + (Number(dataPoint[cat]) || 0),
          0
        );

        return {
          ...event,
          date: dataPoint.date as string,
          value: totalValue,
          shortTitle: (event.title?.length ?? 0) > 30 ? event.title.substring(0, 27) + '...' : (event.title ?? 'Untitled'),
        };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);
  }, [data, events, selectedCategories]);

  // Calculate dynamic Y-axis domain - must be before early returns
  const yDomain = React.useMemo((): [number, number] => {
    if (!data || data.data.length === 0 || selectedCategories.length === 0) return [0, 100];

    // Build chart data to calculate totals
    const chartData = data.data.map((point) => {
      let total = 0;
      for (const cat of selectedCategories) {
        total += point.categories[cat]?.nav ?? 0;
      }
      return total;
    });

    const minValue = Math.min(...chartData);
    const maxValue = Math.max(...chartData);
    const range = maxValue - minValue;

    // Add 5% padding, but ensure min doesn't go below 0
    const padding = range * 0.05;
    const domainMin = Math.max(0, minValue - padding);
    const domainMax = maxValue + padding;

    // Round to nice numbers
    const roundToNice = (val: number, ceil: boolean) => {
      if (val === 0) return 0;
      const magnitude = Math.pow(10, Math.floor(Math.log10(Math.abs(val))));
      const normalized = val / magnitude;
      const rounded = ceil ? Math.ceil(normalized * 2) / 2 : Math.floor(normalized * 2) / 2;
      return rounded * magnitude;
    };

    return [roundToNice(domainMin, false), roundToNice(domainMax, true)];
  }, [data, selectedCategories]);

  const handleMouseDown = (e: { activeLabel?: string | number }) => {
    if (e.activeLabel) {
      setRefAreaLeft(String(e.activeLabel));
      setIsSelecting(true);
    }
  };

  const handleMouseMove = (e: { activeLabel?: string | number }) => {
    if (isSelecting && e.activeLabel) {
      setRefAreaRight(String(e.activeLabel));
    }
  };

  const handleMouseUp = () => {
    if (refAreaLeft && refAreaRight) {
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

  const clearSelection = () => {
    setSelectedRange(null);
    setButtonPos(null);
    onRangeSelect?.(null, null);
  };

  const zoomToSelection = () => {
    if (selectedRange) {
      // Ensure YYYY-MM-DD format for date inputs
      const startDate = selectedRange.start.split("T")[0];
      const endDate = selectedRange.end.split("T")[0];
      setCustomStart(startDate);
      setCustomEnd(endDate);
      setTimeRange("custom");
      // Keep selection visible after zoom
    }
  };

  if (loading) {
    return (
      <Card className="pt-0">
        <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
          <div className="grid flex-1 gap-1">
            <CardTitle>Portfolio Performance</CardTitle>
            <CardDescription>Loading data...</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex h-[250px] items-center justify-center">
          <div className="text-muted-foreground">Loading portfolio data...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="pt-0">
        <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
          <div className="grid flex-1 gap-1">
            <CardTitle>Portfolio Performance</CardTitle>
            <CardDescription>Error loading data</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex h-[250px] items-center justify-center">
          <div className="text-destructive">{error.message}</div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <Card className="pt-0">
        <CardHeader>
          <CardTitle>Portfolio Performance</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const displayedCategories = selectedCategories;

  // Transform data for recharts
  const chartData = data.data.map((point) => {
    const row: Record<string, string | number> = { date: point.date };
    for (const cat of displayedCategories) {
      row[cat] = point.categories[cat]?.nav ?? 0;
    }
    return row;
  });

  // Filter by time range
  let filteredData = chartData.filter((item) => {
    const dateStr = (item.date as string).split("T")[0];
    const date = new Date(dateStr);
    if (timeRange === "custom") {
      if (!customStart || !customEnd) return true;
      const start = new Date(customStart);
      const end = new Date(customEnd);
      end.setHours(23, 59, 59, 999); // Include full end day
      return date >= start && date <= end;
    }
    const referenceDate = new Date(
      chartData[chartData.length - 1].date as string,
    );
    const startDate = new Date(referenceDate);
    if (timeRange === "7d") startDate.setDate(startDate.getDate() - 7);
    else if (timeRange === "30d") startDate.setDate(startDate.getDate() - 30);
    else if (timeRange === "90d") startDate.setDate(startDate.getDate() - 90);
    else if (timeRange === "1y")
      startDate.setFullYear(startDate.getFullYear() - 1);
    else if (timeRange === "5y")
      startDate.setFullYear(startDate.getFullYear() - 5);
    return date >= startDate;
  });

  // Downsample for longer ranges, preserving extremes
  const downsample = (data: typeof filteredData, bucketSize: number) => {
    if (data.length <= bucketSize * 2) return data;

    const result: typeof data = [];
    for (let i = 0; i < data.length; i += bucketSize) {
      const bucket = data.slice(i, i + bucketSize);
      if (bucket.length === 0) continue;

      let maxPoint = bucket[0];
      let minPoint = bucket[0];
      let maxVal = -Infinity;
      let minVal = Infinity;

      for (const point of bucket) {
        const total = displayedCategories.reduce(
          (sum, cat) => sum + (Number(point[cat]) || 0),
          0,
        );
        if (total > maxVal) {
          maxVal = total;
          maxPoint = point;
        }
        if (total < minVal) {
          minVal = total;
          minPoint = point;
        }
      }

      const minIdx = bucket.indexOf(minPoint);
      const maxIdx = bucket.indexOf(maxPoint);

      if (minPoint === maxPoint) {
        result.push(maxPoint);
      } else if (minIdx < maxIdx) {
        result.push(minPoint, maxPoint);
      } else {
        result.push(maxPoint, minPoint);
      }
    }
    return result;
  };

  if (timeRange === "1y") {
    filteredData = downsample(filteredData, 14);
  } else if (timeRange === "5y") {
    filteredData = downsample(filteredData, 30);
  }

  const rangeLabels: Record<string, string> = {
    "7d": "7 days",
    "30d": "30 days",
    "90d": "3 months",
    "1y": "1 year",
    "5y": "5 years",
    custom: "custom range",
  };

  // Build chart config
  const chartConfig: ChartConfig = {};
  for (const cat of displayedCategories) {
    chartConfig[cat] = {
      label: cat,
      color: CATEGORY_COLORS[cat] || "hsl(0, 0%, 50%)",
    };
  }

  const latestTotal = data.data[data.data.length - 1]?.periodPnL ?? 0;

  // Clip selection to visible range (not a hook, just computed)
  const clippedSelection = (() => {
    if (!selectedRange || filteredData.length === 0) return null;

    const selStart = new Date(selectedRange.start).getTime();
    const selEnd = new Date(selectedRange.end).getTime();

    const inRange = filteredData.filter((d) => {
      const t = new Date(d.date as string).getTime();
      return t >= selStart && t <= selEnd;
    });

    if (inRange.length === 0) {
      const firstDate = new Date(filteredData[0].date as string).getTime();
      const lastDate = new Date(
        filteredData[filteredData.length - 1].date as string,
      ).getTime();
      if (selEnd < firstDate || selStart > lastDate) return null;
      return {
        start: filteredData[0].date as string,
        end: filteredData[filteredData.length - 1].date as string,
      };
    }

    return {
      start: inRange[0].date as string,
      end: inRange[inRange.length - 1].date as string,
    };
  })();

  // Check if selection covers the full visible range (no point investigating)
  const selectionCoversFullRange = (() => {
    if (!clippedSelection || filteredData.length === 0) return false;
    const visibleStart = filteredData[0].date as string;
    const visibleEnd = filteredData[filteredData.length - 1].date as string;
    return clippedSelection.start === visibleStart && clippedSelection.end === visibleEnd;
  })();

  return (
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>Portfolio Performance</CardTitle>
          <CardDescription>
            Total gain: {formatCurrency(latestTotal)} • Last{" "}
            {rangeLabels[timeRange]}
          </CardDescription>
        </div>
        {selectedRange && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              {new Date(selectedRange.start).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
              {" → "}
              {new Date(selectedRange.end).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="h-6 w-6 p-0"
              title="Clear selection"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        <Tabs value={assetType} onValueChange={(v) => {
          const newType = v as "liquid" | "illiquid";
          setAssetType(newType);
          setSelectedCategories(newType === "liquid" ? LIQUID_CATEGORIES : ILLIQUID_CATEGORIES);
        }}>
          <TabsList>
            <TabsTrigger value="liquid">Liquid</TabsTrigger>
            <TabsTrigger value="illiquid">Illiquid</TabsTrigger>
          </TabsList>
        </Tabs>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              {selectedCategories.length === (assetType === "liquid" ? LIQUID_CATEGORIES : ILLIQUID_CATEGORIES).length
                ? "All"
                : `${selectedCategories.length} selected`}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuCheckboxItem
              checked={selectedCategories.length === (assetType === "liquid" ? LIQUID_CATEGORIES : ILLIQUID_CATEGORIES).length}
              onSelect={(e) => e.preventDefault()}
              onCheckedChange={() => {
                setSelectedCategories(assetType === "liquid" ? LIQUID_CATEGORIES : ILLIQUID_CATEGORIES);
              }}
            >
              All
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            {(assetType === "liquid" ? LIQUID_CATEGORIES : ILLIQUID_CATEGORIES).map((cat) => (
              <DropdownMenuCheckboxItem
                key={cat}
                checked={selectedCategories.includes(cat)}
                disabled={selectedCategories.length === 1 && selectedCategories.includes(cat)}
                onSelect={(e) => e.preventDefault()}
                onCheckedChange={(checked) => {
                  if (!checked && selectedCategories.length === 1) return;
                  setSelectedCategories(prev =>
                    checked ? [...prev, cat] : prev.filter(c => c !== cat)
                  );
                }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[cat] }}
                  />
                  {cat}
                </div>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {timeRange === "custom" ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTimeRange("90d")}
            className="gap-2"
          >
            Custom
            <X className="h-3 w-3" />
          </Button>
        ) : (
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="hidden w-[140px] rounded-lg sm:flex"
              aria-label="Select time range"
            >
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="5y" className="rounded-lg">
                Last 5 years
              </SelectItem>
              <SelectItem value="1y" className="rounded-lg">
                Last year
              </SelectItem>
              <SelectItem value="90d" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        )}
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <div ref={chartRef} className="relative">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart
            data={filteredData}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <defs>
              {displayedCategories.map((cat) => (
                <linearGradient
                  key={cat}
                  id={`fill${cat.replace(/\s/g, "")}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={CATEGORY_COLORS[cat]}
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor={CATEGORY_COLORS[cat]}
                    stopOpacity={0.1}
                  />
                </linearGradient>
              ))}
              <pattern
                id="diagonalHatch"
                patternUnits="userSpaceOnUse"
                width="8"
                height="8"
              >
                <rect width="8" height="8" fill="rgba(128,128,128,0.1)" />
                <path
                  d="M-1,1 l2,-2 M0,8 l8,-8 M7,9 l2,-2"
                  stroke="rgba(128,128,128,0.4)"
                  strokeWidth="1.5"
                />
              </pattern>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tick={{ style: { userSelect: 'none' } }}
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
              domain={yDomain}
              tick={{ style: { userSelect: 'none' } }}
              tickFormatter={formatCurrency}
            />
            <ChartTooltip
              cursor={false}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) {
                  if (hoveredData) setTimeout(() => setHoveredData(null), 0);
                  return null;
                }
                const total = payload.reduce(
                  (sum, p) => sum + (Number(p.value) || 0),
                  0,
                );
                const newData = {
                  date: label as string,
                  values: payload.map((p) => ({
                    name: p.name as string,
                    value: Number(p.value) || 0,
                    color: p.color as string,
                  })),
                  total,
                };
                if (!hoveredData || hoveredData.date !== newData.date) {
                  setTimeout(() => setHoveredData(newData), 0);
                }
                return null;
              }}
            />
            {/* Selection while dragging - render behind areas */}
            {isSelecting && refAreaLeft && refAreaRight && (
              <ReferenceArea
                x1={refAreaLeft}
                x2={refAreaRight}
                fill="url(#diagonalHatch)"
                stroke="hsl(var(--muted-foreground))"
                strokeOpacity={0.3}
              />
            )}

            {/* Confirmed selection - render behind areas */}
            {clippedSelection && (
              <ReferenceArea
                x1={clippedSelection.start}
                x2={clippedSelection.end}
                fill="url(#diagonalHatch)"
                stroke="hsl(var(--muted-foreground))"
                strokeOpacity={0.5}
              />
            )}

            {displayedCategories.map((cat) => (
              <Area
                key={cat}
                dataKey={cat}
                type="monotone"
                fill={`url(#fill${cat.replace(/\s/g, "")})`}
                stroke={CATEGORY_COLORS[cat]}
                stackId="a"
              />
            ))}

            {/* White selection boundary lines */}
            {selectedRange && clippedSelection && (
              <Customized
                component={({ xAxisMap, yAxisMap }: any) => {
                  const xAxis = xAxisMap?.[0];
                  const yAxis = yAxisMap?.[0];
                  if (!xAxis || !yAxis) {
                    if (buttonPos) setButtonPos(null);
                    return null;
                  }

                  const x1 = xAxis.scale(clippedSelection.start);
                  const x2 = xAxis.scale(clippedSelection.end);
                  const yTop = yAxis.y;
                  const yBottom = yAxis.y + yAxis.height;
                  const centerX = (x1 + x2) / 2;

                  // Update button position
                  const newX = centerX;
                  const newY = yBottom - 8;
                  if (!buttonPos || buttonPos.x !== newX || buttonPos.y !== newY) {
                    setTimeout(() => setButtonPos({ x: newX, y: newY }), 0);
                  }

                  return (
                    <g>
                      <line
                        x1={x1}
                        y1={yTop}
                        x2={x1}
                        y2={yBottom}
                        stroke="rgba(128,128,128,0.4)"
                        strokeWidth={2}
                      />
                      <line
                        x1={x2}
                        y1={yTop}
                        x2={x2}
                        y2={yBottom}
                        stroke="rgba(128,128,128,0.4)"
                        strokeWidth={2}
                      />
                    </g>
                  );
                }}
              />
            )}

            {/* Event markers at top with lines going down */}
            {chartEvents.map((event, idx) => (
              <ReferenceLine
                key={`line-${idx}`}
                x={event.date}
                stroke={getEventColor(event.impactScore)}
                strokeWidth={hoveredEvent?.index === idx ? 3 : 2}
                strokeOpacity={hoveredEvent?.index === idx ? 0.8 : 0.5}
                strokeDasharray="4 4"
              />
            ))}
            {/* Dots at top - offset 3% from top to avoid clipping */}
            {chartEvents.map((event, idx) => (
              <ReferenceDot
                key={`dot-${idx}`}
                x={event.date}
                y={yDomain[1] - (yDomain[1] - yDomain[0]) * 0.03}
                r={hoveredEvent?.index === idx ? 8 : 6}
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

        {/* Zoom button - positioned at bottom center of selection */}
        {selectedRange && buttonPos && !selectionCoversFullRange && (
          <button
            onClick={zoomToSelection}
            className="absolute z-50 px-4 py-1.5 rounded-lg backdrop-blur-md bg-white/10 border border-white/20 saturate-50 hover:saturate-100 hover:bg-white/20 transition-all cursor-pointer text-sm font-medium flex items-center gap-1.5"
            style={{
              left: buttonPos.x,
              top: buttonPos.y,
              transform: "translate(-50%, -100%)",
            }}
          >
            <ZoomInIcon className="size-4" />
            Zoom in
          </button>
        )}
        </div>

        {/* Fixed tooltip bar below chart */}
        <div className="mt-2 px-2 py-2 h-[68px]">
          {hoveredData ? (
            <div className="space-y-2">
              <div className="flex items-center gap-4 flex-wrap">
                {hoveredData.values.map((v) => (
                  <div key={v.name} className="flex items-center gap-1.5 text-sm">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: v.color }}
                    />
                    <span className="text-muted-foreground">{v.name}</span>
                    <span className="font-medium">{formatCurrency(v.value)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-end pt-2 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="font-semibold">{formatCurrency(hoveredData.total)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-4 flex-wrap h-full">
              {displayedCategories.map((cat) => (
                <div key={cat} className="flex items-center gap-1.5 text-sm">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[cat] }}
                  />
                  <span className="text-muted-foreground">{cat}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
