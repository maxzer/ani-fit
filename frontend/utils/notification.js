/**
 * Utility для работы с уведомлениями
 */

const notificationQueue = [];
let isProcessingQueue = false;

/**
 * Показать уведомление
 * @param {string} message - Текст уведомления
 * @param {string} type - Тип уведомления (success, error, warning, info)
 * @param {number} duration - Длительность показа в миллисекундах
 * @param {boolean} useNative - Использовать нативные уведомления если доступны
 */
export const showNotification = (message, type = 'info', duration = 5000, useNative = true) => {
  if (!message) return;
  
  // Добавляем уведомление в очередь
  notificationQueue.push({ message, type, duration });
  
  // Если очередь не обрабатывается, начинаем обрабатывать
  if (!isProcessingQueue) {
    processNotificationQueue();
  }
  
  // Экспортируем функцию в глобальное пространство для доступа из других модулей
  if (typeof window !== 'undefined') {
    window.showNotification = showNotification;
  }
};

/**
 * Обработка очереди уведомлений
 */
function processNotificationQueue() {
  if (notificationQueue.length === 0) {
    isProcessingQueue = false;
    return;
  }
  
  isProcessingQueue = true;
  const notification = notificationQueue.shift();
  
  // Создаем или находим DOM элемент для уведомления
  let notificationElement = document.querySelector('.global-notification');
  let isNewElement = false;
  
  if (!notificationElement) {
    notificationElement = document.createElement('div');
    notificationElement.className = 'global-notification';
    document.body.appendChild(notificationElement);
    isNewElement = true;
  }
  
  // Устанавливаем содержимое и класс в зависимости от типа
  notificationElement.textContent = notification.message;
  notificationElement.className = `global-notification notification-${notification.type}`;
  
  // Показываем уведомление с анимацией
  setTimeout(() => {
    notificationElement.classList.add('notification-visible');
  }, isNewElement ? 50 : 0);
  
  // Скрываем уведомление через указанное время
  setTimeout(() => {
    notificationElement.classList.remove('notification-visible');
    
    // После анимации скрытия, обрабатываем следующее уведомление
    setTimeout(() => {
      processNotificationQueue();
    }, 300);
  }, notification.duration);
}

// Добавляем стили для уведомлений
if (typeof window !== 'undefined' && !document.getElementById('notification-styles')) {
  const style = document.createElement('style');
  style.id = 'notification-styles';
  style.textContent = `
    .global-notification {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 9999;
      font-size: 14px;
      font-weight: 500;
      max-width: 320px;
      opacity: 0;
      transform: translateY(-20px);
      transition: opacity 0.3s, transform 0.3s;
      color: #fff;
    }
    .notification-visible {
      opacity: 1;
      transform: translateY(0);
    }
    .notification-success {
      background-color: #4caf50;
    }
    .notification-error {
      background-color: #f44336;
    }
    .notification-warning {
      background-color: #ff9800;
    }
    .notification-info {
      background-color: #2196f3;
    }
  `;
  document.head.appendChild(style);
}

// Экспортируем для использования в компонентах
export default showNotification; 