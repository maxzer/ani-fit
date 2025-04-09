import fastify from 'fastify'
import cors from '@fastify/cors'
import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import { google } from 'googleapis'

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
    origin: ['https://maxzer.ru', 'https://www.maxzer.ru'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
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
    const { name, email } = request.body as { name: string; email: string };
    const user = await prisma.user.create({
      data: { name, email }
    });
    return user;
  });
  
  // Добавляем новый маршрут для календаря
  app.post('/api/calendar/add-event', async (request, reply) => {
    try {
      await jwtClient.authorize();
      
      const { summary, description, startDateTime, endDateTime, attendees } = 
        request.body as { 
          summary: string; 
          description: string; 
          startDateTime: string; 
          endDateTime: string;
          attendees?: { email: string }[];
        };
      
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
        attendees: attendees || [],
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