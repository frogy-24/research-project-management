import { z } from 'zod';

export const assignProjectsToCouncilSchema = z.object({
    callRoundId: z.string().min(1),
    councilId: z.string().min(1),
    projectRegistrationIds: z.array(z.string().min(1)).min(1),
});

export const unassignProjectsFromCouncilSchema = z.object({
    callRoundId: z.string().min(1),
    projectRegistrationIds: z.array(z.string().min(1)).min(1),
});

export const finalizeCouncilAssignmentsSchema = z.object({
    callRoundId: z.string().min(1),
});

export const updateCouncilDefenseLocationSchema = z.object({
    callRoundId: z.string().min(1),
    councilId: z.string().min(1),
    defenseLocation: z.string().max(255).nullable().optional(),
    defenseDate: z.coerce.date().nullable().optional(),
});

export const councilAssignmentProjectSchema = z.object({
    id: z.string(),
    title: z.string(),
    objective: z.string().nullable().optional(),
    facultyStatus: z.string(),
    instructorStatus: z.string(),
    user: z.object({
        id: z.string(),
        name: z.string(),
        code: z.string().nullable().optional(),
    }),
    councilAssignment: z
        .object({
            id: z.string(),
            councilId: z.string(),
        })
        .nullable()
        .optional(),
});

export const councilAssignmentCouncilSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    defenseDate: z.coerce.date().nullable().optional(),
    defenseLocation: z.string().nullable().optional(),
    _count: z.object({
        members: z.number(),
        projects: z.number(),
    }),
});

export const councilProjectAssignmentsResponseSchema = z.object({
    isFinalized: z.boolean().default(false),
    callRound: z.object({
        id: z.string(),
        defenseDate: z.coerce.date().nullable().optional(),
        defenseLocation: z.string().nullable().optional(),
    }),
    councils: z.array(councilAssignmentCouncilSchema),
    approvedProjects: z.array(councilAssignmentProjectSchema),
});

export type AssignProjectsToCouncilInput = z.infer<typeof assignProjectsToCouncilSchema>;
export type UnassignProjectsFromCouncilInput = z.infer<typeof unassignProjectsFromCouncilSchema>;
export type FinalizeCouncilAssignmentsInput = z.infer<typeof finalizeCouncilAssignmentsSchema>;
export type UpdateCouncilDefenseLocationInput = z.infer<typeof updateCouncilDefenseLocationSchema>;
export type CouncilAssignmentProject = z.infer<typeof councilAssignmentProjectSchema>;
export type CouncilAssignmentCouncil = z.infer<typeof councilAssignmentCouncilSchema>;
export type CouncilProjectAssignmentsResponse = z.infer<typeof councilProjectAssignmentsResponseSchema>;
