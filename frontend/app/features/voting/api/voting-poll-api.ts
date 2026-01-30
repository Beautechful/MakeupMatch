export interface VotingPollResponse {
  variant_a_id: string;
  variant_a_url: string;
  variant_b_id: string;
  variant_b_url: string;
}

export async function getPollData(): Promise<VotingPollResponse> {
  const url = `${import.meta.env.VITE_BACKEND_CLOUD_VOTING_URL}/api/v1/variants/compare`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch comparison pair: ${response.status} ${errorText}`,
    );
  }

  return response.json();
}
