import { useQuery, useMutation } from '@tanstack/react-query';

import { useSnackbar } from '~/context/snackbar-context';
import { useAuth } from '~/firebase/auth-provider';

import {
  fetchClientsDb,
  downloadClientsDbCsv,
  type ClientData,
} from '../api/clients-db-api';

export function useClientsDb() {
  const { token } = useAuth();

  return useQuery<ClientData[], Error>({
    queryKey: ['clients-db'],
    queryFn: () => fetchClientsDb(token || undefined),
    staleTime: 30000, // 30 seconds
    retry: 2,
    enabled: !!token,
  });
}

export function useDownloadClientsDbCsv() {
  const { showError } = useSnackbar();
  const { token } = useAuth();

  return useMutation<void, Error>({
    mutationFn: () => downloadClientsDbCsv(token || undefined),
    onSuccess: () => {
      console.log('CSV download started successfully');
    },
    onError: (error) => {
      showError(`Failed to download CSV: ${error.message}`);
    },
  });
}
