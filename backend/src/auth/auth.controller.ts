import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { JWT } from '@fastify/jwt';

// Расширяем интерфейс FastifyInstance для поддержки jwt
declare module 'fastify' {
  interface FastifyInstance {
    jwt: JWT;
  }
}

export default async function authController(fastify: FastifyInstance, prisma: PrismaClient) {
  // Вспомогательная функция для создания токена
  function createToken(userId: number): string {
    const secret = process.env.JWT_ACCESS_SECRET || 'default_access_secret';
    return jwt.sign(
      { userId },
      secret,
      { expiresIn: '15m' }
    );
  }

  // Endpoint для обновления access токена с использованием refresh токена
  fastify.post('/api/auth/refresh-token', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' }
          }
        }
      }
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        console.log('Начинаем обновление токена доступа');
        // Получаем refresh токен из cookie
        const refreshToken = request.cookies.refreshToken;
        
        if (!refreshToken) {
          console.error('Refresh токен отсутствует в запросе');
          return reply.status(401).send({ 
            success: false, 
            error: 'Требуется refresh токен' 
          });
        }
        
        console.log('Проверяем refresh токен...');
        // Проверяем валидность refresh токена
        const refreshSecret = process.env.JWT_REFRESH_SECRET || 'default_refresh_secret';
        let decoded;
        
        try {
          decoded = jwt.verify(refreshToken, refreshSecret) as { userId: number, tokenType?: string };
        } catch (err) {
          console.error('Ошибка верификации refresh токена:', err);
          return reply.status(401).send({ 
            success: false, 
            error: 'Недействительный или истекший refresh токен' 
          });
        }
        
        // Проверяем, что это действительно refresh токен и присутствует userId
        if (!decoded || !decoded.userId || decoded.tokenType !== 'refresh') {
          console.error('Неверный формат refresh токена');
          return reply.status(401).send({ 
            success: false, 
            error: 'Неверный формат refresh токена' 
          });
        }
        
        // Проверяем, что refresh токен есть в базе данных
        console.log(`Ищем refresh токен для пользователя с ID: ${decoded.userId}`);
        const authRecord = await prisma.auth.findUnique({
          where: { userId: decoded.userId },
          include: { user: true }
        });
        
        if (!authRecord || authRecord.refreshToken !== refreshToken) {
          console.error('Refresh токен не найден в базе данных');
          return reply.status(401).send({ 
            success: false, 
            error: 'Refresh токен недействителен' 
          });
        }
        
        // Генерируем новый access токен
        const accessSecret = process.env.JWT_ACCESS_SECRET || 'default_access_secret';
        const newAccessToken = jwt.sign(
          { userId: decoded.userId },
          accessSecret,
          { expiresIn: '15m' }
        );
        
        console.log(`Сгенерирован новый access токен для пользователя ${decoded.userId}`);
        
        // Возвращаем новый access токен
        return reply.status(200).send({
          success: true,
          accessToken: newAccessToken,
          user: {
            id: authRecord.user.id,
            firstName: authRecord.user.firstName,
            lastName: authRecord.user.lastName,
            username: authRecord.user.username,
            photoUrl: authRecord.user.photoUrl
          }
        });
      } catch (error) {
        console.error('Ошибка при обновлении токена:', error);
        return reply.status(500).send({ 
          success: false, 
          error: 'Внутренняя ошибка сервера при обновлении токена' 
        });
      }
    }
  });
} 