import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { setupGoogleCalendar } from '../utils/googleCalendar';

// Тип для расширения PrismaClient
type PrismaClientWithModels = PrismaClient & {
  viewedPriceList: any;
};

export default async function eventsController(app: FastifyInstance, prisma: PrismaClientWithModels) {
  // Настройка Google Calendar
  const { jwtClient, calendar } = setupGoogleCalendar();
  
  // API для сохранения события в базу данных
  app.post('/api/events', async (request, reply) => {
    try {
      // Получаем данные из запроса
      const body = request.body as any;
      
      // Проверяем обязательные поля
      if (!body.title || !body.date || !body.userId) {
        return reply.status(400).send({
          success: false,
          error: 'Отсутствуют обязательные поля: title, date, userId'
        });
      }
      
      // Создаем событие в базе данных
      const event = await prisma.event.create({
        data: {
          title: body.title,
          date: new Date(body.date),
          endDate: body.endDate ? new Date(body.endDate) : null,
          color: body.color || "#4caf50",
          googleEventId: body.googleEventId,
          staffInfo: body.staffInfo ? JSON.parse(JSON.stringify(body.staffInfo)) : null,
          petBreed: body.petBreed,
          status: body.status || "confirmed",
          userId: body.userId
        }
      });
      
      return {
        success: true,
        event
      };
    } catch (error) {
      console.error('Error creating event:', error);
      reply.status(500).send({
        success: false,
        error: 'Не удалось сохранить событие'
      });
    }
  });
  
  // API для получения событий пользователя
  app.get('/api/events', async (request, reply) => {
    try {
      const userId = (request.query as any).userId as string;
      
      if (!userId) {
        return reply.status(400).send({
          success: false,
          error: 'Не указан userId'
        });
      }
      
      // Получаем события пользователя, сортированные по дате
      const events = await prisma.event.findMany({
        where: {
          userId: parseInt(userId),
        },
        orderBy: {
          date: 'asc'
        }
      });
      
      return {
        success: true,
        events
      };
    } catch (error) {
      console.error('Error getting events:', error);
      reply.status(500).send({
        success: false,
        error: 'Не удалось получить события'
      });
    }
  });
  
  // API для удаления события
  app.delete('/api/events/:id', async (request, reply) => {
    try {
      const eventId = (request.params as any).id as string;
      const userId = (request.query as any).userId as string;
      
      if (!eventId) {
        return reply.status(400).send({
          success: false,
          error: 'Не указан id события'
        });
      }
      
      // Проверяем, что событие принадлежит пользователю
      const event = await prisma.event.findFirst({
        where: {
          id: parseInt(eventId),
          userId: parseInt(userId)
        }
      });
      
      if (!event) {
        return reply.status(404).send({
          success: false,
          error: 'Событие не найдено или не принадлежит пользователю'
        });
      }
      
      // Удаляем событие из Google Calendar, если есть ID
      if (event.googleEventId) {
        try {
          await jwtClient.authorize();
          await calendar.events.delete({
            calendarId: process.env.GOOGLE_CALENDAR_ID,
            eventId: event.googleEventId
          });
        } catch (calendarError) {
          console.error('Error deleting event from Google Calendar:', calendarError);
          // Продолжаем удаление из БД даже при ошибке в Google Calendar
        }
      }
      
      // Удаляем событие из базы данных
      await prisma.event.delete({
        where: {
          id: parseInt(eventId)
        }
      });
      
      return {
        success: true
      };
    } catch (error) {
      console.error('Error deleting event:', error);
      reply.status(500).send({
        success: false,
        error: 'Не удалось удалить событие'
      });
    }
  });
  
  // API для отмены события (без удаления из Google Calendar)
  app.patch('/api/events/:id/cancel', async (request, reply) => {
    try {
      const eventId = (request.params as any).id as string;
      const userId = (request.query as any).userId as string;
      
      if (!eventId) {
        return reply.status(400).send({
          success: false,
          error: 'Не указан id события'
        });
      }
      
      // Проверяем, что событие принадлежит пользователю
      const event = await prisma.event.findFirst({
        where: {
          id: parseInt(eventId),
          userId: parseInt(userId)
        }
      });
      
      if (!event) {
        return reply.status(404).send({
          success: false,
          error: 'Событие не найдено или не принадлежит пользователю'
        });
      }
      
      // Если есть ID события в Google Calendar, изменяем его цвет на красный
      if (event.googleEventId) {
        try {
          await jwtClient.authorize();
          
          // Сначала получаем текущее событие
          const existingEvent = await calendar.events.get({
            calendarId: process.env.GOOGLE_CALENDAR_ID,
            eventId: event.googleEventId
          });
          
          // Обновляем событие, устанавливая красный цвет и добавляя пометку "Отменено" в описание
          const updatedEvent = existingEvent.data;
          
          // Используем colorId 11 для красного цвета
          updatedEvent.colorId = "11";
          
          // Добавляем пометку в описание
          if (updatedEvent.description) {
            updatedEvent.description = "[ОТМЕНЕНО] " + updatedEvent.description;
          } else {
            updatedEvent.description = "[ОТМЕНЕНО]";
          }
          
          // Обновляем событие в Google Calendar
          await calendar.events.update({
            calendarId: process.env.GOOGLE_CALENDAR_ID,
            eventId: event.googleEventId,
            requestBody: updatedEvent
          });
        } catch (calendarError) {
          console.error('Error updating event in Google Calendar:', calendarError);
          // Продолжаем обновление в БД даже при ошибке в Google Calendar
        }
      }
      
      // Обновляем статус события в базе данных
      const updatedEvent = await prisma.event.update({
        where: {
          id: parseInt(eventId)
        },
        data: {
          status: 'cancelled',
          color: '#f44336' // Красный цвет для отмененных событий
        }
      });
      
      return {
        success: true,
        event: updatedEvent
      };
    } catch (error) {
      console.error('Error cancelling event:', error);
      reply.status(500).send({
        success: false,
        error: 'Не удалось отменить событие'
      });
    }
  });
} 