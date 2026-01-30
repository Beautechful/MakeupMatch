import { useAuth } from '~/firebase/auth-provider';
import { api, apiRequest, type ApiRequestOptions } from '~/utils/api-client';

/**
 * Custom hook that provides authenticated API functions
 * Automatically includes the current user's token in all requests
 */
export function useApi() {
  const { token } = useAuth();

  return {
    /**
     * Make a GET request with authentication
     */
    get: <T = any>(
      endpoint: string,
      options?: Omit<ApiRequestOptions, 'token'>,
    ) => api.get<T>(endpoint, { ...options, token: token || undefined }),

    /**
     * Make a POST request with authentication
     */
    post: <T = any>(
      endpoint: string,
      data?: any,
      options?: Omit<ApiRequestOptions, 'token'>,
    ) => api.post<T>(endpoint, data, { ...options, token: token || undefined }),

    /**
     * Make a PUT request with authentication
     */
    put: <T = any>(
      endpoint: string,
      data?: any,
      options?: Omit<ApiRequestOptions, 'token'>,
    ) => api.put<T>(endpoint, data, { ...options, token: token || undefined }),

    /**
     * Make a DELETE request with authentication
     */
    delete: <T = any>(
      endpoint: string,
      options?: Omit<ApiRequestOptions, 'token'>,
    ) => api.delete<T>(endpoint, { ...options, token: token || undefined }),

    /**
     * Make a custom request with authentication
     */
    request: <T = any>(
      endpoint: string,
      options?: Omit<ApiRequestOptions, 'token'>,
    ) => apiRequest<T>(endpoint, { ...options, token: token || undefined }),

    /**
     * Check if user is authenticated (has token)
     */
    isAuthenticated: !!token,
  };
}
