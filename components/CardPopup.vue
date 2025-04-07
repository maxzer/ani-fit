<template>
  <Transition name="popup">
    <div v-if="isVisible" class="popup-overlay" @click.self="closePopup">
      <div class="popup-content" @click.stop>
        <div class="popup-header">
          <h2>{{ title }}</h2>
          <button class="close-button" @click="closePopup">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="popup-body">
          <!-- Компонент календаря -->
          <DatePicker 
            v-if="showDatePicker" 
            @dateSelected="handleDateSelected" 
            @confirmed="handleDateConfirmed" 
            class="full-width-calendar"
          />
          
          <!-- Отображение выбранной даты после подтверждения -->
          <div v-if="confirmedDate" class="confirmed-date">
            <div class="confirmation-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <div class="confirmation-text">
              <p>Вы успешно запланировали <strong>{{ title }}</strong> на <strong>{{ formatDate(confirmedDate) }}</strong></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref } from 'vue';
import DatePicker from './DatePicker.vue';

const props = defineProps({
  isVisible: {
    type: Boolean,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  showDatePicker: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['close', 'dateConfirmed']);

// Состояние для отслеживания выбранной и подтвержденной даты
const selectedDate = ref(null);
const confirmedDate = ref(null);

// Обработчик выбора даты
const handleDateSelected = (date) => {
  selectedDate.value = date;
};

// Обработчик подтверждения даты
const handleDateConfirmed = (date) => {
  confirmedDate.value = date;
  emit('dateConfirmed', date);
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

const closePopup = () => {
  console.log('Popup close event emitted');
  emit('close');
};

window.addEventListener('beforeunload', (e) => {
  e.preventDefault();
  e.returnValue = '';
  return '';
});
</script>

<style scoped>
.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  backdrop-filter: blur(10px);
}

.popup-content {
  background-color: var(--tg-theme-bg-color, #ffffff);
  border-radius: 24px;
  padding: 20px;
  max-width: 420px;
  width: 95%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  z-index: 10000;
  box-shadow: 0 15px 50px rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.popup-header h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--tg-theme-text-color, #333333);
}

.close-button {
  background: transparent;
  border: none;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--tg-theme-hint-color, #999999);
  padding: 0;
  position: relative;
  transition: color 0.2s;
}

.close-button:active {
  color: var(--tg-theme-text-color, #333333);
}

.popup-body {
  color: var(--tg-theme-text-color, #333333);
  line-height: 1.6;
  font-size: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding-top: 5px;
}

.full-width-calendar {
  width: 100%;
  margin-top: 10px;
}

.confirmed-date {
  margin-top: 16px;
  padding: 16px;
  background-color: rgba(36, 129, 204, 0.08);
  border-radius: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  animation: slideUp 0.4s ease;
}

.confirmation-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: #4CAF50;
  color: white;
  flex-shrink: 0;
}

.confirmation-text {
  flex-grow: 1;
}

.confirmation-text p {
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
  color: var(--tg-theme-text-color, #333333);
}

.popup-enter-active,
.popup-leave-active {
  transition: opacity 0.3s ease;
}

.popup-enter-from,
.popup-leave-to {
  opacity: 0;
}

.popup-enter-active .popup-content,
.popup-leave-active .popup-content {
  transition: all 0.3s ease;
}

.popup-enter-from .popup-content,
.popup-leave-to .popup-content {
  transform: scale(0.95) translateY(20px);
  opacity: 0;
}

.popup-enter-to .popup-content {
  transform: scale(1) translateY(0);
  opacity: 1;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 480px) {
  .popup-content {
    width: 95%;
    padding: 20px;
    max-height: 85vh;
  }
  
  .popup-header h2 {
    font-size: 20px;
  }
  
  .confirmed-date {
    padding: 12px;
  }
  
  .confirmation-icon {
    width: 40px;
    height: 40px;
  }
  
  .confirmation-text p {
    font-size: 14px;
  }
}
</style> 