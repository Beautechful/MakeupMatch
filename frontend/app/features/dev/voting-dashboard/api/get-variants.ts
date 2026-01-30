export async function fetchVariants(): Promise<any> {
  const url = `${import.meta.env.VITE_BACKEND_CLOUD_VOTING_URL}/api/v1/variants`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch variants');
  }
  return response.json();
}
