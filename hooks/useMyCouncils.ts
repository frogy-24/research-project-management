import { useQuery } from '@tanstack/react-query';
import { myCouncilsApi } from '@/api/my-councils';

export const useMyCouncils = () => {
    return useQuery({
        queryKey: ['my-councils'],
        queryFn: myCouncilsApi.getAll,
    });
};
