import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { councilProjectAssignmentsApi } from '@/api/council-project-assignments';
import type { AssignProjectsToCouncilInput } from '@/types/council-project-assignment.schema';

export const councilProjectAssignmentKeys = {
    all: ['council-project-assignments'] as const,
    byCallRound: (callRoundId: string) => [...councilProjectAssignmentKeys.all, callRoundId] as const,
};

export function useCouncilProjectAssignments(callRoundId: string) {
    return useQuery({
        queryKey: councilProjectAssignmentKeys.byCallRound(callRoundId),
        queryFn: () => councilProjectAssignmentsApi.getByCallRound(callRoundId),
        enabled: !!callRoundId,
    });
}

export function useAssignProjectsToCouncil() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: AssignProjectsToCouncilInput) => councilProjectAssignmentsApi.assignProjects(payload),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: councilProjectAssignmentKeys.byCallRound(variables.callRoundId),
            });
            queryClient.invalidateQueries({ queryKey: ['councils'] });
        },
    });
}
