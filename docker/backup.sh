#!/bin/sh
# Periodic backups of the whoami data volume.
#
# whoami's "database" is two JSON files and an uploads directory, so a backup is a tarball of
# /data. This runs as its own container alongside the app, with /data mounted read-only.
#
#   BACKUP_INTERVAL   seconds between runs (default 86400, daily)
#   BACKUP_KEEP       how many tarballs to keep (default 7)
#   BACKUP_ON_START   1 to take one immediately at startup (default 1)
#   BACKUP_ONCE       1 to take a single backup and exit, which is what `make backup` uses
#
# Runs on node:20-alpine, the same base as the app, so no extra image is pulled and JSON can be
# validated with node itself rather than adding jq.
set -eu

DATA_DIR="${DATA_DIR:-/data}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
INTERVAL="${BACKUP_INTERVAL:-86400}"
KEEP="${BACKUP_KEEP:-7}"
ON_START="${BACKUP_ON_START:-1}"
ONCE="${BACKUP_ONCE:-0}"

log() { printf '%s | backup | %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$1"; }

# The server writes config.json and db.json with a plain write, not a write-to-temp-then-rename,
# so a tarball taken during a save can catch a half-written file. Parsing both before accepting
# the run turns that rare race into a retry instead of a corrupt backup nobody notices until they
# need it.
data_is_consistent() {
	for f in "$DATA_DIR/config.json" "$DATA_DIR/db.json"; do
		[ -f "$f" ] || continue
		node -e 'JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"))' "$f" 2>/dev/null || return 1
	done
	return 0
}

take_backup() {
	attempt=1
	while [ "$attempt" -le 3 ]; do
		if data_is_consistent; then
			break
		fi
		log "JSON was mid-write, retrying in 5s (attempt ${attempt}/3)"
		sleep 5
		attempt=$((attempt + 1))
	done

	if ! data_is_consistent; then
		log "ERROR: config.json or db.json would not parse after 3 attempts; skipping this run"
		return 1
	fi

	mkdir -p "$BACKUP_DIR"
	stamp="$(date -u '+%Y%m%d-%H%M%S')"
	target="$BACKUP_DIR/whoami-${stamp}.tar.gz"

	# Write to a partial name first, so an interrupted run cannot leave something that looks like
	# a finished backup and gets counted against the retention limit.
	if tar czf "${target}.partial" -C "$DATA_DIR" . 2>/dev/null; then
		mv "${target}.partial" "$target"
		log "wrote $(basename "$target") ($(du -h "$target" | cut -f1))"
	else
		rm -f "${target}.partial"
		log "ERROR: tar failed"
		return 1
	fi

	# Retention: newest first, delete everything past the keep count.
	count="$(ls -1 "$BACKUP_DIR"/whoami-*.tar.gz 2>/dev/null | wc -l | tr -d ' ')"
	if [ "$count" -gt "$KEEP" ]; then
		ls -1t "$BACKUP_DIR"/whoami-*.tar.gz | tail -n "+$((KEEP + 1))" | while read -r old; do
			rm -f "$old"
			log "pruned $(basename "$old")"
		done
	fi
}

if [ "$ONCE" = "1" ]; then
	log "one-off run, keeping ${KEEP}, from ${DATA_DIR} to ${BACKUP_DIR}"
	take_backup
	exit $?
fi

log "started — every ${INTERVAL}s, keeping ${KEEP}, from ${DATA_DIR} to ${BACKUP_DIR}"

if [ "$ON_START" = "1" ]; then
	take_backup || true
fi

while true; do
	sleep "$INTERVAL"
	take_backup || true
done
