import { useMutation } from '@tanstack/react-query';

import { useSnackbar } from '~/context/snackbar-context';

import { getPollData, type VotingPollResponse } from '../api/voting-poll-api';

export function usePoll() {
  const { showError } = useSnackbar();

  return useMutation<VotingPollResponse, Error, void>({
    mutationFn: () => getPollData(),
    onError: (error) => {
      showError(`Failed to fetch comparison pair: ${error.message}`);
    },
  });
}
