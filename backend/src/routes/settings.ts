import express from 'express';
import type { Request, Response, Router } from 'express';
import { readConfig, writeConfig, publicConfig } from '../config/store';
import { requireAuth } from '../auth/middleware';
import { log } from '../lib/logger';
import type { AntiBotConfig, SiteConfig } from '../types';

/** `catch` binds `unknown` under `strict`, so the original's `error.message` needs unwrapping. */
const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export const settingsRouter: Router = express.Router();

// Settings CRUD
settingsRouter.get('/settings', async (_req: Request, res: Response): Promise<void> => {
  try {
    const configData = await readConfig();
    res.json({ data: publicConfig(configData) });
  } catch (error) {
    log(`Failed to read config: ${errorMessage(error)}`, 'error');
    res.status(500).json({ error: errorMessage(error) });
  }
});

settingsRouter.post('/settings', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const configData = await readConfig();
    const body = (req.body ?? {}) as Partial<SiteConfig> & Record<string, unknown>;

    for (const key of Object.keys(body)) {
      if (key in configData) {
        continue;
      }
      log(`Unknown config key: ${key}`, 'error');
      res.status(400).json({ error: `Unknown config key: ${key}` });
      return;
    }

    // Merge onto the stored config and re-pin the credential block: the client never receives
    // the signature hash, so it can never send one back — accepting req.body wholesale would
    // wipe it and lock the admin out.
    const merged: SiteConfig = { ...configData, ...body, security: configData.security };
    const incomingSecurity = body.security as { debug?: unknown } | undefined;
    merged.security.debug = Boolean(incomingSecurity ? incomingSecurity.debug : configData.security.debug);

    // Same problem as the signature hash, same fix: GET /settings hides the anti-bot answer,
    // so the dashboard round-trips an empty one. Taking that at face value would silently
    // disable the guestbook gate on the next unrelated settings save. An empty incoming answer
    // therefore means "leave it as it is"; only a non-empty one is an intentional change.
    if (merged.configuration) {
      const storedAntiBot =
        (configData.configuration && configData.configuration.antiBot) || ({} as AntiBotConfig);
      const incomingAntiBot = merged.configuration.antiBot || ({} as AntiBotConfig);
      const incomingAnswer = typeof incomingAntiBot.answer === 'string' ? incomingAntiBot.answer.trim() : '';
      merged.configuration = {
        ...merged.configuration,
        antiBot: {
          ...incomingAntiBot,
          answer: incomingAnswer || storedAntiBot.answer || '',
        },
      };
    }

    await writeConfig(merged);
    res.json({ data: publicConfig(merged), message: 'Config updated!' });
  } catch (error) {
    log(`Failed to read config: ${errorMessage(error)}`, 'error');
    res.status(500).json({ error: errorMessage(error) });
  }
});
