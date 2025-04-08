<template>
  <Transition name="popup">
    <div v-if="isVisible" class="popup-overlay" @click.self="closePopup">
      <div class="popup-content" @click.stop>
        <div class="popup-header" :style="{ borderBottomColor: color + '30' }">
          <h2>{{ title }}</h2>
          <button class="close-button" @click="closePopup">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="popup-body">
          <!-- Строка с выбором специалиста и вводом породы -->
          <div class="input-row">
            <div class="input-col">
              <StaffSelector 
                v-if="showDatePicker"
                :color="color"
                @staffSelected="handleStaffSelected"
                class="staff-selector-wrapper"
              />
            </div>
            
            <div class="input-col">
              <div class="input-group breed-input-wrapper">
                <input
                  type="text"
                  v-model="petBreed"
                  placeholder="Введите породу"
                  class="breed-input"
                  :style="{ borderColor: color + '40' }"
                />
              </div>
            </div>
          </div>
          
          <!-- Компонент календаря -->
          <DatePicker 
            v-if="showDatePicker" 
            @dateSelected="handleDateSelected" 
            @confirmed="handleDateConfirmed" 
            @debug-log="handleDebugLog"
            class="full-width-calendar"
            :color="color"
            :serviceName="title"
            :organizerName="staffInfo ? staffInfo.name : 'AniFit'"
            :serviceDuration="60"
            :organizerLocation="'AniFit Студия'"
            :userEmail="userEmail"
            :staffInfo="staffInfo"
            :petBreed="petBreed"
          />
          
          <!-- Индикатор загрузки -->
          <div v-if="isLoading" class="loading-indicator">
            <div class="spinner" :style="{ borderTopColor: color }"></div>
            <p>Добавление в календарь...</p>
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
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch } from 'vue';
import DatePicker from './DatePicker.vue';
import StaffSelector from './StaffSelector.vue';

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
  },
  color: {
    type: String,
    default: '#4caf50' // Зеленый по умолчанию
  },
  userEmail: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['close', 'dateConfirmed', 'debug-log']);

// Состояние для отслеживания выбранной даты
const selectedDate = ref(null);
const isLoading = ref(false);

// Состояние для выбранного сотрудника
const staffInfo = ref(null);

// Состояние для породы животного
const petBreed = ref('');

// Состояние для уведомлений
const notification = ref({
  show: false,
  message: '',
  type: 'success'
});

// Показать уведомление
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

// Обработчик выбора сотрудника
const handleStaffSelected = (staff) => {
  staffInfo.value = staff;
};

// Обработчик выбора даты
const handleDateSelected = (date) => {
  selectedDate.value = date;
};

// Обработчик подтверждения даты
const handleDateConfirmed = (dateObj, eventLink = null, errorMessage = null) => {
  if (errorMessage) {
    // Если есть сообщение об ошибке - показываем уведомление об ошибке
    showNotification(`Не удалось добавить событие в календарь: ${errorMessage}`, 'error');
    return;
  }
  
  if (!dateObj || !dateObj.date) {
    console.error('Invalid date object received:', dateObj);
    return;
  }
  
  // Проверка, выбран ли сотрудник (усиленная проверка)
  if (!staffInfo.value || !staffInfo.value.id) {
    showNotification('Пожалуйста, выберите специалиста перед подтверждением', 'error');
    return;
  }
  
  // Показываем уведомление об успехе
  showNotification('Тренировка успешно запланирована!');
  
  // Сообщаем родительскому компоненту о подтверждении даты
  emit('dateConfirmed', {
    ...dateObj,
    staffInfo: staffInfo.value,
    petBreed: petBreed.value
  });
  
  // Закрываем поп-ап через некоторое время после успешной записи
  setTimeout(() => {
    closePopup();
  }, 1000);
};

// Функция для обработки отладочных логов
const handleDebugLog = (logData) => {
  // Проверяем, есть ли родитель для передачи логов выше
  if (typeof emit === 'function') {
    emit('debug-log', logData);
  }
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
  // Сбрасываем все состояния при закрытии попапа
  selectedDate.value = null;
  staffInfo.value = null; // Сбрасываем информацию о специалисте
  petBreed.value = ''; // Сбрасываем информацию о породе
  emit('close');
};

window.addEventListener('beforeunload', (e) => {
  e.preventDefault();
  e.returnValue = '';
  return '';
});

// Отслеживаем открытие попапа
watch(() => props.isVisible, (newValue) => {
  if (newValue === true) {
    // Если попап открывается, проверяем выбор специалиста
    if (!staffInfo.value) {
      // Если специалист не выбран, обнуляем остальные данные
      selectedDate.value = null;
      petBreed.value = '';
    }
  }
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
  line-height: 1.3;
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
}

/* Стили для индикатора загрузки */
.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 20px 0;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-top-color: var(--tg-theme-button-color, #2481cc);
  border-radius: 50%;
  animation: spinner 1s linear infinite;
}

.loading-indicator p {
  margin-top: 12px;
  color: var(--tg-theme-hint-color, #999999);
}

@keyframes spinner {
  to {
    transform: rotate(360deg);
  }
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

.input-row {
  display: flex;
  width: 100%;
  gap: 10px;
}

.input-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.staff-selector-wrapper, 
.breed-input-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.breed-input-wrapper {
  margin-bottom: 0;
  height: 56px;  /* Фиксированная высота как у селектора */
}

.breed-input {
  width: 100%;
  padding: 12px 16px;
  border-radius: 12px;
  border: 2px solid var(--tg-theme-secondary-bg-color, #f0f0f0);
  background-color: var(--tg-theme-bg-color, #ffffff);
  color: var(--tg-theme-text-color, #333333);
  font-size: 15px;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
  outline: none;
  box-sizing: border-box;
  height: 56px; /* Такая же высота как у селектора */
}

.breed-input:focus {
  border-color: v-bind('color');
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.1);
}

.breed-input::placeholder {
  color: var(--tg-theme-hint-color, #999999);
}
</style> 