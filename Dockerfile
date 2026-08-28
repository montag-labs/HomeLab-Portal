FROM node:26-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:26-alpine AS server-build
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

FROM node:26-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV APP_ENV=production
ENV UPDATE_MODE=docker
COPY --chown=node:node --from=server-build /app/server/package*.json ./server/
RUN npm ci --omit=dev --prefix server
COPY --chown=node:node --from=server-build /app/server/dist ./server/dist
COPY --chown=node:node --from=server-build /app/server/data ./server/data
COPY --chown=node:node --from=server-build /app/server/data/config.default.json ./server/config.default.json
COPY --chown=node:node --from=client-build /app/client/dist ./client/dist
RUN mkdir -p /app/server/data/logs && chown -R node:node /app/server /app/client

USER node

EXPOSE 4000
CMD ["node", "server/dist/index.js"]
