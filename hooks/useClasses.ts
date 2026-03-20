import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useClasses() {
  return useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const response = await fetch('/api/classes');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch classes');
      return data.data;
    },
  });
}

export function useClass(id: string) {
  return useQuery({
    queryKey: ['classes', id],
    queryFn: async () => {
      const response = await fetch(`/api/classes/${id}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch class');
      return data;
    },
  });
}

export function useCreateClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to create class');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
  });
}

export function useUpdateClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & any) => {
      const response = await fetch(`/api/classes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update class');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
  });
}

export function useDeleteClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/classes/${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to delete class');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
  });
}