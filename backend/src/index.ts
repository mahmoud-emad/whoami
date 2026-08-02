import fs from 'node:fs/promises';

import { DATA_DIR, UPLOADS_DIR } from './config/paths';
import { HOST, IS_PRODUCTION, NODE_ENV, PORT, SERVE_FRONTEND } from './config/runtime';
import { bootstrapConfig, validateEnvironment } from './config/env';
import { initializeConfig } from './config/store';
import { initializeDatabase } from './db';
import { log } from './lib/logger';
import { createApp } from './server/app';

const startServer = async (): Promise<void> => {
  // Before anything reads or writes: with WHOAMI_DATA_DIR pointing somewhere new, the first boot
  // finds nothing there at all, and both initializers below write files into it straight away.
  await fs.mkdir(DATA_DIR, { recursive: true });

  await initializeDatabase();
  await initializeConfig();

  // Order matters: validate before seeding, so a misconfigured production deploy fails with a
  // clear message rather than half-writing a config first.
  await validateEnvironment();
  await bootstrapConfig();

  await fs.mkdir(UPLOADS_DIR, { recursive: true });

  const app = createApp();
  app.listen(PORT, HOST, () => {
    log(`Server running in ${NODE_ENV} mode on http://${HOST}:${PORT}`);
    if (SERVE_FRONTEND) {
      log('Serving the frontend build from dist/ on the same origin.');
    } else if (IS_PRODUCTION) {
      log('NODE_ENV=production but dist/ is missing. Run `yarn build` first.', 'warn');
    }
  });
};

void startServer();
