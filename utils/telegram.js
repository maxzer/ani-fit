/**
 * Утилиты для работы с Telegram WebApp.
 * Включает функции для получения информации о пользователе и работы с хранилищем.
 */

/**
 * Проверка доступности Telegram WebApp
 * @returns {boolean} Доступен ли Telegram WebApp
 */
export function isTelegramWebAppAvailable() {
  return typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp;
}

/**
 * Получение объекта WebApp от Telegram
 * @returns {object|null} Объект WebApp или null, если недоступен
 */
export function getTelegramWebApp() {
  if (isTelegramWebAppAvailable()) {
    return window.Telegram.WebApp;
  }
  return null;
}

/**
 * Получение данных пользователя из WebApp
 * @returns {object|null} Данные пользователя или null
 */
export function getTelegramUser() {
  const webApp = getTelegramWebApp();
  if (webApp && webApp.initDataUnsafe && webApp.initDataUnsafe.user) {
    return webApp.initDataUnsafe.user;
  }
  return null;
}

/**
 * Получение параметров темы из WebApp
 * @returns {object} Объект с параметрами темы
 */
export function getTelegramTheme() {
  const webApp = getTelegramWebApp();
  
  // Дефолтные значения для темы
  const defaultTheme = {
    colorScheme: 'light',
    backgroundColor: '#ffffff',
    textColor: '#000000',
    hintColor: '#999999',
    linkColor: '#2678b6',
    buttonColor: '#3390ec',
    buttonTextColor: '#ffffff',
    secondaryBgColor: '#f0f0f0'
  };
  
  if (!webApp) {
    return defaultTheme;
  }
  
  // Получаем параметры темы из WebApp
  return {
    colorScheme: webApp.colorScheme || defaultTheme.colorScheme,
    backgroundColor: webApp.themeParams?.bg_color || defaultTheme.backgroundColor,
    textColor: webApp.themeParams?.text_color || defaultTheme.textColor,
    hintColor: webApp.themeParams?.hint_color || defaultTheme.hintColor,
    linkColor: webApp.themeParams?.link_color || defaultTheme.linkColor,
    buttonColor: webApp.themeParams?.button_color || defaultTheme.buttonColor,
    buttonTextColor: webApp.themeParams?.button_text_color || defaultTheme.buttonTextColor,
    secondaryBgColor: webApp.themeParams?.secondary_bg_color || defaultTheme.secondaryBgColor
  };
}

/**
 * Отправка данных в основное приложение Telegram
 * @param {object} data Данные для отправки
 */
export function sendDataToTelegram(data) {
  const webApp = getTelegramWebApp();
  if (webApp) {
    webApp.sendData(JSON.stringify(data));
    console.log('Данные отправлены в Telegram:', data);
    return true;
  }
  console.error('Не удалось отправить данные: WebApp не доступен');
  return false;
}

/**
 * Закрытие WebApp
 */
export function closeWebApp() {
  const webApp = getTelegramWebApp();
  if (webApp) {
    webApp.close();
  }
}

/**
 * Показать основную кнопку
 * @param {string} text Текст кнопки
 * @param {Function} callback Функция обратного вызова
 */
export function showMainButton(text, callback) {
  const webApp = getTelegramWebApp();
  if (webApp && webApp.MainButton) {
    webApp.MainButton.text = text;
    if (callback) {
      webApp.MainButton.onClick(callback);
    }
    webApp.MainButton.show();
    return true;
  }
  return false;
}

/**
 * Скрыть основную кнопку
 */
export function hideMainButton() {
  const webApp = getTelegramWebApp();
  if (webApp && webApp.MainButton) {
    webApp.MainButton.hide();
    return true;
  }
  return false;
}

/**
 * Показать всплывающее уведомление
 * @param {string} message Сообщение
 */
export function showNotification(message) {
  const webApp = getTelegramWebApp();
  if (webApp && webApp.showPopup) {
    webApp.showPopup({
      title: 'Уведомление',
      message,
      buttons: [{ type: 'ok' }]
    });
    return true;
  }
  return false;
}

/**
 * Проверяет полную готовность Telegram WebApp (наличие WebApp, initData и user)
 * @returns {boolean} true если WebApp полностью инициализирован и готов к работе
 */
export function isTelegramWebAppReady() {
  const webApp = getTelegramWebApp();
  if (!webApp) return false;
  
  // Проверяем наличие initData
  if (!webApp.initData) return false;
  
  // Проверяем наличие данных пользователя
  if (!webApp.initDataUnsafe || !webApp.initDataUnsafe.user) return false;
  
  return true;
}

// Объект для работы с хранилищем Telegram
export const TelegramStorage = {
  // Проверка доступности хранилища
  isAvailable: () => {
    const webApp = getTelegramWebApp();
    return !!(webApp && (webApp.CloudStorage || webApp.WebAppDataImpl));
  },

  // Получение элемента из хранилища
  getItem: async (key) => {
    try {
      const webApp = getTelegramWebApp();
      
      if (!webApp) {
        console.error('Telegram WebApp недоступен');
        return null;
      }
      
      // Проверяем наличие CloudStorage API (новая версия)
      if (webApp.CloudStorage) {
        const { value } = await webApp.CloudStorage.getItem(key);
        return value;
      }
      
      // Используем WebAppDataImpl API если доступен (устаревший API)
      if (webApp.WebAppDataImpl) {
        return await webApp.WebAppDataImpl.getValue(key);
      }
      
      // Проверяем данные инициализации
      if (webApp.initDataUnsafe && webApp.initDataUnsafe[key]) {
        return webApp.initDataUnsafe[key];
      }
      
      return null;
    } catch (error) {
      console.error('Ошибка при получении данных из хранилища Telegram:', error);
      return null;
    }
  },

  // Сохранение элемента в хранилище
  setItem: async (key, value) => {
    try {
      const webApp = getTelegramWebApp();
      
      if (!webApp) {
        console.error('Telegram WebApp недоступен');
        return false;
      }
      
      // CloudStorage API (новая версия)
      if (webApp.CloudStorage) {
        await webApp.CloudStorage.setItem(key, value);
        return true;
      }
      
      // WebAppDataImpl API (устаревший API)
      if (webApp.WebAppDataImpl) {
        await webApp.WebAppDataImpl.setValue(key, value);
        return true;
      }
      
      console.error('В Telegram WebApp нет доступных API для хранения данных');
      return false;
    } catch (error) {
      console.error('Ошибка при сохранении данных в хранилище Telegram:', error);
      return false;
    }
  },

  // Удаление элемента из хранилища
  removeItem: async (key) => {
    try {
      const webApp = getTelegramWebApp();
      
      if (!webApp) {
        console.error('Telegram WebApp недоступен');
        return false;
      }
      
      // CloudStorage API (новая версия)
      if (webApp.CloudStorage) {
        await webApp.CloudStorage.removeItem(key);
        return true;
      }
      
      // WebAppDataImpl API (устаревший API)
      if (webApp.WebAppDataImpl) {
        // В старом API нет прямого метода удаления, используем setValue с пустой строкой
        await webApp.WebAppDataImpl.setValue(key, '');
        return true;
      }
      
      console.error('В Telegram WebApp нет доступных API для удаления данных');
      return false;
    } catch (error) {
      console.error('Ошибка при удалении данных из хранилища Telegram:', error);
      return false;
    }
  }
};

export const getInitData = async () => {
  if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
    try {
      const webApp = window.Telegram.WebApp;
      
      // Ручная проверка возможных проблем
      if (webApp.isExpanded === false) {
        webApp.expand(); // Пробуем развернуть
      }
      
      // Проверяем наличие initDataUnsafe
      if (webApp.initDataUnsafe) {
        return webApp.initDataUnsafe;
      }
      
      // Проверяем наличие initData
      if (webApp.initData) {
        // Проверяем, не пустая ли строка
        if (webApp.initData.trim() === '') {
          return null;
        }
        
        // Парсим initData
        try {
          const params = new URLSearchParams(webApp.initData);
          const result = {};
          
          // Проверяем, есть ли параметры
          if (params.toString() === webApp.initData) {
            return { raw: webApp.initData };
          }
          
          // Обрабатываем параметры
          let paramCount = 0;
          for (const [key, value] of params.entries()) {
            paramCount++;
            try {
              result[key] = JSON.parse(value);
            } catch (e) {
              result[key] = value;
            }
          }
          
          if (paramCount === 0) {
            return null;
          }
          
          return result;
        } catch (parseError) {
          // Если не удалось распарсить как URLSearchParams, проверяем формат JSON
          try {
            return JSON.parse(webApp.initData);
          } catch (jsonError) {
            // Если не JSON, возвращаем как строку
            return { raw: webApp.initData };
          }
        }
      }
      
      // Проверка альтернативных источников данных
      if (webApp.CloudStorage) {
        try {
          const userData = await webApp.CloudStorage.getItem('user_data');
          if (userData?.value) {
            return JSON.parse(userData.value);
          }
        } catch (e) {
          console.error('Ошибка при получении данных из CloudStorage:', e);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Ошибка при получении initData:', error);
      return null;
    }
  }
  return null;
}; 