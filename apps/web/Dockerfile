# Build context is the repository root: docker build -f apps/web/Dockerfile .

FROM node:24.21.0-slim AS base
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    HUSKY=0 \
    NX_NO_CLOUD=true
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Local development. Source code is synced by docker compose watch.
FROM deps AS dev
# Nx disables its daemon inside Docker, but file watching needs it.
ENV NX_DAEMON=true
COPY . .
EXPOSE 4200
CMD ["pnpm", "nx", "serve", "web", "--host", "0.0.0.0"]

# Production build of static files: the app and Storybook.
FROM deps AS build
COPY . .
RUN pnpm nx build web && pnpm nx run storybook:build-storybook

# Image deployed to the cluster: nginx without root, listening on 8080.
FROM nginxinc/nginx-unprivileged:1.30.5-alpine3.24 AS prod
# Off unless the deployment turns it on. The template needs a value.
ENV STORYBOOK_ENABLED=false
COPY apps/web/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/apps/web/browser /usr/share/nginx/html
COPY --from=build /app/dist/storybook /usr/share/nginx/storybook
EXPOSE 8080
