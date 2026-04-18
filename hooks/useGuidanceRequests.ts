// hooks/useGuidanceRequests.ts
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { RegistrationProposalFile } from '@/types/project-registration.schema';

type InstructorStatus = 'ACCEPTED' | 'REJECTED';
type GuidanceStatusFilter = 'PENDING' | 'ACCEPTED' | 'REJECTED';
type GuidanceSearchField = 'title' | 'studentName' | 'studentEmail' | 'studentCode' | 'all';

export interface GuidanceRequest {
    id: string;
    title: string;
    objective?: string;
    expectedOutput?: string;
    proposalFiles?: RegistrationProposalFile[] | null;
    callRoundId?: string | null;
    createdAt: string;
    callRound?: {
        id: string;
        name: string;
    } | null;
    user: {
        name: string;
        email: string;
        code?: string | null;
        class?: {
            id: string;
            name: string;
            code: string;
        } | null;
        major?: {
            id: string;
            name: string;
            code: string;
        } | null;
        departmentRef?: {
            id: string;
            name: string;
            code: string;
        } | null;
    };
    teamMembers?: Array<{
        name: string;
        role: string;
        studentId?: string;
        invitationStatus?: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELED';
        invitedAt?: string | Date;
        respondedAt?: string | Date | null;
    }> | null;
    instructorStatus: string;
}

export interface GuidancePagination {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface GuidanceRequestsResponse {
    data: GuidanceRequest[];
    pagination: GuidancePagination;
}

export interface GuidanceRequestsFilters {
    page?: number;
    limit?: number;
    callRoundId?: string;
    instructorStatus?: GuidanceStatusFilter;
    search?: string;
    searchField?: GuidanceSearchField;
}

// Hook to fetch guidance requests for current instructor
export function useGuidanceRequests(filters: GuidanceRequestsFilters = {}) {
    return useQuery<GuidanceRequestsResponse>({
        queryKey: ['guidance-requests', filters],
        placeholderData: keepPreviousData,
        queryFn: async () => {
            const res = await api.get('/my-project-registrations/guidance', {
                params: {
                    page: filters.page ?? 1,
                    limit: filters.limit ?? 10,
                    callRoundId: filters.callRoundId || undefined,
                    instructorStatus: filters.instructorStatus || undefined,
                    search: filters.search?.trim() || undefined,
                    searchField: filters.searchField || undefined,
                },
            });
            return res.data;
        },
    });
}

// Hook to update instructor status on a guidance request
export function useUpdateInstructorStatus() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: async ({ id, status }: { id: string; status: InstructorStatus }) => {
            const res = await api.patch(`/my-project-registrations/${id}/instructor-status`, { status });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['guidance-requests'] });
        },
    });
}
