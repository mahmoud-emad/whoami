# whoami

A self-hosted personal site you configure instead of fork and edit. Vue 3 and Vuetify on the front,
Express and two JSON files on the back. Clone it, sign in, and fill it in from the browser. No
rebuild, no code changes, nobody else's name left in the source.

> **A note on support.** This powers my website. It is open-source. However, I won't be supporting
> other people's use cases as this is just a personal project for personal use. If you're
> interested in doing something similar, I encourage you to take a look at the code.

<p align="center">
  <img src="docs/screenshot.png" width="900"
    alt="The home page in the dark theme: navbar, a rotating welcome line, the bio, and buttons for the CV and contact">
</p>

## What you get

- **Nothing hardcoded.** Every name, link, heading and piece of copy comes from config. A fresh
  clone shows an empty site, not somebody else's.
- **Edit in place.** Sign in and the public pages grow add, edit, reorder, hide and delete controls
  next to the thing they change. The dashboard holds site-wide settings, not a second copy of your
  content.
- **Configurable theme.** Both palettes live in config, with a live WCAG contrast readout so you
  can see when text drops below the 4.5:1 floor.
- **Real document head.** Title, description, Open Graph and Twitter tags and the favicon come from
  config, and the server injects them into the HTML so crawlers and link previews see them.
- **Content built in.** Projects, articles, a blog, work history, public checklists, a bookshelf, a
  guestbook and a "more" page — plus search across whichever of them you choose.
- **Real markdown posts.** Tables, syntax-highlighted code, Mermaid diagrams and KaTeX maths in a
  Write/Preview editor with image drop and paste. The heavy libraries load only when a post uses
  them.
- **Web Sign-In.** Your contact channels are served as `rel="me"` in the HTML itself, so you can
  sign in to other sites as your own domain via IndieLogin, no JavaScript required.
- **Authenticated API.** Every write endpoint sits behind a bearer token.
- **Responsive.** The dashboard works from a phone, not just the site.

**Stack:** Vue 3, TypeScript, Vuetify, Vue Router, Pinia. Express on Node 20+, storing everything in
JSON files. No database to run.

## Quick start

```bash
yarn install
cp .env.example .env

yarn server   # backend API on :3000
yarn dev      # frontend on :5173, in a second terminal
```

The first boot creates `backend/config.json` and `backend/db.json` and prints a generated admin
signature to the log, once:

```
warn: No admin signature was set. Generated one: 3Kd9xQ2mVpLw
warn: Store it now. It is not recoverable and will not be printed again.
```

Copy it, or set `ADMIN_SIGNATURE` in `.env` before the first run to choose your own. Then sign in at
<http://localhost:5173/admin> and start filling the site in.

For production, `yarn build` then `NODE_ENV=production yarn start`: one process serves the built
frontend and the API on the same origin.

## Run it with Docker

```bash
cp .env.example .env             # ADMIN_SIGNATURE, SITE_OWNER and SITE_URL are enough
docker compose up -d --build     # http://localhost:3000
```

There is no database container, and none is missing. Storage is two JSON files and an uploads
directory, so the `whoami-data` volume is the whole storage layer — back that up and you have
backed up the site.

Which the stack does for you: a `backup` service tars that volume into `./backups` daily, keeps
the last seven, and mounts the volume read-only so it can't damage what it's protecting. It parses
both JSON files first and skips the run rather than write a torn backup. `make backup` takes one
now, `make restore FILE=…` puts one back.

Three Dockerfiles are included:

| File | Builds |
| --- | --- |
| `Dockerfile` | The whole site in one container. Use this one. |
| `Dockerfile.backend` | The API alone. |
| `Dockerfile.frontend` | The built SPA behind Caddy, proxying `/api` to the backend. |

`docker-compose.split.yml` runs the second pair together. Only reach for it if the frontend truly
has to live somewhere else: the document head is injected by the Node server, so splitting them
means crawlers and link previews see the generic tags from `index.html` instead of your configured
ones.

To build and push your own images:

```bash
make docker-push IMAGE=ghcr.io/you/whoami TAG=v1.0.0
```

The `Publish images` workflow does the same on every push to the default branch and on every `v*`
tag, to the GitHub Container Registry, for amd64 and arm64.

## Configuration model

Environment variables seed `backend/config.json` on the first boot. The dashboard owns it from then
on. The server never overwrites a field you have edited, so a stale `.env` on an old server cannot
revert your changes.

In production the server validates the environment before it binds a port and exits naming each
problem. It only demands a variable when config cannot already supply the value, so
`ADMIN_SIGNATURE`, `SITE_OWNER` and `SITE_URL` are required for a new deploy and stop being
required once those fields are filled.

## Security model

- The admin signature is never stored or transmitted in plaintext. `config.json` holds a salted
  scrypt hash and its salt, and `GET /api/settings` never includes them.
- Logging in exchanges the signature for a bearer token, held in memory server side and in
  `sessionStorage` client side. Tokens last 24 hours, and are dropped when the tab closes or the
  server restarts.
- Failed logins are rate limited per IP: 5 attempts, then a 15 minute lockout. Set `TRUST_PROXY=1`
  behind a proxy so this counts real client IPs — and only there, since it means trusting a header
  the client sends.
- Every mutating endpoint sits behind `requireAuth`. The router guard and the in-place edit buttons
  are convenience; the backend is the security boundary.
- Changing the signature requires the current one and signs out every session.
- `POST /api/guestbooks` is the only public write endpoint. It whitelists and length-caps its
  fields and checks the anti-bot answer server side.
- `.env`, `backend/config.json`, `backend/db.json` and `backend/uploads/*` are gitignored. They
  hold credentials and per-deployment content, not source.

## Documentation

- **[docs/](docs/readme.md)** — the manual. First run and the configuration model, what each
  dashboard tab owns, theming and the contrast check, the webring and Web Sign-In, every
  environment variable, the API reference, deployment, and backups.
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — repository layout, how to add a config key, and the one
  rule: no personal data in the source tree.


## License

MIT. See [LICENSE](LICENSE).
