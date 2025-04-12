import { verifyTelegramWebAppData, extractTelegramUserData } from './telegram-auth.utils';

const BOT_TOKEN = '8004911775:AAEY7JjoMDrnXj24Ah9Q94kiOkNch3qHdss';

// Тестовые данные
const validInitData = "query_id=AAG3AtoRAAAAALcC2hEtpi0G&user=%7B%22id%22%3A299500215%2C%22first_name%22%3A%22maxzer%22%2C%22last_name%22%3A%22%22%2C%22username%22%3A%22maxzere%22%2C%22language_code%22%3A%22ru%22%2C%22allows_write_to_pm%22%3Atrue%2C%22photo_url%22%3A%22https%3A%5C%2F%5C%2Ft.me%5C%2Fi%5C%2Fuserpic%5C%2F320%5C%2FHyxL0hgyMtoc8TB7Li3oclWEYR4MC50VF1Nx9IYZ3Kw.svg%22%7D&auth_date=1744382110&signature=bVTJ4Ph6E5RkvJFO3qqQVsxoZwj7IxKguFlXaEMgFtvpheVOvkgcwVfFYa3oMREFwJz19FettWgXq0PwXtAKBg&hash=d02b6179e93ab87831b845151ab28972f1df3a3a085325f182d9c63a4273658a";

// Тесты
console.log('🧪 Запуск тестов...\n');

// Тест 1: Проверка валидных данных
console.log('Тест 1: Проверка валидных данных');
const isValid = verifyTelegramWebAppData(validInitData, BOT_TOKEN);
console.log('Результат:', isValid ? '✅ Валидно' : '❌ Невалидно');

// Тест 2: Проверка с истекшим временем
console.log('\nТест 2: Проверка с коротким maxAgeSeconds');
const isValidExpired = verifyTelegramWebAppData(validInitData, BOT_TOKEN, 1); // 1 секунда
console.log('Результат:', isValidExpired ? '❌ Ошибка: должно быть невалидно' : '✅ Корректно невалидно');

// Тест 3: Проверка извлечения данных пользователя
console.log('\nТест 3: Извлечение данных пользователя');
const userData = extractTelegramUserData(validInitData);
console.log('Данные пользователя:', userData ? '✅ Получены' : '❌ Не получены');
console.log(userData);

// Тест 4: Проверка невалидных данных
console.log('\nТест 4: Проверка невалидных данных');
const invalidInitData = validInitData.replace('hash=', 'hash=invalid');
const isValidInvalid = verifyTelegramWebAppData(invalidInitData, BOT_TOKEN);
console.log('Результат:', isValidInvalid ? '❌ Ошибка: должно быть невалидно' : '✅ Корректно невалидно'); 