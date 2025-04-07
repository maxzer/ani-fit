<template>
  <Transition name="popup">
    <div v-if="isVisible" class="popup-overlay" @click.self="closePopup">
      <div class="popup-content" @click.stop>
        <div class="popup-header">
          <h2>{{ title }}</h2>
          <button class="close-button" @click="closePopup">×</button>
        </div>
        <div class="popup-body">
          <img v-if="image" :src="image" class="popup-image" />
          <p>{{ description }}</p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
  isVisible: {
    type: Boolean,
    required: true
  },
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
  }
});

const emit = defineEmits(['close']);

const closePopup = () => {
  console.log('Popup close event emitted');
  emit('close');
};

window.addEventListener('beforeunload', (e) => {
  e.preventDefault();
  e.returnValue = '';
  return '';
});
</script>

<style scoped>
.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  backdrop-filter: blur(8px);
}

.popup-content {
  background-color: var(--tg-theme-bg-color, #ffffff);
  border-radius: 20px;
  padding: 24px;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  z-index: 10000;
  box-shadow: 0 15px 50px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.15);
  border: 2px solid rgba(255, 255, 255, 0.2);
  animation: popup-glow 2s ease-in-out infinite alternate;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.popup-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--tg-theme-text-color, #333333);
}

.close-button {
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  padding: 0;
  color: var(--tg-theme-hint-color, #666666);
  transition: color 0.2s ease;
}

.close-button:hover {
  color: var(--tg-theme-text-color, #333333);
}

.popup-image {
  width: 100%;
  max-height: 300px;
  object-fit: cover;
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.popup-body {
  color: var(--tg-theme-text-color, #333333);
  line-height: 1.6;
  font-size: 16px;
}

.popup-enter-active,
.popup-leave-active {
  transition: opacity 0.3s ease;
}

.popup-enter-from,
.popup-leave-to {
  opacity: 0;
}

.popup-enter-active .popup-content,
.popup-leave-active .popup-content {
  transition: all 0.3s ease;
}

.popup-enter-from .popup-content,
.popup-leave-to .popup-content {
  transform: scale(0.95) translateY(20px);
  opacity: 0;
}

.popup-enter-to .popup-content {
  transform: scale(1) translateY(0);
  opacity: 1;
}

@keyframes popup-glow {
  from {
    box-shadow: 0 15px 50px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.15);
  }
  to {
    box-shadow: 0 15px 50px rgba(0, 0, 0, 0.35), 0 0 15px 2px rgba(255, 255, 255, 0.25);
  }
}
</style> 