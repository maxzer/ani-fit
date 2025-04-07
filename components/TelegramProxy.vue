<template>
  <!-- Всегда отображаем отладочную панель независимо от параметра debug -->
  <div class="telegram-proxy-debug">
    <h4>Telegram WebApp Прокси</h4>
    <div v-if="isInitialized" class="status status-active">
      <span class="status-text">Активен ✅</span>
      <button @click="sendTestRequest" class="test-button">Проверить API</button>
    </div>
    <div v-else class="status status-inactive">
      <span class="status-text">Не активен ❌</span>
    </div>
    
    <!-- Всегда показываем информацию о последнем запросе -->
    <div class="response-container">
      <div class="response-title">Информация о последнем запросе:</div>
      <div v-if="lastError" class="error-message">{{ lastError }}</div>
      <pre v-else-if="lastResponse" class="response-data">{{ lastResponse }}</pre>
      <div v-else class="response-empty">Запросов не выполнялось</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, useRuntimeConfig } from '#imports';

const props = defineProps({
  debug: {
    type: Boolean,
    default: false
  }
});

const isInitialized = ref(false);
const lastResponse = ref(null);
const lastError = ref(null);
const baseUrl = ref('');

// Эмиты для передачи событий отладки
const emit = defineEmits(['debug-log']);

// Получаем конфигурацию приложения
const config = useRuntimeConfig();

// Функция логирования
const logDebug = (message, type = 'info') => {
  console.log(`[TelegramProxy] ${message}`);
  emit('debug-log', { message: `[TG Proxy] ${message}`, type });
};

// Инициализируем прокси для работы с API
onMounted(async () => {
  try {
    // Определяем, запущено ли приложение в Telegram WebApp
    const isTelegramWebApp = typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp;
    
    if (isTelegramWebApp) {
      logDebug('Инициализация в среде Telegram WebApp');
      
      // Устанавливаем базовый URL из конфигурации
      baseUrl.value = config.public.apiBaseUrl || 'https://maxzer.ru';
      logDebug(`Базовый URL: ${baseUrl.value}`);
      
      // Регистрируем глобальную функцию для отправки запросов
      window.telegramApiProxy = {
        fetch: async (endpoint, options = {}) => {
          lastError.value = null; // Сбрасываем ошибку перед запросом
          
          try {
            const url = `${baseUrl.value}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
            
            // Добавляем специальные заголовки для Telegram WebApp
            const fetchOptions = {
              ...options,
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Origin': window.location.origin || 'https://t.me',
                'X-Requested-With': 'XMLHttpRequest',
                'X-Telegram-WebApp': '1',
                ...options.headers
              },
              mode: 'cors',
              credentials: 'omit'
            };
            
            logDebug(`Отправка запроса на ${url}`);
            
            const response = await fetch(url, fetchOptions);
            
            if (!response.ok) {
              const errorText = await response.text();
              logDebug(`Ошибка запроса: ${response.status}`, 'error');
              lastError.value = `HTTP ошибка: ${response.status}, ${errorText}`;
              throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorText}`);
            }
            
            const data = await response.json();
            logDebug(`Ответ от ${url} получен успешно`);
            
            lastResponse.value = JSON.stringify(data, null, 2);
            return data;
          } catch (error) {
            logDebug(`Ошибка при отправке запроса: ${error.message}`, 'error');
            lastError.value = error.message;
            lastResponse.value = null;
            throw error;
          }
        }
      };
      
      isInitialized.value = true;
      logDebug('Прокси успешно инициализирован ✅');
    } else {
      logDebug('Запущено не в Telegram WebApp, прокси не инициализирован ❌', 'error');
    }
  } catch (error) {
    logDebug(`Ошибка инициализации: ${error.message}`, 'error');
    lastError.value = `Ошибка инициализации: ${error.message}`;
  }
});

// Тестовая функция для проверки работы API
const sendTestRequest = async () => {
  try {
    lastError.value = null;
    const testEndpoint = '/api/calendar/test';
    logDebug(`Отправка тестового запроса на ${testEndpoint}`);
    
    // Используем прокси для тестового запроса
    const data = await window.telegramApiProxy.fetch(testEndpoint, { 
      method: 'GET'
    });
    
    logDebug('Тестовый запрос выполнен успешно ✅');
    lastResponse.value = JSON.stringify(data, null, 2);
  } catch (error) {
    logDebug(`Ошибка тестового запроса: ${error.message}`, 'error');
    lastError.value = `Ошибка запроса: ${error.message}`;
    lastResponse.value = null;
  }
};
</script>

<style scoped>
.telegram-proxy-debug {
  margin: 10px;
  padding: 16px;
  border: 2px solid #ff9800;
  border-radius: 8px;
  background-color: #1e1e1e;
  font-family: monospace;
  font-size: 14px;
  color: #f0f0f0;
}

h4 {
  margin-top: 0;
  color: #ff9800;
  border-bottom: 1px solid #ff9800;
  padding-bottom: 8px;
  text-align: center;
  font-size: 18px;
}

.status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  border-radius: 4px;
  margin-bottom: 12px;
}

.status-active {
  background-color: rgba(76, 175, 80, 0.2);
  border-left: 3px solid #4CAF50;
}

.status-inactive {
  background-color: rgba(244, 67, 54, 0.2);
  border-left: 3px solid #F44336;
  color: #F44336;
}

.status-text {
  font-weight: bold;
  font-size: 16px;
}

.test-button {
  background-color: #ff9800;
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  cursor: pointer;
  font-weight: bold;
}

.test-button:hover {
  background-color: #ffa726;
}

.response-container {
  background-color: #000;
  border-radius: 4px;
  padding: 12px;
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #333;
}

.response-title {
  color: #ff9800;
  font-weight: bold;
  margin-bottom: 8px;
  font-size: 14px;
}

.error-message {
  color: #F44336;
  padding: 8px;
  background-color: rgba(244, 67, 54, 0.1);
  border-radius: 4px;
  border-left: 3px solid #F44336;
}

.response-data {
  background-color: #222;
  padding: 8px;
  border-radius: 4px;
  white-space: pre-wrap;
  overflow-x: auto;
  margin: 0;
  font-size: 12px;
}

.response-empty {
  color: #777;
  font-style: italic;
  text-align: center;
  padding: 10px 0;
}
</style> 