# Contributing

Thanks for taking a look. This is a self-hosted portfolio you configure rather than fork-and-edit,
so the most valuable contributions keep it that way.

## Setup

```bash
yarn install
cp .env.example .env
yarn server   # backend on :3000
yarn dev      # frontend on :5173
```

On first boot the server prints a generated admin signature once. Set `ADMIN_SIGNATURE` in `.env`
before the first run if you would rather choose your own. Sign in at `/admin`.

[docs/](docs/readme.md) is the user-facing manual, one Markdown file per chapter under
`docs/content/`. If your change alters what a site owner sees or configures, update the relevant
chapter in the same PR.

## Layout

Two yarn workspaces. The root holds tooling and deployment files only — no application code.

```
├── frontend/            # Vue 3 + Vuetify SPA (workspace: whoami-frontend)
│   ├── src/
│   │   ├── components/  # admin/ owner controls, forms/ dashboard tabs, home/ sections
│   │   ├── composables/ # useAdmin, useFormFeedback, useDocumentHead
│   │   ├── router/      # routes and the admin guard
│   │   ├── store/       # Pinia store and the default settings factories
│   │   ├── types/       # mirrors the config schema
│   │   ├── utils/       # helpers; api.ts is the authed API client
│   │   └── views/       # pages
│   ├── public/  index.html  vite.config.ts
│   └── dist/            # build output, served by the backend in production
├── backend/             # Express API on Node 20+ (workspace: whoami-backend)
│   ├── src/
│   │   ├── auth/        # signature, sessions, throttle, middleware
│   │   ├── config/      # defaults, env seeding, paths, the config store
│   │   ├── db/          # the JSON file store
│   │   ├── routes/      # one file per resource
│   │   └── server/      # app wiring and the document-head injection
│   ├── config.json  db.json  uploads/   # runtime state, all gitignored
│   └── dist/            # compiled output
├── docker/              # Caddyfile baked into the frontend image
├── deploy/              # zinit units and the Caddyfile for a single-server deploy
└── docs/                # the manual: booklet.toml and content/
```

Data paths are overridable: `WHOAMI_DATA_DIR` moves `config.json`, `db.json` and `uploads/` off
`backend/`, and `WHOAMI_DIST_DIR` moves the frontend build off `frontend/dist`. The container
images set both, which is why they can lay the two builds out side by side.

## The one rule

**No personal data in the source tree.** Everything a site owner would want to change belongs in
config (edited from the admin dashboard) or in environment variables (first-run bootstrap). If you
find yourself typing a name, handle, URL, email or piece of site copy into a `.vue` or `.ts` file,
that is a bug. Add a config key instead.

The same goes for fallbacks. When a config value is empty the UI should render *nothing*, not a
placeholder standing in for somebody's real details.

## Config vs environment

- **Environment** seeds the first run and holds deployment concerns: ports, host, admin signature,
  proxy settings, initial identity. In production `validateEnvironment()` checks the required
  variables before the server binds a port and exits naming each problem. It only demands a variable
  when config cannot already supply the value, so an existing deployment never breaks when a new
  required variable is added.
- **Config** (`backend/config.json`, edited via the dashboard) owns everything after that. The
  bootstrap never overwrites a field the owner has since edited.

## Scripts

Run from the repository root; each delegates to the workspace that owns it. Equivalent `make`
targets exist for all of them.

| Script | Description |
| --- | --- |
| `yarn dev` | Frontend dev server with hot reload |
| `yarn server` | Backend API only |
| `yarn build` | Typecheck, then build both workspaces |
| `yarn start` | Production server, serving `frontend/dist` and the API together |
| `yarn typecheck` | `vue-tsc` for the frontend, `tsc` for the backend |
| `yarn lint` | ESLint across both |
| `yarn preview` | Preview the production bundle with Vite |
| `./scripts/check-identity.sh <url>` | Check a deployed site works as a Web Sign-In identity |

To work inside one workspace, `yarn workspace whoami-frontend <script>` or
`yarn workspace whoami-backend <script>`.

## Before opening a PR

```bash
yarn typecheck
yarn lint
yarn build
```

All three must pass. Check your change at 390px wide as well as on a desktop viewport; the dashboard
is used from a phone.

## Adding a config key

1. Add it to `defaultConfig` in `backend/src/config/defaults.ts`. That object is the schema
   contract; everything else follows it.
2. Add the type in `frontend/src/types/index.ts`.
3. Add it to the factory that owns that branch in `frontend/src/store/index.ts`: `defaultProfile()` for
   anything under `profile`, `defaultSettings()` for everything else. Forms build their starting
   state from these factories rather than hand-written literals, so a key missed here is a key that
   silently disappears the first time an unrelated form saves.
4. Mirror it in `backend/config.example.json`, which is the reference copy of the runtime config.
5. Read it in the component, hiding the UI when it is empty.
6. Expose it in the relevant dashboard form. Load it in `onMounted` from
   `settingsStore.getSettings()`, and on save write only your own slice back.
7. If it should be settable on a first boot, add it to `ENV_SPEC` and `ENV_SEED_MAP` in
   `backend/src/config/env.ts` and document it in both `.env.example` files and in
   `docs/content/05_reference/01_environment_variables.md`.

`deepBackfill` merges new default keys into existing config files on read, so no migration is needed.
Removing a key needs no migration either: a stale key left in somebody's `config.json` is ignored.

## Styles

Do not use `:global(.v-theme--light)` or `:global(.v-theme--dark)` as a prefix inside a `<style
scoped>` block. The compiler drops the selector without a warning, so the rule looks correct in the
source and never applies in the browser. Use a plain `.v-theme--light .thing` selector in a
non-scoped block, or read the theme through a CSS variable, which is what the palettes already are.

## Security

Never send the admin signature hash, its salt, or the anti-bot answer to the client. `publicConfig`
in `backend/src/config/store.ts` is the single place that strips them; extend it if you add another
secret. Every mutating endpoint must sit behind `requireAuth`.
