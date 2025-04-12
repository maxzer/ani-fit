import axios from 'axios';

export default defineNuxtPlugin(({ $config }) => {
  // Создаем глобальный экземпляр axios
  window.axios = axios;
  
  // Настраиваем интерцептор для обработки ошибок авторизации
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      // Если получена ошибка 401 - токен истек
      if (error.response && error.response.status === 401) {
        console.error('Токен авторизации истек. Перенаправление на страницу логина.');
        
        // Очищаем данные авторизации из localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          
          // Удаляем заголовок авторизации
          delete axios.defaults.headers.common['Authorization'];
          
          // Показываем уведомление пользователю
          if (typeof window.showNotification === 'function') {
            window.showNotification('Срок действия авторизации истек. Выполняется перенаправление...', 'error');
          }
          
          // Перезагружаем страницу после небольшой задержки
          setTimeout(() => {
            window.location.reload();
          }, 500);
        }
      }
      
      return Promise.reject(error);
    }
  );
  
  // Предоставляем axios для использования в компонентах
  return {
    provide: {
      axios
    }
  };
}); 