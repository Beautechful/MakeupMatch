import { useMutation } from '@tanstack/react-query';

import { useSnackbar } from '~/context/snackbar-context';

import {
  sendVotingAnswer,
  type VotingAnswerRequest,
  type VotingAnswerResponse,
} from '../api/voting-answer-api';

export function useVotingAnswer() {
  const { showError } = useSnackbar();

  return useMutation<VotingAnswerResponse, Error, VotingAnswerRequest>({
    mutationFn: (request) => sendVotingAnswer(request),
    onError: (error) => {
      showError(`Failed to send voting answer: ${error.message}`);
    },
  });
}
