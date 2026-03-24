import { api } from '@/lib/axios';
import {
    respondTeamInvitationSchema,
    teamInvitationSchema,
    teamInvitationListSchema,
    type RespondTeamInvitationInput,
    type TeamInvitation,
} from '@/types/team-invitation.schema';

type ApiSuccess<T> = {
    success: true;
    data: T;
};

export const myTeamInvitationsApi = {
    list: async (): Promise<TeamInvitation[]> => {
        const response = await api.get<ApiSuccess<TeamInvitation[]>>('/my-team-invitations');
        return teamInvitationListSchema.parse(response.data.data);
    },

    respond: async (registrationId: string, payload: RespondTeamInvitationInput): Promise<TeamInvitation> => {
        const validated = respondTeamInvitationSchema.parse(payload);
        const response = await api.patch<ApiSuccess<TeamInvitation>>(`/my-team-invitations/${registrationId}`, validated);
        return teamInvitationSchema.parse(response.data.data);
    },
};
