export function toAbsoluteUrl(value?: string | null) {
  if (!value) return '';

  try {
    return new URL(value, window.location.origin).toString();
  } catch {
    return value;
  }
}
