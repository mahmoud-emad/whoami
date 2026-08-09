import express from 'express';
import type { Request, Response, Router } from 'express';
import { readDatabase, writeDatabase, nextId, updateById } from '../db';
import { isOwner, requireAuth } from '../auth/middleware';
import { log } from '../lib/logger';
import type { DbRecord } from '../types';

/** `catch` binds `unknown` under `strict`, so the original's `error.message` needs unwrapping. */
const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export const projectsRouter: Router = express.Router();

/** A timestamp field as milliseconds, or 0 when it is missing or unparseable. */
const at = (value: unknown): number => {
  const ms = Date.parse(typeof value === 'string' ? value : '');
  return Number.isNaN(ms) ? 0 : ms;
};

/**
 * Project order: pinned projects first, then everything else in the order it already had.
 *
 * The same rule as the blog, for the same reason — within the pinned group the most recently
 * pinned wins, so pinning something puts it above projects that were already pinned. Unpinned
 * projects compare equal, and `sort` is stable, so the rest of the page does not move when
 * something above it gets pinned.
 *
 * Sorted on the server rather than in the page, so the API and the browser cannot disagree about
 * what "first" means. Applied before pagination, so a pinned project is on page one.
 */
export const sortProjects = (projects: DbRecord[]): DbRecord[] =>
  [...projects].sort((a, b) => at(b.pinnedAt) - at(a.pinnedAt));

// Projects CRUD
projectsRouter.get('/projects', async (req: Request, res: Response): Promise<void> => {
  try {
    const dbData = await readDatabase();
    // Same rule as the posts: a hidden project reaches the owner's own page and nobody else's.
    // Filtered before the count, so pagination reflects what the caller can actually see.
    let projects = isOwner(req)
      ? [...dbData.projects]
      : dbData.projects.filter((project) => project.show !== false);
    const totalProjects = projects.length;
    if (req.query.sort === 'true') {
      projects.sort(
        (a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime()
      );
    }
    // After the date sort, not folded into it: pinning has to win regardless of how the caller
    // asked for the rest to be ordered.
    projects = sortProjects(projects);
    const limit = parseInt(req.query.limit as string) || 10;
    const page = parseInt(req.query.page as string) || 1;
    const startIndex = (page - 1) * limit;
    projects = projects.slice(startIndex, startIndex + limit);
    res.json({ data: projects, total: totalProjects });
  } catch (error) {
    log(`Failed to read projects: ${errorMessage(error)}`, 'error');
    res.status(500).json({ error: errorMessage(error) });
  }
});

// Add project
projectsRouter.post('/projects', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const dbData = await readDatabase();
    // Spread first so a caller-supplied id/createdAt cannot override the server-assigned ones.
    const newEntry: DbRecord = {
      ...(req.body as DbRecord),
      id: nextId(dbData.projects),
      createdAt: new Date().toISOString(),
      status: 'created',
    };
    dbData.projects.push(newEntry);
    await writeDatabase(dbData);
    res.json({ message: 'Project added!', data: newEntry });
  } catch (error) {
    log(`Failed to post project: ${errorMessage(error)}`, 'error');
    res.status(500).json({ error: errorMessage(error) });
  }
});

// Update project
projectsRouter.put('/projects/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const dbData = await readDatabase();
    const updated = updateById(dbData.projects, parseInt(req.params.id), req.body as DbRecord);
    if (!updated) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }
    await writeDatabase(dbData);
    res.json({ message: 'Project updated!', data: updated });
  } catch (error) {
    log(`Failed to update project: ${errorMessage(error)}`, 'error');
    res.status(500).json({ error: errorMessage(error) });
  }
});

// Get project
projectsRouter.get('/projects/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const dbData = await readDatabase();
    const project = dbData.projects.find((project) => project.id === parseInt(req.params.id));
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }
    res.json(project);
  } catch (error) {
    log(`Failed to read project: ${errorMessage(error)}`, 'error');
    res.status(500).json({ error: errorMessage(error) });
  }
});

// Delete project
projectsRouter.delete('/projects/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const dbData = await readDatabase();
    const index = dbData.projects.findIndex((project) => project.id === parseInt(req.params.id));
    if (index === -1) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }
    dbData.projects.splice(index, 1);
    await writeDatabase(dbData);
    res.json({ message: 'Project deleted!' });
  } catch (error) {
    log(`Failed to delete project: ${errorMessage(error)}`, 'error');
    res.status(500).json({ error: errorMessage(error) });
  }
});
