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
  
  // Регистрируем middleware для защищенных маршрутов ПОСЛЕ контроллеров аутентификации
  registerAuthMiddleware(app, prisma, {
    excludePaths: [
      '/api/auth/telegram', 
      '/api/auth/check-user',
      '/api/auth/refresh-token'  // Добавляем путь обновления токена в исключения
    ] // Исключаем пути авторизации из проверки
  });
  
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
      const color = body.color || '#4caf50';
      
      // Преобразование hex-цвета в идентификатор цвета Google Calendar
      const colorId = getGoogleCalendarColorId(color);
      
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
        colorId
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
  
  // Функция для преобразования hex-цвета в идентификатор цвета Google Calendar
  function getGoogleCalendarColorId(hexColor: string): string {
    // Google Calendar поддерживает ограниченный набор цветов с ID от 1 до 11
    // Сопоставим наши hex-цвета с ближайшими цветами в Google Calendar
    
    // Убираем # из начала цвета, если есть
    const colorHex = hexColor.startsWith('#') ? hexColor.substring(1) : hexColor;
    
    // Сопоставление hex-цветов с ID цветов Google Calendar
    const colorMap: { [key: string]: string } = {
      '4caf50': '10', // Зелёный
      '2196f3': '7',  // Синий
      'ff9800': '6',  // Оранжевый
      '9c27b0': '3',  // Фиолетовый
      'f44336': '11', // Красный
      'ffeb3b': '5',  // Жёлтый
      'ffffff': '1',  // Светло-синий (по умолчанию)
    };
    
    // Ищем точное совпадение
    if (colorMap[colorHex]) {
      return colorMap[colorHex];
    }
    
    // Если точного совпадения нет, используем базовый цвет по умолчанию
    return '1';
  }
  
  // API для сохранения события в базу данных
  app.post('/api/events', async (request, reply) => {
    try {
      // Получаем данные из запроса
      const body = request.body as any;
      
      // Проверяем обязательные поля
      if (!body.title || !body.date || !body.userId) {
        return reply.status(400).send({
          success: false,
          error: 'Отсутствуют обязательные поля: title, date, userId'
        });
      }
      
      // Создаем событие в базе данных
      const event = await prisma.event.create({
        data: {
          title: body.title,
          date: new Date(body.date),
          endDate: body.endDate ? new Date(body.endDate) : null,
          color: body.color || "#4caf50",
          googleEventId: body.googleEventId,
          staffInfo: body.staffInfo ? JSON.parse(JSON.stringify(body.staffInfo)) : null,
          petBreed: body.petBreed,
          status: body.status || "confirmed",
          userId: body.userId
        }
      });
      
      return {
        success: true,
        event
      };
    } catch (error) {
      console.error('Error creating event:', error);
      reply.status(500).send({
        success: false,
        error: 'Не удалось сохранить событие'
      });
    }
  });
  
  // API для получения событий пользователя
  app.get('/api/events', async (request, reply) => {
    try {
      const userId = (request.query as any).userId as string;
      
      if (!userId) {
        return reply.status(400).send({
          success: false,
          error: 'Не указан userId'
        });
      }
      
      // Получаем события пользователя, сортированные по дате
      const events = await prisma.event.findMany({
        where: {
          userId: parseInt(userId),
        },
        orderBy: {
          date: 'asc'
        }
      });
      
      return {
        success: true,
        events
      };
    } catch (error) {
      console.error('Error getting events:', error);
      reply.status(500).send({
        success: false,
        error: 'Не удалось получить события'
      });
    }
  });
  
  // API для удаления события
  app.delete('/api/events/:id', async (request, reply) => {
    try {
      const eventId = (request.params as any).id as string;
      const userId = (request.query as any).userId as string;
      
      if (!eventId) {
        return reply.status(400).send({
          success: false,
          error: 'Не указан id события'
        });
      }
      
      // Проверяем, что событие принадлежит пользователю
      const event = await prisma.event.findFirst({
        where: {
          id: parseInt(eventId),
          userId: parseInt(userId)
        }
      });
      
      if (!event) {
        return reply.status(404).send({
          success: false,
          error: 'Событие не найдено или не принадлежит пользователю'
        });
      }
      
      // Удаляем событие из Google Calendar, если есть ID
      if (event.googleEventId) {
        try {
          await jwtClient.authorize();
          await calendar.events.delete({
            calendarId: process.env.GOOGLE_CALENDAR_ID,
            eventId: event.googleEventId
          });
        } catch (calendarError) {
          console.error('Error deleting event from Google Calendar:', calendarError);
          // Продолжаем удаление из БД даже при ошибке в Google Calendar
        }
      }
      
      // Удаляем событие из базы данных
      await prisma.event.delete({
        where: {
          id: parseInt(eventId)
        }
      });
      
      return {
        success: true
      };
    } catch (error) {
      console.error('Error deleting event:', error);
      reply.status(500).send({
        success: false,
        error: 'Не удалось удалить событие'
      });
    }
  });
  
  // API для отмены события (без удаления из Google Calendar)
  app.patch('/api/events/:id/cancel', async (request, reply) => {
    try {
      const eventId = (request.params as any).id as string;
      const userId = (request.query as any).userId as string;
      
      if (!eventId) {
        return reply.status(400).send({
          success: false,
          error: 'Не указан id события'
        });
      }
      
      // Проверяем, что событие принадлежит пользователю
      const event = await prisma.event.findFirst({
        where: {
          id: parseInt(eventId),
          userId: parseInt(userId)
        }
      });
      
      if (!event) {
        return reply.status(404).send({
          success: false,
          error: 'Событие не найдено или не принадлежит пользователю'
        });
      }
      
      // Если есть ID события в Google Calendar, изменяем его цвет на красный
      if (event.googleEventId) {
        try {
          await jwtClient.authorize();
          
          // Сначала получаем текущее событие
          const existingEvent = await calendar.events.get({
            calendarId: process.env.GOOGLE_CALENDAR_ID,
            eventId: event.googleEventId
          });
          
          // Обновляем событие, устанавливая красный цвет и добавляя пометку "Отменено" в описание
          const updatedEvent = existingEvent.data;
          
          // Используем colorId 11 для красного цвета
          updatedEvent.colorId = "11";
          
          // Добавляем пометку в описание
          if (updatedEvent.description) {
            updatedEvent.description = "[ОТМЕНЕНО] " + updatedEvent.description;
          } else {
            updatedEvent.description = "[ОТМЕНЕНО]";
          }
          
          // Обновляем событие в Google Calendar
          await calendar.events.update({
            calendarId: process.env.GOOGLE_CALENDAR_ID,
            eventId: event.googleEventId,
            requestBody: updatedEvent
          });
        } catch (calendarError) {
          console.error('Error updating event in Google Calendar:', calendarError);
          // Продолжаем обновление в БД даже при ошибке в Google Calendar
        }
      }
      
      // Обновляем статус события в базе данных
      const updatedEvent = await prisma.event.update({
        where: {
          id: parseInt(eventId)
        },
        data: {
          status: 'cancelled',
          color: '#f44336' // Красный цвет для отмененных событий
        }
      });
      
      return {
        success: true,
        event: updatedEvent
      };
    } catch (error) {
      console.error('Error cancelling event:', error);
      reply.status(500).send({
        success: false,
        error: 'Не удалось отменить событие'
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