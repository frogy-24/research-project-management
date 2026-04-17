import { z } from "zod";

export const reviewDecisionEnum = z.enum(["PASS", "NEED_REVISION", "FAIL"]);

export const councilEvaluationSchema = z.object({
  id: z.string().cuid(),
  projectId: z.string().cuid(),
  councilMemberId: z.string().cuid(),
  score: z.number().min(0).max(10),
  decision: reviewDecisionEnum,
  comment: z.string().nullable().optional(),
  evaluatedAt: z.coerce.date(),
  createdAt: z.coerce.date(),
});

export const createCouncilEvaluationSchema = councilEvaluationSchema.omit({
  id: true,
  projectId: true,
  councilMemberId: true,
  evaluatedAt: true,
  createdAt: true,
});

export type CouncilEvaluation = z.infer<typeof councilEvaluationSchema>;
export type CreateCouncilEvaluationInput = z.infer<typeof createCouncilEvaluationSchema>;
