#!/bin/bash
set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Проверка на ошибки
check_error() {
  if [ $? -ne 0 ]; then
    log_error "$1"
    exit 1
  fi
}

log_info "Остановка работающих контейнеров..."
docker-compose down

log_info "Удаление всех существующих контейнеров и образов бэкенда..."
docker rm -f $(docker ps -a | grep 'ani-fit-backend' | awk '{print $1}') 2>/dev/null || true
docker rmi $(docker images | grep 'ani-fit-backend' | awk '{print $3}') 2>/dev/null || true

log_info "Удаление node_modules внутри докера..."
docker volume rm $(docker volume ls -q | grep 'ani-fit_node_modules') 2>/dev/null || true

log_info "Проверка оставшихся контейнеров..."
CONTAINERS=$(docker ps -a | grep 'ani-fit-backend' | wc -l)
if [ "$CONTAINERS" -gt 0 ]; then
  log_warning "Обнаружены оставшиеся контейнеры бэкенда. Принудительное удаление..."
  docker rm -f $(docker ps -a | grep 'ani-fit-backend' | awk '{print $1}')
fi

log_info "Очистка кэша npm внутри Docker..."
docker run --rm -v "$(pwd):/app" -w /app node:alpine sh -c "npm cache clean --force"
check_error "Не удалось очистить кэш npm"

log_info "Установка локальной зависимости @types/fastify-jwt для проверки типов..."
npm install --save-dev @types/fastify-jwt @types/node@16.18.48
check_error "Не удалось установить тип для fastify-jwt"

log_info "Сборка Docker образа с использованием BuildKit..."
DOCKER_BUILDKIT=1 docker-compose build --no-cache backend
check_error "Сборка Docker образа завершилась ошибкой"

log_info "Запуск контейнеров..."
docker-compose up -d
check_error "Запуск контейнеров завершился ошибкой"

log_info "Ожидание запуска бэкенда (10 секунд)..."
sleep 10

log_info "Проверка логов бэкенда..."
docker-compose logs --tail=50 backend

log_success "Пересборка Docker контейнера успешно завершена!"
log_info "Для просмотра логов в режиме реального времени используйте: docker-compose logs -f backend" 