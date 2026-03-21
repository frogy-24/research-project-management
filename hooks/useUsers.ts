import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi, type PaginatedUsers } from "@/api/users";
import type { User } from "@/types/user.schema";

export const useUsers = (params?: {
  role?: string;
  departmentId?: string;
  majorId?: string;
  classId?: string;
  gender?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery<PaginatedUsers>({
    queryKey: ["users", params],
    queryFn: () => userApi.getAll(params),
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: userApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & any) =>
      userApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: userApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};
