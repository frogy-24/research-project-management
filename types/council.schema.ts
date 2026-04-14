import { z } from 'zod';
import { councilEvaluationSchema } from './council-evaluation.schema';

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
    code: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
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
      email: z.string().email().nullable().optional(),
      code: z.string().nullable().optional(),
    }),
    instructor: z
      .object({
        id: z.string(),
        name: z.string(),
        email: z.string().email().nullable().optional(),
        code: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
    students: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          email: z.string().email().nullable().optional(),
          code: z.string().nullable().optional(),
          roleLabel: z.string(),
        })
      )
      .optional(),
  }),
});

export type ProjectCouncilAssignment = z.infer<typeof projectCouncilAssignmentSchema>;

// Council with relations
export const councilWithRelationsSchema = councilSchema.extend({
  callRoundName: z.string().optional(),
  defenseDate: z.coerce.date().nullable().optional(),
  defenseLocation: z.string().nullable().optional(),
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
  ).min(1, 'Phải có ít nhất 1 thành viên').max(3, 'Tối đa 3 thành viên'),
});

export type CreateCouncilRequest = z.infer<typeof createCouncilRequestSchema>;

export const updateCouncilRequestSchema = z.object({
  name: z.string().min(1, 'Tên hội đồng là bắt buộc'),
  description: z.string().optional(),
  members: z.array(
    z.object({
      councilMemberId: z.string(),
      role: z.string().optional(),
    })
  ).min(1, 'Phải có ít nhất 1 thành viên').max(3, 'Tối đa 3 thành viên').optional(),
});

export type UpdateCouncilRequest = z.infer<typeof updateCouncilRequestSchema>;

export const lecturerCouncilItemSchema = z.object({
  assignmentId: z.string(),
  role: z.string().nullable().optional(),
  joinedAt: z.coerce.date(),
  council: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    callRoundId: z.string(),
    callRoundName: z.string(),
    defenseDate: z.coerce.date().nullable().optional(),
    defenseLocation: z.string().nullable().optional(),
    memberCount: z.number(),
    projectCount: z.number(),
    members: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        email: z.string().email().nullable().optional(),
        code: z.string().nullable().optional(),
        role: z.string().nullable().optional(),
      })
    ),
    projects: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        advisor: z
          .object({
            id: z.string(),
            name: z.string(),
            email: z.string().email().nullable().optional(),
            code: z.string().nullable().optional(),
            phone: z.string().nullable().optional(),
          })
          .nullable()
          .optional(),
        students: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            email: z.string().email().nullable().optional(),
            code: z.string().nullable().optional(),
            roleLabel: z.string(),
          })
        ),
        myEvaluation: councilEvaluationSchema.nullable().optional(),
      })
    ),
  }),
});

export const lecturerCouncilListSchema = z.array(lecturerCouncilItemSchema);

export type LecturerCouncilItem = z.infer<typeof lecturerCouncilItemSchema>;

export const studentCouncilItemSchema = z.object({
  projectAssignmentId: z.string(),
  projectRegistrationId: z.string(),
  projectTitle: z.string(),
  participationRole: z.enum(['OWNER', 'TEAM_MEMBER']),
  assignedAt: z.coerce.date(),
  council: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    callRoundId: z.string(),
    callRoundName: z.string(),
    defenseDate: z.coerce.date().nullable().optional(),
    defenseLocation: z.string().nullable().optional(),
    memberCount: z.number(),
    projectCount: z.number(),
    members: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        email: z.string().email().nullable().optional(),
        code: z.string().nullable().optional(),
        role: z.string().nullable().optional(),
      })
    ),
  }),
});

export const studentCouncilListSchema = z.array(studentCouncilItemSchema);

export type StudentCouncilItem = z.infer<typeof studentCouncilItemSchema>;

export const quickAddCouncilsInputSchema = z.object({
  callRoundId: z.string().min(1),
  minProjectsPerCouncil: z.number().min(1).max(20).default(5),
  maxProjectsPerCouncil: z.number().min(1).max(20).default(10),
  clearExisting: z.boolean().default(false),
});

export type QuickAddCouncilsInput = z.infer<typeof quickAddCouncilsInputSchema>;

export const quickAddCouncilItemSchema = z.object({
  councilId: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  projectCount: z.number(),
  memberCount: z.number(),
  agreeButton: z.object({
    label: z.string(),
    action: z.string(),
    payload: z.object({
      councilId: z.string(),
    }),
  }),
});

export const quickAddCouncilsViewSchema = z.object({
  summary: z.string(),
  callRoundId: z.string().optional().default(''),
  totalCouncils: z.number(),
  totalProjects: z.number(),
  items: z.array(quickAddCouncilItemSchema),
});

export type QuickAddCouncilsView = z.infer<typeof quickAddCouncilsViewSchema>;

export const quickAddCouncilsResponseSchema = z.object({
  success: z.boolean(),
  source: z.string(),
  client_view: quickAddCouncilsViewSchema,
  mcp_meta: z
    .object({
      endpoint: z.string().optional(),
      status_code: z.number().optional(),
    })
    .optional(),
});

export type QuickAddCouncilsResponse = z.infer<typeof quickAddCouncilsResponseSchema>;

export const confirmQuickAddCouncilsInputSchema = z.object({
  callRoundId: z.string().min(1),
  selectedCouncilIds: z.array(z.string()).min(1),
});

export type ConfirmQuickAddCouncilsInput = z.infer<typeof confirmQuickAddCouncilsInputSchema>;

export const confirmQuickAddCouncilsResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  confirmed_count: z.number(),
  confirmed_items: z.array(z.unknown()),
});

export type ConfirmQuickAddCouncilsResponse = z.infer<typeof confirmQuickAddCouncilsResponseSchema>;
