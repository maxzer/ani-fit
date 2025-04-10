import fastify from 'fastify'
import cors from '@fastify/cors'
import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import { google } from 'googleapis'
import authController from './auth/auth.controller'
import { registerAuthMiddleware } from './auth/auth.middleware'

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
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://maxzer.ru', 'https://www.maxzer.ru'] 
      : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  });
  
  // Регистрируем контроллер аутентификации
  await authController(app, prisma);
  
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
  
  // Добавляем API прокси для совместимости с новыми путями
  app.post('/api/auth', async (request, reply) => {
    // Перенаправляем запрос на существующий обработчик /auth/telegram
    await app.inject({
      method: 'POST',
      url: '/auth/telegram',
      payload: JSON.stringify(request.body),
      headers: request.headers
    }).then(response => {
      reply.code(response.statusCode).send(JSON.parse(response.payload));
    });
  });
  
  app.post('/api/profile', async (request, reply) => {
    // Перенаправляем запрос на существующий обработчик /auth/profile
    await app.inject({
      method: 'POST',
      url: '/auth/profile',
      payload: JSON.stringify(request.body),
      headers: request.headers
    }).then(response => {
      reply.code(response.statusCode).send(JSON.parse(response.payload));
    });
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