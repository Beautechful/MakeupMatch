import type { Result } from '~/features/results/types';
import { api } from '~/utils/api-client';

const LOCAL_STORAGE_KEY_PREFIX = 'results_';

/**
 * Clear all results data from localStorage
 * Removes all items with 'results_' prefix
 */
export function clearAllResultsFromStorage(): void {
  if (typeof window === 'undefined') return;

  const keysToRemove: string[] = [];

  // Collect all keys with results_ prefix
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(LOCAL_STORAGE_KEY_PREFIX)) {
      keysToRemove.push(key);
    }
  }

  // Remove all matching keys
  keysToRemove.forEach((key) => {
    localStorage.removeItem(key);
  });
}

export async function postResults(
  payload: any,
  token?: string,
): Promise<Result> {
  return api.post<Result>('/get_results', payload, { token });
}

export async function getResultsByUserId(userId?: string): Promise<Result> {
  const storageKey = LOCAL_STORAGE_KEY_PREFIX + userId;
  const cached = localStorage.getItem(storageKey);

  if (cached) {
    return JSON.parse(cached);
  }

  const url = `${import.meta.env.VITE_BACKEND_CLOUD_URL}/get_results_by_user_id/${userId}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to get results');
  }
  const data = await response.json();

  try {
    localStorage.setItem(storageKey, JSON.stringify(data));
  } catch {
    console.error('Failed cache results on localStorage');
  }

  return data;
}
