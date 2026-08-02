# Backups

Three paths hold everything that is yours. Nothing else in the tree is worth backing up, because it
is either source or it is rebuilt.

## What to back up

| Path | What it is |
| --- | --- |
| `backend/config.json` | Every setting, all your page copy, both palettes, and the hashed signature |
| `backend/db.json` | Projects, articles, blog posts, guestbook entries, lists, books |
| `backend/uploads/` | Uploaded images and PDFs |

All three are gitignored, so a `git push` does not back them up.

```bash
tar czf whoami-backup-$(date +%F).tar.gz backend/config.json backend/db.json backend/uploads
```

Under Docker the same three sit in `/data` on the `whoami-data` volume:

```bash
docker run --rm -v whoami-data:/data -v "$PWD":/backup alpine \
  tar czf /backup/whoami-backup-$(date +%F).tar.gz -C /data .
```

## The automatic backup service

Both compose files run a `backup` container alongside the app. It is the closest thing this project
has to a database backup job: on a timer it tars the data volume into `./backups` on the host, keeps
the most recent few, and deletes the rest.

| Variable | Default | What it does |
| --- | --- | --- |
| `BACKUP_INTERVAL` | `86400` | Seconds between runs. The default is daily. |
| `BACKUP_KEEP` | `7` | How many tarballs to keep. Older ones are pruned after each successful run. |
| `BACKUP_ON_START` | `1` | Take one immediately when the container starts. |
| `BACKUP_DIR` | `./backups` | Where the tarballs land on the host. |

Two details are what make the backups trustworthy:

- The data volume is mounted **read-only**, so the job cannot damage what it is protecting.
- The server writes `config.json` and `db.json` with a plain write rather than a
  write-to-temp-then-rename, so a tarball taken during a save could otherwise catch a half-written
  file. The job parses both before it accepts a run, retries up to three times, and skips the run
  entirely rather than write a corrupt backup. A skipped run is logged.

Each tarball is written under a `.partial` name and renamed only once `tar` succeeds, so an
interrupted run cannot leave something that looks finished.

## By hand

```bash
make backup          # take one now, same consistency check as the scheduled runs
make backup-list     # newest first
```

## Restoring

```bash
make restore FILE=backups/whoami-20260102-030000.tar.gz
```

That stops the app first, because restoring underneath a running server means it keeps serving — and
then rewrites — the state you just replaced.

To restore by hand, stop the server, drop the three paths back in place, and start it again. Nothing
else has to match: the config file carries its own schema, and any keys added by a newer version are
backfilled from the defaults on the next read.

## Treat backups as credentials

The backup contains your hashed signature, so treat it the way you would treat a password. Restoring
an old `config.json` restores the old signature along with everything else.

`backups/` is gitignored. Copy the tarballs off the host — a backup that only exists on the machine
it is backing up is not a backup.

## See also

- [Docker](../06_deployment/02_docker.md)
- [How configuration works](../02_getting_started/02_configuration_model.md)
