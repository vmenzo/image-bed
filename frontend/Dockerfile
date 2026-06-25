FROM node:20-bookworm-slim AS build

ARG VITE_API_BASE_URL=/api
ARG VITE_ALLOW_REGISTER=true
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_ALLOW_REGISTER=$VITE_ALLOW_REGISTER

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci --workspace frontend --include-workspace-root

COPY frontend frontend
RUN npm run build -w frontend

FROM node:20-bookworm-slim

WORKDIR /app/frontend

COPY --from=build /app/frontend/dist ./dist
COPY frontend/server.mjs ./server.mjs

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=7899

CMD ["node", "server.mjs"]
