import { http } from './http';
import type { ApiKey } from './types';

export function listApiKeysApi() {
  return http.get<unknown, ApiKey[]>('/api-keys');
}

export function createApiKeyApi(payload: { name: string }) {
  return http.post<unknown, ApiKey>('/api-keys', payload);
}

export function deleteApiKeyApi(id: string) {
  return http.delete<unknown, { ok: boolean }>(`/api-keys/${id}`);
}
