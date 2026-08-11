# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# frontend/Dockerfile — Vite + React admin-panel (порт 3000)
# Stages: deps -> dev | build -> prod
# Compose ссылается на stage'ы по имени (target: dev / target: prod), поэтому
# имена "dev" и "prod" менять нельзя.
# ---------------------------------------------------------------------------

ARG NODE_VERSION=22-alpine

# ---------------------------------------------------------------------------
# deps — устанавливаем зависимости отдельным слоем (кеш инвалидируется только
# при изменении package.json/package-lock.json, не при правке src/).
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# ---------------------------------------------------------------------------
# dev — Vite dev-сервер с HMR. Порт 3000, обязательно --host 0.0.0.0, иначе
# Vite слушает только 127.0.0.1 внутри контейнера и порт не пробросится
# наружу через docker-compose ports-маппинг. Исходники в разработке
# монтируются volume'ом из compose; COPY . . здесь — чтобы образ был рабочим
# и без volume-моунта (CI/standalone run).
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS dev
ENV NODE_ENV=development
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json* ./
COPY . .

EXPOSE 3000

# HEALTHCHECK не дублируется здесь — задан в docker-compose.yml (HTTP 200 на /).

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]

# ---------------------------------------------------------------------------
# build — production-сборка статики Vite (dist/).
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------------------------------------------------------------------------
# prod — раздача статики через nginx (не `vite preview`).
#
# Обоснование выбора nginx вместо `vite preview`:
#   - `vite preview` официально не предназначен для production (сам Vite
#     предупреждает об этом в документации) — это dev-инструмент для
#     локальной проверки сборки, не хардened HTTP-сервер.
#   - nginx:alpine отдаёт статику быстрее, поддерживает gzip/кеш-заголовки,
#     не тащит Node.js рантайм и npm-зависимости в финальный образ →
#     меньше итоговый размер и площадь атаки.
#   - Используется nginxinc/nginx-unprivileged — сборка nginx, изначально
#     сконфигурированная для запуска от непривилегированного пользователя
#     (в отличие от официального nginx:alpine, где master-процесс стартует
#     от root, а до non-root понижаются только worker-процессы).
#
# SPA fallback (try_files -> index.html) нужен, т.к. роутинг клиентский
# (react-router): прямой заход на /links/:id должен отдавать index.html.
# ---------------------------------------------------------------------------
FROM nginxinc/nginx-unprivileged:1.27-alpine AS prod

COPY --from=build /app/dist /usr/share/nginx/html

COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
    listen 3000;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

EXPOSE 3000

# HEALTHCHECK не дублируется здесь — задан в docker-compose.yml (HTTP 200 на /).

CMD ["nginx", "-g", "daemon off;"]
