import { createFileRoute } from '@tanstack/react-router'
import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { assetCategories, type AssetCategory } from '@/lib/config/asset-categories'
import { getConnectors, fetchConnectorData, formatConnectorDataForAI } from '@/lib/connector-service'
import { portfolioGraphSchema, type EventNode, type Connection } from '@/lib/schemas/portfolio-graph'

const CATEGORIES = Object.keys(assetCategories) as AssetCategory[]

export const Route = createFileRoute('/api/portfolio-graph')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        console.log('[PORTFOLIO-GRAPH] API endpoint called')

        try {
          const body = await request.json()
          const { startDate, endDate } = body

          if (!startDate || !endDate) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          const start = new Date(startDate)
          const end = new Date(endDate)
          const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
          const eventsPerCategory = Math.min(5, Math.max(2, Math.floor(daysDiff / 60) + 2))

          console.log('[PORTFOLIO-GRAPH] Fetching events for all categories:', {
            startDate: start.toLocaleDateString(),
            endDate: end.toLocaleDateString(),
            eventsPerCategory,
          })

          // Fetch connector data
          let connectorContext = ''
          try {
            const allConnectors = await getConnectors()
            const enabledConnectors = allConnectors.filter((c) => c.enabled)
            if (enabledConnectors.length > 0) {
              const results = await Promise.all(enabledConnectors.map((c) => fetchConnectorData(c)))
              connectorContext = formatConnectorDataForAI(results)
            }
          } catch (error) {
            console.error('[PORTFOLIO-GRAPH] Failed to fetch connector data:', error)
          }

          // Build prompt for all categories
          const prompt = buildPortfolioGraphPrompt(start, end, eventsPerCategory, connectorContext)

          console.log('[PORTFOLIO-GRAPH] Calling OpenAI...')
          const result = await generateObject({
            model: openai('gpt-4o'),
            schema: portfolioGraphSchema,
            prompt,
            temperature: 0.3,
          })

          console.log('[PORTFOLIO-GRAPH] Generated graph with', result.object.events.length, 'events and', result.object.connections.length, 'connections')

          return new Response(JSON.stringify(result.object), {
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          console.error('[PORTFOLIO-GRAPH] API error:', error)
          return new Response(JSON.stringify({ error: String(error) }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          })
        }
      },
    },
  },
})

function buildPortfolioGraphPrompt(
  startDate: Date,
  endDate: Date,
  eventsPerCategory: number,
  connectorContext?: string
): string {
  const categoryList = CATEGORIES.map((cat) => {
    const config = assetCategories[cat]
    return `- ${cat}: ${config.label} (keywords: ${config.keywords.slice(0, 3).join(', ')})`
  }).join('\n')

  let prompt = `You are a financial analyst creating a network graph of interconnected market events.

TASK: Find ${eventsPerCategory} significant events PER CATEGORY for the following asset categories between ${startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} and ${endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.

CATEGORIES:
${categoryList}

CRITICAL REQUIREMENTS:

1. EVENT GENERATION:
   - Generate ${eventsPerCategory} real historical events for EACH of the 11 categories
   - Each event needs: id (unique string), type: "event", title, date (ISO string), impactScore (-5 to +5), source, url (real news source), description, category (from list above)
   - Events must be REAL historical events from the specified time period
   - Use authoritative sources (Reuters, Bloomberg, Financial Times, WSJ, CNBC, etc.)

2. CONNECTION ANALYSIS:
   After generating events, analyze relationships between them and create connections:
   - source: event ID that initiates/causes
   - target: event ID that is affected/related
   - relationship: brief description (e.g., "triggered price increase in", "correlates with", "same economic policy")
   - strength: 1-5 (1=weak correlation, 5=direct causation)

   Look for:
   - Causal relationships (Fed rate decision → bond yields → stock market)
   - Shared entities (same company, country, or economic indicator)
   - Market theme connections (inflation narrative affecting multiple categories)
   - Temporal correlations (closely timed events that influenced each other)

3. IMPACT SCORES:
   - ±5: Extraordinary market-moving events
   - ±4: Major events with significant impact
   - ±3: Important sector-level events
   - ±2: Notable events with measurable impact
   - ±1: Minor but relevant news
   - 0: Neutral informational events

Generate a diverse set of events across all categories and identify meaningful connections between them.`

  if (connectorContext) {
    prompt += `

=== EXTERNAL DATA FROM CONFIGURED CONNECTORS ===

${connectorContext}

Use relevant articles from this data to inform your event generation. Extract events that match the time period and categories.`
  }

  return prompt
}
