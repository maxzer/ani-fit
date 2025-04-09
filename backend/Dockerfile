# Этап сборки
FROM node:20-alpine

WORKDIR /app

# Установка зависимостей
RUN apk add --no-cache openssl

# Копируем package.json и устанавливаем зависимости
COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

# Копируем исходный код
COPY . .

# Сборка
RUN npm run build

EXPOSE 3001

# Скрипт для инициализации базы данных и запуска приложения
COPY init.sh .
RUN chmod +x init.sh

CMD ["./init.sh"] 