import { api } from '@/lib/axios';

export interface CouncilMember {
    id: string;
    callRoundId: string;
    councilMemberId: string;
    createdAt: string;
    councilMember: {
        id: string;
        name: string;
        email: string;
        code?: string;
    };
}

export interface CouncilMembersResponse {
    data: CouncilMember[];
}

export const councilMembersApi = {
    getByCallRound: async (callRoundId: string): Promise<CouncilMembersResponse> => {
        const response = await api.get(`/api/dean/council-members?callRoundId=${callRoundId}`);
        return response.data;
    },

    assign: async (callRoundId: string, councilMemberId: string): Promise<CouncilMember> => {
        const response = await api.post('/api/dean/council-members', {
            callRoundId,
            councilMemberId,
        });
        return response.data;
    },

    remove: async (callRoundId: string, councilMemberId: string): Promise<void> => {
        await api.delete(`/api/dean/council-members?callRoundId=${callRoundId}&councilMemberId=${councilMemberId}`);
    },
};
