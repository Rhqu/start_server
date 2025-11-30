import { z } from 'zod'

export const marketEventSchema = z.object({
  timestamp: z.string().describe('ISO 8601 date string (e.g., "2024-05-15T14:30:00Z")'),
  title: z.string().min(10).max(120).describe('Concise event title (10-120 chars)'),
  description: z.string().min(50).max(500).describe('Detailed explanation of market relevance and impact (50-500 chars)'),
  impactScore: z.number().int().min(-5).max(5).describe('Market impact score: -5 (extremely negative) to +5 (extremely positive). Most events ±1 to ±3, reserve ±4/±5 for major events'),
  articleUrl: z.string().url().describe('Link to authoritative news source (Reuters, Bloomberg, FT, WSJ, etc.)'),
  source: z.string().describe('News source name (e.g., "Reuters", "Bloomberg")'),
})

export const marketEventsTimelineSchema = z.object({
  events: z.array(marketEventSchema)
    .min(3)
    .max(12)
    .describe('Timeline of market events in chronological order')
})

export type MarketEvent = z.infer<typeof marketEventSchema>
export type MarketEventsTimeline = z.infer<typeof marketEventsTimelineSchema>
