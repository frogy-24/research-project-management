import { z } from 'zod';
import { reviewDecisionEnum } from '@/types/council-evaluation.schema';

export const deanCouncilEvaluationItemSchema = z.object({
    id: z.string(),
    callRoundId: z.string(),
    callRoundName: z.string(),
    councilId: z.string(),
    councilName: z.string(),
    projectId: z.string(),
    projectTitle: z.string(),
    projectRegistrationId: z.string().nullable(),
    projectRegistrationTitle: z.string().nullable(),
    defenseDate: z.coerce.date().nullable(),
    defenseLocation: z.string().nullable(),
    student: z.object({
        name: z.string(),
        code: z.string().nullable(),
        email: z.string().email(),
        className: z.string().nullable(),
    }),
    advisor: z.object({
        name: z.string().nullable(),
        code: z.string().nullable(),
        email: z.string().email().nullable(),
    }),
    evaluator: z.object({
        id: z.string(),
        name: z.string(),
        code: z.string().nullable(),
        email: z.string().email().nullable(),
    }),
    score: z.number().min(0).max(10),
    decision: reviewDecisionEnum,
    comment: z.string().nullable(),
    evaluatedAt: z.coerce.date(),
});

export const deanCouncilEvaluationSummarySchema = z.object({
    totalEvaluations: z.number().int().nonnegative(),
    totalProjects: z.number().int().nonnegative(),
    averageScore: z.number().nullable(),
});

export const deanCouncilEvaluationListSchema = z.object({
    summary: deanCouncilEvaluationSummarySchema,
    items: z.array(deanCouncilEvaluationItemSchema),
});

export type DeanCouncilEvaluationItem = z.infer<typeof deanCouncilEvaluationItemSchema>;
export type DeanCouncilEvaluationSummary = z.infer<typeof deanCouncilEvaluationSummarySchema>;
export type DeanCouncilEvaluationList = z.infer<typeof deanCouncilEvaluationListSchema>;
