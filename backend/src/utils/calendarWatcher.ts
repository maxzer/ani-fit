import { google } from 'googleapis';
import { PrismaClient } from '@prisma/client';
import { setupGoogleCalendar } from './googleCalendar';

/**
 * Настраивает webhook для получения уведомлений о изменениях в Google Calendar
 * @param prisma Экземпляр PrismaClient для работы с базой данных
 * @returns Информация о созданном канале уведомлений
 */
export async function setupCalendarWatcher(prisma: PrismaClient) {
  try {
    const { jwtClient, calendar } = setupGoogleCalendar();
    await jwtClient.authorize();
    
    // Публичный URL вашего API (должен быть доступен из интернета через HTTPS)
    const webhookUrl = process.env.API_PUBLIC_URL + '/api/webhook/calendar';
    
    // ID для канала уведомлений (уникальный для каждой настройки)
    const channelId = 'calendar-notifications-' + Date.now();
    
    // Настраиваем уведомления для календаря
    const response = await calendar.events.watch({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: webhookUrl,
        // Токен для проверки подлинности уведомлений
        token: process.env.WEBHOOK_SECRET_TOKEN
      }
    });
    
    console.log('Calendar watch set up successfully:', response.data);
    
    // Сохраняем информацию о канале уведомлений
    await prisma.systemSetting.upsert({
      where: { key: 'calendarWatcherInfo' },
      update: { 
        value: JSON.stringify({
          channelId: response.data.id,
          resourceId: response.data.resourceId,
          expiration: response.data.expiration
        })
      },
      create: {
        key: 'calendarWatcherInfo',
        value: JSON.stringify({
          channelId: response.data.id,
          resourceId: response.data.resourceId,
          expiration: response.data.expiration
        })
      }
    });
    
    return {
      channelId: response.data.id,
      resourceId: response.data.resourceId,
      expiration: response.data.expiration
    };
  } catch (error) {
    console.error('Error setting up calendar watcher:', error);
    throw error;
  }
}

/**
 * Обновляет канал уведомлений (нужно вызывать периодически, т.к. каналы имеют ограниченный срок действия)
 * @param prisma Экземпляр PrismaClient для работы с базой данных
 * @param channelInfo Информация о текущем канале уведомлений
 * @returns Информация о новом канале уведомлений
 */
export async function renewCalendarWatcher(prisma: PrismaClient, channelInfo: any) {
  try {
    // Останавливаем текущий канал
    await stopCalendarWatcher(channelInfo);
    
    // Создаем новый канал
    return await setupCalendarWatcher(prisma);
  } catch (error) {
    console.error('Error renewing calendar watcher:', error);
    throw error;
  }
}

/**
 * Останавливает отслеживание календаря
 * @param channelInfo Информация о канале уведомлений
 * @returns true в случае успеха
 */
export async function stopCalendarWatcher(channelInfo: any) {
  try {
    const { jwtClient, calendar } = setupGoogleCalendar();
    await jwtClient.authorize();
    
    await calendar.channels.stop({
      requestBody: {
        id: channelInfo.channelId,
        resourceId: channelInfo.resourceId
      }
    });
    
    console.log('Calendar watch stopped successfully');
    return true;
  } catch (error) {
    console.error('Error stopping calendar watcher:', error);
    throw error;
  }
}

/**
 * Получает статус события из Google Calendar и определяет его на основе описания и заголовка
 * @param calendar Google Calendar API клиент
 * @param googleEventId ID события в Google Calendar
 * @returns Информация о статусе события
 */
export async function getEventStatusFromCalendar(calendar: any, googleEventId: string) {
  try {
    // Получаем событие из Google Calendar
    const googleEvent = await calendar.events.get({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      eventId: googleEventId
    });
    
    // По умолчанию статус в обработке
    let status = 'pending';
    
    // Проверяем содержимое заголовка
    // Если в заголовке нет метки "(На подтверждении)", событие считается подтвержденным
    if (googleEvent.data.summary && !googleEvent.data.summary.includes('(На подтверждении)')) {
      status = 'confirmed';
    }
    
    // Проверяем описание на наличие специальных меток (приоритетнее заголовка)
    if (googleEvent.data.description) {
      if (googleEvent.data.description.includes('[ПОДТВЕРЖДЕНО]')) {
        status = 'confirmed';
      } else if (googleEvent.data.description.includes('[ОТМЕНЕНО]')) {
        status = 'cancelled';
      }
    }
    
    // Проверяем цвет только для отмененных событий (красный = отменено)
    if (googleEvent.data.colorId === '11') { // Красный
      status = 'cancelled';
    }
    
    return {
      googleEventId,
      status,
      event: googleEvent.data
    };
  } catch (error) {
    console.error(`Error getting event ${googleEventId} status:`, error);
    return {
      googleEventId,
      status: 'error',
      error: 'Не удалось получить информацию о событии'
    };
  }
} 