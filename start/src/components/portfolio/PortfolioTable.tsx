"use client";

import { type Asset, usePortfolio } from ".";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader } from "@/components/ai-elements/loader";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useSettings } from "@/lib/settings-context";
import { AskAI } from "@/components/AskAI";

function AssetRow({ asset, depth = 0 }: { asset: Asset; depth?: number }) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = asset.subLines.length > 0;
  const { formatCurrency, formatPercent } = useSettings();

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          "grid grid-cols-[1fr_auto_auto_auto] gap-2 sm:gap-4 py-2 px-2 sm:px-3 items-center hover:bg-muted/50 rounded",
          depth === 0 && "font-semibold"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <CollapsibleTrigger asChild disabled={!hasChildren}>
          <button
            className={cn(
              "flex items-center gap-1 sm:gap-2 text-left min-w-0",
              !hasChildren && "cursor-default"
            )}
          >
            {hasChildren && (
              <ChevronRight
                className={cn(
                  "size-3 sm:size-4 shrink-0 transition-transform",
                  open && "rotate-90"
                )}
              />
            )}
            {!hasChildren && <span className="w-3 sm:w-4" />}
            <span className="truncate text-xs sm:text-sm">{asset.name}</span>
          </button>
        </CollapsibleTrigger>
        <Badge
          variant={
            asset.twr === null
              ? "secondary"
              : asset.twr >= 0
                ? "default"
                : "destructive"
          }
          className="font-mono text-[10px] sm:text-xs tabular-nums"
        >
          {formatPercent(asset.twr)}
        </Badge>
        <span className="text-[10px] sm:text-sm text-muted-foreground font-mono tabular-nums w-16 sm:w-28 text-right truncate">
          {formatCurrency(asset.externalFlow)}
        </span>
        <span
          className={cn(
            "text-[10px] sm:text-sm font-mono tabular-nums w-16 sm:w-28 text-right truncate",
            asset.totalPerformance !== null &&
              (asset.totalPerformance >= 0 ? "text-emerald-600/90" : "text-[#b22222]/90")
          )}
        >
          {formatCurrency(asset.totalPerformance)}
        </span>
      </div>
      {hasChildren && (
        <CollapsibleContent>
          {asset.subLines.map((sub) => (
            <AssetRow key={sub.name} asset={sub} depth={depth + 1} />
          ))}
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

export function PortfolioTable({
  searchQuery,
  onSearchChange
}: {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}) {
  const { data: portfolio, isLoading, error } = usePortfolio();
  const { formatPercent } = useSettings();

  const filteredPortfolio = useMemo(() => {
    if (!portfolio) return null;
    if (!searchQuery.trim()) return portfolio;

    const query = searchQuery.toLowerCase();

    const filterBySearch = (asset: Asset): Asset | null => {
      const matchesName = asset.name.toLowerCase().includes(query);

      // If name matches, return the asset (and all its children)
      if (matchesName) {
        return asset;
      }

      // If name doesn't match, check children
      if (asset.subLines.length > 0) {
        const filteredSubLines = asset.subLines
          .map(filterBySearch)
          .filter((sub): sub is Asset => sub !== null);

        if (filteredSubLines.length > 0) {
          return { ...asset, subLines: filteredSubLines };
        }
      }

      return null;
    };

    return filterBySearch(portfolio);

  }, [portfolio, searchQuery]);

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
        Failed to load portfolio: {error.message}
      </div>
    );
  }

  if (!filteredPortfolio) return null;

  return (
    <Card>
      <CardHeader className="pb-2 space-y-4">
        <CardTitle className="flex items-center justify-between">
          <span>{filteredPortfolio.name}</span>
          <div className="flex items-center gap-2">
            <AskAI
              prompt="Use portfolioSummary to get overall portfolio metrics, then provide a brief analysis of total performance and key holdings."
              title="Analyze portfolio"
            />
            <Badge
              variant={
                filteredPortfolio.twr === null
                  ? "secondary"
                  : filteredPortfolio.twr >= 0
                    ? "default"
                    : "destructive"
              }
            >
              TWR: {formatPercent(filteredPortfolio.twr)}
            </Badge>
          </div>
        </CardTitle>
        <Input
          placeholder="Filter assets..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="max-w-sm"
        />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 sm:gap-4 py-2 px-2 sm:px-3 text-[10px] sm:text-xs text-muted-foreground border-b mb-2">
          <span>Asset</span>
          <span>TWR</span>
          <span className="w-16 sm:w-28 text-right">Cash Flow</span>
          <span className="w-16 sm:w-28 text-right">Performance</span>
        </div>
        {filteredPortfolio.subLines.length > 0 ? (
          filteredPortfolio.subLines.map((asset) => (
            <AssetRow key={asset.name} asset={asset} />
          ))
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            No assets found matching "{searchQuery}"
          </div>
        )}
      </CardContent>
    </Card>
  );
}
