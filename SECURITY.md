# Security

## Reporting a vulnerability

Report privately, not in a public issue. Use GitHub's **Report a vulnerability** button under the
repository's Security tab, which opens a private advisory.

This is a personal project maintained in spare time, so please don't expect a fast response or a
coordinated-disclosure process. Reports that describe a concrete attack, with the steps to
reproduce it, are the useful ones.

## What is in scope

The parts of this project that hold a security boundary:

- **The admin signature.** Stored only as a salted scrypt hash plus its salt, and never included
  in `GET /api/settings`. Anything that returns the hash, the salt, or the plaintext to a client
  is a bug.
- **Bearer tokens.** Issued by `POST /api/auth/login`, kept in memory server side, valid for 12
  hours, and dropped on restart.
- **`requireAuth`.** Every mutating endpoint must sit behind it. The router guard on the dashboard
  and the in-place edit controls are convenience only — the backend is the boundary.
- **`POST /api/guestbooks`.** The only public write endpoint. It whitelists and length-caps its
  fields and checks the anti-bot answer server side.
- **Uploads.** Restricted by type and size, with the filename stripped of path components before
  it is written.

## Deploying it safely

- Set `ADMIN_SIGNATURE` yourself before the first boot, or record the one the server generates and
  prints exactly once.
- Set `TRUST_PROXY=1` **only** when a reverse proxy is in front. It makes Express believe
  `X-Forwarded-For`, which the login rate limiter counts against — trusting it on a directly
  exposed port lets a client forge the header and walk past the lockout.
- Terminate TLS at a proxy, or at the Caddy container in the split setup.
- `backend/config.json` contains the signature hash. Treat backups of it as credentials.
- Rotate the signature from the dashboard if a backup, a log or a screen recording may have
  exposed it. Changing it signs out every existing session.
