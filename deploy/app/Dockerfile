# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@12.4.2 --activate
WORKDIR /app
ENV HUSKY=0
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches ./patches
COPY packages/core/package.json packages/core/package.json
COPY front-pagamento/package.json front-pagamento/package.json
RUN --mount=type=cache,id=pnpm-quitou,target=/root/.local/share/pnpm/store \
  pnpm install --frozen-lockfile

FROM deps AS builder
COPY packages/core packages/core
COPY front-pagamento front-pagamento

ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_AUTH_COOKIE_NAME
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_AUTH_COOKIE_NAME=$NEXT_PUBLIC_AUTH_COOKIE_NAME
ENV NEXT_OUTPUT_STANDALONE=1

RUN --mount=type=cache,id=next-quitou,target=/app/front-pagamento/.next/cache \
  pnpm --filter @quitou/admin build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3004
ENV HOSTNAME=0.0.0.0

COPY --from=builder --chown=node:node /app/front-pagamento/.next/standalone ./
COPY --from=builder --chown=node:node /app/front-pagamento/.next/static ./front-pagamento/.next/static
COPY --from=builder --chown=node:node /app/front-pagamento/public ./front-pagamento/public

USER node
EXPOSE 3004

CMD ["node", "front-pagamento/server.js"]
