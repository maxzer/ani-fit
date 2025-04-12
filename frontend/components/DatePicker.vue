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
      :min-date="new Date()"
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
      :status="eventStatus"
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
import { useDatePickerState } from '@/composables/useDatePickerState';
import { useDatePickerActions } from '@/composables/useDatePickerActions';
import { useAuthToken } from '@/composables/useAuthToken';

// Определение props
const props = defineProps({
  color: { type: String, default: '#4caf50' },
  serviceName: { type: String, default: 'Тренировка' },
  organizerName: { type: String, default: 'AniFit' },
  serviceDuration: { type: Number, default: 60 },
  organizerLocation: { type: String, default: 'AniFit' },
  userEmail: { type: String, default: '' },
  userName: { type: String, default: 'Клиент' },
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

// Используем композаблы для логики
const { 
  selectedDate, 
  calendarMode,
  isDarkTheme,
  isLoading,
  isSubmitted,
  requestId, 
  breedValue,
  selectedHour,
  selectedMinute,
  selectedTimeSlot,
  timeSlots,
  masks,
  attributes,
  formattedDate,
  showConfirmButton,
  eventStatus
} = useDatePickerState(props);

const {
  initDefaultDate,
  initTheme,
  updateDateWithTime,
  dateSelected,
  confirmDate,
  confirmSelectedDate
} = useDatePickerActions(props, emit, {
  selectedDate,
  calendarMode,
  isDarkTheme,
  isLoading,
  isSubmitted,
  requestId,
  breedValue,
  selectedHour,
  selectedMinute,
  selectedTimeSlot
});

// Инициализация компонента
onMounted(() => {
  // Инициализация токена
  useAuthToken().initAuthToken();
  // Установка начальной даты
  initDefaultDate();
  // Установка темы
  initTheme();
});

// Функция для форматирования времени отображения
const formatDisplayTime = (timeString) => {
  if (!timeString) return '';
  return timeString;
};

// Следим за изменением props.petBreed
watch(() => props.petBreed, (newValue) => {
  breedValue.value = newValue;
});

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