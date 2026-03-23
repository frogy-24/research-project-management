import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { councilMembersApi } from '@/api/council-members';

export function useCouncilMembers(callRoundId: string, page = 1, limit = 10) {
    return useQuery({
        queryKey: ['council-members', callRoundId, page, limit],
        queryFn: () => councilMembersApi.getByCallRound(callRoundId, page, limit),
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

export function useCreateExternalCouncilMember() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: {
            callRoundId: string;
            name: string;
            email: string;
            phone?: string;
            organization?: string;
        }) => councilMembersApi.createExternal(data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['council-members', variables.callRoundId] });
        },
    });
}
