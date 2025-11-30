import { z } from 'zod'

export const stockAnalysisDataPointSchema = z.object({
    date: z.string(),
    stockValue: z.number(),
    averageValue: z.number(),
})

export const stockAnalysisSchema = z.object({
    stockName: z.string(),
    averageName: z.string(),
    data: z.array(stockAnalysisDataPointSchema),
})

export type StockAnalysisDataPoint = z.infer<typeof stockAnalysisDataPointSchema>
export type StockAnalysis = z.infer<typeof stockAnalysisSchema>
