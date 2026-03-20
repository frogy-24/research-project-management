import { api } from "@/lib/axios";
import {
  createProjectSchema,
  projectSchema,
  updateProjectSchema,
  type CreateProjectInput,
  type Project,
  type UpdateProjectInput,
} from "@/types/project.schema";

type ApiSuccess<T> = {
  success: true;
  data: T;
};

const projectListResponseSchema = projectSchema.array();

export const projectApi = {
  getAll: async (): Promise<Project[]> => {
    const response = await api.get<ApiSuccess<Project[]>>("/projects");
    return projectListResponseSchema.parse(response.data.data);
  },

  getById: async (id: string): Promise<Project> => {
    const response = await api.get<ApiSuccess<Project>>(`/projects/${id}`);
    return projectSchema.parse(response.data.data);
  },

  create: async (payload: CreateProjectInput): Promise<Project> => {
    const validated = createProjectSchema.parse(payload);
    const response = await api.post<ApiSuccess<Project>>("/projects", validated);
    return projectSchema.parse(response.data.data);
  },

  update: async (payload: UpdateProjectInput & { id: string }): Promise<Project> => {
    const validated = updateProjectSchema.parse(payload);
    const response = await api.patch<ApiSuccess<Project>>(`/projects/${payload.id}`, validated);
    return projectSchema.parse(response.data.data);
  },

  delete: async (id: string): Promise<{ id: string }> => {
    const response = await api.delete<ApiSuccess<{ id: string }>>(`/projects/${id}`);
    return response.data.data;
  },
};
