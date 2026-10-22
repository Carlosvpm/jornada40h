# Build a partir da raiz do repositório (contexto "."): o painel reaproveita site/app e site/js.
FROM node:22-bookworm-slim AS deps
WORKDIR /repo/painel
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY painel/package.json painel/package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-bookworm-slim AS build
WORKDIR /repo
COPY site/app site/app
COPY site/js/escala.js site/js/escala.js
COPY painel painel
COPY --from=deps /repo/painel/node_modules painel/node_modules
WORKDIR /repo/painel
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3040 HOSTNAME=0.0.0.0 DATA_DIR=/data
COPY --from=build /repo/painel/.next/standalone ./
COPY --from=build /repo/painel/.next/static ./.next/static
COPY --from=build /repo/painel/public ./public
RUN mkdir -p /data && chown -R node:node /data
USER node
VOLUME /data
EXPOSE 3040
CMD ["node", "server.js"]
