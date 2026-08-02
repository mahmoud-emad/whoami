export const MAX_LOGIN_ATTEMPTS = 5;
export const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;

interface LoginAttempt {
  count: number;
  blockedUntil: number;
}

// Per-IP throttle so the signature cannot be brute forced.
const loginAttempts = new Map<string, LoginAttempt>();

export const loginLockoutRemaining = (ip: string): number => {
  const entry = loginAttempts.get(ip);
  if (!entry || entry.count < MAX_LOGIN_ATTEMPTS) return 0;
  const remaining = entry.blockedUntil - Date.now();
  if (remaining <= 0) {
    loginAttempts.delete(ip);
    return 0;
  }
  return remaining;
};

export const recordFailedLogin = (ip: string): void => {
  const entry = loginAttempts.get(ip) || { count: 0, blockedUntil: 0 };
  entry.count += 1;
  entry.blockedUntil = Date.now() + LOGIN_LOCKOUT_MS;
  loginAttempts.set(ip, entry);
};

/** Cleared on a successful login so a legitimate admin is never locked out by past typos. */
export const clearLoginAttempts = (ip: string): void => {
  loginAttempts.delete(ip);
};
