import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

// Тип для расширения PrismaClient
type PrismaClientWithModels = PrismaClient & {
  viewedPriceList: any;
};

export default async function priceListsController(app: FastifyInstance, prisma: PrismaClientWithModels) {
  // API для получения просмотренных прайс-листов пользователя
  app.get('/api/price-lists/viewed', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          userId: { type: 'string' }
        },
        required: ['userId']
      }
    },
    handler: async (request, reply) => {
      try {
        const { userId } = request.query as { userId: string };
        
        // Валидация ID пользователя
        if (!userId || isNaN(parseInt(userId))) {
          return reply.code(400).send({ success: false, message: 'Неверный ID пользователя' });
        }
        
        // Получаем все записи о просмотренных прайс-листах пользователя
        const viewedPriceLists = await prisma.viewedPriceList.findMany({
          where: {
            userId: parseInt(userId)
          },
          select: {
            serviceTitle: true,
            isViewed: true
          }
        });
        
        return reply.send({
          success: true,
          viewedPriceLists
        });
      } catch (error) {
        console.error('Ошибка при получении просмотренных прайс-листов:', error);
        return reply.code(500).send({
          success: false,
          message: 'Не удалось получить данные о просмотренных прайс-листах'
        });
      }
    }
  });
  
  // API для отметки прайс-листа как просмотренного
  app.post('/api/price-lists/mark-viewed', {
    schema: {
      body: {
        type: 'object',
        properties: {
          userId: { type: 'number' },
          serviceTitle: { type: 'string' }
        },
        required: ['userId', 'serviceTitle']
      }
    },
    handler: async (request, reply) => {
      try {
        const { userId, serviceTitle } = request.body as { 
          userId: number;
          serviceTitle: string;
        };
        
        // Создаем или обновляем запись о просмотре прайс-листа
        const viewedPriceList = await prisma.viewedPriceList.upsert({
          where: {
            userId_serviceTitle: {
              userId: userId,
              serviceTitle: serviceTitle
            }
          },
          update: {
            isViewed: true,
            updatedAt: new Date()
          },
          create: {
            userId: userId,
            serviceTitle: serviceTitle,
            isViewed: true
          }
        });
        
        return reply.send({
          success: true,
          viewedPriceList
        });
      } catch (error) {
        console.error('Ошибка при отметке прайс-листа как просмотренного:', error);
        return reply.code(500).send({
          success: false,
          message: 'Не удалось отметить прайс-лист как просмотренный'
        });
      }
    }
  });
} 