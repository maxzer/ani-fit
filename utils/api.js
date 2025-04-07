// Импортируем useRuntimeConfig для доступа к конфигурации
import { useRuntimeConfig } from '#app';

// Get the base URL based on the environment
export const getBaseUrl = () => {
  // When running on the server side, use server configuration
  if (process.server) {
    return process.env.API_BASE_URL || 'https://maxzer.ru';
  }
  
  // When running on the client side
  if (typeof window !== 'undefined') {
    // In Telegram WebApp
    if (window.Telegram && window.Telegram.WebApp) {
      return window.telegramApiProxy ? window.location.origin : 'https://maxzer.ru';
    }
    
    // For normal web browsers, use the same origin
    return window.location.origin;
  }
  
  // Default fallback
  return 'https://maxzer.ru';
};

// Функция для создания полного URL API-эндпоинта
export const getApiUrl = (endpoint) => {
  const baseUrl = getBaseUrl();
  // Проверяем, начинается ли endpoint со слеша и добавляем его при необходимости
  const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${formattedEndpoint}`;
};

// Функция для выполнения API-запросов
export const fetchApi = async (endpoint, options = {}) => {
  try {
    const url = getApiUrl(endpoint);
    console.log(`Отправка запроса на: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API ошибка:', errorText);
      throw new Error(`API ошибка: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Ошибка API запроса:', error);
    throw error;
  }
}; 