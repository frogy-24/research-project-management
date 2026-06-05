import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { projectApi } from "@/api/projects";
import { CreateProjectInput, UpdateProjectInput } from "@/types/project.schema";

export const useProjects = () => {
  return useQuery({
    queryKey: ["projects"],
    queryFn: projectApi.getAll,
  });
};

// Danh sách đề tài dành cho Dean khi tạo giải ngân
// (lấy tất cả đề tài trong khoa, không giới hạn theo deanReviewerId)
export const useDeanProjects = () => {
  return useQuery({
    queryKey: ["dean-projects"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any[] }>(
        "/dean/projects"
      );
      return res.data.data;
    },
  });
};

export const useProject = (id: string) => {
  return useQuery({
    queryKey: ["projects", id],
    queryFn: () => projectApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProjectInput) => projectApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateProjectInput & { id: string }) => projectApi.update(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects", variables.id] });
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => projectApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
};
