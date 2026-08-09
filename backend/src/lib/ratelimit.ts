/**
 * Per-key fixed-window rate limiting, shared by the public write endpoints.
 *
 * A fixed window rather than a sliding one: the thing being bounded is writes to db.json, and at
 * this scale the boundary case — a burst straddling two windows — is not worth a ring buffer
 * nobody will read again.
 *
 * Every limiter here is keyed by client IP, so it is only as good as `req.ip`. Behind a reverse
 * proxy that means TRUST_PROXY must be set, or every visitor arrives as the proxy's address and
 * shares one bucket. See the comment on `trust proxy` in server/app.ts.
 */
export interface RateLimiter {
  /** Records a hit against `key` and reports whether that key has now gone over the limit. */
  hit(key: string): boolean;
}

export const fixedWindowLimiter = ({ windowMs, max }: { windowMs: number; max: number }): RateLimiter => {
  const windows = new Map<string, { count: number; resetAt: number }>();

  // Same reasoning as the session sweep: this map is keyed by client address on a public
  // endpoint, so a long-lived process would otherwise hold one entry for every IP it has ever
  // seen. `unref` so the timer never keeps the process alive on its own.
  setInterval(() => {
    const now = Date.now();
    for (const [key, window] of windows) {
      if (now > window.resetAt) windows.delete(key);
    }
  }, windowMs).unref();

  return {
    hit: (key: string): boolean => {
      const now = Date.now();
      const window = windows.get(key);
      if (!window || now > window.resetAt) {
        windows.set(key, { count: 1, resetAt: now + windowMs });
        return false;
      }
      window.count += 1;
      return window.count > max;
    },
  };
};
