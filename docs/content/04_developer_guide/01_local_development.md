# Local Development

The repository layout, the scripts, and how to add a configuration key without breaking the ones
that already exist.

## Repository layout

Two Yarn workspaces. The root holds tooling and deployment files only — no application code.

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
├── docker/              # Caddyfile and the backup script used by the images
├── deploy/              # zinit units and the Caddyfile for a single-server deploy
└── docs/                # this manual
```

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
| `./scripts/check-identity.sh <url>` | Check a deployed site works as a Web Sign-In identity |

To work inside one workspace, `yarn workspace whoami-frontend <script>` or
`yarn workspace whoami-backend <script>`.

## The one rule

**No personal data in the source tree.** Everything a site owner would want to change belongs in
config or in an environment variable. If you find yourself typing a name, handle, URL, email or
piece of site copy into a `.vue` or `.ts` file, that is a bug — add a config key instead.

The same goes for fallbacks. When a config value is empty the UI should render *nothing*, not a
placeholder standing in for somebody's real details. CI enforces this with a grep over
`frontend/src/`.

## Adding a config key

1. Add it to `defaultConfig` in `backend/src/config/defaults.ts`. That object is the schema
   contract; everything else follows it.
2. Add the type in `frontend/src/types/index.ts`.
3. Add it to the factory that owns that branch in `frontend/src/store/index.ts`: `defaultProfile()`
   for anything under `profile`, `defaultSettings()` for everything else. Forms build their starting
   state from these factories rather than hand-written literals, so a key missed here is a key that
   silently disappears the first time an unrelated form saves.
4. Mirror it in `backend/config.example.json`.
5. Read it in the component, hiding the UI when it is empty.
6. Expose it in the relevant dashboard form. Load it in `onMounted` from
   `settingsStore.getSettings()`, and on save write only your own slice back.
7. If it should be settable on a first boot, add it to `ENV_SPEC` and `ENV_SEED_MAP` in
   `backend/src/config/env.ts` and document it in both `.env.example` files and in this manual.

`deepBackfill` merges new default keys into existing config files on read, so no migration is
needed. Removing a key needs no migration either: a stale key left in somebody's `config.json` is
ignored.

## Overridable paths

| Variable | Default | Why it exists |
| --- | --- | --- |
| `WHOAMI_DATA_DIR` | `backend/` | So a container can hold every mutable file on one volume without burying the compiled server that also lives under `backend/` |
| `WHOAMI_DIST_DIR` | `frontend/dist` | So an image can lay the two builds out side by side, where the repository's directory structure no longer exists |

## Styles

Do not use `:global(.v-theme--light)` or `:global(.v-theme--dark)` as a prefix inside a
`<style scoped>` block. The compiler drops the selector without a warning, so the rule looks correct
in the source and never applies in the browser. Use a plain `.v-theme--light .thing` selector in a
non-scoped block, or read the theme through a CSS variable, which is what the palettes already are.

## Before opening a PR

```bash
yarn typecheck
yarn lint
yarn build
```

All three must pass. Check your change at 390px wide as well as on a desktop viewport; the dashboard
is used from a phone.

## See also

- [API reference](../05_reference/02_api_reference.md)
- [Environment variables](../05_reference/01_environment_variables.md)
