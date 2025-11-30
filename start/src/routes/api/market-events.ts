import { createFileRoute } from '@tanstack/react-router'
import { streamObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { marketEventsTimelineSchema } from '@/lib/schemas/market-events'
import { assetCategories, type CategoryConfig, type AssetCategory } from '@/lib/config/asset-categories'
import { getConnectors, fetchConnectorData, formatConnectorDataForAI } from '@/lib/connector-service'

export const Route = createFileRoute('/api/market-events')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        console.log('[MARKET-EVENTS] API endpoint called')

        try {
          const body = await request.json()
          console.log('[MARKET-EVENTS] Request body:', body)

          const { category, startDate, endDate } = body

          // Validate inputs
          if (!category || !startDate || !endDate) {
            console.error('[MARKET-EVENTS] Missing required fields:', { category, startDate, endDate })
            return new Response(JSON.stringify({ error: 'Missing required fields' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          const categoryConfig = assetCategories[category as keyof typeof assetCategories]
          if (!categoryConfig) {
            console.error('[MARKET-EVENTS] Invalid category:', category)
            return new Response(JSON.stringify({ error: 'Invalid category' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          // Calculate optimal event count based on date range
          const start = new Date(startDate)
          const end = new Date(endDate)
          const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
          const eventCount = Math.min(12, Math.max(3, Math.floor(daysDiff / 30) + 2))

          console.log('[MARKET-EVENTS] Generating events:', {
            category: categoryConfig.label,
            startDate: start.toLocaleDateString(),
            endDate: end.toLocaleDateString(),
            daysDiff,
            eventCount
          })

          // Fetch connector data for matching category
          let connectorContext = ''
          try {
            console.log('[MARKET-EVENTS] Fetching connectors...')
            const allConnectors = await getConnectors()
            console.log('[MARKET-EVENTS] All connectors:', JSON.stringify(allConnectors, null, 2))
            console.log('[MARKET-EVENTS] Looking for category:', category)

            const matchingConnectors = allConnectors.filter(
              (c) => c.enabled &&
                     c.categories.includes(category as AssetCategory) &&
                     c.tools?.includes('timeline')
            )
            console.log('[MARKET-EVENTS] Matching connectors:', matchingConnectors.length, matchingConnectors.map(c => ({ name: c.name, categories: c.categories })))

            if (matchingConnectors.length > 0) {
              console.log('[MARKET-EVENTS] Fetching data from', matchingConnectors.length, 'connectors')
              const results = await Promise.all(
                matchingConnectors.map((c) => fetchConnectorData(c))
              )
              console.log('[MARKET-EVENTS] Fetch results:', results.map(r => ({ name: r.connectorName, success: r.success, error: r.error, dataLength: r.data ? JSON.stringify(r.data).length : 0 })))
              connectorContext = formatConnectorDataForAI(results)
              console.log('[MARKET-EVENTS] Connector context length:', connectorContext.length)
              if (connectorContext.length > 0) {
                console.log('[MARKET-EVENTS] Connector context preview:', connectorContext.substring(0, 500))
              }
            } else {
              console.log('[MARKET-EVENTS] No matching connectors found for category:', category)
            }
          } catch (error) {
            console.error('[MARKET-EVENTS] Failed to fetch connector data:', error)
          }

          // Build comprehensive prompt
          const prompt = buildMarketEventsPrompt(categoryConfig, start, end, eventCount, connectorContext)
          console.log('[MARKET-EVENTS] Prompt length:', prompt.length)

          console.log('[MARKET-EVENTS] Calling OpenAI with streamObject...')
          const result = streamObject({
            model: openai('gpt-4o'),
            schema: marketEventsTimelineSchema,
            prompt,
            temperature: 0.3,
          })

          console.log('[MARKET-EVENTS] Setting up streaming response')

          // Create a custom streaming response that sends partial updates
          const encoder = new TextEncoder()
          const stream = new ReadableStream({
            async start(controller) {
              try {
                for await (const partialObject of result.partialObjectStream) {
                  console.log('[MARKET-EVENTS] Streaming partial object:', {
                    eventCount: partialObject.events?.length ?? 0
                  })

                  // Send the partial object as JSON followed by newline
                  const data = JSON.stringify(partialObject) + '\n'
                  controller.enqueue(encoder.encode(data))
                }

                console.log('[MARKET-EVENTS] Stream complete')
                controller.close()
              } catch (error) {
                console.error('[MARKET-EVENTS] Stream error:', error)
                controller.error(error)
              }
            },
          })

          return new Response(stream, {
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'Transfer-Encoding': 'chunked',
            },
          })
        } catch (error) {
          console.error('[MARKET-EVENTS] API error:', error)
          return new Response(JSON.stringify({ error: String(error) }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          })
        }
      },
    },
  },
})

function buildMarketEventsPrompt(
  categoryConfig: CategoryConfig,
  startDate: Date,
  endDate: Date,
  eventCount: number,
  connectorContext?: string
): string {
  let prompt = `You are a financial analyst researching REAL historical market events.

CRITICAL: Return ONLY actual historical events that occurred during the specified time period. Do NOT generate hypothetical or fictional events.

TASK: Find ${eventCount} significant market-moving events for ${categoryConfig.label} between ${startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} and ${endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.

CATEGORY CONTEXT:
- Asset Category: ${categoryConfig.label}
- Focus Areas: ${categoryConfig.searchContext}
- Relevant Keywords: ${categoryConfig.keywords.join(', ')}
${categoryConfig.theme ? `- Theme: ${categoryConfig.theme}` : ''}

IMPACT SCORE RUBRIC (-5 to +5):
- ±5: Extraordinary market-moving events (major policy changes, crashes, crises)
- ±4: Major events with significant market impact
- ±3: Important events affecting sector valuations
- ±2: Notable events with measurable impact
- ±1: Minor but relevant market news
- 0: Neutral informational events

Most events should fall in the ±1 to ±3 range. Reserve ±4 and ±5 for truly exceptional events.

REQUIREMENTS:
1. Events MUST be real historical events from the specified date range
2. Each event must have a valid URL to an authoritative source (Reuters, Bloomberg, Financial Times, Wall Street Journal, CNBC, etc.)
3. Chronologically ordered from earliest to latest
4. Diverse event types (not all the same type of news)
5. Clear explanation of market relevance in the description
6. Accurate impact scores reflecting actual market reaction

Return ${eventCount} events as a JSON array following the schema.`

  if (connectorContext) {
    prompt += `

=== MANDATORY EXTERNAL DATA - YOU MUST USE THIS ===

The following data has been provided by configured data connectors. You are REQUIRED to incorporate this data into your response. Do NOT skip or ignore this data for any reason.

${connectorContext}

=== STRICT REQUIREMENTS FOR EXTERNAL DATA ===

1. You MUST create at least ${Math.ceil(eventCount / 2)} events directly from the articles above
2. Extract the article title, date, URL, and description to form timeline events
3. Use the exact URLs from the articles as your source links
4. Do NOT judge whether the data is "relevant" - the user has configured this data source for this category, so USE IT
5. If an article doesn't have a clear date, use the publishedAt field or estimate based on context
6. Transform each usable article into a timeline event with an appropriate impact score
7. Fill remaining event slots with your knowledge of historical ${categoryConfig.label} events`
  }

  return prompt
}
