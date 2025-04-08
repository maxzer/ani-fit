<template>
  <div class="app-container" :data-theme="theme?.colorScheme || 'light'">
    <div v-if="!isLoading && isTelegramWebAppAvailable && initData">
      <div v-if="isTestMode" class="test-mode-badge">Тестовый режим</div>
      <NuxtPage />
    </div>
    <div v-else-if="!isTelegramWebAppAvailable" class="loading-container">
      <div class="loading-spinner"></div>
      <p class="loading-text">Ожидание инициализации Telegram WebApp...</p>
      <button @click="initTestMode" class="test-mode-button">Запустить в тестовом режиме</button>
    </div>
    <div v-else class="loading-container">
      <div class="loading-spinner"></div>
      <p class="loading-text">Загрузка приложения...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, provide, computed } from 'vue';
import { getTelegramTheme, isTelegramWebAppReady, getInitData } from './utils/telegram.js';
import '@/assets/css/theme.css';

// Состояние WebApp
const isTelegramWebAppAvailable = ref(false);
const isLoading = ref(true);
const initData = ref(null);

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

// Определяем, находимся ли мы в тестовом режиме
const isTestMode = computed(() => {
  return typeof window !== 'undefined' && (
    window.location.search.includes('test') || 
    (initData.value && initData.value.user && initData.value.user.id === 12345678)
  );
});

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
      // Ошибка при получении initData
      isLoading.value = false;
      return false;
    }
  }
  
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
};

// Инициализация приложения
onMounted(async () => {
  // Пытаемся инициализировать WebApp
  const isReady = await initializeWebApp();
  
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
</style>
