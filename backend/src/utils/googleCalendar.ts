import { google } from 'googleapis';

// Функция для настройки Google Calendar API
export function setupGoogleCalendar() {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const jwtClient = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    undefined,
    privateKey,
    ['https://www.googleapis.com/auth/calendar']
  );

  const calendar = google.calendar({ version: 'v3', auth: jwtClient });
  return { jwtClient, calendar };
}

// Функция для преобразования hex-цвета в идентификатор цвета Google Calendar
export function getGoogleCalendarColorId(hexColor: string): string {
  // Google Calendar поддерживает ограниченный набор цветов с ID от 1 до 11
  // Сопоставим наши hex-цвета с ближайшими цветами в Google Calendar
  
  // Убираем # из начала цвета, если есть
  const colorHex = hexColor.startsWith('#') ? hexColor.substring(1).toLowerCase() : hexColor.toLowerCase();
  
  // Сопоставление hex-цветов с ID цветов Google Calendar
  const colorMap: { [key: string]: string } = {
    // Стандартные цвета
    '4caf50': '10', // Зелёный
    '2196f3': '7',  // Синий
    'ff9800': '6',  // Оранжевый
    '9c27b0': '3',  // Фиолетовый
    'f44336': '11', // Красный
    'ffeb3b': '5',  // Жёлтый
    '8bc34a': '2',  // Зеленый (более светлый)
    'e91e63': '4',  // Розовый
    '3f51b5': '9',  // Индиго
    '009688': '8',  // Бирюзовый
    
    // Дополнительные цвета для более точного сопоставления
    'a5d6a7': '2',  // Светло-зеленый
    '81c784': '2',  // Светло-зеленый
    'c8e6c9': '2',  // Светло-зеленый
    '66bb6a': '10', // Зеленый
    '43a047': '10', // Зеленый
    '2e7d32': '10', // Зеленый
    '1b5e20': '10', // Темно-зеленый
    
    'bbdefb': '7',  // Светло-синий
    '90caf9': '7',  // Светло-синий
    '64b5f6': '7',  // Синий
    '42a5f5': '7',  // Синий
    '1e88e5': '7',  // Синий
    '1976d2': '7',  // Темно-синий
    '0d47a1': '9',  // Темно-синий
    
    'ffcc80': '6',  // Светло-оранжевый
    'ffb74d': '6',  // Светло-оранжевый
    'ffa726': '6',  // Оранжевый
    'fb8c00': '6',  // Оранжевый
    'f57c00': '6',  // Оранжевый
    'e65100': '6',  // Темно-оранжевый
    
    'ce93d8': '3',  // Светло-фиолетовый
    'ba68c8': '3',  // Фиолетовый
    'ab47bc': '3',  // Фиолетовый
    '8e24aa': '3',  // Фиолетовый
    '6a1b9a': '3',  // Темно-фиолетовый
    
    'ef9a9a': '11', // Светло-красный
    'e57373': '11', // Светло-красный
    'ef5350': '11', // Красный
    'e53935': '11', // Красный
    'd32f2f': '11', // Красный
    'c62828': '11', // Темно-красный
    'b71c1c': '11', // Темно-красный
    
    'fff59d': '5',  // Светло-желтый
    'fff176': '5',  // Светло-желтый
    'ffee58': '5',  // Желтый
    'fdd835': '5',  // Желтый
    'fbc02d': '5',  // Желтый
    'f9a825': '5',  // Темно-желтый
    'f57f17': '5',  // Темно-желтый
    
    'ffffff': '1',  // Белый (использует светло-голубой)
    'fafafa': '1',  // Почти белый
    'f5f5f5': '1',  // Почти белый
    'eeeeee': '1',  // Светло-серый
    'e0e0e0': '1',  // Светло-серый
  };
  
  // Ищем точное совпадение
  if (colorMap[colorHex]) {
    return colorMap[colorHex];
  }
  
  // Если цвет содержит 6 символов, пробуем найти близкий цвет
  if (colorHex.length === 6) {
    // Разбиваем цвет на RGB компоненты
    const r = parseInt(colorHex.substring(0, 2), 16);
    const g = parseInt(colorHex.substring(2, 4), 16);
    const b = parseInt(colorHex.substring(4, 6), 16);
    
    // Определяем наиболее доминирующий компонент
    if (r > g && r > b && r > 180) {
      return '11'; // Красный
    } else if (g > r && g > b && g > 180) {
      return '10'; // Зеленый
    } else if (b > r && b > g && b > 180) {
      return '7';  // Синий
    } else if (r > 180 && g > 180 && b < 100) {
      return '5';  // Желтый
    } else if (r > 180 && g > 100 && g < 180 && b < 100) {
      return '6';  // Оранжевый
    } else if (r > 150 && b > 150 && g < 150) {
      return '3';  // Фиолетовый
    }
  }
  
  // Если не смогли определить цвет, используем базовый цвет по умолчанию
  return '1';
} 