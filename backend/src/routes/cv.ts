import fs from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import type { Request, Response, Router } from 'express';
import { UPLOADS_DIR } from '../config/paths';
import { readConfig } from '../config/store';
import { log } from '../lib/logger';

/**
 * `/cv.pdf` — a stable public address for whatever the resume currently is.
 *
 * The upload endpoint names files `<timestamp>-<random>.pdf` so that two uploads can never collide,
 * which is right for storage and useless as something to put on a business card. This resolves the
 * configured `profile.resumeUrl` and serves that file, so the URL a visitor is given never changes
 * while the document behind it can be replaced from the dashboard as often as it likes.
 *
 * Deliberately not a fixed `uploads/cv.pdf` on disk: that would be a second copy to keep in step,
 * and the first dashboard upload after it — which writes a hashed name and repoints resumeUrl —
 * would silently leave this URL serving the old resume.
 *
 * Mounted at the root rather than under `/api`, because the whole point is a short human URL.
 */
export const cvRouter: Router = express.Router();

/** Node's fs errors carry a `code`; narrowing to it is how ENOENT is told apart from a real fault. */
const errorCode = (error: unknown): string | undefined =>
  typeof error === 'object' && error !== null ? (error as NodeJS.ErrnoException).code : undefined;

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

cvRouter.get('/cv.pdf', async (_req: Request, res: Response): Promise<void> => {
  try {
    const configData = await readConfig();
    const profile = (configData.profile || {}) as { resumeUrl?: unknown };
    const resumeUrl = typeof profile.resumeUrl === 'string' ? profile.resumeUrl.trim() : '';

    if (!resumeUrl) {
      res.status(404).json({ message: 'No resume has been uploaded yet' });
      return;
    }

    // A resume hosted somewhere else is still the resume: send the visitor to it rather than
    // pretending this server has a copy.
    if (/^https?:\/\//i.test(resumeUrl)) {
      res.redirect(302, resumeUrl);
      return;
    }

    // basename() and nothing else from the stored path. resumeUrl is written by an authenticated
    // owner, but it is still a string in a config file being turned into a filesystem read, and
    // "../../etc/whoami/env" must not be reachable through it.
    const name = path.basename(resumeUrl);
    if (!name || !name.toLowerCase().endsWith('.pdf')) {
      res.status(404).json({ message: 'The configured resume is not a PDF' });
      return;
    }

    const target = path.join(UPLOADS_DIR, name);
    try {
      await fs.access(target);
    } catch (err) {
      if (errorCode(err) === 'ENOENT') {
        // Config points at a file that has been deleted. 404 is the honest answer, and the log
        // line is what tells the owner why their CV link went dead.
        log(`Resume configured as ${resumeUrl} but ${target} is missing`, 'warn');
        res.status(404).json({ message: 'The configured resume file is missing' });
        return;
      }
      throw err;
    }

    // Inline, and named for the person rather than for the storage layer: a browser opens it in its
    // own viewer, and a visitor who saves it gets a filename that means something on their disk.
    res.type('application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="cv.pdf"');
    res.sendFile(target);
  } catch (error) {
    log(`Failed to serve the resume: ${errorMessage(error)}`, 'error');
    res.status(500).json({ error: errorMessage(error) });
  }
});
