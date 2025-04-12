<template>
  <Transition name="popup">
    <div v-if="isVisible" class="popup-overlay" @click.self="closePopup">
      <div class="popup-content" @click.stop>
        <PopupHeader 
          :title="title" 
          :color="color" 
          :activeView="activeView" 
          :isPriceListViewed="isPriceListViewed"
          @close="closePopup"
          @show-price-list="showPriceList"
        />

        <div class="popup-body">
          <!-- Содержимое для режима бронирования -->
          <BookingView 
            v-if="activeView === 'booking'"
            :color="color"
            :showDatePicker="showDatePicker"
            :isPriceListViewed="isPriceListViewed"
            :title="title"
            :userEmail="userEmail"
            :staffInfo="staffInfo"
            :petBreed="petBreed"
            @staffSelected="handleStaffSelected"
            @dateSelected="handleDateSelected"
            @dateConfirmed="handleDateConfirmed"
            @debug-log="handleDebugLog"
            @update:petBreed="petBreed = $event"
          />
          
          <!-- Содержимое для режима прайс-листа -->
          <PriceListView 
            v-else
            :title="title"
            :color="color"
            :priceItems="priceItems"
            @show-booking="showBooking"
          />
          
          <!-- Индикатор загрузки -->
          <LoadingIndicator v-if="isLoading" :color="color" />
          
          <!-- Уведомление -->
          <Notification 
            v-if="notification.show" 
            :message="notification.message" 
            :type="notification.type"
            @close="notification.show = false"
          />
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch, computed, defineProps, defineEmits } from 'vue';
import DatePicker from './DatePicker.vue';
import StaffSelector from './StaffSelector.vue';
import PopupHeader from './popup/PopupHeader.vue';
import BookingView from './popup/BookingView.vue';
import PriceListView from './popup/PriceListView.vue';
import LoadingIndicator from './popup/LoadingIndicator.vue';
import Notification from './popup/Notification.vue';

// Типы данных
type StaffInfo = {
  id: string;
  name: string;
  [key: string]: any;
};

type DateObject = {
  date: Date;
  [key: string]: any;
};

type NotificationType = 'success' | 'error';

type NotificationState = {
  show: boolean;
  message: string;
  type: NotificationType;
};

type PriceItem = {
  name: string;
  description: string;
  price: number;
};

type PriceListData = {
  [key: string]: PriceItem[];
};

type ActiveView = 'booking' | 'pricelist';

const props = defineProps({
  isVisible: {
    type: Boolean,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  showDatePicker: {
    type: Boolean,
    default: true
  },
  color: {
    type: String,
    default: '#4caf50' // Зеленый по умолчанию
  },
  userEmail: {
    type: String,
    default: ''
  },
  isPriceListViewed: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits<{
  close: [];
  dateConfirmed: [data: DateObject & { staffInfo: StaffInfo; petBreed: string }];
  'debug-log': [logData: any];
  'price-list-viewed': [];
}>();

// Реактивные состояния
const selectedDate = ref<Date | null>(null);
const isLoading = ref<boolean>(false);
const staffInfo = ref<StaffInfo | null>(null);
const petBreed = ref<string>('');
const activeView = ref<ActiveView>('booking');
const notification = ref<NotificationState>({
  show: false,
  message: '',
  type: 'success'
});

// Вычисляемые свойства
const isBookingDisabled = computed(() => {
  return !props.isPriceListViewed && activeView.value === 'booking';
});

const priceItems = computed(() => {
  return getPriceList();
});

// Методы
const showNotification = (message: string, type: NotificationType = 'success') => {
  notification.value = { show: true, message, type };
  setTimeout(() => { notification.value.show = false; }, 5000);
};

const handleStaffSelected = (staff: StaffInfo) => {
  staffInfo.value = staff;
};

const handleDateSelected = (date: Date) => {
  selectedDate.value = date;
};

const handleDateConfirmed = (dateObj: DateObject, eventLink: string | null = null, errorMessage: string | null = null) => {
  if (errorMessage) {
    showNotification(`Не удалось добавить событие в календарь: ${errorMessage}`, 'error');
    return;
  }
  
  if (!dateObj || !dateObj.date) {
    console.error('Invalid date object received:', dateObj);
    return;
  }
  
  if (!staffInfo.value || !staffInfo.value.id) {
    showNotification('Пожалуйста, выберите специалиста перед подтверждением', 'error');
    return;
  }
  
  if (!props.isPriceListViewed) {
    showNotification('Пожалуйста, просмотрите прайс-лист перед записью', 'error');
    return;
  }
  
  showNotification('Тренировка успешно запланирована!');
  
  emit('dateConfirmed', {
    ...dateObj,
    staffInfo: staffInfo.value,
    petBreed: petBreed.value
  });
  
  setTimeout(() => { closePopup(); }, 1000);
};

const handleDebugLog = (logData: any) => {
  if (typeof emit === 'function') {
    emit('debug-log', logData);
  }
};

const formatDate = (date: Date | null): string => {
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

const closePopup = () => {
  selectedDate.value = null;
  staffInfo.value = null;
  petBreed.value = '';
  activeView.value = 'booking';
  emit('close');
};

const showPriceList = () => {
  activeView.value = 'pricelist';
};

const showBooking = () => {
  if (activeView.value === 'pricelist') {
    emit('price-list-viewed');
  }
  activeView.value = 'booking';
};

const getPriceList = (): PriceItem[] => {
  const priceListData: PriceListData = {
    'Массаж': [
      { name: 'Массаж 30 минут', description: 'Короткий сеанс для быстрого тонуса', price: 800 },
      { name: 'Массаж 60 минут', description: 'Стандартный сеанс массажа', price: 1500 },
      { name: 'Комплексный массаж', description: 'Полный курс массажа', price: 2200 }
    ],
    'Занятие в бассейне': [
      { name: 'Групповое занятие', description: 'Тренировка до 3 собак', price: 700 },
      { name: 'Индивидуальное занятие', description: 'Персональная тренировка', price: 1300 },
      { name: 'Курс 5 занятий', description: 'Комплексная программа', price: 5500 }
    ],
    'Аренда бассейна': [
      { name: 'Аренда 30 минут', description: 'Без тренера', price: 1000 },
      { name: 'Аренда 60 минут', description: 'Без тренера', price: 1800 },
      { name: 'Аренда с тренером', description: '60 минут с личным тренером', price: 2500 }
    ],
    'Занятие с хендлером': [
      { name: 'Первичная консультация', description: 'Знакомство с хендлером', price: 1000 },
      { name: 'Тренировка 45 минут', description: 'Обучение основам', price: 1500 },
      { name: 'Комплексная подготовка', description: 'Подготовка к выставке', price: 3000 }
    ]
  };

  return priceListData[props.title] || [];
};

// Отслеживание изменений
watch(() => props.isVisible, (newValue) => {
  if (newValue === true) {
    if (!staffInfo.value) {
      selectedDate.value = null;
      petBreed.value = '';
    }
  }
});

// Обработчик выхода со страницы
const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  e.preventDefault();
  e.returnValue = '';
  return '';
};

// Добавляем и удаляем обработчик выхода при монтировании/размонтировании
window.addEventListener('beforeunload', handleBeforeUnload);
</script>

<style scoped>
.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  backdrop-filter: blur(10px);
}

.popup-content {
  background-color: var(--tg-theme-bg-color, #ffffff);
  border-radius: 24px;
  padding: 20px;
  max-width: 420px;
  width: 95%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  z-index: 10000;
  box-shadow: 0 15px 50px rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.popup-body {
  color: var(--tg-theme-text-color, #333333);
  line-height: 1.3;
  font-size: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding-top: 5px;
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

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 480px) {
  .popup-content {
    width: 95%;
    padding: 20px;
    max-height: 85vh;
  }
}
</style> 