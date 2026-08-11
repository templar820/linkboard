# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# backend/Dockerfile — Nest.js API (порт 8080)
# Stages: deps -> dev | build -> prod
# Compose ссылается на stage'ы по имени (target: dev / target: prod), поэтому
# имена "dev" и "prod" менять нельзя.
# ---------------------------------------------------------------------------

ARG NODE_VERSION=22-alpine

# ---------------------------------------------------------------------------
# deps — устанавливаем ЗАВИСИМОСТИ отдельным слоем.
# Копируем только манифесты (package*.json), поэтому пока не меняется
# package.json/package-lock.json, слой с node_modules переиспользуется из
# кеша даже при правках исходников — это ключевая оптимизация кеширования.
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# ---------------------------------------------------------------------------
# dev — цель для docker-compose (target: dev), hot-reload через Nest CLI
# (--watch). Исходники монтируются volume'ом из compose, поэтому COPY здесь
# не обязателен для разработки, но добавлен, чтобы образ был самодостаточным
# и мог запуститься без volume-моунта (например, в CI).
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS dev
ENV NODE_ENV=development
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json* ./
COPY . .

EXPOSE 8080

# HEALTHCHECK намеренно не задаётся здесь: healthcheck на GET /api/health
# уже настроен в docker-compose.yml для сервиса backend — дублировать его
# в образе не нужно (compose healthcheck имеет приоритет).

CMD ["npm", "run", "start:dev"]

# ---------------------------------------------------------------------------
# build — production-сборка (tsc через Nest CLI build).
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------------------------------------------------------------------------
# prod-deps — только production-зависимости (без devDependencies), отдельный
# слой, чтобы не тащить в финальный образ dev-тулинг (ts-node, nest-cli...).
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS prod-deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# ---------------------------------------------------------------------------
# prod — минимальный рантайм-образ, непривилегированный пользователь `node`
# (входит в официальный node:alpine образ "из коробки").
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS prod
ENV NODE_ENV=production
WORKDIR /app

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

USER node

EXPOSE 8080

# HEALTHCHECK не дублируется здесь — задан в docker-compose.yml (GET /api/health).

CMD ["node", "dist/main.js"]
