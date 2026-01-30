import { useMutation } from '@tanstack/react-query';

import type { Bundle } from '~/features/bundle/types';
import { useApi } from '~/hooks/use-api';

export interface GetBundlePayload {
  user_id: string;
  product_id: string;
}

export function useGetBundle() {
  const api = useApi();

  return useMutation({
    mutationFn: (payload: GetBundlePayload) =>
      api.post<Bundle>('/bundle_products', payload),
  });
}
