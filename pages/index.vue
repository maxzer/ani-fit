<template>
  <div class="main-page">
    <div v-if="user" class="user-info">
      <div class="user-avatar" v-if="user.photoUrl">
        <img :src="user.photoUrl" alt="Аватар" />
      </div>
      <div class="user-details">
        <div class="welcome-container">
          <div class="welcome-text">Добро пожаловать</div>
          <div class="user-name">{{ user.realName || user.firstName }}</div>
        </div>
        <button @click="handleLogout" class="logout-button">
          <svg class="logout-icon" viewBox="0 0 24 24">
            <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"></path>
          </svg>
          Выйти
        </button>
      </div>
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
    <div v-if="scheduledEvents.length > 0 || isLoadingEvents" class="scheduled-events">
      <div class="section-title">
        Запланированные события
        <div v-if="isLoadingEvents" class="loading-indicator">
          <div class="loading-spinner-small"></div>
        </div>
      </div>
      
      <div v-if="isLoadingEvents && scheduledEvents.length === 0" class="loading-events">
        <div class="loading-spinner"></div>
        <p>Загрузка ваших событий...</p>
      </div>
      
      <div v-else class="events-list">
        <div v-for="(event, index) in scheduledEvents" :key="event.id || index" class="event-item" :class="{ 'event-cancelled': event.status === 'cancelled' }">
          <div class="event-icon" :style="{ backgroundColor: event.color + '15', color: event.color }">
            <svg v-if="event.status !== 'cancelled'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          </div>
          <div class="event-info">
            <div class="event-title-row">
              <div class="event-title" :class="{ 'cancelled-text': event.status === 'cancelled' }">{{ event.title }}</div>
              <div v-if="event.status" class="event-status" :class="'status-' + event.status">
                {{ getStatusText(event.status) }}
              </div>
            </div>
            <div class="event-datetime">
              <div class="event-date">{{ formatDateOnly(event.date) }}</div>
              <div class="event-time" :style="{ color: event.color }">{{ formatTimeOnly(event.date) }}</div>
            </div>
            <div v-if="event.staffInfo" class="event-staff">
              Специалист: {{ getStaffName(event.staffInfo) }}
            </div>
            <div v-if="event.petBreed" class="event-breed">
              Порода: {{ event.petBreed }}
            </div>
          </div>
          <button 
            v-if="event.status !== 'cancelled'" 
            @click="cancelEvent(event.id)" 
            class="cancel-event-button"
            :disabled="isCancellingEvent"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
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
import { ref, onMounted, inject, computed, watch } from 'vue';
import CardItem from '../components/CardItem.vue';
import { useRuntimeConfig } from '#app';

// Получаем доступ к WebApp и теме из провайдера
const isTelegramWebAppAvailable = inject('isTelegramWebAppAvailable', false);
const telegramTheme = inject('telegramTheme', { colorScheme: 'dark' });
const isLoading = inject('isLoading', false);
const initData = inject('initData', null);

// Получаем данные пользователя из глобального состояния
const user = inject('user', null);
const logout = inject('logout', () => {});

// Данные карточек
const cards = ref([
  {
    id: 1,
    title: 'Массаж',
    description: 'Индивидуальные программы тренировок',
    color: '#4caf50',
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 2,
    title: 'Занятие в бассейне',
    description: 'Персональный план питания',
    color: '#2196f3',
    image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 3,
    title: 'Аренда бассейна',
    description: 'Отслеживание результатов',
    color: '#ff9800',
    image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 4,
    title: 'Занятие с хендлером',
    description: 'Консультации тренера',
    color: '#9c27b0',
    image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80'
  }
]);

// Массив для хранения запланированных событий
const scheduledEvents = ref([]);

// Состояние для нативного уведомления
const notification = ref({
  show: false,
  message: '',
  type: 'success'
});

// Состояние для загрузки и отмены событий
const isLoadingEvents = ref(false);
const isCancellingEvent = ref(false);

// При монтировании компонента загружаем события пользователя
onMounted(async () => {
  // Проверяем наличие токена перед попыткой загрузки событий
  const token = localStorage.getItem('authToken');
  if (!token) {
    console.error('Токен авторизации отсутствует при загрузке страницы');
    showNotification('Требуется авторизация для загрузки данных', 'error');
    return;
  }
  
  // Обновляем заголовок авторизации в axios
  if (window.axios) {
    window.axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    console.log('Установлен заголовок авторизации при загрузке страницы');
  }
  
  console.log('Токен авторизации:', token.substring(0, 10) + '...');
  console.log('Пользователь:', user.value);
  
  // Загружаем события, только если пользователь авторизован
  if (user.value && user.value.id) {
    await loadUserEvents();
  } else {
    console.error('Отсутствуют данные пользователя при загрузке страницы');
    showNotification('Ошибка загрузки данных пользователя', 'error');
  }
});

// Следим за изменениями пользователя
watch(() => user.value, async (newUser) => {
  if (newUser && newUser.id) {
    await loadUserEvents();
  } else {
    // Если пользователь вышел, очищаем список событий
    scheduledEvents.value = [];
  }
});

// Функция для загрузки событий пользователя
const loadUserEvents = async () => {
  if (!user.value || !user.value.id) {
    console.error('Попытка загрузки событий без данных пользователя');
    return;
  }
  
  try {
    isLoadingEvents.value = true;
    
    // Получаем конфигурацию для API
    const config = useRuntimeConfig();
    const baseUrl = config.public.apiBaseUrl || 'https://maxzer.ru';
    
    // Формируем URL для запроса
    const url = `${baseUrl}/api/events?userId=${user.value.id}`;
    
    // Проверяем и получаем токен авторизации
    let authToken;
    
    // Сначала проверяем localStorage
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      authToken = storedToken;
    }
    // Затем проверяем axios headers
    else if (window.axios?.defaults?.headers?.common?.['Authorization']) {
      const authHeader = window.axios.defaults.headers.common['Authorization'];
      if (authHeader.startsWith('Bearer ')) {
        authToken = authHeader.substring(7);
      }
    }
    
    if (!authToken) {
      console.error('Отсутствует токен авторизации для загрузки событий');
      showNotification('Требуется авторизация для загрузки данных', 'error');
      return;
    }
    
    // Выполняем запрос к API
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      // Обрабатываем ошибки
      if (response.status === 401) {
        console.error('Ошибка авторизации при загрузке событий');
        showNotification('Срок действия авторизации истек. Пожалуйста, войдите заново.', 'error');
        // Очищаем текущий токен
        localStorage.removeItem('authToken');
        delete window.axios?.defaults?.headers?.common?.['Authorization'];
        return;
      } else {
        throw new Error(`Error loading events: ${response.status}`);
      }
    }
    
    const result = await response.json();
    
    if (result.success && Array.isArray(result.events)) {
      // Обновляем список событий
      scheduledEvents.value = result.events.map(event => ({
        id: event.id,
        title: event.title,
        date: event.date,
        color: event.color,
        status: event.status,
        staffInfo: event.staffInfo,
        petBreed: event.petBreed,
        googleEventId: event.googleEventId
      }));
      
      // Сортируем события по дате (от ближайшей к более поздней)
      scheduledEvents.value.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      console.log('Загружено событий:', scheduledEvents.value.length);
    } else {
      console.warn('Нет данных о событиях или некорректный формат ответа:', result);
    }
  } catch (error) {
    console.error('Failed to load user events:', error);
    showNotification('Не удалось загрузить ваши события: ' + error.message, 'error');
  } finally {
    isLoadingEvents.value = false;
  }
};

// Обработчик выхода из аккаунта
const handleLogout = () => {
  // Выполняем логаут
  logout();
  
  // Показываем уведомление
  showNotification('Вы успешно вышли из аккаунта', 'info');
  
  // Добавляем задержку перед закрытием приложения (1.5 секунды),
  // чтобы пользователь успел увидеть уведомление
  setTimeout(() => {
    // Проверяем доступность Telegram WebApp API
    if (window.Telegram && window.Telegram.WebApp) {
      // Закрываем приложение
      window.Telegram.WebApp.close();
    }
  }, 1500);
};

// Функция для показа нативного уведомления
const showNotification = (message, type = 'success') => {
  notification.value = {
    show: true,
    message,
    type
  };
  
  // Автоматически скрываем уведомление через 5 секунд
  setTimeout(() => {
    notification.value.show = false;
  }, 5000);
};

// Переопределяем обработчик выбора даты
const handleDateSelected = (eventData) => {
  // Добавляем новое событие в список
  scheduledEvents.value.push({
    title: eventData.title,
    date: eventData.date,
    color: eventData.color
  });
  
  // Сортируем события по дате (от ближайшей к более поздней)
  scheduledEvents.value.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Показываем нативное уведомление
  showNotification(`Вы успешно запланировали: ${eventData.title} на ${formatDate(eventData.date)}`);
  
  // Обновляем список событий с сервера
  setTimeout(() => {
    loadUserEvents();
  }, 1000);
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

// Функция для форматирования только даты
const formatDateOnly = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Функция для форматирования только времени
const formatTimeOnly = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

// Функция для обработки отладочных логов (пустая функция для совместимости)
const handleDebugLog = () => {};

// Функция для отмены события
const cancelEvent = async (eventId) => {
  try {
    const token = localStorage.getItem('authToken');
    
    // Проверяем, есть ли токен авторизации
    if (!token) {
      showNotification('Ошибка авторизации: Токен не найден. Пожалуйста, войдите снова.', 'error');
      console.error('Отсутствует токен авторизации');
      return;
    }
    
    // Добавляем предварительную проверку, чтобы пользователь подтвердил отмену
    if (!confirm('Вы уверены, что хотите отменить это событие?')) {
      return;
    }
    
    isCancellingEvent.value = true;
    
    // Первичная попытка отменить событие
    let response;
    try {
      response = await fetch(`/api/events/${eventId}/cancel?userId=${user.value?.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: 'cancelled',
          reason: 'cancelled_by_user'
        })
      });
    } catch (networkError) {
      console.error('Сетевая ошибка при отмене события:', networkError);
      showNotification('Ошибка сети при отмене события. Проверьте подключение к интернету.', 'error');
      isCancellingEvent.value = false;
      return;
    }
    
    // Обрабатываем 401 Unauthorized - пробуем обновить токен и повторить
    if (response.status === 401) {
      console.log('Получен 401 при отмене события, пробуем обновить токен');
      
      // Пытаемся обновить токен
      const newToken = await refreshAuthToken();
      
      if (!newToken) {
        console.error('Не удалось обновить токен авторизации');
        showNotification('Ошибка авторизации. Пожалуйста, войдите снова.', 'error');
        isCancellingEvent.value = false;
        return;
      }
      
      // Повторяем запрос с обновленным токеном
      try {
        response = await fetch(`/api/events/${eventId}/cancel?userId=${user.value?.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${newToken}`
          },
          body: JSON.stringify({
            status: 'cancelled',
            reason: 'cancelled_by_user'
          })
        });
      } catch (retryError) {
        console.error('Ошибка при повторной попытке отменить событие:', retryError);
        showNotification('Не удалось отменить событие после обновления токена.', 'error');
        isCancellingEvent.value = false;
        return;
      }
      
      // Если и после обновления токена получаем 401, то это серьезная проблема авторизации
      if (response.status === 401) {
        console.error('Получен 401 даже после обновления токена');
        showNotification('Серьезная ошибка авторизации. Пожалуйста, войдите снова или перезагрузите приложение.', 'error');
        isCancellingEvent.value = false;
        return;
      }
    }
    
    // Проверяем на другие ошибки
    if (!response.ok) {
      let errorText = `Ошибка при отмене события: ${response.status}`;
      
      try {
        const errorData = await response.json();
        if (errorData && errorData.message) {
          errorText += ` - ${errorData.message}`;
        }
      } catch (jsonError) {
        console.error('Не удалось распарсить ответ сервера:', jsonError);
      }
      
      console.error(errorText);
      showNotification(errorText, 'error');
      isCancellingEvent.value = false;
      return;
    }
    
    // Обработка успешного ответа
    try {
      const data = await response.json();
      console.log('Получен ответ от сервера:', data);
      
      if (data && data.success) {
        // Обновляем событие в локальном массиве
        const index = scheduledEvents.value.findIndex(event => event.id === eventId);
        
        if (index !== -1) {
          // Обновляем поля события из ответа сервера
          if (data.event) {
            console.log('Обновляем событие из ответа:', data.event);
            // Создаем новый объект, объединяя существующие данные с данными из сервера
            scheduledEvents.value[index] = {
              ...scheduledEvents.value[index],
              ...data.event,
              status: 'cancelled',
              color: '#f44336'
            };
          } else {
            // Резервный вариант, если структура ответа неожиданная
            scheduledEvents.value[index].status = 'cancelled';
            scheduledEvents.value[index].color = '#f44336';
          }
        } else {
          console.warn(`Событие с id=${eventId} не найдено в локальном массиве`);
        }
        
        // Уведомляем пользователя
        showNotification('Событие успешно отменено', 'success');
      } else {
        console.warn('Неожиданная структура ответа:', data);
        showNotification('Событие было обработано, но произошла неожиданная ошибка. Обновите страницу.', 'warning');
      }
    } catch (parseError) {
      console.error('Ошибка при обработке ответа сервера:', parseError);
      showNotification('Ошибка при обработке ответа сервера. Но событие могло быть отменено.', 'warning');
    }
  } catch (error) {
    console.error('Непредвиденная ошибка при отмене события:', error);
    showNotification(`Непредвиденная ошибка: ${error.message}`, 'error');
  } finally {
    isCancellingEvent.value = false;
  }
};

// Функция для получения текста статуса
const getStatusText = (status) => {
  switch (status) {
    case 'confirmed': return 'Подтверждено';
    case 'cancelled': return 'Отменено';
    case 'pending': return 'В ожидании';
    default: return status;
  }
};

// Функция для получения имени специалиста из staffInfo
const getStaffName = (staffInfo) => {
  if (!staffInfo) return '';
  
  // Если staffInfo - строка, пытаемся распарсить JSON
  if (typeof staffInfo === 'string') {
    try {
      staffInfo = JSON.parse(staffInfo);
    } catch (e) {
      return staffInfo;
    }
  }
  
  if (staffInfo.name) return staffInfo.name;
  if (staffInfo.id === 'any') return 'Будет назначен';
  
  return '';
};

// Функция для обновления токена авторизации
const refreshAuthToken = async () => {
  try {
    // Определяем, используется ли Telegram WebApp
    const isTelegramApp = isTelegramWebAppAvailable && window.Telegram?.WebApp;
    
    let newToken = null;
    
    // Если доступен Telegram WebApp, используем его для обновления
    if (isTelegramApp) {
      console.log('Пытаемся обновить токен через Telegram WebApp');
      
      const tgWebApp = window.Telegram.WebApp;
      
      // Проверяем наличие initData
      if (!tgWebApp.initData) {
        console.error('Отсутствуют данные инициализации Telegram WebApp');
        return null;
      }
      
      // Извлекаем информацию о пользователе из initData
      const userData = tgWebApp.initDataUnsafe?.user || {};
      
      // Создаем запрос для повторной авторизации
      const authRequest = {
        initData: tgWebApp.initData,
        telegram_data: userData,
        client_time: new Date().toISOString(),
        action: 'refresh_token',
        nonce: Math.random().toString(36).substring(2, 15)
      };
      
      // Отправляем запрос на сервер
      const response = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify(authRequest),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Ошибка обновления Telegram токена: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.accessToken) {
        newToken = data.accessToken;
      }
    } else {
      // Для обычной авторизации используем стандартный API
      console.log('Пытаемся обновить токен через стандартный API');
      
      const response = await fetch('/api/auth/refresh-token', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Ошибка обновления стандартного токена: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.accessToken) {
        newToken = data.accessToken;
      }
    }
    
    // Если получен новый токен, сохраняем его
    if (newToken) {
      console.log('Получен новый токен:', newToken.substring(0, 10) + '...');
      
      // Сохраняем токен в localStorage
      localStorage.setItem('authToken', newToken);
      
      // Обновляем заголовок авторизации в axios
      if (window.axios) {
        window.axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      }
      
      // Небольшая задержка перед возвратом нового токена
      await new Promise(resolve => setTimeout(resolve, 50));
      
      return newToken;
    }
  } catch (error) {
    console.error('Ошибка при обновлении токена:', error);
  }
  
  return null;
};
</script>

<style scoped>
.main-page {
  padding: 0 16px 16px;
  max-width: 600px;
  margin: 0 auto;
}

.user-info {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  padding: 16px;
  background-color: var(--tg-theme-secondary-bg-color, rgba(255, 255, 255, 0.06));
  border-radius: 12px;
  margin-top: 16px;
}

.user-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 12px;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-details {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.welcome-container {
  display: flex;
  flex-direction: column;
}

.welcome-text {
  font-size: 14px;
  color: var(--tg-theme-hint-color, #9e9e9e);
  margin-bottom: 4px;
}

.user-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--tg-theme-text-color, #ffffff);
}

.logout-button {
  display: flex;
  align-items: center;
  background: none;
  border: none;
  color: var(--tg-theme-hint-color, #9e9e9e);
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}

.logout-icon {
  width: 20px;
  height: 20px;
  margin-right: 6px;
}

.section-title {
  font-size: 20px;
  font-weight: 700;
  margin: 24px 0 16px;
  color: var(--tg-theme-text-color, #ffffff);
  display: flex;
  align-items: center;
  position: relative;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.scheduled-events {
  margin-top: 32px;
  background-color: var(--tg-theme-secondary-bg-color, rgba(255, 255, 255, 0.06));
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.scheduled-events .section-title {
  margin-top: 0;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.events-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.event-item {
  background-color: var(--tg-theme-bg-color, rgba(255, 255, 255, 0.04));
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: flex-start;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.event-cancelled {
  opacity: 0.6;
  background-color: rgba(244, 67, 54, 0.08);
}

.cancelled-text {
  text-decoration: line-through;
  color: var(--tg-theme-hint-color, #9e9e9e);
}

.status-cancelled {
  background-color: rgba(244, 67, 54, 0.15);
  color: #ff6c5c;
}

.event-icon {
  width: 44px;
  height: 44px;
  min-width: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 14px;
  background-image: linear-gradient(45deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.01));
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.event-icon svg {
  width: 24px;
  height: 24px;
}

.event-info {
  flex: 1;
}

.event-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.event-title {
  font-weight: 700;
  color: var(--tg-theme-text-color, #ffffff);
  font-size: 16px;
  margin-bottom: 2px;
}

.event-status {
  padding: 3px 8px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 6px;
}

.status-confirmed {
  background-color: rgba(76, 175, 80, 0.15);
  color: #62d866;
}

.status-pending {
  background-color: rgba(255, 152, 0, 0.15);
  color: #ffac33;
}

.event-datetime {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.event-date {
  color: var(--tg-theme-hint-color, #9e9e9e);
  font-size: 14px;
}

.event-time {
  font-weight: 600;
  font-size: 14px;
}

.event-staff, .event-breed {
  color: var(--tg-theme-hint-color, #9e9e9e);
  font-size: 13px;
  margin-top: 5px;
  display: flex;
  align-items: center;
}

.event-staff:before, .event-breed:before {
  content: '';
  display: inline-block;
  width: 4px;
  height: 4px;
  background-color: currentColor;
  border-radius: 50%;
  margin-right: 6px;
  opacity: 0.6;
}

.cancel-event-button {
  background: transparent;
  border: none;
  color: var(--tg-theme-hint-color, #9e9e9e);
  cursor: pointer;
  padding: 6px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
}

.cancel-event-button svg {
  width: 16px;
  height: 16px;
}

.notification {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 14px 20px;
  border-radius: 16px;
  color: white;
  max-width: 90%;
  width: auto;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.25);
  animation: notification-slide-up 0.3s ease forwards;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.notification p {
  margin: 0;
  flex: 1;
  font-weight: 500;
}

.notification.success {
  background-color: rgba(76, 175, 80, 0.85);
  border: 1px solid rgba(76, 175, 80, 0.2);
}

.notification.error {
  background-color: rgba(244, 67, 54, 0.85);
  border: 1px solid rgba(244, 67, 54, 0.2);
}

.notification.info {
  background-color: rgba(33, 150, 243, 0.85);
  border: 1px solid rgba(33, 150, 243, 0.2);
}

.notification-close {
  background: none;
  border: none;
  color: white;
  margin-left: 12px;
  cursor: pointer;
  padding: 6px;
  display: flex;
  opacity: 0.8;
  border-radius: 50%;
}

.loading-indicator {
  display: flex;
  align-items: center;
  margin-left: 10px;
}

.loading-spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-top: 2px solid var(--tg-theme-button-color, #3390ec);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-events {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-top: 4px solid var(--tg-theme-button-color, #3390ec);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes notification-slide-up {
  0% { transform: translate(-50%, 100%); opacity: 0; }
  100% { transform: translate(-50%, 0); opacity: 1; }
}

@media (max-width: 600px) {
  .card-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
}
</style>


