// api/classes.ts
import { api } from "@/lib/axios";
import { z } from "zod";
import type { Class } from "@/types/organization.schema";

const classItemSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  majorId: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  major: z
    .object({
      id: z.string(),
      name: z.string(),
      code: z.string(),
      departmentId: z.string(),
    })
    .optional()
    .nullable(),
});

const classListSchema = classItemSchema.array();

type ApiSuccess<T> = {
  success: true;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type ClassItem = z.infer<typeof classItemSchema>;

export type PaginatedClasses = {
  data: ClassItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type CreateClassPayload = {
  code: string;
  name: string;
  majorId: string;
};

export type UpdateClassPayload = Partial<CreateClassPayload>;

export const classApi = {
  getAll: async (params?: {
    majorId?: string;
    departmentId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedClasses> => {
    const response = await api.get<ApiSuccess<ClassItem[]>>("/classes", { params });
    return {
      data: classListSchema.parse(response.data.data),
      pagination: response.data.pagination ?? {
        page: 1,
        limit: 20,
        total: response.data.data.length,
        totalPages: 1,
      },
    };
  },

  getById: async (id: string): Promise<ClassItem> => {
    const response = await api.get<ApiSuccess<ClassItem>>(`/classes/${id}`);
    return classItemSchema.parse(response.data.data);
  },

  create: async (data: CreateClassPayload): Promise<ClassItem> => {
    const response = await api.post<ApiSuccess<ClassItem>>("/classes", data);
    return classItemSchema.parse(response.data.data);
  },

  update: async (id: string, data: UpdateClassPayload): Promise<ClassItem> => {
    const response = await api.put<ApiSuccess<ClassItem>>(`/classes/${id}`, data);
    return classItemSchema.parse(response.data.data);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/classes/${id}`);
  },
};
