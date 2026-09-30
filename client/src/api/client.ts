/**
 * Minimal fetch wrapper.
 * - Two independent sessions: the admin (refresh cookie on /api/auth) and the traveller (refresh cookie on /api/account/auth).
 * - Access tokens live in memory only; refresh tokens are httpOnly cookies the browser sends to their auth path.
 * - On a 401 from an authenticated call, refreshes once (single-flight per session) and retries.
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

export type SessionName = 'admin' | 'user';

interface Session {
  refreshPath: string;
  token: string | null;
  refreshing: Promise<string | null> | null;
  onLost: (() => void) | null;
  onRefreshed: ((token: string, user: unknown) => void) | null;
}

const sessions: Record<SessionName, Session> = {
  admin: { refreshPath: '/api/auth/refresh', token: null, refreshing: null, onLost: null, onRefreshed: null },
  user: { refreshPath: '/api/account/auth/refresh', token: null, refreshing: null, onLost: null, onRefreshed: null },
};

export function setAccessToken(token: string | null, session: SessionName = 'admin') {
  sessions[session].token = token;
}

export function setAuthHandlers(h: { lost: () => void; refreshed: (token: string, user: unknown) => void }, session: SessionName = 'admin') {
  sessions[session].onLost = h.lost;
  sessions[session].onRefreshed = h.refreshed;
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
export function refreshAccessToken(session: SessionName = 'admin'): Promise<string | null> {
  const s = sessions[session];
  if (!s.refreshing) {
    s.refreshing = fetch(`${API_BASE}${s.refreshPath}`, { method: 'POST', credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) return null;
        const body = await res.json();
        s.token = body.accessToken;
        s.onRefreshed?.(body.accessToken, body.user);
        return body.accessToken as string;
      })
      .catch(() => null)
      .finally(() => {
        s.refreshing = null;
      });
  }
  return s.refreshing;
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** true (or 'admin') for the admin session, 'user' for the traveller session. */
  auth?: boolean | SessionName;
  raw?: boolean;
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { body, auth = false, raw = false, headers, ...rest } = opts;
  const session = auth ? sessions[auth === true ? 'admin' : auth] : null;
  const sessionName: SessionName = auth === 'user' ? 'user' : 'admin';
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;

  const doFetch = () =>
    fetch(`${API_BASE}/api${path}`, {
      ...rest,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : {}),
        ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
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

  if (session && res.status === 401) {
    const token = await refreshAccessToken(sessionName);
    if (!token) {
      session.onLost?.();
      throw new ApiError(401, sessionName === 'user' ? 'Please sign in to continue.' : 'Your session has expired. Please sign in again.');
    }
    res = await doFetch();
  }

  if (!res.ok) throw await parseError(res);
  if (raw) return res as unknown as T;
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Admin upload with progress events (fetch has no upload progress). */
export function uploadWithProgress<T>(path: string, form: FormData, onProgress: (fraction: number) => void): Promise<T> {
  const admin = sessions.admin;
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
    let r = await send(admin.token);
    if (r.status === 401) {
      const token = await refreshAccessToken('admin');
      if (!token) {
        admin.onLost?.();
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
