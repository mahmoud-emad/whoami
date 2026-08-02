# Environment Variables

Every variable the project reads, what it seeds, and whether it is required.

## Build time

Read by Vite and baked into the bundle.

| Variable | Required | Seeds | Notes |
| --- | --- | --- | --- |
| `VITE_SERVER_URL` | no | nothing | Base URL of the API. Use `http://localhost:3000` in development. Leave it **empty** for production builds so the frontend calls `/api` on whatever origin serves it. |

## Runtime

Read by the backend on every start.

| Variable | Required | Seeds | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | no | nothing | `production` turns on strict validation, serves the frontend build, and locks CORS down. |
| `PORT` | no | nothing | Defaults to `3000`. Must be a whole number from 1 to 65535 or startup fails, in every environment. |
| `HOST` | no | nothing | Defaults to `0.0.0.0`. |
| `ADMIN_SIGNATURE` | **yes** | `security.adminSignature` | Dashboard password, minimum 8 characters. Hashed immediately; the plaintext is never stored. Generated and printed once if unset. |
| `SITE_OWNER` | **yes** | `profile.fullName`, `profile.brand.displayName`, `profile.brand.copyrightOwner`, `meta.title` | Your display name, for example `Ada Lovelace`. |
| `SITE_URL` | **yes** | `meta.siteUrl` | Public address of the site. Must be absolute. Used to build canonical and Open Graph URLs. |
| `SITE_ROLE` | no | `profile.role` | Job title shown under your name. |
| `SITE_HANDLE` | no | `profile.brand.handle` | Short handle, for example `@ada`. |
| `SITE_EMAIL` | no | `profile.socials.email` | Public contact email. |
| `SITE_GITHUB` | no | `profile.socials.githubUrl`, `configuration.githubURL`, `profile.brand.handleUrl` | GitHub profile URL. |
| `SITE_LINKEDIN` | no | `profile.socials.linkedinUrl` | LinkedIn profile URL. |
| `SITE_X` | no | `profile.socials.xUrl` | X / Twitter profile URL. |
| `SITE_TIMEZONE` | no | `profile.socials.timezone` | IANA zone, for example `Europe/Berlin`. Validated at startup. |
| `SITE_DESCRIPTION` | no | `meta.description` | One line about the site. Used for search results and link previews. |
| `ANTIBOT_QUESTION` | no | `configuration.antiBot.question` | Guestbook challenge question. Public. |
| `ANTIBOT_ANSWER` | no | `configuration.antiBot.answer` | The expected answer. Never sent to the browser. Leave empty to turn the check off. |
| `WEBRING_ENABLED` | no | `indieweb.webring.enabled` | Set to `1` to show the webring links in the footer. Accepts `1/0`, `true/false`, `yes/no`, `on/off`. |
| `TRUST_PROXY` | no | nothing | Set to `1` behind a reverse proxy so rate limiting sees the real client IP. Only there — see the warning below. |
| `ALLOWED_ORIGINS` | no | nothing | Comma-separated CORS allowlist. Only needed if the frontend is served from a different origin than the API. |
| `WHOAMI_DATA_DIR` | no | nothing | Where `config.json`, `db.json` and `uploads/` live. Defaults to `backend/`. The container images set it to `/data` so one volume holds every mutable file. |
| `WHOAMI_DIST_DIR` | no | nothing | Where the frontend build lives. Defaults to `frontend/dist`. Only worth setting when the two builds are not laid out as they are in a checkout, which is what the container images do. |

## Backup service

Read by the `backup` container in both compose files.

| Variable | Default | Description |
| --- | --- | --- |
| `BACKUP_INTERVAL` | `86400` | Seconds between runs. The default is daily. |
| `BACKUP_KEEP` | `7` | How many tarballs to keep. Older ones are pruned after each successful run. |
| `BACKUP_ON_START` | `1` | Take one immediately when the container starts. |
| `BACKUP_DIR` | `./backups` | Where the tarballs land on the host. |

## Two notes on the required column

"Required" means required in production, and only until the field it seeds has a value.

`WEBRING_ENABLED` is the one variable that can re-apply itself: an unset boolean and a boolean you
switched off both look like `false`, so if you turn the ring off in the dashboard while
`WEBRING_ENABLED=1` is still in the environment, the next restart turns it back on. Drop the
variable once the site is configured, as with all the others.

## A warning about TRUST_PROXY

Set it to `1` **only** when a reverse proxy is actually in front. It makes Express believe
`X-Forwarded-For`, which the login rate limiter counts against. Trusting that header on a directly
exposed port lets a client forge it and walk straight past the lockout.

`.env` is gitignored. Do not commit it.

## See also

- [How configuration works](../02_getting_started/02_configuration_model.md)
- [Behind a reverse proxy](../06_deployment/03_reverse_proxy.md)
