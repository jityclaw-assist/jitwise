import { z } from "zod";

export const ComplexityLevelSchema = z.enum(["low", "standard", "high"]);
export type ComplexityLevel = z.infer<typeof ComplexityLevelSchema>;

export const RiskLevelSchema = z.enum(["low", "medium", "high"]);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const UrgencyLevelSchema = z.enum(["normal", "expedite", "rush"]);
export type UrgencyLevel = z.infer<typeof UrgencyLevelSchema>;

export const EstimationModuleSelectionSchema = z.object({
  moduleId: z.string().min(1),
  complexity: ComplexityLevelSchema,
});
export type EstimationModuleSelection = z.infer<
  typeof EstimationModuleSelectionSchema
>;

export const EstimationInputSchema = z.object({
  modules: z.array(EstimationModuleSelectionSchema).min(1),
  riskLevel: RiskLevelSchema,
  urgencyLevel: UrgencyLevelSchema,
  hourlyRate: z.number().positive(),
});
export type EstimationInput = z.infer<typeof EstimationInputSchema>;

export const EstimationRangeSchema = z.object({
  min: z.number(),
  probable: z.number(),
  max: z.number(),
});
export type EstimationRange = z.infer<typeof EstimationRangeSchema>;

export const EstimationResultSchema = z.object({
  baseScopePoints: z.number(),
  riskMultiplier: z.number(),
  urgencyMultiplier: z.number(),
  hoursRange: EstimationRangeSchema,
  pricingRange: EstimationRangeSchema,
});
export type EstimationResult = z.infer<typeof EstimationResultSchema>;
