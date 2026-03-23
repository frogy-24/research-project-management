import { useQuery } from '@tanstack/react-query';
import { callRoundStatsApi, type CallRoundStats } from '@/api/call-round-stats';

export function useCallRoundStats(callRoundId: string | null) {
    return useQuery<CallRoundStats>({
        queryKey: ['call-round-stats', callRoundId],
        queryFn: () => callRoundStatsApi.getStats(callRoundId!),
        enabled: !!callRoundId,
    });
}
