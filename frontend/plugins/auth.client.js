/**
 * Плагин для проверки валидности токена авторизации
 * Периодически проверяет токен и перенаправляет на страницу логина, если токен истек
 */

import { useAuthToken } from '~/composables/useAuthToken';

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
    
    // Получаем текущий токен
    const { getAuthToken } = useAuthToken();
    const token = getAuthToken();
    
    // Если токена нет, сразу отмечаем как неавторизованного
    if (!token) {
      handleInvalidToken();
      return;
    }
    
    try {
      // Проверяем токен через API
      const apiUrl = nuxtApp.$config.public.apiUrl || 'https://maxzer.ru';
      const response = await fetch(`${apiUrl}/api/auth/validate-token`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Если получаем 401, значит токен недействителен
      if (response.status === 401) {
        handleInvalidToken();
        return;
      }
      
      // Анализируем ответ
      const data = await response.json();
      
      // Если API сообщает, что токен недействителен
      if (data && data.valid === false) {
        handleInvalidToken();
      }
    } catch (error) {
      // Ошибки сети или другие проблемы - игнорируем
      console.error('Ошибка при проверке токена:', error);
    }
  };
  
  // Обработка недействительного токена
  const handleInvalidToken = () => {
    if (typeof window !== 'undefined') {
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
      }
      
      // Обновляем страницу для показа экрана логина
      window.location.reload();
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