import { z } from "zod";
import { GenderEnum } from "@/types/user.schema";

export const updateProfileSchema = z.object({
  code: z.string().min(1).max(50).nullable().optional(),
  name: z.string().min(1, "Name is required"),
  dateOfBirth: z.coerce.date().nullable().optional(),
  gender: GenderEnum.nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  address: z.string().max(255).nullable().optional(),
  department: z.string().max(100).nullable().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
