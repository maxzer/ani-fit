<template>
  <div class="card-wrapper">
    <div class="card-item" @click="showPopup">
      <div class="card-image" :style="{ backgroundImage: `url(${image})` }">
        <div v-if="!imageExists" class="card-placeholder" :style="{ backgroundColor: color + '30' }">{{ title.charAt(0) }}</div>
      </div>
      <div class="card-content">
        <h3 class="card-title">{{ title }}</h3>
        <p class="card-description">{{ description }}</p>
      </div>
    </div>
    <Teleport to="body">
      <CardPopup
        :is-visible="isPopupVisible"
        :title="title"
        :show-date-picker="true"
        :color="color"
        :is-price-list-viewed="isPriceListViewed"
        @close="closePopup"
        @dateConfirmed="handleDateConfirmed"
        @debug-log="handleDebugLog"
        @price-list-viewed="markPriceListAsViewed"
      />
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue';
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

const emit = defineEmits(['dateSelected', 'debug-log', 'priceListViewed']);
const imageExists = ref(false);
const isPopupVisible = ref(false);
const selectedDate = ref(null);
const isPriceListViewed = ref(false);

// Получаем данные пользователя из глобального состояния
const user = inject('user', null);

// Проверка существования изображения и загрузка статуса просмотра прайс-листа
onMounted(async () => {
  if (props.image) {
    const img = new Image();
    img.onload = () => {
      imageExists.value = true;
    };
    img.src = props.image;
  }
  
  // Загружаем статус просмотра прайс-листа, если пользователь авторизован
  if (user.value && user.value.id) {
    await loadPriceListViewStatus();
  }
});

// Загрузка статуса просмотра прайс-листа
const loadPriceListViewStatus = async () => {
  try {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/api/price-lists/viewed?userId=${user.value.id}`;
    
    // Получаем токен авторизации
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.error('Нет токена авторизации для загрузки статуса просмотра прайс-листа');
      return;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Ошибка загрузки статуса просмотра прайс-листа: ${response.status}`);
    }
    
    const data = await response.json();
    if (data.success && Array.isArray(data.viewedPriceLists)) {
      // Ищем запись для текущей услуги
      const serviceStatus = data.viewedPriceLists.find(item => item.serviceTitle === props.title);
      isPriceListViewed.value = serviceStatus ? serviceStatus.isViewed : false;
    }
  } catch (error) {
    console.error('Ошибка при загрузке статуса просмотра прайс-листа:', error);
  }
};

// Отметка прайс-листа как просмотренного
const markPriceListAsViewed = async () => {
  try {
    if (!user.value || !user.value.id) {
      console.error('Пользователь не авторизован');
      return;
    }
    
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/api/price-lists/mark-viewed`;
    
    // Получаем токен авторизации
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.error('Нет токена авторизации для отметки просмотра прайс-листа');
      return;
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        userId: user.value.id,
        serviceTitle: props.title
      })
    });
    
    if (!response.ok) {
      throw new Error(`Ошибка отметки просмотра прайс-листа: ${response.status}`);
    }
    
    const data = await response.json();
    if (data.success) {
      isPriceListViewed.value = true;
      emit('priceListViewed', props.title);
    }
  } catch (error) {
    console.error('Ошибка при отметке просмотра прайс-листа:', error);
  }
};

// Обработчик подтверждения даты
const handleDateConfirmed = (event) => {
  // Проверяем, просмотрен ли прайс-лист
  if (!isPriceListViewed.value) {
    console.warn('Попытка записи без просмотра прайс-листа. Запись отклонена.');
    return;
  }
  
  closePopup();
  selectedDate.value = event.date;
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
  height: 150px;
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
  background: linear-gradient(45deg, rgba(0, 0, 0, 0.3), transparent);
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
  font-size: 48px;
  font-weight: bold;
  color: #9e9e9e;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.1) 100%);
}

.card-content {
  padding: 20px;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--tg-theme-bg-color, #ffffff);
  position: relative;
  z-index: 2;
}

.card-title {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--tg-theme-text-color, #333333);
  position: relative;
  display: inline-block;
}

.card-title::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: -3px;
  width: 40px;
  height: 3px;
  border-radius: 1.5px;
  background-color: currentColor;
  opacity: 0.5;
}

.card-description {
  margin: 0;
  font-size: 14px;
  color: var(--tg-theme-hint-color, #666666);
  line-height: 1.5;
  font-weight: 500;
}

.card-date-wrapper {
  margin-top: auto;
  padding-top: 12px;
}

.card-date {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background-color: rgba(36, 129, 204, 0.1);
  border-radius: 8px;
  font-size: 14px;
  color: var(--tg-theme-link-color, #2481cc);
  width: fit-content;
}

.card-date svg {
  flex-shrink: 0;
  color: currentColor;
}

@media (max-width: 600px) {
  .card-image {
    height: 130px;
  }
  
  .card-content {
    padding: 15px;
  }
  
  .card-title {
    font-size: 16px;
  }
  
  .card-description {
    font-size: 13px;
  }
}
</style> 