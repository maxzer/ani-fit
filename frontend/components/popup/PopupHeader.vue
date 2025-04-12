<template>
  <div class="popup-header" :style="{ borderBottomColor: color + '30' }">
    <div class="header-left">
      <h2>{{ title }}</h2>
      <button 
        v-if="activeView === 'booking'" 
        class="price-list-button" 
        @click="$emit('show-price-list')"
        :class="{ 'pulse-button': !isPriceListViewed }"
        :style="{ color: color }"
      >
        Прайс-лист
      </button>
    </div>
    <button class="close-button" @click="$emit('close')">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps({
  title: {
    type: String,
    required: true
  },
  color: {
    type: String,
    required: true
  },
  activeView: {
    type: String,
    required: true,
    validator: (value: string) => ['booking', 'pricelist'].includes(value)
  },
  isPriceListViewed: {
    type: Boolean,
    default: false
  }
});

defineEmits<{
  close: [];
  'show-price-list': [];
}>();
</script>

<style scoped>
.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.popup-header h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--tg-theme-text-color, #333333);
}

.price-list-button {
  background: transparent;
  border: none;
  font-size: 14px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 16px;
  cursor: pointer;
  color: var(--tg-theme-link-color, #2481cc);
  background-color: rgba(36, 129, 204, 0.1);
  transition: background-color 0.2s ease;
}

.price-list-button:active {
  background-color: rgba(36, 129, 204, 0.2);
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

.pulse-button {
  animation: pulse-outline 2s infinite;
}

@keyframes pulse-outline {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 152, 0, 0.7);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(255, 152, 0, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 152, 0, 0);
  }
}

@media (max-width: 480px) {
  .popup-header h2 {
    font-size: 20px;
  }
}
</style> 