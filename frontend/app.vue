<template>
  <div class="app-container" :data-theme="theme?.colorScheme || 'light'">
    <div v-if="!isLoading && isTelegramWebAppAvailable && initData">
      <div v-if="isTestMode" class="test-mode-badge">Тестовый режим</div>
      
      <!-- Если не авторизован, показываем компонент авторизации -->
      <div v-if="!isAuthenticated">
        <TelegramLogin />
      </div>
      <!-- Иначе показываем основное содержимое -->
      <NuxtPage v-else />
    </div>
    <div v-else-if="!isTelegramWebAppAvailable" class="loading-container">
      <div class="loading-spinner"></div>
      <p class="loading-text">Ожидание инициализации Telegram WebApp...</p>
      <button @click="initTestMode" class="test-mode-button">Запустить в тестовом режиме</button>
    </div>
    <div v-else class="loading-container">
      <div class="loading-spinner"></div>
      <p class="loading-text">Загрузка приложения...</p>
      <button @click="initTestMode" class="test-mode-button">Запустить в тестовом режиме</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, provide, computed, watch, onBeforeUnmount } from 'vue';
import { getTelegramTheme, isTelegramWebAppReady, getInitData } from './utils/telegram.js';
import TelegramLogin from './components/TelegramLogin.vue';
import '@/assets/css/theme.css';
import axios from 'axios';

// Отладочные переменные
const showDebug = ref(false);
const lastError = ref('');
const toggleDebug = () => {
  showDebug.value = !showDebug.value;
};

// Предоставляем доступ к отладочной информации
provide('lastError', lastError);

// Состояние WebApp
const isTelegramWebAppAvailable = ref(false);
const isLoading = ref(true);
const initData = ref(null);

// Состояние авторизации
const authToken = ref('');
const tempAuthToken = ref('');
const user = ref(null);
const needsProfile = ref(false);
const isAuthenticated = ref(false);

// Инициализация темы с дефолтными значениями
const theme = reactive({
  colorScheme: 'light',
  backgroundColor: '#ffffff',
  textColor: '#000000',
  hintColor: '#999999',
  linkColor: '#2678b6',
  buttonColor: '#3390ec',
  buttonTextColor: '#ffffff',
  secondaryBgColor: '#f0f0f0'
});

// Предоставляем доступ к Telegram WebApp и теме
provide('isTelegramWebAppAvailable', isTelegramWebAppAvailable);
provide('telegramTheme', theme);
provide('isLoading', isLoading);
provide('initData', initData);

// Предоставляем доступ к данным авторизации
provide('authToken', authToken);
provide('tempAuthToken', tempAuthToken);
provide('user', user);
provide('isAuthenticated', isAuthenticated);
provide('needsProfile', needsProfile);

// Экспортируем состояние авторизации в глобальный объект
if (typeof window !== 'undefined') {
  window.__APP_STATE__ = window.__APP_STATE__ || {};
  
  // Наблюдаем за изменением состояния isAuthenticated
  watch(isAuthenticated, (newValue) => {
    window.__APP_STATE__.isAuthenticated = newValue;
  }, { immediate: true });
}

// Определяем, находимся ли мы в тестовом режиме
const isTestMode = computed(() => {
  return typeof window !== 'undefined' && (
    window.location.search.includes('test') || 
    (initData.value && initData.value.user && initData.value.user.id === 12345678)
  );
});

provide('isTestMode', isTestMode);

// Функции для управления авторизацией
const setAuth = (token, userData) => {
  authToken.value = token;
  user.value = userData;
  isAuthenticated.value = true;
  needsProfile.value = false;
  tempAuthToken.value = '';
  
  // Сохраняем данные в localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(userData));
  }
  
  // Устанавливаем заголовок авторизации по умолчанию для axios
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

// Установка временной авторизации (для заполнения профиля)
const setTempAuth = (token, userData) => {
  tempAuthToken.value = token;
  user.value = userData;
  needsProfile.value = true;
  isAuthenticated.value = false;
};

// Выход из аккаунта
const logout = async () => {
  try {
    console.log('Выполняется выход из системы...');
    
    // Отправляем запрос на сервер для инвалидации токена
    if (apiUrl) {
      try {
        await axios.post(`${apiUrl}/api/auth/logout`);
        console.log('Успешно выполнен запрос на выход из системы на сервере');
      } catch (error) {
        console.error('Ошибка при отправке запроса на выход:', error);
        // Продолжаем процесс выхода даже при ошибке запроса
      }
    }
    
    // Очищаем данные авторизации
    authToken.value = '';
    tempAuthToken.value = '';
    user.value = null;
    isAuthenticated.value = false;
    needsProfile.value = false;
    
    // Очищаем все данные из localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      localStorage.removeItem('telegramAuthData');
      localStorage.removeItem('initData');
      localStorage.removeItem('lastRoute');
      
      // Удаляем все ключи, связанные с авторизацией
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('auth') || key.includes('user') || key.includes('token'))) {
          localStorage.removeItem(key);
        }
      }
    }
    
    // Удаляем заголовок авторизации
    delete axios.defaults.headers.common['Authorization'];
    
    console.log('Выход из системы выполнен успешно');
  } catch (error) {
    console.error('Ошибка при выходе из системы:', error);
    // Даже при ошибке пытаемся очистить все локальные данные
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
    delete axios.defaults.headers.common['Authorization'];
  }
};

// Предоставляем функции авторизации другим компонентам
provide('setAuth', setAuth);
provide('setTempAuth', setTempAuth);
provide('logout', logout);

// Проверка сохраненной авторизации при загрузке
const checkAuth = () => {
  if (typeof window !== 'undefined') {
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setAuth(savedToken, userData);
        return true;
      } catch (error) {
        console.error('Ошибка при восстановлении авторизации:', error);
        logout();
      }
    }
  }
  return false;
};

// Функция для обработки ошибок
const logError = (message, error) => {
  console.error(message, error);
  lastError.value = `${message}: ${error?.message || JSON.stringify(error)}`;
  return false;
};

// Экспортируем функцию logout в глобальный объект window
if (typeof window !== 'undefined') {
  window.logout = logout;
}

// Функция для инициализации WebApp
const initializeWebApp = async () => {
  if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
    const webApp = window.Telegram.WebApp;
    
    // Устанавливаем флаг доступности WebApp
    isTelegramWebAppAvailable.value = true;
    
    // Шаг 1: Инициализируем WebApp сразу, чтобы не было задержки
    try {
      webApp.ready();
      
      // Раскрываем на полный экран
      webApp.expand();
      
      // Здесь можно настроить BackButton, MainButton и др.
      webApp.BackButton?.hide();
      
      if (webApp.MainButton) {
        webApp.MainButton.hide();
      }
      
      // Расширение хаков для iOS WebView
      if (webApp.platform === 'ios' || navigator.userAgent.match(/iPhone|iPad|iPod/i)) {
        // Запрещаем зум
        document.addEventListener('touchmove', (e) => {
          if (e.scale !== 1) { e.preventDefault(); }
        }, { passive: false });
      }
    } catch (error) {
      // Ошибка при вызове webApp.ready()
      return logError('Ошибка при инициализации WebApp', error);
    }
    
    // Шаг 2: Получаем и применяем тему
    try {
      const telegramTheme = getTelegramTheme();
      
      if (telegramTheme) {
        Object.keys(telegramTheme).forEach(key => {
          if (key in theme) {
            theme[key] = telegramTheme[key];
          }
        });
      }
    } catch (error) {
      // Ошибка при получении темы
      logError('Ошибка при получении темы', error);
    }
    
    // Шаг 3: Получаем initData
    try {
      const data = await getInitData();
      
      if (data) {
        // Сохраняем данные
        initData.value = data;
        
        // Проверяем сохраненную авторизацию
        const hasAuth = checkAuth();
        
        // Завершаем загрузку
        isLoading.value = false;
        return true;
      } else {
        // Если после ready() все еще нет данных, но WebApp доступен
        
        // Проверяем сохраненную авторизацию
        const hasAuth = checkAuth();
        lastError.value = 'Не удалось получить initData, но WebApp доступен';
        
        // В некоторых случаях мы все равно можем продолжить
        isLoading.value = false;
        return false;
      }
    } catch (error) {
      // Ошибка при получении initData
      
      // Проверяем сохраненную авторизацию
      const hasAuth = checkAuth();
      
      isLoading.value = false;
      return logError('Ошибка при получении initData', error);
    }
  }
  
  lastError.value = 'WebApp недоступен (window.Telegram.WebApp не найден)';
  return false;
};

// Функция для инициализации в тестовом режиме
const initTestMode = () => {
  // Создаем базовый объект для тестового пользователя
  initData.value = {
    user: {
      id: 12345678,
      first_name: "Тестовый",
      last_name: "Пользователь",
      username: "test_user",
      language_code: "ru"
    },
    authDate: Math.floor(Date.now() / 1000),
    hash: "test_hash",
    startParam: null
  };
  
  // Устанавливаем флаги доступности
  isTelegramWebAppAvailable.value = true;
  isLoading.value = false;
  
  // В тестовом режиме по умолчанию не авторизуем пользователя автоматически
  // Только проверяем сохраненную авторизацию
  const hasAuth = checkAuth();
  
  // Если авторизации нет, явно устанавливаем флаги для отображения формы авторизации
  if (!hasAuth) {
    isAuthenticated.value = false;
    needsProfile.value = false;
    logout(); // Сбрасываем состояние авторизации, если оно было
  }
};

// Инициализация приложения
onMounted(async () => {
  // Пытаемся инициализировать WebApp
  const isReady = await initializeWebApp();
  
  // Настроить слежение за изменениями в глобальном объекте __APP_STATE__
  if (typeof window !== 'undefined') {
    // Определяем и мониторим изменения в глобальном состоянии
    if (!window.__APP_STATE__) {
      window.__APP_STATE__ = {
        isAuthenticated: isAuthenticated.value
      };
    }

    // Мутация глобального состояния должна отражаться в локальном состоянии
    Object.defineProperty(window.__APP_STATE__, 'isAuthenticated', {
      get: () => isAuthenticated.value,
      set: (value) => {
        if (value === false && isAuthenticated.value === true) {
          // Если состояние меняется с true на false, вызываем logout
          logout();
        } else if (isAuthenticated.value !== value) {
          isAuthenticated.value = value;
        }
      },
      enumerable: true
    });
  }
  
  // Добавляем глобальную функцию для показа уведомлений
  if (typeof window !== 'undefined') {
    window.showNotification = (message, type = 'info') => {
      // Создаем элемент уведомления, если его еще нет
      let notification = document.getElementById('global-notification');
      
      if (!notification) {
        notification = document.createElement('div');
        notification.id = 'global-notification';
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.padding = '12px 20px';
        notification.style.borderRadius = '8px';
        notification.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
        notification.style.zIndex = '9999';
        notification.style.maxWidth = '90%';
        notification.style.transition = 'opacity 0.3s ease-in-out';
        document.body.appendChild(notification);
      }
      
      // Устанавливаем цвет в зависимости от типа
      const colors = {
        success: '#4caf50',
        error: '#f44336',
        warning: '#ff9800',
        info: '#2196f3'
      };
      
      notification.style.backgroundColor = colors[type] || colors.info;
      notification.style.color = '#ffffff';
      notification.textContent = message;
      notification.style.opacity = '1';
      
      // Автоматически скрываем через 5 секунд
      setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }, 5000);
    };
  }
  
  // Дополнительное расширение на полный экран с задержкой
  if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
    // Вызываем expand при старте
    setTimeout(() => {
      try {
        window.Telegram.WebApp.expand();
      } catch (error) {
        // Игнорируем ошибки
      }
    }, 1000);
    
    // Добавляем обработчик события возврата фокуса к приложению
    // для вызова expand при возвращении из другого приложения или уведомления
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && window.Telegram?.WebApp) {
          window.Telegram.WebApp.expand();
        }
      });
      
      // Также вызываем expand при смене ориентации устройства
      window.addEventListener('orientationchange', () => {
        setTimeout(() => {
          if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.expand();
          }
        }, 300);
      });
      
      // При изменении размера окна также пробуем развернуть
      window.addEventListener('resize', () => {
        if (window.Telegram?.WebApp && !window.Telegram.WebApp.isExpanded) {
          window.Telegram.WebApp.expand();
        }
      });
    }
  }
  
  if (!isReady) {
    // Если не удалось сразу, пробуем каждые 500мс
    let attempts = 0;
    const maxAttempts = 10; // Максимальное количество попыток
    
    const interval = setInterval(async () => {
      attempts++;
      const ready = await initializeWebApp();
      
      if (ready || attempts >= maxAttempts) {
        clearInterval(interval);
        
        // Если после всех попыток не удалось инициализировать, 
        // включаем тестовый режим
        if (!ready && attempts >= maxAttempts) {
          initTestMode();
        }
      }
    }, 500);
  }
});

// Отладочное состояние
const isDebugExpanded = ref(false);
const logEvents = ref([]);

// Добавление события лога
const logEvent = (message) => {
  const now = new Date();
  const time = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}.${now.getMilliseconds()}`;
  logEvents.value.unshift({ time, message });
  // Ограничиваем до 20 событий
  if (logEvents.value.length > 20) {
    logEvents.value = logEvents.value.slice(0, 20);
  }
  console.log(`[App] ${message}`);
};

// Вкл/Выкл отладочной панели
const toggleDebugPanel = () => {
  isDebugExpanded.value = !isDebugExpanded.value;
  logEvent(`Отладочная панель ${isDebugExpanded.value ? 'развернута' : 'свернута'}`);
};

// Очистка перед уничтожением компонента
onBeforeUnmount(() => {
  logEvent('Приложение завершает работу');
});

// Функция для обновления initData извне (например, из компонентов)
const updateInitData = (newData) => {
  if (newData) {
    initData.value = newData;
    logEvent(`initData обновлен: id=${newData.user?.id}`);
  }
};

// Предоставляем функцию обновления initData
provide('updateInitData', updateInitData);
</script>

<style>
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--tg-theme-bg-color);
  color: var(--tg-theme-text-color);
  transition: all 0.3s ease;
}

.app-header {
  position: relative;
  background-color: var(--tg-theme-secondary-bg-color);
  padding: 16px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.app-header h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--tg-theme-text-color);
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 5px solid var(--tg-theme-secondary-bg-color, #f3f3f3);
  border-top: 5px solid var(--tg-theme-button-color, #3390ec);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.loading-text {
  font-size: 18px;
  color: var(--tg-theme-text-color);
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.test-mode-button {
  background-color: #ff9800;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 20px;
  font-weight: bold;
  cursor: pointer;
  margin-top: 20px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
}

.test-mode-button:hover {
  background-color: #f57c00;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.test-mode-button:active {
  transform: translateY(0);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.test-mode-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: #ff9800;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

/* Стили для отладочной панели */
.debug-panel {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: rgba(0, 0, 0, 0.8);
  color: #fff;
  z-index: 9999;
  font-size: 12px;
  max-height: 40vh;
  overflow: auto;
  user-select: text;
}

.debug-header {
  padding: 5px 10px;
  background-color: #ff9800;
  font-weight: bold;
  cursor: pointer;
  text-align: center;
  position: sticky;
  top: 0;
}

.debug-content {
  padding: 10px;
  line-height: 1.4;
  user-select: text;
}

.debug-content pre {
  max-height: 100px;
  overflow: auto;
  background-color: rgba(255, 255, 255, 0.1);
  padding: 5px;
  border-radius: 4px;
  margin: 5px 0;
  user-select: text;
}
</style>
