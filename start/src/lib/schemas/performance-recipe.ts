import { z } from "zod";

export const performanceRecipeSchema = z.object({
  summary: z
    .string()
    .min(10)
    .max(150)
    .describe("Very short summary (max 2 sentences) explaining why top performers excelled."),
  badges: z
    .array(
      z.object({
        label: z
          .string()
          .min(2)
          .max(20)
          .describe("Short tag (2-4 words)."),
        description: z
          .string()
          .min(5)
          .max(60)
          .describe("One short sentence explanation."),
        confidence: z
          .number()
          .min(0)
          .max(1)
          .describe("Model confidence."),
        representatives: z
          .array(
            z.object({
              name: z.string(),
              reason: z.string(),
            }),
          )
          .min(1)
          .max(3)
          .describe("Sample companies."),
      }),
    )
    .max(4)
    .describe("Classification of top-performing companies."),
  drivers: z
    .array(
      z.object({
        title: z
          .string()
          .min(3)
          .max(40)
          .describe("Short driver title."),
        explanation: z
          .string()
          .min(10)
          .max(100)
          .describe("Brief description."),
        evidence: z
          .string()
          .min(5)
          .max(100)
          .describe("Short evidence."),
      }),
    )
    .min(1)
    .max(5)
    .describe("Key reasons these winners outperformed."),
  anomalies: z
    .array(
      z.object({
        name: z.string(),
        note: z.string(),
      }),
    )
    .optional()
    .describe("Winners that do not fit shared success recipes."),
  outlook: z
    .string()
    .min(20)
    .max(200)
    .optional()
    .describe("Optional forward-looking takeaway for investors."),
});

export type PerformanceRecipe = z.infer<typeof performanceRecipeSchema>;
