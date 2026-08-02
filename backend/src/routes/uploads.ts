import fs from 'node:fs/promises';
import path from 'node:path';
import { Router } from 'express';
import type { Request, RequestHandler, Response } from 'express';
import { requireAuth } from '../auth/middleware';
import { UPLOADS_DIR } from '../config/paths';
import { SERVE_FRONTEND } from '../config/runtime';
import { log } from '../lib/logger';
import { upload } from '../uploads/storage';

export const uploadsRouter = Router();

/** Node's fs errors carry a `code`; narrowing to it is how ENOENT is told apart from a real fault. */
const errorCode = (error: unknown): string | undefined =>
  typeof error === 'object' && error !== null ? (error as NodeJS.ErrnoException).code : undefined;

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

interface UploadedFile {
  name: string;
  size: number;
  modifiedAt: string;
  url: string;
  isPdf: boolean;
  isImage: boolean;
}

// Base URL for uploaded files. When this process serves the frontend too, the files sit on the
// same origin, so a relative URL is used — stored content then survives a domain change. Only
// the split dev setup (frontend on :5173, API on :3000) needs an absolute URL.
const uploadsBase = (req: Request): string =>
  SERVE_FRONTEND ? '/uploads' : `${req.protocol}://${req.get('host')}/uploads`;

/**
 * `@types/multer` ships its own nested copy of `@types/express`, so the handler it returns is typed
 * against a different (structurally identical) Request. The cast pins it back to this project's
 * express types; it changes nothing at runtime.
 */
const singleImage = upload.single('image') as unknown as RequestHandler;

// Image upload endpoint
uploadsRouter.post('/upload', requireAuth, singleImage, async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }
    const imageUrl = `${uploadsBase(req)}/${req.file.filename}`;
    res.json({
      message: 'File uploaded successfully',
      url: imageUrl,
    });
  } catch (error) {
    log(`Failed to upload file: ${errorMessage(error)}`, 'error');
    res.status(500).json({ error: errorMessage(error) });
  }
});

// List uploaded files
uploadsRouter.get('/uploads', requireAuth, async (req: Request, res: Response) => {
  try {
    let entries: string[];
    try {
      entries = await fs.readdir(UPLOADS_DIR);
    } catch (err) {
      // Nothing has ever been uploaded: an empty list is the honest answer, not a 500.
      if (errorCode(err) === 'ENOENT') {
        res.json({ data: [], total: 0 });
        return;
      }
      throw err;
    }
    const base = uploadsBase(req);
    const files = await Promise.all(
      entries.map(async (name): Promise<UploadedFile | null> => {
        const stat = await fs.stat(path.join(UPLOADS_DIR, name));
        if (!stat.isFile()) return null;
        const ext = path.extname(name).toLowerCase();
        return {
          name,
          size: stat.size,
          modifiedAt: stat.mtime.toISOString(),
          url: `${base}/${name}`,
          isPdf: ext === '.pdf',
          isImage: ['.jpg', '.jpeg', '.png', '.gif'].includes(ext),
        };
      })
    );
    const filtered = files
      .filter((file): file is UploadedFile => Boolean(file))
      .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
    res.json({ data: filtered, total: filtered.length });
  } catch (error) {
    log(`Failed to list uploads: ${errorMessage(error)}`, 'error');
    res.status(500).json({ error: errorMessage(error) });
  }
});

// Delete an uploaded file
uploadsRouter.delete('/uploads/:filename', requireAuth, async (req: Request, res: Response) => {
  try {
    // Strip any path component so callers can't traverse out of UPLOADS_DIR
    const safeName = path.basename(req.params.filename);
    if (!safeName || safeName === '.' || safeName === '..') {
      res.status(400).json({ error: 'Invalid filename' });
      return;
    }
    const target = path.join(UPLOADS_DIR, safeName);
    try {
      await fs.unlink(target);
    } catch (err) {
      if (errorCode(err) === 'ENOENT') {
        res.status(404).json({ message: 'File not found' });
        return;
      }
      throw err;
    }
    res.json({ message: 'File deleted!', filename: safeName });
  } catch (error) {
    log(`Failed to delete upload: ${errorMessage(error)}`, 'error');
    res.status(500).json({ error: errorMessage(error) });
  }
});
