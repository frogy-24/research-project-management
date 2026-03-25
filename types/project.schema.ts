import { z } from "zod";

export const ProjectStatusEnum = z.enum([
  "DRAFT",
  "SUBMITTED",
  "DEAN_APPROVED",
  "DEAN_REVISION",
  "ADMIN_REVIEW",
  "COUNCIL_EVALUATING",
  "APPROVED",
  "IN_PROGRESS",
  "COMPLETED",
  "REJECTED",
  "SUSPENDED",
]);

const relatedUserSchema = z.object({
  id: z.string().cuid(),
  code: z.string().nullable().optional(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string().nullable().optional(),
  role: z.string().optional(),
  department: z.string().nullable().optional(),
});

const callRoundTemplateItemSchema = z.object({
  id: z.string().cuid(),
  weekNumber: z.number().int(),
  weekLabel: z.string(),
  taskDescription: z.string(),
  contentGuideline: z.string().nullable().optional(),
  expectedResult: z.string().nullable().optional(),
  orderIndex: z.number().int(),
});

const callRoundTemplateSchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  items: z.array(callRoundTemplateItemSchema).optional(),
});

const callRoundRelationSchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  template: callRoundTemplateSchema.nullable().optional(),
});

export const projectSchema = z.object({
  id: z.string().cuid(),
  title: z.string().min(1, "Title is required"),
  objective: z.string().min(1, "Objective is required"),
  expectedOutput: z.string().nullable().optional(),
  proposalFileUrl: z.string().url().nullable().optional(),
  code: z.string().nullable().optional(),
  status: ProjectStatusEnum.default("DRAFT"),
  budgetRequested: z.coerce.number().min(0).nullable().optional(),
  budgetApproved: z.coerce.number().min(0).nullable().optional(),
  overdueReportCount: z.number().int().min(0).default(0),
  budgetSuspended: z.boolean().default(false),
  leaderId: z.string().min(1, "Leader is required"),
  instructorId: z.string().nullable().optional(),
  deanReviewerId: z.string().nullable().optional(),
  callRoundId: z.string().nullable().optional(),
  projectTypeId: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  leader: relatedUserSchema.optional(),
  instructor: relatedUserSchema.nullable().optional(),
  deanReviewer: relatedUserSchema.nullable().optional(),
  callRound: callRoundRelationSchema.nullable().optional(),
  projectType: z.object({
    id: z.string().cuid(),
    name: z.string(),
  }).nullable().optional(),
});

export const createProjectSchema = projectSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  leader: true,
  instructor: true,
  deanReviewer: true,
  callRound: true,
  projectType: true,
});

export const updateProjectSchema = createProjectSchema.partial();

export type Project = z.infer<typeof projectSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ProjectStatus = z.infer<typeof ProjectStatusEnum>;
