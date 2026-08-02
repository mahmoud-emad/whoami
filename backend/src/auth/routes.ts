import express, { type Request, type Response } from 'express';
import { log } from '../lib/logger';
import { readConfig, writeConfig } from '../config/store';
import {
  MIN_SIGNATURE_LENGTH,
  createSignatureRecord,
  verifySignature,
} from './signature';
import {
  bearerToken,
  clearAllSessions,
  isValidToken,
  issueToken,
  revokeToken,
} from './sessions';
import { requireAuth } from './middleware';
import {
  clearLoginAttempts,
  loginLockoutRemaining,
  recordFailedLogin,
} from './throttle';

export const authRouter = express.Router();

authRouter.post('/auth/login', async (req: Request, res: Response) => {
  const ip = req.ip || 'unknown';
  try {
    const lockout = loginLockoutRemaining(ip);
    if (lockout > 0) {
      log(`Login blocked for ${ip} (${Math.ceil(lockout / 1000)}s remaining)`, 'warn');
      return res.status(429).json({
        error: `Too many failed attempts. Try again in ${Math.ceil(lockout / 60000)} minute(s).`,
      });
    }

    const { signature } = req.body || {};
    if (typeof signature !== 'string' || !signature) {
      return res.status(400).json({ error: 'Signature is required' });
    }

    const configData = await readConfig();
    if (!verifySignature(signature, configData.security.adminSignature)) {
      recordFailedLogin(ip);
      log(`Failed login attempt from ${ip}`, 'warn');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    clearLoginAttempts(ip);
    const { token, expiresAt } = issueToken();
    log(`Admin logged in from ${ip}`, 'info');
    return res.json({ token, expiresAt });
  } catch (error) {
    log(`Login failed: ${(error as Error).message}`, 'error');
    return res.status(500).json({ error: 'Login failed' });
  }
});

authRouter.post('/auth/logout', requireAuth, (req: Request, res: Response) => {
  revokeToken(bearerToken(req));
  res.json({ message: 'Logged out' });
});

authRouter.get('/auth/session', (req: Request, res: Response) => {
  res.json({ valid: isValidToken(bearerToken(req)) });
});

authRouter.post('/auth/signature', requireAuth, async (req: Request, res: Response) => {
  try {
    const { currentSignature, newSignature } = req.body || {};
    if (typeof newSignature !== 'string' || newSignature.length < MIN_SIGNATURE_LENGTH) {
      return res
        .status(400)
        .json({ error: `New signature must be at least ${MIN_SIGNATURE_LENGTH} characters` });
    }

    const configData = await readConfig();
    // Re-check the current signature so a stolen token alone cannot lock the owner out.
    if (!verifySignature(String(currentSignature || ''), configData.security.adminSignature)) {
      return res.status(401).json({ error: 'Current signature is incorrect' });
    }

    configData.security.adminSignature = createSignatureRecord(newSignature);
    await writeConfig(configData);

    // Every existing session is invalidated, including this one — the admin logs in again.
    clearAllSessions();
    log('Admin signature changed; all sessions invalidated', 'info');
    return res.json({ message: 'Signature updated. Please log in again.' });
  } catch (error) {
    log(`Failed to change signature: ${(error as Error).message}`, 'error');
    return res.status(500).json({ error: 'Failed to change signature' });
  }
});
