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
import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import { google } from 'googleapis'
import authController from './auth/auth.controller'
import telegramAuthController from './auth/telegram.controller'
import { registerAuthMiddleware } from './auth/auth.middleware'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'

const MAX_RETRIES = 10;
const RETRY_DELAY = 5000; // 5 секунд

// Функция для ожидания доступности базы данных
async function waitForDatabase() {
  let retries = 0;
  
  while (retries < MAX_RETRIES) {
    try {
      console.log(`Попытка подключения к базе данных (${retries + 1}/${MAX_RETRIES})...`);
      
      // Пробуем подключиться к базе данных
      const testPrisma = new PrismaClient();
      await testPrisma.$connect();
      await testPrisma.$disconnect();
      
      console.log('Подключение к базе данных успешно!');
      return true;
    } catch (error) {
      console.error('Ошибка подключения к базе данных:', error);
      retries++;
      
      if (retries >= MAX_RETRIES) {
        console.error('Превышено максимальное количество попыток подключения к базе данных');
        return false;
      }
      
      console.log(`Повторная попытка через ${RETRY_DELAY / 1000} секунд...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
  
  return false;
}

// Функция для настройки Google Calendar API
function setupGoogleCalendar() {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const jwtClient = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    undefined,
    privateKey,
    ['https://www.googleapis.com/auth/calendar']
  );

  const calendar = google.calendar({ version: 'v3', auth: jwtClient });
  return { jwtClient, calendar };
}

// Основная функция запуска
async function bootstrap() {
  // Ожидаем готовности базы данных
  const dbReady = await waitForDatabase();
  
  if (!dbReady) {
    console.error('Не удалось подключиться к базе данных. Выход...');
    process.exit(1);
  }
  
  // Выполняем миграцию
  try {
    console.log('Выполнение миграций...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('Миграции успешно выполнены');
  } catch (error) {
    console.error('Ошибка выполнения миграций:', error);
  }
  
  const prisma = new PrismaClient();
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
  registerAuthMiddleware(app, prisma);
  
  // Настройка Google Calendar
  const { jwtClient, calendar } = setupGoogleCalendar();
  
  // Routes
  app.get('/ping', async () => {
    return { status: 'ok' };
  });
  
  app.get('/users', async () => {
    const users = await prisma.user.findMany();
    return users;
  });
  
  app.post('/users', async (request) => {
    try {
      const body = request.body as any;
      
      // Используем тип any для обхода проблем с типизацией
      const prismaAny = prisma as any;
      const user = await prismaAny.user.create({
        data: {
          name: body.name || '',
          email: body.email || ''
        }
      });
      
      return { 
        success: true, 
        user 
      };
    } catch (error) {
      console.error('Error creating user:', error);
      return { 
        success: false, 
        error: 'Could not create user' 
      };
    }
  });
  
  app.post('/api/calendar/add-event', async (request, reply) => {
    try {
      await jwtClient.authorize();
      
      const body = request.body as any;
      const summary = body.summary;
      const description = body.description;
      const startDateTime = body.startDateTime;
      const endDateTime = body.endDateTime;
      const attendees = body.attendees || [];
      
      const event = {
        summary,
        description,
        start: {
          dateTime: startDateTime,
          timeZone: 'Europe/Moscow',
        },
        end: {
          dateTime: endDateTime,
          timeZone: 'Europe/Moscow',
        },
        attendees,
      };
      
      const result = await calendar.events.insert({
        calendarId: process.env.GOOGLE_CALENDAR_ID,
        requestBody: event,
      });
      
      return {
        success: true,
        eventId: result.data.id,
        htmlLink: result.data.htmlLink
      };
    } catch (error) {
      console.error('Error creating calendar event:', error);
      reply.status(500).send({ 
        success: false, 
        error: 'Не удалось создать событие в календаре' 
      });
    }
  });
  
  try {
    const port = process.env.PORT || 3001;
    await app.listen({ port: Number(port), host: '0.0.0.0' });
    console.log(`Сервер запущен на порту ${port}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

// Запускаем сервер
bootstrap(); 