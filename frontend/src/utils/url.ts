const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

function isAbsoluteUrl(value: string) {
  return /^[a-z][a-z\d+\-.]*:/i.test(value);
}

export function isApiRelativeUrl(value?: string | null) {
  return Boolean(value?.startsWith('/api/'));
}

export function toAbsoluteApiUrl(value: string) {
  if (!value || isAbsoluteUrl(value)) {
    return value;
  }

  return new URL(
    value,
    new URL(API_BASE_URL, window.location.origin),
  ).toString();
}

export function toAbsoluteUrl(value?: string | null) {
  if (!value) return '';

  if (isApiRelativeUrl(value)) {
    return toAbsoluteApiUrl(value);
  }

  try {
    return new URL(value, window.location.origin).toString();
  } catch {
    return value;
  }
}
