<template>
  <div class="main-page">
    <div v-if="initData?.user" class="user-info">
      <div class="section-title">Добро пожаловать, {{ initData.user.first_name }}!</div>
    </div>
    <div v-else class="section-title">Пользователь</div>
    
    <!-- Карточки сервисов -->
    <div class="card-grid">
      <CardItem
        v-for="card in cards"
        :key="card.id"
        :title="card.title"
        :description="card.description"
        :image="card.image"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue';
import CardItem from '../components/CardItem.vue';

// Получаем доступ к WebApp и теме из провайдера
const isTelegramWebAppAvailable = inject('isTelegramWebAppAvailable', false);
const telegramTheme = inject('telegramTheme', { colorScheme: 'dark' });
const isLoading = inject('isLoading', false);
const initData = inject('initData', null);
const showDebugInfo = inject('showDebugInfo', ref(false));

// Данные карточек
const cards = ref([
  {
    id: 1,
    title: 'Тренировки',
    description: 'Индивидуальные программы тренировок',
    color: '#4caf50',
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 2,
    title: 'Питание',
    description: 'Персональный план питания',
    color: '#2196f3',
    image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 3,
    title: 'Прогресс',
    description: 'Отслеживание результатов',
    color: '#ff9800',
    image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 4,
    title: 'Поддержка',
    description: 'Консультации тренера',
    color: '#9c27b0',
    image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80'
  }
]);

// Инициализация приложения
onMounted(() => {
  console.log('Инициализация главной страницы...');
});
</script>

<style scoped>
.main-page {
  padding: 0 16px 16px;
  max-width: 600px;
  margin: 0 auto;
}

.user-info {
  margin-bottom: 16px;
}

.section-title {
  font-size: 18px;
  color: var(--tg-theme-hint-color, #9e9e9e);
  margin: 16px 0;
  text-align: center;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.card-item {
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  overflow: hidden;
  background-color: var(--card-bg-color, #ffffff);
  box-shadow: var(--card-shadow, 0 2px 8px rgba(0, 0, 0, 0.1));
  height: 100%;
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;
}

.card-item:hover, .card-item:active {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.card-image {
  height: 120px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.card-icon {
  display: flex;
  justify-content: center;
  align-items: center;
}

.card-content {
  padding: 12px;
  text-align: center;
}

.card-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--card-text-color, #333333);
}

.card-description {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--tg-theme-hint-color, #666666);
}

.app-footer {
  text-align: center;
  margin-top: 24px;
  color: var(--tg-theme-hint-color, #9e9e9e);
  font-size: 14px;
}
</style>


