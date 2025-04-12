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
    return true;
  }
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
      return null;
    }
  },

  // Запись элемента в хранилище
  setItem: async (key, value) => {
    try {
      const webApp = getTelegramWebApp();
      
      if (!webApp) {
        return false;
      }
      
      // Проверяем наличие CloudStorage API (новая версия)
      if (webApp.CloudStorage) {
        await webApp.CloudStorage.setItem(key, String(value));
        return true;
      }
      
      // Используем WebAppDataImpl API если доступен (устаревший API)
      if (webApp.WebAppDataImpl) {
        await webApp.WebAppDataImpl.setValue(key, String(value));
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  },

  // Удаление элемента из хранилища
  removeItem: async (key) => {
    try {
      const webApp = getTelegramWebApp();
      
      if (!webApp) {
        return false;
      }
      
      // Проверяем наличие CloudStorage API (новая версия)
      if (webApp.CloudStorage) {
        await webApp.CloudStorage.removeItem(key);
        return true;
      }
      
      // Используем WebAppDataImpl API если доступен (устаревший API)
      if (webApp.WebAppDataImpl) {
        await webApp.WebAppDataImpl.removeValue(key);
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }
};

/**
 * Получить данные инициализации из WebApp
 * @returns {object|null} Данные или null если недоступны
 */
export const getInitData = async () => {
  try {
    const webApp = getTelegramWebApp();
    if (!webApp) {
      console.log('[TelegramUtils] getInitData: WebApp не доступен');
      return null;
    }
    
    // Проверка на наличие данных
    if (!webApp.initData && !webApp.initDataUnsafe) {
      console.log('[TelegramUtils] getInitData: Отсутствуют данные initData и initDataUnsafe');
      return null;
    }
    
    // Логируем данные initDataUnsafe для отладки
    console.log('[TelegramUtils] getInitData: initDataUnsafe доступен', 
      webApp.initDataUnsafe ? 'true' : 'false', 
      'Содержит auth_date:', webApp.initDataUnsafe?.auth_date ? 'true' : 'false',
      'Содержит hash:', webApp.initDataUnsafe?.hash ? 'true' : 'false',
      'Содержит user:', webApp.initDataUnsafe?.user ? 'true' : 'false'
    );
    
    // Получаем данные пользователя
    const user = getTelegramUser();
    
    if (!user) {
      console.log('[TelegramUtils] getInitData: Отсутствуют данные пользователя');
      
      // Для отладки - детальная информация о webApp.initDataUnsafe
      if (webApp.initDataUnsafe && typeof webApp.initDataUnsafe === 'object') {
        console.log('[TelegramUtils] getInitData: Доступные ключи в initDataUnsafe:', 
          Object.keys(webApp.initDataUnsafe).join(', ')
        );
      }
      
      return null;
    }
    
    // Логируем данные пользователя для отладки
    console.log('[TelegramUtils] getInitData: Данные пользователя получены:', 
      'id:', user.id,
      'username:', user.username || '(отсутствует)',
      'first_name:', user.first_name || '(отсутствует)'
    );
    
    // Формируем результат
    const result = {
      user,
      authDate: webApp.initDataUnsafe?.auth_date || null,
      hash: webApp.initDataUnsafe?.hash || null,
      startParam: webApp.initDataUnsafe?.start_param || null
    };
    
    console.log('[TelegramUtils] getInitData: Успешно получены данные initData');
    return result;
  } catch (error) {
    console.error('[TelegramUtils] getInitData: Ошибка при получении данных:', error);
    return null;
  }
}; 