import { createFileRoute } from "@tanstack/react-router";
import { PortfolioCharts } from "@/components/portfolio";

export const Route = createFileRoute("/dashboard/portfolio")({
  component: PortfolioPage,
});

function PortfolioPage() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">Portfolio Übersicht</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Ihre Vermögensübersicht und Performance-Analyse</p>
      </div>

      <PortfolioCharts />
    </div>
  );
}
