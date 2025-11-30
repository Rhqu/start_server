import { createFileRoute } from "@tanstack/react-router";
import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, stepCountIs, streamText, tool } from "ai";
import { z } from "zod";
import { getPortfolio, type Portfolio, type Asset, getCategoryTimeseriesData } from "@/lib/qplix";
import { barChartSchema, pieChartSchema, lineChartSchema } from "@/lib/schemas/charts";

// Helper to flatten all assets
const getAllAssets = (asset: Asset): Asset[] => {
  let assets: Asset[] = [asset];
  if (asset.subLines) {
    asset.subLines.forEach(sub => {
      assets = [...assets, ...getAllAssets(sub)];
    });
  }
  return assets;
};

// Granular data fetching tools
const portfolioSummaryTool = tool({
  description: "Returns high-level portfolio summary: total value, TWR, IRR, cash flow.",
  inputSchema: z.object({}),
  execute: async () => {
    const portfolio = (await getPortfolio()) as Portfolio;
    return {
      name: portfolio.name,
      twr: parseFloat(((portfolio.twr ?? 0) * 100).toFixed(2)),
      irr: parseFloat(((portfolio.irr ?? 0) * 100).toFixed(2)),
      cashFlow: portfolio.externalFlow ?? 0,
      performance: portfolio.totalPerformance ?? 0,
    };
  },
});

const topCategoriesByValueTool = tool({
  description: "Returns top N asset categories ranked by value. Use for allocation charts.",
  inputSchema: z.object({
    limit: z.number().default(5).describe("Number of categories to return (default 5)"),
  }),
  execute: async ({ limit = 5 }) => {
    const portfolio = (await getPortfolio()) as Portfolio;
    const liquid = portfolio.subLines.find(s => s.name === "Liquid assets");
    const illiquid = portfolio.subLines.find(s => s.name === "Illiquid assets");

    const categories = [
      ...(liquid?.subLines || []),
      ...(illiquid?.subLines || [])
    ].map(cat => ({
      name: cat.name,
      value: Math.abs(cat.externalFlow ?? 0),
      twr: parseFloat(((cat.twr ?? 0) * 100).toFixed(2)),
    })).sort((a, b) => b.value - a.value).slice(0, limit);

    return { categories };
  },
});

const topAssetsByPerformanceTool = tool({
  description: "Returns top N best performing assets by TWR.",
  inputSchema: z.object({
    limit: z.number().default(5).describe("Number of assets to return (default 5)"),
  }),
  execute: async ({ limit = 5 }) => {
    const portfolio = (await getPortfolio()) as Portfolio;
    const allAssets = getAllAssets(portfolio).filter(a => a.twr !== null && a.subLines.length === 0);

    const topAssets = allAssets
      .sort((a, b) => (b.twr ?? 0) - (a.twr ?? 0))
      .slice(0, limit)
      .map(a => ({
        name: a.name,
        twr: parseFloat(((a.twr ?? 0) * 100).toFixed(2)),
        performance: a.totalPerformance ?? 0,
      }));

    return { assets: topAssets };
  },
});

const worstAssetsByPerformanceTool = tool({
  description: "Returns bottom N worst performing assets by TWR.",
  inputSchema: z.object({
    limit: z.number().default(5).describe("Number of assets to return (default 5)"),
  }),
  execute: async ({ limit = 5 }) => {
    const portfolio = (await getPortfolio()) as Portfolio;
    const allAssets = getAllAssets(portfolio).filter(a => a.twr !== null && a.subLines.length === 0);

    const worstAssets = allAssets
      .sort((a, b) => (a.twr ?? 0) - (b.twr ?? 0))
      .slice(0, limit)
      .map(a => ({
        name: a.name,
        twr: parseFloat(((a.twr ?? 0) * 100).toFixed(2)),
        performance: a.totalPerformance ?? 0,
      }));

    return { assets: worstAssets };
  },
});

const cashFlowSummaryTool = tool({
  description: "Returns cash flow breakdown: inflows vs outflows for liquid and illiquid assets.",
  inputSchema: z.object({}),
  execute: async () => {
    const portfolio = (await getPortfolio()) as Portfolio;
    const liquid = portfolio.subLines.find(s => s.name === "Liquid assets");
    const illiquid = portfolio.subLines.find(s => s.name === "Illiquid assets");

    const liquidFlow = liquid?.externalFlow ?? 0;
    const illiquidFlow = illiquid?.externalFlow ?? 0;

    return {
      liquid: {
        name: "Liquid",
        inflow: liquidFlow < 0 ? Math.abs(liquidFlow) : 0,
        outflow: liquidFlow > 0 ? liquidFlow : 0,
        net: liquidFlow,
      },
      illiquid: {
        name: "Illiquid",
        inflow: illiquidFlow < 0 ? Math.abs(illiquidFlow) : 0,
        outflow: illiquidFlow > 0 ? illiquidFlow : 0,
        net: illiquidFlow,
      },
      total: {
        inflow: (liquidFlow < 0 ? Math.abs(liquidFlow) : 0) + (illiquidFlow < 0 ? Math.abs(illiquidFlow) : 0),
        outflow: (liquidFlow > 0 ? liquidFlow : 0) + (illiquidFlow > 0 ? illiquidFlow : 0),
      }
    };
  },
});

const liquidityBreakdownTool = tool({
  description: "Returns liquid vs illiquid assets breakdown with values and percentages.",
  inputSchema: z.object({}),
  execute: async () => {
    const portfolio = (await getPortfolio()) as Portfolio;
    const liquid = portfolio.subLines.find(s => s.name === "Liquid assets");
    const illiquid = portfolio.subLines.find(s => s.name === "Illiquid assets");

    const liquidValue = Math.abs(liquid?.externalFlow ?? 0);
    const illiquidValue = Math.abs(illiquid?.externalFlow ?? 0);
    const total = liquidValue + illiquidValue;

    return {
      liquid: {
        value: liquidValue,
        percentage: total > 0 ? parseFloat(((liquidValue / total) * 100).toFixed(1)) : 0,
        twr: parseFloat(((liquid?.twr ?? 0) * 100).toFixed(2)),
      },
      illiquid: {
        value: illiquidValue,
        percentage: total > 0 ? parseFloat(((illiquidValue / total) * 100).toFixed(1)) : 0,
        twr: parseFloat(((illiquid?.twr ?? 0) * 100).toFixed(2)),
      },
    };
  },
});

const categoryPerformanceTool = tool({
  description: "Returns performance metrics for all asset categories (TWR comparison).",
  inputSchema: z.object({
    limit: z.number().default(5).describe("Number of categories to return (default 5)"),
  }),
  execute: async ({ limit = 5 }) => {
    const portfolio = (await getPortfolio()) as Portfolio;
    const liquid = portfolio.subLines.find(s => s.name === "Liquid assets");
    const illiquid = portfolio.subLines.find(s => s.name === "Illiquid assets");

    const categories = [
      ...(liquid?.subLines || []),
      ...(illiquid?.subLines || [])
    ].map(cat => ({
      name: cat.name,
      twr: parseFloat(((cat.twr ?? 0) * 100).toFixed(2)),
      performance: cat.totalPerformance ?? 0,
    })).sort((a, b) => b.twr - a.twr).slice(0, limit);

    return { categories };
  },
});

const singleAssetAnalysisTool = tool({
  description: "Analyzes a single asset by name and returns its metrics.",
  inputSchema: z.object({
    assetName: z.string().describe("Name of the asset to analyze"),
  }),
  execute: async ({ assetName }) => {
    const portfolio = (await getPortfolio()) as Portfolio;
    const allAssets = getAllAssets(portfolio);
    const asset = allAssets.find(a => a.name.toLowerCase().includes(assetName.toLowerCase()));

    if (!asset) {
      return { found: false, name: assetName };
    }

    return {
      found: true,
      name: asset.name,
      twr: parseFloat(((asset.twr ?? 0) * 100).toFixed(2)),
      irr: parseFloat(((asset.irr ?? 0) * 100).toFixed(2)),
      cashFlow: asset.externalFlow ?? 0,
      performance: asset.totalPerformance ?? 0,
    };
  },
});

const categoryTimeseriesTool = tool({
  description: "Returns performance timeseries for a category between two dates (daily/weekly/monthly) for charts.",
  inputSchema: z.object({
    category: z.string().describe("Category name, e.g., 'Stocks' or 'Bonds'"),
    startDate: z.string().describe("Start date (YYYY-MM-DD)"),
    endDate: z.string().describe("End date (YYYY-MM-DD)"),
    interval: z.enum(["daily", "weekly", "monthly"]).default("weekly").describe("Aggregation interval"),
  }),
  execute: async ({ category, startDate, endDate, interval }) => {
    return getCategoryTimeseriesData({
      category,
      startDate,
      endDate,
      interval,
    });
  },
});

// Visualization tools - AI fills these with data to render charts
const barChartTool = tool({
  description: "Render a bar chart. Use AFTER fetching data to visualize comparisons. Max 5 bars.",
  inputSchema: barChartSchema,
  execute: async (data) => data, // Pass-through, rendering happens client-side
});

const pieChartTool = tool({
  description: "Render a pie chart. Use AFTER fetching data to show proportions/distributions. Max 5 segments.",
  inputSchema: pieChartSchema,
  execute: async (data) => data, // Pass-through, rendering happens client-side
});

const lineChartTool = tool({
  description: "Render a line chart. Use AFTER fetching time series or trend data. Max 3 series, 12 points each.",
  inputSchema: lineChartSchema,
  execute: async (data) => data, // Pass-through for client rendering
});

const BASE_SYSTEM_PROMPT = `You are QUBE, an intelligent and friendly portfolio analysis assistant. You help users understand their investments with clarity, insight, and a touch of personality.

## Your Personality
- Be warm, professional, and genuinely helpful
- Share insights and observations beyond just the raw data
- Feel free to add context, explain trends, or highlight interesting patterns
- Use clear, conversational language while remaining accurate

## Available Tools
Pick the appropriate tool(s) for the question:

**Data Tools:**
- \`portfolioSummary\` - Get total portfolio TWR, IRR, cash flow overview
- \`topCategoriesByValue\` - Top N categories by value (great for allocation views)
- \`topAssetsByPerformance\` - Best N performing assets by TWR
- \`worstAssetsByPerformance\` - Worst N performing assets by TWR
- \`cashFlowSummary\` - Inflows vs outflows breakdown
- \`liquidityBreakdown\` - Liquid vs illiquid split with percentages
- \`categoryPerformance\` - TWR comparison across categories
- \`categoryTimeseries\` - Performance over time for a category (use for line charts)
- \`singleAssetAnalysis\` - Deep dive into a specific asset

**Visualization Tools (use after fetching data):**
- \`barChart\` - For comparisons (max 5 bars)
- \`pieChart\` - For proportions (max 5 segments)
- \`lineChart\` - For trends and time series (max 3 series)

## Chart Best Practices (IMPORTANT!)

**Bar Charts** - Use for comparing values across categories:
\`\`\`json
{
  "title": "Top 5 Assets by Performance",
  "bars": [
    {"label": "Apple", "value": 45.2},
    {"label": "MSFT", "value": 32.1},
    {"label": "Google", "value": 28.5}
  ],
  "valueLabel": "%"
}
\`\`\`
- **Labels**: Keep short (max 10-12 characters). Use abbreviations: "Real Estate" → "Real Est.", "Certificates" → "Certs"
- **Values**: Use clean numbers. Round to 1-2 decimals max
- **valueLabel**: Always specify! Use "%" for percentages, "EUR" for currency
- **Order**: Sort bars logically (highest to lowest, or chronologically)

**Pie Charts** - Use for showing proportions of a whole:
\`\`\`json
{
  "title": "Portfolio Allocation",
  "segments": [
    {"label": "Equities", "value": 45000},
    {"label": "Bonds", "value": 30000},
    {"label": "Real Est.", "value": 25000}
  ]
}
\`\`\`
- **Labels**: Short and clear. Abbreviate long names
- **Values**: Use absolute numbers (not percentages) - the chart calculates % automatically
- **Segments**: Limit to 3-5 for readability. Group small items as "Other" if needed

**Line Charts** - Use for trends over time:
\`\`\`json
{
  "title": "Portfolio Performance (YTD)",
  "xLabel": "Date",
  "yLabel": "%",
  "series": [
    {
      "name": "Portfolio",
      "points": [{"x": "Jan", "y": 1.2}, {"x": "Feb", "y": 2.5}]
    }
  ]
\`\`\`
- **Series**: Limit to 1-3 series for clarity
- **Points**: Ensure x-axis values are consistent across series

**When to use which:**
- Performance comparisons → Bar Chart
- Allocation/Distribution → Pie Chart
- Time series/trends → Line Chart
- Single asset details → Markdown Table

## Response Guidelines

**Formatting:**
- Use **bold** for key metrics and important numbers
- Use bullet points for lists of insights
- Structure longer responses with clear sections

**Markdown Tables** - For single asset details or when charts don't fit:
| Metric | Value |
|--------|-------|
| TWR | **+37.38%** |
| IRR | **12.5%** |
| Cash Flow | **€125,000** |

**Content:**
- Start with a brief, friendly summary of what you found
- Add 1-2 sentences of insight or context
- After showing a chart, add a brief interpretation (1-2 sentences)
- Keep total response length reasonable (3-6 sentences for simple queries)

**Language:** Always respond in English.

Remember: You're not just reporting numbers – you're helping users understand their portfolio story.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          if (!process.env.OPENAI_API_KEY) {
            throw new Error("OPENAI_API_KEY is missing in environment variables");
          }
          const body = await request.json();
          const { messages, systemContext } = body;

          // Prepend systemContext to system prompt if provided
          const systemPrompt = systemContext
            ? `${BASE_SYSTEM_PROMPT}\n\n## Current Task\n${systemContext}`
            : BASE_SYSTEM_PROMPT;

          const result = streamText({
            model: openai("gpt-4o"),
            stopWhen: stepCountIs(5),
            system: systemPrompt,
            messages: convertToModelMessages(messages),
            tools: {
              portfolioSummary: portfolioSummaryTool,
              topCategoriesByValue: topCategoriesByValueTool,
              topAssetsByPerformance: topAssetsByPerformanceTool,
              worstAssetsByPerformance: worstAssetsByPerformanceTool,
              cashFlowSummary: cashFlowSummaryTool,
              liquidityBreakdown: liquidityBreakdownTool,
              categoryPerformance: categoryPerformanceTool,
              categoryTimeseries: categoryTimeseriesTool,
              singleAssetAnalysis: singleAssetAnalysisTool,
              barChart: barChartTool,
              pieChart: pieChartTool,
              lineChart: lineChartTool,
            },
            toolChoice: "auto",
          });

          // Pipe the UI message stream through manual ReadableStream
          const uiResponse = result.toUIMessageStreamResponse();
          const reader = uiResponse.body?.getReader();

          if (!reader) {
            throw new Error("Failed to get stream reader");
          }

          const stream = new ReadableStream({
            async start(controller) {
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  controller.enqueue(value);
                }
                controller.close();
              } catch (error) {
                console.error("[CHAT] Stream error:", error);
                controller.error(error);
              }
            },
          });

          return new Response(stream, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache, no-transform',
              'Connection': 'keep-alive',
              'Transfer-Encoding': 'chunked',
              'X-Accel-Buffering': 'no',
            },
          });
        } catch (error) {
          console.error("API error:", error);
          return new Response(JSON.stringify({ error: String(error) }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
