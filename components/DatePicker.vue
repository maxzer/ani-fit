<template>
  <div class="date-picker-container">
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
    
    <!-- Поле ввода породы (скрыто, так как уже есть в CardPopup) -->
    <!-- <div class="breed-input-container" v-if="selectedDate && !props.petBreed">
      <div class="breed-input-header">Укажите породу животного</div>
      <div class="breed-input-wrapper">
        <input 
          type="text" 
          v-model="breedValue" 
          placeholder="Введите породу" 
          class="breed-input"
          :style="{ borderColor: color + '40' }"
        />
      </div>
    </div> -->
    
    <!-- Кастомный выбор времени -->
    <div class="time-picker-container" v-if="selectedDate && calendarMode === 'datetime'">
      <div class="time-picker-header">Выберите время</div>
      
      <div class="time-slots">
        <button 
          v-for="slot in timeSlots" 
          :key="slot.value" 
          class="time-slot-btn" 
          :class="{ 'active': selectedTimeSlot === slot.value }"
          @click="selectTimeSlot(slot.value)">
          {{ slot.label }}
        </button>
      </div>
      
      <div class="time-picker-custom">
        <div class="time-picker-inputs">
          <select v-model="selectedHour" class="time-input">
            <option v-for="hour in hours" :key="hour" :value="hour">
              {{ hour.toString().padStart(2, '0') }}
            </option>
          </select>
          <span class="time-separator">:</span>
          <select v-model="selectedMinute" class="time-input">
            <option v-for="minute in minutes" :key="minute" :value="minute">
              {{ minute.toString().padStart(2, '0') }}
            </option>
          </select>
        </div>
      </div>
    </div>
    
    <div class="selected-date-wrapper" v-if="selectedDate">
      <div class="selected-date" :style="{ backgroundColor: color + '15' }">
        <span class="date-label">Выбранная дата:</span>
        <span class="date-value">{{ formattedDate }}</span>
      </div>
      
      <button 
        class="confirm-button" 
        @click="confirmDate" 
        :disabled="isLoading || !props.staffInfo || (props.staffInfo && !props.staffInfo.id)"
        :class="{ 'loading': isLoading, 'disabled': !props.staffInfo || (props.staffInfo && !props.staffInfo.id) }"
        :style="{ 
          backgroundColor: isLoading ? 'var(--tg-theme-secondary-bg-color, #f0f0f0)' : 
            (!props.staffInfo || (props.staffInfo && !props.staffInfo.id)) ? '#f44336' : color,
          opacity: (!props.staffInfo || (props.staffInfo && !props.staffInfo.id)) ? '0.9' : '1',
          boxShadow: (!props.staffInfo || (props.staffInfo && !props.staffInfo.id)) ? '0 4px 12px rgba(244, 67, 54, 0.3)' : '0 4px 8px rgba(0, 0, 0, 0.15)'
        }"
      >
        <span v-if="!isLoading">{{ (!props.staffInfo || (props.staffInfo && !props.staffInfo.id)) ? 'Выберите специалиста' : 'Подтвердить' }}</span>
        <span v-else class="button-spinner">Обработка...</span>
      </button>
      
      <div v-if="!props.staffInfo || (props.staffInfo && !props.staffInfo.id)" class="confirm-message">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f44336" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span>Для продолжения необходимо выбрать специалиста</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import 'v-calendar/style.css';
import { fetchApi } from '../utils/api';
import { useRuntimeConfig } from '#app';

const props = defineProps({
  color: {
    type: String,
    default: '#4caf50' // Зеленый по умолчанию
  },
  serviceName: {
    type: String,
    default: 'Тренировка'
  },
  organizerName: {
    type: String,
    default: 'AniFit'
  },
  serviceDuration: {
    type: Number,
    default: 60 // Длительность в минутах
  },
  organizerLocation: {
    type: String,
    default: 'AniFit'
  },
  userEmail: {
    type: String,
    default: ''
  },
  staffInfo: {
    type: Object,
    default: null
  },
  petBreed: {
    type: String,
    default: ''
  }
});

const selectedDate = ref(null);
const calendarMode = ref('date');
const emit = defineEmits(['dateSelected', 'confirmed', 'debug-log']);
const isDarkTheme = ref(false);
const isLoading = ref(false); // Состояние загрузки для блокировки повторных запросов
const isSubmitted = ref(false); // Флаг для отслеживания успешной отправки

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

// Генерируем уникальный ID запроса для предотвращения дублирования
const requestId = ref(Date.now().toString());

// Отладочная информация
const debugLogs = ref([]);
const lastError = ref('');
const requestStatus = ref('Готов');
const maxLogs = 10;

// Добавляем локальное состояние для породы
const breedValue = ref(props.petBreed);

// Следим за изменением props.petBreed
watch(() => props.petBreed, (newValue) => {
  breedValue.value = newValue;
});

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
    if (isNaN(date.getTime())) {
      return;
    }
    
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

// Проверяем тему Telegram для адаптации стилей
onMounted(() => {
  try {
    // Устанавливаем текущую дату как активную
    const today = new Date();
    
    // Проверяем, что дата валидна
    if (isNaN(today.getTime())) {
      // Используем запасной вариант с текущей датой через new Date()
      selectedDate.value = new Date();
    } else {
      selectedDate.value = today;
    }
    
    // Устанавливаем режим выбора даты и времени
    calendarMode.value = 'datetime';
    
    // Установка времени для выбранной даты
    const currentHour = today.getHours();
    
    // Установка часа в допустимом диапазоне
    if (currentHour < 10) {
      selectedHour.value = 10; // Если текущий час меньше 10, устанавливаем 10
    } else if (currentHour > 22) {
      selectedHour.value = 22; // Если текущий час больше 22, устанавливаем 22
    } else {
      selectedHour.value = currentHour; // Иначе используем текущий час
    }
    
    // Округляем минуты до ближайшего допустимого значения (0 или 30)
    selectedMinute.value = today.getMinutes() < 30 ? 0 : 30;
    
    // Обновляем дату с выбранным временем
    updateDateWithTime();
    
    // Определяем тему
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const colorScheme = window.Telegram.WebApp.colorScheme;
      isDarkTheme.value = colorScheme === 'dark';
    } else {
      // Проверяем системную цветовую схему как запасной вариант
      isDarkTheme.value = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
  } catch (error) {
    // В случае ошибки устанавливаем безопасные значения по умолчанию
    selectedDate.value = new Date();
    calendarMode.value = 'datetime';
    selectedHour.value = 12;
    selectedMinute.value = 0;
  }
});

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

// Функция для отправки отладочной информации
const sendDebugLog = (message, type = 'info') => {
  console.log(`[DatePicker] ${message}`);
  
  // Добавляем в локальный лог
  const now = new Date();
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
  
  debugLogs.value.unshift({
    time,
    message,
    type
  });
  
  // Ограничиваем количество логов
  if (debugLogs.value.length > maxLogs) {
    debugLogs.value = debugLogs.value.slice(0, maxLogs);
  }
  
  // Если это ошибка, сохраняем её отдельно
  if (type === 'error') {
    lastError.value = message;
    requestStatus.value = 'Ошибка';
  } else if (message.includes('успешно')) {
    requestStatus.value = 'Успех';
  } else if (message.includes('Отправка')) {
    requestStatus.value = 'Отправка...';
  }
  
  // Отправляем наверх
  emit('debug-log', { message, type });
};

// Обновляем функцию confirmDate для использования локального значения породы
const confirmDate = async () => {
  if (isSubmitted.value || isLoading.value) {
    sendDebugLog('Запрос уже был отправлен, предотвращаем повторную отправку');
    return;
  }

  try {
    isLoading.value = true;
    const currentRequestId = requestId.value;
    
    // Усиленная проверка выбора специалиста
    if (!props.staffInfo || !props.staffInfo.id) {
      sendDebugLog('Не выбран сотрудник для записи или ID сотрудника отсутствует', 'error');
      throw new Error('Необходимо выбрать специалиста для записи');
    }
    
    const isAnyStaff = props.staffInfo.id === 'any';
    // Используем локальное значение породы вместо props.petBreed
    const breedInfo = breedValue.value ? `\nПорода: ${breedValue.value}` : '';
    
    sendDebugLog(`Подтверждение даты: ${selectedDate.value} ${selectedTimeSlot.value} ${isAnyStaff ? 'с автоматическим назначением' : `с сотрудником: ${props.staffInfo.name}`}${breedInfo}`);
    
    // Собираем данные о событии
    const summary = breedValue.value 
      ? `${props.organizerName} - ${props.serviceName} - ${breedValue.value}`
      : `${props.organizerName} - ${props.serviceName}`;
    const description = isAnyStaff
      ? `Запись на ${props.serviceName}\nСпециалист будет назначен автоматически${breedInfo}`
      : `Запись на ${props.serviceName}\nСпециалист: ${props.staffInfo.name}, ${props.staffInfo.position}${breedInfo}`;
    
    // Создаем новую дату с выбранным временем
    const date = new Date(selectedDate.value);
    date.setHours(selectedHour.value);
    date.setMinutes(selectedMinute.value);
    date.setSeconds(0);
    date.setMilliseconds(0);
    
    // Вычисляем дату и время окончания события (добавляем продолжительность)
    const endDateTime = new Date(date);
    endDateTime.setMinutes(endDateTime.getMinutes() + props.serviceDuration);
    
    // Форматируем даты в ISO формат для Google Calendar API
    const startDateTimeISO = date.toISOString();
    const endDateTimeISO = endDateTime.toISOString();
    
    sendDebugLog(`Начало события: ${startDateTimeISO}`);
    sendDebugLog(`Конец события: ${endDateTimeISO}`);
    
    // Проверяем, запущено ли приложение в Telegram WebApp
    const isTelegramWebApp = typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp;
    sendDebugLog(`Запущено в Telegram WebApp: ${isTelegramWebApp}`);
    
    // Данные для добавления события
    const eventData = {
      summary,
      description,
      startDateTime: startDateTimeISO,
      endDateTime: endDateTimeISO,
      location: props.organizerLocation,
      attendees: [props.userEmail].filter(Boolean),
      requestId: currentRequestId,
      color: props.color,
      staffInfo: isAnyStaff
        ? { id: 'any', autoAssign: true }
        : {
            id: props.staffInfo.id,
            name: props.staffInfo.name,
            position: props.staffInfo.position
          },
      petBreed: breedValue.value // Используем локальное значение породы
    };
    
    sendDebugLog(`Отправка данных события: ${JSON.stringify(eventData).substring(0, 100)}...`);
    
    // Функция для выполнения запроса с повторными попытками
    const fetchWithRetry = async (url, options, retries = 3, delay = 1000) => {
      try {
        sendDebugLog(`Попытка запроса к ${url} (осталось попыток: ${retries})`);
        const response = await fetch(url, options);
        sendDebugLog(`Получен статус: ${response.status}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          sendDebugLog(`Ошибка ответа: ${response.status}, текст: ${errorText}`, 'error');
          throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorText}`);
        }
        
        return await response.json();
      } catch (error) {
        sendDebugLog(`Ошибка запроса: ${error.message}`, 'error');
        if (error.message.includes('Failed to fetch')) {
          sendDebugLog('Ошибка сетевого соединения или CORS', 'error');
        }
        
        if (retries > 0) {
          sendDebugLog(`Повторная попытка через ${delay}мс...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return fetchWithRetry(url, options, retries - 1, delay * 1.5);
        }
        
        throw error;
      }
    };
    
    // Отправляем запрос к API для добавления события в календарь
    let response;
    
    // Модифицируем подход к запросу в зависимости от окружения
    if (isTelegramWebApp && window.telegramApiProxy) {
      sendDebugLog('Использую Telegram API Proxy для запроса');
      
      try {
        // Используем специальный прокси для Telegram WebApp
        response = await window.telegramApiProxy.fetch('/api/calendar/add-event', {
          method: 'POST',
          body: JSON.stringify(eventData)
        });
        sendDebugLog(`Ответ API (через прокси): ${JSON.stringify(response).substring(0, 100)}...`);
      } catch (proxyError) {
        sendDebugLog(`Ошибка при использовании прокси: ${proxyError.message}`, 'error');
        
        // Запасной вариант - прямой запрос если прокси не сработал
        sendDebugLog('Использую прямой fetch как запасной вариант');
        const config = useRuntimeConfig();
        const baseUrl = config.public.apiBaseUrl || 'https://maxzer.ru';
        const url = `${baseUrl}/api/calendar/add-event`;
        sendDebugLog(`URL запроса: ${url}`);
        
        try {
          response = await fetchWithRetry(
            url,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Origin': window.location.origin || 'https://t.me',
                'X-Requested-With': 'XMLHttpRequest',
                'X-Telegram-WebApp': '1',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
              },
              body: JSON.stringify(eventData),
              mode: 'cors',
              credentials: 'omit',
              cache: 'no-store',
              redirect: 'follow'
            }
          );
          
          sendDebugLog(`Ответ API (прямой fetch): ${JSON.stringify(response).substring(0, 100)}...`);
        } catch (fetchError) {
          // Если все попытки неудачны, пробуем с другим методом
          sendDebugLog(`Все попытки fetch неудачны, пробуем альтернативный метод`, 'error');
          
          // Пробуем использовать XMLHttpRequest как альтернативу fetch
          response = await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', url, true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.setRequestHeader('Accept', 'application/json');
            xhr.setRequestHeader('X-Telegram-WebApp', '1');
            xhr.setRequestHeader('Origin', window.location.origin || 'https://t.me');
            
            xhr.onload = function() {
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  const jsonResponse = JSON.parse(xhr.responseText);
                  sendDebugLog(`Ответ через XMLHttpRequest получен успешно`);
                  resolve(jsonResponse);
                } catch (e) {
                  sendDebugLog(`Ошибка парсинга JSON: ${e.message}`, 'error');
                  reject(new Error('Ошибка парсинга ответа'));
                }
              } else {
                sendDebugLog(`Ошибка XMLHttpRequest: ${xhr.status} ${xhr.statusText}`, 'error');
                reject(new Error(`HTTP ошибка: ${xhr.status}`));
              }
            };
            
            xhr.onerror = function() {
              sendDebugLog(`Сетевая ошибка XMLHttpRequest`, 'error');
              reject(new Error('Сетевая ошибка'));
            };
            
            xhr.send(JSON.stringify(eventData));
            sendDebugLog('Запрос отправлен через XMLHttpRequest');
          });
        }
      }
    } else if (isTelegramWebApp) {
      // Прямой запрос если телеграм, но прокси не инициализирован
      sendDebugLog('Использую прямой fetch запрос для Telegram WebApp');
      const config = useRuntimeConfig();
      const baseUrl = config.public.apiBaseUrl || 'https://maxzer.ru';
      const url = `${baseUrl}/api/calendar/add-event`;
      sendDebugLog(`Отправка запроса на URL: ${url}`);
      
      try {
        response = await fetchWithRetry(
          url,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Origin': window.location.origin || 'https://t.me',
              'X-Requested-With': 'XMLHttpRequest',
              'X-Telegram-WebApp': '1',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            },
            body: JSON.stringify(eventData),
            mode: 'cors',
            credentials: 'omit',
            cache: 'no-store'
          }
        );
      } catch (fetchError) {
        sendDebugLog(`Все попытки fetch неудачны, пробуем через iframe передачу`, 'error');
        
        // Экстренный вариант - создаем временный iframe и отправляем через него
        response = await new Promise((resolve, reject) => {
          try {
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
            
            // Создаем уникальный ID для сообщения
            const messageId = `event_${Date.now()}`;
            
            // Обработчик сообщений от iframe
            const messageHandler = (event) => {
              if (event.data && event.data.messageId === messageId) {
                sendDebugLog(`Получен ответ через iframe: ${JSON.stringify(event.data).substring(0, 100)}...`);
                window.removeEventListener('message', messageHandler);
                document.body.removeChild(iframe);
                
                if (event.data.error) {
                  reject(new Error(event.data.error));
                } else {
                  resolve(event.data.response);
                }
              }
            };
            
            // Регистрируем обработчик сообщений
            window.addEventListener('message', messageHandler);
            
            // Создаем контент для iframe программно, без использования шаблонных строк
            const scriptContent = `
                const messageId = "${messageId}";
                const eventData = ${JSON.stringify(eventData)};
                const url = "${url}";
                
                async function sendRequest() {
                  try {
                    const response = await fetch(url, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                      },
                      body: JSON.stringify(eventData)
                    });
                    
                    const data = await response.json();
                    window.parent.postMessage({ messageId, response: data }, "*");
                  } catch (error) {
                    window.parent.postMessage({ messageId, error: error.message }, "*");
                  }
                }
                
                window.onload = sendRequest;
            `;
            
            // Создаем HTML программно без шаблонных строк
            const html = document.createElement('html');
            const head = document.createElement('head');
            const script = document.createElement('script');
            script.textContent = scriptContent;
            head.appendChild(script);
            
            const body = document.createElement('body');
            body.textContent = 'Отправка запроса...';
            
            html.appendChild(head);
            html.appendChild(body);
            
            const doctype = '<!DOCTYPE html>';
            const iframeContent = doctype + html.outerHTML;
            
            // Загружаем контент в iframe
            iframe.srcdoc = iframeContent;
            sendDebugLog('Запрос отправлен через iframe');
          } catch (iframeError) {
            sendDebugLog(`Ошибка при отправке через iframe: ${iframeError.message}`, 'error');
            reject(iframeError);
          }
        });
      }
    } else {
      // В обычном веб-приложении используем fetchApi из utils
      sendDebugLog('Использую fetchApi для веб-приложения');
      try {
        response = await fetchApi('/api/calendar/add-event', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(eventData)
        });
        sendDebugLog(`Ответ API (fetchApi): ${JSON.stringify(response).substring(0, 100)}...`);
      } catch (fetchError) {
        sendDebugLog(`Ошибка fetchApi: ${fetchError.stack || fetchError.message}`, 'error');
        throw fetchError;
      }
    }
    
    if (response.success) {
      sendDebugLog('Событие успешно создано!');
      isSubmitted.value = true;
      // Сообщаем родительскому компоненту об успешном подтверждении с правильной датой
      emit('confirmed', { 
        date: startDateTimeISO,
        title: props.serviceName,
        color: props.color,
        staffInfo: props.staffInfo,
        petBreed: breedValue.value // Используем локальное значение породы
      });
    } else {
      sendDebugLog(`Ошибка при создании события: ${response.error}`, 'error');
      emit('confirmed', { 
        date: startDateTimeISO,
        title: props.serviceName,
        color: props.color,
        staffInfo: props.staffInfo,
        petBreed: breedValue.value // Используем локальное значение породы
      }, null, response.error || 'Ошибка при создании события');
    }
  } catch (error) {
    sendDebugLog(`Ошибка при подтверждении даты: ${error.stack || error.message}`, 'error');
    emit('confirmed', { 
      date: new Date(selectedDate.value).toISOString(),
      title: props.serviceName,
      color: props.color,
      staffInfo: props.staffInfo,
      petBreed: breedValue.value // Используем локальное значение породы
    }, null, error.message || 'Ошибка при подтверждении даты');
  } finally {
    isLoading.value = false;
  }
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

.selected-date-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-top: 4px;
  animation: fadeIn 0.3s ease;
}

.selected-date {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: rgba(36, 129, 204, 0.08);
  border-radius: 12px;
  margin-bottom: 16px;
}

.date-label {
  font-size: 14px;
  color: var(--tg-theme-hint-color, #666666);
}

.date-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--tg-theme-text-color, #333333);
}

.confirm-button {
  background-color: var(--tg-theme-button-color, #2481cc);
  color: white;
  border: none;
  border-radius: 12px;
  padding: 14px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0.95;
}

.confirm-button:disabled {
  opacity: 0.9;
  cursor: not-allowed;
}

.confirm-button.loading {
  background-color: var(--tg-theme-secondary-bg-color, #f0f0f0);
  color: var(--tg-theme-hint-color, #999999);
}

.button-spinner {
  display: inline-flex;
  align-items: center;
}

.button-spinner::after {
  content: "";
  width: 16px;
  height: 16px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  margin-left: 8px;
  animation: spinner 0.8s linear infinite;
}

@keyframes spinner {
  to {
    transform: rotate(360deg);
  }
}

.select-date-button {
  background-color: rgba(36, 129, 204, 0.1);
  color: var(--tg-theme-link-color, #2481cc);
  margin-top: 4px;
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

/* Стили для кастомного выбора времени */
.time-picker-container {
  width: 100%;
  background-color: var(--tg-theme-bg-color, #ffffff);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  animation: fadeIn 0.3s ease;
}

.time-picker-header {
  font-size: 16px;
  font-weight: 600;
  color: var(--tg-theme-text-color, #333333);
  margin-bottom: 12px;
  text-align: center;
}

.time-slots {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
  justify-content: center;
}

.time-slot-btn {
  background-color: rgba(36, 129, 204, 0.1);
  color: var(--tg-theme-text-color, #333333);
  border: none;
  border-radius: 20px;
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.time-slot-btn.active {
  background-color: var(--tg-theme-button-color, #2481cc);
  color: var(--tg-theme-button-text-color, #ffffff);
}

.time-picker-custom {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 8px;
}

.time-picker-inputs {
  display: flex;
  align-items: center;
  justify-content: center;
}

.time-input {
  background-color: var(--tg-theme-bg-color, #ffffff);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 16px;
  width: 60px;
  text-align: center;
  color: var(--tg-theme-text-color, #333333);
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  padding-right: 28px;
}

.time-separator {
  font-size: 20px;
  font-weight: bold;
  margin: 0 8px;
  color: var(--tg-theme-text-color, #333333);
}

/* Темная тема для выбора времени */
[data-theme="dark"] .time-picker-container {
  background-color: var(--tg-theme-bg-color, #1e1e1e);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

[data-theme="dark"] .time-input {
  background-color: var(--tg-theme-bg-color, #1e1e1e);
  border-color: rgba(255, 255, 255, 0.2);
  color: var(--tg-theme-text-color, #e0e0e0);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23ccc' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
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

/* Стили для отладочной панели */
.date-picker-container {
  position: relative;
}

.debug-info-panel {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: rgba(30, 30, 30, 0.9);
  color: white;
  border-radius: 4px;
  padding: 8px;
  margin-bottom: 10px;
  font-family: monospace;
  font-size: 12px;
  border-left: 3px solid #ff5722;
  user-select: text;
}

.debug-status {
  font-weight: bold;
  padding: 4px 8px;
  border-radius: 4px;
  background-color: #333;
  display: inline-block;
  user-select: text;
}

.debug-error {
  margin-top: 5px;
  background-color: rgba(244, 67, 54, 0.2);
  padding: 8px;
  border-radius: 4px;
  border-left: 3px solid #f44336;
  user-select: text;
}

.error-title {
  font-weight: bold;
  color: #f44336;
  margin-bottom: 4px;
  user-select: text;
}

.error-message {
  color: #ff8a80;
  word-break: break-word;
  user-select: text;
}

/* Скрываем последний vc-week элемент */
:deep(.vc-weeks .vc-week:last-child) {
  display: none !important;
}

.confirm-message {
  font-size: 13px;
  color: #f44336;
  text-align: center;
  margin-top: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  span {
    margin-left: 8px;
  }
}

/* Поле ввода породы */
.breed-input-container {
  width: 100%;
  padding: 16px;
  background-color: var(--tg-theme-bg-color, #ffffff);
  border-radius: 12px;
  margin-bottom: 16px;
  animation: fadeIn 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.breed-input-header {
  font-size: 16px;
  font-weight: 600;
  color: var(--tg-theme-text-color, #333333);
  margin-bottom: 12px;
  text-align: center;
}

.breed-input-wrapper {
  display: flex;
  justify-content: center;
}

.breed-input {
  background-color: var(--tg-theme-bg-color, #ffffff);
  border: 2px solid var(--tg-theme-secondary-bg-color, #f0f0f0);
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 16px;
  width: 100%;
  color: var(--tg-theme-text-color, #333333);
  appearance: none;
  -webkit-appearance: none;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.breed-input:focus {
  outline: none;
  border-color: v-bind('color');
  box-shadow: 0 0 0 2px v-bind('color + "20"');
}

.breed-input::placeholder {
  color: var(--tg-theme-hint-color, #999999);
}
</style> 