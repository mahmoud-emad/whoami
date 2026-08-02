# Behind a Reverse Proxy

Terminate TLS at the proxy and forward to `PORT`.

## The one setting that matters

Set `TRUST_PROXY=1` so Express reads `X-Forwarded-For` and the login rate limiter sees the real
client IP instead of the proxy's. Without it, every request appears to come from the proxy, so one
visitor's failed logins lock out everybody.

Set it **only** when a proxy is actually in front. On a directly exposed port it lets a client forge
the header and sidestep the lockout entirely.

## nginx

An nginx location block is enough:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Caddy

`deploy/Caddyfile` is a working example from the project's own deployment: TLS, HSTS, a content
security policy, cache headers for hashed assets and uploads, and a single `reverse_proxy` to the
Node process.

## CORS

You only need `ALLOWED_ORIGINS` if you are hosting the frontend somewhere else, such as a static
host with the API on its own domain. The standard setup is same-origin and needs no CORS
exceptions.

## See also

- [Single server](01_single_server.md)
- [Environment variables](../05_reference/01_environment_variables.md)
