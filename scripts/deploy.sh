#!/usr/bin/env bash
#
# Redeploy the portfolio to the production server.
#
#   ./scripts/deploy.sh
#
# Ships the working tree (not a git ref), rebuilds on the server, and restarts the service.
# Deliberately never touches:
#   /var/lib/whoami/config.json   site settings + admin signature hash
#   /var/lib/whoami/db.json       posts, projects, articles, guestbook
#   /var/lib/whoami/uploads/      uploaded files
#   /etc/whoami/env               runtime environment
set -euo pipefail

HOST="${DEPLOY_HOST:-root@185.206.122.33}"
APP_DIR=/opt/whoami

say() { printf '\n\033[1;34m==>\033[0m %s\n' "$1"; }

say "Checking the build locally before shipping anything"
yarn typecheck
yarn lint

say "Syncing source to ${HOST}:${APP_DIR}"
rsync -az --delete \
	--exclude 'node_modules' \
	--exclude 'dist' \
	--exclude '.git' \
	--exclude '.env' \
	--exclude '.env.production' \
	--exclude 'backend/config.json' \
	--exclude 'backend/db.json' \
	--exclude 'backend/uploads' \
	--exclude 'backend/dist' \
	--exclude '.DS_Store' \
	--exclude '*.log' \
	-e "ssh -o BatchMode=yes" \
	./ "${HOST}:${APP_DIR}/"

say "Installing dependencies and rebuilding on the server"
# shellcheck disable=SC2087
ssh -o BatchMode=yes "$HOST" bash -euo pipefail <<'REMOTE'
cd /opt/whoami

# The symlinks into /var/lib/whoami are recreated because --delete may have removed them.
ln -sfn /var/lib/whoami/uploads     /opt/whoami/backend/uploads
ln -sfn /var/lib/whoami/config.json /opt/whoami/backend/config.json
ln -sfn /var/lib/whoami/db.json     /opt/whoami/backend/db.json

# devDependencies are needed for the build, then pruned again.
yarn install --frozen-lockfile
VITE_SERVER_URL="" yarn build
# `yarn build` compiles the backend too, so backend/dist exists before the service restarts.
yarn install --production --frozen-lockfile

chown -R root:root /opt/whoami
chmod -R go-w /opt/whoami
chmod 755 /opt/whoami/deploy/bin/*.sh

# Install the zinit units from the repo. A changed unit needs forget+monitor: zinit caches the
# old definition and a plain restart would keep running the previous command.
for u in whoami caddy firewall; do
	src="/opt/whoami/deploy/zinit/${u}.yaml"
	dst="/etc/zinit/${u}.yaml"
	if ! cmp -s "$src" "$dst"; then
		echo "  unit ${u} changed — reloading"
		cp "$src" "$dst"
		zinit stop "$u"   2>/dev/null || true
		sleep 2
		zinit forget "$u" 2>/dev/null || true
		sleep 1
		zinit monitor "$u" 2>/dev/null || true
		sleep 3
	fi
done

# Install the Caddyfile only if it validates, so a bad edit can never take the site down.
if ! cmp -s /opt/whoami/deploy/Caddyfile /etc/caddy/Caddyfile; then
	cp /opt/whoami/deploy/Caddyfile /tmp/Caddyfile.new
	if caddy validate --config /tmp/Caddyfile.new >/dev/null 2>&1; then
		echo "  Caddyfile changed — reloading"
		cp /tmp/Caddyfile.new /etc/caddy/Caddyfile
		XDG_DATA_HOME=/var/lib/caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
	else
		echo "  WARNING: new Caddyfile failed validation; keeping the running config" >&2
	fi
	rm -f /tmp/Caddyfile.new
fi

zinit stop whoami   || true
sleep 2
zinit start whoami  || true
sleep 4
zinit list
REMOTE

say "Verifying the site is serving"
for i in 1 2 3 4 5; do
	code=$(curl -s -m 10 -o /dev/null -w '%{http_code}' https://mahmoud-emad.dev/ || echo 000)
	api=$(curl -s -m 10 -o /dev/null -w '%{http_code}' https://mahmoud-emad.dev/api/health || echo 000)
	if [ "$code" = "200" ] && [ "$api" = "200" ]; then
		printf '   site %s | api %s — deploy OK\n' "$code" "$api"
		exit 0
	fi
	printf '   attempt %s: site %s | api %s, retrying…\n' "$i" "$code" "$api"
	sleep 5
done

echo "Deploy finished but the site did not return 200. Check: ssh $HOST 'zinit list; timeout 5 zinit log whoami'" >&2
exit 1
