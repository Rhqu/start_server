"use client"

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { BarChartData } from "@/lib/schemas/charts"
import { usePlayground } from "@/hooks/use-playground"

const CHART_COLORS = [
  "#3b82f6", // bright blue
  "#22c55e", // bright green
  "#f59e0b", // amber/orange
  "#ef4444", // red
  "#8b5cf6", // violet
]

import { ChartActionToolbar } from "@/components/ai-elements/ChartActionToolbar"

export function BarChartDisplay({ data, hideEmbed = false }: { data: BarChartData, hideEmbed?: boolean }) {
  const { addChart } = usePlayground()

  const chartData = data.bars.map((bar, index) => ({
    label: bar.label.length > 12 ? bar.label.slice(0, 11) + '…' : bar.label,
    value: bar.value,
    fill: bar.color || CHART_COLORS[index % CHART_COLORS.length],
  }))

  const chartConfig = {
    value: {
      label: data.valueLabel || "Value",
    },
  } satisfies ChartConfig

  const formatValue = (v: number) => {
    if (data.valueLabel === "%") return `${v.toFixed(1)}%`
    if (data.valueLabel === "EUR") return `€${v >= 1000 ? (v/1000).toFixed(1) + 'k' : v.toLocaleString()}`
    return v >= 1000 ? (v/1000).toFixed(1) + 'k' : v.toLocaleString()
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{data.title}</CardTitle>
      </CardHeader>
      <CardContent className="pb-4 pt-2">
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart
            data={chartData}
            margin={{ left: 0, right: 10, top: 25, bottom: 5 }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="label"
              tickLine={false}
              tickMargin={8}
              axisLine={false}
              fontSize={10}
              interval={0}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={formatValue}
              width={50}
              fontSize={10}
            />
            <ChartTooltip 
              content={<ChartTooltipContent />} 
              cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              <LabelList
                dataKey="value"
                position="top"
                formatter={formatValue}
                fontSize={9}
                className="fill-foreground font-medium"
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="border-t py-0.5 px-2">
        <ChartActionToolbar
          onDownload={() => window.print()}
          onEmbed={hideEmbed ? undefined : () => addChart('bar', data)}
        />
      </CardFooter>
    </Card>
  )
}
