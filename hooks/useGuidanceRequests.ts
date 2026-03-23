// hooks/useGuidanceRequests.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

type InstructorStatus = 'ACCEPTED' | 'REJECTED';

interface GuidanceRequest {
    id: string;
    title: string;
    objective?: string;
    expectedOutput?: string;
    user: {
        name: string;
        email: string;
    };
    instructorStatus: string;
}

// Hook to fetch guidance requests for current instructor
export function useGuidanceRequests() {
    return useQuery<GuidanceRequest[]>({
        queryKey: ['guidance-requests'],
        queryFn: async () => {
            const res = await api.get('/my-project-registrations/guidance');
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
