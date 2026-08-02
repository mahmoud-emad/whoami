# First Run

Getting a fresh clone running locally and signing in for the first time.

## Prerequisites

Node 20 or newer, and Yarn.

```bash
git clone <your fork> whoami
cd whoami
yarn install
cp .env.example .env
```

The repository is two Yarn workspaces, `frontend` and `backend`. A single `yarn install` at the root
sets up both.

## Starting both halves

Open two terminals.

```bash
# Terminal 1: the backend API on http://localhost:3000
yarn server

# Terminal 2: the frontend with hot reload on http://localhost:5173
yarn dev
```

## The admin signature

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

That string is your dashboard password. It is called a *signature* throughout the code and the UI.
Copy it somewhere safe. It is stored as a salted scrypt hash, so nobody — including you — can read
it back out of the config file. If you lose it, delete `security.adminSignature` from
`backend/config.json` and restart to get a new one.

To pick your own instead, set `ADMIN_SIGNATURE` in `.env` before the first `yarn server`.

## Signing in

Open <http://localhost:5173/admin>, paste the signature, and you are in. The login page is
deliberately not linked from anywhere on the site, so bookmark it.

## Filling in an empty site

The site will look empty. That is on purpose. Nothing is hardcoded, so a fresh clone shows nobody's
details, and every blank space is a prompt to fill something in.

Start in the dashboard's Branding tab to get your name and handle into the navbar, then Socials for
your links. Everything else — your intro, work history, projects, posts, contact channels — is
filled in on the pages themselves while you stay signed in.

## See also

- [How configuration works](02_configuration_model.md)
- [Managing content](../03_user_guide/01_managing_content.md)
