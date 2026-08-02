# Build the frontend, then run the Express server that serves both it and the API.
FROM node:20-alpine AS build

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
# VITE_SERVER_URL is deliberately left empty: the API is served from the same origin in
# production, so the bundle uses relative URLs and works under any domain without a rebuild.
ENV VITE_SERVER_URL=""
RUN yarn build


FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production && yarn cache clean

COPY --from=build /app/dist ./dist
COPY backend ./backend

# db.json, config.json and uploads/ are written at runtime — mount a volume here to keep the
# site's content and admin credentials across container restarts.
VOLUME ["/app/backend/uploads"]

EXPOSE 3000
CMD ["node", "backend/dist/index.js"]
