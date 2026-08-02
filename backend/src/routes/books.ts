import express from 'express';
import type { Request, Response, Router } from 'express';
import { readDatabase, writeDatabase, nextId, updateById } from '../db';
import { requireAuth } from '../auth/middleware';
import { log } from '../lib/logger';
import type { Database, DbRecord } from '../types';

/** `catch` binds `unknown` under `strict`, so the original's `error.message` needs unwrapping. */
const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export const booksRouter: Router = express.Router();

/**
 * A small library: what the owner is reading, has read, and means to read.
 *
 * A book is a title, an author and a link to the book itself — the publisher's or the author's own
 * page, not a file. Nothing here hosts or points at a copy of anything.
 *
 * Reading is public. Every write is behind `requireAuth`, the same as the lists: the shelf is a
 * record of what one person actually read.
 */
const bookCollection = (dbData: Database): DbRecord[] => {
  if (!Array.isArray(dbData.books)) dbData.books = [];
  return dbData.books;
};

booksRouter.get('/books', async (_req: Request, res: Response): Promise<void> => {
  try {
    const dbData = await readDatabase();
    const books = bookCollection(dbData);
    res.json({ data: books, total: books.length });
  } catch (error) {
    log(`Failed to read books: ${errorMessage(error)}`, 'error');
    res.status(500).json({ error: errorMessage(error) });
  }
});

booksRouter.post('/books', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const dbData = await readDatabase();
    const books = bookCollection(dbData);
    // Spread first so a caller-supplied id or createdAt cannot override the server-assigned ones.
    const entry: DbRecord = {
      status: 'want',
      ...(req.body as DbRecord),
      id: nextId(books),
      createdAt: new Date().toISOString(),
    };
    books.push(entry);
    await writeDatabase(dbData);
    res.json({ message: 'Book added!', data: entry });
  } catch (error) {
    log(`Failed to add a book: ${errorMessage(error)}`, 'error');
    res.status(500).json({ error: errorMessage(error) });
  }
});

booksRouter.put('/books/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const dbData = await readDatabase();
    const updated = updateById(bookCollection(dbData), parseInt(req.params.id, 10), req.body as DbRecord);
    if (!updated) {
      res.status(404).json({ message: 'Book not found' });
      return;
    }
    await writeDatabase(dbData);
    res.json({ message: 'Book updated!', data: updated });
  } catch (error) {
    log(`Failed to update a book: ${errorMessage(error)}`, 'error');
    res.status(500).json({ error: errorMessage(error) });
  }
});

booksRouter.delete('/books/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const dbData = await readDatabase();
    const books = bookCollection(dbData);
    const index = books.findIndex((entry) => entry.id === parseInt(req.params.id, 10));
    if (index === -1) {
      res.status(404).json({ message: 'Book not found' });
      return;
    }
    books.splice(index, 1);
    await writeDatabase(dbData);
    res.json({ message: 'Book deleted!' });
  } catch (error) {
    log(`Failed to delete a book: ${errorMessage(error)}`, 'error');
    res.status(500).json({ error: errorMessage(error) });
  }
});
