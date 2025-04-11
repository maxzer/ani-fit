#!/bin/sh

# Устанавливаем зависимости
echo "Installing dependencies..."
npm install
# Явно устанавливаем зависимости Fastify
npm install @fastify/jwt @fastify/cookie @fastify/cors fastify dotenv

# Генерируем Prisma Client
npx prisma generate

# Ждем доступности базы данных
echo "Waiting for database..."
sleep 5

# Очищаем директорию миграций если она существует
echo "Cleaning migrations directory..."
rm -rf prisma/migrations/*

# Сбрасываем и инициализируем базу данных
echo "Resetting database..."
npx prisma migrate reset --force

# Создаем и применяем миграции
echo "Creating initial migration..."
npx prisma migrate dev --name init --create-only

echo "Applying migrations..."
npx prisma migrate deploy

# Запускаем приложение
echo "Starting application..."
npm start 