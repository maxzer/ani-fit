import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { AuthService } from './auth.service';
import { InvalidTelegramDataError, TokenGenerationError, UserCreationError } from '../types/telegram';
import jwt from 'jsonwebtoken';

interface TelegramAuthRequest {
  initData: string;
}

export default async function telegramAuthController(fastify: FastifyInstance, prisma: PrismaClient) {
  const authService = new AuthService(prisma);

  // Настройка cookie опций
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    domain: process.env.COOKIE_DOMAIN || undefined
  };

  // Добавляем маршрут для аутентификации через Telegram
  fastify.post<{ Body: TelegramAuthRequest }>('/api/auth/telegram', {
    schema: {
      body: {
        type: 'object',
        required: ['initData'],
        properties: {
          initData: { type: 'string' }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        console.log('===== TELEGRAM AUTH ENDPOINT START =====');
        console.log('RECEIVED INIT DATA:', request.body.initData);
        console.log('======================================');
        
        // Валидация initData
        const userData = await authService.validateInitData(request.body.initData);
        
        // Найти или создать пользователя
        const user = await authService.findOrCreateUser(userData);
        
        // Генерация токенов
        const tokens = authService.generateTokens(user);
        
        // Сохраняем refresh токен в базу данных
        await authService.saveRefreshToken(user.id, tokens.refreshToken);
        
        // Установка cookie для refresh токена
        reply.setCookie('refreshToken', tokens.refreshToken, cookieOptions);
        
        // Возвращаем access токен и данные пользователя
        return reply.code(200).send({
          accessToken: tokens.accessToken,
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            photoUrl: user.photoUrl
          }
        });
      } catch (error) {
        // Обработка ошибок
        if (error instanceof InvalidTelegramDataError) {
          return reply.code(401).send({ error: error.message });
        } else if (error instanceof UserCreationError) {
          return reply.code(500).send({ error: error.message });
        } else if (error instanceof TokenGenerationError) {
          return reply.code(500).send({ error: error.message });
        }
        
        return reply.code(500).send({ error: 'Unexpected error' });
      }
    }
  });

  // Добавляем маршрут для выхода из системы
  fastify.post('/api/auth/logout', {
    handler: async (request, reply) => {
      try {
        // Получаем refresh токен из cookie
        const refreshToken = request.cookies.refreshToken;
        
        if (!refreshToken) {
          return reply.code(200).send({ message: 'Already logged out' });
        }
        
        try {
          // Проверяем токен и получаем информацию о пользователе
          const refreshSecret = process.env.JWT_REFRESH_SECRET || 'default_refresh_secret';
          const payload = jwt.verify(refreshToken, refreshSecret) as { userId: number };
          
          // Инвалидируем токен в базе данных
          await authService.invalidateToken(payload.userId);
        } catch (err) {
          // Если токен невалидный, просто игнорируем ошибку
        }
        
        // Очищаем cookie
        reply.clearCookie('refreshToken', {
          path: '/',
          domain: process.env.COOKIE_DOMAIN || undefined
        });
        
        return reply.code(200).send({ message: 'Successfully logged out' });
      } catch (error) {
        return reply.code(500).send({ error: 'Unexpected error during logout' });
      }
    }
  });
} 