import { z } from "zod";
import { RoleEnum } from "@/types/user.schema";

// Schema cho đăng nhập bằng email và password
export const loginWithCredentialsSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
});

// Schema cũ cho đăng nhập theo role (giữ lại để backward compatible)
export const loginInputSchema = z.object({
  role: RoleEnum,
  userId: z.string().cuid().optional(),
});

export const authSessionSchema = z.object({
  userId: z.string().cuid(),
  role: RoleEnum,
  exp: z.number().int().positive(),
});

export type LoginWithCredentials = z.infer<typeof loginWithCredentialsSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
