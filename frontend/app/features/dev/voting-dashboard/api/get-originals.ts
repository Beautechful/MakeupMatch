export async function fetchOriginals(): Promise<any> {
  const url = `${import.meta.env.VITE_BACKEND_CLOUD_VOTING_URL}api/v1/originals`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch originals');
  }
  return response.json();
}
