export async function fetchDatasetStats(): Promise<any> {
  const url = `${import.meta.env.VITE_BACKEND_CLOUD_VOTING_URL}/api/v1/dataset_analysis?sample_count=10000`;
  console.log('Curling Dataset Statistics from Developement Instance');
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch dataset statistics');
  }
  return response.json();
}
