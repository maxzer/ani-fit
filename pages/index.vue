<template>
  <div class="main-page">
    <!-- Принудительно отображаемая отладочная панель в самом верху -->
    <div class="debug-panel sticky">
      <h3>Отладка Telegram Mini App</h3>
      <!-- <div class="debug-info">
        <div class="debug-item">
          <span class="debug-label">Telegram WebApp:</span>
          <span class="debug-value">{{ isTelegramWebApp ? 'Доступен ✅' : 'Недоступен ❌' }}</span>
        </div>
        <div class="debug-item">
          <span class="debug-label">API URL:</span>
          <span class="debug-value">{{ apiBaseUrl }}</span>
        </div>
        <div class="debug-item">
          <span class="debug-label">Прокси статус:</span>
          <span class="debug-value">{{ proxyStatus }}</span>
        </div>
        <div v-if="lastError" class="debug-item error">
          <span class="debug-label">Ошибка:</span>
          <span class="debug-value">{{ lastError }}</span>
        </div>
      </div> -->
      <div class="debug-actions">
        <button @click="testApi" class="debug-button">Проверить API</button>
        <button @click="clearLogs" class="debug-button">Очистить логи</button>
      </div>
      <div class="debug-logs">
        <div class="log-header">Последние события:</div>
        <div v-if="logs.length === 0" class="log-empty">Нет событий</div>
        <div v-for="(log, index) in logs" :key="index" class="log-item" :class="{'log-error': log.type === 'error'}">
          <span class="log-time">{{ log.time }}</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
      </div>
    </div>
    
    <!-- Включаем режим отладки для TelegramProxy (скрытый) -->
    <TelegramProxy :debug="false" />
    
    <div v-if="initData?.user" class="user-info">
      <div class="section-title">Добро пожаловать, {{ initData.user.first_name }}!</div>
    </div>
    <div v-else class="section-title">Пользователь</div>
    
    <!-- Карточки сервисов -->
    <div class="card-grid">
      <CardItem
        v-for="card in cards"
        :key="card.id"
        :title="card.title"
        :description="card.description"
        :image="card.image"
        :color="card.color"
        @date-selected="handleDateSelected"
        @debug-log="handleDebugLog"
      />
    </div>
    
    <!-- Запланированные события -->
    <div v-if="scheduledEvents.length > 0" class="scheduled-events">
      <div class="section-title">Запланированные события</div>
      <div class="events-list">
        <div v-for="(event, index) in scheduledEvents" :key="index" class="event-item">
          <div class="event-icon" :style="{ backgroundColor: event.color + '15', color: event.color }">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <div class="event-info">
            <div class="event-title">{{ event.title }}</div>
            <div class="event-date">{{ formatDate(event.date) }}</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Уведомление -->
    <div v-if="notification.show" class="notification" :class="notification.type">
      <p>{{ notification.message }}</p>
      <button @click="notification.show = false" class="notification-close">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject, computed } from 'vue';
import CardItem from '../components/CardItem.vue';
import TelegramProxy from '~/components/TelegramProxy.vue';
import { useRuntimeConfig } from '#app';

// Получаем доступ к WebApp и теме из провайдера
const isTelegramWebAppAvailable = inject('isTelegramWebAppAvailable', false);
const telegramTheme = inject('telegramTheme', { colorScheme: 'dark' });
const isLoading = inject('isLoading', false);
const initData = inject('initData', null);
const showDebugInfo = inject('showDebugInfo', ref(false));

// Данные карточек
const cards = ref([
  {
    id: 1,
    title: 'Тренировки',
    description: 'Индивидуальные программы тренировок',
    color: '#4caf50',
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 2,
    title: 'Питание',
    description: 'Персональный план питания',
    color: '#2196f3',
    image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 3,
    title: 'Прогресс',
    description: 'Отслеживание результатов',
    color: '#ff9800',
    image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 4,
    title: 'Поддержка',
    description: 'Консультации тренера',
    color: '#9c27b0',
    image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80'
  }
]);

// Массив для хранения запланированных событий
const scheduledEvents = ref([]);

// Отладочная информация
const logs = ref([]);
const maxLogs = 10;
const lastError = ref('');
const isTelegramWebApp = computed(() => typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp);
const proxyStatus = computed(() => typeof window !== 'undefined' && window.telegramApiProxy ? 'Активен' : 'Неактивен');
const apiBaseUrl = computed(() => {
  const config = useRuntimeConfig();
  return config.public.apiBaseUrl || 'https://maxzer.ru';
});

// Функция для добавления лога
const addLog = (message, type = 'info') => {
  const now = new Date();
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
  
  logs.value.unshift({
    time,
    message,
    type
  });
  
  // Ограничиваем количество логов
  if (logs.value.length > maxLogs) {
    logs.value = logs.value.slice(0, maxLogs);
  }
  
  // Если это ошибка, сохраняем её отдельно
  if (type === 'error') {
    lastError.value = message;
  }
};

// Функция для очистки логов
const clearLogs = () => {
  logs.value = [];
  lastError.value = '';
};

// Функция для тестирования API
const testApi = async () => {
  addLog('Тестирование API...');
  
  try {
    let response;
    
    if (isTelegramWebApp.value && window.telegramApiProxy) {
      addLog('Использую Telegram API Proxy');
      response = await window.telegramApiProxy.fetch('/api/calendar/test', { method: 'GET' });
    } else {
      addLog('Использую стандартный fetch');
      const baseUrl = apiBaseUrl.value;
      const url = `${baseUrl}/api/calendar/test`;
      
      const fetchResponse = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        mode: 'cors'
      });
      
      if (!fetchResponse.ok) {
        throw new Error(`HTTP Error: ${fetchResponse.status}`);
      }
      
      response = await fetchResponse.json();
    }
    
    addLog(`Ответ API: ${JSON.stringify(response).substring(0, 100)}...`);
  } catch (error) {
    addLog(`Ошибка API: ${error.message}`, 'error');
  }
};

// Переопределяем обработчик выбора даты
const handleDateSelected = (eventData) => {
  // Добавляем новое событие в список
  scheduledEvents.value.push({
    title: eventData.title,
    date: eventData.date,
    color: eventData.color
  });
  
  // Логируем успешное добавление
  addLog(`Добавлено событие: ${eventData.title} на ${formatDate(eventData.date)}`);
  
  // Сортируем события по дате (от ближайшей к более поздней)
  scheduledEvents.value.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Показываем нативное уведомление вместо использования Telegram WebApp API
  showNotification(`Вы успешно запланировали: ${eventData.title} на ${formatDate(eventData.date)}`);
};

// Состояние для нативного уведомления
const notification = ref({
  show: false,
  message: '',
  type: 'success'
});

// Функция для показа нативного уведомления
const showNotification = (message, type = 'success') => {
  notification.value = {
    show: true,
    message,
    type
  };
  
  // Логируем уведомление
  addLog(`Уведомление: ${message}`, type);
  
  // Автоматически скрываем уведомление через 5 секунд
  setTimeout(() => {
    notification.value.show = false;
  }, 5000);
};

// Функция для форматирования даты
const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return `${d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })} ${d.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })}`;
};

// Функция для обработки отладочных логов
const handleDebugLog = (logData) => {
  addLog(logData.message, logData.type);
};

// Инициализация приложения
onMounted(() => {
  console.log('Инициализация главной страницы...');
  addLog('Приложение инициализировано');
  addLog(`Telegram WebApp: ${isTelegramWebApp.value ? 'доступен' : 'недоступен'}`);
  
  // Перехватываем глобальные ошибки
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      addLog(`JS ошибка: ${event.message}`, 'error');
    });
    
    // Перехватываем необработанные промисы
    window.addEventListener('unhandledrejection', (event) => {
      addLog(`Promise ошибка: ${event.reason}`, 'error');
    });
  }
});
</script>

<style scoped>
.main-page {
  padding: 0 16px 16px;
  max-width: 600px;
  margin: 0 auto;
}

.user-info {
  margin-bottom: 16px;
}

.section-title {
  font-size: 18px;
  color: var(--tg-theme-hint-color, #9e9e9e);
  margin: 16px 0;
  text-align: center;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.scheduled-events {
  margin-top: 24px;
  background-color: rgba(255, 255, 255, 0.06);
  padding: 16px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.events-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.event-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background-color: var(--tg-theme-bg-color, #ffffff);
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.event-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background-color: rgba(36, 129, 204, 0.1);
  border-radius: 50%;
  margin-right: 12px;
  color: var(--tg-theme-link-color, #2481cc);
}

.event-info {
  flex: 1;
}

.event-title {
  font-weight: 600;
  color: var(--tg-theme-text-color, #333333);
  font-size: 16px;
}

.event-date {
  color: var(--tg-theme-hint-color, #666666);
  font-size: 14px;
  margin-top: 4px;
}

.app-footer {
  text-align: center;
  margin-top: 24px;
  color: var(--tg-theme-hint-color, #9e9e9e);
  font-size: 14px;
}

/* Стили для уведомления */
.notification {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #4CAF50;
  color: white;
  padding: 12px 20px;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10001;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 250px;
  max-width: 90%;
  animation: slideUp 0.3s ease;
}

.notification.error {
  background-color: #F44336;
}

.notification p {
  margin: 0;
  flex-grow: 1;
}

.notification-close {
  background: transparent;
  border: none;
  color: white;
  margin-left: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translate(-50%, 20px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

/* Обновленные стили для панели отладки */
.debug-panel {
  background-color: #1e1e1e;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  color: #f0f0f0;
  font-family: monospace;
  font-size: 14px;
  border: 2px solid #ff5722;
}

.debug-panel.sticky {
  position: sticky;
  top: 0;
  z-index: 1000;
}

.debug-panel h3 {
  margin-top: 0;
  color: #ff5722;
  border-bottom: 1px solid #ff5722;
  padding-bottom: 8px;
  text-align: center;
  font-size: 18px;
}

.debug-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.debug-item {
  display: flex;
  justify-content: space-between;
  background-color: #2d2d2d;
  padding: 8px;
  border-radius: 4px;
}

.debug-label {
  font-weight: bold;
  color: #ccc;
}

.debug-value {
  color: #4CAF50;
  font-weight: bold;
}

.debug-item.error .debug-value {
  color: #F44336;
}

.debug-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  justify-content: center;
}

.debug-button {
  background-color: #ff5722;
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 10px 16px;
  cursor: pointer;
  font-weight: bold;
}

.debug-button:hover {
  background-color: #ff7043;
}

.debug-logs {
  background-color: #000;
  border-radius: 4px;
  padding: 12px;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #444;
}

.log-header {
  color: #ff5722;
  font-weight: bold;
  margin-bottom: 8px;
  font-size: 14px;
}

.log-empty {
  color: #777;
  font-style: italic;
  text-align: center;
  padding: 10px 0;
}

.log-item {
  font-size: 12px;
  padding: 6px 4px;
  border-bottom: 1px solid #333;
}

.log-time {
  color: #888;
  margin-right: 8px;
  background-color: #222;
  padding: 2px 4px;
  border-radius: 3px;
}

.log-message {
  color: #f0f0f0;
}

.log-error {
  background-color: rgba(244, 67, 54, 0.1);
}

.log-error .log-time {
  background-color: #400;
  color: #f88;
}

.log-error .log-message {
  color: #F44336;
}
</style>


