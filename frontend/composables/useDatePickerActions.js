import { useEventUtils } from './useEventUtils';
import { useAuthToken } from './useAuthToken';

/**
 * Composable для обработки действий в компоненте DatePicker
 * @param {Object} props - Свойства компонента
 * @param {Object} emit - Функция для эмиссии событий
 * @param {Object} state - Состояние компонента
 * @returns {Object} Объект с методами
 */
export const useDatePickerActions = (props, emit, state) => {
  const { getAuthToken, refreshAuthToken } = useAuthToken();
  const { prepareEventData, executeRequest, handleEventResponse, checkEventStatus } = useEventUtils(props, state);

  // Функция установки начальной даты и времени
  const initDefaultDate = () => {
    const today = new Date();
    
    if (isNaN(today.getTime())) {
      state.selectedDate.value = new Date();
    } else {
      state.selectedDate.value = today;
    }
    
    state.calendarMode.value = 'datetime';
    
    const currentHour = today.getHours();
    state.selectedHour.value = currentHour < 10 ? 10 : currentHour > 22 ? 22 : currentHour;
    state.selectedMinute.value = today.getMinutes() < 30 ? 0 : 30;
    
    // Убедимся, что выбранная дата/время не в прошлом
    updateDateWithTime();
    
    // Если после установки времени дата оказалась в прошлом, 
    // сдвинем время на 30 минут вперед и обновим
    if (state.selectedDate.value && state.selectedDate.value < new Date()) {
      // Добавляем 30 минут к текущему времени
      state.selectedMinute.value = (state.selectedMinute.value + 30) % 60;
      // Если перешли через час, увеличиваем час
      if (state.selectedMinute.value === 0) {
        state.selectedHour.value = (state.selectedHour.value + 1) % 24;
        // Если новый час за пределами рабочего времени, устанавливаем 10:00 следующего дня
        if (state.selectedHour.value < 10 || state.selectedHour.value > 22) {
          state.selectedHour.value = 10;
          const tomorrow = new Date(state.selectedDate.value);
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(10, 0, 0, 0);
          state.selectedDate.value = tomorrow;
        }
      }
      updateDateWithTime();
    }
  };

  // Функция определения темы
  const initTheme = () => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const colorScheme = window.Telegram.WebApp.colorScheme;
      state.isDarkTheme.value = colorScheme === 'dark';
    } else {
      state.isDarkTheme.value = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
  };

  // Функция выбора временного слота
  const selectTimeSlot = (timeSlot) => {
    state.selectedTimeSlot.value = timeSlot;
    const [hours, minutes] = timeSlot.split(':');
    state.selectedHour.value = parseInt(hours);
    state.selectedMinute.value = parseInt(minutes);
    updateDateWithTime();
  };

  // Обновление даты с выбранным временем
  const updateDateWithTime = () => {
    if (!state.selectedDate.value) return;
    
    try {
      const date = new Date(state.selectedDate.value);
      if (isNaN(date.getTime())) return;
      
      date.setHours(state.selectedHour.value);
      date.setMinutes(state.selectedMinute.value);
      date.setSeconds(0);
      
      // Проверяем, что новая дата не в прошлом
      const now = new Date();
      if (date < now) {
        // Если дата в прошлом, устанавливаем текущее время + 30 минут
        const futureDate = new Date();
        futureDate.setMinutes(futureDate.getMinutes() + 30);
        
        // Округляем до ближайших 30 минут
        const minutes = futureDate.getMinutes();
        futureDate.setMinutes(minutes - (minutes % 30));
        
        // Если время попадает на после 22:00, перенос на следующий день 10:00
        if (futureDate.getHours() >= 22) {
          futureDate.setDate(futureDate.getDate() + 1);
          futureDate.setHours(10, 0, 0, 0);
        }
        
        // Если время попадает на до 10:00, устанавливаем на 10:00
        if (futureDate.getHours() < 10) {
          futureDate.setHours(10, 0, 0, 0);
        }
        
        state.selectedHour.value = futureDate.getHours();
        state.selectedMinute.value = futureDate.getMinutes();
        
        // Если другой день, обновляем дату
        if (futureDate.getDate() !== date.getDate() || 
            futureDate.getMonth() !== date.getMonth() || 
            futureDate.getFullYear() !== date.getFullYear()) {
          state.selectedDate.value = new Date(
            futureDate.getFullYear(),
            futureDate.getMonth(),
            futureDate.getDate()
          );
        }
        
        // Рекурсивно вызываем функцию снова с новыми значениями
        updateDateWithTime();
        return;
      }
      
      state.selectedDate.value = date;
      
      // Проверяем и устанавливаем selectedTimeSlot для текущего времени
      const timeString = `${state.selectedHour.value}:${state.selectedMinute.value.toString().padStart(2, '0')}`;
      const matchingSlot = state.timeSlots.find(slot => slot.value === timeString);
      if (matchingSlot) {
        state.selectedTimeSlot.value = matchingSlot.value;
      }
    } catch (error) {
      // Ошибка при обновлении даты
    }
  };

  // Обработчик выбора даты
  const dateSelected = (date) => {
    try {
      // Если дата была сброшена, возвращаем режим к выбору только даты
      if (!date) {
        state.calendarMode.value = 'date';
        state.selectedTimeSlot.value = null;
        return;
      }
      
      // Проверяем, что дата валидна
      const checkDate = new Date(date);
      if (isNaN(checkDate.getTime())) {
        return;
      }
      
      // Проверяем, что выбранная дата не в прошлом
      // Если дата в прошлом, устанавливаем сегодняшнюю дату
      const now = new Date();
      if (checkDate < now) {
        const today = new Date();
        today.setHours(now.getHours(), now.getMinutes(), 0, 0);
        
        // Если текущее время после 22:00, устанавливаем на 10:00 следующего дня
        if (today.getHours() >= 22) {
          today.setDate(today.getDate() + 1);
          today.setHours(10, 0, 0, 0);
        }
        
        state.selectedDate.value = today;
        updateDateWithTime();
        return;
      }
      
      emit('dateSelected', date);
    } catch (error) {
      // Ошибка в обработчике
    }
  };

  // Обработка ошибок авторизации
  const handleAuthError = async (response, eventData, requestOptions, tokenRefreshAttempts, maxRefreshAttempts) => {
    while (tokenRefreshAttempts < maxRefreshAttempts) {
      tokenRefreshAttempts++;
      
      // Пробуем обновить токен
      const newToken = await refreshAuthToken();
      
      if (!newToken) {
        break;
      }
      
      // Пробуем отправить запрос с новым токеном
      const result = await retryWithNewToken(newToken, eventData, tokenRefreshAttempts);
      
      // Если получили результат не 401, значит успех
      if (result && (!result.status || result.status !== 401)) {
        return result;
      }
      
      // Сохраняем текущий ответ для возврата в случае неудачи
      if (result) {
        response = result;
      }
    }
    
    return response;
  };

  // Повторение запроса с новым токеном
  const retryWithNewToken = async (newToken, eventData, attempt) => {
    try {
      // Прямой запрос с новым токеном
      const { useRuntimeConfig } = require('#app');
      const config = useRuntimeConfig();
      const baseUrl = config.public.apiBaseUrl || 'https://maxzer.ru';
      const url = `${baseUrl}/api/calendar/add-event`;
      
      // Новые заголовки с токеном
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${newToken}`,
        'X-Retry-Attempt': `${attempt}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      };
      
      // Отправка запроса
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(eventData),
        credentials: 'include',
        mode: 'cors',
        cache: 'no-store'
      });
      
      if (response.ok) {
        return await response.json();
      }
      
      // Если ошибка 401, возвращаем объект с ошибкой
      if (response.status === 401) {
        const errorText = await response.text();
        return { status: 401, error: errorText || 'Unauthorized' };
      }
      
      // Другие ошибки
      const errorText = await response.text();
      return { 
        status: response.status, 
        error: errorText || `HTTP error ${response.status}` 
      };
    } catch (error) {
      // Запасной вариант через fetchApi
      try {
        const options = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${newToken}`,
            'X-Retry-Attempt': `${attempt}`
          },
          body: JSON.stringify(eventData)
        };
        
        return await executeRequest(options);
      } catch (apiError) {
        return { status: 500, error: apiError.message };
      }
    }
  };

  // Функция подтверждения выбранной даты и создания события
  const confirmDate = async () => {
    if (state.isSubmitted.value || state.isLoading.value) {
      return;
    }

    try {
      state.isLoading.value = true;
      
      // Проверка наличия информации о сотруднике
      if (!props.staffInfo || !props.staffInfo.id) {
        throw new Error('Необходимо выбрать специалиста для записи');
      }
      
      // Подготовка данных события
      const eventData = prepareEventData();
      
      // Получение текущего токена авторизации
      const authToken = getAuthToken();
      
      // Формирование параметров запроса
      const requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify(eventData)
      };
      
      // Ограничение на количество попыток обновления токена
      let tokenRefreshAttempts = 0;
      const maxRefreshAttempts = 2;
      
      // Выполнение первичного запроса
      let response;
      try {
        response = await executeRequest(requestOptions);
      } catch (initialError) {
        response = { status: 500, error: initialError.message };
      }
      
      // Обработка ошибки авторизации и повторные попытки
      if (response.status === 401) {
        response = await handleAuthError(response, eventData, requestOptions, tokenRefreshAttempts, maxRefreshAttempts);
      }
      
      // Проверка финального результата
      if (response.status === 401) {
        throw new Error('Не удалось авторизоваться после всех попыток обновления токена');
      }
      
      // Обработка успешного или неуспешного создания события
      handleEventResponse(response, eventData.startDateTime, emit);
      
      // Если событие создано успешно, запускаем проверку статуса через некоторое время
      if (response.success && response.eventId) {
        // Устанавливаем таймер на проверку статуса
        setTimeout(() => {
          checkAndUpdateEventStatus(response.eventId);
        }, 5000); // Проверяем через 5 секунд, затем будем проверять периодически
      }
    } catch (error) {
      // Обработка ошибок
      emit('confirmed', { 
        date: new Date(state.selectedDate.value).toISOString(),
        title: props.serviceName,
        color: props.color,
        staffInfo: props.staffInfo,
        petBreed: state.breedValue.value
      }, null, error.message || 'Ошибка при подтверждении даты');
    } finally {
      state.isLoading.value = false;
    }
  };

  // Функция для проверки и обновления статуса события
  const checkAndUpdateEventStatus = async (eventId) => {
    try {
      const events = await checkEventStatus([eventId]);
      
      if (events && events.length > 0) {
        const event = events[0];
        
        // Обновляем статус события в интерфейсе
        if (event.status) {
          state.eventStatus.value = event.status;
          
          // Если статус всё ещё "в обработке", продолжаем проверять через интервалы
          if (event.status === 'pending') {
            setTimeout(() => {
              checkAndUpdateEventStatus(eventId);
            }, 30000); // Проверяем каждые 30 секунд
          }
        }
      }
    } catch (error) {
      console.error('Ошибка при проверке статуса события:', error);
    }
  };

  // Обработчик выбора и подтверждения даты
  const confirmSelectedDate = () => {
    if (props.disabled) {
      // Если компонент отключен, блокируем подтверждение даты
      emit('debug-log', {
        level: 'warn',
        message: 'Attempt to confirm date while component is disabled',
        context: 'DatePicker'
      });
      return;
    }
    
    if (!state.selectedTimeSlot.value) {
      emit('debug-log', {
        level: 'warn',
        message: 'User attempted to confirm without selecting a time slot',
        context: 'DatePicker'
      });
      return;
    }

    confirmDate();
  };

  return {
    initDefaultDate,
    initTheme,
    selectTimeSlot,
    updateDateWithTime,
    dateSelected,
    confirmDate,
    confirmSelectedDate,
    checkAndUpdateEventStatus
  };
}; 