# The deployed API image. Its build context is the output of
#
#   pnpm exec turbo prune server --docker --out-dir <context>
#
# which holds only the server's workspace packages: json/ has their manifests
# and pruned lockfile, full/ their source. A change anywhere else in the
# repository leaves the context, the image, and the running service unchanged.

FROM node:22-bookworm-slim AS dependencies

WORKDIR /app
RUN npm install --global pnpm@11.25.0
COPY json/ ./
# The pnpm store and metadata cache stay in BuildKit caches, not in a layer.
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    --mount=type=cache,id=pnpm-metadata,target=/root/.cache/pnpm \
    pnpm install --frozen-lockfile --prod

FROM node:22-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app
COPY --from=dependencies /app ./
COPY full/ ./

USER node
WORKDIR /app/apps/server
EXPOSE 4000
# Node is the container's main process, so it receives the stop signal itself.
CMD ["node", "--import", "tsx", "src/index.ts"]
