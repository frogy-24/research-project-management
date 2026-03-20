import { z } from "zod";

export const RegistrationStatusEnum = z.enum(["PENDING", "APPROVED", "CANCELED", "REJECTED"]);
export const InstructorStatusEnum = z.enum(["PENDING", "ACCEPTED", "REJECTED"]);

export const projectRegistrationSchema = z.object({
  id: z.string().cuid(),
  userId: z.string().cuid(),
  title: z.string().min(1),
  objective: z.string().min(1),
  expectedOutput: z.string().nullable().optional(),
  instructorId: z.string().cuid().nullable().optional(),
  instructorStatus: InstructorStatusEnum.optional(),
  status: RegistrationStatusEnum,
  cancelReason: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  instructor: z.object({
    id: z.string().cuid(),
    name: z.string(),
  }).nullable().optional(),
});

export const createProjectRegistrationSchema = projectRegistrationSchema.omit({
  id: true,
  userId: true,
  status: true,
  instructorStatus: true,
  cancelReason: true,
  createdAt: true,
  updatedAt: true,
  instructor: true,
});

export const cancelProjectRegistrationSchema = z.object({
  cancelReason: z.string().min(1, "Cancel reason is required"),
});

export type ProjectRegistration = z.infer<typeof projectRegistrationSchema>;
export type CreateProjectRegistrationInput = z.infer<typeof createProjectRegistrationSchema>;
export type CancelProjectRegistrationInput = z.infer<typeof cancelProjectRegistrationSchema>;
