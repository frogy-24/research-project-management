// hooks/useMajors.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { majorApi, type CreateMajorPayload, type UpdateMajorPayload, type PaginatedMajors } from '@/api/majors';

interface UseMajorsParams {
    departmentId?: string;
    search?: string;
    page?: number;
    limit?: number;
}

export function useMajors(params: UseMajorsParams = {}, options?: { enabled?: boolean }) {
    return useQuery<PaginatedMajors>({
        queryKey: ['majors', params],
        queryFn: () => majorApi.getAll(params),
        enabled: options?.enabled,
    });
}

export function useMajor(id: string) {
    return useQuery({
        queryKey: ['majors', id],
        queryFn: () => majorApi.getById(id),
        enabled: !!id,
    });
}

export function useCreateMajor() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateMajorPayload) => majorApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['majors'] });
        },
    });
}

export function useUpdateMajor() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: { id: string } & UpdateMajorPayload) => majorApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['majors'] });
        },
    });
}

export function useDeleteMajor() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => majorApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['majors'] });
        },
    });
}
