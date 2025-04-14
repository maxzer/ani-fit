/**
 * Composable для работы с токеном авторизации
 * @returns {Object} Объект с методами для работы с токеном
 */
export const useAuthToken = () => {
  // Функция инициализации токена
  const initAuthToken = () => {
    if (typeof window !== 'undefined') {
      if (!window.authToken) {
        try {
          const storedToken = window.localStorage?.getItem('authToken');
          if (storedToken) {
            window.authToken = storedToken;
          }
        } catch (e) {
          // Ошибка доступа к localStorage
        }
        
        if (!window.authToken && window.axios?.defaults?.headers?.common?.['Authorization']) {
          const authHeader = window.axios.defaults.headers.common['Authorization'];
          if (authHeader && authHeader.startsWith('Bearer ')) {
            window.authToken = authHeader.substring(7);
          }
        }
      }
    }
  };

  // Проверка валидности токена (базовая структурная проверка)
  const isTokenValid = (token) => {
    if (!token || typeof token !== 'string') return false;
    
    try {
      // Разделяем JWT на части
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      
      // Проверяем, можно ли декодировать payload
      const payload = JSON.parse(atob(parts[1]));
      
      // Проверка на expired
      if (payload.exp) {
        const expTimestamp = payload.exp * 1000; // JWT exp в секундах, JS timestamp в миллисекундах
        if (Date.now() >= expTimestamp) {
          console.warn('Токен истек по времени');
          return false;
        }
      }
      
      return true;
    } catch (e) {
      console.error('Ошибка при проверке токена:', e);
      return false;
    }
  };

  // Функция для обновления токена авторизации
  const refreshAuthToken = async () => {
    try {
      // Проверка запуска в Telegram WebApp
      const isTelegramEnv = typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp;
      
      if (isTelegramEnv) {
        return await refreshTelegramToken();
      } else {
        return await refreshStandardToken();
      }
    } catch (error) {
      console.error('Ошибка при обновлении токена:', error);
      return null;
    }
  };

  // Обновление токена через Telegram
  const refreshTelegramToken = async () => {
    const tgWebApp = window.Telegram.WebApp;
    
    if (!tgWebApp.initData) {
      return null;
    }
    
    // Извлекаем информацию о пользователе и параметры из initData
    const userData = tgWebApp.initDataUnsafe?.user || {};
    
    // Создаем запрос для повторной авторизации
    const authRequest = {
      initData: tgWebApp.initData,
      telegram_data: userData,
      client_time: new Date().toISOString(),
      action: 'refresh_token',
      nonce: Math.random().toString(36).substring(2, 15)
    };
    
    try {
      // Отправляем запрос на сервер с прямым использованием fetch
      const response = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(authRequest),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Ошибка при обновлении токена: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.accessToken) {
        return saveAndReturnToken(data.accessToken);
      }
    } catch (error) {
      console.error('Ошибка при обновлении токена через Telegram:', error);
    }
    
    return null;
  };

  // Обновление токена через стандартный API
  const refreshStandardToken = async () => {
    try {
      const response = await fetch('/api/auth/refresh-token', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Ошибка при обновлении токена: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.accessToken) {
        return saveAndReturnToken(data.accessToken);
      }
    } catch (error) {
      console.error('Ошибка при обновлении стандартного токена:', error);
    }
    
    return null;
  };

  // Сохранение и возврат полученного токена
  const saveAndReturnToken = async (token) => {
    if (!token || typeof token !== 'string') {
      console.error('Получен некорректный токен');
      return null;
    }
    
    // Проверяем валидность токена
    if (!isTokenValid(token)) {
      console.error('Полученный токен не прошел валидацию');
      return null;
    }
    
    if (typeof window !== 'undefined') {
      // Сохраняем токен в глобальную переменную
      window.authToken = token;
      
      // Обновляем заголовки axios
      if (window.axios) {
        window.axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      // Обновляем кэш запросов
      try {
        if (window.caches) {
          window.caches.keys().then(names => {
            names.forEach(name => {
              window.caches.delete(name);
            });
          });
        }
      } catch (cacheError) {
        // Игнорируем ошибки кэша
      }
      
      // Сохраняем в localStorage
      try {
        localStorage.setItem('authToken', token);
      } catch (e) {
        // Игнорируем ошибки localStorage
      }
    }
    
    // Небольшая задержка перед возвратом нового токена
    await new Promise(resolve => setTimeout(resolve, 50));
    
    return token;
  };

  // Получение токена авторизации из различных источников
  const getAuthToken = () => {
    let authToken = '';
    
    if (typeof window !== 'undefined') {
      // 1. Проверяем глобальный объект
      if (window.authToken) {
        authToken = window.authToken;
      } 
      // 2. Проверяем axios.defaults.headers
      else if (window.axios?.defaults?.headers?.common?.['Authorization']) {
        const authHeader = window.axios.defaults.headers.common['Authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
          authToken = authHeader.substring(7);
        }
      }
      // 3. Пробуем localStorage
      else if (window.localStorage) {
        try {
          authToken = window.localStorage.getItem('authToken');
        } catch (e) {
          // Игнорируем ошибки доступа
        }
      }
      
      // Проверяем валидность полученного токена
      if (authToken && !isTokenValid(authToken)) {
        console.warn('Получен невалидный токен, сбрасываем');
        authToken = '';
        
        // Очищаем невалидный токен из хранилища
        try {
          localStorage.removeItem('authToken');
        } catch (e) {
          // Игнорируем ошибки localStorage
        }
        
        // Удаляем заголовок авторизации
        if (window.axios) {
          delete window.axios.defaults.headers.common['Authorization'];
        }
      }
    }
    
    return authToken;
  };

  return {
    initAuthToken,
    refreshAuthToken,
    getAuthToken,
    isTokenValid
  };
}; 