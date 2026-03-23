import { api } from "@/lib/axios";
import { userSchema, type User } from "@/types/user.schema";

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

export type PaginatedUsers = {
  data: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const userListSchema = userSchema.array();

export const userApi = {
  getAll: async (params?: {
    role?: string;
    departmentId?: string;
    majorId?: string;
    classId?: string;
    gender?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedUsers> => {
    const response = await api.get<ApiSuccess<User[]>>("/users", { params });
    return {
      data: userListSchema.parse(response.data.data),
      pagination: response.data.pagination || {
        page: 1,
        limit: 20,
        total: response.data.data.length,
        totalPages: 1,
      },
    };
  },
  create: async (data: any): Promise<User> => {
    const response = await api.post<User>("/users", data);
    return userSchema.parse(response.data);
  },
  update: async (id: string, data: any): Promise<User> => {
    const response = await api.patch<User>(`/users/${id}`, data);
    return userSchema.parse(response.data);
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
  getNextCode: async (role: string): Promise<{ code: string }> => {
    const response = await api.get<{ code: string }>(`/users/next-code?role=${role}`);
    return response.data;
  },
};
