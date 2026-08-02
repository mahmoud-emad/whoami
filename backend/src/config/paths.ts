import path from 'node:path';

/**
 * Every data path is resolved from the compiled file's location rather than the working directory,
 * so the server behaves the same whether it is started from the repo root, a systemd style unit or
 * a container. `__dirname` is `backend/dist/config` at runtime, so the data directory is two levels
 * up.
 */
const BACKEND_DIR = path.join(__dirname, '..', '..');

export const FILE_PATH = path.join(BACKEND_DIR, 'db.json');
export const CONFIG_FILE_PATH = path.join(BACKEND_DIR, 'config.json');
export const UPLOADS_DIR = path.join(BACKEND_DIR, 'uploads');
export const DIST_DIR = path.join(BACKEND_DIR, '..', 'dist');
export const INDEX_HTML_PATH = path.join(DIST_DIR, 'index.html');
