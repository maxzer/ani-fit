/**
 * Сервис для проверки и обработки Telegram WebApp данных
 */
import { createHmac } from 'crypto';

/**
 * Проверяет подпись initData из Telegram WebApp
 * @param initData Строка initData из Telegram WebApp
 * @param botToken Токен бота Telegram
 * @returns true если подпись верна, иначе false
 */
export function verifyTelegramWebAppData(initData: string, botToken: string): boolean {
  try {
    // Разбор данных initData
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    
    if (!hash) {
      return false;
    }
    
    // Удаляем hash из проверяемой строки
    params.delete('hash');
    
    // Сортируем параметры и формируем строку для проверки
    const dataCheckArray = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`);
    
    const dataCheckString = dataCheckArray.join('\n');
    
    // Создаем секретный ключ на основе токена бота
    const secretKey = createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();
    
    // Вычисляем хеш для проверки
    const calculatedHash = createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');
    
    // Сравниваем вычисленный и полученный хеши
    return calculatedHash === hash;
  } catch (error) {
    console.error('Ошибка при проверке данных Telegram WebApp:', error);
    return false;
  }
}

/**
 * Извлекает данные пользователя из initData Telegram WebApp
 * @param initData Строка initData из Telegram WebApp
 * @returns Объект с данными пользователя или null в случае ошибки
 */
export function extractTelegramUserData(initData: string) {
  try {
    const params = new URLSearchParams(initData);
    const userJson = params.get('user');
    
    if (!userJson) {
      return null;
    }
    
    return JSON.parse(userJson);
  } catch (error) {
    console.error('Ошибка при извлечении данных пользователя Telegram:', error);
    return null;
  }
} 