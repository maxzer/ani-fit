import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { setupGoogleCalendar } from '../utils/googleCalendar';
import { getEventStatusFromCalendar } from '../utils/calendarWatcher';

export default async function webhooksController(app: FastifyInstance, prisma: PrismaClient) {
  const { jwtClient, calendar } = setupGoogleCalendar();
  
  // Webhook для уведомлений от Google Calendar
  app.post('/api/webhook/calendar', async (request, reply) => {
    try {
      // Проверка безопасности - сравниваем токен из заголовка с нашим секретным токеном
      const token = request.headers['x-goog-channel-token'] as string;
      if (token !== process.env.WEBHOOK_SECRET_TOKEN) {
        console.warn('Unauthorized webhook call attempt with token:', token);
        return reply.status(403).send({ error: 'Unauthorized' });
      }
      
      // Получаем заголовки с мета-информацией от Google
      const channelId = request.headers['x-goog-channel-id'] as string;
      const resourceId = request.headers['x-goog-resource-id'] as string;
      const resourceState = request.headers['x-goog-resource-state'] as string;
      
      console.log(`Received webhook: ${resourceState} for channel ${channelId}`);
      
      // Если это уведомление sync (проверка работоспособности канала), просто подтверждаем его
      if (resourceState === 'sync') {
        return { status: 'ok', message: 'Sync notification received' };
      }
      
      // Проверка что это уведомление о событиях календаря (может быть 'exists' или 'change')
      if (resourceState !== 'exists' && resourceState !== 'change') {
        return { status: 'ok', message: `Unknown resource state: ${resourceState}` };
      }
      
      // Авторизуемся для доступа к Google Calendar API
      await jwtClient.authorize();
      
      // Получаем список недавно измененных событий
      // Используем параметр updatedMin с временем немного в прошлом (5 минут)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const events = await calendar.events.list({
        calendarId: process.env.GOOGLE_CALENDAR_ID,
        updatedMin: fiveMinutesAgo,
        singleEvents: true,
      });
      
      if (!events.data.items || events.data.items.length === 0) {
        return { status: 'ok', message: 'No updated events found' };
      }
      
      // Обрабатываем каждое обновленное событие
      const updatedEvents = [];
      for (const googleEvent of events.data.items) {
        // Проверяем, что у события есть ID
        if (!googleEvent.id) continue;
        
        // Определяем текущий статус события
        const eventStatus = await getEventStatusFromCalendar(calendar, googleEvent.id);
        
        // Пропускаем события с ошибкой
        if (eventStatus.status === 'error') continue;
        
        // Проверяем, существует ли событие в нашей базе данных
        const dbEvent = await prisma.event.findFirst({
          where: {
            googleEventId: googleEvent.id
          }
        });
        
        // Если событие найдено в базе данных, обновляем его статус
        if (dbEvent) {
          // Обновляем статус и цвет события в базе данных
          const status = eventStatus.status;
          const color = status === 'confirmed' ? '#4caf50' : 
                        status === 'cancelled' ? '#f44336' : '#ff9800';
                        
          await prisma.event.update({
            where: {
              id: dbEvent.id
            },
            data: {
              status,
              color
            }
          });
          
          updatedEvents.push({
            eventId: dbEvent.id,
            googleEventId: googleEvent.id,
            status,
            title: dbEvent.title
          });
        }
      }
      
      return { 
        status: 'ok', 
        message: 'Webhook processed successfully', 
        processed: updatedEvents.length,
        updatedEvents 
      };
    } catch (error) {
      console.error('Error processing webhook:', error);
      return reply.status(500).send({ 
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
} 