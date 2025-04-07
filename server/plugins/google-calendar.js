import { google } from 'googleapis';
import { defineNitroPlugin } from 'nitropack/runtime/plugin';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Явно загружаем переменные окружения из .env файла
function loadEnv() {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      console.log('[google-calendar-plugin] Загрузка переменных окружения из:', envPath);
      const result = dotenv.config({ path: envPath });
      
      if (result.error) {
        console.error('[google-calendar-plugin] Ошибка при загрузке .env файла:', result.error);
      } else {
        console.log('[google-calendar-plugin] .env файл успешно загружен');
      }
    } else {
      console.warn('[google-calendar-plugin] Файл .env не найден по пути:', envPath);
    }
  } catch (error) {
    console.error('[google-calendar-plugin] Ошибка при работе с .env файлом:', error);
  }
}

// Функция для создания клиента Google Calendar
function createGoogleCalendarClient() {
  const googleClientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const googlePrivateKey = process.env.GOOGLE_PRIVATE_KEY;
  
  if (!googleClientEmail || !googlePrivateKey) {
    console.error('[google-calendar-plugin] Отсутствуют учетные данные Google API:');
    console.error('- GOOGLE_CLIENT_EMAIL:', !!googleClientEmail);
    console.error('- GOOGLE_PRIVATE_KEY:', !!googlePrivateKey);
    return null;
  }
  
  try {
    // Создаем клиент авторизации
    const auth = new google.auth.JWT({
      email: googleClientEmail,
      key: googlePrivateKey.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/calendar']
    });
    
    // Создаем клиент для работы с календарем
    const calendar = google.calendar({ version: 'v3', auth });
    
    console.log('[google-calendar-plugin] Клиент Google Calendar успешно создан');
    return calendar;
  } catch (error) {
    console.error('[google-calendar-plugin] Ошибка при создании клиента Google Calendar:', error);
    return null;
  }
}

// Плагин для Nitro, выполняется при запуске сервера
export default defineNitroPlugin((nitroApp) => {
  console.log('[google-calendar-plugin] Инициализация Google Calendar API');
  
  // Загружаем переменные окружения
  loadEnv();
  
  // Логируем информацию о переменных окружения
  const envVars = {
    GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL ? 'установлена' : 'отсутствует',
    GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY ? 'установлена' : 'отсутствует',
    GOOGLE_CALENDAR_ID: process.env.GOOGLE_CALENDAR_ID ? 'установлена' : 'отсутствует',
    API_BASE_URL: process.env.API_BASE_URL || 'не установлена',
    NODE_ENV: process.env.NODE_ENV || 'не установлена'
  };
  
  console.log('[google-calendar-plugin] Переменные окружения:', envVars);
  
  // Создаем клиент и сохраняем в глобальном контексте
  const googleCalendar = createGoogleCalendarClient();
  
  // Добавляем клиент в глобальный объект для доступа из API ендпоинтов
  nitroApp.googleCalendar = googleCalendar;
}); 