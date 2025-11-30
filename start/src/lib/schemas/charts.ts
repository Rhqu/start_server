import { z } from "zod";

// Bar Chart - max 5 bars
export const barChartSchema = z.object({
  title: z.string(),
  bars: z
    .array(
      z.object({
        label: z.string(),
        value: z.number(),
        color: z.string().optional(),
      }),
    )
    .max(5),
  valueLabel: z.string().optional(), // e.g., "EUR", "%"
});

export type BarChartData = z.infer<typeof barChartSchema>;

// Pie Chart - max 5 segments
export const pieChartSchema = z.object({
  title: z.string(),
  segments: z
    .array(
      z.object({
        label: z.string(),
        value: z.number(),
        color: z.string().optional(),
      }),
    )
    .max(5),
});

export type PieChartData = z.infer<typeof pieChartSchema>;

// Line Chart - max 3 series, 12 points each
export const lineChartSchema = z.object({
  title: z.string(),
  xLabel: z.string().optional(),
  yLabel: z.string().optional(),
  series: z
    .array(
      z.object({
        name: z.string(),
        color: z.string().optional(),
        points: z
          .array(
            z.object({
              x: z.string().describe("Label or ISO date"),
              y: z.number(),
            }),
          )
          .min(2)
          .max(12),
      }),
    )
    .min(1)
    .max(3),
});

export type LineChartData = z.infer<typeof lineChartSchema>;
