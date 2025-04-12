# Этап сборки
FROM node:20-alpine AS builder

WORKDIR /app

# Установка зависимостей
COPY package*.json ./
RUN npm install

# Копируем исходный код
COPY . .

# Сборка
RUN npm run build

# Финальный этап
FROM node:20-alpine

WORKDIR /app

# Установка только production зависимостей
COPY package*.json ./
RUN npm install --production

# Копируем собранное приложение
COPY --from=builder /app/.output /app/.output
COPY --from=builder /app/.nuxt /app/.nuxt
COPY --from=builder /app/public /app/public

EXPOSE 3000

# Запуск сервера
CMD ["node", ".output/server/index.mjs"]
