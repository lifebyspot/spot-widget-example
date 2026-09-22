# Single container for the hosted demo: the Express backend serves the built
# React frontend, so the whole sample runs on one origin with one set of
# secrets. Local development does not use this file; see the README.

# ---------------------------------------------------------------------------
# Build the frontend. The widget reads its partner id and environment at build
# time, so they are baked into the bundle here. Both are public values.
# VITE_BFF_URL is intentionally empty: it makes the browser call this same
# origin instead of a separate backend host.
# ---------------------------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/
COPY apps/web-react/package.json apps/web-react/
COPY apps/web-vanilla/package.json apps/web-vanilla/
RUN pnpm install --frozen-lockfile

COPY . .

ARG VITE_SPOT_ENV=sandbox
ARG VITE_SPOT_PARTNER_ID
ENV VITE_SPOT_ENV=$VITE_SPOT_ENV
ENV VITE_SPOT_PARTNER_ID=$VITE_SPOT_PARTNER_ID
ENV VITE_BFF_URL=""
RUN pnpm --filter web-react build

# ---------------------------------------------------------------------------
# Runtime. Only the server workspace is installed, so the frontend toolchain
# does not ship. The server runs through tsx, matching `pnpm start` locally.
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runtime
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/
RUN pnpm install --frozen-lockfile --filter server

COPY apps/server ./apps/server
COPY --from=build /app/apps/web-react/dist ./public

ENV NODE_ENV=production
ENV PUBLIC_DIR=/app/public
ENV PORT=8787
EXPOSE 8787

# Secrets come from the platform at runtime, never from this image:
#   SPOT_PARTNER_ID, SPOT_CLIENT_ID, SPOT_CLIENT_SECRET, SPOT_WEBHOOK_HMAC_SECRET
CMD ["pnpm", "--filter", "server", "start"]
