"use client";

export {
  usePortfolio,
  portfolioQueryOptions,
  type Asset,
  type Portfolio,
} from "@/hooks/use-portfolio";

export function formatPercent(val: number | null) {
  if (val === null) return "—";
  return `${(val * 100).toFixed(2)}%`;
}

export function formatCurrency(val: number | null) {
  if (val === null) return "—";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(val);
}

export { PortfolioTable } from "./PortfolioTable";
export { PortfolioCharts } from "./PortfolioCharts";
