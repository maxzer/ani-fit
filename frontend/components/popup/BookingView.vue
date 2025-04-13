<template>
  <div class="booking-view">
    <!-- Предупреждение если прайс-лист не просмотрен -->
    <div v-if="!isPriceListViewed" class="price-list-warning" :style="{ borderColor: color + '50' }">
      <div class="warning-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <div class="warning-text">
        <div class="warning-title">Необходим просмотр прайс-листа</div>
        <div class="warning-description">Нажмите на кнопку «Прайс-лист» вверху, чтобы продолжить запись</div>
      </div>
    </div>
    
    <!-- Строка с выбором специалиста и вводом породы -->
    <div class="input-row">
      <div class="input-col">
        <StaffSelector 
          v-if="showDatePicker"
          :color="color"
          @staffSelected="$emit('staffSelected', $event)"
          class="staff-selector-wrapper"
        />
      </div>
      
      <div class="input-col">
        <div class="input-group breed-input-wrapper">
          <input
            type="text"
            :value="petBreed"
            @input="$emit('update:petBreed', $event.target.value)"
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
      @dateSelected="$emit('dateSelected', $event)" 
      @confirmed="$emit('dateConfirmed', $event)" 
      @debug-log="$emit('debug-log', $event)"
      class="full-width-calendar"
      :color="color"
      :serviceName="title"
      :organizerName="staffInfo ? staffInfo.name : 'AniFit'"
      :serviceDuration="60"
      :organizerLocation="'AniFit Студия'"
      :userEmail="userEmail"
      :staffInfo="staffInfo"
      :petBreed="petBreed"
      :disabled="!isPriceListViewed"
    />
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';
import DatePicker from '../DatePicker.vue';
import StaffSelector from '../StaffSelector.vue';

type StaffInfo = {
  id: string;
  name: string;
  [key: string]: any;
};

defineProps({
  color: {
    type: String,
    required: true
  },
  showDatePicker: {
    type: Boolean,
    required: true
  },
  isPriceListViewed: {
    type: Boolean,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  staffInfo: {
    type: Object as () => StaffInfo | null,
    default: null
  },
  petBreed: {
    type: String,
    required: true
  }
});

defineEmits<{
  staffSelected: [staff: StaffInfo];
  dateSelected: [date: Date];
  dateConfirmed: [dateObj: any, eventLink?: string | null, errorMessage?: string | null];
  'debug-log': [logData: any];
  'update:petBreed': [value: string];
}>();
</script>

<style scoped>
.booking-view {
  width: 100%;
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

.price-list-warning {
  margin-bottom: 20px;
  padding: 16px;
  border-radius: 12px;
  background-color: rgba(255, 152, 0, 0.15);
  border: 2px solid;
  display: flex;
  align-items: center;
  gap: 15px;
  color: var(--tg-theme-text-color, #333);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  animation: pulse 2s infinite;
}

.warning-icon {
  flex-shrink: 0;
  color: #ff9800;
  display: flex;
  align-items: center;
  justify-content: center;
}

.warning-text {
  flex: 1;
}

.warning-title {
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 4px;
  color: #ff9800;
}

.warning-description {
  font-size: 14px;
  line-height: 1.4;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 152, 0, 0.4);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(255, 152, 0, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 152, 0, 0);
  }
}

.full-width-calendar {
  width: 100%;
  margin-top: 10px;
}
</style> 