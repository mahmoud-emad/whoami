import express from 'express';
import type { Request, Response, Router } from 'express';
import { readDatabase, writeDatabase, nextId, updateById } from '../db';
import { requireAuth } from '../auth/middleware';
import { log } from '../lib/logger';
import type { DbRecord } from '../types';

/** `catch` binds `unknown` under `strict`, so the original's `error.message` needs unwrapping. */
const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export const articlesRouter: Router = express.Router();

// Articles CRUD
articlesRouter.get('/articles', async (req: Request, res: Response): Promise<void> => {
  try {
    const dbData = await readDatabase();
    let articles = [...dbData.articles];
    const totalArticles = articles.length;
    if (req.query.sort === 'true') {
      articles.sort(
        (a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime()
      );
    }
    const limit = parseInt(req.query.limit as string) || 10;
    const page = parseInt(req.query.page as string) || 1;
    const startIndex = (page - 1) * limit;
    articles = articles.slice(startIndex, startIndex + limit);
    res.json({ data: articles, total: totalArticles });
  } catch (error) {
    log(`Failed to read articles: ${errorMessage(error)}`, 'error');
    res.status(500).json({ error: errorMessage(error) });
  }
});

articlesRouter.post('/articles', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const dbData = await readDatabase();
    // Spread first so a caller-supplied id/createdAt cannot override the server-assigned ones.
    const newEntry: DbRecord = {
      ...(req.body as DbRecord),
      id: nextId(dbData.articles),
      createdAt: new Date().toISOString(),
      status: 'created',
    };
    dbData.articles.push(newEntry);
    await writeDatabase(dbData);
    res.json({ message: 'Article added!', data: newEntry });
  } catch (error) {
    log(`Failed to post article: ${errorMessage(error)}`, 'error');
    res.status(500).json({ error: errorMessage(error) });
  }
});

articlesRouter.get('/articles/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const dbData = await readDatabase();
    const article = dbData.articles.find((article) => article.id === parseInt(req.params.id));
    if (!article) {
      res.status(404).json({ message: 'Article not found' });
      return;
    }
    res.json(article);
  } catch (error) {
    log(`Failed to read article: ${errorMessage(error)}`, 'error');
    res.status(500).json({ error: errorMessage(error) });
  }
});

// Update article
articlesRouter.put('/articles/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const dbData = await readDatabase();
    const updated = updateById(dbData.articles, parseInt(req.params.id), req.body as DbRecord);
    if (!updated) {
      res.status(404).json({ message: 'Article not found' });
      return;
    }
    await writeDatabase(dbData);
    res.json({ message: 'Article updated!', data: updated });
  } catch (error) {
    log(`Failed to update article: ${errorMessage(error)}`, 'error');
    res.status(500).json({ error: errorMessage(error) });
  }
});

// Delete article
articlesRouter.delete('/articles/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const dbData = await readDatabase();
    const index = dbData.articles.findIndex((article) => article.id === parseInt(req.params.id));
    if (index === -1) {
      res.status(404).json({ message: 'Article not found' });
      return;
    }
    dbData.articles.splice(index, 1);
    await writeDatabase(dbData);
    res.json({ message: 'Article deleted!' });
  } catch (error) {
    log(`Failed to delete article: ${errorMessage(error)}`, 'error');
    res.status(500).json({ error: errorMessage(error) });
  }
});
