import path from 'node:path';

/**
 * Every data path is resolved from the compiled file's location rather than the working directory,
 * so the server behaves the same whether it is started from the repo root, a systemd style unit or
 * a container. `__dirname` is `backend/dist/config` at runtime, so the data directory is two levels
 * up.
 */
const BACKEND_DIR = path.join(__dirname, '..', '..');

/**
 * Where the three mutable things live: `db.json`, `config.json` and `uploads/`.
 *
 * It defaults to `backend/`, which keeps a plain `yarn server` checkout working exactly as before.
 * A container sets `WHOAMI_DATA_DIR` instead, because `backend/` also holds the compiled server:
 * mounting a volume over it to persist the data would bury the code underneath and pin the image
 * to whatever build first populated the volume.
 */
export const DATA_DIR = process.env.WHOAMI_DATA_DIR?.trim()
  ? path.resolve(process.env.WHOAMI_DATA_DIR.trim())
  : BACKEND_DIR;

export const FILE_PATH = path.join(DATA_DIR, 'db.json');
export const CONFIG_FILE_PATH = path.join(DATA_DIR, 'config.json');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
/**
 * The frontend build this process serves in production.
 *
 * `frontend/dist` is where the frontend workspace puts it in a checkout. `WHOAMI_DIST_DIR` moves
 * it, which is what the container image does — there the two builds are copied side by side and
 * the repository's directory layout no longer exists. Point it at nothing and the server simply
 * runs as an API, which is the split-container setup.
 */
export const DIST_DIR = process.env.WHOAMI_DIST_DIR?.trim()
  ? path.resolve(process.env.WHOAMI_DIST_DIR.trim())
  : path.join(BACKEND_DIR, '..', 'frontend', 'dist');

export const INDEX_HTML_PATH = path.join(DIST_DIR, 'index.html');
