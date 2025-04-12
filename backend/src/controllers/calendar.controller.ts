import { FastifyInstance } from 'fastify';
import { setupGoogleCalendar, getGoogleCalendarColorId } from '../utils/googleCalendar';

export default async function calendarController(app: FastifyInstance) {
  // Настройка Google Calendar
  const { jwtClient, calendar } = setupGoogleCalendar();
  
  // API для добавления события в Google Calendar
  app.post('/api/calendar/add-event', async (request, reply) => {
    try {
      await jwtClient.authorize();
      
      const body = request.body as any;
      const summary = body.summary;
      const description = body.description;
      const startDateTime = body.startDateTime;
      const endDateTime = body.endDateTime;
      const attendees = body.attendees || [];
      const color = body.color || '#4caf50';
      
      // Преобразование hex-цвета в идентификатор цвета Google Calendar
      const colorId = getGoogleCalendarColorId(color);
      
      const event = {
        summary,
        description,
        start: {
          dateTime: startDateTime,
          timeZone: 'Europe/Moscow',
        },
        end: {
          dateTime: endDateTime,
          timeZone: 'Europe/Moscow',
        },
        attendees,
        colorId
      };
      
      const result = await calendar.events.insert({
        calendarId: process.env.GOOGLE_CALENDAR_ID,
        requestBody: event,
      });
      
      return {
        success: true,
        eventId: result.data.id,
        htmlLink: result.data.htmlLink
      };
    } catch (error) {
      console.error('Error creating calendar event:', error);
      reply.status(500).send({ 
        success: false, 
        error: 'Не удалось создать событие в календаре' 
      });
    }
  });
} 