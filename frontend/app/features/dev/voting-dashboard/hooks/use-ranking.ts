import { useQuery } from '@tanstack/react-query';

import { fetchRanking } from '../api/get-ranking';

export function useRankingQuery(enabled: boolean = false) {
  return useQuery({
    queryKey: ['ranking'],
    queryFn: fetchRanking,
    enabled, // Only run when explicitly enabled
  });
}
