import { useQuery } from '@tanstack/react-query';
import { statisticsApi, type StatisticsData } from '@/api/admin-statistics';

export const useAdminStatistics = () => {
  return useQuery<StatisticsData>({
    queryKey: ['admin-statistics'],
    queryFn: statisticsApi.getAll,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
};
