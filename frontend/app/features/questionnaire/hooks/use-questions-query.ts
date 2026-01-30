import { useQuery } from '@tanstack/react-query';

import { useApi } from '~/hooks/use-api';

export function useQuestionsQuery() {
  const api = useApi();

  return useQuery({
    queryKey: ['questions'],
    queryFn: () => api.get('/questions'),
    enabled: api.isAuthenticated, // Only fetch when authenticated
  });
}
