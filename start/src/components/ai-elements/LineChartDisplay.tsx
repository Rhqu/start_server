"use client"

import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartActionToolbar } from "@/components/ai-elements/ChartActionToolbar";
import { usePlayground } from "@/hooks/use-playground";
import { LineChartData } from "@/lib/schemas/charts";

const CHART_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
];

export function LineChartDisplay({
  data,
  hideEmbed = false,
}: {
  data: LineChartData;
  hideEmbed?: boolean;
}) {
  const { addChart } = usePlayground();

  // Normalize data points to array of objects keyed by x
  const allX = Array.from(
    new Set(data.series.flatMap((s) => s.points.map((p) => p.x))),
  );

  const chartData = allX.map((x) => {
    const entry: Record<string, string | number> = { x };
    data.series.forEach((s) => {
      const point = s.points.find((p) => p.x === x);
      if (point) entry[s.name] = point.y;
    });
    return entry;
  });

  const formatValue = (val: number) => {
    if (data.yLabel === "%") return `${val}%`;
    return val.toLocaleString();
  };

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: any[];
    label?: string;
  }) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div className="rounded-lg border bg-popover/95 text-popover-foreground shadow-lg backdrop-blur-sm p-2.5 min-w-[180px]">
        <p className="text-[11px] text-muted-foreground mb-1.5">
          {data.xLabel ? `${data.xLabel}: ${label}` : label}
        </p>
        <div className="space-y-1">
          {payload.map((entry, idx) => (
            <div key={idx} className="flex items-center justify-between text-[12px] leading-tight">
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block size-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name}
              </span>
              <span className="font-semibold">{formatValue(Number(entry.value))}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{data.title}</CardTitle>
      </CardHeader>
      <CardContent className="pb-0">
        <div className="h-[220px] w-full">
          <ResponsiveContainer>
            <LineChart
              data={chartData}
              margin={{ left: 10, right: 10, top: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="x" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatValue(Number(v))}
                fontSize={11}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {data.series.map((s, idx) => (
                <Line
                  key={s.name}
                  type="monotone"
                  dataKey={s.name}
                  stroke={s.color || CHART_COLORS[idx % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
      <CardFooter className="border-t py-0.5 px-2">
        <ChartActionToolbar
          onDownload={() => window.print()}
          onEmbed={hideEmbed ? undefined : () => addChart("line", data)}
        />
      </CardFooter>
    </Card>
  );
}
