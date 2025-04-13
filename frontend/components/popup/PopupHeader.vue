<template>
  <div class="popup-header" :style="{ borderBottomColor: color + '30' }">
    <div class="header-left">
      <h2>{{ title }}</h2>
      <button 
        v-if="activeView === 'booking'" 
        class="price-list-button" 
        @click="$emit('show-price-list')"
        :class="{ 'highlight-button': !isPriceListViewed }"
        :style="{ 
          color: !isPriceListViewed ? '#ffffff' : color,
          backgroundColor: !isPriceListViewed ? color : color + '15'
        }"
      >
        <svg v-if="!isPriceListViewed" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px;">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        Прайс-лист
        <svg v-if="!isPriceListViewed" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 5px;">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
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
  border: none;
  font-size: 14px;
  font-weight: 600;
  padding: 8px 14px;
  border-radius: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.price-list-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.price-list-button:active {
  transform: translateY(0);
}

.highlight-button {
  animation: pulseHighlight 2s infinite;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

@keyframes pulseHighlight {
  0% {
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(76, 175, 80, 0);
    transform: scale(1.05);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
    transform: scale(1);
  }
}

.close-button {
  background: transparent;
  border: none;
  width: 36px;
  height: 36px;
  padding: 8px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--tg-theme-hint-color, #999999);
  transition: all 0.2s ease;
}

.close-button:hover {
  background-color: rgba(0, 0, 0, 0.05);
  color: var(--tg-theme-text-color, #333333);
}

@media (max-width: 480px) {
  .popup-header h2 {
    font-size: 20px;
  }
}
</style> 