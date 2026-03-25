import { useMutation, useQuery } from '@tanstack/react-query';
import { officeMeetingsApi } from '@/api/office-meetings';
import type { CreateOfficeMeetingInput } from '@/types/office-meeting.schema';

export function useCreateOfficeMeeting() {
    return useMutation({
        mutationFn: (payload: CreateOfficeMeetingInput) => officeMeetingsApi.create(payload),
    });
}

export function useOfficeMeetingMembers(projectId?: string) {
    return useQuery({
        queryKey: ['office-meeting-members', projectId],
        queryFn: () => officeMeetingsApi.getMembers(projectId as string),
        enabled: Boolean(projectId),
    });
}

export function useOfficeMeetingsList(limit: number = 200) {
    return useQuery({
        queryKey: ['office-meetings', limit],
        queryFn: () => officeMeetingsApi.getList(limit),
    });
}
