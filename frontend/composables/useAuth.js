/**
 * Composable для централизованной работы с аутентификацией
 */
import { ref, reactive, computed } from 'vue';
import { useAuthToken } from './useAuthToken';
import { navigateTo } from '#app';
import showNotification from '~/utils/notification';

// Состояние пользователя (реактивное хранилище)
const user = ref(null);
const isAuthenticated = ref(false);
const isLoading = ref(false);
const authError = ref(null);

// История авторизаций для отладки
const authHistory = reactive({
  lastLogin: null,
  lastLogout: null,
  loginCount: 0,
  source: null
});

export const useAuth = () => {
  const { getAuthToken, refreshAuthToken, isTokenValid } = useAuthToken();
  
  /**
   * Инициализация авторизации при запуске приложения
   */
  const initAuth = () => {
    isLoading.value = true;
    
    try {
      if (typeof window !== 'undefined') {
        // Получаем сохраненные данные пользователя
        const userData = localStorage.getItem('user');
        const token = getAuthToken();
        
        if (userData && token) {
          try {
            // Проверяем валидность токена
            if (isTokenValid(token)) {
              user.value = JSON.parse(userData);
              isAuthenticated.value = true;
              
              // Сохраняем данные в историю
              authHistory.source = 'localStorage';
              authHistory.lastLogin = new Date().toISOString();
              authHistory.loginCount++;
              
              // Устанавливаем заголовок для axios, если доступен
              if (window.axios) {
                window.axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
              }
              
              return true;
            } else {
              // Если токен невалидный - очищаем данные
              clearAuthData();
            }
          } catch (error) {
            console.error('Ошибка при инициализации авторизации:', error);
            clearAuthData();
          }
        }
      }
      
      return false;
    } finally {
      isLoading.value = false;
    }
  };
  
  /**
   * Вход пользователя
   * @param {string} token - JWT токен
   * @param {Object} userData - Данные пользователя
   */
  const login = (token, userData) => {
    if (!token || !userData) {
      authError.value = 'Отсутствуют данные для входа';
      return false;
    }
    
    try {
      // Устанавливаем данные пользователя
      user.value = userData;
      isAuthenticated.value = true;
      
      // Сохраняем в localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Устанавливаем заголовок для axios, если доступен
        if (window.axios) {
          window.axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
        
        // Обновляем историю
        authHistory.lastLogin = new Date().toISOString();
        authHistory.loginCount++;
        authHistory.source = 'login';
      }
      
      return true;
    } catch (error) {
      console.error('Ошибка при входе:', error);
      authError.value = error.message || 'Ошибка при входе';
      return false;
    }
  };
  
  /**
   * Выход пользователя
   * @param {boolean} redirect - Перенаправить на страницу логина
   * @param {string} logoutMessage - Сообщение при выходе
   */
  const logout = async (redirect = true, logoutMessage = null) => {
    try {
      // Очищаем данные перед запросом, чтобы UI обновился сразу
      isAuthenticated.value = false;
      
      // Логируем информацию о выходе
      authHistory.lastLogout = new Date().toISOString();
      authHistory.source = 'logout';
      
      // Отправляем запрос на инвалидацию токена
      if (typeof window !== 'undefined' && window.axios) {
        try {
          await window.axios.post('/api/auth/logout');
        } catch (error) {
          // Игнорируем ошибки при запросе на выход
          console.warn('Ошибка при запросе на выход:', error);
        }
      }
      
      // Очищаем данные
      clearAuthData();
      
      // Показываем уведомление, если указано сообщение
      if (logoutMessage) {
        showNotification(logoutMessage, 'info');
      }
      
      // Перенаправляем на страницу логина, если нужно
      if (redirect) {
        navigateTo('/', { replace: true });
      }
      
      return true;
    } catch (error) {
      console.error('Ошибка при выходе:', error);
      return false;
    }
  };
  
  /**
   * Обновление токена авторизации
   */
  const refreshToken = async () => {
    try {
      isLoading.value = true;
      const newToken = await refreshAuthToken();
      
      if (newToken) {
        // После обновления токена проверяем его валидность
        if (!isTokenValid(newToken)) {
          throw new Error('Получен невалидный токен при обновлении');
        }
        
        return newToken;
      } else {
        throw new Error('Не удалось обновить токен');
      }
    } catch (error) {
      console.error('Ошибка при обновлении токена:', error);
      authError.value = error.message;
      
      // При ошибке обновления токена выходим из системы
      await logout(true, 'Сессия истекла. Необходима повторная авторизация.');
      return null;
    } finally {
      isLoading.value = false;
    }
  };
  
  /**
   * Очистка данных авторизации
   */
  const clearAuthData = () => {
    // Очищаем локальные данные
    user.value = null;
    isAuthenticated.value = false;
    
    // Очищаем localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      
      // Удаляем заголовок авторизации
      if (window.axios) {
        delete window.axios.defaults.headers.common['Authorization'];
      }
    }
  };
  
  /**
   * Получение данных текущего пользователя
   */
  const getUser = () => {
    return user.value;
  };
  
  // Вычисляемое свойство - имя пользователя для отображения
  const displayName = computed(() => {
    if (!user.value) return 'Гость';
    
    return user.value.realName || user.value.firstName || 'Пользователь';
  });
  
  return {
    user: computed(() => user.value),
    isAuthenticated: computed(() => isAuthenticated.value),
    isLoading: computed(() => isLoading.value),
    error: computed(() => authError.value),
    authHistory,
    displayName,
    
    initAuth,
    login,
    logout,
    refreshToken,
    getUser,
    clearAuthData
  };
}; 