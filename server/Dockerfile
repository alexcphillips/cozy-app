# Build context is the REPO ROOT (see docker-compose.yml), because the server
# workspace depends on ../shared and on the root lockfile.
FROM node:20-alpine

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Workspace manifests first, so `npm ci` is cached until a dependency changes.
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY shared/package.json ./shared/

RUN npm ci --workspaces --include-workspace-root && npm install -g tsx

COPY tsconfig.base.json ./
COPY shared ./shared
COPY server ./server

EXPOSE 8080

USER node

CMD ["tsx", "server/src/index.ts"]
