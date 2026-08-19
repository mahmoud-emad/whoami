import express from 'express';
import type { Request, Response, Router } from 'express';
import { readDatabase, writeDatabase, nextId, updateById } from '../db';
import { requireAuth } from '../auth/middleware';
import { log } from '../lib/logger';
import type { Database, DbRecord } from '../types';

/** `catch` binds `unknown` under `strict`, so the original's `error.message` needs unwrapping. */
const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export const coursesRouter: Router = express.Router();

/**
 * Courses the owner is working through: lecture series, university courses, anything taught.
 *
 * A sibling of the shelf rather than part of it. Both are things being learned from, but a book has
 * an author and an edition where a course has an institution and a term, and a shelf that mixed the
 * two would have to blank half of each row.
 *
 * `url` points at the course itself — the playlist or the course's own page. Reading is public;
 * every write is behind `requireAuth`, the same as the books and the lists.
 */
const courseCollection = (dbData: Database): DbRecord[] => {
  // Created on first use rather than in the seed, so an existing db.json needs no migration.
  if (!Array.isArray(dbData.courses)) dbData.courses = [];
  return dbData.courses;
};

coursesRouter.get('/courses', async (_req: Request, res: Response): Promise<void> => {
  try {
    const dbData = await readDatabase();
    const courses = courseCollection(dbData);
    res.json({ data: courses, total: courses.length });
  } catch (error) {
    log(`Failed to read courses: ${errorMessage(error)}`, 'error');
    res.status(500).json({ error: errorMessage(error) });
  }
});

coursesRouter.post('/courses', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const dbData = await readDatabase();
    const courses = courseCollection(dbData);
    // Spread first so a caller-supplied id or createdAt cannot override the server-assigned ones.
    const entry: DbRecord = {
      status: 'want',
      ...(req.body as DbRecord),
      id: nextId(courses),
      createdAt: new Date().toISOString(),
    };
    courses.push(entry);
    await writeDatabase(dbData);
    res.json({ message: 'Course added!', data: entry });
  } catch (error) {
    log(`Failed to add a course: ${errorMessage(error)}`, 'error');
    res.status(500).json({ error: errorMessage(error) });
  }
});

coursesRouter.put('/courses/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const dbData = await readDatabase();
    const updated = updateById(courseCollection(dbData), parseInt(req.params.id, 10), req.body as DbRecord);
    if (!updated) {
      res.status(404).json({ message: 'Course not found' });
      return;
    }
    await writeDatabase(dbData);
    res.json({ message: 'Course updated!', data: updated });
  } catch (error) {
    log(`Failed to update a course: ${errorMessage(error)}`, 'error');
    res.status(500).json({ error: errorMessage(error) });
  }
});

coursesRouter.delete('/courses/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const dbData = await readDatabase();
    const courses = courseCollection(dbData);
    const index = courses.findIndex((entry) => entry.id === parseInt(req.params.id, 10));
    if (index === -1) {
      res.status(404).json({ message: 'Course not found' });
      return;
    }
    courses.splice(index, 1);
    await writeDatabase(dbData);
    res.json({ message: 'Course removed!' });
  } catch (error) {
    log(`Failed to remove a course: ${errorMessage(error)}`, 'error');
    res.status(500).json({ error: errorMessage(error) });
  }
});
