"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Download, RefreshCw, ChevronRight, X, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Droplets, Building2, BarChart3, Printer } from "lucide-react";
import { type Asset, usePortfolio } from ".";
import { Loader } from "@/components/ai-elements/loader";
import { cn } from "@/lib/utils";
import { useSettings } from "@/lib/settings-context";
import { AskAI } from "@/components/AskAI";

// =============================================================================
// TYPES - Strict separation of Category vs Asset
// =============================================================================

/**
 * Represents a category (group) of assets like "Stocks", "Real Estate", etc.
 * This is used for the pie chart, legend, and category-level aggregations.
 */
interface AssetCategory {
  /** Unique identifier / display name for the category */
  id: string;
  /** Display name */
  name: string;
  /** Color for charts and legend */
  color: string;
  /** Total value (sum of all assets in this category) */
  totalValue: number;
  /** Percentage of total portfolio */
  weight: number;
  /** Aggregated TWR for the category */
  twr: number | null;
  /** Aggregated IRR for the category */
  irr: number | null;
  /** Aggregated cash flow */
  cashFlow: number | null;
  /** Aggregated performance */
  performance: number | null;
  /** Parent category name (e.g., "Liquid assets" or "Illiquid assets") */
  parentCategory: string;
}

/**
 * Represents an individual asset within a category.
 * This is the leaf-level item that belongs to exactly one category.
 */
interface IndividualAsset {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** The category this asset belongs to */
  categoryId: string;
  /** Asset value (based on external flow) */
  value: number;
  /** Time-weighted return */
  twr: number | null;
  /** Internal rate of return */
  irr: number | null;
  /** Cash flow */
  cashFlow: number | null;
  /** Performance */
  performance: number | null;
  /** Original Asset object reference */
  originalAsset: Asset;
}

/**
 * Data structure for pie chart display (category-level)
 */
interface PieChartDataPoint {
  name: string;
  value: number;
  fill: string;
  categoryId: string;
  [key: string]: string | number;
}

// =============================================================================
// CONSTANTS - Category Color Mapping
// =============================================================================

const CATEGORY_COLORS: Record<string, string> = {
  // Liquid Assets subcategories
  "Liquidity": "#06b6d4",           // cyan
  "Stocks": "#3b82f6",              // blue
  "Bonds": "#10b981",               // green
  "Commodities": "#8b5cf6",         // purple
  "Alternative investments": "#ec4899", // pink
  
  // Illiquid Assets subcategories
  "Real estate": "#f59e0b",         // orange
  "Art and collectibles": "#ef4444", // red
  "Private equity": "#6366f1",      // indigo
  "Direct holdings": "#6b7280",     // gray
  "Agriculture and forestry": "#22c55e", // emerald
  "Alternative energies": "#eab308", // yellow
  
  // Fallback colors
  "default": "#94a3b8",             // slate
};

const FALLBACK_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899",
  "#06b6d4", "#ef4444", "#6366f1", "#6b7280", "#22c55e",
];

// =============================================================================
// CATEGORIZATION LOGIC - Explicit Category Mapping
// =============================================================================

/**
 * Extracts all categories from the portfolio hierarchy.
 * Categories are the second level in the hierarchy (under "Liquid assets" / "Illiquid assets")
 */
function extractCategories(portfolio: Asset): AssetCategory[] {
  const categories: AssetCategory[] = [];
  let totalPortfolioValue = 0;
  
  // First pass: calculate total portfolio value
  for (const mainCategory of portfolio.subLines) {
    for (const subCategory of mainCategory.subLines) {
      totalPortfolioValue += Math.abs(subCategory.externalFlow || 0);
    }
  }
  
  // Second pass: build categories
  let colorIndex = 0;
  for (const mainCategory of portfolio.subLines) {
    for (const subCategory of mainCategory.subLines) {
      const value = Math.abs(subCategory.externalFlow || 0);
      
      // Only include categories with value
      if (value > 0) {
        const categoryId = subCategory.name.toLowerCase().replace(/\s+/g, "-");
        const color = CATEGORY_COLORS[subCategory.name] || FALLBACK_COLORS[colorIndex % FALLBACK_COLORS.length];
        
        categories.push({
          id: categoryId,
          name: subCategory.name,
          color,
          totalValue: value,
          weight: totalPortfolioValue > 0 ? (value / totalPortfolioValue) * 100 : 0,
          twr: subCategory.twr,
          irr: subCategory.irr,
          cashFlow: subCategory.externalFlow,
          performance: subCategory.totalPerformance,
          parentCategory: mainCategory.name,
        });
        
        colorIndex++;
      }
    }
  }
  
  // Sort by value descending
  return categories.sort((a, b) => b.totalValue - a.totalValue);
}

/**
 * Extracts all individual assets from the portfolio.
 * Assets are the third+ level items, each mapped to exactly one category.
 */
function extractAllAssets(portfolio: Asset): IndividualAsset[] {
  const assets: IndividualAsset[] = [];
  
  for (const mainCategory of portfolio.subLines) {
    for (const subCategory of mainCategory.subLines) {
      const categoryId = subCategory.name.toLowerCase().replace(/\s+/g, "-");
      
      // Recursively extract all leaf assets
      function extractFromAsset(asset: Asset, depth: number = 0) {
        if (asset.subLines.length === 0) {
          // This is a leaf asset
          assets.push({
            id: `${categoryId}-${asset.name.toLowerCase().replace(/\s+/g, "-")}`,
            name: asset.name,
            categoryId,
            value: Math.abs(asset.externalFlow || 0),
            twr: asset.twr,
            irr: asset.irr,
            cashFlow: asset.externalFlow,
            performance: asset.totalPerformance,
            originalAsset: asset,
          });
        } else {
          // Has children, recurse
          for (const child of asset.subLines) {
            extractFromAsset(child, depth + 1);
          }
        }
      }
      
      // Start extraction from each subcategory's children
      for (const child of subCategory.subLines) {
        extractFromAsset(child);
      }
      
      // If subcategory has no children but has value, treat it as its own asset
      if (subCategory.subLines.length === 0 && (subCategory.externalFlow || 0) !== 0) {
        assets.push({
          id: `${categoryId}-self`,
          name: subCategory.name,
          categoryId,
          value: Math.abs(subCategory.externalFlow || 0),
          twr: subCategory.twr,
          irr: subCategory.irr,
          cashFlow: subCategory.externalFlow,
          performance: subCategory.totalPerformance,
          originalAsset: subCategory,
        });
      }
    }
  }
  
  return assets;
}

/**
 * Groups assets by their category ID
 */
function groupAssetsByCategory(
  assets: IndividualAsset[],
  categories: AssetCategory[]
): Map<string, IndividualAsset[]> {
  const grouped = new Map<string, IndividualAsset[]>();
  
  // Initialize all categories with empty arrays
  for (const category of categories) {
    grouped.set(category.id, []);
  }
  
  // Assign each asset to its category
  for (const asset of assets) {
    const categoryAssets = grouped.get(asset.categoryId);
    if (categoryAssets) {
      categoryAssets.push(asset);
    }
  }
  
  // Sort assets within each category by value
  for (const [categoryId, categoryAssets] of grouped) {
    grouped.set(categoryId, categoryAssets.sort((a, b) => b.value - a.value));
  }
  
  return grouped;
}

/**
 * Converts categories to pie chart data format
 */
function categoriesToPieChartData(categories: AssetCategory[]): PieChartDataPoint[] {
  return categories.map((cat) => ({
    name: cat.name,
    value: cat.totalValue,
    fill: cat.color,
    categoryId: cat.id,
  }));
}

/**
 * Extracts cash flow data for bar chart (main category level)
 */
function extractCashFlowData(portfolio: Asset): { name: string; inflow: number; outflow: number }[] {
  return portfolio.subLines.map((mainCat) => {
    const flow = mainCat.externalFlow || 0;
    return {
      name: mainCat.name.replace(" assets", ""),
      inflow: flow < 0 ? Math.abs(flow) : 0,
      outflow: flow > 0 ? flow : 0,
    };
  });
}

// =============================================================================
// CHART CONFIGS
// =============================================================================

const cashFlowChartConfig: ChartConfig = {
  inflow: { label: "Zufluss", color: "#10b981" },
  outflow: { label: "Abfluss", color: "#ef4444" },
};

// =============================================================================
// UI COMPONENTS
// =============================================================================

function ChartSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-[200px] w-full" />
    </div>
  );
}

// Animated number component for currency values
function AnimatedCurrency({
  value,
  className,
  formatFn
}: {
  value: number | null;
  className?: string;
  formatFn: (val: number | null) => string;
}) {
  const spring = useSpring(0, { stiffness: 100, damping: 30 });
  const display = useTransform(spring, (current) => formatFn(current));

  useEffect(() => {
    spring.set(value ?? 0);
  }, [spring, value]);

  if (value === null) return <span className={className}>—</span>;
  return <motion.span className={className}>{display}</motion.span>;
}

// Animated percentage component
function AnimatedPercent({
  value,
  className,
  prefix = "",
}: {
  value: number | null;
  className?: string;
  prefix?: string;
}) {
  const spring = useSpring(0, { stiffness: 100, damping: 30 });
  const display = useTransform(spring, (current) =>
    `${prefix}${current >= 0 && prefix === "" ? "+" : ""}${current.toFixed(2)}%`
  );

  useEffect(() => {
    spring.set(value ?? 0);
  }, [spring, value]);

  if (value === null) return <span className={className}>—</span>;
  return <motion.span className={className}>{display}</motion.span>;
}

// Fade-in animation wrapper
const fadeInVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function FadeInSection({
  children,
  delay = 0,
  className = ""
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeInVariants}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function ChartToolbar({ isLoading }: { isLoading: boolean }) {
  const { t } = useSettings();

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h2 className="text-lg font-semibold">Portfolio Analytics</h2>
        <p className="text-sm text-muted-foreground">Qplix</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => window.location.reload()} disabled={isLoading}>
          <RefreshCw className={cn("size-4 mr-2", isLoading && "animate-spin")} />
          {t("refresh")}
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="size-4 mr-2" />
          {t("print")}
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// LIQUIDITY COMPARISON CHART - Liquid vs Illiquid with correct percentages
// =============================================================================


// =============================================================================
// CASH FLOW CARD - Clear, structured overview of inflows/outflows
// =============================================================================

// =============================================================================
// CASH FLOW CARD - Clear, structured overview of inflows/outflows
// =============================================================================

interface CategoryCashFlow {
  name: string;
  displayName: string;
  inflow: number;
  outflow: number;
  net: number;
}

function CashFlowCard({
  portfolio,
  isLoading,
}: {
  portfolio: Asset;
  isLoading: boolean;
}) {
  const { formatCurrency, t } = useSettings();
  
  // Calculate cash flow data
  const cashFlowData = useMemo(() => {
    const categories: CategoryCashFlow[] = portfolio.subLines.map((mainCat) => {
      const flow = mainCat.externalFlow || 0;
      return {
        name: mainCat.name,
        displayName: mainCat.name.replace(" assets", ""),
        inflow: flow < 0 ? Math.abs(flow) : 0,
        outflow: flow > 0 ? flow : 0,
        net: flow,
      };
    });

    const totalInflow = categories.reduce((sum, c) => sum + c.inflow, 0);
    const totalOutflow = categories.reduce((sum, c) => sum + c.outflow, 0);
    const netCashFlow = totalInflow - totalOutflow;

    return { categories, totalInflow, totalOutflow, netCashFlow };
  }, [portfolio]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <ChartSkeleton />
        </CardContent>
      </Card>
    );
  }

  const { categories, totalInflow, totalOutflow, netCashFlow } = cashFlowData;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t("cashFlow")}</CardTitle>
            <CardDescription>{t("capitalFlows")}</CardDescription>
          </div>
          <AskAI
            prompt="Use cashFlowSummary to get inflows/outflows, then show a barChart comparing liquid vs illiquid net flows."
            title="Analyze cash flows"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Primary Metrics - Clean 3-column layout */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {/* Inflows Section */}
          <div className="space-y-1 sm:space-y-2 min-w-0">
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="size-2 rounded-full bg-success/80 shrink-0" />
              <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
                {t("inflows")}
              </span>
            </div>
            <p className="text-sm sm:text-lg font-bold font-mono tabular-nums text-success/90 truncate">
              {formatCurrency(totalInflow)}
            </p>
          </div>

          {/* Outflows Section */}
          <div className="space-y-1 sm:space-y-2 min-w-0">
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="size-2 rounded-full bg-destructive/80 shrink-0" />
              <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
                {t("outflows")}
              </span>
            </div>
            <p className="text-sm sm:text-lg font-bold font-mono tabular-nums text-destructive/90 truncate">
              {formatCurrency(totalOutflow)}
            </p>
          </div>

          {/* Net Flow Section */}
          <div className="space-y-1 sm:space-y-2 min-w-0">
            <div className="flex items-center gap-1 sm:gap-2">
              {netCashFlow >= 0 ? (
                <TrendingUp className="size-3 text-success/90 shrink-0" />
              ) : (
                <TrendingDown className="size-3 text-destructive/90 shrink-0" />
              )}
              <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
                {t("net")}
              </span>
            </div>
            <p
              className={cn(
                "text-sm sm:text-lg font-bold font-mono tabular-nums truncate",
                netCashFlow >= 0 ? "text-success/90" : "text-destructive/90"
              )}
            >
              {netCashFlow >= 0 ? "+" : ""}
              {formatCurrency(netCashFlow)}
            </p>
          </div>
        </div>

        {/* Visual Comparison Bar */}
        <div className="space-y-2">
          <div className="h-3 rounded-full overflow-hidden flex bg-muted">
            {totalInflow > 0 && (
              <div
                className="h-full bg-success/70 transition-all duration-500"
                style={{
                  width: `${(totalInflow / (totalInflow + totalOutflow)) * 100}%`,
                }}
              />
            )}
            {totalOutflow > 0 && (
              <div
                className="h-full bg-destructive/70 transition-all duration-500"
                style={{
                  width: `${(totalOutflow / (totalInflow + totalOutflow)) * 100}%`,
                }}
              />
            )}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {((totalInflow / (totalInflow + totalOutflow || 1)) * 100).toFixed(0)}% {t("inflow")}
            </span>
            <span>
              {((totalOutflow / (totalInflow + totalOutflow || 1)) * 100).toFixed(0)}% {t("outflow")}
            </span>
          </div>
        </div>

        <Separator />

        {/* Category Breakdown - Simplified */}
        <div>
          <p className="text-sm font-medium mb-3">{t("byLiquidityType")}</p>
          <div className="space-y-2">
            {categories.map((category) => {
              const isPositive = category.net <= 0;
              const scrollTargetId = category.name === "Liquid assets" 
                ? "performance-liquid" 
                : "performance-illiquid";
              
              const handleClick = () => {
                const element = document.getElementById(scrollTargetId);
                if (element) {
                  element.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              };
              
              const categoryLabel = category.name === "Liquid assets" ? t("liquid") : t("illiquid");
              
              return (
                <button
                  key={category.name}
                  onClick={handleClick}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "size-8 rounded-lg flex items-center justify-center",
                        isPositive ? "bg-success/15" : "bg-destructive/15"
                      )}
                    >
                      {isPositive ? (
                        <ArrowDownRight className="size-4 text-success/90" />
                      ) : (
                        <ArrowUpRight className="size-4 text-destructive/90" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{categoryLabel}</p>
                      <p className="text-xs text-muted-foreground">
                        {category.inflow > 0 && `+${formatCurrency(category.inflow)} ${t("inflow")}`}
                        {category.inflow > 0 && category.outflow > 0 && " · "}
                        {category.outflow > 0 && `-${formatCurrency(category.outflow)} ${t("outflow")}`}
                        {category.inflow === 0 && category.outflow === 0 && t("noMovements")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right min-w-0">
                    <p
                      className={cn(
                        "text-base sm:text-lg font-bold font-mono tabular-nums truncate",
                        isPositive ? "text-success" : "text-destructive"
                      )}
                    >
                      {isPositive ? "+" : ""}
                      {formatCurrency(Math.abs(category.net))}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                      {isPositive ? t("netInflow") : t("netOutflow")}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Summary Note */}
        <div className="rounded-lg bg-muted/30 p-2 sm:p-3 text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
          {netCashFlow >= 0 ? (
            <>
              <TrendingUp className="size-4 text-success shrink-0" />
              <span className="truncate">
                {t("totalInflowMore")} <span className="font-medium text-foreground font-mono tabular-nums">{formatCurrency(Math.abs(netCashFlow))}</span> {t("intoPortfolio")}
              </span>
            </>
          ) : (
            <>
              <TrendingDown className="size-4 text-destructive shrink-0" />
              <span className="truncate">
                {t("totalInflowMore")} <span className="font-medium text-foreground font-mono tabular-nums">{formatCurrency(Math.abs(netCashFlow))}</span> {t("outOfPortfolio")}
              </span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Legacy wrapper for backward compatibility
function CashFlowBarChart({
  data,
  isLoading,
  portfolio,
}: {
  data: { name: string; inflow: number; outflow: number }[];
  isLoading: boolean;
  portfolio?: Asset;
}) {
  const { formatCurrency, t } = useSettings();
  
  // If we have portfolio data, use the new enhanced card
  if (portfolio) {
    return <CashFlowCard portfolio={portfolio} isLoading={isLoading} />;
  }

  // Fallback to simple display if no portfolio
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <ChartSkeleton />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>{t("cashFlow")}</CardTitle>
        <CardDescription>{t("capitalFlows")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={cashFlowChartConfig} className="h-[250px] w-full">
          <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
            />
            <ChartTooltip
              content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="inflow" fill="var(--color-inflow)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="outflow" fill="var(--color-outflow)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

// Category Legend Item (for pie chart)
function CategoryLegendItem({
  category,
  isSelected,
  onClick,
}: {
  category: AssetCategory;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { formatCurrency } = useSettings();
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-left w-full",
        "hover:bg-accent/80 border border-transparent",
        isSelected && "bg-accent border-border ring-1 ring-ring/20"
      )}
    >
      <div
        className="size-3 rounded-sm shrink-0"
        style={{ backgroundColor: category.color }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{category.name}</p>
        <p className="text-xs text-muted-foreground">
          {formatCurrency(category.totalValue)} · {category.weight.toFixed(1)}%
        </p>
      </div>
      <ChevronRight
        className={cn(
          "size-4 text-muted-foreground transition-transform shrink-0",
          isSelected && "rotate-90"
        )}
      />
    </button>
  );
}

// Allocation Pie Chart with Category Legend - Grouped by Liquidity
function AllocationPieChart({
  categories,
  pieData,
  selectedCategoryId,
  onCategorySelect,
  isLoading,
}: {
  categories: AssetCategory[];
  pieData: PieChartDataPoint[];
  selectedCategoryId: string | null;
  onCategorySelect: (categoryId: string | null) => void;
  isLoading: boolean;
}) {
  const { formatCurrency, t } = useSettings();
  const [liquidityFilter, setLiquidityFilter] = useState<"all" | "liquid" | "illiquid">("all");

  if (isLoading) {
    return (
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <ChartSkeleton />
        </CardContent>
      </Card>
    );
  }

  // Group categories by liquidity type
  const liquidCategories = categories.filter((c) => c.parentCategory === "Liquid assets");
  const illiquidCategories = categories.filter((c) => c.parentCategory === "Illiquid assets");

  // Filter categories and pieData based on liquidity filter
  const filteredCategories = liquidityFilter === "all" 
    ? categories 
    : liquidityFilter === "liquid" 
      ? liquidCategories 
      : illiquidCategories;
  
  const filteredPieData = liquidityFilter === "all"
    ? pieData
    : pieData.filter((d) => {
        const cat = categories.find((c) => c.id === d.categoryId);
        if (!cat) return false;
        return liquidityFilter === "liquid" 
          ? cat.parentCategory === "Liquid assets"
          : cat.parentCategory === "Illiquid assets";
      });

  const total = filteredPieData.reduce((sum, d) => sum + d.value, 0);
  const allTotal = pieData.reduce((sum, d) => sum + d.value, 0);

  // Build chart config from categories
  const chartConfig: ChartConfig = filteredCategories.reduce((acc, cat) => {
    acc[cat.id] = { label: cat.name, color: cat.color };
    return acc;
  }, {} as ChartConfig);

  // Calculate totals for each group
  const liquidTotal = liquidCategories.reduce((sum, c) => sum + c.totalValue, 0);
  const illiquidTotal = illiquidCategories.reduce((sum, c) => sum + c.totalValue, 0);
  const liquidPercent = allTotal > 0 ? (liquidTotal / allTotal) * 100 : 0;
  const illiquidPercent = allTotal > 0 ? (illiquidTotal / allTotal) * 100 : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t("assetAllocation")}</CardTitle>
            <CardDescription>
              {t("clickCategoryDetails")}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <AskAI
              prompt="Use allocationData to get asset allocation breakdown, then show a pieChart of the distribution by category."
              title="Analyze allocation"
            />
            {selectedCategoryId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCategorySelect(null)}
                className="text-muted-foreground"
              >
                <X className="size-4 mr-1" />
                {t("clearSelection")}
              </Button>
            )}
          </div>
        </div>
        {/* Liquidity Filter Tabs */}
        <div className="flex items-center gap-4 mt-3 text-sm border-b border-dashed pb-2">
          <button
            onClick={() => setLiquidityFilter("all")}
            className={cn(
              "pb-1 transition-colors",
              liquidityFilter === "all"
                ? "text-foreground border-b-2 border-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t("all")}
          </button>
          <span className="text-border">|</span>
          <button
            onClick={() => setLiquidityFilter("liquid")}
            className={cn(
              "flex items-center gap-1.5 pb-1 transition-colors",
              liquidityFilter === "liquid"
                ? "text-foreground border-b-2 border-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Droplets className="size-3.5" />
            {t("liquid")}
            <span className="text-xs text-muted-foreground">({liquidPercent.toFixed(0)}%)</span>
          </button>
          <span className="text-border">|</span>
          <button
            onClick={() => setLiquidityFilter("illiquid")}
            className={cn(
              "flex items-center gap-1.5 pb-1 transition-colors",
              liquidityFilter === "illiquid"
                ? "text-foreground border-b-2 border-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Building2 className="size-3.5" />
            {t("illiquid")}
            <span className="text-xs text-muted-foreground">({illiquidPercent.toFixed(0)}%)</span>
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, _name, props) => [
                      `${formatCurrency(value as number)} (${(((value as number) / total) * 100).toFixed(1)}%)`,
                      (props as { payload?: { name?: string } }).payload?.name ?? "",
                    ]}
                  />
                }
              />
              <Pie
                data={filteredPieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={100}
                paddingAngle={2}
                onClick={(_, index) => {
                  const clickedCategoryId = filteredPieData[index].categoryId;
                  onCategorySelect(
                    selectedCategoryId === clickedCategoryId ? null : clickedCategoryId
                  );
                }}
                style={{ cursor: "pointer" }}
              >
                {filteredPieData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.fill}
                    opacity={selectedCategoryId && selectedCategoryId !== entry.categoryId ? 0.4 : 1}
                    stroke={selectedCategoryId === entry.categoryId ? "hsl(var(--foreground))" : "transparent"}
                    strokeWidth={selectedCategoryId === entry.categoryId ? 2 : 0}
                  />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>

          {/* Category Legend - Grouped by Liquidity */}
          <div className="flex flex-col gap-4 max-h-[280px] overflow-y-auto pr-2 scrollbar-hide">
            {/* Liquid Assets Group - Show when filter is 'all' or 'liquid' */}
            {(liquidityFilter === "all" || liquidityFilter === "liquid") && liquidCategories.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-dashed">
                  <div className="flex items-center gap-2">
                    <Droplets className="size-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">{t("liquidAssets")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">{formatCurrency(liquidTotal)}</span>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {liquidPercent.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1">
                  {liquidCategories.map((category) => (
                    <CategoryLegendItem
                      key={category.id}
                      category={category}
                      isSelected={selectedCategoryId === category.id}
                      onClick={() =>
                        onCategorySelect(
                          selectedCategoryId === category.id ? null : category.id
                        )
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Illiquid Assets Group - Show when filter is 'all' or 'illiquid' */}
            {(liquidityFilter === "all" || liquidityFilter === "illiquid") && illiquidCategories.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-dashed">
                  <div className="flex items-center gap-2">
                    <Building2 className="size-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">{t("illiquidAssets")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">{formatCurrency(illiquidTotal)}</span>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {illiquidPercent.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1">
                  {illiquidCategories.map((category) => (
                    <CategoryLegendItem
                      key={category.id}
                      category={category}
                      isSelected={selectedCategoryId === category.id}
                      onClick={() =>
                        onCategorySelect(
                          selectedCategoryId === category.id ? null : category.id
                        )
                      }
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Category Assets Detail Card - Shows ALL assets in the selected category
function CategoryAssetsCard({
  selectedCategoryId,
  categories,
  assetsByCategory,
}: {
  selectedCategoryId: string | null;
  categories: AssetCategory[];
  assetsByCategory: Map<string, IndividualAsset[]>;
}) {
  const { formatCurrency, formatPercent, t } = useSettings();
  
  if (!selectedCategoryId) return null;

  const category = categories.find((c) => c.id === selectedCategoryId);
  if (!category) return null;

  const assets = assetsByCategory.get(selectedCategoryId) || [];

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div
            className="size-4 rounded-sm"
            style={{ backgroundColor: category.color }}
          />
          <div className="flex-1">
            <CardTitle className="text-lg">{category.name}</CardTitle>
            <CardDescription>
              {assets.length} {t("asset")}{assets.length !== 1 ? "s" : ""} {t("assetsInCategory").toLowerCase()} {t("category").toLowerCase()}
            </CardDescription>
          </div>
          <Badge
            variant={category.twr !== null && category.twr >= 0 ? "default" : "destructive"}
            className="font-mono"
          >
            TWR: {formatPercent(category.twr)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Category Summary Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4">
          <div className="rounded-lg bg-background p-2 sm:p-3 border min-w-0">
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">{t("cashFlow")}</p>
            <p className="text-sm sm:text-lg font-semibold font-mono tabular-nums truncate">
              {formatCurrency(category.cashFlow)}
            </p>
          </div>
          <div className="rounded-lg bg-background p-2 sm:p-3 border min-w-0">
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">{t("performance")}</p>
            <p
              className={cn(
                "text-sm sm:text-lg font-semibold font-mono tabular-nums truncate",
                category.performance !== null &&
                  (category.performance >= 0 ? "text-success/90" : "text-destructive/90")
              )}
            >
              {formatCurrency(category.performance)}
            </p>
          </div>
          <div className="rounded-lg bg-background p-2 sm:p-3 border min-w-0">
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">{t("share")}</p>
            <p className="text-sm sm:text-lg font-semibold font-mono tabular-nums truncate">
              {category.weight.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Assets Table - ALL assets in this category */}
        {assets.length > 0 && (
          <>
            <Separator className="my-4" />
            <div>
              <p className="text-sm font-medium mb-3">
                {t("assetsInCategory")} {category.name}
              </p>
              <div className="rounded-lg border bg-background overflow-hidden">
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 py-2 px-4 text-xs text-muted-foreground border-b bg-muted/30">
                  <span>{t("asset")}</span>
                  <span>TWR</span>
                  <span className="w-24 text-right">{t("cashFlow")}</span>
                  <span className="w-24 text-right">{t("performance")}</span>
                </div>
                <div className="divide-y divide-border/50 max-h-[300px] overflow-y-auto">
                  {assets.map((asset) => (
                    <div
                      key={asset.id}
                      className="grid grid-cols-[1fr_auto_auto_auto] gap-4 py-2.5 px-4 items-center hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-sm truncate">{asset.name}</span>
                      <Badge
                        variant={
                          asset.twr === null
                            ? "secondary"
                            : asset.twr >= 0
                              ? "default"
                              : "destructive"
                        }
                        className="font-mono text-xs"
                      >
                        {formatPercent(asset.twr)}
                      </Badge>
                      <span className="text-sm text-muted-foreground font-mono w-24 text-right">
                        {formatCurrency(asset.cashFlow)}
                      </span>
                      <span
                        className={cn(
                          "text-sm font-mono w-24 text-right",
                          asset.performance !== null &&
                            (asset.performance >= 0 ? "text-success/90" : "text-destructive/90")
                        )}
                      >
                        {formatCurrency(asset.performance)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {assets.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("noAssetsInCategory")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Performance Category Card - Individual category performance display
function PerformanceCategoryCard({
  name,
  color,
  twr,
  irr,
  cashFlow,
  performance,
  weight,
  assetCount,
}: {
  name: string;
  color: string;
  twr: number | null;
  irr: number | null;
  cashFlow: number | null;
  performance: number | null;
  weight: number;
  assetCount: number;
}) {
  const { formatCurrency, t } = useSettings();
  const twrValue = twr !== null ? twr * 100 : null;
  const irrValue = irr !== null ? irr * 100 : null;
  const isPositive = twrValue !== null && twrValue >= 0;

  return (
    <div className="group relative rounded-xl border bg-card p-4 hover:shadow-md transition-all duration-200 hover:border-primary/30">
      {/* Color indicator bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
        style={{ backgroundColor: color }}
      />
      
      {/* Header */}
      <div className="flex items-start justify-between mb-4 pl-2">
        <div className="flex items-center gap-2">
          <div
            className="size-3 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
          <div>
            <h4 className="font-semibold text-sm">{name}</h4>
            <p className="text-xs text-muted-foreground">
              {assetCount} {t("asset")}{assetCount !== 1 ? "s" : ""} · {weight.toFixed(1)}% {t("share")}
            </p>
          </div>
        </div>
        <Badge
          variant={isPositive ? "default" : "destructive"}
          className={cn(
            "font-mono text-xs px-2 py-0.5",
            isPositive ? "bg-success/15 text-success/90 hover:bg-success/20" : "bg-destructive/15 text-destructive/90 hover:bg-destructive/20"
          )}
        >
          {twrValue !== null ? `${twrValue >= 0 ? "+" : ""}${twrValue.toFixed(2)}%` : "—"}
        </Badge>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 pl-2">
        {/* TWR */}
        <div className="space-y-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">TWR</p>
          <div className="flex items-baseline gap-1">
            <span
              className={cn(
                "text-base sm:text-lg font-bold font-mono tabular-nums truncate",
                isPositive ? "text-success" : "text-destructive"
              )}
            >
              {twrValue !== null ? `${twrValue.toFixed(2)}%` : "—"}
            </span>
            {twrValue !== null && (
              <span className="text-xs text-muted-foreground">
                {isPositive ? "↑" : "↓"}
              </span>
            )}
          </div>
        </div>

        {/* IRR */}
        <div className="space-y-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">IRR</p>
          <div className="flex items-baseline gap-1">
            <span
              className={cn(
                "text-base sm:text-lg font-bold font-mono tabular-nums truncate",
                irrValue !== null && irrValue >= 0 ? "text-success" : "text-destructive"
              )}
            >
              {irrValue !== null ? `${irrValue.toFixed(2)}%` : "—"}
            </span>
          </div>
        </div>

        {/* Cash Flow */}
        <div className="space-y-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{t("cashFlow")}</p>
          <span className="text-xs sm:text-sm font-mono tabular-nums text-foreground truncate block">
            {formatCurrency(cashFlow)}
          </span>
        </div>

        {/* Performance */}
        <div className="space-y-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{t("performance")}</p>
          <span
            className={cn(
              "text-xs sm:text-sm font-mono tabular-nums font-semibold truncate block",
              performance !== null && performance >= 0 ? "text-success" : "text-destructive"
            )}
          >
            {formatCurrency(performance)}
          </span>
        </div>
      </div>

      {/* Weight Progress Bar */}
      <div className="mt-4 pl-2">
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ 
              width: `${Math.min(weight, 100)}%`,
              backgroundColor: color 
            }}
          />
        </div>
      </div>
    </div>
  );
}

// Portfolio Total Summary Section (no card wrapper)
function PortfolioTotalSection({ portfolio }: { portfolio: Asset }) {
  const { formatCurrency, t } = useSettings();
  const twrValue = portfolio.twr !== null ? portfolio.twr * 100 : null;
  const irrValue = portfolio.irr !== null ? portfolio.irr * 100 : null;
  const isPositive = twrValue !== null && twrValue >= 0;
  const irrPositive = irrValue !== null && irrValue >= 0;
  const perfPositive = portfolio.totalPerformance !== null && portfolio.totalPerformance >= 0;

  return (
    <div className="pb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        {/* Left: Title */}
        <div>
          <h2 className="font-bold text-lg">{t("totalPortfolio")}</h2>
          <p className="text-sm text-muted-foreground">{t("familySmith")}</p>
        </div>

        {/* Right: Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {/* TWR */}
          <div className="text-center lg:text-right min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">TWR</p>
            <AnimatedPercent
              value={twrValue}
              className={cn(
                "text-lg sm:text-xl lg:text-2xl font-bold font-mono tabular-nums truncate block",
                isPositive ? "text-success" : "text-destructive"
              )}
            />
          </div>

          {/* IRR */}
          <div className="text-center lg:text-right min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">IRR</p>
            <AnimatedPercent
              value={irrValue}
              className={cn(
                "text-lg sm:text-xl lg:text-2xl font-bold font-mono tabular-nums truncate block",
                irrPositive ? "text-success" : "text-destructive"
              )}
            />
          </div>

          {/* Cash Flow */}
          <div className="text-center lg:text-right min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">{t("cashFlow")}</p>
            <AnimatedCurrency
              value={portfolio.externalFlow}
              formatFn={formatCurrency}
              className="text-lg sm:text-xl lg:text-2xl font-bold font-mono tabular-nums text-foreground truncate block"
            />
          </div>

          {/* Performance */}
          <div className="text-center lg:text-right min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">{t("performance")}</p>
            <AnimatedCurrency
              value={portfolio.totalPerformance}
              formatFn={formatCurrency}
              className={cn(
                "text-lg sm:text-xl lg:text-2xl font-bold font-mono tabular-nums truncate block",
                perfPositive ? "text-success" : "text-destructive"
              )}
            />
          </div>
        </div>
      </div>
      <Separator className="mt-6 border-dashed" />
    </div>
  );
}

// Main Category Section (Liquid/Illiquid)
function MainCategorySectionCard({
  id,
  title,
  icon: Icon,
  asset,
  categories,
  assetsByCategory,
}: {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  asset: Asset | undefined;
  categories: AssetCategory[];
  assetsByCategory: Map<string, IndividualAsset[]>;
}) {
  const { formatCurrency, t } = useSettings();

  if (!asset) return null;

  const twrValue = asset.twr !== null ? asset.twr * 100 : null;
  const isPositive = twrValue !== null && twrValue >= 0;

  // Filter categories belonging to this main category
  const relevantCategories = categories.filter(
    (cat) => cat.parentCategory === asset.name
  );

  return (
    <div id={id} className="space-y-4 scroll-mt-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-muted flex items-center justify-center">
            <Icon className="size-4 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-xs text-muted-foreground">
              {relevantCategories.length} {t("category").toLowerCase()}{relevantCategories.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="text-right min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">TWR</p>
            <p
              className={cn(
                "text-base sm:text-lg font-bold font-mono tabular-nums truncate",
                isPositive ? "text-success" : "text-destructive"
              )}
            >
              {twrValue !== null ? `${twrValue.toFixed(2)}%` : "—"}
            </p>
          </div>
          <div className="text-right min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("performance")}</p>
            <p
              className={cn(
                "text-base sm:text-lg font-bold font-mono tabular-nums truncate",
                asset.totalPerformance !== null && asset.totalPerformance >= 0
                  ? "text-success"
                  : "text-destructive"
              )}
            >
              {formatCurrency(asset.totalPerformance)}
            </p>
          </div>
        </div>
      </div>

      {/* Category Cards Grid */}
      {relevantCategories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {relevantCategories.map((category) => (
            <PerformanceCategoryCard
              key={category.id}
              name={category.name}
              color={category.color}
              twr={category.twr}
              irr={category.irr}
              cashFlow={category.cashFlow}
              performance={category.performance}
              weight={category.weight}
              assetCount={(assetsByCategory.get(category.id) || []).length}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-8">
          {t("noAssetsInCategory")}
        </p>
      )}
    </div>
  );
}

// Performance Summary Component - Main export
function PerformanceSummaryTable({
  portfolio,
  categories,
  assetsByCategory,
}: {
  portfolio: Asset;
  categories: AssetCategory[];
  assetsByCategory: Map<string, IndividualAsset[]>;
}) {
  const { t } = useSettings();
  const [activeTab, setActiveTab] = useState<"liquid" | "illiquid">("liquid");
  const liquidAssets = portfolio.subLines.find((s) => s.name === "Liquid assets");
  const illiquidAssets = portfolio.subLines.find((s) => s.name === "Illiquid assets");

  return (
    <div className="space-y-6">
      {/* Section Header with Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-lg font-semibold">{t("performanceOverview")}</h2>
            <p className="text-sm text-muted-foreground">{t("byLiquidityType")}</p>
          </div>
          <AskAI
            prompt="Use performanceByCategory to get TWR/IRR metrics for all categories, then show a barChart comparing performance across categories."
            title="Analyze performance"
          />
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-4 text-sm border-b border-dashed pb-2 sm:border-0 sm:pb-0">
          <button
            onClick={() => setActiveTab("liquid")}
            className={cn(
              "flex items-center gap-1.5 pb-1 sm:pb-0 sm:px-3 sm:py-1.5 sm:rounded-md transition-colors",
              activeTab === "liquid"
                ? "text-foreground border-b-2 border-foreground font-medium sm:border-0 sm:bg-muted"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Droplets className="size-3.5" />
            {t("liquid")}
          </button>
          <span className="text-border sm:hidden">|</span>
          <button
            onClick={() => setActiveTab("illiquid")}
            className={cn(
              "flex items-center gap-1.5 pb-1 sm:pb-0 sm:px-3 sm:py-1.5 sm:rounded-md transition-colors",
              activeTab === "illiquid"
                ? "text-foreground border-b-2 border-foreground font-medium sm:border-0 sm:bg-muted"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Building2 className="size-3.5" />
            {t("illiquid")}
          </button>
        </div>
      </div>

      {/* Content based on active tab */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, x: activeTab === "liquid" ? -20 : 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === "liquid" ? (
          <MainCategorySectionCard
            id="performance-liquid"
            title={t("liquidAssets")}
            icon={Droplets}
            asset={liquidAssets}
            categories={categories}
            assetsByCategory={assetsByCategory}
          />
        ) : (
          <MainCategorySectionCard
            id="performance-illiquid"
            title={t("illiquidAssets")}
            icon={Building2}
            asset={illiquidAssets}
            categories={categories}
            assetsByCategory={assetsByCategory}
          />
        )}
      </motion.div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PortfolioCharts() {
  const { data: portfolio, isLoading, error, refetch } = usePortfolio();
  
  // =========================================================================
  // Category State
  // =========================================================================
  
  // State: Selected category (by ID, not name)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  
  // Hook 1: Categories (derived from portfolio)
  const categories = useMemo<AssetCategory[]>(
    () => (portfolio ? extractCategories(portfolio) : []),
    [portfolio]
  );
  
  // Hook 2: All individual assets (derived from portfolio)
  const allAssets = useMemo<IndividualAsset[]>(
    () => (portfolio ? extractAllAssets(portfolio) : []),
    [portfolio]
  );
  
  // Hook 3: Assets grouped by category (derived from assets + categories)
  const assetsByCategory = useMemo<Map<string, IndividualAsset[]>>(
    () => groupAssetsByCategory(allAssets, categories),
    [allAssets, categories]
  );
  
  // Hook 4: Pie chart data (derived from categories, NOT assets)
  const pieChartData = useMemo<PieChartDataPoint[]>(
    () => categoriesToPieChartData(categories),
    [categories]
  );
  
  // Hook 5: Cash flow data (from portfolio main categories)
  const cashFlowData = useMemo(
    () => (portfolio ? extractCashFlowData(portfolio) : []),
    [portfolio]
  );

  // =========================================================================
  // RENDER
  // =========================================================================

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
        Fehler beim Laden der Portfolio-Daten: {error.message}
      </div>
    );
  }

  if (!portfolio) return null;

  return (
    <div className="space-y-6">
      {/* Portfolio Total - moved to top */}
      <FadeInSection delay={0}>
        <PortfolioTotalSection portfolio={portfolio} />
      </FadeInSection>

      <FadeInSection delay={0.1}>
        <ChartToolbar isLoading={isLoading} />
      </FadeInSection>

      {/* Cash Flow - Full Width */}
      <FadeInSection delay={0.2}>
        <CashFlowBarChart data={cashFlowData} isLoading={isLoading} portfolio={portfolio} />
      </FadeInSection>

      {/* Allocation Pie Chart - uses CATEGORY data, not asset data */}
      <FadeInSection delay={0.3}>
        <AllocationPieChart
          categories={categories}
          pieData={pieChartData}
          selectedCategoryId={selectedCategoryId}
          onCategorySelect={setSelectedCategoryId}
          isLoading={isLoading}
        />
      </FadeInSection>

      {/* Selected Category Details - shows ALL assets in that category */}
      <CategoryAssetsCard
        selectedCategoryId={selectedCategoryId}
        categories={categories}
        assetsByCategory={assetsByCategory}
      />

      {/* Performance Summary - Category-based cards */}
      <FadeInSection delay={0.4}>
        <PerformanceSummaryTable
          portfolio={portfolio}
          categories={categories}
          assetsByCategory={assetsByCategory}
        />
      </FadeInSection>
    </div>
  );
}
