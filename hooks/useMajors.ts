import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useMajors() {
  return useQuery({
    queryKey: ['majors'],
    queryFn: async () => {
      const response = await fetch('/api/majors');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch majors');
      return data.data;
    },
  });
}

export function useMajor(id: string) {
  return useQuery({
    queryKey: ['majors', id],
    queryFn: async () => {
      const response = await fetch(`/api/majors/${id}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch major');
      return data;
    },
  });
}

export function useCreateMajor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/majors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to create major');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['majors'] });
    },
  });
}

export function useUpdateMajor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & any) => {
      const response = await fetch(`/api/majors/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update major');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['majors'] });
    },
  });
}

export function useDeleteMajor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/majors/${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to delete major');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['majors'] });
    },
  });
}