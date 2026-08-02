# Docker

Three Dockerfiles and two compose files. The single-container image is the one to use unless you
have a specific reason not to.

## The images

| File | Builds |
| --- | --- |
| `Dockerfile` | The whole site in one container — frontend and API, one origin |
| `Dockerfile.backend` | The API alone |
| `Dockerfile.frontend` | The built SPA behind Caddy, proxying `/api` to the backend |

```bash
docker build -t whoami .
docker run -d --init -p 3000:3000 \
  -e ADMIN_SIGNATURE=your-signature \
  -e SITE_OWNER="Ada Lovelace" \
  -e SITE_URL=https://example.com \
  -v whoami-data:/data \
  whoami
```

The volume matters. `config.json`, `db.json` and `uploads/` all live in `/data` and are written at
runtime. Without a volume every restart loses your content and your signature, and the container
generates a fresh admin password on each boot.

`--init` gives the container a real init process, so `docker stop` reaches Node as PID 1 and the
container exits promptly instead of waiting out the ten-second kill timeout.

## What the split costs you

`Dockerfile.backend` and `Dockerfile.frontend` split the same application into an API container and
a Caddy container serving the built SPA. Take that route only when the frontend genuinely has to
live elsewhere.

The document head is injected by the Node server, and only when that server is the one answering for
`index.html`. Split them and crawlers, link previews and IndieLogin get the generic tags compiled
into `index.html` instead of your configured ones.

## Compose

```bash
cp .env.example .env             # ADMIN_SIGNATURE, SITE_OWNER and SITE_URL are enough
docker compose up -d --build     # http://localhost:3000
```

Compose reads `.env` on its own, and the same env-seeds-config rule applies: those variables fill
empty fields on the first boot and are ignored afterwards.

For the two-container split:

```bash
docker compose -f docker-compose.split.yml up -d --build   # http://localhost:8080
```

Caddy serves the SPA and proxies `/api` and `/uploads` to the backend, so the browser still sees a
single origin. Set `SITE_ADDRESS=example.com` and publish 80 and 443 to have Caddy obtain a
certificate itself.

## There is no database container

And none is missing. Storage is two JSON files and an uploads directory, so the `whoami-data` volume
is the entire storage layer. Both compose files run a `backup` service against it — see
[Backups](../07_operations/01_backups.md).

## Running published images

Both files build from source by default. To run a published image instead, set `WHOAMI_IMAGE` (or
`WHOAMI_BACKEND_IMAGE` / `WHOAMI_FRONTEND_IMAGE`) to the tag you pushed.

To build and push your own:

```bash
make docker-push IMAGE=ghcr.io/you/whoami TAG=v1.0.0
```

The `Publish images` GitHub Actions workflow does the same on every push to the default branch and
on every `v*` tag, for amd64 and arm64.

## See also

- [Single server](01_single_server.md)
- [Backups](../07_operations/01_backups.md)
