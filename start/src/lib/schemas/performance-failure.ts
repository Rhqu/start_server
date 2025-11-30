import { z } from "zod";

export const performanceFailureSchema = z.object({
  summary: z
    .string()
    .min(50)
    .max(400)
    .describe("Narrative explaining common reasons the worst performers struggled during the selected period."),
  badges: z
    .array(
      z.object({
        label: z
          .string()
          .min(3)
          .max(32)
          .describe("Short label for a recurring failure pattern."),
        description: z
          .string()
          .min(20)
          .max(160)
          .describe("Sentence describing why this pattern led to underperformance."),
        confidence: z
          .number()
          .min(0)
          .max(1)
          .describe("Model confidence the pattern drove losses."),
        representatives: z
          .array(
            z.object({
              name: z.string(),
              reason: z.string(),
            }),
          )
          .min(1)
          .max(5),
      }),
    )
    .max(5)
    .describe("Clusters of companies that failed for similar reasons."),
  drivers: z
    .array(
      z.object({
        title: z.string().min(5).max(80),
        explanation: z.string().min(30).max(200),
        evidence: z.string().min(20).max(200),
      }),
    )
    .min(1)
    .max(5)
    .describe("Key drivers of underperformance."),
  anomalies: z
    .array(
      z.object({
        name: z.string(),
        note: z.string(),
      }),
    )
    .optional()
    .describe("Underperformers that don't share the main failure modes."),
  outlook: z
    .string()
    .min(20)
    .max(200)
    .optional()
    .describe("Optional forward-looking risk note."),
});

export type PerformanceFailure = z.infer<typeof performanceFailureSchema>;
