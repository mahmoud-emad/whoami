import { getServerUrl } from './index';

/**
 * Single entry point for every call to the backend.
 *
 * The admin signature is never held in the browser — logging in exchanges it for a bearer token
 * that lives in sessionStorage (gone when the tab closes) and is attached to every request from
 * here. A 401 means the token expired or was invalidated server-side, so it is dropped and the
 * caller is sent back to the login screen.
 */

const TOKEN_KEY = 'whoami.admin.token';
const EXPIRY_KEY = 'whoami.admin.token.expiry';
const LOGIN_ROUTE = '/admin-signature';
// The API is namespaced so that client-side routes (/projects, /blog…) never collide with API
// resources of the same name when one server serves both.
const API_PREFIX = '/api';

export const getToken = (): string => {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) return '';

  const expiresAt = Number(sessionStorage.getItem(EXPIRY_KEY) || 0);
  if (expiresAt && expiresAt < Date.now()) {
    clearToken();
    return '';
  }
  return token;
};

export const setToken = (token: string, expiresAt: number) => {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(EXPIRY_KEY, String(expiresAt));
};

export const clearToken = () => {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(EXPIRY_KEY);
};

export const isAuthenticated = (): boolean => Boolean(getToken());

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * fetch() against the API base, with the bearer token attached when present.
 * `path` is always root-relative, e.g. '/posts'.
 */
export const apiFetch = async (path: string, options: RequestInit = {}): Promise<Response> => {
  const token = getToken();
  const headers = new Headers(options.headers || {});

  if (token) headers.set('Authorization', `Bearer ${token}`);
  // FormData bodies must keep the boundary the browser generates, so never set Content-Type there.
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${getServerUrl()}${API_PREFIX}${path}`, { ...options, headers });

  if (response.status === 401 && token) {
    clearToken();
    if (window.location.pathname !== LOGIN_ROUTE) window.location.href = LOGIN_ROUTE;
  }

  return response;
};

/** apiFetch that parses JSON and turns a non-2xx into an ApiError carrying the server's message. */
export const apiJson = async <T = any>(path: string, options: RequestInit = {}): Promise<T> => {
  const response = await apiFetch(path, options);

  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new ApiError(
      (payload && (payload.error || payload.message)) || response.statusText || 'Request failed',
      response.status,
    );
  }

  return payload as T;
};

export const login = async (signature: string): Promise<void> => {
  const result = await apiJson<{ token: string; expiresAt: number }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ signature }),
  });
  setToken(result.token, result.expiresAt);
};

export const logout = async (): Promise<void> => {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } finally {
    clearToken();
  }
};

/** Ask the server whether the stored token is still good — used by the admin route guard. */
export const verifySession = async (): Promise<boolean> => {
  if (!getToken()) return false;
  try {
    const result = await apiJson<{ valid: boolean }>('/auth/session');
    if (!result.valid) clearToken();
    return result.valid;
  } catch {
    return false;
  }
};
