<template>
  <div class="profile-form">
    <h2 class="form-title">Введите ваши данные</h2>
    <p class="form-description">Для продолжения необходимо указать ваши имя и фамилию.</p>
    
    <form @submit.prevent="submitForm" class="form-container">
      <div class="form-group" :class="{ 'has-error': errors.firstName }">
        <label for="firstName">Имя</label>
        <input 
          type="text" 
          id="firstName" 
          v-model="firstName" 
          class="form-input"
          :class="{ 'input-error': errors.firstName }"
          @input="validateFirstName"
          placeholder="Введите имя"
        />
        <div v-if="errors.firstName" class="error-message">{{ errors.firstName }}</div>
      </div>
      
      <div class="form-group" :class="{ 'has-error': errors.lastName }">
        <label for="lastName">Фамилия</label>
        <input 
          type="text" 
          id="lastName" 
          v-model="lastName" 
          class="form-input"
          :class="{ 'input-error': errors.lastName }"
          @input="validateLastName"
          placeholder="Введите фамилию"
        />
        <div v-if="errors.lastName" class="error-message">{{ errors.lastName }}</div>
      </div>
      
      <div v-if="errorMessage" class="general-error">
        {{ errorMessage }}
      </div>
      
      <button 
        type="submit" 
        class="submit-button"
        :disabled="isSubmitting || !isFormValid"
      >
        <span v-if="isSubmitting">
          <svg class="spinner" viewBox="0 0 50 50">
            <circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle>
          </svg>
          Сохранение...
        </span>
        <span v-else>Сохранить</span>
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, inject } from 'vue';
import axios from 'axios';
import { useRuntimeConfig } from '#app';

// Получение конфигурации и URL API
const config = useRuntimeConfig();
const apiUrl = config.public.apiUrl || 'https://maxzer.ru';

// Доступ к временному токену и функции установки авторизации
const authToken = inject('authToken', ref(''));
const setAuth = inject('setAuth');
const isTestMode = inject('isTestMode', false);

// Состояние формы
const firstName = ref('');
const lastName = ref('');
const isSubmitting = ref(false);
const errorMessage = ref('');

// Ошибки валидации
const errors = ref({
  firstName: '',
  lastName: ''
});

// Валидация имени
const validateFirstName = () => {
  errors.value.firstName = '';
  
  if (!firstName.value.trim()) {
    errors.value.firstName = 'Имя обязательно для заполнения';
    return false;
  }
  
  if (firstName.value.length < 2) {
    errors.value.firstName = 'Имя должно содержать минимум 2 символа';
    return false;
  }
  
  // Проверка на допустимые символы (буквы и дефис)
  const nameRegex = /^[А-ЯЁа-яёA-Za-z\-]+$/;
  if (!nameRegex.test(firstName.value)) {
    errors.value.firstName = 'Имя может содержать только буквы и дефис';
    return false;
  }
  
  return true;
};

// Валидация фамилии
const validateLastName = () => {
  errors.value.lastName = '';
  
  if (!lastName.value.trim()) {
    errors.value.lastName = 'Фамилия обязательна для заполнения';
    return false;
  }
  
  if (lastName.value.length < 2) {
    errors.value.lastName = 'Фамилия должна содержать минимум 2 символа';
    return false;
  }
  
  // Проверка на допустимые символы (буквы и дефис)
  const nameRegex = /^[А-ЯЁа-яёA-Za-z\-]+$/;
  if (!nameRegex.test(lastName.value)) {
    errors.value.lastName = 'Фамилия может содержать только буквы и дефис';
    return false;
  }
  
  return true;
};

// Вычисляемое свойство для проверки валидности формы
const isFormValid = computed(() => {
  return firstName.value.trim() && lastName.value.trim() &&
    !errors.value.firstName && !errors.value.lastName;
});

// Отправка формы
const submitForm = async () => {
  // Проверяем валидацию перед отправкой
  if (!validateFirstName() || !validateLastName()) {
    return;
  }
  
  isSubmitting.value = true;
  errorMessage.value = '';
  
  try {
    if (isTestMode.value) {
      // В тестовом режиме имитируем успешный ответ сервера
      console.log('Сохранение профиля в тестовом режиме');
      
      // Имитируем задержку ответа сервера
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Создаем тестового пользователя
      const testUser = {
        id: 12345,
        telegramId: '12345678',
        firstName: firstName.value,
        lastName: lastName.value,
        username: 'test_user'
      };
      
      // Устанавливаем авторизацию
      setAuth('test_auth_token', testUser);
      return;
    }
    
    // Отправляем данные на сервер (только если не в тестовом режиме)
    const response = await axios.post(`${apiUrl}/api/profile`, {
      token: authToken.value,
      firstName: firstName.value,
      lastName: lastName.value
    });
    
    // Если успешно, сохраняем токен и данные пользователя
    if (response.data.success) {
      setAuth(response.data.token, response.data.user);
    } else {
      errorMessage.value = response.data.error || 'Ошибка при сохранении профиля';
    }
  } catch (error) {
    console.error('Ошибка при сохранении профиля:', error);
    errorMessage.value = error.response?.data?.error || 'Не удалось сохранить профиль. Попробуйте позже.';
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
.profile-form {
  padding: 20px;
  max-width: 500px;
  margin: 0 auto;
  background-color: var(--tg-theme-bg-color, #ffffff);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.form-title {
  font-size: 20px;
  color: var(--tg-theme-text-color, #333333);
  margin-bottom: 10px;
  text-align: center;
}

.form-description {
  font-size: 14px;
  color: var(--tg-theme-hint-color, #999999);
  margin-bottom: 20px;
  text-align: center;
}

.form-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-size: 14px;
  color: var(--tg-theme-hint-color, #666666);
  margin-bottom: 6px;
}

.form-input {
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background-color: var(--tg-theme-secondary-bg-color, #f5f5f5);
  color: var(--tg-theme-text-color, #333333);
  font-size: 16px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: var(--tg-theme-button-color, #3390ec);
  box-shadow: 0 0 0 2px rgba(51, 144, 236, 0.2);
}

.input-error {
  border-color: #f44336;
}

.error-message {
  color: #f44336;
  font-size: 12px;
  margin-top: 4px;
}

.general-error {
  background-color: rgba(244, 67, 54, 0.1);
  color: #f44336;
  padding: 10px;
  border-radius: 8px;
  font-size: 14px;
  text-align: center;
}

.submit-button {
  background-color: var(--tg-theme-button-color, #3390ec);
  color: var(--tg-theme-button-text-color, #ffffff);
  border: none;
  border-radius: 8px;
  padding: 12px 20px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 48px;
}

.submit-button:hover:not(:disabled) {
  background-color: var(--button-hover-color, #2982d8);
}

.submit-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
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