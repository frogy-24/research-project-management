import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { councilMembersApi } from '@/api/council-members';

export function useCouncilMembers(callRoundId: string) {
    return useQuery({
        queryKey: ['council-members', callRoundId],
        queryFn: () => councilMembersApi.getByCallRound(callRoundId),
        enabled: !!callRoundId,
    });
}

export function useAssignCouncilMember() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { callRoundId: string; councilMemberId: string }) =>
            councilMembersApi.assign(data.callRoundId, data.councilMemberId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['council-members', variables.callRoundId] });
        },
    });
}

export function useRemoveCouncilMember() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { callRoundId: string; councilMemberId: string }) =>
            councilMembersApi.remove(data.callRoundId, data.councilMemberId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['council-members', variables.callRoundId] });
        },
    });
}
