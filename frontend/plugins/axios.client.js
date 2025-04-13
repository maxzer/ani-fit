import axios from 'axios';

export default defineNuxtPlugin((nuxtApp) => {
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
          
          // Устанавливаем флаг isAuthenticated в false
          if (nuxtApp && nuxtApp.$state) {
            // Для инжектированных через provide состояний
            const appState = nuxtApp.$state.app || nuxtApp.payload.state?.app;
            if (appState) {
              appState.isAuthenticated = false;
            }
          }

          // Явно указываем, что пользователь не авторизован
          // Обращаемся к глобальному состоянию для использования provide/inject
          const globalState = window.__APP_STATE__ = window.__APP_STATE__ || {};
          globalState.isAuthenticated = false;
          
          // Если есть доступ к функциям logout из app.vue
          if (typeof window.logout === 'function') {
            window.logout();
          }
          
          // Перезагружаем страницу без задержки для немедленного перехода на страницу логина
          window.location.reload();
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