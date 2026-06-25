import { http } from './http';
import type { Album, Visibility } from './types';

export function listAlbumsApi() {
  return http.get<unknown, Album[]>('/albums');
}

export function createAlbumApi(payload: {
  name: string;
  description?: string;
  visibility?: Visibility;
}) {
  return http.post<unknown, Album>('/albums', payload);
}

export function updateAlbumApi(
  id: string,
  payload: Partial<{
    name: string;
    description: string;
    visibility: Visibility;
  }>,
) {
  return http.patch<unknown, Album>(`/albums/${id}`, payload);
}

export function deleteAlbumApi(id: string) {
  return http.delete<unknown, { ok: boolean }>(`/albums/${id}`);
}
