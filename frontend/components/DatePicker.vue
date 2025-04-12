<template>
  <div class="date-picker-container" :class="{ 'disabled': disabled }">
    <VDatePicker
      v-model="selectedDate"
      :masks="masks"
      :attributes="attributes"
      @update:model-value="dateSelected"
      :mode="calendarMode"
      class="date-picker"
      is-expanded
      :is-dark="isDarkTheme"
      :color="color"
      :minute-increment="30"
      :time-accuracy="1"
      :is24hr="true"
      :disabled-nav-directions="['left', 'right']"
      :is-popover-visible="false"
    />
    
    <!-- Кастомный выбор времени -->
    <TimeSelector 
      v-if="selectedDate && calendarMode === 'datetime'"
      v-model:hour="selectedHour"
      v-model:minute="selectedMinute"
      v-model:timeSlot="selectedTimeSlot"
      :timeSlots="timeSlots"
      @update:time="updateDateWithTime"
    />
    
    <SelectedDateInfo 
      v-if="selectedDate"
      :formattedDate="formattedDate"
      :color="color"
      :isLoading="isLoading"
      :isStaffSelected="!!props.staffInfo && !!props.staffInfo.id"
      @confirm="confirmDate"
    />
    
    <!-- Блокирующий оверлей, когда компонент отключен -->
    <div v-if="disabled" class="disabled-overlay">
      <div class="disabled-message">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span>Просмотрите прайс-лист перед записью</span>
      </div>
    </div>
    
    <!-- Кнопка подтверждения -->
    <button 
      v-if="showConfirmButton" 
      @click="confirmSelectedDate" 
      class="confirm-button" 
      :disabled="!selectedTimeSlot || disabled"
      :style="{ backgroundColor: disabled ? '#cccccc' : color }"
    >
      Подтвердить {{ selectedTimeSlot ? formatDisplayTime(selectedTimeSlot) : '' }}
    </button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import 'v-calendar/style.css';
import { fetchApi } from '../utils/api';
import { useRuntimeConfig } from '#app';
import { getTelegramTheme, isTelegramWebAppAvailable } from '~/utils/telegram';
import axios from 'axios';
import TimeSelector from './TimeSelector.vue';
import SelectedDateInfo from './SelectedDateInfo.vue';

// Определение props
const props = defineProps({
  color: { type: String, default: '#4caf50' },
  serviceName: { type: String, default: 'Тренировка' },
  organizerName: { type: String, default: 'AniFit' },
  serviceDuration: { type: Number, default: 60 },
  organizerLocation: { type: String, default: 'AniFit' },
  userEmail: { type: String, default: '' },
  staffInfo: { type: Object, default: null },
  petBreed: {
    type: String,
    default: ''
  },
  // Флаг отключения компонента (если прайс-лист не просмотрен)
  disabled: {
    type: Boolean,
    default: false
  }
});

// События
const emit = defineEmits(['dateSelected', 'confirmed', 'debug-log']);

// Состояние компонента
const selectedDate = ref(null);
const calendarMode = ref('date');
const isDarkTheme = ref(false);
const isLoading = ref(false);
const isSubmitted = ref(false);
const requestId = ref(Date.now().toString());
const breedValue = ref(props.petBreed);

// Данные для выбора времени
const selectedHour = ref(10);
const selectedMinute = ref(0);
const selectedTimeSlot = ref(null);
const hours = Array.from({ length: 13 }, (_, i) => i + 10); // от 10 до 22
const minutes = [0, 30]; // только 0 и 30 минут

// Популярные временные слоты
const timeSlots = [
  { label: 'Утро 10:00', value: '10:00' },
  { label: 'Утро 11:30', value: '11:30' },
  { label: 'День 13:00', value: '13:00' },
  { label: 'День 15:30', value: '15:30' },
  { label: 'Вечер 18:00', value: '18:00' },
  { label: 'Вечер 20:30', value: '20:30' }
];

// Следим за изменением props.petBreed
watch(() => props.petBreed, (newValue) => {
  breedValue.value = newValue;
});

// Константы для календаря
const masks = {
  input: 'DD.MM.YYYY HH:mm',
  weekdays: 'WW',
  title: 'MMMM YYYY',
  time: 'HH:mm',
  data: { timeFormat: 24 }
};

// Пересчитываем атрибуты для корректного отображения текущего дня
const attributes = computed(() => [
  {
    key: 'today',
    highlight: {
      color: 'gray',
      fillMode: 'light',
    },
    dates: new Date(),
  }
]);

// Форматируем дату для отображения
const formattedDate = computed(() => {
  if (!selectedDate.value) return '';
  const date = new Date(selectedDate.value);
  return `${date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })} ${date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })}`;
});

// Инициализация компонента
onMounted(() => {
  // Инициализация токена
  initAuthToken();
  // Установка начальной даты
  initDefaultDate();
  // Установка темы
  initTheme();
});

// Функция инициализации токена
function initAuthToken() {
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
}

// Функция установки начальной даты и времени
function initDefaultDate() {
  const today = new Date();
  
  if (isNaN(today.getTime())) {
    selectedDate.value = new Date();
  } else {
    selectedDate.value = today;
  }
  
  calendarMode.value = 'datetime';
  
  const currentHour = today.getHours();
  selectedHour.value = currentHour < 10 ? 10 : currentHour > 22 ? 22 : currentHour;
  selectedMinute.value = today.getMinutes() < 30 ? 0 : 30;
  
  updateDateWithTime();
}

// Функция определения темы
function initTheme() {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    const colorScheme = window.Telegram.WebApp.colorScheme;
    isDarkTheme.value = colorScheme === 'dark';
  } else {
    isDarkTheme.value = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
}

// Функция выбора временного слота
const selectTimeSlot = (timeSlot) => {
  selectedTimeSlot.value = timeSlot;
  const [hours, minutes] = timeSlot.split(':');
  selectedHour.value = parseInt(hours);
  selectedMinute.value = parseInt(minutes);
  updateDateWithTime();
};

// Обновление даты с выбранным временем
const updateDateWithTime = () => {
  if (!selectedDate.value) return;
  
  try {
    const date = new Date(selectedDate.value);
    if (isNaN(date.getTime())) return;
    
    date.setHours(selectedHour.value);
    date.setMinutes(selectedMinute.value);
    date.setSeconds(0);
    selectedDate.value = date;
    
    // Проверяем и устанавливаем selectedTimeSlot для текущего времени
    const timeString = `${selectedHour.value}:${selectedMinute.value.toString().padStart(2, '0')}`;
    const matchingSlot = timeSlots.find(slot => slot.value === timeString);
    if (matchingSlot) {
      selectedTimeSlot.value = matchingSlot.value;
    }
  } catch (error) {
    // Ошибка при обновлении даты
  }
};

// Следим за изменением часов и минут для обновления даты
watch([selectedHour, selectedMinute], () => {
  // Проверяем, соответствует ли выбранное время какому-либо из предустановленных слотов
  const timeString = `${selectedHour.value}:${selectedMinute.value.toString().padStart(2, '0')}`;
  const matchingSlot = timeSlots.find(slot => slot.value === timeString);
  
  // Устанавливаем соответствующий слот или null, если нет совпадений
  selectedTimeSlot.value = matchingSlot ? matchingSlot.value : null;
  
  updateDateWithTime();
});

// Следим за выбором даты и переключаем режим
watch(selectedDate, (newValue, oldValue) => {
  if (newValue) {
    // Если выбрана новая дата (не изменение времени)
    if (!oldValue || newValue.getDate() !== oldValue.getDate() || 
        newValue.getMonth() !== oldValue.getMonth() || 
        newValue.getFullYear() !== oldValue.getFullYear()) {
      // Если дата выбрана, показываем селектор времени
      calendarMode.value = 'datetime';
      
      // Устанавливаем начальное время при выборе даты (если время еще не выбрано)
      if (!oldValue) {
        const now = new Date();
        const currentHour = now.getHours();
        
        // Установка часа в допустимом диапазоне
        if (currentHour < 10) {
          selectedHour.value = 10; // Если текущий час меньше 10, устанавливаем 10
        } else if (currentHour > 22) {
          selectedHour.value = 22; // Если текущий час больше 22, устанавливаем 22
        } else {
          selectedHour.value = currentHour; // Иначе используем текущий час
        }
        
        // Округляем минуты до ближайшего допустимого значения (0 или 30)
        selectedMinute.value = now.getMinutes() < 30 ? 0 : 30;
        
        updateDateWithTime();
      }
    }
  }
});

// Обработчик выбора даты
const dateSelected = (date) => {
  try {
    // Если дата была сброшена, возвращаем режим к выбору только даты
    if (!date) {
      calendarMode.value = 'date';
      selectedTimeSlot.value = null;
      return;
    }
    
    // Проверяем, что дата валидна
    const checkDate = new Date(date);
    if (isNaN(checkDate.getTime())) {
      return;
    }
    
    emit('dateSelected', date);
  } catch (error) {
    // Ошибка в обработчике
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
    // Игнорируем ошибки
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
    // Игнорируем ошибки
  }
  
  return null;
};

// Сохранение и возврат полученного токена
const saveAndReturnToken = async (token) => {
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

// Подготовка данных события для API
const prepareEventData = () => {
  const isAnyStaff = props.staffInfo?.id === 'any';
  const breedInfo = breedValue.value ? `\nПорода: ${breedValue.value}` : '';
  
  // Создаем новую дату с выбранным временем
  const date = new Date(selectedDate.value);
  date.setHours(selectedHour.value);
  date.setMinutes(selectedMinute.value);
  date.setSeconds(0);
  date.setMilliseconds(0);
  
  // Вычисляем дату и время окончания события
  const endDateTime = new Date(date);
  endDateTime.setMinutes(endDateTime.getMinutes() + props.serviceDuration);
  
  // Форматируем даты в ISO формат
  const startDateTimeISO = date.toISOString();
  const endDateTimeISO = endDateTime.toISOString();
  
  // Собираем данные о событии
  const summary = breedValue.value 
    ? `${props.organizerName} - ${props.serviceName} - ${breedValue.value}`
    : `${props.organizerName} - ${props.serviceName}`;
    
  const description = isAnyStaff
    ? `Запись на ${props.serviceName}\nСпециалист будет назначен автоматически${breedInfo}`
    : `Запись на ${props.serviceName}\nСпециалист: ${props.staffInfo.name}, ${props.staffInfo.position}${breedInfo}`;
  
  return {
    summary,
    description,
    startDateTime: startDateTimeISO,
    endDateTime: endDateTimeISO,
    location: props.organizerLocation,
    attendees: [props.userEmail].filter(Boolean),
    requestId: requestId.value,
    color: props.color,
    staffInfo: isAnyStaff
      ? { id: 'any', autoAssign: true }
      : {
          id: props.staffInfo.id,
          name: props.staffInfo.name,
          position: props.staffInfo.position
        },
    petBreed: breedValue.value
  };
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
  }
  
  return authToken;
};

// Выполнение запроса с возможными ретраями
const executeRequest = async (options) => {
  try {
    // Обновляем токен в заголовках, если он доступен
    if (typeof window !== 'undefined' && window.authToken) {
      options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${window.authToken}`
      };
    }
    
    // Пробуем прямой fetch
    try {
      const config = useRuntimeConfig();
      const baseUrl = config.public.apiBaseUrl || 'https://maxzer.ru';
      const url = `${baseUrl}/api/calendar/add-event`;
      
      const directResponse = await fetch(url, {
        method: options.method,
        headers: {
          ...options.headers,
          'X-Direct-Request': 'true'
        },
        body: options.body,
        credentials: 'include'
      });
      
      // Если статус не 401, возвращаем результат
      if (directResponse.status !== 401) {
        return await directResponse.json();
      }
    } catch (directError) {
      // Игнорируем ошибку и переходим к запасному варианту
    }
    
    // Запасной вариант через fetchApi
    return await fetchApi('/api/calendar/add-event', options);
  } catch (error) {
    // Проверяем, является ли ошибка 401 Unauthorized
    if (error.message.includes('401')) {
      return { status: 401, error: error.message };
    }
    throw error;
  }
};

// Функция подтверждения выбранной даты и создания события
const confirmDate = async () => {
  if (isSubmitted.value || isLoading.value) {
    return;
  }

  try {
    isLoading.value = true;
    
    // Проверка наличия информации о сотруднике
    if (!props.staffInfo || !props.staffInfo.id) {
      throw new Error('Необходимо выбрать специалиста для записи');
    }
    
    // Подготовка данных события
    const eventData = prepareEventData();
    
    // Получение текущего токена авторизации
    const authToken = getAuthToken();
    
    // Формирование параметров запроса
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
      },
      body: JSON.stringify(eventData)
    };
    
    // Ограничение на количество попыток обновления токена
    let tokenRefreshAttempts = 0;
    const maxRefreshAttempts = 2;
    
    // Выполнение первичного запроса
    let response;
    try {
      response = await executeRequest(requestOptions);
    } catch (initialError) {
      response = { status: 500, error: initialError.message };
    }
    
    // Обработка ошибки авторизации и повторные попытки
    if (response.status === 401) {
      response = await handleAuthError(response, eventData, requestOptions, tokenRefreshAttempts, maxRefreshAttempts);
    }
    
    // Проверка финального результата
    if (response.status === 401) {
      throw new Error('Не удалось авторизоваться после всех попыток обновления токена');
    }
    
    // Обработка успешного или неуспешного создания события
    handleEventResponse(response, eventData.startDateTime);
  } catch (error) {
    // Обработка ошибок
    emit('confirmed', { 
      date: new Date(selectedDate.value).toISOString(),
      title: props.serviceName,
      color: props.color,
      staffInfo: props.staffInfo,
      petBreed: breedValue.value
    }, null, error.message || 'Ошибка при подтверждении даты');
  } finally {
    isLoading.value = false;
  }
};

// Обработка ошибок авторизации
const handleAuthError = async (response, eventData, requestOptions, tokenRefreshAttempts, maxRefreshAttempts) => {
  while (tokenRefreshAttempts < maxRefreshAttempts) {
    tokenRefreshAttempts++;
    
    // Пробуем обновить токен
    const newToken = await refreshAuthToken();
    
    if (!newToken) {
      break;
    }
    
    // Пробуем отправить запрос с новым токеном
    const result = await retryWithNewToken(newToken, eventData, tokenRefreshAttempts);
    
    // Если получили результат не 401, значит успех
    if (result && (!result.status || result.status !== 401)) {
      return result;
    }
    
    // Сохраняем текущий ответ для возврата в случае неудачи
    if (result) {
      response = result;
    }
  }
  
  return response;
};

// Повторение запроса с новым токеном
const retryWithNewToken = async (newToken, eventData, attempt) => {
  try {
    // Прямой запрос с новым токеном
    const config = useRuntimeConfig();
    const baseUrl = config.public.apiBaseUrl || 'https://maxzer.ru';
    const url = `${baseUrl}/api/calendar/add-event`;
    
    // Новые заголовки с токеном
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${newToken}`,
      'X-Retry-Attempt': `${attempt}`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache'
    };
    
    // Отправка запроса
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(eventData),
      credentials: 'include',
      mode: 'cors',
      cache: 'no-store'
    });
    
    if (response.ok) {
      return await response.json();
    }
    
    // Если ошибка 401, возвращаем объект с ошибкой
    if (response.status === 401) {
      const errorText = await response.text();
      return { status: 401, error: errorText || 'Unauthorized' };
    }
    
    // Другие ошибки
    const errorText = await response.text();
    return { 
      status: response.status, 
      error: errorText || `HTTP error ${response.status}` 
    };
  } catch (error) {
    // Запасной вариант через fetchApi
    try {
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${newToken}`,
          'X-Retry-Attempt': `${attempt}`
        },
        body: JSON.stringify(eventData)
      };
      
      return await executeRequest(options);
    } catch (apiError) {
      return { status: 500, error: apiError.message };
    }
  }
};

// Обработка ответа API о создании события
const handleEventResponse = (response, startDateTimeISO) => {
  if (response.success) {
    isSubmitted.value = true;
    
    // Формируем данные для создания события в базе данных
    const eventData = {
      title: props.serviceName,
      date: startDateTimeISO,
      endDate: new Date(new Date(startDateTimeISO).getTime() + props.serviceDuration * 60000).toISOString(),
      color: props.color,
      googleEventId: response.eventId || null,
      staffInfo: props.staffInfo,
      petBreed: breedValue.value,
      status: 'confirmed',
      userId: getUserId()
    };
    
    // Вызываем функцию для сохранения события в базе данных
    saveEventToDatabase(eventData);
    
    // Эмитим событие для родительского компонента
    emit('confirmed', { 
      date: startDateTimeISO,
      title: props.serviceName,
      color: props.color,
      staffInfo: props.staffInfo,
      petBreed: breedValue.value
    });
  } else {
    emit('confirmed', { 
      date: startDateTimeISO,
      title: props.serviceName,
      color: props.color,
      staffInfo: props.staffInfo,
      petBreed: breedValue.value
    }, null, response.error || 'Ошибка при создании события');
  }
};

// Функция для получения ID пользователя
const getUserId = () => {
  // Пытаемся получить пользователя из глобального состояния
  if (typeof window !== 'undefined') {
    // Пробуем получить из пользователя из localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        return user.id;
      } catch (error) {
        console.error('Error parsing user from localStorage:', error);
      }
    }
  }
  return null;
};

// Сохранение события в базу данных
const saveEventToDatabase = async (eventData) => {
  try {
    const config = useRuntimeConfig();
    const baseUrl = config.public.apiBaseUrl || 'https://maxzer.ru';
    const url = `${baseUrl}/api/events`;
    
    // Получаем токен авторизации
    const authToken = getAuthToken();
    
    // Выполняем запрос к API
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
      },
      body: JSON.stringify(eventData),
      credentials: 'include'
    });
    
    if (!response.ok) {
      console.error('Error saving event to database:', await response.text());
      return;
    }
    
    const result = await response.json();
    console.log('Event saved to database:', result);
  } catch (error) {
    console.error('Exception saving event to database:', error);
  }
};

// Обработчик выбора и подтверждения даты
const confirmSelectedDate = () => {
  if (props.disabled) {
    // Если компонент отключен, блокируем подтверждение даты
    emit('debug-log', {
      level: 'warn',
      message: 'Attempt to confirm date while component is disabled',
      context: 'DatePicker'
    });
    return;
  }
  
  if (!selectedTimeSlot.value) {
    showNotification('Сначала выберите время', 'warning');
    emit('debug-log', {
      level: 'warn',
      message: 'User attempted to confirm without selecting a time slot',
      context: 'DatePicker'
    });
    return;
  }

  isCreatingEvent.value = true;
  
  const dateString = selectedTimeSlot.value;
  const selectedDateTime = new Date(dateString);
  
  // ... existing code ...
};
</script>

<style scoped>
.date-picker-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 0;
}

.date-picker {
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  background-color: var(--tg-theme-bg-color, #ffffff);
  margin-bottom: 16px;
  margin-top: 8px;
}

/* Глобальные стили для v-calendar внутри компонента */
:deep(.vc-container) {
  --vc-accent-50: rgba(200, 200, 200, 0.05);
  --vc-accent-100: rgba(200, 200, 200, 0.1);
  --vc-accent-200: rgba(200, 200, 200, 0.2);
  --vc-accent-300: rgba(200, 200, 200, 0.3);
  --vc-accent-400: rgba(200, 200, 200, 0.4);
  --vc-accent-500: rgba(200, 200, 200, 0.5);
  --vc-accent-600: rgba(200, 200, 200, 0.6);
  --vc-accent-700: rgba(200, 200, 200, 0.7);
  --vc-accent-800: rgba(200, 200, 200, 0.8);
  --vc-accent-900: rgba(200, 200, 200, 0.9);
  
  border: none !important;
  width: 100%;
  padding: 0 !important;
}

:deep(.vc-pane-container) {
  width: 100% !important;
  padding-top: 0 !important;
}

:deep(.vc-weeks) {
  width: 100% !important;
  padding: 0 8px;
  display: grid !important;
  grid-template-rows: repeat(auto-fit, minmax(40px, auto)) !important;
}

/* Принудительно обрезаем лишние строки календаря */
:deep(.vc-weeks) {
  max-height: 290px !important; /* Высота для 6 строк (включая заголовки) */
  overflow: hidden !important;
}

/* Убираем стандартный grid для возможности управления высотой */
:deep(.vc-week) {
  display: flex !important;
}

:deep(.vc-day) {
  flex: 1 !important;
  min-height: 42px !important;
  transition: all 0.15s ease;
}

:deep(.vc-day.vc-day-selected) {
  z-index: 1;
}

:deep(.vc-header) {
  padding: 0 0 8px 0 !important;
  justify-content: center !important;
  position: relative !important;
}

:deep(.vc-weekdays) {
  margin-bottom: 8px;
}

:deep(.vc-title) {
  width: auto !important;
  text-align: center !important;
  padding: 0 !important;
  font-size: 18px !important;
  font-weight: 600 !important;
  color: var(--tg-theme-text-color, #333333) !important;
  background-color: transparent !important;
  background: none !important;
  box-shadow: none !important;
}

:deep(.vc-nav-title) {
  width: auto !important;
  padding: 0 !important;
  color: var(--tg-theme-text-color, #333333) !important;
}

/* Стили для заголовка с месяцем/годом */
:deep(.vc-title-wrapper) {
  background-color: transparent !important;
  background: none !important;
  padding: 0 !important;
  border-radius: 0 !important;
  width: 100% !important;
  margin: 0 auto !important;
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  position: relative !important;
  z-index: 1 !important;
  pointer-events: none !important; /* Отключаем клик на заголовок месяца */
  box-shadow: none !important;
}

:deep(.vc-title-wrapper .vc-title) {
  color: var(--tg-theme-text-color, #333333) !important;
  font-weight: 600 !important;
  font-size: 16px !important;
  width: auto !important;
  text-align: center !important;
  white-space: nowrap !important;
}

/* Скрываем стрелки навигации по месяцам */
:deep(.vc-arrow) {
  display: none !important;
}

/* Стили для выбора времени */
:deep(.vc-time-picker) {
  border-top: 1px solid rgba(0, 0, 0, 0.1) !important;
  padding: 15px !important;
  margin-top: 10px !important;
}

:deep(.vc-time-picker-title) {
  color: var(--tg-theme-text-color, #333333) !important;
  font-weight: 600 !important;
  margin-bottom: 10px !important;
}

:deep(.vc-time-select) {
  align-items: center !important;
  justify-content: center !important;
}

:deep(.vc-time-select select) {
  border: 1px solid rgba(0, 0, 0, 0.1) !important;
  border-radius: 8px !important;
  padding: 8px 10px !important;
  background-color: var(--tg-theme-bg-color, #ffffff) !important;
  color: var(--tg-theme-text-color, #333333) !important;
  font-size: 16px !important;
  margin: 0 5px !important;
}

/* Скрываем селектор AM/PM для 24-часового формата */
:deep(.vc-time-select .vc-am-pm) {
  display: none !important;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Скрываем встроенный выбор времени v-calendar */
:deep(.vc-time-picker) {
  display: none !important;
}

:deep(.vc-day.vc-day-selected .vc-highlights .vc-highlight-content) {
  background-color: var(--tg-theme-button-color, #333333) !important;
  color: var(--tg-theme-button-text-color, #ffffff) !important;
  font-weight: bold !important;
  border-radius: 12px !important;
}

:deep(.vc-day.vc-day-today .vc-highlights .vc-highlight-content-light) {
  background-color: rgba(200, 200, 200, 0.15) !important;
  color: var(--tg-theme-text-color, #333333) !important;
  font-weight: bold !important;
  border-radius: 12px !important;
}

/* Скрываем последний vc-week элемент */
:deep(.vc-weeks .vc-week:last-child) {
  display: none !important;
}

.disabled {
  position: relative;
  pointer-events: none;
  opacity: 0.8;
}

.disabled-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  border-radius: 12px;
}

.disabled-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
  padding: 20px;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.disabled-message svg {
  color: #ff9800;
  width: 40px;
  height: 40px;
}

.disabled-message span {
  font-size: 16px;
  font-weight: 500;
  color: var(--tg-theme-text-color, #333333);
}

/* ... existing styles ... */
</style> 