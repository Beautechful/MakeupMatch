export async function fetchRanking(): Promise<any> {
  const url = `${import.meta.env.VITE_BACKEND_CLOUD_VOTING_URL}/api/v1/ranking`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch ranking data');
  }
  return response.json();
}
