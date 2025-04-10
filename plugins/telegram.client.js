import { defineNuxtPlugin } from '#app';

const script = document.createElement('script');
script.src = 'https://telegram.org/js/telegram-web-app.js';
script.async = false;
document.head.appendChild(script);

export default defineNuxtPlugin((nuxtApp) => {
  // Выполняем только в браузере
  if (typeof window === 'undefined') return;
  
  // Проверяем наличие Telegram WebApp API
  if (window.Telegram && window.Telegram.WebApp) {
    try {
      // Инициализируем Telegram WebApp
      const webApp = window.Telegram.WebApp;
      
      // Расширяем API для работы с WebApp
      webApp.ready();
      
      // Гарантированно раскрываем на полный экран
      webApp.expand();
      setTimeout(() => webApp.expand(), 1000);
      
      // Отключаем сообщение о выходе из приложения
      webApp.enableClosingConfirmation();
      
      // Следим за изменением размера контейнера и снова вызываем expand при необходимости
      webApp.onEvent('viewportChanged', () => {
        if (!webApp.isExpanded) {
          webApp.expand();
        }
      });
      
      // Адаптируем под тему Telegram
      const colorScheme = webApp.colorScheme || 'light';
      document.documentElement.setAttribute('data-theme', colorScheme);
      
      // Наблюдаем за изменениями темы
      webApp.onEvent('themeChanged', () => {
        const newColorScheme = webApp.colorScheme || 'light';
        document.documentElement.setAttribute('data-theme', newColorScheme);
      });
      
      // Добавляем обработчик сетевых ошибок
      const originalFetch = window.fetch;
      window.fetch = async function(...args) {
        try {
          const response = await originalFetch.apply(this, args);
          return response;
        } catch (error) {
          throw error;
        }
      };
      
      // Экспортируем webApp в глобальный объект для доступа из компонентов
      nuxtApp.provide('telegram', webApp);
    } catch (error) {
      // Ошибка инициализации
    }
  }
}); 