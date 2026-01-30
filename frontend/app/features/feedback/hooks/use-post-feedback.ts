import { useMutation } from '@tanstack/react-query';

import { postFeedback } from '~/features/feedback/feedback-api';
import type { FeedbackPayload } from '~/features/feedback/types';

export function usePostFeedback() {
  return useMutation<void, Error, FeedbackPayload>({
    mutationFn: postFeedback,
  });
}
