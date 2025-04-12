const crypto = require('crypto');
const { URLSearchParams } = require('url');

function validateTelegramData(initDataStr, botToken, maxAgeSeconds = 86400) {
    // Парсим параметры из строки initData
    const params = new URLSearchParams(initDataStr);
    const received = Object.fromEntries(params.entries());

    // Проверяем обязательные поля
    if (!received.hash || !received.auth_date) {
        throw new Error('Missing required fields: hash or auth_date');
    }

    // Шаг 1: Собираем data-check-string
    const dataCheckEntries = Object.entries(received)
        .filter(([key]) => key !== 'hash') // Исключаем hash
        .sort(([a], [b]) => a.localeCompare(b)); // Сортируем по ключам

    const dataCheckString = dataCheckEntries
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

    // Шаг 2: Генерируем секретный ключ
    const secretKey = crypto.createHmac('sha256', 'WebAppData')
        .update(botToken)
        .digest();

    // Шаг 3: Вычисляем HMAC
    const calculatedHash = crypto.createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

    // Шаг 4: Сравниваем хеши
    const isHashValid = calculatedHash === received.hash;

    // Шаг 5: Проверяем время актуальности
    const currentTime = Math.floor(Date.now() / 1000);
    const authDate = parseInt(received.auth_date, 10);
    const isFresh = (currentTime - authDate) <= maxAgeSeconds;

    return isHashValid && isFresh;
}

// Пример использования
(async () => {
    try {
        const initData = "query_id=AAG3AtoRAAAAALcC2hEtpi0G&user=%7B%22id%22%3A299500215%2C%22first_name%22%3A%22maxzer%22%2C%22last_name%22%3A%22%22%2C%22username%22%3A%22maxzere%22%2C%22language_code%22%3A%22ru%22%2C%22allows_write_to_pm%22%3Atrue%2C%22photo_url%22%3A%22https%3A%5C%2F%5C%2Ft.me%5C%2Fi%5C%2Fuserpic%5C%2F320%5C%2FHyxL0hgyMtoc8TB7Li3oclWEYR4MC50VF1Nx9IYZ3Kw.svg%22%7D&auth_date=1744382110&signature=bVTJ4Ph6E5RkvJFO3qqQVsxoZwj7IxKguFlXaEMgFtvpheVOvkgcwVfFYa3oMREFwJz19FettWgXq0PwXtAKBg&hash=d02b6179e93ab87831b845151ab28972f1df3a3a085325f182d9c63a4273658a";
        const botToken = '8004911775:AAEY7JjoMDrnXj24Ah9Q94kiOkNch3qHdss';
        
        console.log('Checking raw data from request...');
        const isValid = validateTelegramData(initData, botToken);
        console.log('Validation result:', isValid ? '✅ Valid' : '❌ Invalid');

        // Распарсим данные для проверки
        const params = new URLSearchParams(initData);
        console.log('\nParsed data:');
        console.log('Hash:', params.get('hash'));
        console.log('Auth date:', params.get('auth_date'));
        console.log('User:', JSON.parse(params.get('user')));
    } catch (error) {
        console.error('Error:', error.message);
    }
})();