import type { FeedbackPayload } from '~/features/feedback/types';

export async function postFeedback(payload: FeedbackPayload): Promise<any> {
  const url = `${import.meta.env.VITE_BACKEND_CLOUD_URL}/feedback`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error('Failed to send feedback');
  }
  return response.json();
}
