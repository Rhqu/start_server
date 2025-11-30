import { createFileRoute } from "@tanstack/react-router";
import { openai } from "@ai-sdk/openai";
import { streamObject } from "ai";
import { z } from "zod";
import { performanceRecipeSchema } from "@/lib/schemas/performance-recipe";
import { assetCategories, type AssetCategory } from "@/lib/config/asset-categories";
import { marketEventSchema } from "@/lib/schemas/market-events";

const winnerSchema = z.object({
  asset: z.string(),
  subgroup: z.string(),
  metricValue: z.number(),
  shareOfCategory: z.number(),
  deltaTwr: z.number().nullable().optional(),
  startPerformance: z.number().nullable().optional(),
  endPerformance: z.number().nullable().optional(),
  path: z.array(z.string()).optional(),
});

const assetCategoryKeys = Object.keys(assetCategories) as AssetCategory[];
const assetCategoryEnum = z.enum(assetCategoryKeys as [AssetCategory, ...AssetCategory[]]);

const requestSchema = z.object({
  category: assetCategoryEnum,
  startDate: z.string(),
  endDate: z.string(),
  winners: z.array(winnerSchema).min(1),
  events: z.array(marketEventSchema).optional(),
});

function buildPrompt(data: z.infer<typeof requestSchema>) {
  const category = assetCategories[data.category];
  const winnerLines = data.winners
    .map((w, idx) => {
      const delta = w.metricValue >= 0 ? `+${w.metricValue.toFixed(2)}` : w.metricValue.toFixed(2);
      const share = (w.shareOfCategory * 100).toFixed(1);
      const twr = w.deltaTwr !== undefined && w.deltaTwr !== null
        ? `ΔTWR ${(w.deltaTwr * 100).toFixed(2)}%`
        : "";
      return `${idx + 1}. ${w.asset} (${w.subgroup}) — Change ${delta}, share ${share}% ${twr}`.trim();
    })
    .join("\n");

  const eventLines = (data.events ?? [])
    .slice(0, 8)
    .map((event) => `- [${event.timestamp}] ${event.title} (impact ${event.impactScore}): ${event.description}`)
    .join("\n");

  return `You are a fundamental analyst building a "recipe for success" briefing for clients.
Time window: ${data.startDate} to ${data.endDate}
Asset category: ${category?.label ?? data.category}

Top performing assets:
${winnerLines}

Key events in the same window:
${eventLines || "No events were provided for this window."}

Tasks:
1. Explain the common factors behind these winners using ONLY the data above. Keep it extremely concise.
2. Cluster recurring success traits into short badges (2-4 words), each with a very short description (max 10 words).
3. Highlight specific drivers with evidence. Keep explanations brief.
4. Flag anomalies that do not share the recipes.
5. Conclude with an outlook if you can infer one; otherwise omit the outlook.

Be honest if patterns are weak. Avoid hallucinating data outside this window. Respond using the provided JSON schema. Keep all text fields as short as possible for a compact UI.`;
}

export const Route = createFileRoute("/api/performance-recipe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const data = requestSchema.parse(body);

          const prompt = buildPrompt(data);

          const result = streamObject({
            model: openai("gpt-4o"),
            schema: performanceRecipeSchema,
            temperature: 0.4,
            prompt,
          });

          return result.toTextStreamResponse();
        } catch (error) {
          console.error("[PERFORMANCE-RECIPE] error", error);
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
