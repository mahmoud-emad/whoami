# Image coordinates. Override on the command line or from the environment:
#   make docker-push IMAGE=ghcr.io/you/whoami TAG=v1.2.0
IMAGE ?= whoami
TAG   ?= latest

.PHONY: install dev server build start lint typecheck check \
        docker-build docker-run docker-push docker-build-split docker-push-split \
        up up-split down logs backup backup-list restore

install:
	yarn install

# --- development (two terminals) ---
# frontend with hot reload; talks to the backend on port 3000
dev:
	yarn dev

# backend API only
server:
	yarn server

# --- production ---
# typecheck + build both workspaces
build:
	yarn build

# serve the frontend and the API from one process on $PORT (default 3000)
start: build
	yarn start

# --- checks ---
lint:
	yarn lint

typecheck:
	yarn typecheck

check: typecheck lint

# --- container: one image, frontend and API together ---
docker-build:
	docker build -t $(IMAGE):$(TAG) .

docker-run:
	docker run --rm --init -p 3000:3000 \
		-e ADMIN_SIGNATURE=$${ADMIN_SIGNATURE} \
		-e SITE_OWNER=$${SITE_OWNER} \
		-e SITE_URL=$${SITE_URL} \
		-v whoami-data:/data \
		$(IMAGE):$(TAG)

docker-push: docker-build
	docker push $(IMAGE):$(TAG)

# --- container: the two-image split ---
docker-build-split:
	docker build -f Dockerfile.backend -t $(IMAGE)-backend:$(TAG) .
	docker build -f Dockerfile.frontend -t $(IMAGE)-frontend:$(TAG) .

docker-push-split: docker-build-split
	docker push $(IMAGE)-backend:$(TAG)
	docker push $(IMAGE)-frontend:$(TAG)

# --- compose ---
up:
	docker compose up -d --build

up-split:
	docker compose -f docker-compose.split.yml up -d --build

down:
	docker compose down

logs:
	docker compose logs -f

# --- backups ---
# The compose stack runs a backup service on a schedule. These are for doing it by hand.

# Take one now, without waiting for the timer. Runs the same script the service runs, with the
# loop disabled, so a manual backup gets the same JSON consistency check as a scheduled one.
backup:
	@mkdir -p backups
	docker run --rm \
		-v whoami-data:/data:ro \
		-v "$(PWD)/backups":/backups \
		-v "$(PWD)/docker/backup.sh":/backup.sh:ro \
		-e BACKUP_ON_START=1 -e BACKUP_ONCE=1 \
		node:20-alpine sh /backup.sh
	@ls -1t backups | head -1

backup-list:
	@ls -1t backups 2>/dev/null || echo "no backups yet"

# Restore a tarball over the data volume. Stops the app first, because restoring underneath a
# running server means it keeps serving — and then rewrites — the state you just replaced.
#   make restore FILE=backups/whoami-20260102-030000.tar.gz
restore:
	@test -n "$(FILE)" || { echo "usage: make restore FILE=backups/whoami-....tar.gz"; exit 1; }
	@test -f "$(FILE)" || { echo "no such file: $(FILE)"; exit 1; }
	docker compose stop whoami
	docker run --rm -v whoami-data:/data -v "$(PWD)/$(dir $(FILE))":/restore alpine \
		sh -c 'rm -rf /data/* /data/..?* 2>/dev/null; tar xzf /restore/$(notdir $(FILE)) -C /data'
	docker compose start whoami
	@echo "restored $(FILE)"
