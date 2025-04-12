import { fetchApi } from '../utils/api';
import { useRuntimeConfig } from '#app';

/**
 * Composable для работы с событиями
 * @param {Object} props - Свойства компонента
 * @param {Object} state - Состояние компонента
 * @returns {Object} Объект с методами для работы с событиями
 */
export const useEventUtils = (props, state) => {
  // Подготовка данных события для API
  const prepareEventData = () => {
    const isAnyStaff = props.staffInfo?.id === 'any';
    const breedInfo = state.breedValue.value ? `\nПорода: ${state.breedValue.value}` : '';
    
    // Создаем новую дату с выбранным временем
    const date = new Date(state.selectedDate.value);
    date.setHours(state.selectedHour.value);
    date.setMinutes(state.selectedMinute.value);
    date.setSeconds(0);
    date.setMilliseconds(0);
    
    // Вычисляем дату и время окончания события
    const endDateTime = new Date(date);
    endDateTime.setMinutes(endDateTime.getMinutes() + props.serviceDuration);
    
    // Форматируем даты в ISO формат
    const startDateTimeISO = date.toISOString();
    const endDateTimeISO = endDateTime.toISOString();
    
    // Используем имя клиента из props, если оно передано
    let clientName = props.userName || 'Клиент';
    
    // Если имя клиента не передано в props, пробуем получить из localStorage
    if (clientName === 'Клиент' && typeof window !== 'undefined') {
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          if (user.realName) {
            clientName = user.realName;
          } else if (user.name) {
            clientName = user.name;
          } else if (user.firstName || user.lastName) {
            clientName = [user.firstName, user.lastName].filter(Boolean).join(' ');
          }
        }
      } catch (e) {
        // Ошибка при получении имени клиента
      }
    }
    
    // Собираем данные о событии
    const summary = state.breedValue.value 
      ? `${clientName} - ${props.serviceName} - ${state.breedValue.value}`
      : `${clientName} - ${props.serviceName}`;
      
    const description = isAnyStaff
      ? `Запись на ${props.serviceName}\nСпециалист будет назначен автоматически${breedInfo}`
      : `Запись на ${props.serviceName}\nСпециалист: ${props.staffInfo.name}, ${props.staffInfo.position}${breedInfo}`;
    
    return {
      summary,
      description,
      startDateTime: startDateTimeISO,
      endDateTime: endDateTimeISO,
      location: props.organizerLocation,
      attendees: [props.userEmail].filter(Boolean),
      requestId: state.requestId.value,
      color: props.color,
      staffInfo: isAnyStaff
        ? { id: 'any', autoAssign: true }
        : {
            id: props.staffInfo.id,
            name: props.staffInfo.name,
            position: props.staffInfo.position
          },
      petBreed: state.breedValue.value
    };
  };

  // Выполнение запроса с возможными ретраями
  const executeRequest = async (options) => {
    try {
      // Обновляем токен в заголовках, если он доступен
      if (typeof window !== 'undefined' && window.authToken) {
        options.headers = {
          ...options.headers,
          'Authorization': `Bearer ${window.authToken}`
        };
      }
      
      // Пробуем прямой fetch
      try {
        const config = useRuntimeConfig();
        const baseUrl = config.public.apiBaseUrl || 'https://maxzer.ru';
        const url = `${baseUrl}/api/calendar/add-event`;
        
        const directResponse = await fetch(url, {
          method: options.method,
          headers: {
            ...options.headers,
            'X-Direct-Request': 'true'
          },
          body: options.body,
          credentials: 'include'
        });
        
        // Если статус не 401, возвращаем результат
        if (directResponse.status !== 401) {
          return await directResponse.json();
        }
      } catch (directError) {
        // Игнорируем ошибку и переходим к запасному варианту
      }
      
      // Запасной вариант через fetchApi
      return await fetchApi('/api/calendar/add-event', options);
    } catch (error) {
      // Проверяем, является ли ошибка 401 Unauthorized
      if (error.message.includes('401')) {
        return { status: 401, error: error.message };
      }
      throw error;
    }
  };

  // Обработка ответа API о создании события
  const handleEventResponse = (response, startDateTimeISO, emit) => {
    if (response.success) {
      state.isSubmitted.value = true;
      
      // Формируем данные для создания события в базе данных
      const eventData = {
        title: props.serviceName,
        date: startDateTimeISO,
        endDate: new Date(new Date(startDateTimeISO).getTime() + props.serviceDuration * 60000).toISOString(),
        color: props.color,
        googleEventId: response.eventId || null,
        staffInfo: props.staffInfo,
        petBreed: state.breedValue.value,
        status: 'confirmed',
        userId: getUserId()
      };
      
      // Вызываем функцию для сохранения события в базе данных
      saveEventToDatabase(eventData);
      
      // Эмитим событие для родительского компонента
      emit('confirmed', { 
        date: startDateTimeISO,
        title: props.serviceName,
        color: props.color,
        staffInfo: props.staffInfo,
        petBreed: state.breedValue.value
      });
    } else {
      emit('confirmed', { 
        date: startDateTimeISO,
        title: props.serviceName,
        color: props.color,
        staffInfo: props.staffInfo,
        petBreed: state.breedValue.value
      }, null, response.error || 'Ошибка при создании события');
    }
  };

  // Функция для получения ID пользователя
  const getUserId = () => {
    // Пытаемся получить пользователя из глобального состояния
    if (typeof window !== 'undefined') {
      // Пробуем получить из пользователя из localStorage
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          return user.id;
        } catch (error) {
          console.error('Error parsing user from localStorage:', error);
        }
      }
    }
    return null;
  };

  // Сохранение события в базу данных
  const saveEventToDatabase = async (eventData) => {
    try {
      const config = useRuntimeConfig();
      const baseUrl = config.public.apiBaseUrl || 'https://maxzer.ru';
      const url = `${baseUrl}/api/events`;
      
      // Получаем токен авторизации
      let authToken = '';
      if (typeof window !== 'undefined' && window.authToken) {
        authToken = window.authToken;
      }
      
      // Выполняем запрос к API
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify(eventData),
        credentials: 'include'
      });
      
      if (!response.ok) {
        console.error('Error saving event to database:', await response.text());
        return;
      }
      
      const result = await response.json();
      console.log('Event saved to database:', result);
    } catch (error) {
      console.error('Exception saving event to database:', error);
    }
  };

  return {
    prepareEventData,
    executeRequest,
    handleEventResponse,
    getUserId,
    saveEventToDatabase
  };
}; 