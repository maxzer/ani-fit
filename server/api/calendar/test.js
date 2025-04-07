import { defineEventHandler, getHeaders, setResponseHeaders, getMethod } from 'h3';
import { useRuntimeConfig } from '#imports';

// Тестовый обработчик запросов для проверки доступности API
export default defineEventHandler(async (event) => {
  // Получаем метод запроса
  const method = getMethod(event);
  console.log(`[test] Обработка запроса типа: ${method}`);
  
  // Устанавливаем максимально подробные CORS заголовки
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, Origin, X-Requested-With, Authorization, X-Telegram-WebApp, Referer, User-Agent',
    'Access-Control-Max-Age': '86400', // 24 часа
    'Access-Control-Allow-Credentials': 'true',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'X-Debug-CORS': 'Enabled',
    'X-CORS-Test': 'Allowed'
  });
  
  // Проверяем, если это предварительный запрос OPTIONS
  if (method === 'OPTIONS') {
    console.log('[test] Получен OPTIONS запрос, возвращаем 204');
    event.res.statusCode = 204;
    return null;
  }
  
  try {
    // Получаем конфигурацию
    const config = useRuntimeConfig();
    
    // Получаем заголовки запроса для отладки
    const headers = getHeaders(event);
    console.log('[test] Заголовки запроса:', {
      origin: headers.origin,
      referer: headers.referer,
      host: headers.host,
      'content-type': headers['content-type'],
      'user-agent': headers['user-agent'],
      'x-telegram-webapp': headers['x-telegram-webapp']
    });

    // Проверка наличия Telegram WebApp заголовка
    const isTelegramWebApp = headers['x-telegram-webapp'] === '1';
    
    // Определение типа клиента
    let clientType = 'Обычный браузер';
    if (isTelegramWebApp) {
      clientType = 'Telegram WebApp';
    } else if (headers['user-agent']?.includes('Telegram')) {
      clientType = 'Telegram Browser';
    }

    // Проверка доступа к Google API
    let googleApiStatus = 'Не проверено';
    try {
      if (config.googleClientEmail && config.googlePrivateKey && config.googleCalendarId) {
        googleApiStatus = 'Настроено';
      } else {
        googleApiStatus = 'Не настроено';
      }
    } catch (error) {
      googleApiStatus = `Ошибка: ${error.message}`;
    }
    
    // Проверяем возможность сетевых соединений
    let networkStatus = 'Не проверено';
    try {
      // Имитация проверки сети
      networkStatus = 'Доступно';
    } catch (error) {
      networkStatus = `Недоступно: ${error.message}`;
    }
    
    // Возвращаем тестовые данные с расширенной информацией
    return {
      success: true,
      message: 'API доступно и работает',
      timestamp: new Date().toISOString(),
      corsTest: 'Успешно',
      server: {
        environment: process.env.NODE_ENV || 'development',
        apiBaseUrl: config.public.apiBaseUrl,
        googleApiConfigured: googleApiStatus,
        serverTime: new Date().toISOString(),
        networkStatus
      },
      client: {
        type: clientType,
        isTelegramWebApp,
        headers: {
          origin: headers.origin,
          referer: headers.referer,
          host: headers.host,
          userAgent: headers['user-agent'],
          telegramWebApp: headers['x-telegram-webapp']
        },
        ip: headers['x-forwarded-for'] || 'unknown'
      },
      testData: {
        number: 42,
        text: "Тестовые данные успешно получены",
        array: [1, 2, 3],
        object: { key: "value" }
      }
    };
  } catch (error) {
    console.error('[test] Ошибка при обработке запроса:', error);
    return {
      success: false,
      error: 'Ошибка при обработке запроса',
      details: error.message,
      timestamp: new Date().toISOString()
    };
  }
}); 