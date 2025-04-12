<template>
  <div class="price-list-container">
    <h3 class="price-list-title">Прайс-лист: {{ title }}</h3>
    
    <div class="price-items">
      <div class="price-item" v-for="(item, index) in priceItems" :key="index">
        <div class="price-item-info">
          <div class="price-item-name">{{ item.name }}</div>
          <div class="price-item-description">{{ item.description }}</div>
        </div>
        <div class="price-item-value" :style="{ color }">{{ item.price }} ₽</div>
      </div>
    </div>
    
    <div class="price-list-note">
      <p>* Цены указаны за одно занятие. Возможны скидки при покупке абонемента.</p>
    </div>
    
    <button 
      class="book-now-button" 
      @click="$emit('show-booking')"
      :style="{ backgroundColor: color }"
    >
      Записаться
    </button>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';

type PriceItem = {
  name: string;
  description: string;
  price: number;
};

defineProps({
  title: {
    type: String,
    required: true
  },
  color: {
    type: String,
    required: true
  },
  priceItems: {
    type: Array as () => PriceItem[],
    required: true
  }
});

defineEmits<{
  'show-booking': [];
}>();
</script>

<style scoped>
.price-list-container {
  width: 100%;
  margin-top: 10px;
  animation: fadeIn 0.3s ease;
}

.price-list-title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 16px;
  color: var(--tg-theme-text-color, #333333);
  text-align: center;
}

.price-items {
  width: 100%;
  margin-bottom: 20px;
  background-color: var(--tg-theme-bg-color, #ffffff);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.price-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  transition: background-color 0.2s ease;
}

.price-item:last-child {
  border-bottom: none;
}

.price-item:active {
  background-color: rgba(0, 0, 0, 0.02);
}

.price-item-info {
  flex: 1;
}

.price-item-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--tg-theme-text-color, #333333);
  margin-bottom: 4px;
}

.price-item-description {
  font-size: 13px;
  color: var(--tg-theme-hint-color, #999999);
}

.price-item-value {
  font-size: 16px;
  font-weight: 700;
  padding: 6px 10px;
  background-color: rgba(36, 129, 204, 0.1);
  border-radius: 8px;
  min-width: 80px;
  text-align: center;
}

.price-list-note {
  font-size: 13px;
  color: var(--tg-theme-hint-color, #999999);
  margin: 12px 0 20px;
  background-color: rgba(0, 0, 0, 0.03);
  padding: 10px;
  border-radius: 8px;
  border-left: 3px solid var(--tg-theme-hint-color, #999999);
}

.book-now-button {
  background-color: var(--tg-theme-button-color, #2481cc);
  color: white;
  border: none;
  padding: 14px 20px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 100%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.book-now-button:active {
  transform: translateY(2px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
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