#!/bin/sh
# Launcher for the Whoami portfolio backend, started by zinit.
# Loads the runtime environment, then drops root before exec-ing node. The service binds to
# 127.0.0.1 only — Caddy is the sole public entrypoint.
set -e
set -a
. /etc/whoami/env
set +a
exec /usr/bin/setpriv --reuid=whoami --regid=whoami --init-groups \
	/usr/bin/node /opt/whoami/backend/server.cjs
