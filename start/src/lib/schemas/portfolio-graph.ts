import { z } from 'zod'
import type { AssetCategory } from '@/lib/config/asset-categories'

export const eventNodeSchema = z.object({
  id: z.string(),
  type: z.literal('event'),
  title: z.string(),
  date: z.string(),
  impactScore: z.number().int().min(-5).max(5),
  source: z.string(),
  url: z.string().url(),
  description: z.string(),
  category: z.string(),
})

export const connectionSchema = z.object({
  source: z.string(),
  target: z.string(),
  relationship: z.string(),
  strength: z.number().int().min(1).max(5),
})

export const portfolioGraphSchema = z.object({
  events: z.array(eventNodeSchema),
  connections: z.array(connectionSchema),
})

export type EventNode = z.infer<typeof eventNodeSchema>
export type Connection = z.infer<typeof connectionSchema>
export type PortfolioGraph = z.infer<typeof portfolioGraphSchema>

export interface AssetCategoryNode {
  id: string
  type: 'category'
  category: AssetCategory
  label: string
  color: string
}

export type GraphNode = EventNode | AssetCategoryNode
