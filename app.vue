<template>
  <div class="app-container" :data-theme="theme?.colorScheme || 'light'">
    <!-- Кнопка включения/выключения отладочной информации -->
    <button class="debug-toggle" @click="toggleDebugInfo">
      {{ showDebugInfo ? 'Скрыть отладку' : 'Показать отладку' }}
    </button>

    <!-- Отладочная информация -->
    <div v-if="showDebugInfo" class="debug-info">
      <h3>Отладочная информация</h3>
      
      <!-- Сноска о тестовом режиме -->
      <div v-if="initData?.isTestMode" class="test-mode-notice">
        <p><strong>Внимание!</strong> Приложение запущено в тестовом режиме с эмуляцией Telegram WebApp.</p>
        <p>Используются тестовые данные пользователя.</p>
      </div>
      
      <div class="debug-section">
        <h4>Состояние WebApp</h4>
        <p>WebApp доступен: <span :class="isTelegramWebAppAvailable ? 'status-success' : 'status-error'">{{ isTelegramWebAppAvailable ? 'Да' : 'Нет' }}</span></p>
        <p>initData доступны: <span :class="initData ? 'status-success' : 'status-error'">{{ initData ? 'Да' : 'Нет' }}</span></p>
        <p>User доступен: <span :class="initData?.user ? 'status-success' : 'status-error'">{{ initData?.user ? 'Да' : 'Нет' }}</span></p>
        <p v-if="initData?.isTestMode" class="test-mode">Тестовый режим: <span class="status-warning">Да</span></p>
      </div>

      <div class="debug-section" v-if="initData?.user">
        <h4>Данные пользователя</h4>
        <p>ID: {{ initData.user.id }}</p>
        <p>Имя: {{ initData.user.first_name }}</p>
        <p>Фамилия: {{ initData.user.last_name || 'Не указана' }}</p>
        <p>Username: {{ initData.user.username || 'Не указан' }}</p>
        <p>Язык: {{ initData.user.language_code || 'Не указан' }}</p>
      </div>

      <div class="debug-section">
        <h4>Тема приложения</h4>
        <p>Цветовая схема: {{ theme.colorScheme }}</p>
        <p>Фон: {{ theme.backgroundColor }}</p>
        <p>Текст: {{ theme.textColor }}</p>
      </div>

      <div class="debug-section">
        <h4>Состояние приложения</h4>
        <p>Загрузка: <span :class="isLoading ? 'status-warning' : 'status-success'">{{ isLoading ? 'В процессе' : 'Завершена' }}</span></p>
      </div>
    </div>

    <div v-if="!isLoading && isTelegramWebAppAvailable && initData">
      <header class="app-header">
        <h1>Добро пожаловать в Ani-Fit</h1>
        <div v-if="initData?.isTestMode" class="test-mode-badge">Тестовый режим</div>
      </header>
      <NuxtPage />
    </div>
    <div v-else-if="!isTelegramWebAppAvailable" class="loading-container">
      <div class="loading-spinner"></div>
      <p class="loading-text">Ожидание инициализации Telegram WebApp...</p>
    </div>
    <div v-else class="loading-container">
      <div class="loading-spinner"></div>
      <p class="loading-text">Загрузка приложения...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, provide } from 'vue';
import { getTelegramTheme, isTelegramWebAppReady, getInitData } from './utils/telegram.js';
import '@/assets/css/theme.css';

// Состояние WebApp
const isTelegramWebAppAvailable = ref(false);
const isLoading = ref(true);
const initData = ref(null);
const showDebugInfo = ref(false);

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
provide('showDebugInfo', showDebugInfo);

// Функция для инициализации WebApp
const initializeWebApp = async () => {
  if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
    const webApp = window.Telegram.WebApp;
    
    // Устанавливаем флаг доступности WebApp
    isTelegramWebAppAvailable.value = true;
    
    // Шаг 1: Инициализируем WebApp сразу, чтобы не было задержки
    try {
      webApp.ready();
      
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
      console.error('Ошибка при вызове webApp.ready():', error);
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
      console.error('Ошибка при получении темы:', error);
    }
    
    // Шаг 3: Получаем initData
    try {
      const data = await getInitData();
      
      if (data) {
        // Сохраняем данные
        initData.value = data;
        // Завершаем загрузку
        isLoading.value = false;
        return true;
      } else {
        // Если после ready() все еще нет данных, но WebApp доступен
        
        // В некоторых случаях мы все равно можем продолжить
        isLoading.value = false;
        return false;
      }
    } catch (error) {
      console.error('Ошибка при получении initData:', error);
      isLoading.value = false;
      return false;
    }
  }
  
  return false;
};

// Инициализация приложения
onMounted(async () => {
  // Проверка запуска в Telegram
  const isInTelegram = checkIfRunningInTelegram();
  
  // Проверка параметров в URL для включения режима отладки
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('debug')) {
      showDebugInfo.value = true;
    }
    
    // Для локальной отладки: запуск приложения без Telegram WebApp
    if (!isInTelegram || urlParams.has('mock_telegram')) {
      mockTelegramWebApp();
      return;
    }
  }
  
  // Пытаемся инициализировать WebApp
  const isReady = await initializeWebApp();
  
  if (!isReady) {
    // Если не удалось сразу, пробуем каждые 500мс
    const interval = setInterval(async () => {
      const ready = await initializeWebApp();
      if (ready) {
        clearInterval(interval);
      }
    }, 500);
  }
});

// Функция для проверки запуска в Telegram
const checkIfRunningInTelegram = () => {
  if (typeof window === 'undefined') return false;
  
  // Проверка на наличие объекта Telegram.WebApp
  if (!window.Telegram || !window.Telegram.WebApp) {
    return false;
  }
  
  // Проверка URL на telegram.org или t.me
  const host = window.location.host.toLowerCase();
  if (host.includes('telegram.org') || host.includes('t.me')) {
    return true;
  }
  
  // Проверка User-Agent
  const userAgent = window.navigator.userAgent.toLowerCase();
  if (userAgent.includes('telegram') || userAgent.includes('tgweb')) {
    return true;
  }
  
  // Проверка параметров запуска
  const webApp = window.Telegram.WebApp;
  const hasInitData = !!webApp.initData || !!webApp.initDataUnsafe;
  
  return hasInitData;
};

// Функция для эмуляции Telegram WebApp при локальной разработке
const mockTelegramWebApp = () => {
  // Создаем мок-объект Telegram.WebApp
  if (typeof window !== 'undefined') {
    if (!window.Telegram) {
      window.Telegram = { WebApp: {} };
    } else if (!window.Telegram.WebApp) {
      window.Telegram.WebApp = {};
    }
    
    // Заполняем мок-данными
    window.Telegram.WebApp = {
      ...window.Telegram.WebApp,
      initData: '',
      initDataUnsafe: {
        user: {
          id: 12345678,
          first_name: 'Тестовый',
          last_name: 'Пользователь',
          username: 'test_user',
          language_code: 'ru'
        },
        auth_date: Math.floor(Date.now() / 1000),
        hash: 'test_hash',
        start_param: 'test_start'
      },
      version: '6.0',
      platform: 'web',
      colorScheme: 'light',
      themeParams: {
        bg_color: '#ffffff',
        text_color: '#000000',
        hint_color: '#999999',
        link_color: '#2678b6',
        button_color: '#3390ec',
        button_text_color: '#ffffff',
        secondary_bg_color: '#f0f0f0'
      },
      ready: () => {}
    };
  }
  
  // Получаем тему от мок-объекта
  const telegramTheme = getTelegramTheme();
  if (telegramTheme) {
    Object.keys(telegramTheme).forEach(key => {
      if (key in theme) {
        theme[key] = telegramTheme[key];
      }
    });
  }
  
  // Устанавливаем значения для отображения
  isTelegramWebAppAvailable.value = true;
  isLoading.value = false;
  
  // Получаем данные из мок-объекта
  getInitData().then(data => {
    if (data) {
      initData.value = data;
      
      // Добавляем сноску о тестовом режиме
      initData.value.isTestMode = true;
    }
  });
};

// Функция для включения/выключения отладочной информации
const toggleDebugInfo = () => {
  showDebugInfo.value = !showDebugInfo.value;
};
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
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.debug-info {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background-color: var(--tg-theme-bg-color, #ffffff);
  color: var(--tg-theme-text-color, #333333);
  padding: 20px;
  z-index: 1000;
  max-height: 50vh;
  overflow-y: auto;
  border-bottom: 1px solid var(--tg-theme-hint-color, #999999);
}

.debug-section {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--tg-theme-hint-color, #999999);
}

.debug-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.debug-section h4 {
  margin: 0 0 10px 0;
  color: var(--tg-theme-text-color, #333333);
  font-size: 16px;
  font-weight: 600;
}

.debug-section p {
  margin: 5px 0;
  font-size: 14px;
  line-height: 1.5;
}

.status-success {
  color: #4caf50;
  font-weight: 600;
}

.status-error {
  color: #f44336;
  font-weight: 600;
}

.status-warning {
  color: #ff9800;
  font-weight: 600;
}

.debug-toggle {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 8px 16px;
  background-color: var(--tg-theme-button-color, #3390ec);
  color: var(--tg-theme-button-text-color, #ffffff);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
}

.debug-toggle:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.test-mode-notice {
  background-color: var(--tg-theme-secondary-bg-color);
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 20px;
  border-left: 4px solid #ff9800;
}

.test-mode {
  color: var(--tg-theme-text-color);
  font-weight: 600;
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
</style>
