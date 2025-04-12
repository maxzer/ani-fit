import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

// Расширяем тип PrismaClient для включения моделей, которые могут быть не распознаны
export type PrismaClientWithModels = PrismaClient & {
  viewedPriceList: any;
  systemSetting: any;
};

const MAX_RETRIES = 10;
const RETRY_DELAY = 5000; // 5 секунд

// Функция для ожидания доступности базы данных
export async function waitForDatabase(): Promise<boolean> {
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

// Функция для выполнения миграций
export function runMigrations(): void {
  try {
    console.log('Выполнение миграций...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('Миграции успешно выполнены');
  } catch (error) {
    console.error('Ошибка выполнения миграций:', error);
  }
}

// Инициализация Prisma
export function initPrisma(): PrismaClientWithModels {
  return new PrismaClient() as PrismaClientWithModels;
} 