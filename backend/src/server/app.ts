import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';

import { UPLOADS_DIR } from '../config/paths';
import { ALLOWED_ORIGINS, IS_PRODUCTION, SERVE_FRONTEND } from '../config/runtime';
import { log } from '../lib/logger';

import { authRouter } from '../auth/routes';
import { healthRouter } from '../routes/health';
import { settingsRouter } from '../routes/settings';
import { searchRouter } from '../routes/search';
import { guestbooksRouter } from '../routes/guestbooks';
import { projectsRouter } from '../routes/projects';
import { articlesRouter } from '../routes/articles';
import { postsRouter } from '../routes/posts';
import { reactionsRouter } from '../routes/reactions';
import { listsRouter } from '../routes/lists';
import { booksRouter } from '../routes/books';
import { uploadsRouter } from '../routes/uploads';
import { cvRouter } from '../routes/cv';
import { mountFrontend } from './frontend';

const loggerMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  log(`${req.method} ${req.url}`, 'info');
  next();
};

export const createApp = (): Express => {
  const app = express();

  // Needed for a correct req.ip behind nginx, Caddy or Cloudflare, which is what the login
  // throttle counts against.
  app.set('trust proxy', Boolean(process.env.TRUST_PROXY));
  app.use(express.json({ limit: '1mb' }));

  // In production the frontend is served by this same process, so no cross-origin access is
  // needed unless the operator explicitly allowlists origins. In development anything goes.
  app.use(cors({
    origin: IS_PRODUCTION ? (ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : false) : true,
  }));
  app.use(loggerMiddleware);

  // Uploaded files. redirect:false so GET /uploads reaches the listing route rather than being
  // redirected; cacheControl:false so the reverse proxy is the single source of Cache-Control.
  app.use('/uploads', express.static(UPLOADS_DIR, { redirect: false, cacheControl: false }));

  // Root-mounted on purpose: /cv.pdf is a short address to hand out, so it cannot live under /api.
  // Ahead of the frontend, or the SPA catch-all would answer it with index.html.
  app.use(cvRouter);

  // Every API endpoint lives on this router. Keeping it off the root is what lets client side
  // routes like /projects coexist with the API resource of the same name.
  const api = express.Router();
  api.use(healthRouter);
  api.use(authRouter);
  api.use(settingsRouter);
  api.use(searchRouter);
  api.use(guestbooksRouter);
  api.use(projectsRouter);
  api.use(articlesRouter);
  api.use(postsRouter);
  api.use(reactionsRouter);
  api.use(listsRouter);
  api.use(booksRouter);
  api.use(uploadsRouter);

  // /api is canonical and is what the frontend calls. When this process is not also serving the
  // SPA there is nothing to collide with, so the endpoints stay available at the root too, which
  // keeps the development setup and any existing API clients working.
  app.use('/api', api);
  if (!SERVE_FRONTEND) app.use(api);

  mountFrontend(app);

  // Without this, multer rejections (file too large, disallowed type) fall through to Express's
  // default handler and return an HTML stack trace instead of JSON.
  app.use((err: Error & { code?: string }, _req: Request, res: Response, _next: NextFunction) => {
    const isMulterLimit = err && err.code === 'LIMIT_FILE_SIZE';
    const status = isMulterLimit ? 413 : 400;
    log(`Request failed: ${err.message}`, 'error');
    res.status(status).json({
      error: isMulterLimit ? 'File is too large. The limit is 5MB.' : err.message || 'Request failed',
    });
  });

  return app;
};
