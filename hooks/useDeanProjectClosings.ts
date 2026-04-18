import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deanProjectClosingsApi, type DeanProjectClosingFilters } from '@/api/dean-project-closings';
import type { DeanReviewProjectClosingInput } from '@/types/project-closing.schema';

const deanProjectClosingsKey = ['dean-project-closings'] as const;

export const useDeanProjectClosings = (filters?: DeanProjectClosingFilters) => {
    return useQuery({
        queryKey: [...deanProjectClosingsKey, filters ?? {}],
        queryFn: () => deanProjectClosingsApi.getAll(filters),
    });
};

export const useDeanReviewProjectClosing = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: DeanReviewProjectClosingInput) => deanProjectClosingsApi.review(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: deanProjectClosingsKey });
        },
    });
};
