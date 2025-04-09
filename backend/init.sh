#!/bin/sh

# Генерируем Prisma Client
npx prisma generate

# Ждем доступности базы данных
echo "Waiting for database..."
sleep 5

# Сбрасываем и инициализируем базу данных
echo "Resetting database..."
npx prisma migrate reset --force --skip-generate --skip-seed

# Создаем и применяем миграции
echo "Creating initial migration..."
npx prisma migrate dev --name init --create-only --skip-generate --skip-seed

echo "Applying migrations..."
npx prisma migrate deploy

# Запускаем приложение
echo "Starting application..."
npm start 