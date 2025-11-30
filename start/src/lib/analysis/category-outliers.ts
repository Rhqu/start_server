import { assetCategories, type AssetCategory } from "@/lib/config/asset-categories";
import { type Asset, type Portfolio } from "@/lib/qplix";

export type OutlierMetric = "totalPerformance" | "twr";

type LeafNode = {
  id: string;
  path: string[];
  subgroup: string;
  asset: Asset;
};

type FlattenedLeaf = LeafNode & {
  metricValue: number;
};

type AssetSample = FlattenedLeaf & {
  totalPerformance: number | null;
  twr: number | null;
  cashFlow: number | null;
  startPerformance?: number | null;
  endPerformance?: number | null;
  startTwr?: number | null;
  endTwr?: number | null;
  deltaTwr?: number | null;
};

export interface GroupSummary {
  subgroup: string;
  assetCount: number;
  totalValue: number;
  meanValue: number;
  shareOfCategory: number;
}

export interface OutlierAsset {
  asset: string;
  subgroup: string;
  path: string[];
  totalPerformance: number | null;
  twr: number | null;
  cashFlow: number | null;
  metricValue: number;
  zScore: number;
  shareOfCategory: number;
  startPerformance?: number | null;
  endPerformance?: number | null;
  startTwr?: number | null;
  endTwr?: number | null;
  deltaTwr?: number | null;
}

export interface CategoryOutlierAnalysis {
  category: { slug: AssetCategory; label: string };
  metric: OutlierMetric;
  sampleSize: number;
  period?: { startDate: string; endDate: string };
  stats: {
    meanValue: number;
    stdDev: number;
    averageAbsValue: number;
    variability: number;
    variabilityBucket: "low" | "medium" | "high";
    percentileApplied: number;
    positiveCount: number;
    negativeCount: number;
  };
  groups: GroupSummary[];
  winners: OutlierAsset[];
  losers: OutlierAsset[];
}

export interface CategoryOutlierInput {
  category: AssetCategory;
  metric?: OutlierMetric;
}

export interface CategoryOutlierDeltaInput extends CategoryOutlierInput {
  startDate?: string;
  endDate?: string;
}

/**
 * Analyse category level winners/losers using the current portfolio snapshot.
 */
export function analyzeCategoryOutliers(
  portfolio: Portfolio,
  params: CategoryOutlierInput,
): CategoryOutlierAnalysis {
  const metric: OutlierMetric = params.metric ?? "totalPerformance";
  const label = assetCategories[params.category]?.label;
  if (!label) {
    throw new Error(`Unsupported category "${params.category}".`);
  }

  const categoryNode = findNodeByLabel(portfolio, label);

  if (!categoryNode) {
    throw new Error(`Category "${label}" was not found in the portfolio tree.`);
  }

  const leaves = flattenLeaves(categoryNode, metric);
  if (leaves.length === 0) {
    throw new Error(`Category "${label}" has no assets with ${metric} data.`);
  }

  const totalAbsValue = leaves.reduce((sum, item) => sum + Math.abs(item.metricValue), 0);
  if (totalAbsValue === 0) {
    throw new Error(`Category "${label}" has zero contribution for ${metric}.`);
  }

  const samples: AssetSample[] = leaves.map((leaf) => ({
    ...leaf,
    totalPerformance: leaf.asset.totalPerformance,
    twr: leaf.asset.twr,
    cashFlow: leaf.asset.externalFlow,
  }));

  const values = samples.map((item) => item.metricValue);
  const meanValue = mean(values);
  const stdDev = standardDeviation(values);
  const averageAbsValue = values.reduce((sum, v) => sum + Math.abs(v), 0) / values.length;
  const variability = averageAbsValue === 0 ? 0 : stdDev / averageAbsValue;
  const { bucket: variabilityBucket, percentile } = pickPercentile(variability);

  const positiveCount = samples.filter((s) => s.metricValue > 0).length;
  const negativeCount = samples.filter((s) => s.metricValue < 0).length;

  const winners = pickOutliers(samples, percentile, "positive", totalAbsValue, meanValue, stdDev);
  const losers = pickOutliers(samples, percentile, "negative", totalAbsValue, meanValue, stdDev);

  const groups = buildGroupSummaries(samples, totalAbsValue);

  return {
    category: { slug: params.category, label },
    metric,
    sampleSize: samples.length,
    stats: {
      meanValue,
      stdDev,
      averageAbsValue,
      variability,
      variabilityBucket,
      percentileApplied: percentile,
      positiveCount,
      negativeCount,
    },
    groups,
    winners,
    losers,
  };
}

export function analyzeCategoryOutlierDelta(
  startPortfolio: Portfolio,
  endPortfolio: Portfolio,
  params: CategoryOutlierDeltaInput,
): CategoryOutlierAnalysis {
  const metric: OutlierMetric = params.metric ?? "totalPerformance";
  const label = assetCategories[params.category]?.label;
  if (!label) {
    throw new Error(`Unsupported category "${params.category}".`);
  }

  const startNode = findNodeByLabel(startPortfolio, label);
  const endNode = findNodeByLabel(endPortfolio, label);

  if (!startNode && !endNode) {
    throw new Error(`Category "${label}" was not found in either snapshot.`);
  }

  const startLeaves = startNode ? flattenLeafNodes(startNode) : [];
  const endLeaves = endNode ? flattenLeafNodes(endNode) : [];

  if (startLeaves.length === 0 && endLeaves.length === 0) {
    throw new Error(`Category "${label}" has no assets to analyze for this period.`);
  }

  const startMap = toLeafMap(startLeaves);
  const endMap = toLeafMap(endLeaves);
  const keys = new Set<string>([
    ...startMap.keys(),
    ...endMap.keys(),
  ]);

  const samples: AssetSample[] = [];

  for (const key of keys) {
    const startLeaf = startMap.get(key);
    const endLeaf = endMap.get(key);
    if (!startLeaf && !endLeaf) continue;

    const startMetric = startLeaf ? getMetricValue(startLeaf.asset, metric) : null;
    const endMetric = endLeaf ? getMetricValue(endLeaf.asset, metric) : null;

    if (startMetric === null && endMetric === null) continue;

    const startValue = startMetric ?? 0;
    const endValue = endMetric ?? 0;
    const metricDelta = endValue - startValue;

    const reference = endLeaf ?? startLeaf!;
    const hasTwr = typeof (endLeaf?.asset.twr ?? startLeaf?.asset.twr) === "number";
    const deltaTwr = hasTwr
      ? (endLeaf?.asset.twr ?? 0) - (startLeaf?.asset.twr ?? 0)
      : null;

    samples.push({
      ...reference,
      metricValue: metricDelta,
      totalPerformance: endLeaf?.asset.totalPerformance ?? startLeaf?.asset.totalPerformance ?? null,
      twr: endLeaf?.asset.twr ?? startLeaf?.asset.twr ?? null,
      cashFlow: endLeaf?.asset.externalFlow ?? startLeaf?.asset.externalFlow ?? null,
      startPerformance: startLeaf?.asset.totalPerformance ?? null,
      endPerformance: endLeaf?.asset.totalPerformance ?? null,
      startTwr: startLeaf?.asset.twr ?? null,
      endTwr: endLeaf?.asset.twr ?? null,
      deltaTwr,
    });
  }

  if (samples.length === 0) {
    throw new Error(`No measurable changes detected for ${label} in the selected period.`);
  }

  const totalAbsValue = samples.reduce((sum, item) => sum + Math.abs(item.metricValue), 0);
  if (totalAbsValue === 0) {
    throw new Error(`Category "${label}" showed no net movement for ${metric}.`);
  }

  const values = samples.map((item) => item.metricValue);
  const meanValue = mean(values);
  const stdDev = standardDeviation(values);
  const averageAbsValue = values.reduce((sum, v) => sum + Math.abs(v), 0) / values.length;
  const variability = averageAbsValue === 0 ? 0 : stdDev / averageAbsValue;
  const { bucket: variabilityBucket, percentile } = pickPercentile(variability);

  const positiveCount = samples.filter((s) => s.metricValue > 0).length;
  const negativeCount = samples.filter((s) => s.metricValue < 0).length;

  const winners = pickOutliers(samples, percentile, "positive", totalAbsValue, meanValue, stdDev);
  const losers = pickOutliers(samples, percentile, "negative", totalAbsValue, meanValue, stdDev);

  const groups = buildGroupSummaries(samples, totalAbsValue);

  return {
    category: { slug: params.category, label },
    metric,
    sampleSize: samples.length,
    period:
      params.startDate && params.endDate
        ? { startDate: params.startDate, endDate: params.endDate }
        : undefined,
    stats: {
      meanValue,
      stdDev,
      averageAbsValue,
      variability,
      variabilityBucket,
      percentileApplied: percentile,
      positiveCount,
      negativeCount,
    },
    groups,
    winners,
    losers,
  };
}

function findNodeByLabel(root: Portfolio, label: string): Asset | null {
  const stack: Asset[] = [root];
  while (stack.length) {
    const node = stack.pop()!;
    if (node.name === label) return node;
    for (const child of node.subLines) {
      stack.push(child);
    }
  }
  return null;
}

function flattenLeaves(node: Asset, metric: OutlierMetric, path: string[] = []): FlattenedLeaf[] {
  return flattenLeafNodes(node, path)
    .map((leaf) => {
      const metricValue = getMetricValue(leaf.asset, metric);
      if (metricValue === null) return null;
      return { ...leaf, metricValue };
    })
    .filter((leaf): leaf is FlattenedLeaf => leaf !== null);
}

function flattenLeafNodes(node: Asset, path: string[] = []): LeafNode[] {
  const currentPath = [...path, node.name];

  if (!node.subLines || node.subLines.length === 0) {
    const subgroup = currentPath.length >= 2 ? currentPath[1] : currentPath[0];
    return [
      {
        id: currentPath.join(" > "),
        path: currentPath,
        subgroup,
        asset: node,
      },
    ];
  }

  return node.subLines.flatMap((child) => flattenLeafNodes(child, currentPath));
}

function toLeafMap(leaves: LeafNode[]): Map<string, LeafNode> {
  const map = new Map<string, LeafNode>();
  for (const leaf of leaves) {
    map.set(leaf.id, leaf);
  }
  return map;
}

function getMetricValue(asset: Asset, metric: OutlierMetric): number | null {
  if (metric === "twr") {
    return typeof asset.twr === "number" ? asset.twr : null;
  }
  if (typeof asset.totalPerformance === "number") {
    return asset.totalPerformance;
  }
  return null;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = mean(values);
  const variance =
    values.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function pickPercentile(variability: number): { bucket: "low" | "medium" | "high"; percentile: number } {
  if (variability < 0.15) return { bucket: "low", percentile: 0.25 };
  if (variability < 0.35) return { bucket: "medium", percentile: 0.15 };
  return { bucket: "high", percentile: 0.1 };
}

function pickOutliers(
  data: AssetSample[],
  percentile: number,
  direction: "positive" | "negative",
  totalAbsValue: number,
  meanValue: number,
  stdDev: number,
): OutlierAsset[] {
  const filtered = data.filter((item) =>
    direction === "positive" ? item.metricValue > 0 : item.metricValue < 0,
  );
  if (filtered.length === 0) return [];

  const sorted = [...filtered].sort((a, b) =>
    direction === "positive" ? b.metricValue - a.metricValue : a.metricValue - b.metricValue,
  );

  const count = Math.max(1, Math.round(data.length * percentile));
  const initialSelection = sorted.slice(0, Math.min(sorted.length, count));

  if (stdDev > 0) {
    const zThreshold = direction === "positive" ? 0.6 : -0.6;
    const zFiltered = initialSelection.filter((item) => {
      const zScore = (item.metricValue - meanValue) / stdDev;
      return direction === "positive" ? zScore >= zThreshold : zScore <= zThreshold;
    });
    if (zFiltered.length > 0) {
      return zFiltered.map((item) => formatOutlier(item, totalAbsValue, meanValue, stdDev));
    }
  }

  return initialSelection.map((item) => formatOutlier(item, totalAbsValue, meanValue, stdDev));
}

function formatOutlier(
  item: AssetSample,
  totalAbsValue: number,
  meanValue: number,
  stdDev: number,
): OutlierAsset {
  const zScore = stdDev > 0 ? (item.metricValue - meanValue) / stdDev : 0;
  return {
    asset: item.asset.name,
    subgroup: item.subgroup,
    path: item.path,
    totalPerformance: item.totalPerformance,
    twr: item.twr,
    cashFlow: item.cashFlow,
    metricValue: item.metricValue,
    zScore,
    shareOfCategory: totalAbsValue === 0 ? 0 : item.metricValue / totalAbsValue,
    startPerformance: item.startPerformance,
    endPerformance: item.endPerformance,
    startTwr: item.startTwr,
    endTwr: item.endTwr,
    deltaTwr: item.deltaTwr,
  };
}

function buildGroupSummaries(data: AssetSample[], totalAbsValue: number): GroupSummary[] {
  const map = new Map<string, { totalValue: number; assets: number }>();

  data.forEach((item) => {
    const entry = map.get(item.subgroup) ?? { totalValue: 0, assets: 0 };
    entry.totalValue += item.metricValue;
    entry.assets += 1;
    map.set(item.subgroup, entry);
  });

  return Array.from(map.entries())
    .map(([subgroup, info]) => ({
      subgroup,
      assetCount: info.assets,
      totalValue: info.totalValue,
      meanValue: info.totalValue / info.assets,
      shareOfCategory: totalAbsValue === 0 ? 0 : info.totalValue / totalAbsValue,
    }))
    .sort((a, b) => Math.abs(b.totalValue) - Math.abs(a.totalValue));
}
