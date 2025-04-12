<template>
  <div class="time-picker-container">
    <div class="time-picker-header">Выберите время</div>
    
    <div class="time-slots">
      <button 
        v-for="slot in timeSlots" 
        :key="slot.value" 
        class="time-slot-btn" 
        :class="{ 'active': modelValue.timeSlot === slot.value }"
        @click="selectTimeSlot(slot.value)">
        {{ slot.label }}
      </button>
    </div>
    
    <div class="time-picker-custom">
      <div class="time-picker-inputs">
        <select v-model="hourModel" class="time-input">
          <option v-for="hour in hours" :key="hour" :value="hour">
            {{ hour.toString().padStart(2, '0') }}
          </option>
        </select>
        <span class="time-separator">:</span>
        <select v-model="minuteModel" class="time-input">
          <option v-for="minute in minutes" :key="minute" :value="minute">
            {{ minute.toString().padStart(2, '0') }}
          </option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

// Определяем props
const props = defineProps({
  timeSlots: {
    type: Array,
    default: () => []
  },
  modelValue: {
    type: Object,
    default: () => ({
      hour: 10,
      minute: 0,
      timeSlot: null
    })
  },
  hour: {
    type: Number,
    default: 10
  },
  minute: {
    type: Number,
    default: 0
  },
  timeSlot: {
    type: String,
    default: null
  }
});

// Определяем события
const emit = defineEmits(['update:hour', 'update:minute', 'update:timeSlot', 'update:time']);

// Вычисляемые свойства для двусторонней привязки
const hourModel = computed({
  get: () => props.hour,
  set: (value) => {
    emit('update:hour', value);
    emit('update:time');
  }
});

const minuteModel = computed({
  get: () => props.minute,
  set: (value) => {
    emit('update:minute', value);
    emit('update:time');
  }
});

// Доступные часы и минуты
const hours = Array.from({ length: 13 }, (_, i) => i + 10); // от 10 до 22
const minutes = [0, 30]; // только 0 и 30 минут

// Функция выбора временного слота
const selectTimeSlot = (timeSlot) => {
  emit('update:timeSlot', timeSlot);
  
  const [hours, minutes] = timeSlot.split(':');
  emit('update:hour', parseInt(hours));
  emit('update:minute', parseInt(minutes));
  emit('update:time');
};
</script>

<style scoped>
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
</style> 