<template>
  <div class="card-wrapper">
    <div class="card-item" @click="showPopup">
      <div class="card-image" :style="{ backgroundImage: `url(${image})` }">
        <div v-if="!imageExists" class="card-placeholder">{{ title.charAt(0) }}</div>
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
        :description="description"
        :image="image"
        @close="closePopup"
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
  }
});

const imageExists = ref(false);
const isPopupVisible = ref(false);

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
</style> 