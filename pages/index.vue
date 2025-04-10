<template>
  <div class="main-page">
    <div v-if="user" class="user-info">
      <div class="user-avatar" v-if="user.photoUrl">
        <img :src="user.photoUrl" alt="Аватар" />
      </div>
      <div class="user-details">
        <div class="section-title">Добро пожаловать, {{ user.firstName }}!</div>
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
            <div class="event-datetime">
              <div class="event-date">{{ formatDateOnly(event.date) }}</div>
              <div class="event-time" :style="{ color: event.color }">{{ formatTimeOnly(event.date) }}</div>
            </div>
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

// Обработчик выхода из аккаунта
const handleLogout = () => {
  logout();
  
  // Показываем уведомление
  showNotification('Вы успешно вышли из аккаунта', 'info');
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

.logout-button {
  display: flex;
  align-items: center;
  background-color: transparent;
  color: var(--tg-theme-hint-color, #9e9e9e);
  border: 1px solid var(--tg-theme-hint-color, #9e9e9e);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.logout-button:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.logout-icon {
  width: 18px;
  height: 18px;
  margin-right: 6px;
  fill: currentColor;
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

.event-datetime {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.event-date {
  color: var(--tg-theme-hint-color, #666666);
  font-size: 14px;
  padding: 2px 8px;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

.event-time {
  font-size: 14px;
  font-weight: 600;
  padding: 2px 8px;
  background-color: rgba(36, 129, 204, 0.1);
  border-radius: 4px;
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

.notification.info {
  background-color: #2196F3;
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
</style>


