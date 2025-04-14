/**
 * Тестовый скрипт для проверки функций аутентификации Telegram
 * Запуск: npx ts-node src/test-telegram-auth.ts
 */
import { verifyTelegramWebAppData, extractTelegramUserData } from './utils/telegram-auth.utils';
import 'dotenv/config';

// Получаем токен бота из переменных окружения
const botToken = process.env.TELEGRAM_BOT_TOKEN || '';

// Пример тестовых данных (заменить на реальные в боевых условиях)
const testInitData = 'query_id=AAHdF_8gAAAAANwX_yDK2aQu&user=%7B%22id%22%3A123456789%2C%22first_name%22%3A%22User%22%2C%22last_name%22%3A%22Test%22%2C%22username%22%3A%22testuser%22%2C%22language_code%22%3A%22en%22%2C%22allows_write_to_pm%22%3Atrue%7D&auth_date=1685555555&hash=d7953d1c73d124e2620f46a99b10bc122c41eb3f3f5b33ed16d8d538a433eb5d';

console.log('====== ТЕСТ АУТЕНТИФИКАЦИИ TELEGRAM ======');

// 1. Проверяем настройку токена бота
console.log('Токен бота настроен:', !!botToken);
if (!botToken) {
  console.warn('ПРЕДУПРЕЖДЕНИЕ: Токен бота Telegram не настроен в переменных окружения.');
  console.warn('Установите TELEGRAM_BOT_TOKEN в .env файле для полноценной проверки подписи.');
}

// 2. Пытаемся извлечь данные пользователя из тестовых данных
const userData = extractTelegramUserData(testInitData);
console.log('Данные пользователя:', userData || 'Не удалось извлечь данные');

// 3. Пытаемся проверить подпись тестовых данных
// В тестовом примере подпись не будет валидной, так как тестовые данные не подписаны нашим ботом
const isValid = verifyTelegramWebAppData(testInitData, botToken);
console.log('Подпись данных валидна:', isValid);
console.log('Примечание: В тестовом примере подпись обычно не валидна, это нормально.');
console.log('В реальном использовании подпись должна проверяться с помощью реальных данных от Telegram.');

console.log('====== ТЕСТ ЗАВЕРШЕН ======'); 