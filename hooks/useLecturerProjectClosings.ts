import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { lecturerProjectClosingsApi } from '@/api/lecturer-project-closings';
import type { SubmitProjectClosingInput } from '@/types/project-closing.schema';

const lecturerProjectClosingsKey = ['lecturer-project-closings'] as const;

export const useLecturerProjectClosings = () => {
    return useQuery({
        queryKey: lecturerProjectClosingsKey,
        queryFn: lecturerProjectClosingsApi.getAll,
    });
};

export const useSubmitLecturerProjectClosing = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: SubmitProjectClosingInput) => lecturerProjectClosingsApi.submit(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: lecturerProjectClosingsKey });
        },
    });
};
