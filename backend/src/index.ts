import fastify from 'fastify'
import cors from '@fastify/cors'
import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'

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