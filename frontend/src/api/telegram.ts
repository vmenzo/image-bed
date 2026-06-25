import { http } from './http';

export type TelegramStatus = {
  enabledAccounts: number;
  running: boolean;
  lastPollAt?: string | null;
  lastError?: string | null;
  accounts: Array<{
    ownerId: string;
    ownerPublicId: string;
    enabled: boolean;
    configured: boolean;
    allowedChatIds: string[];
    lastUpdateId?: number | null;
  }>;
};

export function getTelegramStatusApi() {
  return http.get<unknown, TelegramStatus>('/telegram/status');
}

export function pollTelegramApi() {
  return http.post<unknown, TelegramStatus>('/telegram/poll', {});
}

export function testTelegramApi() {
  return http.post<unknown, { ok: boolean; message?: string; bot?: unknown }>(
    '/telegram/test',
    {},
  );
}
