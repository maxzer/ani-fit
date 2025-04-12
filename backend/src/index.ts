// import 'dotenv/config';
// Используем программную инициализацию
try {
  require('dotenv').config();
} catch (e) {
  console.log('Dotenv не найден, используем переменные окружения как есть');
}

// Выводим токен бота
console.log('====================');
console.log('TELEGRAM BOT TOKEN:', process.env.TELEGRAM_BOT_TOKEN);
console.log('====================');

import fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'

// Импортируем утилиты и контроллеры
import { waitForDatabase, runMigrations, initPrisma } from './utils/database'
import authController from './auth/auth.controller'
import telegramAuthController from './auth/telegram.controller'
import { registerAuthMiddleware } from './auth/auth.middleware'
import usersController from './controllers/users.controller'
import eventsController from './controllers/events.controller'
import calendarController from './controllers/calendar.controller'
import priceListsController from './controllers/price-lists.controller'
import webhooksController from './controllers/webhooks.controller'
import { setupCalendarWatcher, renewCalendarWatcher } from './utils/calendarWatcher'
import { PrismaClient } from '@prisma/client'

// Расширенный тип PrismaClient с дополнительными моделями
type PrismaClientWithModels = PrismaClient & {
  viewedPriceList: any;
};

// Основная функция запуска
async function bootstrap() {
  // Ожидаем готовности базы данных
  const dbReady = await waitForDatabase();
  
  if (!dbReady) {
    console.error('Не удалось подключиться к базе данных. Выход...');
    process.exit(1);
  }
  
  // Выполняем миграцию
  runMigrations();
  
  // Инициализируем Prisma
  const prisma = initPrisma();
  
  // Создаем экземпляр Fastify
  const app = fastify();
  
  // CORS
  app.register(cors, {
    origin: (origin, cb) => {
      // Telegram WebApps могут загружаться с разных доменов
      // t.me, web.telegram.org и т.д.
      const allowedOrigins = [
        'https://maxzer.ru', 
        'https://www.maxzer.ru',
        'https://t.me',
        'https://web.telegram.org',
        'https://telegram.org'
      ];
      
      // В разработке разрешаем любой origin
      if (!origin || process.env.NODE_ENV !== 'production') {
        return cb(null, true);
      }
      
      // В production проверяем, разрешен ли домен
      // Для Telegram разрешаем любой поддомен
      const isAllowed = allowedOrigins.some(allowed => {
        return origin === allowed || origin.endsWith('.telegram.org') || origin.endsWith('.t.me');
      });
      
      if (isAllowed) {
        return cb(null, true);
      }
      
      return cb(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'accept']
  });
  
  // Регистрация JWT плагина
  await app.register(jwt, {
    secret: process.env.JWT_ACCESS_SECRET || 'default_access_secret',
    sign: {
      expiresIn: '15m'
    },
    cookie: {
      cookieName: 'refreshToken',
      signed: false
    }
  });

  // Регистрация cookie плагина
  await app.register(cookie, {
    hook: 'onRequest',
    parseOptions: {}
  });
  
  // Регистрируем контроллер аутентификации
  await authController(app, prisma);
  
  // Регистрируем контроллер Telegram-аутентификации
  await telegramAuthController(app, prisma);
  
  // Регистрируем middleware для защищенных маршрутов
  registerAuthMiddleware(app, prisma, {
    excludePaths: [
      '/api/auth/telegram', 
      '/api/auth/check-user',
      '/api/auth/refresh-token',
      '/api/webhook/calendar' // Исключаем webhook для календаря
    ]
  });
  
  // Простой маршрут для проверки сервера
  app.get('/ping', async () => {
    return { status: 'ok' };
  });
  
  // Регистрируем контроллеры
  await usersController(app, prisma);
  await eventsController(app, prisma);
  await calendarController(app);
  await priceListsController(app, prisma);
  await webhooksController(app, prisma);
  
  // Запускаем сервер
  try {
    const port = process.env.PORT || 3001;
    await app.listen({ port: Number(port), host: '0.0.0.0' });
    console.log(`Сервер запущен на порту ${port}`);
    
    // Настраиваем webhook для календаря после успешного запуска сервера
    app.ready(async () => {
      try {
        // Проверяем, есть ли информация о существующем webhook
        const watcherInfo = await prisma.systemSetting.findUnique({
          where: { key: 'calendarWatcherInfo' }
        });
        
        if (watcherInfo) {
          // Если есть информация, обновляем webhook
          try {
            const channelInfo = JSON.parse(watcherInfo.value);
            console.log('Updating existing calendar webhook...');
            await renewCalendarWatcher(prisma, channelInfo);
          } catch (e) {
            console.error('Error parsing existing watcher info:', e);
            // Создаем новый webhook, если не удалось обновить существующий
            await setupCalendarWatcher(prisma);
          }
        } else {
          // Создаем новый webhook
          console.log('Setting up new calendar webhook...');
          await setupCalendarWatcher(prisma);
        }
        
        // Настраиваем периодическое обновление канала (каждые 6 дней)
        setInterval(async () => {
          try {
            const watcherInfo = await prisma.systemSetting.findUnique({
              where: { key: 'calendarWatcherInfo' }
            });
            
            if (watcherInfo) {
              const channelInfo = JSON.parse(watcherInfo.value);
              await renewCalendarWatcher(prisma, channelInfo);
              console.log('Calendar webhook renewed successfully');
            }
          } catch (error) {
            console.error('Error renewing calendar webhook:', error);
          }
        }, 6 * 24 * 60 * 60 * 1000); // 6 дней
      } catch (error) {
        console.error('Error setting up calendar webhook:', error);
      }
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

// Запускаем сервер
bootstrap(); 