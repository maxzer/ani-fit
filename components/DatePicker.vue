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
      color="gray"
      :minute-increment="30"
      :time-accuracy="'minute'"
      :is24hr="true"
      :disabled-nav-directions="['left', 'right']"
      :is-popover-visible="false"
      />
    
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
      <div class="selected-date">
        <span class="date-label">Выбранная дата:</span>
        <span class="date-value">{{ formattedDate }}</span>
      </div>
      
      <button class="confirm-button" @click="confirmDate">
        Подтвердить
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import 'v-calendar/style.css';

const selectedDate = ref(null);
const calendarMode = ref('date');
const emit = defineEmits(['dateSelected', 'confirmed']);
const isDarkTheme = ref(false);

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
  
  const date = new Date(selectedDate.value);
  date.setHours(selectedHour.value);
  date.setMinutes(selectedMinute.value);
  date.setSeconds(0);
  selectedDate.value = date;
};

// Следим за изменением часов и минут для обновления даты
watch([selectedHour, selectedMinute], () => {
  selectedTimeSlot.value = null; // Сбрасываем выбранный слот при ручном изменении
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
  // Устанавливаем текущую дату как активную
  const today = new Date();
  selectedDate.value = today;
  
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
  
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    const colorScheme = window.Telegram.WebApp.colorScheme;
    isDarkTheme.value = colorScheme === 'dark';
  } else {
    // Проверяем системную цветовую схему как запасной вариант
    isDarkTheme.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
});

const masks = {
  input: 'DD.MM.YYYY HH:mm',
  weekdays: 'WW',
  title: 'MMMM YYYY',
  time: 'HH:mm',
  data: { timeFormat: 24 }
};

const attributes = [
  {
    key: 'today',
    highlight: {
      color: 'gray',
      fillMode: 'light',
    },
    dates: new Date(),
  }
];

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
  // Если дата была сброшена, возвращаем режим к выбору только даты
  if (!date) {
    calendarMode.value = 'date';
    selectedTimeSlot.value = null;
  }
  emit('dateSelected', date);
};

// Обработчик подтверждения даты
const confirmDate = () => {
  if (selectedDate.value) {
    emit('confirmed', selectedDate.value);
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
  color: var(--tg-theme-button-text-color, #ffffff);
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

.confirm-button:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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
}

/* Скрываем последнюю неделю, если она пустая */
:deep(.vc-weeks .vc-week:last-child) {
  visibility: hidden;
  display: none;
  height: 0;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

:deep(.vc-day) {
  min-height: 42px;
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
  transition: all 0.2s ease;
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
</style> 