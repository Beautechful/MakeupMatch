import { api } from '~/utils/api-client';

export interface UserFlowExitRequest {
  filters: {
    coverage: string[];
    category: string[];
    others: string[];
  };
  final_recommendations: Array<{
    image: string;
    brand: string;
    description: string;
    type: string;
    price: string;
    availability: 'available' | 'online' | 'unavailable' | 'unknown';
  }>;
}

export interface UserFlowExitResponse {
  message: string;
}

export async function userFlowExit(
  userId: string,
  data: UserFlowExitRequest,
  token?: string,
): Promise<UserFlowExitResponse> {
  return api.post<UserFlowExitResponse>(`/user_flow/exit/${userId}`, data, {
    token,
  });
}
