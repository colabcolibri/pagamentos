FROM node:22-bookworm-slim

RUN corepack enable && corepack prepare pnpm@12.4.2 --activate

WORKDIR /app
ENV HUSKY=0
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches ./patches
COPY packages/core/package.json packages/core/package.json
COPY front-pagamento/package.json front-pagamento/package.json

RUN pnpm install --frozen-lockfile

COPY packages/core packages/core
COPY front-pagamento front-pagamento

ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_AUTH_COOKIE_NAME
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_AUTH_COOKIE_NAME=$NEXT_PUBLIC_AUTH_COOKIE_NAME

RUN pnpm --filter @quitou/admin build && chown -R node:node /app

WORKDIR /app/front-pagamento
USER node
ENV PORT=3004
ENV HOSTNAME=0.0.0.0
EXPOSE 3004

CMD ["node", "node_modules/next/dist/bin/next", "start", "-H", "0.0.0.0", "-p", "3004"]
