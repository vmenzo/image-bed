export function formatUserPublicId(publicId?: number | null) {
  return String(publicId ?? 0).padStart(6, '0');
}
