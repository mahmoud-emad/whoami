# Single Server

The recommended setup. One Node process serves the built frontend and the API from the same origin,
so there is no CORS to configure and no API URL baked into the bundle.

## Building and starting

```bash
yarn install
yarn build                       # typechecks, then builds both workspaces
NODE_ENV=production yarn start
```

Build with `VITE_SERVER_URL` empty. The frontend then requests `/api` relative to whatever domain it
is served from, and the same `frontend/dist/` works under any hostname.

## Why one origin matters

In production the server injects real title, description and Open Graph tags into the HTML it
returns, so a crawler or a chat app link preview sees the right values without running JavaScript.
Those come from the Site meta tab.

The same injection adds the `rel="me"` links that make Web Sign-In work. Both only happen when this
process is the one answering for `index.html`.

## Keeping it running

Put it behind a process manager — systemd, zinit, or whatever your host provides — so it restarts on
boot and on crash. The `deploy/` directory holds the zinit units and the Caddyfile used by the
project's own deployment, as a worked example.

## See also

- [Docker](02_docker.md)
- [Behind a reverse proxy](03_reverse_proxy.md)
