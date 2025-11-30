import { z } from 'zod'

export const timelineEventSchema = z.object({
  title: z.string().describe('Short title for the event'),
  time: z.string().describe('Time or date of the event'),
  description: z.string().describe('Detailed description of what happened'),
})

export const timelineSchema = z.object({
  events: z.array(timelineEventSchema)
    .describe('Timeline events in chronological order')
})

export type TimelineEvent = z.infer<typeof timelineEventSchema>
export type Timeline = z.infer<typeof timelineSchema>
