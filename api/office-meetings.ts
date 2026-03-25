import { api } from '@/lib/axios';
import {
    createOfficeMeetingSchema,
    officeMeetingMembersResponseSchema,
    officeMeetingResponseSchema,
    type CreateOfficeMeetingInput,
    type OfficeMeetingMember,
    type OfficeMeetingResponse,
} from '@/types/office-meeting.schema';

export const officeMeetingsApi = {
    create: async (payload: CreateOfficeMeetingInput): Promise<OfficeMeetingResponse> => {
        const validated = createOfficeMeetingSchema.parse(payload);
        const response = await api.post('/lecturer/office-meetings', validated);
        return officeMeetingResponseSchema.parse(response.data);
    },
    getMembers: async (projectId: string): Promise<OfficeMeetingMember[]> => {
        const response = await api.get('/lecturer/office-meetings/members', {
            params: { projectId },
        });
        const parsed = officeMeetingMembersResponseSchema.parse(response.data);
        return parsed.data;
    },
    getList: async (limit: number = 200) => {
        const response = await api.get('/office-meetings', {
            params: { limit }
        });
        return response.data;
    }
};
