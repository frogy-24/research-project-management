import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { myTeamInvitationsApi } from '@/api/my-team-invitations';
import type { RespondTeamInvitationInput } from '@/types/team-invitation.schema';

const queryKey = ['my-team-invitations'] as const;

export const useMyTeamInvitations = (options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey,
        queryFn: myTeamInvitationsApi.list,
        enabled: options?.enabled,
    });
};

export const useRespondMyTeamInvitation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ registrationId, payload }: { registrationId: string; payload: RespondTeamInvitationInput }) =>
            myTeamInvitationsApi.respond(registrationId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            queryClient.invalidateQueries({ queryKey: ['my-project-registrations'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
};
