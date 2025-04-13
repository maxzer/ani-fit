<template>
  <div class="event-item" :class="{ 'event-cancelled': event.status === 'cancelled' }">
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
      <div class="event-header">
        <div class="event-title" :class="{ 'cancelled-text': event.status === 'cancelled' }">{{ event.title }}</div>
        <div v-if="event.status" class="event-status" :class="'status-' + event.status">
          {{ statusText }}
        </div>
      </div>
      <div class="event-details">
        <span class="event-date">{{ formattedDate }}</span>
        <span class="event-time-separator">•</span>
        <span class="event-time" :style="{ color: event.color }">{{ formattedTime }}</span>
        <span class="event-staff-info" v-if="event.staffInfo">• {{ staffName }}</span>
      </div>
      <div v-if="event.petBreed" class="event-breed">{{ event.petBreed }}</div>
    </div>
    <button 
      v-if="event.status !== 'cancelled'" 
      @click.stop="handleCancel" 
      class="cancel-event-button"
      :disabled="isCancelling"
      aria-label="Отменить событие"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useDateFormatter } from '../../composables/useDateFormatter';

// Определяем типы свойств
interface EventProps {
  id: string;
  title: string;
  date: string;
  color: string;
  status: string;
  staffInfo?: any;
  petBreed?: string;
  googleEventId?: string;
}

// Определяем свойства компонента
const props = defineProps<{
  event: EventProps;
  isCancelling: boolean;
}>();

// Определяем события
const emit = defineEmits<{
  cancel: [eventId: string]
}>();

// Используем композаблы для форматирования
const { formatDate, formatTime, getStatusText, getStaffName } = useDateFormatter();

// Мемоизация вычисляемых свойств для оптимизации рендеринга
const formattedDate = computed(() => formatDate(props.event.date));
const formattedTime = computed(() => formatTime(props.event.date));
const statusText = computed(() => getStatusText(props.event.status));
const staffName = computed(() => getStaffName(props.event.staffInfo));

// Функция для обработки отмены события
const handleCancel = () => {
  emit('cancel', props.event.id);
};
</script>

<style scoped>
.event-item {
  background-color: var(--tg-theme-bg-color, rgba(255, 255, 255, 0.04));
  border-radius: 12px;
  padding: 12px;
  display: flex;
  align-items: center;
  border: 1px solid rgba(255, 255, 255, 0.05);
  will-change: transform;
  transition: opacity 0.2s ease;
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

.status-confirmed {
  background-color: rgba(76, 175, 80, 0.15);
  color: #62d866;
}

.status-pending {
  background-color: rgba(255, 152, 0, 0.15);
  color: #ffac33;
}

.event-icon {
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  background-image: linear-gradient(45deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.01));
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.event-icon svg {
  width: 20px;
  height: 20px;
}

.event-info {
  flex: 1;
  min-width: 0; /* Для правильного сокращения текста */
}

.event-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2px;
}

.event-title {
  font-weight: 600;
  color: var(--tg-theme-text-color, #ffffff);
  font-size: 15px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 170px;
}

.event-status {
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 500;
  border-radius: 4px;
  white-space: nowrap;
  min-width: 75px;
  text-align: center;
}

.event-details {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: var(--tg-theme-hint-color, #9e9e9e);
  flex-wrap: wrap;
  gap: 4px;
}

.event-time-separator {
  font-size: 10px;
  opacity: 0.7;
  margin: 0 2px;
}

.event-time {
  font-weight: 600;
  font-size: 13px;
}

.event-staff-info {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;
}

.event-breed {
  color: var(--tg-theme-hint-color, #9e9e9e);
  font-size: 12px;
  margin-top: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cancel-event-button {
  background: transparent;
  border: none;
  color: var(--tg-theme-hint-color, #9e9e9e);
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
  margin-left: 4px;
  transition: opacity 0.2s ease;
}

.cancel-event-button:hover {
  opacity: 1;
}
</style> 