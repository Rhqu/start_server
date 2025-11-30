"use client";

import * as React from "react";
import { useMemo } from "react";
import { usePortfolio, type Asset, formatCurrency } from "@/components/portfolio";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Loader } from "@/components/ai-elements/loader";
import { Label, Pie, PieChart, Sector } from "recharts";
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
} from "@/components/ui/chart";
import { AskAI } from "@/components/AskAI";

// Modern, professional color palette for financial data
function calculateValue(asset: Asset): number {
    const invested = (asset.externalFlow ?? 0) * -1;
    const performance = asset.totalPerformance ?? 0;
    // Ensure we don't return negative values for the chart
    return Math.max(0, invested + performance);
}

function processData(asset: Asset | undefined) {
    if (!asset || !asset.subLines) return [];

    return asset.subLines
        .map((sub, index) => ({
            name: sub.name,
            value: calculateValue(sub),
            fill: `var(--chart-${(index % 5) + 1})`,
        }))
        .filter((item) => item.value > 0)
        .sort((a, b) => b.value - a.value);
}

function DonutChart({
    title,
    description,
    data,
    selectedCategory,
    onSelectCategory,
    askAiPrompt
}: {
    title: string;
    description?: string;
    data: any[];
    selectedCategory: string | null;
    onSelectCategory: (category: string | null) => void;
    askAiPrompt?: string;
}) {
    const totalValue = React.useMemo(() => {
        return data.reduce((acc, curr) => acc + curr.value, 0);
    }, [data]);

    const chartConfig = React.useMemo(() => {
        return data.reduce((config, item) => {
            config[item.name] = {
                label: item.name,
                color: item.fill,
            };
            return config;
        }, {} as ChartConfig);
    }, [data]);

    const activeIndex = React.useMemo(() => {
        return data.findIndex((item) => item.name === selectedCategory);
    }, [data, selectedCategory]);

    if (data.length === 0) {
        return (
            <Card className="flex flex-col">
                <CardHeader className="items-center pb-0">
                    <CardTitle>{title}</CardTitle>
                    {description && <CardDescription>{description}</CardDescription>}
                </CardHeader>
                <CardContent className="flex-1 flex items-center justify-center text-muted-foreground h-[250px]">
                    No data available
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="flex flex-col">
            <CardHeader className="items-center pb-0">
                <div className="flex items-center gap-2">
                    <CardTitle>{title}</CardTitle>
                    {askAiPrompt && (
                        <AskAI
                            prompt={askAiPrompt}
                            title={`Analyze ${title.toLowerCase()}`}
                        />
                    )}
                </div>
                {description && <CardDescription>{description}</CardDescription>}
            </CardHeader>
            <CardContent className="flex-1 pb-0">
                <ChartContainer
                    config={chartConfig}
                    className="mx-auto aspect-square max-h-[250px]"
                >
                    <PieChart>
                        <ChartTooltip
                            cursor={false}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const item = payload[0];
                                    return (
                                        <div className="rounded-lg border bg-popover p-2 shadow-sm">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs font-medium text-muted-foreground uppercase">
                                                    {item.name}
                                                </span>
                                                <span className="font-bold font-mono">
                                                    {formatCurrency(Number(item.value))}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Pie
                            data={data}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={80}
                            strokeWidth={5}
                            activeIndex={activeIndex}
                            activeShape={({ outerRadius = 0, ...props }: any) => (
                                <Sector
                                    {...props}
                                    outerRadius={outerRadius + 6}
                                    className="transition-all duration-300 ease-in-out cursor-pointer"
                                />
                            )}
                            onClick={(data) => {
                                if (selectedCategory === data.name) {
                                    onSelectCategory(null);
                                } else {
                                    onSelectCategory(data.name);
                                }
                            }}
                        >
                            <Label
                                content={({ viewBox }) => {
                                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                        return (
                                            <text
                                                x={viewBox.cx}
                                                y={viewBox.cy}
                                                textAnchor="middle"
                                                dominantBaseline="middle"
                                            >
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={viewBox.cy}
                                                    className="fill-foreground text-xl font-bold"
                                                >
                                                    {formatCurrency(totalValue)}
                                                </tspan>
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={(viewBox.cy || 0) + 24}
                                                    className="fill-muted-foreground"
                                                >
                                                    Total Value
                                                </tspan>
                                            </text>
                                        );
                                    }
                                }}
                            />
                        </Pie>
                    </PieChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}

export function PortfolioCompositionChart({
    selectedCategory,
    onSelectCategory
}: {
    selectedCategory: string | null;
    onSelectCategory: (category: string | null) => void;
}) {
    const { data: portfolio, isLoading, error } = usePortfolio();

    const liquidData = useMemo(() => {
        if (!portfolio) return [];
        const liquid = portfolio.subLines.find((s) => s.name === "Liquid assets");
        return processData(liquid);
    }, [portfolio]);

    const illiquidData = useMemo(() => {
        if (!portfolio) return [];
        const illiquid = portfolio.subLines.find((s) => s.name === "Illiquid assets");
        return processData(illiquid);
    }, [portfolio]);

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
                Failed to load portfolio data
            </div>
        );
    }

    if (!portfolio) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DonutChart
                title="Liquid Assets"
                description="Distribution of liquid investments"
                data={liquidData}
                selectedCategory={selectedCategory}
                onSelectCategory={onSelectCategory}
                askAiPrompt="Use liquidAssetsBreakdown to get liquid asset composition, then show a pieChart of the distribution."
            />
            <DonutChart
                title="Illiquid Assets"
                description="Distribution of illiquid investments"
                data={illiquidData}
                selectedCategory={selectedCategory}
                onSelectCategory={onSelectCategory}
                askAiPrompt="Use illiquidAssetsBreakdown to get illiquid asset composition, then show a pieChart of the distribution."
            />
        </div>
    );
}
