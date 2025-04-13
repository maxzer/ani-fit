import { useRuntimeConfig } from 'nuxt/app';

interface Event {
  id: string;
  title: string;
  date: string;
  color: string;
  status: string;
  staffInfo?: any;
  petBreed?: string;
  googleEventId?: string;
}

interface CancelEventResponse {
  success: boolean;
  event?: Event;
}

// Расширяем глобальный объект Window
declare global {
  interface Window {
    axios?: {
      defaults?: {
        headers?: {
          common?: {
            Authorization?: string;
          };
        };
      };
    };
  }
}

export const useEventApi = () => {
  const config = useRuntimeConfig();
  const baseUrl = config.public.apiBaseUrl || 'https://maxzer.ru';

  // Получение токена авторизации
  const getAuthToken = (): string | null => {
    // Сначала проверяем localStorage
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      return storedToken;
    }
    
    // Затем проверяем axios headers (если доступно)
    if (window.axios?.defaults?.headers?.common?.['Authorization']) {
      const authHeader = window.axios.defaults.headers.common['Authorization'];
      if (authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
      }
    }
    
    return null;
  };

  // Загрузка событий пользователя
  const fetchUserEvents = async (userId: string): Promise<Event[] | null> => {
    const authToken = getAuthToken();
    
    if (!authToken) {
      console.error('Отсутствует токен авторизации для загрузки событий');
      throw new Error('Требуется авторизация для загрузки данных');
    }
    
    // Формируем URL для запроса
    const url = `${baseUrl}/api/events?userId=${userId}`;
    
    // Выполняем запрос к API
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      // Обрабатываем ошибки
      if (response.status === 401) {
        console.error('Ошибка авторизации при загрузке событий');
        throw new Error('Срок действия авторизации истек. Пожалуйста, войдите заново.');
      } else {
        throw new Error(`Ошибка загрузки событий: ${response.status}`);
      }
    }
    
    const result = await response.json();
    
    if (result.success && Array.isArray(result.events)) {
      // Возвращаем преобразованный список событий
      return result.events.map((event: any) => ({
        id: event.id,
        title: event.title,
        date: event.date,
        color: event.color,
        status: event.status,
        staffInfo: event.staffInfo,
        petBreed: event.petBreed,
        googleEventId: event.googleEventId
      }));
    } else {
      console.warn('Нет данных о событиях или некорректный формат ответа:', result);
      return null;
    }
  };

  // Отмена события пользователя
  const cancelUserEvent = async (eventId: string, userId: string): Promise<CancelEventResponse | null> => {
    const token = getAuthToken();
    
    // Проверяем, есть ли токен авторизации
    if (!token) {
      console.error('Отсутствует токен авторизации');
      throw new Error('Ошибка авторизации: Токен не найден. Пожалуйста, войдите снова.');
    }
    
    // Отменяем событие
    const response = await fetch(`/api/events/${eventId}/cancel?userId=${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        status: 'cancelled',
        reason: 'cancelled_by_user'
      })
    });
    
    if (!response.ok) {
      throw new Error(`Ошибка отмены события: ${response.status}`);
    }
    
    // Обработка успешного ответа
    return await response.json();
  };

  return {
    fetchUserEvents,
    cancelUserEvent
  };
}; 