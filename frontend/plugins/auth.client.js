/**
 * Плагин для проверки валидности токена авторизации
 * Периодически проверяет токен и перенаправляет на страницу логина, если токен истек
 */

import { useAuthToken } from '~/composables/useAuthToken';
import showNotification from '~/utils/notification';
import { navigateTo } from '#app';

export default defineNuxtPlugin((nuxtApp) => {
  // Задаем интервал проверки токена (30 секунд)
  const TOKEN_CHECK_INTERVAL = 30 * 1000;
  let tokenCheckInterval = null;
  
  // Функция для проверки валидности токена
  const validateToken = async () => {
    // Пропускаем проверку, если пользователь и так не авторизован
    if (typeof window !== 'undefined' && window.__APP_STATE__ && window.__APP_STATE__.isAuthenticated === false) {
      return;
    }
    
    // Получаем текущий токен и функцию проверки
    const { getAuthToken, isTokenValid } = useAuthToken();
    const token = getAuthToken();
    
    // Если токена нет, сразу отмечаем как неавторизованного
    if (!token) {
      handleInvalidToken();
      return;
    }
    
    // Проверяем локально структуру и срок действия токена
    if (!isTokenValid(token)) {
      handleInvalidToken('Срок действия токена истек или токен недействителен');
      return;
    }
    
    try {
      // Дополнительно проверяем токен через API (опционально)
      const apiUrl = nuxtApp.$config.public.apiUrl || 'https://maxzer.ru';
      const response = await fetch(`${apiUrl}/api/auth/validate-token`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Если получаем 401, значит токен недействителен на сервере
      if (response.status === 401) {
        handleInvalidToken('Сервер отклонил токен авторизации');
        return;
      }
      
      // Анализируем ответ
      const data = await response.json();
      
      // Если API сообщает, что токен недействителен
      if (data && data.valid === false) {
        handleInvalidToken(data.message || 'Токен недействителен');
      }
    } catch (error) {
      // Ошибки сети не считаем фатальными - просто логируем
      console.error('Ошибка при проверке токена через API:', error);
    }
  };
  
  // Обработка недействительного токена
  const handleInvalidToken = (message = 'Сессия истекла. Выполняется перенаправление...') => {
    if (typeof window !== 'undefined') {
      // Показываем уведомление
      showNotification(message, 'error');
      
      // Очищаем данные авторизации
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      
      // Удаляем заголовок авторизации
      if (window.axios && window.axios.defaults) {
        delete window.axios.defaults.headers.common['Authorization'];
      }
      
      // Устанавливаем флаг неавторизованного пользователя
      const globalState = window.__APP_STATE__ = window.__APP_STATE__ || {};
      globalState.isAuthenticated = false;
      
      // Вызываем функцию выхода из app.vue, если доступна
      if (typeof window.logout === 'function') {
        window.logout();
      } else {
        // Если logout функция недоступна, выполняем перенаправление вручную
        navigateTo('/', { replace: true });
      }
    }
  };
  
  // Запускаем проверку при маунтинге
  if (process.client) {
    // Используем onMounted через nextTick для запуска после инициализации приложения
    nuxtApp.vueApp.runWithContext(() => {
      nextTick(() => {
        // Запускаем первичную проверку через 5 секунд после загрузки
        setTimeout(() => {
          validateToken();
          
          // Запускаем периодическую проверку
          tokenCheckInterval = setInterval(validateToken, TOKEN_CHECK_INTERVAL);
        }, 5000);
      });
    });
    
    // Очищаем интервал при уничтожении приложения
    nuxtApp.hook('app:beforeUnmount', () => {
      if (tokenCheckInterval) {
        clearInterval(tokenCheckInterval);
      }
    });
  }
  
  // Предоставляем функции для использования в компонентах
  return {
    provide: {
      validateToken,
      handleInvalidToken
    }
  };
}); 