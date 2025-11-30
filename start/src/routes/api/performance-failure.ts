import { createFileRoute } from "@tanstack/react-router";
import { openai } from "@ai-sdk/openai";
import { streamObject } from "ai";
import { z } from "zod";
import { performanceFailureSchema } from "@/lib/schemas/performance-failure";
import { assetCategories, type AssetCategory } from "@/lib/config/asset-categories";
import { marketEventSchema } from "@/lib/schemas/market-events";

const assetCategoryKeys = Object.keys(assetCategories) as AssetCategory[];
const assetCategoryEnum = z.enum(assetCategoryKeys as [AssetCategory, ...AssetCategory[]]);

const loserSchema = z.object({
  asset: z.string(),
  subgroup: z.string(),
  metricValue: z.number(),
  shareOfCategory: z.number(),
  deltaTwr: z.number().nullable().optional(),
  startPerformance: z.number().nullable().optional(),
  endPerformance: z.number().nullable().optional(),
  path: z.array(z.string()).optional(),
});

const requestSchema = z.object({
  category: assetCategoryEnum,
  startDate: z.string(),
  endDate: z.string(),
  losers: z.array(loserSchema).min(1),
  events: z.array(marketEventSchema).optional(),
});

function buildPrompt(data: z.infer<typeof requestSchema>) {
  const category = assetCategories[data.category];

  const loserLines = data.losers
    .map((item, idx) => {
      const delta = item.metricValue >= 0 ? `+${item.metricValue.toFixed(2)}` : item.metricValue.toFixed(2);
      const share = (item.shareOfCategory * 100).toFixed(1);
      const twr = item.deltaTwr !== undefined && item.deltaTwr !== null
        ? `ΔTWR ${(item.deltaTwr * 100).toFixed(2)}%`
        : "";
      return `${idx + 1}. ${item.asset} (${item.subgroup}) — Change ${delta}, share ${share}% ${twr}`.trim();
    })
    .join("\n");

  const eventLines = (data.events ?? [])
    .slice(0, 8)
    .map(
      (event) =>
        `- [${event.timestamp}] ${event.title} (impact ${event.impactScore}): ${event.description}`,
    )
    .join("\n");

  return `You are a risk analyst preparing a "recipe for failure" briefing.
Time window: ${data.startDate} to ${data.endDate}
Asset category: ${category?.label ?? data.category}

Worst-performing assets:
${loserLines}

Key events in the same period:
${eventLines || "No contextual events provided."}

Tasks:
1. Diagnose the common weaknesses or shocks that caused these companies/assets to underperform.
2. Group recurring failure modes into badges (3-5 words) with descriptions and representative companies.
3. Highlight specific drivers explaining the drawdowns with evidence referencing the data above.
4. Flag anomalies that failed for unique reasons.
5. Provide an outlook note if relevant (risks to monitor, potential for continued weakness).

Only use evidence from the provided data/timeframe. Output JSON following the supplied schema.`;
}

export const Route = createFileRoute("/api/performance-failure")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const data = requestSchema.parse(body);
          const prompt = buildPrompt(data);

          const result = streamObject({
            model: openai("gpt-4o"),
            schema: performanceFailureSchema,
            temperature: 0.4,
            prompt,
          });

          return result.toTextStreamResponse();
        } catch (error) {
          console.error("[PERFORMANCE-FAILURE] error", error);
          const message = error instanceof Error ? error.message : String(error);
          return new Response(JSON.stringify({ error: message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
