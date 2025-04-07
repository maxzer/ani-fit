// Импортируем необходимые зависимости для Google Calendar API
import { google } from 'googleapis';
import { defineEventHandler, readBody, getHeaders, setResponseHeaders, getMethod } from 'h3';
import { useRuntimeConfig, useNitroApp } from '#imports';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Загружаем .env файл напрямую с проверкой разных путей
function loadEnvFile() {
  try {
    // Возможные пути к .env файлу
    const paths = [
      '.env',
      path.resolve(process.cwd(), '.env'),
      path.resolve(process.cwd(), '../.env'),
      path.resolve(process.cwd(), '../../.env'),
      path.resolve(__dirname, '../../../.env')
    ];
    
    console.log('[add-event] Текущий рабочий каталог:', process.cwd());
    console.log('[add-event] Путь текущего файла:', __dirname);
    
    // Проверяем каждый путь
    for (const envPath of paths) {
      if (fs.existsSync(envPath)) {
        console.log(`[add-event] Найден .env файл по пути: ${envPath}`);
        const result = dotenv.config({ path: envPath });
        if (result.error) {
          console.error(`[add-event] Ошибка при загрузке .env по пути ${envPath}:`, result.error);
        } else {
          console.log(`[add-event] Успешно загружены переменные из ${envPath}`);
          
          // Для отладки покажем, что загрузилось
          console.log('[add-event] GOOGLE_CLIENT_EMAIL загружен:', !!process.env.GOOGLE_CLIENT_EMAIL);
          console.log('[add-event] GOOGLE_PRIVATE_KEY загружен:', !!process.env.GOOGLE_PRIVATE_KEY);
          console.log('[add-event] GOOGLE_CALENDAR_ID загружен:', !!process.env.GOOGLE_CALENDAR_ID);
          
          return true;
        }
      } else {
        console.log(`[add-event] .env файл не найден по пути: ${envPath}`);
      }
    }
    
    console.error('[add-event] Не удалось найти .env файл ни по одному из путей');
    return false;
  } catch (error) {
    console.error('[add-event] Ошибка при поиске/загрузке .env файла:', error);
    return false;
  }
}

// Загружаем переменные окружения
loadEnvFile();

// Хранилище для отслеживания обработанных запросов
const processedRequests = new Set();

// Жесткое задание учетных данных Google API (только в случае проблем)
const FALLBACK_CREDENTIALS = {
  email: 'test-63@optimal-bivouac-456118-n0.iam.gserviceaccount.com',
  key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC2ESaNcf/hgT3n\nnKmGQqf8j6ZgPOuJS2SyAGQDxy6+v4KrAYXa0mEDwAaIBmrpbzBjezi8uppohVi7\nusUVG+7wKNGARngpS6YiVU36JfEcX9S4YUu0bhu7s3jMGISkYOXygfq6dn3daU/n\nCFXPJayTtoxJKiBeVFAXJOVW2ZDMA6p2LwJ5C4M3Ll9fRjpdP3TV63HuCgS6D9j4\n0U+OiLCULhP+eA26OElQVoLv8Hit5LFNVNcGSmzatRvtsozHOY7sRNWwASvdG++d\nAgCwOsrAjK2pCTr4tYJQJNi3QGet+YX9RoHL7jqds2otf0HqncqQF0caS5ib/B4d\ndgrh6Z3TAgMBAAECggEAV//1JuPFfn0l6zdlFvBL2r6h950qaTtoKcMXlF3nQao2\nIaqERK5v1syvO3sCnN6xwDu0QkBdVoyxRVeyX5AXTrwj+sDU3nziiXC61mAVaJYH\nLrFUUprvy6slBV0Ka5ssOalKg2q3TlfTF4OHWi7G+cR/jPOQHpfY+D7MnMxe+MQx\n0355fYLTb9v9ArbpTD2uklm1m5nNbHyWG1qVAASo5ZBG++L+JNm7GBFe5vbPBjT6\nMbB0bWkVisKqcD9a9E1/jDtCSRZRYgBuEoltBzODVWYUrGUlq8+rSN8cjzrytbji\nM5cFQ5BprPwZTRNV9uBKEOsAqiPkTgmfuviaLWtJ2QKBgQDj8dIkMrYdry0M4nHO\nu7m6cueftLmx7KEJWfSqGc6MLYxwTOt2VpVlA++HxNJI1t5w7naxiQui7gZQ7Uu5\nbpUSavBlYzJmje5QXOX5YwovlQwMIUwVXBGQJaaskm+E7zAEW8X5jE4DWhqscVtB\nH57FFbLoVRrCnagFb+ytH1QxawKBgQDMecwscfKt1jVWS+deLX9irQI6u+LxA/4J\nx++ErP+rdNmJP7f3Mesu3KH0GzpDRrvU96vba+n5yif0zgvXFCePhQM6xKFU5PAM\nB8exAANpuQae9uh8CKyA8vjwJYPUy3ydF7tFbahkgqG2rJUOxL85lELTkNx93wVD\n7BtBg64XOQKBgHWXXdJAuwSrRzFbbFy7KYBPIMCaCiYIrbbWSkqqT4yvPsD8XYhJ\n+H4JPruqxNTAzDY0PtUtnuwpoOaE1EjQDGVY97VGLE0NsUCR/C3gcvPDD1j+oHJw\ncbsMQWTLkm5gukO1WHd5cxF1nUcSn4IEHvMLU6VZqhl2HaTYbZ+OBvALAoGAeJD8\nrdxGfvAGpSq+cw6axSFEZkNxDjIPcc79URr86ilNN5tlqxE5Hnmj2R7Q3OhxSqL7\nJ7da0Bm+M5/m5VwR85M3k0hr5HXVgRJ5UcmzOXyLBeKKtNAcfzBFTrygHjIZ+TsM\nBmUhXJqWJfNfNMUYCCh+uub4zBNbtHAcpiWx2ikCgYEA1fpBAowpepVmzEDYmhxM\nluIwGI0VEcmb+HioQTDffZPT91s3Sr/aNbmuVgEltb2TK5524QgJn+gFoVAxbbgM\nBrTyyOCGG6D4PxsK7wl9TqSxehyn1RMgX/S/YtJsEZqoXEQyUUfW6g/HDyYND8O3\nlHaRdzHKan/d3VoIY9Z6w4I=\n-----END PRIVATE KEY-----\n",
  calendarId: 'maxzer7@gmail.com'
};

// Добавление события в Google Calendar
export default defineEventHandler(async (event) => {
  // Устанавливаем расширенные CORS заголовки
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, Origin, X-Requested-With, Authorization, X-Telegram-WebApp, Referer, User-Agent',
    'Access-Control-Max-Age': '86400', // 24 hours
    'Access-Control-Allow-Credentials': 'true',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });

  // Обработка предварительных запросов OPTIONS
  if (getMethod(event) === 'OPTIONS') {
    console.log('[add-event] Получен OPTIONS запрос, возвращаем 204');
    return null;
  }

  try {
    // Получаем заголовки для отладки
    const headers = getHeaders(event);
    console.log('[add-event] Заголовки запроса:', {
      origin: headers.origin,
      referer: headers.referer,
      contentType: headers['content-type'],
      userAgent: headers['user-agent'],
      telegramWebApp: headers['x-telegram-webapp']
    });

    // Читаем тело запроса
    const body = await readBody(event);
    console.log('[add-event] Получены данные события:', {
      summary: body.summary,
      startDateTime: body.startDateTime,
      endDateTime: body.endDateTime,
      requestId: body.requestId
    });
    
    // Логирование переменных окружения (для отладки)
    console.log('[add-event] Переменные окружения Google API:');
    console.log('GOOGLE_CLIENT_EMAIL:', process.env.GOOGLE_CLIENT_EMAIL ? 'установлена' : 'отсутствует');
    console.log('GOOGLE_PRIVATE_KEY:', process.env.GOOGLE_PRIVATE_KEY ? 'установлена' : 'отсутствует');
    console.log('GOOGLE_CALENDAR_ID:', process.env.GOOGLE_CALENDAR_ID ? 'установлена' : 'отсутствует');

    // Получаем конфигурацию из Nuxt
    const config = useRuntimeConfig();
    console.log('[add-event] Проверка конфигурации Google API');
    console.log('[add-event] Наличие googleClientEmail:', !!config.googleClientEmail);
    console.log('[add-event] Наличие googlePrivateKey:', !!config.googlePrivateKey);
    console.log('[add-event] Наличие googleCalendarId:', !!config.googleCalendarId);
    
    // Длины значений для проверки
    if (config.googleClientEmail) {
      console.log('[add-event] Длина googleClientEmail:', config.googleClientEmail.length);
    }
    if (config.googlePrivateKey) {
      console.log('[add-event] Длина googlePrivateKey:', config.googlePrivateKey.length);
    }
    if (config.googleCalendarId) {
      console.log('[add-event] Длина googleCalendarId:', config.googleCalendarId.length);
    }

    // Проверяем наличие всех необходимых данных для API
    let googleClientEmail = config.googleClientEmail || process.env.GOOGLE_CLIENT_EMAIL || FALLBACK_CREDENTIALS.email;
    let googlePrivateKey = config.googlePrivateKey || process.env.GOOGLE_PRIVATE_KEY || FALLBACK_CREDENTIALS.key;
    let googleCalendarId = config.googleCalendarId || process.env.GOOGLE_CALENDAR_ID || FALLBACK_CREDENTIALS.calendarId;
    
    // Пытаемся получить доступ к Nitro App
    let nitroApp;
    let googleCalendar;
    
    try {
      // Проверяем доступность клиента через глобальное хранилище Nitro
      nitroApp = useNitroApp();
      googleCalendar = nitroApp.googleCalendar;
      
      if (googleCalendar) {
        console.log('[add-event] Используем предварительно инициализированный клиент Google Calendar');
      } else {
        console.log('[add-event] Предварительно инициализированный клиент не найден, создаем новый');
      }
    } catch (nitroError) {
      console.error('[add-event] Ошибка при доступе к Nitro App:', nitroError.message);
      googleCalendar = null;
    }
    
    if (!googleClientEmail || !googlePrivateKey || !googleCalendarId) {
      console.error('[add-event] Ошибка: Отсутствуют данные для авторизации Google API. Используем резервные учетные данные...');
      googleClientEmail = FALLBACK_CREDENTIALS.email;
      googlePrivateKey = FALLBACK_CREDENTIALS.key;
      googleCalendarId = FALLBACK_CREDENTIALS.calendarId;
      
      console.log('[add-event] Используем резервные данные:');
      console.log('- Email:', googleClientEmail);
      console.log('- Calendar ID:', googleCalendarId);
    }

    // Создаем аутентификацию Google API и клиент календаря, если он не был инициализирован в плагине
    let calendar = googleCalendar;
    
    if (!calendar) {
      console.log('[add-event] Создание клиента аутентификации Google');
      const auth = new google.auth.JWT({
        email: googleClientEmail,
        key: googlePrivateKey.replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/calendar'],
      });
      
      calendar = google.calendar({ version: 'v3', auth });
      console.log('[add-event] Клиент Google Calendar создан');
    }

    // Определяем цвет события
    let colorId = '1'; // Голубой по умолчанию
    if (body.color) {
      // Преобразование HEX цвета в ColorId Google Calendar
      const colorMap = {
        '#4caf50': '10', // Зеленый
        '#2196f3': '1',  // Голубой
        '#ff9800': '6',  // Оранжевый
        '#9c27b0': '3',  // Фиолетовый
        '#f44336': '11'  // Красный
      };
      colorId = colorMap[body.color] || '1';
    }

    // Создаем данные для события
    const calendarEvent = {
      summary: body.summary,
      description: body.description || '',
      start: {
        dateTime: body.startDateTime,
        timeZone: 'Europe/Moscow',
      },
      end: {
        dateTime: body.endDateTime,
        timeZone: 'Europe/Moscow',
      },
      colorId: colorId,
      location: body.location || '',
      attendees: body.attendees && body.attendees.length > 0 ? 
        body.attendees.map(email => ({ email })) : 
        undefined,
    };

    console.log('[add-event] Отправка запроса к Google Calendar API');
    
    // Добавляем событие в Google Calendar
    const response = await calendar.events.insert({
      calendarId: googleCalendarId,
      resource: calendarEvent,
    });

    // Формируем ответ
    if (response.status === 200) {
      console.log('[add-event] Событие успешно создано:', response.data.id);
      return {
        success: true,
        eventId: response.data.id,
        eventLink: response.data.htmlLink,
        timestamp: new Date().toISOString(),
        serverInfo: {
          processedBy: 'Nuxt Server API',
          calendarId: googleCalendarId
        }
      };
    } else {
      console.error('[add-event] Ошибка при создании события:', response.status, response.statusText);
      throw new Error(`Ошибка API Google Calendar: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('[add-event] Необработанная ошибка:', error.message || error);
    
    // Возвращаем подробную информацию об ошибке
    return {
      success: false,
      error: error.message || 'Неизвестная ошибка при создании события',
      timestamp: new Date().toISOString(),
      details: {
        name: error.name,
        stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
      }
    };
  }
}); 