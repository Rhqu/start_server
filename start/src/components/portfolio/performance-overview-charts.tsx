"use client"

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card"
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart"
import { PerformanceOverview } from "@/lib/schemas/performance-overview"

const chartConfig = {
    value: {
        label: "Value",
    },
    chart1: {
        label: "Liquid Assets",
        color: "var(--chart-1)",
    },
    chart2: {
        label: "Illiquid Assets",
        color: "var(--chart-2)",
    },
    chart3: {
        label: "Stocks",
        color: "var(--chart-3)",
    },
    chart4: {
        label: "Real Estate",
        color: "var(--chart-4)",
    },
    chart5: {
        label: "Other",
        color: "var(--chart-5)",
    },
} satisfies ChartConfig

import { ChartActionToolbar } from "@/components/ai-elements/ChartActionToolbar"

export function PerformanceOverviewCharts({ data }: { data: PerformanceOverview }) {
    return (
        <div className="flex flex-col gap-2 w-full">
            {/* Absolute Performance Chart */}
            <Card className="w-full overflow-hidden">
                <CardHeader>
                    <CardTitle className="text-base">Absolute Performance</CardTitle>
                    <CardDescription>
                        Total Gain/Loss in EUR
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="h-[300px] w-full">
                        <BarChart data={data.absolutePerformance} margin={{ left: 20, right: 20, top: 30, bottom: 80 }}>
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="category"
                                type="category"
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                                angle={-45}
                                textAnchor="end"
                                height={70}
                                interval={0}
                                fontSize={11}
                            />
                            <YAxis
                                type="number"
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
                                width={60}
                            />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="value" radius={4}>
                                <LabelList dataKey="value" position="top" formatter={(v: number) => `€${v.toLocaleString()}`} fontSize={10} />
                            </Bar>
                        </BarChart>
                    </ChartContainer>
                </CardContent>
                <CardFooter className="border-t py-0.5 px-2">
                    <ChartActionToolbar 
                        onDownload={() => window.print()} 
                        onEmbed={() => console.log("Embed clicked")}
                    />
                </CardFooter>
            </Card>

            {/* Relative Performance Chart */}
            <Card className="w-full overflow-hidden">
                <CardHeader>
                    <CardTitle className="text-base">Relative Performance</CardTitle>
                    <CardDescription>
                        Time-Weighted Return (TWR) in %
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="h-[300px] w-full">
                        <BarChart data={data.relativePerformance} margin={{ left: 20, right: 20, top: 30, bottom: 80 }}>
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="category"
                                type="category"
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                                angle={-45}
                                textAnchor="end"
                                height={70}
                                interval={0}
                                fontSize={11}
                            />
                            <YAxis
                                type="number"
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(v) => `${v}%`}
                                width={50}
                            />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="value" radius={4}>
                                <LabelList dataKey="value" position="top" formatter={(v: number) => `${v.toFixed(1)}%`} fontSize={10} />
                            </Bar>
                        </BarChart>
                    </ChartContainer>
                </CardContent>
                <CardFooter className="border-t py-0.5 px-2">
                    <ChartActionToolbar 
                        onDownload={() => window.print()} 
                        onEmbed={() => console.log("Embed clicked")}
                    />
                </CardFooter>
            </Card>
        </div>
    )
}
