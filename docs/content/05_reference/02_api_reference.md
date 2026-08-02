# API Reference

Everything is namespaced under `/api`. There is no OpenRPC or OpenAPI spec for this project, so the
table below is the reference.

## Authentication

The **Auth** column below marks endpoints that require `Authorization: Bearer <token>`.
`POST /api/auth/login` issues that token in exchange for the admin signature.

```bash
TOKEN=$(curl -s -X POST https://example.com/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"signature":"your-signature"}' | jq -r .token)

curl -s https://example.com/api/uploads -H "Authorization: Bearer $TOKEN"
```

Tokens are held in memory server side, last 24 hours, and are dropped on restart. Changing the
signature invalidates every existing token.

## Endpoints

| Endpoint | Auth | Description |
| --- | --- | --- |
| `GET /api` · `GET /api/health` | no | API index and health check |
| `POST /api/auth/login` | no | Exchange the admin signature for a token |
| `POST /api/auth/logout` | yes | Invalidate the current token |
| `GET /api/auth/session` | no | Report whether a token is still valid |
| `POST /api/auth/signature` | yes | Change the admin signature |
| `GET /api/settings` | no | Public site settings, never including credentials |
| `POST /api/settings` | yes | Update site settings |
| `GET /api/search?q=` | no | Search the enabled collections |
| `GET /api/guestbooks` · `POST /api/guestbooks` | no | List and sign the guestbook |
| `PUT`/`DELETE /api/guestbooks/:id` | yes | Edit or remove an entry |
| `GET /api/projects` · `/api/articles` · `/api/posts` | no | Public content listings |
| `POST`/`PUT`/`DELETE` on those | yes | Content management |
| `GET`/`POST /api/posts/:id/reactions` | no | Read or cast an anonymous up/down vote |
| `GET /api/lists` · `GET /api/lists/:slug` | no | Public checklists |
| `POST`/`PUT`/`DELETE /api/lists` | yes | Manage checklists, ticking a box included |
| `GET /api/books` | no | The public bookshelf |
| `POST`/`PUT`/`DELETE /api/books` | yes | Manage the shelf |
| `POST /api/upload` | yes | Upload a file (JPEG, PNG, GIF or PDF, up to 5 MB) |
| `GET /api/uploads` · `DELETE /api/uploads/:filename` | yes | Manage uploaded files |

Uploaded files are served publicly from `/uploads/<filename>`.

## The two public write endpoints

Everything else that writes is behind a token. These are not:

- `POST /api/guestbooks` — whitelists and length-caps its fields and checks the anti-bot answer
  server side.
- `POST /api/posts/:id/reactions` — throttled to 20 writes per minute per address.

## Root-mounted endpoints

When the backend runs without a frontend build next to it — the split container setup — every
endpoint is also served at the root, without the `/api` prefix. There are no client-side routes to
collide with in that mode.

## See also

- [Reactions, uploads and search](../03_user_guide/04_reactions_uploads_search.md)
- [Local development](../04_developer_guide/01_local_development.md)
