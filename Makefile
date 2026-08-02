.PHONY: install runserver runclient dev server build start lint typecheck check docker-build docker-run

install:
	yarn install

# --- development (two terminals) ---
# frontend with hot reload; talks to the backend on port 3000
runclient dev:
	yarn dev

# backend API only
runserver server:
	yarn server

# --- production ---
# typecheck + bundle the frontend into dist/
build:
	yarn build

# serve the frontend and API from one process on $PORT (default 3000)
start: build
	yarn start

# --- checks ---
lint:
	yarn lint

typecheck:
	yarn typecheck

check: typecheck lint

# --- container ---
docker-build:
	docker build -t whoami .

docker-run:
	docker run --rm -p 3000:3000 \
		-e ADMIN_SIGNATURE=$${ADMIN_SIGNATURE} \
		-v whoami-uploads:/app/backend/uploads \
		whoami
