import { z } from "zod";

export const RoleEnum = z.enum([
  "STUDENT",
  "LECTURER",
  "DEAN",
  "ADMIN",
  "COUNCIL",
  "LEADER",
]);

export const GenderEnum = z.enum(["MALE", "FEMALE", "OTHER"]);

export const userSchema = z.object({
  id: z.string().cuid(),
  code: z.string().nullable().optional(),
  name: z.string().min(1),
  email: z.string().email(),
  dateOfBirth: z.coerce.date().nullable().optional(),
  gender: GenderEnum.nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  role: RoleEnum,
  department: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createUserSchema = userSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type User = z.infer<typeof userSchema>;
export type Role = z.infer<typeof RoleEnum>;
export type Gender = z.infer<typeof GenderEnum>;
