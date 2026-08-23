FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:20-alpine AS server-build
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=server-build /app/server/package*.json ./server/
RUN npm ci --omit=dev --prefix server
COPY --from=server-build /app/server/dist ./server/dist
COPY --from=server-build /app/server/data ./server/data
COPY --from=client-build /app/client/dist ./client/dist

EXPOSE 4000
CMD ["node", "server/dist/index.js"]
