import type { RequestHandler } from 'express';
import { bearerToken, isValidToken } from './sessions';

// Gate for every endpoint that mutates content or configuration.
export const requireAuth: RequestHandler = (req, res, next) => {
  if (!isValidToken(bearerToken(req))) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
};
