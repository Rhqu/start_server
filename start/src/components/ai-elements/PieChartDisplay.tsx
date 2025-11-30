"use client"

import { Label, Pie, PieChart } from "recharts"
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
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { PieChartData } from "@/lib/schemas/charts"
import { usePlayground } from "@/hooks/use-playground"

const CHART_COLORS = [
  "#06b6d4", // cyan (primary brand color)
  "#3b82f6", // bright blue
  "#22c55e", // bright green
  "#f59e0b", // amber/orange
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#14b8a6", // teal
]

import { ChartActionToolbar } from "@/components/ai-elements/ChartActionToolbar"

export function PieChartDisplay({ data, hideEmbed = false }: { data: PieChartData, hideEmbed?: boolean }) {
  const { addChart } = usePlayground()

  const chartData = data.segments.map((segment, index) => ({
    name: segment.label.length > 15 ? segment.label.slice(0, 14) + '…' : segment.label,
    fullName: segment.label,
    value: segment.value,
    fill: segment.color || CHART_COLORS[index % CHART_COLORS.length],
  }))

  const total = chartData.reduce((acc, curr) => acc + curr.value, 0)

  const chartConfig = chartData.reduce((config, item) => {
    config[item.name] = {
      label: item.fullName,
      color: item.fill,
    }
    return config
  }, {} as ChartConfig)

  const formatValue = (val: number) => {
    if (val >= 1000000) return `€${(val / 1000000).toFixed(1)}M`
    if (val >= 1000) return `€${(val / 1000).toFixed(0)}k`
    return `€${val.toLocaleString()}`
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-medium">{data.title}</CardTitle>
      </CardHeader>
      <CardContent className="pb-4 pt-2">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[300px]">
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0]
                  const percentage = ((Number(item.value) / total) * 100).toFixed(1)
                  return (
                    <div className="rounded-lg border bg-popover px-3 py-2 shadow-md">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-medium">
                          {item.payload?.fullName || item.name}
                        </span>
                        <span className="font-bold font-mono text-sm">
                          {formatValue(Number(item.value))}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {percentage}% vom Portfolio
                        </span>
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={55}
              outerRadius={90}
              strokeWidth={2}
              stroke="hsl(var(--background))"
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
                          y={(viewBox.cy || 0) - 8}
                          className="fill-foreground text-lg font-bold"
                        >
                          {formatValue(total)}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 14}
                          className="fill-muted-foreground text-xs"
                        >
                          Gesamt
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </Pie>
            <ChartLegend 
              content={<ChartLegendContent className="text-xs flex-wrap justify-center gap-3 pt-4" />} 
              verticalAlign="bottom"
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="border-t py-0.5 px-2">
        <ChartActionToolbar
          onDownload={() => window.print()}
          onEmbed={hideEmbed ? undefined : () => addChart('pie', data)}
        />
      </CardFooter>
    </Card>
  )
}
