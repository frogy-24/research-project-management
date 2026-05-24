import { useQuery } from '@tanstack/react-query';
import { deanCouncilEvaluationsApi } from '@/api/dean-council-evaluations';

type UseDeanCouncilEvaluationsOptions = {
    enabled?: boolean;
};

export function useDeanCouncilEvaluations(callRoundId?: string, options?: UseDeanCouncilEvaluationsOptions) {
    return useQuery({
        queryKey: ['dean-council-evaluations', callRoundId ?? 'all'],
        queryFn: () => deanCouncilEvaluationsApi.getAll(callRoundId),
        enabled: options?.enabled ?? true,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });
}
