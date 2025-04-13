<template>
  <div class="selected-date-wrapper">
    <div class="selected-date" :style="{ backgroundColor: color + '15' }">
      <span class="date-label">Выбранная дата:</span>
      <span class="date-value">{{ formattedDate }}</span>
    </div>
    
    <button 
      class="confirm-button" 
      @click="$emit('confirm')" 
      :disabled="isLoading || !isStaffSelected"
      :class="{ 'loading': isLoading, 'disabled': !isStaffSelected, 'warning': !isStaffSelected }"
      :style="{ 
        backgroundColor: isLoading ? 'var(--tg-theme-secondary-bg-color, #f0f0f0)' : 
          !isStaffSelected ? '#ff9800' : color,
        opacity: !isStaffSelected ? '1' : '1',
        boxShadow: !isStaffSelected ? '0 4px 12px rgba(255, 152, 0, 0.4)' : '0 4px 8px rgba(0, 0, 0, 0.15)'
      }"
    >
      <span v-if="!isLoading">
        <svg v-if="!isStaffSelected" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        {{ !isStaffSelected ? 'Выберите специалиста' : 'Подтвердить' }}
      </span>
      <span v-else class="button-spinner">Обработка...</span>
    </button>
  </div>
</template>

<script setup>
// Определяем props
const props = defineProps({
  formattedDate: {
    type: String,
    required: true
  },
  color: {
    type: String,
    default: '#4caf50'
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  isStaffSelected: {
    type: Boolean,
    default: false
  }
});

// Определяем события
defineEmits(['confirm']);
</script>

<style scoped>
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
  color: white;
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

.confirm-button:disabled {
  opacity: 1;
  cursor: not-allowed;
}

.confirm-button.warning {
  animation: pulseButton 2s infinite;
}

.confirm-button.loading {
  background-color: var(--tg-theme-secondary-bg-color, #f0f0f0);
  color: var(--tg-theme-hint-color, #999999);
}

.button-spinner {
  display: inline-flex;
  align-items: center;
}

.button-spinner::after {
  content: "";
  width: 16px;
  height: 16px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  margin-left: 8px;
  animation: spinner 0.8s linear infinite;
}

@keyframes spinner {
  to {
    transform: rotate(360deg);
  }
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