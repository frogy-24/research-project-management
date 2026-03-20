import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import {
  CreateTemplatePayload,
  UpdateTemplatePayload,
  TemplateWithItems,
} from "@/types/progress-template.schema";

// Fetch all templates
export function useProgressTemplates(activeOnly: boolean = false) {
  return useQuery<TemplateWithItems[]>({
    queryKey: ["progress-templates", activeOnly],
    queryFn: async () => {
      const { data } = await api.get("/progress-templates", {
        params: { activeOnly },
      });
      return data;
    },
  });
}

// Fetch single template
export function useProgressTemplate(id: string | undefined) {
  return useQuery<TemplateWithItems>({
    queryKey: ["progress-template", id],
    queryFn: async () => {
      const { data } = await api.get(`/progress-templates/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

// Create template
export function useCreateProgressTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateTemplatePayload) => {
      const { data } = await api.post("/progress-templates", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress-templates"] });
    },
  });
}

// Update template
export function useUpdateProgressTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateTemplatePayload) => {
      const { data } = await api.put(
        `/progress-templates/${payload.id}`,
        payload
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["progress-templates"] });
      queryClient.invalidateQueries({
        queryKey: ["progress-template", data.id],
      });
    },
  });
}

// Delete template
export function useDeleteProgressTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/progress-templates/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress-templates"] });
    },
  });
}
