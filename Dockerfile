# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Копируем только package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости и чистим кэш
RUN apt-get update && apt-get install -y python3 make g++ \
    && npm install --no-cache --legacy-peer-deps && npm cache clean --force

# Копируем исходный код
COPY . .

# Собираем приложение
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Копируем скомпилированные файлы и зависимости
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package*.json ./

# Устанавливаем только production зависимости
RUN npm ci --only=production --legacy-peer-deps --no-cache

# Создаем volume для хранения данных
VOLUME ["/app/.output"]

# Устанавливаем переменные окружения
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

# Запускаем приложение
CMD ["node", ".output/server/index.mjs"]
