import express from 'express';
import type { Request, Response, Router } from 'express';
import { readDatabase, writeDatabase, nextId, updateById } from '../db';
import { requireAuth } from '../auth/middleware';
import { log } from '../lib/logger';
import type { Database, DbRecord } from '../types';

/** `catch` binds `unknown` under `strict`, so the original's `error.message` needs unwrapping. */
const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export const listsRouter: Router = express.Router();

/**
 * Checklists. One document per list: a set of missions, each holding groups of checkable items.
 *
 * Reading is public — the point of putting a plan on a personal site is that other people can see
 * it. Every write, ticking a single box included, is behind `requireAuth`: the boxes are a record
 * of what the owner has actually done, so a visitor being able to tick one would make the page a
 * lie rather than a guestbook.
 */
const listCollection = (dbData: Database): DbRecord[] => {
  if (!Array.isArray(dbData.lists)) dbData.lists = [];
  return dbData.lists;
};

/** URL-safe id derived from the title, so a list lives at a readable address. */
const slugify = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);

/** A slug nobody else is using. Two lists called "Reading" become `reading` and `reading-2`. */
const uniqueSlug = (list: DbRecord[], base: string, ignoreId?: number): string => {
  const root = base || 'list';
  let candidate = root;
  let n = 2;
  while (list.some((entry) => entry.slug === candidate && entry.id !== ignoreId)) {
    candidate = `${root}-${n}`;
    n += 1;
  }
  return candidate;
};

const findList = (list: DbRecord[], key: string): DbRecord | undefined => {
  const asId = parseInt(key, 10);
  return list.find((entry) => entry.slug === key || (!Number.isNaN(asId) && entry.id === asId));
};

listsRouter.get('/lists', async (_req: Request, res: Response): Promise<void> => {
  try {
    const dbData = await readDatabase();
    const lists = listCollection(dbData);
    // The index only needs the cover: sending every item of every list would be the whole page
    // content for a link the reader may not follow.
    const data = lists.map((entry) => {
      const missions = Array.isArray(entry.missions) ? (entry.missions as DbRecord[]) : [];
      let total = 0;
      let done = 0;
      for (const mission of missions) {
        for (const group of (Array.isArray(mission.groups) ? mission.groups : []) as DbRecord[]) {
          for (const item of (Array.isArray(group.items) ? group.items : []) as DbRecord[]) {
            total += 1;
            if (item.done) done += 1;
          }
        }
      }
      return {
        id: entry.id,
        slug: entry.slug,
        title: entry.title,
        intro: entry.intro,
        emoji: entry.emoji,
        show: entry.show,
        missionCount: missions.length,
        total,
        done,
      };
    });
    res.json({ data, total: data.length });
  } catch (error) {
    log(`Failed to read lists: ${errorMessage(error)}`, 'error');
    res.status(500).json({ error: errorMessage(error) });
  }
});

listsRouter.get('/lists/:key', async (req: Request, res: Response): Promise<void> => {
  try {
    const dbData = await readDatabase();
    const entry = findList(listCollection(dbData), req.params.key);
    if (!entry) {
      res.status(404).json({ message: 'List not found' });
      return;
    }
    res.json({ data: entry });
  } catch (error) {
    log(`Failed to read list: ${errorMessage(error)}`, 'error');
    res.status(500).json({ error: errorMessage(error) });
  }
});

listsRouter.post('/lists', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const dbData = await readDatabase();
    const list = listCollection(dbData);
    const body = req.body as DbRecord;
    const entry: DbRecord = {
      missions: [],
      ...body,
      // Spread first so a caller-supplied id, slug or createdAt cannot override the server's.
      id: nextId(list),
      slug: uniqueSlug(list, slugify(String(body.slug || body.title || ''))),
      createdAt: new Date().toISOString(),
    };
    list.push(entry);
    await writeDatabase(dbData);
    res.json({ message: 'List added!', data: entry });
  } catch (error) {
    log(`Failed to add a list: ${errorMessage(error)}`, 'error');
    res.status(500).json({ error: errorMessage(error) });
  }
});

listsRouter.put('/lists/:key', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const dbData = await readDatabase();
    const list = listCollection(dbData);
    const existing = findList(list, req.params.key);
    if (!existing || typeof existing.id !== 'number') {
      res.status(404).json({ message: 'List not found' });
      return;
    }

    const patch = { ...(req.body as DbRecord) };
    // The slug is re-derived only when the owner actually renames the list, so an edit to one
    // checkbox never changes the URL the page is bookmarked at.
    if (typeof patch.title === 'string' && patch.title !== existing.title) {
      patch.slug = uniqueSlug(list, slugify(String(patch.slug || patch.title)), existing.id);
    } else {
      patch.slug = existing.slug;
    }

    const updated = updateById(list, existing.id, patch);
    await writeDatabase(dbData);
    res.json({ message: 'List updated!', data: updated });
  } catch (error) {
    log(`Failed to update a list: ${errorMessage(error)}`, 'error');
    res.status(500).json({ error: errorMessage(error) });
  }
});

listsRouter.delete('/lists/:key', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const dbData = await readDatabase();
    const list = listCollection(dbData);
    const existing = findList(list, req.params.key);
    if (!existing) {
      res.status(404).json({ message: 'List not found' });
      return;
    }
    list.splice(list.indexOf(existing), 1);
    await writeDatabase(dbData);
    res.json({ message: 'List deleted!' });
  } catch (error) {
    log(`Failed to delete a list: ${errorMessage(error)}`, 'error');
    res.status(500).json({ error: errorMessage(error) });
  }
});
