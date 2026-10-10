FROM node:22-bookworm-slim AS base

WORKDIR /app
RUN npm install --global pnpm@11.25.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY infra/package.json infra/package.json
COPY packages/api/package.json packages/api/package.json
COPY packages/supabase/package.json packages/supabase/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json
COPY packages/ui/package.json packages/ui/package.json

# Local image: compose.yaml mounts the source and restarts the API on changes.
FROM base AS development

RUN pnpm install --frozen-lockfile --filter server...

COPY tsconfig.json ./
COPY apps/server ./apps/server
COPY packages ./packages

EXPOSE 4000
CMD ["pnpm", "--filter", "server", "start"]

# The pnpm store and metadata cache stay in BuildKit caches, not in a layer.
FROM base AS production-dependencies

RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    --mount=type=cache,id=pnpm-metadata,target=/root/.cache/pnpm \
    pnpm install --frozen-lockfile --prod --filter server...

# Deployed image: Node.js, runtime dependencies, and the API's source only.
FROM node:22-bookworm-slim AS production

ENV NODE_ENV=production
WORKDIR /app
COPY --from=production-dependencies /app ./
COPY apps/server ./apps/server
COPY packages/api ./packages/api
COPY packages/supabase ./packages/supabase

USER node
WORKDIR /app/apps/server
EXPOSE 4000
# Node is the container's main process, so it receives the stop signal itself.
CMD ["node", "--import", "tsx", "src/index.ts"]
