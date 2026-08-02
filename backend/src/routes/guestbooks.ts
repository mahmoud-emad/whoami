import express from 'express';
import type { Request, Response, Router } from 'express';
import { readConfig } from '../config/store';
import { readDatabase, writeDatabase, nextId, updateById } from '../db';
import { requireAuth } from '../auth/middleware';
import { log } from '../lib/logger';
import type { AntiBotConfig, DbRecord } from '../types';

/** `catch` binds `unknown` under `strict`, so the original's `error.message` needs unwrapping. */
const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export const guestbooksRouter: Router = express.Router();

// Guestbooks CRUD
guestbooksRouter.get('/guestbooks', async (_req: Request, res: Response): Promise<void> => {
  try {
    const dbData = await readDatabase();
    const guestbooks = [...dbData.guestbooks];
    // if (req.query.sort === "true") {
    // guestbooks.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    // }
    // const limit = parseInt(req.query.limit) || 10;
    // const page = parseInt(req.query.page) || 1;
    // const startIndex = (page - 1) * limit;
    // guestbooks = guestbooks.slice(startIndex, startIndex + limit);
    res.json({ data: guestbooks, total: guestbooks.length });
  } catch (error) {
    log(`Failed to read guestbooks: ${errorMessage(error)}`, 'error');
    res.status(500).json({ error: errorMessage(error) });
  }
});

// Add guestbook — the one write endpoint that stays public, so it whitelists and bounds every
// field. Spreading req.body here would let a visitor set their own id, createdAt or status.
export const GUESTBOOK_LIMITS = { name: 60, message: 1000, website: 200 };

guestbooksRouter.post('/guestbooks', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, message, website, antiBotAnswer } = (req.body ?? {}) as Record<string, unknown>;

    // The real spam gate. The form does the same check for a nicer error, but a bot posts
    // straight to this endpoint and never runs that code, so the server has to be the one
    // that decides. Compared trimmed and case-insensitively — the question is a human
    // pleasantry, not a password, and rejecting "Blue" for "blue" only annoys real visitors.
    const guestbookConfig = await readConfig();
    const antiBot: AntiBotConfig =
      (guestbookConfig.configuration && guestbookConfig.configuration.antiBot) || ({} as AntiBotConfig);
    const expectedAnswer = typeof antiBot.answer === 'string' ? antiBot.answer.trim() : '';
    if (antiBot.enabled && expectedAnswer) {
      const givenAnswer = typeof antiBotAnswer === 'string' ? antiBotAnswer.trim() : '';
      if (!givenAnswer) {
        res.status(400).json({
          error: antiBot.question
            ? `Please answer the anti-bot question: ${antiBot.question}`
            : 'The anti-bot answer is required',
        });
        return;
      }
      if (givenAnswer.toLowerCase() !== expectedAnswer.toLowerCase()) {
        res.status(400).json({ error: 'That is not the right answer. Please try again.' });
        return;
      }
    }

    if (typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }
    if (typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }
    if (name.length > GUESTBOOK_LIMITS.name) {
      res.status(400).json({ error: `Name must be at most ${GUESTBOOK_LIMITS.name} characters` });
      return;
    }
    if (message.length > GUESTBOOK_LIMITS.message) {
      res.status(400).json({ error: `Message must be at most ${GUESTBOOK_LIMITS.message} characters` });
      return;
    }
    if (website !== undefined && website !== null && website !== '') {
      if (typeof website !== 'string' || website.length > GUESTBOOK_LIMITS.website) {
        res.status(400).json({ error: 'Website is not valid' });
        return;
      }
    }

    const dbData = await readDatabase();
    // Field by field, never a spread of req.body: id, createdAt and status stay server-owned.
    const newEntry: DbRecord = {
      id: nextId(dbData.guestbooks),
      createdAt: new Date().toISOString(),
      status: 'created',
      name: name.trim(),
      message: message.trim(),
      website: typeof website === 'string' ? website.trim() : '',
    };
    dbData.guestbooks.push(newEntry);
    await writeDatabase(dbData);
    res.json({ message: 'Guestbook entry added!', data: newEntry });
  } catch (error) {
    log(`Failed to post guestbook: ${errorMessage(error)}`, 'error');
    res.status(500).json({ error: errorMessage(error) });
  }
});

// Update guestbook
guestbooksRouter.put('/guestbooks/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const dbData = await readDatabase();
    const updated = updateById(dbData.guestbooks, parseInt(req.params.id), req.body as DbRecord);
    if (!updated) {
      res.status(404).json({ message: 'Guestbook entry not found' });
      return;
    }
    await writeDatabase(dbData);
    res.json({ message: 'Guestbook entry updated!', data: updated });
  } catch (error) {
    log(`Failed to update guestbook: ${errorMessage(error)}`, 'error');
    res.status(500).json({ error: errorMessage(error) });
  }
});

// Delete guestbook
guestbooksRouter.delete('/guestbooks/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const dbData = await readDatabase();
    const index = dbData.guestbooks.findIndex((entry) => entry.id === parseInt(req.params.id));
    if (index === -1) {
      res.status(404).json({ message: 'Guestbook entry not found' });
      return;
    }
    dbData.guestbooks.splice(index, 1);
    await writeDatabase(dbData);
    res.json({ message: 'Guestbook entry deleted!' });
  } catch (error) {
    log(`Failed to delete guestbook: ${errorMessage(error)}`, 'error');
    res.status(500).json({ error: errorMessage(error) });
  }
});
