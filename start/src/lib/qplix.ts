/**
 * Qplix API Client
 *
 * Type-safe client for the Qplix wealth management API.
 * Returns portfolio data with full TypeScript autocomplete on category hierarchy.
 *
 * @example
 * ```ts
 * import { getPortfolio } from '~/lib/qplix'
 *
 * const p = await getPortfolio()
 *
 * // Access with full autocomplete:
 * p['Liquid assets']['Stocks']['Individual stocks'].subLines
 * p['Illiquid assets']['Real estate']['Rental objects'].twr
 * p['Liquid assets']['Commodities']['Physical commodities'].totalPerformance
 * ```
 *
 * Portfolio structure:
 * - Liquid assets
 *   - Liquidity
 *   - Stocks (Options, Futures, Individual stocks, Equity funds)
 *   - Bonds
 *   - Commodities (Options, Futures, Funds, Certificates, Physical)
 *   - Alternative investments (Crypto)
 * - Illiquid assets
 *   - Real estate (Holdings, Rental objects)
 *   - Art and collectibles (Vehicles, Jewelry, Art)
 *   - Private equity (Venture, Growth/Buyout)
 *   - Direct holdings (Growth, Bridge)
 *   - Agriculture and forestry
 *   - Alternative energies (Photovoltaics, Wind)
 */

import { createServerFn } from "@tanstack/react-start";
import { readFileSync } from "fs";
import { join } from "path";

// =============================================================================
// CONFIG
// =============================================================================

const BASE_URL = "https://smd43.qplix.com";
const F5_BEARER =
  "m3brPHW19chc7Vr4Pd5LBaTmBQOLoIknjlW3pfG7UMzlaSJo22yXdJsKysorKCY5";
const USERNAME = "qplix@qplix.com";
const PASSWORD = "Power4All";
const LEGAL_ENTITY = "5cb71a8b2c94de98b02aff19";
const PRESET = "691dd7473022610895c23ad9";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Portfolio asset with performance metrics.
 *
 * @property name - Display name of the asset or category
 * @property twr - Time-Weighted Return (decimal, e.g. 0.15 = 15%)
 * @property irr - Internal Rate of Return (decimal)
 * @property externalFlow - Net cash flows (negative = money invested)
 * @property totalPerformance - Absolute gain/loss in EUR
 * @property subLines - Child assets in the hierarchy
 */
export type Asset = {
  name: string;
  /** Time-Weighted Return (decimal, e.g. 0.15 = 15%) */
  twr: number | null;
  /** Internal Rate of Return (decimal) */
  irr: number | null;
  /** Net external cash flows (negative = invested) */
  externalFlow: number | null;
  /** Absolute gain/loss in EUR */
  totalPerformance: number | null;
  /** Child assets */
  subLines: Asset[];
};

// =============================================================================
// API
// =============================================================================

type MetricValue = { rawValue: number | null };
type ResultLine = {
  name: string;
  values: MetricValue[];
  subLines?: ResultLine[];
};
type EvalResult = { resultLine: ResultLine };

async function fetchPortfolio(dueDate?: string): Promise<Asset> {
  // Get token
  const tokenRes = await fetch(`${BASE_URL}/Token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Bearer ${F5_BEARER}`,
    },
    body: `grant_type=password&username=${USERNAME}&password=${PASSWORD}`,
  });
  if (!tokenRes.ok) throw new Error(`Auth failed: ${tokenRes.status}`);
  const token = (await tokenRes.json()).access_token;

  // Get data
  const dueDateParam = dueDate ? `?DueDate=${encodeURIComponent(dueDate)}` : "";
  const res = await fetch(
    `${BASE_URL}/qapi/v1/evaluation/preset/${PRESET}/legalEntity/${LEGAL_ENTITY}${dueDateParam}`,
    {
      headers: {
        Authorization: `Bearer ${F5_BEARER}, Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );
  if (!res.ok) throw new Error(`API error: ${res.status}`);

  const data: EvalResult = await res.json();
  return transform(data.resultLine);
}

function transform(line: ResultLine): Asset {
  return {
    name: line.name,
    twr: line.values[0]?.rawValue ?? null,
    irr: line.values[1]?.rawValue ?? null,
    externalFlow: line.values[2]?.rawValue ?? null,
    totalPerformance: line.values[3]?.rawValue ?? null,
    subLines: line.subLines?.map(transform) ?? [],
  };
}

// =============================================================================
// TYPED PORTFOLIO STRUCTURE
// =============================================================================

type Cat<N extends string, C extends Record<string, Asset>> = Asset & {
  name: N;
} & {
  [K in keyof C]: C[K];
};

function typedNode<T extends Asset>(asset: Asset): T {
  const result = { ...asset } as any;
  for (const sub of asset.subLines) {
    result[sub.name] = typedNode(sub);
  }
  return result;
}

// Stocks
type StocksChildren = {
  "Options on stocks": Asset;
  "Futures on stocks": Asset;
  "Individual stocks": Asset;
  "Equity funds": Asset;
};

// Liquid assets
type LiquidAssetsChildren = {
  Liquidity: Asset;
  Stocks: Cat<"Stocks", StocksChildren>;
  Bonds: Asset;
  Commodities: Cat<
    "Commodities",
    {
      "Options on commodities": Asset;
      "Futures on commodities": Asset;
      "Commodity funds": Asset;
      "Certificates on commodities": Asset;
      "Physical commodities": Asset;
    }
  >;
  "Alternative investments": Cat<
    "Alternative investments",
    {
      "Crypto currencies": Asset;
    }
  >;
};

// Illiquid assets
type IlliquidAssetsChildren = {
  "Real estate": Cat<
    "Real estate",
    {
      "Real estate holdings": Asset;
      "Rental objects": Asset;
    }
  >;
  "Art and collectibles": Cat<
    "Art and collectibles",
    {
      Vehicles: Asset;
      Jewelry: Asset;
      Art: Asset;
    }
  >;
  "Private equity": Cat<
    "Private equity",
    {
      Venture: Asset;
      "Growth / Buyout": Asset;
    }
  >;
  "Direct holdings": Cat<
    "Direct holdings",
    {
      Growth: Asset;
      Bridge: Asset;
    }
  >;
  "Agriculture and forestry": Cat<
    "Agriculture and forestry",
    {
      Forestry: Asset;
    }
  >;
  "Alternative energies": Cat<
    "Alternative energies",
    {
      Photovoltaics: Asset;
      "Wind power": Asset;
    }
  >;
};

// Root
type PortfolioChildren = {
  "Liquid assets": Cat<"Liquid assets", LiquidAssetsChildren>;
  "Illiquid assets": Cat<"Illiquid assets", IlliquidAssetsChildren>;
};

export type Portfolio = Cat<
  "All investments of Family Smith",
  PortfolioChildren
>;

// =============================================================================
// SERVER FUNCTION
// =============================================================================

/**
 * Fetches full portfolio with type-safe category access.
 *
 * @example
 * const p = await getPortfolio()
 * p['Liquid assets']['Stocks']['Individual stocks'].subLines
 * p['Illiquid assets']['Real estate']['Rental objects'].twr
 */
export const getPortfolio = createServerFn({ method: "GET" }).handler(
  async (): Promise<Portfolio> => {
    const data = await fetchPortfolio();
    return typedNode<Portfolio>(data);
  },
);

export const getPortfolioSnapshotByDate = createServerFn({ method: "GET" })
  .inputValidator((data: { dueDate: string }) => data)
  .handler(async ({ data }): Promise<Portfolio> => {
    const snapshot = await fetchPortfolio(data.dueDate);
    return typedNode<Portfolio>(snapshot);
  });

// =============================================================================
// PORTFOLIO TIMESERIES - Daily data from local JSON
// =============================================================================

type TimeSeriesRecord = Record<string, number>;

type SeriesResultValue = {
  type: string;
  rawValue: TimeSeriesRecord | null;
};

type SeriesResultLine = {
  name: string;
  values: SeriesResultValue[];
  subLines?: SeriesResultLine[];
};

type SeriesApiResponse = {
  resultLine: SeriesResultLine;
};

let cachedTimeseries: SeriesApiResponse | null = null;

function loadTimeseries(): SeriesApiResponse {
  if (!cachedTimeseries) {
    const path = join(process.cwd(), "db", "hackathon_timeseries.json");
    cachedTimeseries = JSON.parse(readFileSync(path, "utf-8"));
  }
  return cachedTimeseries!;
}

function normalizeDate(isoDate: string): string {
  return isoDate.split("T")[0];
}

export type TimeseriesDataPoint = {
  date: string;
  twr: number;
  irr: number;
  nav: number;
  externalFlowChange: number;
  periodPnL: number;
  categories: Record<string, { nav: number; twr: number }>;
};

export type PortfolioTimeseries = {
  name: string;
  categoryNames: string[];
  data: TimeseriesDataPoint[];
};

function interpolateWeekends(
  data: TimeseriesDataPoint[],
): TimeseriesDataPoint[] {
  if (data.length === 0) return data;

  let lastValid: TimeseriesDataPoint | null = null;

  return data.map((point) => {
    // Check if any category has zero nav (indicates weekend/missing data)
    const hasZeroCategory = Object.values(point.categories).some(
      (c) => c.nav === 0,
    );
    const needsInterpolation =
      (point.nav === 0 || hasZeroCategory) && lastValid;

    if (needsInterpolation) {
      // Interpolate root metrics if zero
      const interpolated: TimeseriesDataPoint = {
        ...point,
        twr: point.twr || lastValid!.twr,
        irr: point.irr || lastValid!.irr,
        nav: point.nav || lastValid!.nav,
        periodPnL: point.periodPnL || lastValid!.periodPnL,
        categories: {},
      };

      // Interpolate each category
      for (const [name, cat] of Object.entries(point.categories)) {
        const lastCat = lastValid!.categories[name];
        interpolated.categories[name] =
          cat.nav === 0 && lastCat ? { ...lastCat } : cat;
      }

      lastValid = interpolated;
      return interpolated;
    }

    lastValid = point;
    return point;
  });
}

export const getPortfolioTimeseries = createServerFn({ method: "GET" }).handler(
  (): Promise<PortfolioTimeseries> => {
    const { resultLine } = loadTimeseries();
    const v = resultLine.values;

    const twrSeries = v[0]?.rawValue ?? {};
    const externalFlowSeries = v[1]?.rawValue ?? {};
    const irrSeries = v[2]?.rawValue ?? {};
    const navSeries = v[3]?.rawValue ?? {};
    const pnlSeries = v[5]?.rawValue ?? {};

    // Extract category timeseries (depth 1-2: Liquid/Illiquid assets + subcategories)
    const categoryData: Record<
      string,
      Record<string, { nav: number; twr: number }>
    > = {};

    function extractCategories(line: SeriesResultLine, depth = 0) {
      if (depth > 0 && depth <= 2) {
        const nav = line.values[3]?.rawValue ?? {};
        const twr = line.values[0]?.rawValue ?? {};
        categoryData[line.name] = {};
        for (const isoDate of Object.keys(nav)) {
          const date = normalizeDate(isoDate);
          categoryData[line.name][date] = {
            nav: nav[isoDate] ?? 0,
            twr: twr[isoDate] ?? 0,
          };
        }
      }
      for (const sub of line.subLines ?? []) {
        extractCategories(sub, depth + 1);
      }
    }
    extractCategories(resultLine);

    // Build daily data points (dedupe by date)
    const dateMap = new Map<string, TimeseriesDataPoint>();

    for (const isoDate of Object.keys(twrSeries)) {
      const date = normalizeDate(isoDate);
      if (dateMap.has(date)) continue;

      const categories: Record<string, { nav: number; twr: number }> = {};
      for (const [name, series] of Object.entries(categoryData)) {
        categories[name] = series[date] ?? { nav: 0, twr: 0 };
      }

      dateMap.set(date, {
        date,
        twr: twrSeries[isoDate] ?? 0,
        irr: irrSeries[isoDate] ?? 0,
        nav: navSeries[isoDate] ?? 0,
        externalFlowChange: externalFlowSeries[isoDate] ?? 0,
        periodPnL: pnlSeries[isoDate] ?? 0,
        categories,
      });
    }

    const sorted = Array.from(dateMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    const interpolated = interpolateWeekends(sorted);

    return Promise.resolve({
      name: resultLine.name,
      categoryNames: Object.keys(categoryData).sort(),
      data: interpolated,
    });
  },
);

/**
 * Helper to extract a single category timeseries (and portfolio total) within a date window.
 * Uses the same mock timeseries data as getPortfolioTimeseries.
 */
export async function getCategoryTimeseriesData(params: {
  category: string;
  startDate: string;
  endDate: string;
  interval?: Interval;
}): Promise<{
  title: string;
  xLabel: string;
  yLabel: string;
  series: { name: string; points: { x: string; y: number }[] }[];
}> {
  const { category, startDate, endDate } = params;
  const ts = await getPortfolioTimeseries();

  const filtered = ts.data.filter(
    (p) => p.date >= startDate && p.date <= endDate,
  );

  const maxPoints = 12;
  const step = Math.max(1, Math.floor(filtered.length / maxPoints));
  const slice = filtered.filter((_, idx) => idx % step === 0 || idx === filtered.length - 1);

  const categorySeries = slice.map((p) => ({
    x: p.date,
    y: p.categories[category]?.nav ?? 0,
  }));

  const totalSeries = slice.map((p) => ({
    x: p.date,
    y: p.nav,
  }));

  return {
    title: `${category} performance (${params.interval ?? "daily"})`,
    xLabel: "Date",
    yLabel: "EUR",
    series: [
      { name: "Portfolio total", points: totalSeries },
      { name: category, points: categorySeries },
    ],
  };
}
