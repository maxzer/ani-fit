# Этап сборки
FROM node:20-alpine

WORKDIR /app

# Установка зависимостей
RUN apk add --no-cache openssl dos2unix

# Копируем package.json и устанавливаем зависимости
COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

# Копируем исходный код и скрипты
COPY . .

# Конвертируем скрипт в Unix формат и делаем исполняемым
RUN dos2unix init.sh && chmod +x init.sh && ls -la init.sh

# Сборка
RUN npm run build

EXPOSE 3001

CMD ["sh", "./init.sh"] 