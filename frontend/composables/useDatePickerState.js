import { ref, computed, watch } from 'vue';

/**
 * Composable для хранения и управления состоянием компонента DatePicker
 * @param {Object} props - Свойства компонента
 * @returns {Object} Объект с состоянием и вычисляемыми свойствами
 */
export const useDatePickerState = (props) => {
  // Состояние компонента
  const selectedDate = ref(null);
  const calendarMode = ref('date');
  const isDarkTheme = ref(false);
  const isLoading = ref(false);
  const isSubmitted = ref(false);
  const requestId = ref(Date.now().toString());
  const breedValue = ref(props.petBreed);
  const showConfirmButton = ref(true);
  const eventStatus = ref('pending');

  // Данные для выбора времени
  const selectedHour = ref(10);
  const selectedMinute = ref(0);
  const selectedTimeSlot = ref(null);
  const hours = Array.from({ length: 13 }, (_, i) => i + 10); // от 10 до 22
  const minutes = [0, 30]; // только 0 и 30 минут

  // Популярные временные слоты
  const timeSlots = [
    { label: 'Утро 10:00', value: '10:00' },
    { label: 'Утро 11:30', value: '11:30' },
    { label: 'День 13:00', value: '13:00' },
    { label: 'День 15:30', value: '15:30' },
    { label: 'Вечер 18:00', value: '18:00' },
    { label: 'Вечер 20:30', value: '20:30' }
  ];

  // Константы для календаря
  const masks = {
    input: 'DD.MM.YYYY HH:mm',
    weekdays: 'WW',
    title: 'MMMM YYYY',
    time: 'HH:mm',
    data: { timeFormat: 24 }
  };

  // Пересчитываем атрибуты для корректного отображения текущего дня
  const attributes = computed(() => [
    {
      key: 'today',
      highlight: {
        color: 'gray',
        fillMode: 'light',
      },
      dates: new Date(),
    }
  ]);

  // Форматируем дату для отображения
  const formattedDate = computed(() => {
    if (!selectedDate.value) return '';
    const date = new Date(selectedDate.value);
    return `${date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })} ${date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })}`;
  });

  // Текст статуса события для отображения
  const statusText = computed(() => {
    switch (eventStatus.value) {
      case 'pending': return 'На подтверждении';
      case 'confirmed': return 'Подтверждено';
      case 'cancelled': return 'Отменено';
      default: return 'Неизвестно';
    }
  });

  return {
    selectedDate,
    calendarMode,
    isDarkTheme,
    isLoading,
    isSubmitted,
    requestId,
    breedValue,
    selectedHour,
    selectedMinute,
    selectedTimeSlot,
    hours,
    minutes,
    timeSlots,
    masks,
    attributes,
    formattedDate,
    showConfirmButton,
    eventStatus,
    statusText
  };
}; 