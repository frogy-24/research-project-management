import { z } from "zod";

export const departmentSchema = z.object({
  code: z.string().min(1, "Mã khoa không được để trống"),
  name: z.string().min(1, "Tên khoa không được để trống"),
  description: z.string().optional().nullable(),
});

export const updateDepartmentSchema = departmentSchema.partial();

export const majorSchema = z.object({
  code: z.string().min(1, "Mã ngành không được để trống"),
  name: z.string().min(1, "Tên ngành không được để trống"),
  description: z.string().optional().nullable(),
  departmentId: z.string().min(1, "Khoa không được để trống"),
});

export const updateMajorSchema = majorSchema.partial();

export const classSchema = z.object({
  code: z.string().min(1, "Mã lớp không được để trống"),
  name: z.string().min(1, "Tên lớp không được để trống"),
  majorId: z.string().min(1, "Ngành không được để trống"),
});

export const updateClassSchema = classSchema.partial();

export type Department = z.infer<typeof departmentSchema> & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Major = z.infer<typeof majorSchema> & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  department?: Department;
};

export type Class = z.infer<typeof classSchema> & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  major?: Major;
};
