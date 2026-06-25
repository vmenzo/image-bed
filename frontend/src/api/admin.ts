import { http } from './http';
import type { StorageProvider } from './types';

export type AdminUser = {
  id: string;
  publicId: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  disabled: boolean;
  quotaBytes: number;
  usedBytes: number;
  imageCount: number;
  albumCount: number;
  apiKeyCount: number;
  lastLoginAt?: string | null;
  createdAt: string;
};

export type AuditLog = {
  id: string;
  action: string;
  target?: string | null;
  targetId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  actor?: {
    id: string;
    email: string;
    name: string;
  } | null;
};

export type MaintenanceSummary = {
  byProvider: Array<{ provider: StorageProvider; count: number }>;
  missingDerived: number;
  failed: number;
  processing: number;
};

export function listUsersApi(params: {
  page?: number;
  pageSize?: number;
  q?: string;
  role?: 'USER' | 'ADMIN';
  disabled?: boolean;
}) {
  return http.get<
    unknown,
    { items: AdminUser[]; total: number; page: number; pageSize: number }
  >('/users', { params });
}

export function updateUserApi(
  id: string,
  payload: Partial<Pick<AdminUser, 'email' | 'name' | 'role' | 'disabled'>> & {
    quotaMb?: number;
  },
) {
  return http.patch<unknown, AdminUser>(`/users/${id}`, payload);
}

export function resetUserPasswordApi(id: string, password: string) {
  return http.post<unknown, { ok: boolean }>(`/users/${id}/reset-password`, {
    password,
  });
}

export function recalculateUserUsageApi(id: string) {
  return http.post<unknown, AdminUser>(`/users/${id}/recalculate-usage`, {});
}

export function listAuditLogsApi(params: {
  page?: number;
  pageSize?: number;
  action?: string;
  actorId?: string;
  target?: string;
}) {
  return http.get<
    unknown,
    { items: AuditLog[]; total: number; page: number; pageSize: number }
  >('/audit', { params });
}

export function maintenanceSummaryApi() {
  return http.get<unknown, MaintenanceSummary>('/maintenance/summary');
}

export function reprocessImagesApi(payload: {
  imageIds?: string[];
  limit?: number;
  missingOnly?: boolean;
}) {
  return http.post<unknown, { affected: number }>(
    '/maintenance/reprocess',
    payload,
  );
}

export function migrateImagesApi(payload: {
  targetProvider: StorageProvider;
  imageIds?: string[];
  limit?: number;
  reprocess?: boolean;
}) {
  return http.post<unknown, { affected: number; failed: number }>(
    '/maintenance/migrate',
    payload,
  );
}
