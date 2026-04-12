// api/majors.ts
import { api } from "@/lib/axios";
import { z } from "zod";

const majorItemSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  description: z.string().optional().nullable(),
  departmentId: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  department: z
    .object({
      id: z.string(),
      name: z.string(),
      code: z.string(),
    })
    .optional()
    .nullable(),
});

const majorListSchema = majorItemSchema.array();

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

export type MajorItem = z.infer<typeof majorItemSchema>;

export type PaginatedMajors = {
  data: MajorItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type CreateMajorPayload = {
  code: string;
  name: string;
  departmentId: string;
  description?: string;
};

export type UpdateMajorPayload = Partial<CreateMajorPayload>;

export const majorApi = {
  getAll: async (params?: {
    departmentId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedMajors> => {
    const response = await api.get<PaginatedMajors>("/majors", { params });
    return {
      data: majorListSchema.parse(response.data.data),
      pagination: response.data.pagination ?? {
        page: 1,
        limit: 20,
        total: response.data.data?.length || 0,
        totalPages: 1,
      },
    };
  },

  getById: async (id: string): Promise<MajorItem> => {
    const response = await api.get<MajorItem>(`/majors/${id}`);
    return majorItemSchema.parse(response.data);
  },

  create: async (data: CreateMajorPayload): Promise<MajorItem> => {
    const response = await api.post<MajorItem>("/majors", data);
    return majorItemSchema.parse(response.data);
  },

  update: async (id: string, data: UpdateMajorPayload): Promise<MajorItem> => {
    const response = await api.put<MajorItem>(`/majors/${id}`, data);
    return majorItemSchema.parse(response.data);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/majors/${id}`);
  },
};
