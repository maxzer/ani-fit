<template>
  <div class="profile-page">
    <div class="profile-header">
      <button @click="goBack" class="back-button">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
        Назад
      </button>
      <h1 class="page-title">Профиль</h1>
    </div>

    <div v-if="user" class="user-profile">
      <div class="user-avatar-large" v-if="user.photoUrl">
        <img :src="user.photoUrl" alt="Аватар" loading="lazy" />
      </div>
      <div class="user-info">
        <h2 class="user-name">{{ user.realName || user.firstName }}</h2>
        <p class="user-telegram" v-if="user.username">@{{ user.username }}</p>
      </div>
    </div>

    <!-- Все запланированные события -->
    <div v-if="scheduledEvents.length > 0 || isLoadingEvents" class="all-events">
      <div class="section-title">
        Все запланированные события
        <div v-if="isLoadingEvents" class="loading-indicator">
          <div class="loading-spinner-small"></div>
        </div>
      </div>
      
      <div v-if="isLoadingEvents && scheduledEvents.length === 0" class="loading-events">
        <div class="loading-spinner"></div>
        <p>Загрузка ваших событий...</p>
      </div>
      
      <div v-else class="events-list">
        <EventItem 
          v-for="(event, index) in visibleEvents" 
          :key="event.id || index" 
          :event="event"
          :is-cancelling="isCancellingEvent"
          @cancel="cancelEvent"
        />
        
        <div v-if="hasMoreEvents" class="load-more-container">
          <button @click="loadMoreEvents" class="load-more-button" :class="{ 'loading': isLoadingMore }">
            <span v-if="!isLoadingMore">Загрузить еще</span>
            <div v-else class="loading-spinner-inline"></div>
          </button>
        </div>
      </div>
    </div>
    
    <div v-if="scheduledEvents.length === 0 && !isLoadingEvents" class="no-events">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
      </svg>
      <p>У вас пока нет запланированных событий</p>
    </div>
    
    <!-- Уведомление -->
    <Teleport to="body">
      <div v-if="notification.show" class="notification" :class="notification.type">
        <p>{{ notification.message }}</p>
        <button @click="notification.show = false" class="notification-close">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, inject, computed, watch, defineAsyncComponent, onBeforeMount } from 'vue';
import { useRuntimeConfig, navigateTo } from '#app';
import { useEventApi } from '~/composables/useEventApi';
import { useDateFormatter } from '~/composables/useDateFormatter';

// Ленивая загрузка компонента события
const EventItem = defineAsyncComponent(() => 
  import('~/components/profile/EventItem.vue')
);

// Получаем доступ к WebApp и теме из провайдера
const isTelegramWebAppAvailable = inject('isTelegramWebAppAvailable', false);
const telegramTheme = inject('telegramTheme', { colorScheme: 'dark' });

// Получаем данные пользователя из глобального состояния
const user = inject('user', null);

// Массив для хранения запланированных событий с указанием типа для реактивности
const scheduledEvents = ref([]);

// Используем API для событий из выделенного composable
const { fetchUserEvents, cancelUserEvent } = useEventApi();

// Используем форматтер даты из composable
const { formatDate, formatTime } = useDateFormatter();

// Состояние для нативного уведомления
const notification = ref({
  show: false,
  message: '',
  type: 'success'
});

// Состояние для загрузки и отмены событий
const isLoadingEvents = ref(false);
const isCancellingEvent = ref(false);
const isLoadingMore = ref(false);

// Состояние для пагинации
const eventsPerPage = 10;
const visibleCount = ref(eventsPerPage);

// Исправление для Telegram Mini App и предотвращения обрезания контента
onBeforeMount(() => {
  // Устанавливаем высоту для корректного отображения в Telegram Mini App
  if (isTelegramWebAppAvailable) {
    document.documentElement.style.height = 'auto';
    document.body.style.height = 'auto';
    document.body.style.overflowY = 'auto';
    document.body.style.position = 'static';
  }
});

// Мемоизация сортировки событий для лучшей производительности
const sortedEvents = computed(() => {
  return [...scheduledEvents.value].sort((a, b) => new Date(a.date) - new Date(b.date));
});

// Вычисляемое свойство для отображения ограниченного числа событий
const visibleEvents = computed(() => {
  return sortedEvents.value.slice(0, visibleCount.value);
});

// Проверка, есть ли еще события для загрузки
const hasMoreEvents = computed(() => {
  return visibleCount.value < sortedEvents.value.length;
});

// При монтировании компонента загружаем события пользователя
onMounted(async () => {
  if (user.value && user.value.id) {
    await loadUserEvents();
  }
});

// Следим за изменениями пользователя
watch(() => user.value?.id, async (newUserId, oldUserId) => {
  if (newUserId && newUserId !== oldUserId) {
    // Сбрасываем видимое количество при смене пользователя
    visibleCount.value = eventsPerPage;
    await loadUserEvents();
  } else if (!newUserId) {
    // Если пользователь вышел, очищаем список событий
    scheduledEvents.value = [];
  }
}, { immediate: true });

// Функция для загрузки событий пользователя
const loadUserEvents = async () => {
  if (!user.value || !user.value.id) {
    console.error('Попытка загрузки событий без данных пользователя');
    return;
  }
  
  try {
    isLoadingEvents.value = true;
    const events = await fetchUserEvents(user.value.id);
    
    if (events) {
      scheduledEvents.value = events;
      console.log('Загружено событий:', events.length);
    }
  } catch (error) {
    console.error('Failed to load user events:', error);
    showNotification('Не удалось загрузить ваши события: ' + error.message, 'error');
  } finally {
    isLoadingEvents.value = false;
  }
};

// Функция для загрузки дополнительных событий
const loadMoreEvents = async () => {
  isLoadingMore.value = true;
  
  try {
    // Имитируем задержку для показа анимации загрузки
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Увеличиваем количество видимых событий
    visibleCount.value += eventsPerPage;
  } catch (error) {
    console.error('Failed to load more events:', error);
  } finally {
    isLoadingMore.value = false;
  }
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

// Функция для отмены события
const cancelEvent = async (eventId) => {
  try {
    // Добавляем предварительную проверку, чтобы пользователь подтвердил отмену
    if (!confirm('Вы уверены, что хотите отменить это событие?')) {
      return;
    }
    
    isCancellingEvent.value = true;
    
    // Отменяем событие через API
    const result = await cancelUserEvent(eventId, user.value?.id);
    
    if (result && result.success) {
      // Обновляем событие в локальном массиве
      const index = scheduledEvents.value.findIndex(event => event.id === eventId);
      
      if (index !== -1) {
        // Обновляем поля события из ответа сервера
        if (result.event) {
          scheduledEvents.value[index] = {
            ...scheduledEvents.value[index],
            ...result.event,
            status: 'cancelled',
            color: '#f44336'
          };
        } else {
          // Резервный вариант
          scheduledEvents.value[index].status = 'cancelled';
          scheduledEvents.value[index].color = '#f44336';
        }
      }
      
      // Уведомляем пользователя
      showNotification('Событие успешно отменено', 'success');
    } else {
      showNotification('Произошла ошибка при отмене события', 'error');
    }
  } catch (error) {
    console.error('Failed to cancel event:', error);
    showNotification('Не удалось отменить событие: ' + error.message, 'error');
  } finally {
    isCancellingEvent.value = false;
  }
};

// Функция для возвращения назад
const goBack = () => {
  navigateTo('/');
};
</script>

<style scoped>
.profile-page {
  padding: 0 16px 16px;
  max-width: 600px;
  margin: 0 auto;
  min-height: 100vh;
  height: auto;
  overflow-y: visible;
  position: relative;
}

.profile-header {
  display: flex;
  align-items: center;
  margin: 16px 0;
  gap: 12px;
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: var(--tg-theme-bg-color, #1f1f1f);
  padding: 10px 0;
}

.back-button {
  display: flex;
  align-items: center;
  background: none;
  border: none;
  color: var(--tg-theme-button-color, #3390ec);
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}

.back-button svg {
  margin-right: 6px;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--tg-theme-text-color, #ffffff);
  margin: 0;
  flex: 1;
  text-align: center;
}

.user-profile {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 24px;
  padding: 20px;
  background-color: var(--tg-theme-secondary-bg-color, rgba(255, 255, 255, 0.06));
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  will-change: transform;
}

.user-avatar-large {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  margin-bottom: 16px;
  border: 2px solid var(--tg-theme-button-color, #3390ec);
  padding: 3px;
}

.user-avatar-large img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.user-info {
  text-align: center;
}

.user-name {
  font-size: 22px;
  font-weight: 600;
  margin: 0 0 6px;
  color: var(--tg-theme-text-color, #ffffff);
}

.user-telegram {
  font-size: 14px;
  color: var(--tg-theme-hint-color, #9e9e9e);
  margin: 0;
}

.all-events {
  margin-top: 24px;
  background-color: var(--tg-theme-secondary-bg-color, rgba(255, 255, 255, 0.06));
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow: visible;
  height: auto;
  max-height: none;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 16px;
  color: var(--tg-theme-text-color, #ffffff);
  display: flex;
  align-items: center;
  position: relative;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
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

.loading-spinner-inline {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

.events-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: visible;
  height: auto;
  max-height: none;
}

.load-more-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  margin-bottom: 10px;
}

.load-more-button {
  background-color: var(--tg-theme-button-color, #3390ec);
  color: var(--tg-theme-button-text-color, #ffffff);
  border: none;
  padding: 10px 20px;
  border-radius: 10px;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.1s ease;
  min-width: 160px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.load-more-button:hover {
  background-color: var(--tg-theme-button-color, #3390ec);
  opacity: 0.9;
}

.load-more-button:active {
  transform: scale(0.98);
}

.load-more-button.loading {
  opacity: 0.8;
  cursor: wait;
}

.no-events {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-top: 40px;
  padding: 40px 20px;
  background-color: var(--tg-theme-secondary-bg-color, rgba(255, 255, 255, 0.06));
  border-radius: 16px;
  text-align: center;
  color: var(--tg-theme-hint-color, #9e9e9e);
}

.no-events svg {
  margin-bottom: 16px;
  opacity: 0.4;
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

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes notification-slide-up {
  0% { transform: translate(-50%, 100%); opacity: 0; }
  100% { transform: translate(-50%, 0); opacity: 1; }
}

/* Специфичные стили для Telegram Mini App */
@media (max-width: 480px) {
  .profile-page {
    padding: 0 12px 70px;
  }
  
  .event-items {
    margin-bottom: 50px;
  }
}
</style> 