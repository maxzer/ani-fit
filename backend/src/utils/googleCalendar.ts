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
  const colorHex = hexColor.startsWith('#') ? hexColor.substring(1) : hexColor;
  
  // Сопоставление hex-цветов с ID цветов Google Calendar
  const colorMap: { [key: string]: string } = {
    '4caf50': '10', // Зелёный
    '2196f3': '7',  // Синий
    'ff9800': '6',  // Оранжевый
    '9c27b0': '3',  // Фиолетовый
    'f44336': '11', // Красный
    'ffeb3b': '5',  // Жёлтый
    'ffffff': '1',  // Светло-синий (по умолчанию)
  };
  
  // Ищем точное совпадение
  if (colorMap[colorHex]) {
    return colorMap[colorHex];
  }
  
  // Если точного совпадения нет, используем базовый цвет по умолчанию
  return '1';
} 