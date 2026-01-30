import { useQuery } from '@tanstack/react-query';

import { fetchConfig } from '../config-api';

export function useConfigQuery() {
  return useQuery({
    queryKey: ['config'],
    queryFn: fetchConfig,
  });
}
