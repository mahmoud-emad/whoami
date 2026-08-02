#!/bin/sh
# Launcher for Caddy, started by zinit.
# Drops root before exec — the binary carries cap_net_bind_service so it can still bind 80/443.
# Certificates and ACME state live under /var/lib/caddy.
set -e
export XDG_DATA_HOME=/var/lib/caddy
export XDG_CONFIG_HOME=/var/lib/caddy
exec /usr/bin/setpriv --reuid=caddy --regid=caddy --init-groups \
	/usr/bin/caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
