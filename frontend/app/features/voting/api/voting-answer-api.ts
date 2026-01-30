export interface VotingAnswerRequest {
  variant_a_id: string;
  variant_b_id: string;
  winner_variant_id: string;
  user_id: string;
}
export interface VotingAnswerResponse {
  message: string;
  vote_id: string;
  user_id: string;
}

export async function sendVotingAnswer(
  request: VotingAnswerRequest,
): Promise<VotingAnswerResponse> {
  const url = `${import.meta.env.VITE_BACKEND_CLOUD_VOTING_URL}/api/v1/votes`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to send voting answer: ${response.status} ${errorText}`,
    );
  }

  return response.json();
}
