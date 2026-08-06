import type { RequestHandler } from 'express';
import { bearerToken, isValidToken } from './sessions';

/**
 * Is this request from the signed-in owner?
 *
 * For public GETs that show the owner more than a visitor: a hidden entry has to reach the page it
 * is managed from, and must not reach anyone else. Filtering in the browser is not enough — that
 * still sends the whole record to whoever asks, so "hidden" would only mean "not rendered".
 */
export const isOwner = (req: { headers: Record<string, unknown> }): boolean =>
  isValidToken(bearerToken(req as never));

// Gate for every endpoint that mutates content or configuration.
export const requireAuth: RequestHandler = (req, res, next) => {
  if (!isValidToken(bearerToken(req))) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
};
