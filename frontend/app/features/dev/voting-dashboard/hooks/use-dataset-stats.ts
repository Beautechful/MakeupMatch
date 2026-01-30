import { useQuery } from '@tanstack/react-query';

import { fetchDatasetStats } from '../api/get-dataset-stats';

export function useDatasetStatsQuery() {
  return useQuery({
    queryKey: ['datasetStats'],
    queryFn: fetchDatasetStats,
    staleTime: 12 * 60 * 60 * 1000, // 12 hours
    refetchOnWindowFocus: false,
  });
}