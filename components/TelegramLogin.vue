<template>
  <div class="telegram-login">
    <h2 class="login-title">Авторизация через Telegram</h2>
    <p class="login-description">Для начала работы необходимо авторизоваться через Telegram</p>
    
    <!-- Карточка пользователя -->
    <div v-if="userData" class="user-card">
      <div class="user-avatar">
        <img v-if="userData.photoUrl" :src="userData.photoUrl" alt="Аватар" />
        <div v-else class="default-avatar">{{ getUserInitials() }}</div>
      </div>
      <div class="user-info">
        <div class="user-name">{{ userData.firstName }} {{ userData.lastName }}</div>
        <div v-if="userData.username" class="user-username">@{{ userData.username }}</div>
      </div>
    </div>
    
    <!-- Кнопка авторизации -->
    <button 
      @click="handleLogin" 
      class="login-button"
      :disabled="isAuthenticating"
    >
      <span v-if="isAuthenticating">
        <svg class="spinner" viewBox="0 0 50 50">
          <circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle>
        </svg>
        Авторизация...
      </span>
      <span v-else>
        <svg class="telegram-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path d="M12 0C5.38 0 0 5.38 0 12s5.38 12 12 12 12-5.38 12-12S18.62 0 12 0zm5.64 8.22l-1.08 5.11c-.08.39-.31.49-.63.3l-1.76-1.3-1.63 1.57c-.19.18-.35.08-.42-.17l-.77-2.45-.01-.01-2.98.93c-.65.18-.66-.25 0-.49l11.59-4.46c.48-.19.91.12.69.97z" fill="currentColor"/>
        </svg>
        Войти через Telegram
      </span>
    </button>
    
    <!-- Кнопка продолжения авторизации (для тестового режима) -->
    <button 
      v-if="isTestMode" 
      @click="handleContinueTest" 
      class="continue-button"
      :disabled="isAuthenticating"
    >
      <span v-if="isAuthenticating">
        <svg class="spinner" viewBox="0 0 50 50">
          <circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle>
        </svg>
        Обработка...
      </span>
      <span v-else>
        Продолжить
      </span>
    </button>
    
    <!-- Отображение ошибки -->
    <div v-if="errorMessage" class="auth-error">
      <div class="error-title">Ошибка авторизации</div>
      <div class="error-message">{{ errorMessage }}</div>
      <div class="error-details">{{ errorDetails }}</div>
      <button @click="clearError" class="retry-button">Попробовать еще раз</button>
    </div>
    
    <!-- Отладочная панель -->
    <div v-if="showDebug" :class="[
      'debug-panel',
      { 'debug-panel--fullscreen': fullscreenDebug }
    ]">
      <div class="debug-panel__header" @click="toggleFullscreenDebug">
        <div class="debug-panel__title">Отладочная информация</div>
        <div class="debug-panel__actions">
          <button class="debug-panel__action" @click.stop="clearLogs">Очистить логи</button>
          <button class="debug-panel__action" @click.stop="toggleFullscreenDebug">
            {{ fullscreenDebug ? 'Свернуть' : 'Развернуть' }}
          </button>
        </div>
      </div>
      <div class="debug-panel__content">
        <div class="debug-panel__section">
          <h3>Аутентификация</h3>
          <table class="debug-table">
            <tr>
              <th>Параметр</th>
              <th>Значение</th>
            </tr>
            <tr>
              <td>User ID</td>
              <td>{{ userAuth?.id || 'Не определено' }}</td>
            </tr>
            <tr>
              <td>Имя</td>
              <td>{{ userAuth?.first_name || 'Не определено' }}</td>
            </tr>
            <tr>
              <td>Фамилия</td>
              <td>{{ userAuth?.last_name || 'Не определено' }}</td>
            </tr>
            <tr>
              <td>Юзернейм</td>
              <td>{{ userAuth?.username || 'Не определено' }}</td>
            </tr>
            <tr>
              <td>Язык</td>
              <td>{{ userAuth?.language_code || 'Не определено' }}</td>
            </tr>
            <tr>
              <td>Фото URL</td>
              <td>{{ userAuth?.photo_url || 'Не определено' }}</td>
            </tr>
            <tr>
              <td>Auth Date</td>
              <td>{{ userAuth?.auth_date || 'Не определено' }}</td>
            </tr>
            <tr>
              <td>Hash</td>
              <td>{{ userAuth?.hash || 'Не определено' }}</td>
            </tr>
          </table>
        </div>

        <div class="debug-panel__section">
          <h3>Инициализация WebApp</h3>
          <div class="debug-panel__row">
            <div class="debug-panel__label">Инициализирован:</div>
            <div>{{ isInitialized ? 'Да' : 'Нет' }}</div>
          </div>
          <div class="debug-panel__row">
            <div class="debug-panel__label">Версия:</div>
            <div>{{ webAppVersion }}</div>
          </div>
          <div class="debug-panel__row">
            <div class="debug-panel__label">Платформа:</div>
            <div>{{ platformType }}</div>
          </div>
          <div class="debug-panel__row">
            <div class="debug-panel__label">Цветовая схема:</div>
            <div>{{ colorScheme }}</div>
          </div>
        </div>

        <div class="debug-panel__section">
          <h3>История событий</h3>
          <div class="debug-log">
            <div v-for="(log, index) in eventLogs" :key="index" class="debug-log__entry">
              <div class="debug-log__time">{{ log.time }}</div>
              <div class="debug-log__message">{{ log.event }}</div>
            </div>
            <div v-if="eventLogs.length === 0" class="debug-log__entry">
              <div class="debug-log__message">Нет записей в журнале событий</div>
            </div>
          </div>
        </div>

        <!-- Новый раздел для отладки сетевых запросов -->
        <div class="debug-panel__section">
          <h3>Сетевые запросы</h3>
          <div class="debug-panel__row">
            <div class="debug-panel__label">Последний запрос:</div>
            <div>{{ apiUrl }}/api/auth/telegram-api</div>
          </div>
          <div class="debug-panel__row">
            <div class="debug-panel__label">Статус ответа:</div>
            <div :class="{'network-error': networkDetails.error?.status === 401}">
              {{ networkDetails.error?.status || 'Нет данных' }}
              {{ networkDetails.error?.status === 401 ? '(Ошибка авторизации)' : '' }}
            </div>
          </div>
          
          <!-- Данные запроса -->
          <div class="debug-subsection">
            <h4>Отправленные данные</h4>
            <div class="debug-code">
              <pre>{{ networkDetails.request ? JSON.stringify(networkDetails.request, null, 2) : 'Нет данных' }}</pre>
            </div>
          </div>
          
          <!-- Данные ответа -->
          <div class="debug-subsection">
            <h4>Полученный ответ</h4>
            <div class="debug-code">
              <pre>{{ networkDetails.response ? JSON.stringify(networkDetails.response, null, 2) : 'Нет данных' }}</pre>
            </div>
          </div>
          
          <!-- Данные ошибки -->
          <div v-if="networkDetails.error" class="debug-subsection">
            <h4 class="error-heading">Ошибка запроса</h4>
            <div class="debug-code error-code">
              <div class="error-status">Статус: {{ networkDetails.error.status || 'Неизвестно' }}</div>
              <div class="error-message">{{ networkDetails.error.message }}</div>
              <pre v-if="networkDetails.error.data">{{ JSON.stringify(networkDetails.error.data, null, 2) }}</pre>
            </div>
          </div>
          
          <!-- Сырая ошибка -->
          <div v-if="lastErrorObject" class="debug-subsection">
            <h4 class="error-heading">Необработанная ошибка</h4>
            <div class="debug-code error-code">
              <div>{{ lastErrorObject.name }}: {{ lastErrorObject.message }}</div>
              <div v-if="lastErrorObject.stack" class="error-stack">{{ lastErrorObject.stack }}</div>
            </div>
          </div>
        </div>

        <div class="debug-panel__actions">
          <button @click="reinitializeTelegram" class="debug-button">Перезапустить WebApp</button>
          <button @click="testLoginWithRandomUser" class="debug-button">Тест с рандомным юзером</button> 
          <button @click="handleLogin" class="debug-button debug-button--primary">Повторить авторизацию</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, computed, onMounted } from 'vue';
import axios from 'axios';
import { useRuntimeConfig } from '#app';
import { getInitData } from '../utils/telegram.js';

// Получение конфигурации и URL API
const config = useRuntimeConfig();
const apiUrl = config.public.apiUrl || 'https://maxzer.ru';

// Инъекция общих состояний
const setAuth = inject('setAuth');
const setTempAuth = inject('setTempAuth');
const isTestMode = inject('isTestMode');
const initData = inject('initData');
const lastError = inject('lastError', ref(''));

// Локальные состояния
const isAuthenticating = ref(false);
const errorMessage = ref('');
const errorDetails = ref('');
const userData = ref(null);
const authData = ref(null);
const debugLogs = ref([]);
const isDebugExpanded = ref(false);
const isFullscreen = ref(false);
const authState = ref('ожидание');
const networkDetails = ref({
  request: null,
  response: null,
  error: null
});
const fullscreenDebug = ref(false);
const showDebug = ref(true);
const eventLogs = ref([]);
const lastErrorObject = ref(null);
const userAuth = ref(null);

// Добавление отладочного лога
const addDebugLog = (message) => {
  const now = new Date();
  const time = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}.${now.getMilliseconds()}`;
  debugLogs.value.unshift({ time, message });
  // Оставляем только последние 50 логов
  if (debugLogs.value.length > 50) {
    debugLogs.value = debugLogs.value.slice(0, 50);
  }
  console.log(`[TelegramLogin] ${message}`);
};

// Открытие/закрытие отладочной панели
const toggleDebugPanel = () => {
  isDebugExpanded.value = !isDebugExpanded.value;
  addDebugLog(`Отладочная панель ${isDebugExpanded.value ? 'открыта' : 'закрыта'}`);
};

// Переключение полноэкранного режима
const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value;
  addDebugLog(`Полноэкранный режим ${isFullscreen.value ? 'включен' : 'отключен'}`);
};

// Очистка отладочных логов
const clearDebugLogs = () => {
  debugLogs.value = [];
  addDebugLog('Логи очищены');
};

// Тест с случайным пользователем
const testLoginWithRandomUser = () => {
  clearError();
  const randomId = Math.floor(Math.random() * 1000000);
  addDebugLog(`Тест с пользователем ID: ${randomId}`);
  
  // Создаем тестовые данные пользователя
  const testUser = {
    telegramId: `${randomId}`,
    firstName: `Тест${randomId}`,
    lastName: 'Пользователь',
    username: `test_user_${randomId}`,
    photoUrl: null
  };
  
  userData.value = testUser;
  
  // Установка временной авторизации для заполнения профиля
  setTempAuth(`test_temp_token_${randomId}`, testUser);
  addDebugLog('Установлена тестовая временная авторизация');
};

// Симуляция ошибки авторизации
const simulateAuthError = () => {
  addDebugLog('Симуляция ошибки авторизации');
  handleAuthError({
    message: 'Симулированная ошибка авторизации',
    response: {
      data: {
        error: 'Это тестовая ошибка для отладки',
        errorCode: 'TEST_ERROR'
      },
      status: 401
    }
  });
};

onMounted(() => {
  addDebugLog('Компонент авторизации инициализирован');
  if (isTestMode.value) {
    addDebugLog('Работаем в тестовом режиме');
  }
  if (initData.value) {
    addDebugLog(`InitData получен: id=${initData.value.user?.id}`);
  } else {
    addDebugLog('InitData отсутствует');
  }
  
  // Логирование информации о WebApp
  if (isTelegramWebApp) {
    addDebugLog(`WebApp версии ${webAppVersion} инициализирован на платформе ${platformType}`);
    addDebugLog(`Цветовая схема: ${colorScheme}`);
  } else {
    addDebugLog('WebApp не инициализирован. Возможно, страница открыта не в Telegram');
  }
  
  // Логирование информации об авторизации
  if (userAuth) {
    addDebugLog(`Аутентификация получена для пользователя ID: ${userAuth.id}`);
  } else {
    addDebugLog('Информация об аутентификации отсутствует');
  }
});

// Получение инициалов пользователя для аватара
const getUserInitials = () => {
  if (!userData.value) return '?';
  
  const firstName = userData.value.firstName || '';
  const lastName = userData.value.lastName || '';
  
  return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
};

// Функция для авторизации через Telegram
async function handleLogin() {
  try {
    clearError();
    isAuthenticating.value = true;
    addDebugLog('Начало авторизации через Telegram');
    
    // Получаем данные из initData (из Telegram.WebApp)
    const webAppData = await getInitData();
    
    if (!webAppData) {
      addDebugLog('Не удалось получить данные WebApp');
      throw new Error('Не удалось получить данные инициализации Telegram WebApp');
    }
    
    addDebugLog(`Получены данные WebApp: ID=${webAppData.user?.id || 'отсутствует'}`);
    
    // Сохраняем для отладки
    userAuth.value = {
      id: webAppData.user?.id,
      first_name: webAppData.user?.first_name,
      last_name: webAppData.user?.last_name,
      username: webAppData.user?.username,
      language_code: webAppData.user?.language_code,
      photo_url: webAppData.user?.photo_url,
      auth_date: webAppData.authDate,
      hash: webAppData.hash
    };
    
    // Получаем сырые данные
    let rawInitData = '';
    if (window.Telegram?.WebApp) {
      rawInitData = window.Telegram.WebApp.initData;
      addDebugLog(`Raw initData длина: ${rawInitData.length} символов`);
    }
    
    // Проверяем наличие необходимых данных
    if (!webAppData.user || !webAppData.authDate) {
      addDebugLog('Неполные данные инициализации Telegram WebApp');
      
      // Пробуем переинициализировать Telegram WebApp
      try {
        addDebugLog('Пробуем переинициализировать Telegram WebApp...');
        if (window.Telegram && window.Telegram.WebApp) {
          window.Telegram.WebApp.ready();
          addDebugLog('Telegram WebApp.ready() вызван');
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (e) {
        addDebugLog(`Ошибка при переинициализации: ${e.message}`);
      }
    }
    
    // Добавляем отладку сырых данных
    console.log('RAW initData:', initData.value);
    console.log('initData string representation:', JSON.stringify(initData.value));
    addDebugLog(`Raw initData: ${JSON.stringify(initData.value)}`);
    
    // Если есть initDataRaw, тоже логируем
    if (window.Telegram?.WebApp?.initDataUnsafe) {
      console.log('WebApp.initDataUnsafe:', window.Telegram.WebApp.initDataUnsafe);
      addDebugLog(`WebApp.initDataUnsafe: ${JSON.stringify(window.Telegram.WebApp.initDataUnsafe)}`);
    }
    
    // Формируем авторизационные данные
    const unsafeData = window.Telegram?.WebApp?.initDataUnsafe;
    
    // Формируем телеграм-данные, используя все доступные источники
    const telegramData = {
      id: unsafeData?.user?.id || webAppData.user?.id || '',
      first_name: unsafeData?.user?.first_name || webAppData.user?.first_name || '',
      last_name: unsafeData?.user?.last_name || webAppData.user?.last_name || '',
      username: unsafeData?.user?.username || webAppData.user?.username || '',
      photo_url: unsafeData?.user?.photo_url || webAppData.user?.photo_url || '',
      auth_date: unsafeData?.auth_date || webAppData.authDate || '',
      hash: unsafeData?.hash || webAppData.hash || ''
    };
    
    // Отладка сформированных данных
    addDebugLog(`Сформирован объект данных для авторизации`);
    addDebugLog(`ID: ${telegramData.id ? 'OK' : 'Отсутствует'}`);
    addDebugLog(`auth_date: ${telegramData.auth_date ? 'OK' : 'Отсутствует'}`);
    addDebugLog(`hash: ${telegramData.hash ? 'OK' : 'Отсутствует'}`);
    
    // Проверяем наличие обязательных полей
    if (!telegramData.id || !telegramData.auth_date || !telegramData.hash) {
      addDebugLog('ОШИБКА: Отсутствуют обязательные поля для авторизации');
      throw new Error('Отсутствуют обязательные поля для авторизации');
    }
    
    // Формируем данные для отправки на сервер
    const authRequest = {
      raw_data: rawInitData || "missing_raw_data",
      telegram_data: telegramData,
      client_time: new Date().toISOString(),
      source: 'telegram_api_approach',
      test_data: {
        telegramUser: webAppData.user || null,
        initDataPresent: !!rawInitData,
        rawInitDataLength: rawInitData?.length || 0,
        unsafeDataPresent: !!unsafeData,
        telegramAvailable: !!window.Telegram?.WebApp
      }
    };
    
    // Записываем данные запроса для отладки
    networkDetails.value.request = authRequest;
    
    // Отправляем запрос на новый эндпоинт API (telegram-api)
    addDebugLog('Отправляем запрос на авторизацию через Telegram API...');
    const response = await axios.post(`${apiUrl}/api/auth/telegram-api`, authRequest);
    
    // Обрабатываем ответ
    networkDetails.value.response = response.data;
    addDebugLog(`Получен ответ: ${response.data.success ? 'успешно' : 'ошибка'}`);
    
    if (response.data.success) {
      // Успешная обработка ответа
      if (response.data.needsProfile) {
        // Если нужно заполнить профиль
        setTempAuth({
          token: response.data.token,
          user: response.data.user
        });
        addDebugLog('Требуется заполнение профиля');
      } else {
        // Полная авторизация
        setAuth({
          token: response.data.token,
          user: response.data.user
        });
        addDebugLog('Авторизация успешна');
      }
      
      // Обновляем UI
      userData.value = response.data.user;
      authData.value = response.data;
      authState.value = 'успех';
    } else {
      // Ошибка авторизации
      throw new Error(response.data.error || 'Ошибка авторизации');
    }
  } catch (error) {
    // Обработка ошибок
    console.error('Ошибка авторизации:', error);
    addDebugLog(`Ошибка авторизации: ${error.message}`);
    
    // Сохраняем детали ошибки для отладки
    lastErrorObject.value = error;
    networkDetails.value.error = {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    };
    
    // Устанавливаем сообщение об ошибке
    errorMessage.value = 'Не удалось авторизоваться через Telegram';
    errorDetails.value = error.message;
    authState.value = 'ошибка';
    
    // Логирование
    lastError.value = error.message;
  } finally {
    isAuthenticating.value = false;
  }
}

// Обработка тестовой авторизации
const processTestLogin = async () => {
  addDebugLog('Имитация задержки сервера в тестовом режиме');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Создаем тестовые данные пользователя
  const testUser = {
    telegramId: '12345678',
    firstName: 'Тестовый',
    lastName: 'Пользователь',
    username: 'test_user',
    photoUrl: null
  };
  
  userData.value = testUser;
  
  // Установка временной авторизации для заполнения профиля
  setTempAuth('test_temp_token', testUser);
  addDebugLog('Установлена тестовая временная авторизация, переход к форме профиля');
};

// Имитация нажатия кнопки "Продолжить" в тестовом режиме
const handleContinueTest = async () => {
  clearError();
  isAuthenticating.value = true;
  authState.value = 'тестовое продолжение';
  addDebugLog('Нажата кнопка "Продолжить" в тестовом режиме');
  
  await processTestLogin();
  isAuthenticating.value = false;
};

// Обработка ошибок авторизации
const handleAuthError = (error) => {
  errorMessage.value = 'Не удалось выполнить авторизацию. Попробуйте позже.';
  errorDetails.value = error.response?.data?.error || error.message || 'Неизвестная ошибка';
  lastError.value = errorDetails.value;
  
  // Сохраняем объект ошибки для детальной отладки
  lastErrorObject.value = {
    name: error.name || 'Error',
    message: error.message || 'Неизвестная ошибка',
    stack: error.stack,
    response: error.response && {
      status: error.response.status,
      statusText: error.response.statusText,
      data: error.response.data
    }
  };
  
  // Логируем ошибку
  logEvent(`Ошибка ${error.response?.status || ''}: ${error.message}`);
};

// Очистка ошибки
const clearError = () => {
  errorMessage.value = '';
  errorDetails.value = '';
};

// Функция для перезапуска инициализации Telegram WebApp
const reinitializeTelegram = async () => {
  addDebugLog('Запуск ручной реинициализации Telegram WebApp');
  
  try {
    if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
      // Вызываем ready для реинициализации WebApp
      window.Telegram.WebApp.ready();
      addDebugLog('Telegram WebApp.ready() вызван');
      
      // Запрашиваем новые данные инициализации
      const data = await getInitData();
      
      if (data) {
        addDebugLog(`Получены новые данные initData: id=${data.user?.id}`);
        
        // Обновляем глобальные данные initData через инжектированную функцию
        if (typeof updateInitData === 'function') {
          updateInitData(data);
          addDebugLog('Данные initData обновлены глобально');
        } else {
          addDebugLog('Не удалось обновить глобальные данные (updateInitData недоступен)');
        }
      } else {
        addDebugLog('Не удалось получить новые данные initData');
      }
    } else {
      addDebugLog('Telegram WebApp недоступен для реинициализации');
    }
  } catch (error) {
    addDebugLog(`Ошибка при реинициализации: ${error.message}`);
  }
};

// Очистка всех логов
const clearLogs = () => {
  clearDebugLogs();
  eventLogs.value = [];
  addDebugLog('Все логи очищены');
};

// Функция для добавления события в лог
function logEvent(event) {
  const now = new Date();
  const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
  
  eventLogs.value.push({
    time: timeString,
    event: event
  });
  
  // Если логов становится слишком много, удаляем самые старые
  if (eventLogs.value.length > 100) {
    eventLogs.value = eventLogs.value.slice(-100);
  }
}

// Переключение полноэкранного режима отладки
function toggleFullscreenDebug(event) {
  if (event) {
    event.stopPropagation();
  }
  fullscreenDebug.value = !fullscreenDebug.value;
  logEvent(`Отладочная панель ${fullscreenDebug.value ? 'развернута' : 'свернута'}`);
}
</script>

<style scoped>
.telegram-login {
  padding: 20px;
  max-width: 400px;
  margin: 0 auto;
  background-color: var(--tg-theme-bg-color, #ffffff);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.login-title {
  font-size: 20px;
  color: var(--tg-theme-text-color, #333333);
  margin-bottom: 10px;
  text-align: center;
}

.login-description {
  font-size: 14px;
  color: var(--tg-theme-hint-color, #999999);
  margin-bottom: 20px;
  text-align: center;
}

.user-card {
  display: flex;
  align-items: center;
  padding: 16px;
  background-color: var(--tg-theme-secondary-bg-color, #f5f5f5);
  border-radius: 10px;
  margin-bottom: 20px;
  width: 100%;
}

.user-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 12px;
  background-color: var(--tg-theme-button-color, #3390ec);
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.default-avatar {
  color: white;
  font-weight: bold;
  font-size: 18px;
}

.user-info {
  flex: 1;
}

.user-name {
  font-weight: 600;
  font-size: 16px;
  color: var(--tg-theme-text-color, #333333);
}

.user-username {
  font-size: 14px;
  color: var(--tg-theme-hint-color, #999999);
  margin-top: 4px;
}

.login-button, .continue-button {
  width: 100%;
  background-color: var(--tg-theme-button-color, #3390ec);
  color: var(--tg-theme-button-text-color, #ffffff);
  border: none;
  border-radius: 8px;
  padding: 12px 20px;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: background-color 0.2s;
}

.login-button:hover:not(:disabled), .continue-button:hover:not(:disabled) {
  background-color: var(--button-hover-color, #2982d8);
}

.login-button:disabled, .continue-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.continue-button {
  margin-top: 12px;
  background-color: var(--tg-theme-secondary-bg-color, #f5f5f5);
  color: var(--tg-theme-text-color, #333333);
}

.continue-button:hover:not(:disabled) {
  background-color: var(--button-hover-color, #e5e5e5);
}

.telegram-icon {
  width: 20px;
  height: 20px;
  margin-right: 8px;
}

.spinner {
  animation: rotate 2s linear infinite;
  width: 18px;
  height: 18px;
  margin-right: 8px;
}

.path {
  stroke: var(--tg-theme-button-text-color, #ffffff);
  stroke-linecap: round;
  animation: dash 1.5s ease-in-out infinite;
}

@keyframes rotate {
  100% {
    transform: rotate(360deg);
  }
}

@keyframes dash {
  0% {
    stroke-dasharray: 1, 150;
    stroke-dashoffset: 0;
  }
  50% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -35;
  }
  100% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -124;
  }
}

.auth-error {
  margin-top: 20px;
  background-color: rgba(244, 67, 54, 0.1);
  border-radius: 8px;
  padding: 16px;
  width: 100%;
}

.error-title {
  color: #f44336;
  font-weight: 600;
  margin-bottom: 8px;
}

.error-message {
  color: #f44336;
  margin-bottom: 8px;
}

.error-details {
  color: #999;
  font-size: 12px;
  margin-bottom: 12px;
  word-break: break-all;
}

.retry-button {
  background-color: transparent;
  color: var(--tg-theme-button-color, #3390ec);
  border: 1px solid var(--tg-theme-button-color, #3390ec);
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.retry-button:hover {
  background-color: rgba(51, 144, 236, 0.1);
}

/* Стили для расширенной отладочной панели */
.debug-panel {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  max-height: 300px;
  background-color: rgba(0, 0, 0, 0.85);
  color: white;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  transition: all 0.3s ease;
  font-size: 14px;
  user-select: text;
}

.debug-panel--fullscreen {
  max-height: 100vh;
  height: 100vh;
  top: 0;
}

.debug-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background-color: #333;
  cursor: pointer;
  position: sticky;
  top: 0;
  z-index: 10;
}

.debug-panel__title {
  font-weight: bold;
  font-size: 16px;
}

.debug-panel__actions {
  display: flex;
  gap: 8px;
}

.debug-panel__action {
  background-color: #555;
  border: none;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.debug-panel__action:hover {
  background-color: #777;
}

.debug-panel__content {
  padding: 15px;
  overflow-y: auto;
  max-height: calc(100vh - 60px);
  scrollbar-width: thin;
  scrollbar-color: #555 #333;
  user-select: text;
}

.debug-panel__content::-webkit-scrollbar {
  width: 8px;
}

.debug-panel__content::-webkit-scrollbar-track {
  background: #333;
}

.debug-panel__content::-webkit-scrollbar-thumb {
  background-color: #555;
  border-radius: 4px;
}

.debug-panel__content::-webkit-scrollbar-thumb:hover {
  background-color: #777;
}

.debug-panel__section {
  margin-bottom: 20px;
  background-color: rgba(50, 50, 50, 0.5);
  border-radius: 6px;
  padding: 10px 15px;
}

.debug-panel__section h3 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 16px;
  color: #ccc;
  border-bottom: 1px solid #555;
  padding-bottom: 5px;
}

.debug-panel__row {
  display: flex;
  margin-bottom: 8px;
  padding: 4px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.debug-panel__label {
  flex: 0 0 150px;
  font-weight: bold;
  color: #aaa;
}

.debug-table {
  width: 100%;
  border-collapse: collapse;
}

.debug-table th, .debug-table td {
  padding: 6px 10px;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.debug-table th {
  color: #aaa;
  font-weight: bold;
  background-color: rgba(0, 0, 0, 0.2);
}

.debug-log {
  max-height: 200px;
  overflow-y: auto;
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  padding: 5px;
  scrollbar-width: thin;
  scrollbar-color: #555 #222;
  user-select: text;
}

.debug-log::-webkit-scrollbar {
  width: 6px;
}

.debug-log::-webkit-scrollbar-track {
  background: #222;
}

.debug-log::-webkit-scrollbar-thumb {
  background-color: #555;
  border-radius: 3px;
}

.debug-log::-webkit-scrollbar-thumb:hover {
  background-color: #777;
}

.debug-log__entry {
  display: flex;
  padding: 4px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

.debug-log__entry:last-child {
  border-bottom: none;
  margin-bottom: 5px; /* Добавляем отступ для последнего элемента */
}

.debug-log__time {
  flex: 0 0 60px;
  color: #888;
  margin-right: 10px;
}

.debug-log__message {
  flex: 1;
  color: #ddd;
  word-break: break-word;
  user-select: text;
}

/* Исправляем высоту при изменении размера экрана */
@media (max-height: 600px) {
  .debug-panel {
    max-height: 200px;
  }
  
  .debug-log {
    max-height: 120px;
  }
}

@media (max-height: 400px) {
  .debug-panel {
    max-height: 150px;
  }
  
  .debug-log {
    max-height: 80px;
  }
}

.debug-code {
  background-color: rgba(0, 0, 0, 0.4);
  border-radius: 4px;
  overflow: auto;
  max-height: 200px;
  margin: 8px 0;
  scrollbar-width: thin;
  scrollbar-color: #555 #222;
  user-select: text;
}

.debug-code pre {
  margin: 0;
  padding: 10px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.4;
  color: #eee;
  word-break: break-word;
  white-space: pre-wrap;
  user-select: text;
}

.error-code {
  background-color: rgba(244, 67, 54, 0.2);
  border-left: 3px solid #f44336;
}

.error-heading {
  color: #f44336;
  font-weight: bold;
}

.error-status {
  color: #f44336;
  font-weight: bold;
  margin-bottom: 4px;
  padding: 6px 10px 0;
}

.error-message {
  color: #ffccbc;
  margin-bottom: 8px;
  padding: 0 10px;
}

.error-stack {
  font-size: 11px;
  color: #bbb;
  margin-top: 8px;
  padding: 4px 10px;
  background: rgba(0, 0, 0, 0.3);
  max-height: 120px;
  overflow: auto;
}

.network-error {
  color: #f44336;
  font-weight: bold;
}

.debug-subsection {
  margin-top: 15px;
  border-top: 1px dashed rgba(255, 255, 255, 0.1);
  padding-top: 10px;
}

.debug-subsection h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #bbb;
}

.debug-button {
  background-color: #555;
  border: none;
  color: white;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  margin-right: 8px;
  margin-bottom: 8px;
}

.debug-button:hover {
  background-color: #777;
}

.debug-button--primary {
  background-color: #3390ec;
}

.debug-button--primary:hover {
  background-color: #2982d8;
}
</style> 