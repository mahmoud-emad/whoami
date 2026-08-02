# The whole site in one image: the Express server serves the built frontend and the API on the
# same origin, exactly as the single-server deployment does. This is the one to use unless you
# have a reason not to.
#
# Dockerfile.backend and Dockerfile.frontend split the same thing into two containers, for when
# the frontend belongs behind a CDN or an edge node of its own. Read the note at the top of
# Dockerfile.frontend first — the split costs you the server-rendered document head.
#
# Everything is built here; nothing is copied from the host but source, so the image comes out
# the same on a laptop and in CI.
#
#   docker build -t whoami .

# ---------------------------------------------------------------------------
# Build: install both workspaces and compile the frontend and the backend.
# ---------------------------------------------------------------------------
FROM node:20-alpine AS build

WORKDIR /app

# Manifests first, so a source-only change reuses the cached install layer.
COPY package.json yarn.lock ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/
RUN yarn install --frozen-lockfile

COPY . .

# Deliberately empty: in production the API is served from the same origin, so the bundle uses
# relative URLs and one image works under any domain without a rebuild.
ENV VITE_SERVER_URL=""
RUN yarn build


# ---------------------------------------------------------------------------
# Runtime: the backend's three production dependencies and the two build outputs.
#
# The backend manifest becomes the image's package.json. It carries `type: commonjs`, which the
# compiled output needs, and only express, cors and multer — none of the frontend's build-time
# dependencies follow it into the final image.
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    WHOAMI_DATA_DIR=/data \
    WHOAMI_DIST_DIR=/app/www

COPY backend/package.json ./package.json
COPY yarn.lock ./
RUN yarn install --production && yarn cache clean

COPY --from=build /app/backend/dist ./dist
COPY --from=build /app/frontend/dist ./www

# config.json, db.json and uploads/ are written here at runtime. It is a directory of its own so
# that mounting a volume over it persists the site's content without burying anything else.
RUN mkdir -p /data && chown -R node:node /data
VOLUME ["/data"]

USER node
EXPOSE 3000

# /api/health is what the frontend's own heartbeat polls; there is no separate liveness route.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Run under an init process (compose `init: true`, `docker run --init`) so SIGTERM reaches node as
# PID 1 and the container stops promptly instead of waiting out the kill timeout.
CMD ["node", "dist/index.js"]
