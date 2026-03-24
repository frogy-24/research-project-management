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
        majorId?: string | null;
        major?: {
            id: string;
            code: string;
            name: string;
        } | null;
    };
}

export interface PaginationMetadata {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface CouncilMembersResponse {
    data: CouncilMember[];
    pagination: PaginationMetadata;
}

export const councilMembersApi = {
    getByCallRound: async (callRoundId: string, page = 1, limit = 10): Promise<CouncilMembersResponse> => {
        const response = await api.get(`/dean/council-members?callRoundId=${callRoundId}&page=${page}&limit=${limit}`);
        return response.data;
    },

    assign: async (callRoundId: string, councilMemberId: string): Promise<CouncilMember> => {
        const response = await api.post('/dean/council-members', {
            callRoundId,
            councilMemberId,
        });
        return response.data;
    },

    remove: async (callRoundId: string, councilMemberId: string): Promise<void> => {
        await api.delete(`/dean/council-members?callRoundId=${callRoundId}&councilMemberId=${councilMemberId}`);
    },

    createExternal: async (data: {
        callRoundId: string;
        name: string;
        email: string;
        phone?: string;
        organization?: string;
    }): Promise<CouncilMember> => {
        const response = await api.post('/dean/council-members/create-external', data);
        return response.data;
    },
};
