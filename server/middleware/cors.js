import { defineEventHandler, setResponseHeaders, getMethod } from 'h3';

// Глобальное middleware для настройки CORS заголовков
export default defineEventHandler((event) => {
  // Устанавливаем расширенные CORS заголовки для всех запросов
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, Origin, X-Requested-With, Authorization, X-Telegram-WebApp, Referer, User-Agent',
    'Access-Control-Max-Age': '86400', // 24 часа
    'Access-Control-Allow-Credentials': 'true',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });

  // Обработка предварительных запросов OPTIONS
  if (getMethod(event) === 'OPTIONS') {
    event.res.statusCode = 204;
    event.res.end();
    return;
  }
}); 