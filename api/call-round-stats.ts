import { api } from '@/lib/axios';

export interface CallRoundStats {
    totalRegistrations: number;
    totalStudents: number;
    totalInstructors: number;
    totalCouncilMembers: number;
    statusBreakdown: {
        pending: number;
        approved: number;
        rejected: number;
        canceled: number;
    };
    instructorStatusBreakdown: {
        pending: number;
        accepted: number;
        rejected: number;
    };
    facultyStatusBreakdown: {
        pending: number;
        approved: number;
        rejected: number;
    };
}

export const callRoundStatsApi = {
    getStats: async (callRoundId: string): Promise<CallRoundStats> => {
        const { data } = await api.get(`/dean/call-rounds/${callRoundId}/stats`);
        return data;
    },
};
