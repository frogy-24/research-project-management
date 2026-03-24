// hooks/useDeanApprovals.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

type DeanApprovalStatus = 'APPROVED' | 'REJECTED';

interface DeanApproval {
    id: string;
    title: string;
    objective?: string | null;
    expectedOutput?: string | null;
    createdAt: string;
    user: {
        name: string;
        email: string;
        code?: string | null;
        department: string | null;
        class?: {
            name: string;
            code: string;
        } | null;
        major?: {
            name: string;
            code: string;
        } | null;
    };
    instructor: {
        name: string;
        email?: string;
        code?: string | null;
        department?: string | null;
        departmentRef?: {
            name: string;
            code: string;
        } | null;
    } | null;
    callRound?: {
        name: string;
    } | null;
    instructorStatus: string;
    facultyStatus: string;
}

interface PaginationInfo {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

interface DeanApprovalsResponse {
    data: DeanApproval[];
    pagination: PaginationInfo;
}

export interface DeanApprovalsFilters {
    search?: string;
    facultyStatus?: string;
    callRoundId?: string;
}

// Hook to fetch dean approvals with pagination and filters
export function useDeanApprovals(
    page: number = 1, 
    limit: number = 10,
    filters: DeanApprovalsFilters = {}
) {
    return useQuery<DeanApprovalsResponse>({
        queryKey: ['dean-approvals', page, limit, filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            params.append('page', page.toString());
            params.append('limit', limit.toString());
            
            if (filters.search) {
                params.append('search', filters.search);
            }
            if (filters.facultyStatus) {
                params.append('facultyStatus', filters.facultyStatus);
            }
            if (filters.callRoundId) {
                params.append('callRoundId', filters.callRoundId);
            }
            
            const res = await api.get(`/dean/approvals?${params.toString()}`);
            return res.data;
        },
    });
}

// Hook to update dean approval status
export function useUpdateDeanApprovalStatus() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: async ({ id, status }: { id: string; status: DeanApprovalStatus }) => {
            const res = await api.patch(`/dean/approvals/${id}`, { status });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dean-approvals'] });
        },
    });
}
