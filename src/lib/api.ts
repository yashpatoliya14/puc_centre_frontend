const STORAGE_KEY = 'pucflow_token';

let inMemoryAuthToken: string | null =
  typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
let onUnauthorizedCallback: (() => void) | null = null;

export function setAuthToken(token: string | null): void {
  inMemoryAuthToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem(STORAGE_KEY, token);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}

export function getAuthToken(): string | null {
  if (!inMemoryAuthToken && typeof window !== 'undefined') {
    inMemoryAuthToken = localStorage.getItem(STORAGE_KEY);
  }
  return inMemoryAuthToken;
}

export function setUnauthorizedHandler(cb: () => void): void {
  onUnauthorizedCallback = cb;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: unknown;
    isFormData?: boolean;
  } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (inMemoryAuthToken) {
    headers['Authorization'] = `Bearer ${inMemoryAuthToken}`;
  }
  if (!options.isFormData && options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(endpoint, {
    method: options.method || 'GET',
    headers,
    body:
      options.body === undefined
        ? undefined
        : options.isFormData
        ? (options.body as FormData)
        : JSON.stringify(options.body),
  });

  if (res.status === 401 && inMemoryAuthToken) {
    inMemoryAuthToken = null;
    onUnauthorizedCallback?.();
  }

  const text = await res.text();
  let json: Record<string, unknown> | null = null;
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const msg =
      (json && typeof json.message === 'string' && json.message) ||
      (json && Array.isArray(json.message) && String(json.message[0])) ||
      (json && typeof json.error === 'string' && json.error) ||
      `Request failed (${res.status})`;
    throw new ApiError(msg, res.status);
  }

  return (json ?? text) as T;
}

export async function downloadAuthenticatedCsv(endpoint: string, filename: string): Promise<void> {
  const headers: Record<string, string> = {};
  if (inMemoryAuthToken) {
    headers['Authorization'] = `Bearer ${inMemoryAuthToken}`;
  }
  const res = await fetch(endpoint, { headers });
  if (!res.ok) {
    throw new ApiError('Failed to export CSV file', res.status);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
