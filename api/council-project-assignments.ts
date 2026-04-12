import { api } from '@/lib/axios';
import type {
    AssignProjectsToCouncilInput,
    CouncilProjectAssignmentsResponse,
    FinalizeCouncilAssignmentsInput,
    UnassignProjectsFromCouncilInput,
    UpdateCouncilDefenseLocationInput,
} from '@/types/council-project-assignment.schema';

export const councilProjectAssignmentsApi = {
    getByCallRound: async (callRoundId: string): Promise<CouncilProjectAssignmentsResponse> => {
        const response = await api.get(`/dean/council-project-assignments?callRoundId=${callRoundId}`);
        return response.data;
    },

    assignProjects: async (payload: AssignProjectsToCouncilInput): Promise<{ success: boolean }> => {
        const response = await api.post('/dean/council-project-assignments', payload);
        return response.data;
    },

    unassignProjects: async (payload: UnassignProjectsFromCouncilInput): Promise<{ success: boolean }> => {
        const response = await api.delete('/dean/council-project-assignments', { data: payload });
        return response.data;
    },

    finalize: async (payload: FinalizeCouncilAssignmentsInput): Promise<{ success: boolean }> => {
        const response = await api.patch('/dean/council-project-assignments', payload);
        return response.data;
    },

    updateDefenseLocation: async (payload: UpdateCouncilDefenseLocationInput): Promise<{ success: boolean }> => {
        const response = await api.patch('/dean/council-project-assignments', payload);
        return response.data;
    },
};
