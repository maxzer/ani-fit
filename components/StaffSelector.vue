<template>
  <div class="staff-selector" ref="selectorRef">
    <div class="select-wrapper">
      <div 
        class="select-header" 
        @click="toggleDropdown"
        :class="{ 'active': isOpen }"
      >
        <div class="selected-staff" v-if="selectedStaff">
          <div class="staff-avatar" :style="{ backgroundColor: selectedStaff.color + '20' }">
            <span v-if="!selectedStaff.avatar">{{ selectedStaff.name.charAt(0) }}</span>
            <img v-else :src="selectedStaff.avatar" alt="аватар" />
          </div>
          <div class="staff-info">
            <div class="staff-name">{{ selectedStaff.name }}</div>
            <div class="staff-position">{{ selectedStaff.position }}</div>
          </div>
        </div>
        <div class="placeholder" v-else>
          <span>Выберите специалиста</span>
          <span class="required-indicator">*</span>
        </div>
        <div class="select-arrow" :class="{ 'open': isOpen }">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>
      
      <div class="select-dropdown" v-if="isOpen">
        <!-- Опция "Любой сотрудник" -->
        <div 
          class="staff-item any-staff"
          :class="{ 'active': selectedStaffId === 'any' }"
          @click="selectStaff({ id: 'any', name: 'Любой специалист', position: 'Автоматическое назначение', color: '#9e9e9e' })"
        >
          <div class="staff-avatar" style="background-color: #9e9e9e20">
            <span>?</span>
          </div>
          <div class="staff-info">
            <div class="staff-name">Любой специалист</div>
            <div class="staff-position">Автоматическое назначение</div>
          </div>
        </div>
        
        <!-- Список сотрудников -->
        <div 
          v-for="staff in staffList" 
          :key="staff.id" 
          class="staff-item"
          :class="{ 'active': selectedStaffId === staff.id }"
          @click="selectStaff(staff)"
        >
          <div class="staff-avatar" :style="{ backgroundColor: staff.color + '20' }">
            <span v-if="!staff.avatar">{{ staff.name.charAt(0) }}</span>
            <img v-else :src="staff.avatar" alt="аватар" />
          </div>
          <div class="staff-info">
            <div class="staff-name">{{ staff.name }}</div>
            <div class="staff-position">{{ staff.position }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  color: {
    type: String,
    default: '#4caf50'
  },
  preselectedStaffId: {
    type: [Number, String],
    default: null
  }
});

const emit = defineEmits(['staffSelected']);

const staffList = ref([
  {
    id: 1,
    name: 'Иванов Иван',
    position: 'Тренер',
    avatar: '',
    color: '#4caf50'
  },
  {
    id: 2,
    name: 'Петрова Мария',
    position: 'Инструктор',
    avatar: '',
    color: '#2196f3'
  },
  {
    id: 3,
    name: 'Сидоров Алексей',
    position: 'Фитнес-тренер',
    avatar: '',
    color: '#ff9800'
  }
]);

const isOpen = ref(false);
const selectedStaffId = ref(null);
const selectedStaff = ref(null);

// Ссылка на DOM-элемент селектора
const selectorRef = ref(null);

const selectStaff = (staff) => {
  selectedStaffId.value = staff.id;
  selectedStaff.value = staff;
  emit('staffSelected', staff);
  isOpen.value = false;
};

// Переключение выпадающего списка
const toggleDropdown = () => {
  isOpen.value = !isOpen.value;
};

// Закрываем дропдаун при клике вне компонента
const handleClickOutside = (event) => {
  // Проверяем, существует ли ссылка на селектор и открыт ли дропдаун
  if (selectorRef.value && isOpen.value) {
    // Проверяем, что клик был не внутри селектора
    if (!selectorRef.value.contains(event.target)) {
      isOpen.value = false;
    }
  }
};

onMounted(() => {
  // Добавляем обработчик события клика на всем документе
  document.addEventListener('click', handleClickOutside, true);
  
  if (props.preselectedStaffId !== null) {
    const staff = staffList.value.find(s => s.id === props.preselectedStaffId);
    if (staff) {
      selectStaff(staff);
    }
  }
});

onUnmounted(() => {
  // Удаляем обработчик события при размонтировании компонента
  document.removeEventListener('click', handleClickOutside, true);
});
</script>

<style scoped>
.staff-selector {
  width: 100%;
  margin-bottom: 0; /* Убираем нижний margin */
  position: relative;
}

.select-wrapper {
  position: relative;
  width: 100%;
}

.select-header {
  background-color: var(--tg-theme-bg-color, #ffffff);
  border: 2px solid var(--tg-theme-secondary-bg-color, #f0f0f0);
  border-radius: 12px;
  padding: 10px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.3s ease;
  height: 56px; /* Фиксированная высота */
  box-sizing: border-box;
}

.select-header.active {
  border-color: v-bind('props.color');
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

.placeholder {
  color: var(--tg-theme-hint-color, #999999);
  display: flex;
  align-items: center;
  gap: 4px;
  height: 100%;
  flex: 1;
}

.select-arrow {
  color: var(--tg-theme-hint-color, #999999);
  transition: transform 0.3s ease;
}

.select-arrow.open {
  transform: rotate(180deg);
}

.selected-staff {
  display: flex;
  align-items: center;
  flex: 1;
  height: 100%;
  overflow: hidden;
}

.select-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: var(--tg-theme-bg-color, #ffffff);
  border: 2px solid v-bind('props.color');
  border-top: none;
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000; /* Увеличиваем z-index, чтобы выпадающий список был над остальными элементами */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.staff-item {
  display: flex;
  align-items: center;
  padding: 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  height: 60px; /* Фиксированная высота для элементов списка */
  box-sizing: border-box;
}

.staff-item:hover {
  background-color: var(--tg-theme-secondary-bg-color, #f5f5f5);
}

.staff-item.active {
  background-color: v-bind('props.color + "15"');
}

.staff-avatar {
  width: 36px;
  height: 36px;
  min-width: 36px; /* Гарантирует, что аватар не сжимается */
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: bold;
  color: var(--tg-theme-text-color, #333333);
  margin-right: 12px;
  flex-shrink: 0;
}

.staff-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.staff-info {
  flex: 1;
  min-width: 0;
}

.staff-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--tg-theme-text-color, #333333);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.staff-position {
  font-size: 12px;
  color: var(--tg-theme-hint-color, #999999);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.required-indicator {
  color: #f44336;
  font-size: 16px;
}

.divider {
  height: 1px;
  background-color: var(--tg-theme-secondary-bg-color, #f0f0f0);
  margin: 4px 0;
}

.any-staff {
  border-bottom: 1px solid var(--tg-theme-secondary-bg-color, #f0f0f0);
}

/* Стилизация скроллбара */
.select-dropdown::-webkit-scrollbar {
  width: 6px;
}

.select-dropdown::-webkit-scrollbar-track {
  background: var(--tg-theme-secondary-bg-color, #f0f0f0);
}

.select-dropdown::-webkit-scrollbar-thumb {
  background-color: var(--tg-theme-hint-color, #cccccc);
  border-radius: 20px;
}

/* Анимация переходов */
.selected-staff, .placeholder {
  transition: opacity 0.2s ease;
}

/* Анимации */
.select-dropdown {
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style> 