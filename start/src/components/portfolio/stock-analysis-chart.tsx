"use client"

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    ChartConfig,
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart"
import { StockAnalysis } from "@/lib/schemas/stock-analysis"

import { ChartActionToolbar } from "@/components/ai-elements/ChartActionToolbar"

const chartConfig = {
    stockValue: {
        label: "Stock",
        color: "var(--primary)",
    },
    averageValue: {
        label: "Average",
        color: "var(--muted-foreground)",
    },
} satisfies ChartConfig

export function StockAnalysisChart({ data }: { data: StockAnalysis }) {
    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>{data.stockName} vs Market Average</CardTitle>
                <CardDescription>
                    Current Time-Weighted Return (TWR) comparison
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <BarChart data={data.data} margin={{ left: 10, right: 10, top: 30, bottom: 20 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${value}%`}
                            width={50}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Bar dataKey="stockValue" fill="var(--color-stockValue)" radius={4} name={data.stockName}>
                            <LabelList dataKey="stockValue" position="top" formatter={(v: number) => `${v}%`} fontSize={11} />
                        </Bar>
                        <Bar dataKey="averageValue" fill="var(--color-averageValue)" radius={4} name={data.averageName}>
                            <LabelList dataKey="averageValue" position="top" formatter={(v: number) => `${v}%`} fontSize={11} />
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
    )
}
