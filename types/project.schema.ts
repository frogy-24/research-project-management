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
});

export const createProjectSchema = projectSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateProjectSchema = createProjectSchema.partial();

export type Project = z.infer<typeof projectSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ProjectStatus = z.infer<typeof ProjectStatusEnum>;
