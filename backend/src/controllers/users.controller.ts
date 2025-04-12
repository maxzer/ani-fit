import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

export default async function usersController(app: FastifyInstance, prisma: PrismaClient) {
  // Получение списка пользователей
  app.get('/users', async () => {
    const users = await prisma.user.findMany();
    return users;
  });
  
  // Создание нового пользователя
  app.post('/users', async (request) => {
    try {
      const body = request.body as any;
      
      const user = await prisma.user.create({
        data: {
          firstName: body.name || '',
          lastName: '',
          email: body.email || '',
          // Другие поля можно добавить при необходимости
        }
      });
      
      return { 
        success: true, 
        user 
      };
    } catch (error) {
      console.error('Error creating user:', error);
      return { 
        success: false, 
        error: 'Could not create user' 
      };
    }
  });
  
  // Получение информации о пользователе по ID
  app.get('/users/:id', async (request, reply) => {
    try {
      const userId = (request.params as any).id;
      
      if (!userId || isNaN(parseInt(userId))) {
        return reply.status(400).send({
          success: false,
          error: 'Неверный ID пользователя'
        });
      }
      
      const user = await prisma.user.findUnique({
        where: {
          id: parseInt(userId)
        }
      });
      
      if (!user) {
        return reply.status(404).send({
          success: false,
          error: 'Пользователь не найден'
        });
      }
      
      return {
        success: true,
        user
      };
    } catch (error) {
      console.error('Error fetching user:', error);
      reply.status(500).send({
        success: false,
        error: 'Не удалось получить данные пользователя'
      });
    }
  });
} 