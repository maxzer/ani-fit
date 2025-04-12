import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { AuthService } from './auth.service';
import { InvalidTelegramDataError, TokenGenerationError, UserCreationError } from '../types/telegram';
import jwt from 'jsonwebtoken';

interface TelegramAuthRequest {
  initData: string;
  telegram_data?: any;
  real_name?: string;
  real_lastname?: string;
  real_patronymic?: string;
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
          initData: { type: 'string' },
          real_name: { type: 'string' },
          real_lastname: { type: 'string' },
          real_patronymic: { type: 'string' }
        }
      }
    },
    config: {
      cors: {
        origin: ['https://maxzer.ru', 'https://www.maxzer.ru', 'http://localhost:3000'],
        credentials: true
      }
    },
    handler: async (request, reply) => {
      try {
        console.log('===== TELEGRAM AUTH ENDPOINT START =====');
        console.log('Request headers:', request.headers);
        console.log('Request body:', request.body);
        console.log('RECEIVED INIT DATA:', request.body.initData);
        console.log('RECEIVED REAL NAME:', request.body.real_name);
        console.log('RECEIVED REAL LASTNAME:', request.body.real_lastname);
        console.log('RECEIVED REAL PATRONYMIC:', request.body.real_patronymic);
        console.log('======================================');
        
        // Валидация initData
        let userData;
        try {
          userData = await authService.validateInitData(request.body.initData);
          console.log('Validated user data:', userData);
        } catch (validationError) {
          console.error('Validation error:', validationError);
          throw validationError;
        }
        
        // Найти или создать пользователя
        let user;
        try {
          user = await authService.findOrCreateUser(userData, {
            realName: request.body.real_name,
            realLastName: request.body.real_lastname,
            realPatronymic: request.body.real_patronymic
          });
          console.log('Found/Created user:', user);
        } catch (userError) {
          console.error('User creation error:', userError);
          throw userError;
        }
        
        // Генерация токенов
        let tokens;
        try {
          tokens = authService.generateTokens(user);
          console.log('Generated tokens successfully');
        } catch (tokenError) {
          console.error('Token generation error:', tokenError);
          throw tokenError;
        }
        
        // Сохраняем refresh токен в базу данных
        try {
          await authService.saveRefreshToken(user.id, tokens.refreshToken);
          console.log('Refresh token saved to database');
        } catch (saveError) {
          console.error('Error saving refresh token:', saveError);
          throw saveError;
        }
        
        // Установка cookie для refresh токена
        try {
          console.log('Setting cookie with options:', cookieOptions);
          reply.setCookie('refreshToken', tokens.refreshToken, cookieOptions);
        } catch (cookieError) {
          console.error('Error setting cookie:', cookieError);
          throw cookieError;
        }
        
        // Возвращаем access токен и данные пользователя
        const response = {
          accessToken: tokens.accessToken,
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            photoUrl: user.photoUrl,
            realName: user.realName,
            realLastName: user.realLastName,
            realPatronymic: user.realPatronymic
          }
        };
        console.log('Sending successful response:', response);
        return reply.code(200).send(response);
      } catch (error) {
        console.error('===== TELEGRAM AUTH ERROR =====');
        console.error('Error type:', (error as Error).constructor.name);
        console.error('Error message:', (error as Error).message);
        console.error('Error stack:', (error as Error).stack);
        console.error('==============================');
        
        // Обработка ошибок
        if (error instanceof InvalidTelegramDataError) {
          return reply.code(401).send({ 
            success: false, 
            error: error.message,
            errorType: 'InvalidTelegramData'
          });
        } else if (error instanceof UserCreationError) {
          return reply.code(500).send({ 
            success: false, 
            error: error.message,
            errorType: 'UserCreation'
          });
        } else if (error instanceof TokenGenerationError) {
          return reply.code(500).send({ 
            success: false, 
            error: error.message,
            errorType: 'TokenGeneration'
          });
        }
        
        return reply.code(500).send({ 
          success: false, 
          error: 'Unexpected error',
          errorType: 'Unknown',
          message: (error as Error).message
        });
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