export function clientIp(request: {
  ip?: string;
  ips?: string[];
  socket?: { remoteAddress?: string };
}) {
  return (
    request.ips?.[0] ?? request.ip ?? request.socket?.remoteAddress ?? 'unknown'
  );
}

export function normalizeOrigin(value?: string) {
  return value?.trim().replace(/\/$/, '') || '';
}
