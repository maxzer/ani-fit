/**
 * Сервис для проверки и обработки Telegram WebApp данных
 */
import { createHmac } from 'crypto';
import { TelegramInitData, InvalidTelegramDataError } from '../types/telegram';

/**
 * Проверяет подпись initData из Telegram WebApp
 * @param initData Строка initData из Telegram WebApp
 * @param botToken Токен бота Telegram
 * @param maxAgeSeconds Максимальное время актуальности данных в секундах (по умолчанию 24 часа)
 * @returns true если подпись верна и данные актуальны, иначе false
 */
export function verifyTelegramWebAppData(initData: string, botToken: string, maxAgeSeconds = 86400): boolean {
  try {
    // Разбор данных initData
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    const authDate = params.get('auth_date');
    
    if (!hash || !authDate) {
      return false;
    }
    
    // Проверка времени актуальности
    const currentTime = Math.floor(Date.now() / 1000);
    const authTime = parseInt(authDate, 10);
    
    if (isNaN(authTime) || (currentTime - authTime) > maxAgeSeconds) {
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
 * Безопасная проверка и извлечение данных пользователя из initData Telegram
 * @param initDataStr Строка initData из Telegram WebApp
 * @param botToken Токен бота Telegram
 * @returns Объект с данными пользователя и initData
 * @throws InvalidTelegramDataError в случае невалидных данных
 */
export function verifyTelegramData(initDataStr: string, botToken: string): TelegramInitData {
  if (!initDataStr) {
    throw new InvalidTelegramDataError('Init data is missing');
  }

  if (!botToken) {
    throw new InvalidTelegramDataError('Bot token is missing');
  }

  // Проверяем подпись с помощью существующей функции
  const isValid = verifyTelegramWebAppData(initDataStr, botToken);
  if (!isValid) {
    throw new InvalidTelegramDataError('Invalid Telegram data signature');
  }

  // Парсим параметры из строки initData
  const params = new URLSearchParams(initDataStr);
  
  // Получаем хеш из параметров
  const hash = params.get('hash');
  if (!hash) {
    throw new InvalidTelegramDataError('Hash parameter is missing');
  }

  // Получаем auth_date из параметров
  const authDate = params.get('auth_date');
  if (!authDate) {
    throw new InvalidTelegramDataError('Auth date is missing');
  }

  // Парсим данные пользователя
  const userData = params.get('user');
  let user = undefined;
  if (userData) {
    try {
      user = JSON.parse(userData);
    } catch (e) {
      throw new InvalidTelegramDataError('Failed to parse user data');
    }
  }

  // Возвращаем проверенные данные
  return {
    query_id: params.get('query_id') || undefined,
    user,
    auth_date: parseInt(authDate, 10),
    hash
  };
}

/**
 * Извлекает данные пользователя из initData Telegram WebApp
 * @param initData Строка initData из Telegram WebApp
 * @returns Объект с данными пользователя или null в случае ошибки
 */
export function extractTelegramUserData(initData: string): any {
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