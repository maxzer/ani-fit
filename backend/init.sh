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

# Проверяем, инициализирована ли база данных
echo "Checking database status..."
DB_EXISTS=$(npx prisma migrate status | grep -c "Database schema is up to date")

if [ "$DB_EXISTS" -eq 0 ]; then
  # База данных не инициализирована, выполняем полную настройку
  echo "Database not initialized, setting up..."
  
  # Применяем существующие миграции или создаем новую если их нет
  if [ -z "$(ls -A prisma/migrations 2>/dev/null)" ]; then
    echo "Creating initial migration..."
    npx prisma migrate dev --name init --create-only
  fi
  
  echo "Applying migrations..."
  npx prisma migrate deploy
else
  echo "Database already initialized, applying any pending migrations..."
  npx prisma migrate deploy
fi

# Запускаем приложение
echo "Starting application..."
npm start 