/**
 * Minimal fetch wrapper.
 * - Access token lives in memory only; the refresh token is an httpOnly cookie the browser sends to /api/auth.
 * - On a 401 from an authenticated call, refreshes once (single-flight) and retries.
 */

export const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

/** Turns an API-relative path such as /uploads/x.jpg into a loadable URL. */
export function assetUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${API_BASE}${path}`;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: string[],
  ) {
    super(message);
  }
}

let accessToken: string | null = null;
let refreshing: Promise<string | null> | null = null;
let onAuthLost: (() => void) | null = null;
let onTokenRefreshed: ((token: string, user: unknown) => void) | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function setAuthHandlers(h: { lost: () => void; refreshed: (token: string, user: unknown) => void }) {
  onAuthLost = h.lost;
  onTokenRefreshed = h.refreshed;
}

async function parseError(res: Response): Promise<ApiError> {
  let message = res.status === 429 ? 'Too many requests. Please wait a few minutes and try again.' : 'Something went wrong. Please try again.';
  let details: string[] | undefined;
  try {
    const body = await res.json();
    if (body?.message) message = Array.isArray(body.message) ? body.message[0] : body.message;
    details = body?.details;
  } catch {
    /* non-JSON error */
  }
  return new ApiError(res.status, message, details);
}

/** Exchanges the refresh cookie for a new access token. Resolves null when signed out. */
export function refreshAccessToken(): Promise<string | null> {
  if (!refreshing) {
    refreshing = fetch(`${API_BASE}/api/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) return null;
        const body = await res.json();
        accessToken = body.accessToken;
        onTokenRefreshed?.(body.accessToken, body.user);
        return body.accessToken as string;
      })
      .catch(() => null)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  auth?: boolean;
  raw?: boolean;
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { body, auth = false, raw = false, headers, ...rest } = opts;
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;

  const doFetch = () =>
    fetch(`${API_BASE}/api${path}`, {
      ...rest,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : {}),
        ...(auth && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });

  let res: Response;
  try {
    res = await doFetch();
  } catch {
    throw new ApiError(0, "We couldn't reach the server. Check your connection and try again.");
  }

  if (auth && res.status === 401) {
    const token = await refreshAccessToken();
    if (!token) {
      onAuthLost?.();
      throw new ApiError(401, 'Your session has expired. Please sign in again.');
    }
    res = await doFetch();
  }

  if (!res.ok) throw await parseError(res);
  if (raw) return res as unknown as T;
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Upload with progress events (fetch has no upload progress). */
export function uploadWithProgress<T>(path: string, form: FormData, onProgress: (fraction: number) => void): Promise<T> {
  const send = (token: string | null) =>
    new Promise<{ status: number; body: string }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/api${path}`);
      xhr.withCredentials = true;
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
      xhr.onload = () => resolve({ status: xhr.status, body: xhr.responseText });
      xhr.onerror = () => reject(new ApiError(0, 'Upload failed. Check your connection and try again.'));
      xhr.send(form);
    });

  return (async () => {
    let r = await send(accessToken);
    if (r.status === 401) {
      const token = await refreshAccessToken();
      if (!token) {
        onAuthLost?.();
        throw new ApiError(401, 'Your session has expired. Please sign in again.');
      }
      r = await send(token);
    }
    let parsed: { message?: string } & Record<string, unknown> = {};
    try {
      parsed = JSON.parse(r.body);
    } catch {
      /* ignore */
    }
    if (r.status < 200 || r.status >= 300) {
      throw new ApiError(r.status, parsed.message || (r.status === 413 ? 'File is too large.' : 'Upload failed.'));
    }
    return parsed as T;
  })();
}
