# Build context is the REPOSITORY ROOT (not apps/api) — this is a pnpm
# workspace, so the lockfile and hoisted deps live at the root. Build with:
#   docker build -f apps/api/Dockerfile -t smm-api .
# from the repo root.

FROM node:24-slim AS base
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /repo

FROM base AS build
# Only the manifests first, so `pnpm install` is cached across source changes.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json .npmrc ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile

COPY apps/api apps/api
RUN pnpm --filter api exec prisma generate
RUN pnpm --filter api run build
# pnpm's own monorepo-aware deploy: copies apps/api's built output plus a
# pruned, production-only node_modules (workspace deps resolved, dev deps
# and other apps' code excluded) into a single self-contained directory.
RUN pnpm --filter api deploy --prod /deploy/api
# `pnpm deploy` re-links node_modules from its own store rather than
# copying the build stage's node_modules verbatim, so the Prisma Client
# generated above never makes it into /deploy/api — regenerate it directly
# inside the deployed tree so dist/prisma/prisma.service.js can find it.
RUN cd /deploy/api && node_modules/.bin/prisma generate

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /deploy/api ./
EXPOSE 3001
# migrate deploy (not `migrate dev`) — applies pending migrations without
# ever prompting or generating a new one. Safe to run on every boot: a
# no-op when the schema is already up to date.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/main.js"]
