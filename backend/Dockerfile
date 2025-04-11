# Этап сборки
FROM node:20-alpine

WORKDIR /app

# Установка зависимостей
RUN apk add --no-cache openssl dos2unix

# Копируем только файлы package.json и package-lock.json сначала
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем остальные файлы проекта
COPY . .

# Конвертируем скрипт в Unix формат и делаем исполняемым
RUN dos2unix init.sh && chmod +x init.sh

# Устанавливаем явно нужные зависимости
RUN npm install @fastify/jwt @fastify/cookie @fastify/cors fastify dotenv

# Собираем проект
RUN npm run build

EXPOSE 3001

CMD ["sh", "./init.sh"] 