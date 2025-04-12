<template>
  <div class="loading-indicator">
    <div class="spinner" :style="{ borderTopColor: color }"></div>
    <p>Добавление в календарь...</p>
  </div>
</template>

<script setup lang="ts">
defineProps({
  color: {
    type: String,
    required: true
  }
});
</script>

<style scoped>
.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 20px 0;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-top-color: var(--tg-theme-button-color, #2481cc);
  border-radius: 50%;
  animation: spinner 1s linear infinite;
}

.loading-indicator p {
  margin-top: 12px;
  color: var(--tg-theme-hint-color, #999999);
}

@keyframes spinner {
  to {
    transform: rotate(360deg);
  }
}
</style> 