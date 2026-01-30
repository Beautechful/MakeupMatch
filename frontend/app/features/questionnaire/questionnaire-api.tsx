import { api } from '~/utils/api-client';

export async function fetchQuestions(token?: string): Promise<any> {
  return api.get('/questions', { token });
}
