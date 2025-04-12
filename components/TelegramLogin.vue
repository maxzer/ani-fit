<template>
  <div class="telegram-login">
    <!-- Шаг 1: Начальный экран авторизации -->
    <div v-if="authStep === 'initial'">
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
    </div>
    
    <!-- Шаг 2: Экран ввода ФИО -->
    <div v-if="authStep === 'user-info'" class="user-info-form">
      <h2 class="login-title">Введите ваши ФИО</h2>
      
      <div class="user-info-form__content">
        <div class="form-group">
          <label>Имя</label>
          <input 
            v-model="userRealName.firstName" 
            type="text" 
            placeholder="Введите имя"
            class="form-input"
          />
        </div>
        <div class="form-group">
          <label>Фамилия</label>
          <input 
            v-model="userRealName.lastName" 
            type="text" 
            placeholder="Введите фамилию"
            class="form-input"
          />
        </div>
        <div class="form-group">
          <label>Отчество</label>
          <input 
            v-model="userRealName.patronymic" 
            type="text" 
            placeholder="Введите отчество (при наличии)"
            class="form-input"
          />
        </div>
        
        <div class="user-info-form__actions">
          <button 
            @click="goBackToInitial" 
            class="cancel-button"
          >
            Назад
          </button>
          <button 
            @click="submitUserInfo" 
            class="submit-button"
            :disabled="!isUserInfoValid || isAuthenticating"
          >
            <span v-if="isAuthenticating">
              <svg class="spinner" viewBox="0 0 50 50">
                <circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle>
              </svg>
              Отправка...
            </span>
            <span v-else>
              Продолжить
            </span>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Отображение ошибки -->
    <div v-if="errorMessage" class="auth-error">
      <div class="error-title">Ошибка авторизации</div>
      <div class="error-message">{{ errorMessage }}</div>
      <div class="error-details">{{ errorDetails }}</div>
      <button @click="clearError" class="retry-button">Попробовать еще раз</button>
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
const userAuth = ref(null);

// Переменные для шагов авторизации
const authStep = ref('initial'); // Возможные значения: 'initial', 'user-info'
const userRealName = ref({
  firstName: '',
  lastName: '',
  patronymic: ''
});
const telegramAuthData = ref(null);

// Валидация ввода ФИО
const isUserInfoValid = computed(() => {
  return userRealName.value.firstName.trim() !== '' && 
         userRealName.value.lastName.trim() !== '';
});

onMounted(() => {
  // Проверка тестового режима
  if (isTestMode.value) {
    // В тестовом режиме
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
    
    // Получаем данные из initData (из Telegram.WebApp)
    const webAppData = await getInitData();
    
    if (!webAppData) {
      throw new Error('Не удалось получить данные инициализации Telegram WebApp');
    }
    
    // Сохраняем для дальнейшего использования
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
    }
    
    // Проверяем наличие необходимых данных
    if (!webAppData.user || !webAppData.authDate) {
      // Пробуем переинициализировать Telegram WebApp
      try {
        if (window.Telegram && window.Telegram.WebApp) {
          window.Telegram.WebApp.ready();
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (e) {
        // Ошибка при переинициализации
      }
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
    
    // Проверяем наличие обязательных полей
    if (!telegramData.id || !telegramData.auth_date || !telegramData.hash) {
      throw new Error('Отсутствуют обязательные поля для авторизации');
    }
    
    // Проверяем наличие initData
    if (!rawInitData) {
      throw new Error('initData отсутствует');
    }
    
    // В первую очередь проверяем, существует ли пользователь с таким telegramId
    console.log(`Проверяем существование пользователя с telegramId: ${telegramData.id}`);

    // Формируем запрос для проверки пользователя - отправляем полный initData для безопасности
    const checkUserRequest = {
      initData: rawInitData,
      telegram_data: telegramData,
      action: 'check_user',
      client_time: new Date().toISOString()
    };

    try {
      console.log('Отправляем запрос на проверку пользователя');
      const checkResponse = await axios.post(`${apiUrl}/api/auth/check-user`, checkUserRequest);
      console.log('Получен ответ от check-user:', checkResponse.data);
      
      // Проверяем наличие ошибок в ответе
      if (checkResponse.data && checkResponse.data.success === false) {
        console.error('Сервер вернул ошибку при проверке пользователя:', checkResponse.data.error);
        throw new Error(checkResponse.data.error || 'Неизвестная ошибка при проверке пользователя');
      }
      
      // Если пользователь существует в базе данных, пропускаем шаг ввода ФИО
      if (checkResponse.data && checkResponse.data.exists === true) {
        console.log('Пользователь найден в базе данных, авторизуемся без ввода ФИО');
        
        // Формируем запрос для авторизации
        const authRequest = {
          initData: rawInitData,
          telegram_data: telegramData,
          client_time: new Date().toISOString(),
          source: 'telegram_api_approach'
        };
        
        // Отправляем запрос на авторизацию
        console.log('Отправляем запрос на авторизацию');
        const response = await axios.post(`${apiUrl}/api/auth/telegram`, authRequest);
        console.log('Успешная авторизация');
        
        // Проверяем наличие ошибок в ответе
        if (response.data && response.data.success === false) {
          console.error('Сервер вернул ошибку при авторизации:', response.data.error);
          throw new Error(response.data.error || 'Неизвестная ошибка при авторизации');
        }
        
        if (response.data.accessToken) {
          // Успешная авторизация
          if (response.data.needsProfile) {
            setTempAuth(response.data.accessToken, response.data.user);
          } else {
            setAuth(response.data.accessToken, response.data.user);
          }
          
          // Обновляем UI
          userData.value = response.data.user;
          authData.value = response.data;
        } else {
          throw new Error('Не удалось получить токен авторизации');
        }
      } else {
        console.log('Пользователь не найден в базе данных, показываем форму ввода ФИО');
        
        // Пользователя нет в базе, сохраняем данные и показываем форму ФИО
        telegramAuthData.value = {
          initData: rawInitData,
          telegram_data: telegramData,
          client_time: new Date().toISOString(),
          source: 'telegram_api_approach'
        };
        
        // Переходим к шагу ввода ФИО
        authStep.value = 'user-info';
      }
    } catch (error) {
      console.error('Ошибка при проверке пользователя:', error);
      
      // Детальное логирование ошибки axios
      if (error.response) {
        console.error('Данные ответа:', error.response.data);
        console.error('Статус ответа:', error.response.status);
        console.error('Заголовки ответа:', error.response.headers);
      } else if (error.request) {
        console.error('Запрос был отправлен, но не получен ответ', error.request);
      } else {
        console.error('Ошибка при настройке запроса:', error.message);
      }
      
      if (error.response && error.response.status === 401) {
        console.log('Ошибка авторизации (401), попробуем авторизоваться с запросом ФИО');
        
        // Даже в случае ошибки авторизации, сохраняем данные и переходим к форме ФИО
        telegramAuthData.value = {
          initData: rawInitData,
          telegram_data: telegramData,
          client_time: new Date().toISOString(),
          source: 'telegram_api_approach'
        };
        
        authStep.value = 'user-info';
        return; // Прерываем выполнение, чтобы не попасть в основной обработчик ошибок
      } else if (error.response && error.response.data) {
        // Обрабатываем другие ошибки ответа сервера
        console.error('Ошибка сервера:', error.response.data.error || 'Неизвестная ошибка сервера');
        throw new Error(error.response.data.error || 'Ошибка при проверке пользователя');
      } else {
        // Если другая ошибка (не 401), перебрасываем в обработчик ошибок
        throw error;
      }
    }
    
  } catch (error) {
    console.error('Ошибка в handleLogin:', error);
    handleAuthError(error);
  } finally {
    isAuthenticating.value = false;
  }
}

// Функция для возврата на начальный шаг
function goBackToInitial() {
  authStep.value = 'initial';
  userRealName.value = {
    firstName: '',
    lastName: '',
    patronymic: ''
  };
  telegramAuthData.value = null;
}

// Функция для отправки данных с ФИО
async function submitUserInfo() {
  if (!isUserInfoValid.value) {
    return;
  }
  
  try {
    isAuthenticating.value = true;
    
    if (!telegramAuthData.value) {
      throw new Error('Данные авторизации отсутствуют');
    }
    
    // Добавляем ФИО к запросу
    const authRequest = {
      ...telegramAuthData.value,
      real_name: userRealName.value.firstName,
      real_lastname: userRealName.value.lastName,
      real_patronymic: userRealName.value.patronymic || ''
    };
    
    // Отправляем запрос на API
    const response = await axios.post(`${apiUrl}/api/auth/telegram`, authRequest);
    
    if (response.data.accessToken) {
      // Успешная обработка ответа
      if (response.data.needsProfile) {
        // Если нужно заполнить профиль
        setTempAuth(response.data.accessToken, response.data.user);
      } else {
        // Полная авторизация
        setAuth(response.data.accessToken, response.data.user);
      }
      
      // Обновляем UI
      userData.value = response.data.user;
      authData.value = response.data;
      
      // Возвращаемся на начальный шаг (при успешной авторизации)
      authStep.value = 'initial';
    } else {
      // Ошибка авторизации
      throw new Error('Не удалось получить токен авторизации');
    }
    
  } catch (error) {
    handleAuthError(error);
  } finally {
    isAuthenticating.value = false;
  }
}

// Обработка тестовой авторизации
const processTestLogin = async () => {
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
};

// Имитация нажатия кнопки "Продолжить" в тестовом режиме
const handleContinueTest = async () => {
  clearError();
  isAuthenticating.value = true;
  
  await processTestLogin();
  isAuthenticating.value = false;
};

// Обработка ошибок авторизации
const handleAuthError = (error) => {
  errorMessage.value = 'Не удалось выполнить авторизацию. Попробуйте позже.';
  errorDetails.value = error.response?.data?.error || error.message || 'Неизвестная ошибка';
  lastError.value = errorDetails.value;
  
  // Возвращаемся на начальный шаг при ошибке
  authStep.value = 'initial';
};

// Очистка ошибки
const clearError = () => {
  errorMessage.value = '';
  errorDetails.value = '';
};
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

/* Стили для формы ввода ФИО как отдельного шага */
.user-info-form {
  width: 100%;
}

.user-info-form__content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: var(--tg-theme-hint-color, #999999);
}

.form-input {
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--tg-theme-hint-color, #dcdcdc);
  background-color: var(--tg-theme-secondary-bg-color, #f5f5f5);
  color: var(--tg-theme-text-color, #000000);
  font-size: 16px;
  outline: none;
  transition: border-color 0.2s ease;
}

.form-input:focus {
  border-color: var(--tg-theme-button-color, #2481cc);
}

.user-info-form__actions {
  display: flex;
  justify-content: space-between;
  margin-top: 24px;
  gap: 12px;
}

.cancel-button, .submit-button {
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  flex: 1;
  transition: background-color 0.2s ease;
  border: none;
  display: flex;
  justify-content: center;
  align-items: center;
}

.cancel-button {
  background-color: var(--tg-theme-secondary-bg-color, #f5f5f5);
  color: var(--tg-theme-text-color, #000000);
}

.submit-button {
  background-color: var(--tg-theme-button-color, #2481cc);
  color: var(--tg-theme-button-text-color, #ffffff);
}

.submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cancel-button:hover {
  background-color: var(--tg-theme-bg-color, #e5e5e5);
}

.submit-button:hover:not(:disabled) {
  background-color: var(--tg-theme-button-color, #1a6aaa);
}
</style> 