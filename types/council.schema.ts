import { z } from 'zod';

// Council schema
export const councilSchema = z.object({
  id: z.string(),
  callRoundId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Council = z.infer<typeof councilSchema>;

// Council member assignment schema
export const councilMemberAssignmentSchema = z.object({
  id: z.string(),
  councilId: z.string(),
  councilMemberId: z.string(),
  role: z.string(),
  createdAt: z.coerce.date(),
  councilMember: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    code: z.string(),
  }),
});

export type CouncilMemberAssignment = z.infer<typeof councilMemberAssignmentSchema>;

// Project council assignment schema
export const projectCouncilAssignmentSchema = z.object({
  id: z.string(),
  councilId: z.string(),
  projectRegistrationId: z.string(),
  createdAt: z.coerce.date(),
  projectRegistration: z.object({
    id: z.string(),
    title: z.string(),
    objective: z.string().nullable(),
    status: z.string(),
    user: z.object({
      id: z.string(),
      name: z.string(),
      code: z.string(),
    }),
  }),
});

export type ProjectCouncilAssignment = z.infer<typeof projectCouncilAssignmentSchema>;

// Council with relations
export const councilWithRelationsSchema = councilSchema.extend({
  members: z.array(councilMemberAssignmentSchema),
  projects: z.array(projectCouncilAssignmentSchema),
  _count: z.object({
    members: z.number(),
    projects: z.number(),
  }),
});

export type CouncilWithRelations = z.infer<typeof councilWithRelationsSchema>;

// Auto-divide request
export const autoDivideCouncilsRequestSchema = z.object({
  minProjectsPerCouncil: z.number().min(1).max(20).optional().default(5),
  maxProjectsPerCouncil: z.number().min(1).max(20).optional().default(10),
  clearExisting: z.boolean().optional().default(false),
});

export type AutoDivideCouncilsRequest = z.infer<typeof autoDivideCouncilsRequestSchema>;

// Auto-divide response
export const autoDivideCouncilsResponseSchema = z.object({
  success: z.boolean(),
  councils: z.array(
    councilSchema.extend({
      projectCount: z.number(),
      memberCount: z.number(),
    })
  ),
  totalProjects: z.number(),
  totalCouncils: z.number(),
});

export type AutoDivideCouncilsResponse = z.infer<typeof autoDivideCouncilsResponseSchema>;

// Create council request
export const createCouncilRequestSchema = z.object({
  callRoundId: z.string(),
  name: z.string().min(1, 'Tên hội đồng là bắt buộc'),
  description: z.string().optional(),
  members: z.array(
    z.object({
      councilMemberId: z.string(),
      role: z.string().optional(),
    })
  ).min(1, 'Phải có ít nhất 1 thành viên'),
});

export type CreateCouncilRequest = z.infer<typeof createCouncilRequestSchema>;
