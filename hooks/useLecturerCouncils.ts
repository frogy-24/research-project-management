import { useQuery } from '@tanstack/react-query';
import { lecturerCouncilsApi } from '@/api/lecturer-councils';

export const useLecturerCouncils = () => {
    return useQuery({
        queryKey: ['lecturer-councils'],
        queryFn: lecturerCouncilsApi.getAll,
    });
};
