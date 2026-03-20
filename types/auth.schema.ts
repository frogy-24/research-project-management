import { z } from "zod";
import { RoleEnum } from "@/types/user.schema";

export const loginInputSchema = z.object({
  role: RoleEnum,
  userId: z.string().cuid().optional(),
});

export const authSessionSchema = z.object({
  userId: z.string().cuid(),
  role: RoleEnum,
  exp: z.number().int().positive(),
});

export type LoginInput = z.infer<typeof loginInputSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
