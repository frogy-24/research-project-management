import { z } from 'zod';

export const callRoundSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),

    // Thời gian đăng ký
    registrationStartDate: z.coerce.date(),
    registrationEndDate: z.coerce.date(),

    // Thời gian thực hiện đề tài
    projectStartDate: z.coerce.date().nullable().optional(),
    projectEndDate: z.coerce.date().nullable().optional(),

    // Các mốc thời gian khác
    reviewDeadline: z.coerce.date().nullable().optional(),
    reportingStartDate: z.coerce.date().nullable().optional(),

    // Legacy fields
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),

    // Thông tin bổ sung
    maxProjects: z.coerce.number().nullable().optional(),
    budgetLimit: z.coerce.number().nullable().optional(),
    requirements: z.string().nullable().optional(),
    guidelines: z.string().nullable().optional(),
    contactInfo: z.string().nullable().optional(),

  isActive: z.boolean(),
  isLocked: z.boolean().default(false),
  
  // Approval workflow
  approvalStatus: z.enum(["PENDING_APPROVAL", "APPROVED", "REJECTED"]),
  createdById: z.string().nullable().optional(),
  createdByRole: z.enum(["STUDENT", "LECTURER", "DEAN", "ADMIN", "COUNCIL", "LEADER"]).nullable().optional(),
  approvedById: z.string().nullable().optional(),
  approvalNote: z.string().nullable().optional(),
  approvedAt: z.coerce.date().nullable().optional(),
  
  templateId: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),

    // Relations (optional - from API with includes)
    template: z
        .object({
            id: z.string(),
            name: z.string(),
        })
        .nullable()
        .optional(),
    departments: z
        .array(
            z.object({
                id: z.string(),
                code: z.string(),
                name: z.string(),
            }),
        )
        .optional(),
    majors: z
        .array(
            z.object({
                id: z.string(),
                code: z.string(),
                name: z.string(),
            }),
        )
        .optional(),
    classes: z
        .array(
            z.object({
                id: z.string(),
                code: z.string(),
                name: z.string(),
            }),
        )
        .optional(),
    _count: z
        .object({
            projects: z.number(),
        })
        .optional(),
});

// Base schema without refinements for partial updates
const callRoundBaseSchema = z.object({
    name: z.string().min(1, 'Tên đợt đăng ký không được để trống'),
    description: z.string().nullable().optional(),

    // Thời gian đăng ký (bắt buộc)
    registrationStartDate: z.coerce.date(),
    registrationEndDate: z.coerce.date(),

    // Thời gian thực hiện đề tài (tùy chọn)
    projectStartDate: z.coerce.date().nullable().optional(),
    projectEndDate: z.coerce.date().nullable().optional(),

    // Các mốc thời gian khác (tùy chọn)
    reviewDeadline: z.coerce.date().nullable().optional(),
    reportingStartDate: z.coerce.date().nullable().optional(),

    // Legacy fields (auto-populate from registration dates)
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),

    // Thông tin bổ sung
    maxProjects: z.number().int().positive().nullable().optional(),
    budgetLimit: z.number().positive().nullable().optional(),
    requirements: z.string().nullable().optional(),
    guidelines: z.string().nullable().optional(),
    contactInfo: z.string().nullable().optional(),

    isActive: z.boolean().default(true),
    isLocked: z.boolean().default(false),
    templateId: z.string().nullable().optional(),
    departmentIds: z.array(z.string()).optional(),
    majorIds: z.array(z.string()).optional(),
    classIds: z.array(z.string()).optional(),
});

export const createCallRoundSchema = callRoundBaseSchema
    .refine((data) => data.registrationEndDate >= data.registrationStartDate, {
        message: 'Ngày kết thúc đăng ký phải sau ngày bắt đầu',
        path: ['registrationEndDate'],
    })
    .refine((data) => !data.projectStartDate || !data.projectEndDate || data.projectEndDate >= data.projectStartDate, {
        message: 'Ngày kết thúc đề tài phải sau ngày bắt đầu',
        path: ['projectEndDate'],
    });

export const updateCallRoundSchema = callRoundBaseSchema.partial();

export type CallRound = z.infer<typeof callRoundSchema>;
export type CreateCallRoundInput = z.infer<typeof createCallRoundSchema>;
export type UpdateCallRoundInput = z.infer<typeof updateCallRoundSchema>;

// CallRound with template relation (from API)
export type CallRoundWithTemplate = CallRound & {
    template?: {
        id: string;
        name: string;
    } | null;
    _count?: {
        projects: number;
    };
};
