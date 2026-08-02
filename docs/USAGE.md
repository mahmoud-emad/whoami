# Usage

Everything you need after cloning the repo: getting it running, filling it with your own content,
changing the colours, joining the webring, and putting it on a server.

If you only want the short version, the README has a quick start. This page has the detail.

---

## 1. First run

You need Node 20 or newer and Yarn.

```bash
git clone <your fork> whoami
cd whoami
yarn install
cp .env.example .env
```

Open two terminals.

```bash
# Terminal 1: the backend API on http://localhost:3000
yarn server

# Terminal 2: the frontend with hot reload on http://localhost:5173
yarn dev
```

On the very first boot the server creates `backend/config.json` and `backend/db.json` from the
built-in defaults. If you did not set an admin password, it generates one and prints it to the
terminal running `yarn server`:

```
warn: ========================================================================
warn: No admin signature was set. Generated one: 3Kd9xQ2mVpLw
warn: Store it now. It is not recoverable and will not be printed again.
warn: Set ADMIN_SIGNATURE before first boot to choose your own.
warn: ========================================================================
```

That string is your dashboard password. It is called a "signature" throughout the code and the UI.
Copy it somewhere safe. It is stored as a salted scrypt hash, so nobody, including you, can read it
back out of the config file. If you lose it, delete `security.adminSignature` from
`backend/config.json` and restart to get a new one.

To pick your own instead, set `ADMIN_SIGNATURE` in `.env` before the first `yarn server`.

Then open <http://localhost:5173/admin>, paste the signature, and you are in. The login page is
deliberately not linked from anywhere on the site, so bookmark it.

The site will look empty. That is on purpose. Nothing is hardcoded, so a fresh clone shows nobody's
details, and every blank space is a prompt to fill something in.

---

## 2. How configuration works

There are two layers, and only one of them is in charge.

**Environment variables seed the first boot.** On startup the server looks at each field in
`backend/config.json`. If a field is still empty and a matching variable is set, it copies the value
in and logs what it did. If the field already holds something, it leaves it alone.

**The dashboard owns everything afterwards.** Once a value exists in `config.json`, no environment
variable can overwrite it. Editing `.env` after the first boot changes nothing.

This split exists so that a deploy is reproducible without being rigid. You can bring a server up
from a script with no manual steps, and you can then change your job title from your phone without
redeploying anything. It also means a stale `.env` sitting on an old server can never quietly revert
edits you made months ago.

In development nothing is mandatory. `yarn server` works on a fresh clone with an empty `.env`, and
missing values print warnings.

In production the server validates the environment before it binds a port, and exits with a message
naming each problem if something is wrong. It only demands a variable when the config cannot already
supply the value. So `ADMIN_SIGNATURE`, `SITE_OWNER` and `SITE_URL` are required for a brand new
deploy, and stop being required once the corresponding config fields are filled. A value that is
present but malformed (a bogus timezone, a relative site URL, a four character password) always
fails startup, because that is a typo rather than a choice.

---

## 3. Environment variables

Build time. Read by Vite and baked into the bundle.

| Variable | Required | Seeds | Notes |
| --- | --- | --- | --- |
| `VITE_SERVER_URL` | no | nothing | Base URL of the API. Use `http://localhost:3000` in development. Leave it **empty** for production builds so the frontend calls `/api` on whatever origin serves it. |

Runtime. Read by `backend/server.cjs` on every start.

| Variable | Required | Seeds | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | no | nothing | `production` turns on strict validation, serves `dist/`, and locks CORS down. |
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
| `TRUST_PROXY` | no | nothing | Set to `1` behind a reverse proxy so rate limiting sees the real client IP. |
| `ALLOWED_ORIGINS` | no | nothing | Comma separated CORS allowlist. Only needed if the frontend is served from a different origin than the API. |

Two notes on the required column. "Required" means required in production, and only until the field
it seeds has a value. And `WEBRING_ENABLED` is the one variable that can re-apply itself: an unset
boolean and a boolean you switched off both look like `false`, so if you turn the ring off in the
dashboard while `WEBRING_ENABLED=1` is still in the environment, the next restart turns it back on.
Drop the variable once the site is configured, as with all the others.

`.env` is gitignored. Do not commit it.

---

## 4. Managing content

There are two ways in, and they edit the same data.

### In place, while signed in

Sign in at `/admin`, then browse the site as normal. The owner controls appear on the public pages
themselves:

- **Projects**: a "New project" button above the list, and edit and delete icons on each card.
- **Blog and articles**: edit and delete on each entry, and a create button on the listing.
- **Guestbook**: delete on each entry.

Delete is two steps. The trash icon arms the action, a small "Delete?" confirmation appears next to
it, and it disarms itself after a few seconds if you do nothing.

Nothing owner-only is visible to a signed out visitor, and the buttons are a convenience rather than
a security boundary. The backend re-checks the token on every write regardless of what the interface
offered.

### The dashboard

`/admin-dashboard` still exists and covers everything, including the settings that have no place on
a public page. On a phone the tab rail collapses into a "Section" dropdown.

| Tab | What it owns |
| --- | --- |
| Profile | Name, role, bio, welcome lines, resume upload |
| Branding | Display name, handle, logo, copyright line, navigation items |
| More page | The cards and the small link list on `/more` |
| Socials | Email, Signal, GitHub, LinkedIn, X, timezone |
| Experience | Work history entries |
| Sections | Heading, emoji, intro, visibility and order of each home page section |
| Pages | Heading and intro copy for Contact, Projects, Blog, Guestbook, Search and the 404 page |
| Channels | Contact channels, if the five built in socials are not enough |
| Appearance | Default theme and both colour palettes, with the contrast readout |
| Site meta | Browser tab title, description, canonical URL, preview image, favicon, X handle, and the webring |
| Create a new project / article / post | Create forms |
| Edit a project / article / post / guestbook | Edit forms |
| Delete a project / article / post / guestbook | Delete forms |
| Uploads | Every uploaded file, with copy URL and delete |
| Configure Search engine | Whether search is on, and which collections it looks at |
| Site Settings | GitHub link, the dark/light toggle switch, whether the dashboard is reachable, and changing your signature |

The create, edit and delete tabs predate the in place controls. They do the same thing. Use whichever
suits you.

### Uploads

Images and PDFs up to 5 MB, in JPEG, PNG, GIF or PDF. The type and size limits are enforced on the
server. Files land in `backend/uploads/` and are served publicly at `/uploads/<filename>`, so an
`/uploads/...` path works anywhere the dashboard asks for an image URL, including the preview image
and the favicon.

### Search

`GET /api/search?q=...` is public and reads two settings. `configuration.enableSearch` turns it off
entirely, and `configuration.searchModels` decides which of projects, articles, posts and guestbooks
are looked at. Both live in the Configure Search engine tab. Only whitelisted fields are matched, so
a query can never reach a field that was not meant to be public.

### Guestbook anti-bot

The guestbook asks a question you choose. The question is public and is sent to the form. The answer
is stored server side only, is stripped from every public response, and is checked in the POST
handler after trimming and lowercasing. Nothing in the browser bundle knows the answer, which is the
whole point. Leave the answer empty to accept every submission.

---

## 5. Theming

Both palettes live in config, under `theme.dark` and `theme.light`, and the Appearance tab edits
them. There are ten colour slots per palette: background, text, borders, muted grey text, links,
link hover, box background, two accent backgrounds, and form fields. Each one has a colour picker
and a text field, and the text field accepts 6 digit hex or 8 digit hex with an alpha suffix.

`theme.defaultTheme` decides what a visitor gets before they touch anything. Their own choice is
remembered in local storage and always wins after that. The dark/light toggle in the footer only
appears when the two theme switch in Site Settings is on.

### The contrast readout

Above each palette, the form shows a live contrast measurement of your text colours against your
background, with a pass or fail chip:

```
text-color on background     4.83:1  AA pass
gray-color on background     3.10:1  AA fail
```

The number is the WCAG 2.1 contrast ratio. The threshold is **4.5:1**, which is the WCAG AA minimum
for normal size body text. Translucent colours are composited over the background before measuring,
so an alpha suffix does not hide a problem.

This matters because a palette that looks fine to you can be unreadable to somebody else. Low
contrast text is hardest on people with reduced vision, but it also fails for anyone on a dim phone
screen in daylight. It is the single most common accessibility defect on personal sites, and it is
also the easiest to avoid, because the fix is to darken one colour. This project shipped its own
light theme at 2.68:1 for a while, which is why the check is there.

If a colour cannot be read as hex, the chip says "not measurable" rather than guessing.

---

## 6. The webring

A webring is a loop of sites that link to each other. Each member's footer has a previous and a next
link, so a visitor can walk from site to site around the ring. It was how people found each other
before search engines, and it works well for personal sites that no algorithm will ever surface.

The default ring is the IndieWeb webring at <https://xn--sr8hvo.ws/>.

**You have to register yourself.** Enabling the setting does not join anything. Go to the ring's
site, follow its joining instructions, and wait for your site to be accepted.

There is no slug, key or member ID to configure. The ring exposes bare `/previous` and `/next`
endpoints and works out which member sent the visitor from the HTTP referrer. That is the entire
integration.

Turn it on in the dashboard under **Site meta**, in the Webring section, or seed it on first boot
with `WEBRING_ENABLED=1`. The section also lets you change the ring name and base URL if you joined
a different ring. Once it is on, the footer shows:

```
← IndieWeb Webring →
```

The links are hidden whenever the ring is off or the base URL is empty, so a half configured ring
never renders a dead arrow.

---

## 7. Deploying

### Single server

The recommended setup. One Node process serves the built frontend and the API from the same origin,
so there is no CORS to configure and no API URL baked into the bundle.

```bash
yarn install
yarn build                       # typechecks, then bundles into dist/
NODE_ENV=production yarn start
```

Build with `VITE_SERVER_URL` empty. The frontend then requests `/api` relative to whatever domain it
is served from, and the same `dist/` works under any hostname.

In production the server also injects real title, description and Open Graph tags into the HTML it
returns, so a crawler or a chat app link preview sees the right values without running JavaScript.
Those come from the Site meta tab.

Put it behind a process manager (systemd, zinit, or whatever your host provides) so it restarts on
boot and on crash.

### Docker

```bash
docker build -t whoami .
docker run -d -p 3000:3000 \
  -e NODE_ENV=production \
  -e ADMIN_SIGNATURE=your-signature \
  -e SITE_OWNER="Ada Lovelace" \
  -e SITE_URL=https://example.com \
  -v whoami-config:/app/backend \
  whoami
```

The volume matters. `backend/config.json`, `backend/db.json` and `backend/uploads/` are all runtime
state. Without a volume, every restart loses your content and your signature, and the container
generates a fresh password on each boot.

### Behind a reverse proxy

Terminate TLS at the proxy and forward to `PORT`. Set `TRUST_PROXY=1` so Express reads
`X-Forwarded-For` and the login rate limiter sees the real client IP instead of the proxy's, which
otherwise means one visitor's failed logins lock out everybody.

An nginx location block is enough:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

You only need `ALLOWED_ORIGINS` if you are hosting the frontend somewhere else, such as a static
host with the API on its own domain. The standard setup is same origin and needs no CORS exceptions.

---

## 8. Backups

Three paths hold everything that is yours. Nothing else in the tree is worth backing up, because it
is either source or it is rebuilt.

| Path | What it is |
| --- | --- |
| `backend/config.json` | Every setting, all your page copy, both palettes, and the hashed signature |
| `backend/db.json` | Projects, articles, blog posts, guestbook entries |
| `backend/uploads/` | Uploaded images and PDFs |

All three are gitignored, so a `git push` does not back them up. A nightly copy of the whole
`backend/` directory covers it:

```bash
tar czf whoami-backup-$(date +%F).tar.gz backend/config.json backend/db.json backend/uploads
```

To restore, stop the server, drop the three back in place, and start it again. Nothing else has to
match, because the config file carries its own schema and any keys added by a newer version are
backfilled from the defaults on the next read.

Two things to keep in mind. The backup contains your hashed signature, so treat it as a credential.
And restoring an old `config.json` restores the old signature along with everything else.
