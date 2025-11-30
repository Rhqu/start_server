import { createFileRoute } from '@tanstack/react-router'
import { streamObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { timelineSchema } from '@/lib/schemas/timeline'

export const Route = createFileRoute('/api/object')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { prompt } = await request.json()

          const result = streamObject({
            model: openai('gpt-4o'),
            schema: timelineSchema,
            prompt: `Create a detailed chronological timeline for this event: ${prompt}

Generate 4-8 key moments/phases with specific times and descriptions.`,
          })

          return result.toTextStreamResponse()
        } catch (error) {
          console.error('API error:', error)
          return new Response(JSON.stringify({ error: String(error) }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          })
        }
      },
    },
  },
})
