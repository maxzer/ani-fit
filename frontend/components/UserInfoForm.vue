<template>
  <div class="user-info-form">
    <h2 class="login-title">Введите ваши ФИО</h2>
    
    <div class="user-info-form__content">
      <div class="form-group">
        <label>Имя</label>
        <input 
          v-model="userInfo.firstName" 
          type="text" 
          placeholder="Введите имя"
          class="form-input"
        />
      </div>
      <div class="form-group">
        <label>Фамилия</label>
        <input 
          v-model="userInfo.lastName" 
          type="text" 
          placeholder="Введите фамилию"
          class="form-input"
        />
      </div>
      <div class="form-group">
        <label>Отчество</label>
        <input 
          v-model="userInfo.patronymic" 
          type="text" 
          placeholder="Введите отчество (при наличии)"
          class="form-input"
        />
      </div>
      
      <div class="user-info-form__actions">
        <button 
          @click="$emit('cancel')" 
          class="cancel-button"
        >
          Назад
        </button>
        <button 
          @click="submitForm" 
          class="submit-button"
          :disabled="!isFormValid || isSubmitting"
        >
          <span v-if="isSubmitting">
            <svg class="spinner" viewBox="0 0 50 50">
              <circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle>
            </svg>
            Отправка...
          </span>
          <span v-else>
            Продолжить
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  initialData: {
    type: Object,
    default: () => ({
      firstName: '',
      lastName: '',
      patronymic: ''
    })
  },
  isSubmitting: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['submit', 'cancel']);

const userInfo = ref({
  firstName: props.initialData.firstName || '',
  lastName: props.initialData.lastName || '',
  patronymic: props.initialData.patronymic || ''
});

// Валидация ввода ФИО
const isFormValid = computed(() => {
  return userInfo.value.firstName.trim() !== '' && 
         userInfo.value.lastName.trim() !== '';
});

// Функция для отправки данных
function submitForm() {
  if (!isFormValid.value) {
    return;
  }
  
  emit('submit', userInfo.value);
}
</script>

<style scoped>
.user-info-form {
  width: 100%;
}

.login-title {
  font-size: 20px;
  color: var(--tg-theme-text-color, #333333);
  margin-bottom: 20px;
  text-align: center;
}

.user-info-form__content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: var(--tg-theme-hint-color, #999999);
}

.form-input {
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--tg-theme-hint-color, #dcdcdc);
  background-color: var(--tg-theme-secondary-bg-color, #f5f5f5);
  color: var(--tg-theme-text-color, #000000);
  font-size: 16px;
  outline: none;
  transition: border-color 0.2s ease;
}

.form-input:focus {
  border-color: var(--tg-theme-button-color, #2481cc);
}

.user-info-form__actions {
  display: flex;
  justify-content: space-between;
  margin-top: 24px;
  gap: 12px;
}

.cancel-button, .submit-button {
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  flex: 1;
  transition: background-color 0.2s ease;
  border: none;
  display: flex;
  justify-content: center;
  align-items: center;
}

.cancel-button {
  background-color: var(--tg-theme-secondary-bg-color, #f5f5f5);
  color: var(--tg-theme-text-color, #000000);
}

.submit-button {
  background-color: var(--tg-theme-button-color, #2481cc);
  color: var(--tg-theme-button-text-color, #ffffff);
}

.submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cancel-button:hover {
  background-color: var(--tg-theme-bg-color, #e5e5e5);
}

.submit-button:hover:not(:disabled) {
  background-color: var(--tg-theme-button-color, #1a6aaa);
}

.spinner {
  animation: rotate 2s linear infinite;
  width: 18px;
  height: 18px;
  margin-right: 8px;
}

.path {
  stroke: var(--tg-theme-button-text-color, #ffffff);
  stroke-linecap: round;
  animation: dash 1.5s ease-in-out infinite;
}

@keyframes rotate {
  100% {
    transform: rotate(360deg);
  }
}

@keyframes dash {
  0% {
    stroke-dasharray: 1, 150;
    stroke-dashoffset: 0;
  }
  50% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -35;
  }
  100% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -124;
  }
}
</style> 