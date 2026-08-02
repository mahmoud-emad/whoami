import crypto from 'node:crypto';
import type { ApiRequest } from '../types';

/**
 * How long a signed-in session lasts. A day, so a normal stretch of editing never asks for the
 * signature twice.
 *
 * Two things end a session sooner regardless of this number, and both are deliberate: the map
 * below is in memory, so a restart or a deploy drops every session, and the browser keeps the
 * token in sessionStorage, so closing the tab forgets it.
 */
export const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/** token -> expiry timestamp. Module-private: nothing outside may hold a reference to the map. */
const sessions = new Map<string, number>();

export const issueToken = (): { token: string; expiresAt: number } => {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  sessions.set(token, expiresAt);
  return { token, expiresAt };
};

export const isValidToken = (token: string): boolean => {
  if (!token) return false;
  const expiresAt = sessions.get(token);
  if (!expiresAt) return false;
  if (expiresAt < Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
};

/** Drops a single session — the caller's own, on logout. */
export const revokeToken = (token: string): void => {
  sessions.delete(token);
};

/** Invalidates every session at once, which is what a signature change must do. */
export const clearAllSessions = (): void => {
  sessions.clear();
};

// Sweep expired tokens so the map cannot grow without bound on a long-lived process.
setInterval(
  () => {
    const now = Date.now();
    for (const [token, expiresAt] of sessions) {
      if (expiresAt < now) sessions.delete(token);
    }
  },
  60 * 60 * 1000,
  // `unref` so this timer never keeps the process alive on its own.
).unref();

export const bearerToken = (req: ApiRequest): string => {
  const header = req.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
};
