import { z } from "zod";

export const requestStatusEnum = z.enum(["PENDING", "APPROVED", "REJECTED"]);

export const extensionRequestSchema = z.object({
  id: z.string().cuid(),
  projectId: z.string().cuid(),
  requestedMonths: z.number().int().min(1).max(24),
  reason: z.string().min(1),
  status: requestStatusEnum,
  submittedAt: z.coerce.date(),
  reviewedAt: z.coerce.date().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createExtensionRequestSchema = extensionRequestSchema.omit({
  id: true,
  projectId: true,
  status: true,
  submittedAt: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const reviewExtensionRequestSchema = z.object({
  status: requestStatusEnum.refine((value) => value !== "PENDING", {
    message: "Status must be APPROVED or REJECTED",
  }),
});

export type ExtensionRequest = z.infer<typeof extensionRequestSchema>;
export type CreateExtensionRequestInput = z.infer<typeof createExtensionRequestSchema>;
export type ReviewExtensionRequestInput = z.infer<typeof reviewExtensionRequestSchema>;
