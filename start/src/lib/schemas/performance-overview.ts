import { z } from "zod"

export const performanceOverviewSchema = z.object({
    absolutePerformance: z.array(z.object({
        category: z.string(),
        value: z.number(),
        fill: z.string(),
    })),
    relativePerformance: z.array(z.object({
        category: z.string(),
        value: z.number(),
        fill: z.string(),
    })),
})

export type PerformanceOverview = z.infer<typeof performanceOverviewSchema>
