# Whoami

A self-hosted personal site you configure instead of fork and edit. Vue 3 and Vuetify on the front,
Express and two JSON files on the back. Clone it, sign in, and fill it in from the browser. No
rebuild, no code changes, no name of anyone else's left in the source.

<!-- TODO: drop a screenshot at docs/screenshot.png and uncomment the block below.
<p align="center">
  <img src="docs/screenshot.png" alt="The home page and the admin dashboard side by side" width="900">
</p>
-->
> **Screenshot goes here.** Add `docs/screenshot.png` and uncomment the block above this line.

## What you get

- **Nothing hardcoded.** Every name, link, heading and piece of copy comes from config. A fresh
  clone shows an empty site, not somebody else's.
- **Edit in place.** Sign in and the public pages grow create, edit and delete controls. The
  dashboard is still there for everything else.
- **Configurable theme.** Both palettes live in config, with a live WCAG contrast readout so you can
  see when your text drops below the 4.5:1 floor.
- **Real document head.** Title, description, Open Graph and Twitter tags, and the favicon come from
  config, and the server injects them into the HTML so crawlers and link previews see them.
- **Content built in.** Projects, articles, a blog, work history, a guestbook, and a "more" page.
- **Search.** Across whichever collections you choose to include.
- **Guestbook anti-bot.** A question you write. The answer stays on the server.
- **Uploads.** Images and PDFs, with a file manager in the dashboard.
- **IndieWeb webring.** Optional `← IndieWeb Webring →` links in the footer.
- **Authenticated API.** Every write endpoint is behind a bearer token.
- **Responsive.** The dashboard is usable from a phone, not just the site.

**Stack:** Vue 3, TypeScript, Vuetify, Vue Router, Pinia, VueUse. Express on Node 20+, with
file-based JSON storage. No database to run.

## Quick start

```bash
yarn install
cp .env.example .env

yarn server   # backend API on :3000
yarn dev      # frontend on :5173, in a second terminal
```

The first boot creates `backend/config.json` and `backend/db.json` and prints a generated admin
signature to the server log, once:

```
warn: No admin signature was set. Generated one: 3Kd9xQ2mVpLw
warn: Store it now. It is not recoverable and will not be printed again.
```

Copy it, or set `ADMIN_SIGNATURE` in `.env` before the first run to choose your own. Sign in at
<http://localhost:5173/admin> and start filling the site in.

For production, `yarn build` then `NODE_ENV=production yarn start`. One process serves the built
frontend and the API on the same origin.

**[docs/USAGE.md](docs/USAGE.md) has the rest**: every environment variable, what each dashboard tab
owns, theming and the contrast check, the webring, Docker and reverse proxy setups, and what to back
up.

## Configuration model

Environment variables seed `backend/config.json` on the first boot. The dashboard owns it from then
on. The server never overwrites a field you have edited, so a stale `.env` on an old server cannot
revert your changes.

In production the server validates the environment before it binds a port and exits with a message
naming each problem. It only demands a variable when the config cannot already supply the value, so
`ADMIN_SIGNATURE`, `SITE_OWNER` and `SITE_URL` are required for a new deploy and stop being required
once those fields are filled.

## Security model

- The admin signature is never stored or transmitted in plaintext. `config.json` holds a salted
  scrypt hash and its salt, and `GET /api/settings` never includes them.
- Logging in exchanges the signature for a bearer token, held in memory server side and in
  `sessionStorage` client side. Tokens last 12 hours and are dropped on restart.
- Failed logins are rate limited per IP: 5 attempts, then a 15 minute lockout. Set `TRUST_PROXY=1`
  behind a proxy so this counts real client IPs.
- Every mutating endpoint sits behind `requireAuth`. The router guard on `/admin-dashboard` and the
  in place edit buttons are convenience. The backend is the security boundary.
- Changing the signature requires the current one and signs out every session.
- `POST /api/guestbooks` is the only public write endpoint. It whitelists and length caps its fields
  and checks the anti-bot answer server side.
- `.env`, `backend/config.json`, `backend/db.json` and `backend/uploads/*` are gitignored. They hold
  credentials and per-deployment content, not source.

## API

Everything is namespaced under `/api`. 🔒 marks endpoints that require
`Authorization: Bearer <token>`.

| Endpoint | Description |
| --- | --- |
| `GET /api` · `GET /api/health` | API index and health check |
| `POST /api/auth/login` | Exchange the admin signature for a token |
| `POST /api/auth/logout` 🔒 | Invalidate the current token |
| `GET /api/auth/session` | Report whether a token is still valid |
| `POST /api/auth/signature` 🔒 | Change the admin signature |
| `GET /api/settings` | Public site settings, never including credentials |
| `POST /api/settings` 🔒 | Update site settings |
| `GET /api/search?q=` | Search the enabled collections |
| `GET /api/guestbooks` · `POST /api/guestbooks` | List and sign the guestbook (both public) |
| `PUT`/`DELETE /api/guestbooks/:id` 🔒 | Edit or remove an entry |
| `GET /api/projects` · `/api/articles` · `/api/posts` | Public content listings |
| `POST`/`PUT`/`DELETE` on those 🔒 | Content management |
| `POST /api/upload` 🔒 | Upload a file (JPEG, PNG, GIF or PDF, up to 5 MB) |
| `GET /api/uploads` 🔒 · `DELETE /api/uploads/:filename` 🔒 | Manage uploaded files |

Uploaded files are served publicly from `/uploads/<filename>`.

## Scripts

| Script | Description |
| --- | --- |
| `yarn dev` | Frontend dev server with hot reload |
| `yarn server` | Backend API only |
| `yarn build` | Typecheck, then bundle into `dist/` |
| `yarn start` | Production server, serving `dist/` and the API together |
| `yarn typecheck` | `vue-tsc` only |
| `yarn lint` | ESLint |
| `yarn preview` | Preview the production bundle with Vite |

Equivalent `make` targets exist for each (`make build`, `make start`, `make check`, and so on).

## Layout

```
├── src/
│   ├── components/
│   │   ├── admin/       # In place owner controls
│   │   ├── forms/       # Dashboard forms, one per tab
│   │   └── home/        # Home page sections
│   ├── composables/     # useAdmin, useFormFeedback, useDocumentHead
│   ├── layouts/         # Layout components
│   ├── plugins/         # Vuetify, fed from config
│   ├── router/          # Routes and the admin guard
│   ├── store/           # Pinia store and the default settings factories
│   ├── types/           # TypeScript types, mirroring the config schema
│   ├── utils/           # Helpers; api.ts is the authed API client
│   └── views/           # Pages
├── backend/
│   ├── server.cjs           # Express: API, config, auth, static serving
│   ├── config.example.json  # Reference copy of the runtime config
│   └── uploads/             # Uploaded files (gitignored)
└── docs/                # USAGE.md and the open source plan
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The one rule is that no personal data belongs in the source
tree. If you are typing a name, handle, URL or piece of site copy into a `.vue` or `.ts` file, add a
config key instead.

## License

MIT. See [LICENSE](LICENSE).
