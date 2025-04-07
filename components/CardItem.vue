<template>
  <div class="card-wrapper">
    <div class="card-item" @click="showPopup">
      <div class="card-image" :style="{ backgroundImage: `url(${image})` }">
        <div v-if="!imageExists" class="card-placeholder" :style="{ backgroundColor: color + '30' }">{{ title.charAt(0) }}</div>
      </div>
      <div class="card-content">
        <h3 class="card-title">{{ title }}</h3>
        <p class="card-description">{{ description }}</p>
        <div v-if="selectedDate" class="card-date" :style="{ backgroundColor: color + '20', color: color }">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span>{{ formatDate(selectedDate) }}</span>
        </div>
      </div>
    </div>
    <Teleport to="body">
      <CardPopup
        :is-visible="isPopupVisible"
        :title="title"
        :show-date-picker="true"
        :color="color"
        @close="closePopup"
        @dateConfirmed="handleDateConfirmed"
        @debug-log="handleDebugLog"
      />
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import CardPopup from './CardPopup.vue';

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  image: {
    type: String,
    default: ''
  },
  color: {
    type: String,
    default: '#4caf50' // Зеленый по умолчанию
  }
});

const emit = defineEmits(['dateSelected', 'debug-log']);
const imageExists = ref(false);
const isPopupVisible = ref(false);
const selectedDate = ref(null);

// Проверка существования изображения
onMounted(() => {
  if (props.image) {
    const img = new Image();
    img.onload = () => {
      imageExists.value = true;
    };
    img.src = props.image;
  }
});

// Обработчик подтверждения даты
const handleDateConfirmed = (event) => {
  closePopup();
  emit('dateSelected', {
    title: props.title,
    date: event.date,
    color: props.color
  });
};

// Функция для обработки отладочных логов
const handleDebugLog = (logData) => {
  // Передаем лог наверх
  emit('debug-log', logData);
};

// Функция для форматирования даты
const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const showPopup = () => {
  isPopupVisible.value = true;
};

const closePopup = () => {
  isPopupVisible.value = false;
};
</script>

<style scoped>
.card-wrapper {
  position: relative;
  height: 100%;
  padding: 4px;
  animation: card-pulse 3s ease-in-out infinite alternate;
}

.card-item {
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  overflow: hidden;
  background-color: var(--tg-theme-bg-color, #ffffff);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  height: 100%;
  cursor: pointer;
  border: 2px solid rgba(255, 255, 255, 0.15);
  position: relative;
}

.card-image {
  height: 180px;
  background-size: cover;
  background-position: center;
  position: relative;
  overflow: hidden;
}

.card-image::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, rgba(0, 0, 0, 0.2), transparent);
  z-index: 1;
}

.card-image::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 80px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.5), transparent);
}

.card-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  font-size: 48px;
  font-weight: bold;
  color: #9e9e9e;
}

.card-content {
  padding: 20px;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--tg-theme-bg-color, #ffffff);
}

.card-title {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--tg-theme-text-color, #333333);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.card-description {
  margin: 0;
  font-size: 14px;
  color: var(--tg-theme-hint-color, #666666);
  line-height: 1.5;
  font-weight: 500;
}

.card-date {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding: 6px 10px;
  background-color: rgba(36, 129, 204, 0.1);
  border-radius: 6px;
  font-size: 13px;
  color: var(--tg-theme-link-color, #2481cc);
}

.card-date svg {
  color: var(--tg-theme-link-color, #2481cc);
}
</style> 