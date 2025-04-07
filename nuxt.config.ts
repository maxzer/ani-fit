// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  compatibilityDate: "2025-04-07",
  
  // В Nuxt 3 переменные окружения загружаются автоматически
  // Явное использование dotenv для дебаггинга
  hooks: {
    'ready': (nuxt) => {
      console.log('Loaded environment variables:')
      console.log('GOOGLE_CLIENT_EMAIL exists:', !!process.env.GOOGLE_CLIENT_EMAIL)
      console.log('GOOGLE_PRIVATE_KEY exists:', !!process.env.GOOGLE_PRIVATE_KEY)
      console.log('GOOGLE_CALENDAR_ID exists:', !!process.env.GOOGLE_CALENDAR_ID)
    }
  },

  app: {
    head: {
      script: [
        {
          src: 'https://telegram.org/js/telegram-web-app.js',
          async: true,
          defer: true
        }
      ],
      meta: [
        { name: 'format-detection', content: 'telephone=no' },
        { name: 'referrer', content: 'no-referrer-when-downgrade' }
      ]
    }
  },

  // Добавляем транспиляцию для v-calendar
  build: {
    transpile: ['v-calendar']
  },
  
  // Настраиваем Vite для включения @popperjs/core в оптимизацию
  vite: {
    optimizeDeps: {
      include: ['@popperjs/core']
    },
    // Явно указываем загрузку переменных окружения
    envPrefix: ['VITE_', 'GOOGLE_', 'API_', 'TELEGRAM_']
  },
  
  // Настройки для работы с различными окружениями
  runtimeConfig: {
    // Секретные API ключи, доступные только на сервере
    googleClientEmail: process.env.GOOGLE_CLIENT_EMAIL || '',
    googlePrivateKey: process.env.GOOGLE_PRIVATE_KEY || '',
    googleCalendarId: process.env.GOOGLE_CALENDAR_ID || '',
    
    // Публичные переменные, доступные на клиенте
    public: {
      telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
      apiBaseUrl: process.env.API_BASE_URL || 'https://maxzer.ru',
      isProduction: process.env.NODE_ENV === 'production'
    }
  },
  
  // Настройки nitro сервера
  nitro: {
    preset: 'node-server',
    // Добавляем поддержку CORS для всех маршрутов API
    routeRules: {
      '/api/**': {
        cors: true,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Accept, Origin, X-Requested-With, Authorization, X-Telegram-WebApp, Referer',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400'
        }
      }
    }
  }
})