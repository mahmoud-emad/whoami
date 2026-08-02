import fs from 'node:fs';
import { DIST_DIR } from './paths';

export const PORT = Number(process.env.PORT) || 3000;
export const HOST = process.env.HOST || '0.0.0.0';
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_PRODUCTION = NODE_ENV === 'production';

/**
 * Origins allowed to call the API cross-origin. Empty in production means same-origin only, which
 * is correct when this process also serves the built frontend.
 */
export const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

/** In production this process also serves the built frontend, provided the build exists. */
export const SERVE_FRONTEND = IS_PRODUCTION && fs.existsSync(DIST_DIR);
