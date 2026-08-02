import express from 'express';
import type { Request, Response, Router } from 'express';
import { readDatabase, writeDatabase, nextId, updateById } from '../db';
import { requireAuth } from '../auth/middleware';
import { tallyAll } from './reactions';
import { log } from '../lib/logger';
import type { DbRecord } from '../types';

/** `catch` binds `unknown` under `strict`, so the original's `error.message` needs unwrapping. */
const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export const postsRouter: Router = express.Router();

// Posts CRUD
postsRouter.get('/posts', async (req: Request, res: Response): Promise<void> => {
  try {
    const dbData = await readDatabase();
    // Vote counts travel with the listing. Fetching them per post would be one request per card,
    // and the blog page would flash a column of zeroes while they arrived.
    const tallies = await tallyAll(req, dbData);
    const data = dbData.posts.map((post) => ({
      ...post,
      reactions: typeof post.id === 'number' ? tallies[post.id] : { up: 0, down: 0, mine: null },
    }));
    res.json({ data, total: data.length });
  } catch (error) {
    log(`Failed to read posts: ${errorMessage(error)}`, 'error');
    res.status(500).json({ error: errorMessage(error) });
  }
});

postsRouter.post('/posts', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const dbData = await readDatabase();
    // Spread first so a caller-supplied id/createdAt cannot override the server-assigned ones.
    const newEntry: DbRecord = {
      ...(req.body as DbRecord),
      id: nextId(dbData.posts),
      createdAt: new Date().toISOString(),
      status: 'created',
    };
    dbData.posts.push(newEntry);
    await writeDatabase(dbData);
    res.json({ message: 'Post added!', data: newEntry });
  } catch (error) {
    log(`Failed to post blog post: ${errorMessage(error)}`, 'error');
    res.status(500).json({ error: errorMessage(error) });
  }
});

postsRouter.get('/posts/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const dbData = await readDatabase();
    const post = dbData.posts.find((post) => post.id === parseInt(req.params.id));
    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }
    res.json(post);
  } catch (error) {
    log(`Failed to read post: ${errorMessage(error)}`, 'error');
    res.status(500).json({ error: errorMessage(error) });
  }
});

// Update post
postsRouter.put('/posts/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const dbData = await readDatabase();
    const updated = updateById(dbData.posts, parseInt(req.params.id), req.body as DbRecord);
    if (!updated) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }
    await writeDatabase(dbData);
    res.json({ message: 'Post updated!', data: updated });
  } catch (error) {
    log(`Failed to update post: ${errorMessage(error)}`, 'error');
    res.status(500).json({ error: errorMessage(error) });
  }
});

// Delete post
postsRouter.delete('/posts/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const dbData = await readDatabase();
    const index = dbData.posts.findIndex((post) => post.id === parseInt(req.params.id));
    if (index === -1) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }
    dbData.posts.splice(index, 1);
    await writeDatabase(dbData);
    res.json({ message: 'Post deleted!' });
  } catch (error) {
    log(`Failed to delete post: ${errorMessage(error)}`, 'error');
    res.status(500).json({ error: errorMessage(error) });
  }
});
