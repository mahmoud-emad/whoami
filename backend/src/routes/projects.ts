import express from 'express';
import type { Request, Response, Router } from 'express';
import { readDatabase, writeDatabase, nextId, updateById } from '../db';
import { requireAuth } from '../auth/middleware';
import { log } from '../lib/logger';
import type { DbRecord } from '../types';

/** `catch` binds `unknown` under `strict`, so the original's `error.message` needs unwrapping. */
const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export const projectsRouter: Router = express.Router();

// Projects CRUD
projectsRouter.get('/projects', async (req: Request, res: Response): Promise<void> => {
  try {
    const dbData = await readDatabase();
    let projects = [...dbData.projects];
    const totalProjects = projects.length;
    if (req.query.sort === 'true') {
      projects.sort(
        (a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime()
      );
    }
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
