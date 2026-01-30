import { useMutation } from '@tanstack/react-query';

import { useAuth } from '~/firebase/auth-provider';

import { getResultsByUserId, postResults } from '../result-api';

export function usePostResults() {
  const { token } = useAuth();

  return useMutation({
    mutationFn: (payload: any) => postResults(payload, token),
  });
}

export function useGetResultsByUserId() {
  return useMutation({
    mutationFn: getResultsByUserId,
  });
}
