import { defineNuxtPlugin } from '#app';

export default defineNuxtPlugin((nuxtApp) => {
  // Выполняем только в браузере
  if (typeof window === 'undefined') return;
  
  console.log('Инициализация Telegram WebApp плагина');
  
  // Проверяем наличие Telegram WebApp API
  if (window.Telegram && window.Telegram.WebApp) {
    console.log('Telegram WebApp API доступен');
    
    try {
      // Инициализируем Telegram WebApp
      const webApp = window.Telegram.WebApp;
      
      // Расширяем API для работы с WebApp
      webApp.ready();
      webApp.expand();
      
      // Отключаем сообщение о выходе из приложения
      webApp.enableClosingConfirmation();
      
      // Устанавливаем фон
      if (webApp.platform) {
        console.log('Платформа Telegram:', webApp.platform);
      }
      
      // Адаптируем под тему Telegram
      const colorScheme = webApp.colorScheme || 'light';
      document.documentElement.setAttribute('data-theme', colorScheme);
      
      // Наблюдаем за изменениями темы
      webApp.onEvent('themeChanged', () => {
        const newColorScheme = webApp.colorScheme || 'light';
        document.documentElement.setAttribute('data-theme', newColorScheme);
      });
      
      // Добавляем обработчик сетевых ошибок для отладки
      const originalFetch = window.fetch;
      window.fetch = async function(...args) {
        try {
          const response = await originalFetch.apply(this, args);
          
          // Логируем успешные запросы
          if (args[0] && args[0].includes && args[0].includes('/api/')) {
            console.log(`[TG WebApp] Fetch request success: ${args[0]}`);
          }
          
          return response;
        } catch (error) {
          // Логируем ошибки сети
          console.error(`[TG WebApp] Fetch error for ${args[0]}:`, error);
          throw error;
        }
      };
      
      // Экспортируем webApp в глобальный объект для доступа из компонентов
      nuxtApp.provide('telegram', webApp);
      
      console.log('Telegram WebApp успешно инициализирован');
    } catch (error) {
      console.error('Ошибка инициализации Telegram WebApp:', error);
    }
  } else {
    console.log('Telegram WebApp API не доступен. Запущено в обычном браузере.');
  }
}); 