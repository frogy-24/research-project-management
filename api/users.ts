import { api } from "@/lib/axios";
import { userSchema, type User } from "@/types/user.schema";

type ApiSuccess<T> = {
  success: true;
  data: T;
};

const userListSchema = userSchema.array();

export const userApi = {
  getAll: async (params?: {
    role?: string;
    departmentId?: string;
    majorId?: string;
    classId?: string;
    search?: string;
  }): Promise<User[]> => {
    const response = await api.get<ApiSuccess<User[]>>("/users", { params });
    return userListSchema.parse(response.data.data);
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
};
