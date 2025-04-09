#!/bin/bash

echo "Начинаем развертывание..."

# Останавливаем все контейнеры
echo "Остановка существующих контейнеров..."
docker-compose down

# Шаг 1: Запуск базы данных
echo "Запуск базы данных PostgreSQL..."
docker-compose up -d db
echo "Ожидание готовности базы данных..."
sleep 15  # Ждем инициализацию базы данных

# Шаг 2: Запуск backend
echo "Запуск backend сервиса..."
docker-compose up -d --build backend
echo "Ожидание готовности backend..."
sleep 20  # Увеличиваем время ожидания для backend

# Шаг 3: Запуск frontend
echo "Запуск frontend сервиса..."
docker-compose up -d --build frontend
echo "Ожидание готовности frontend..."
sleep 30

# Шаг 4: Запуск nginx
echo "Запуск nginx..."
docker-compose up -d nginx

echo "Все сервисы запущены!"
echo "Для проверки статуса контейнеров выполните: docker-compose ps"
echo "Для просмотра логов выполните: docker-compose logs -f" 