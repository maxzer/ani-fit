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

interface TelegramCheckRequest {
  initData: string;
  telegram_data?: any;
  action: string;
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

  // Добавляем маршрут для проверки существования пользователя
  fastify.post<{ Body: TelegramCheckRequest }>('/api/auth/check-user', {
    schema: {
      body: {
        type: 'object',
        required: ['telegram_data', 'action'],
        properties: {
          initData: { type: 'string' },
          telegram_data: { 
            type: 'object',
            required: ['id']
          },
          action: { type: 'string' }
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
        console.log('===== TELEGRAM CHECK USER ENDPOINT START =====');
        console.log('Request body received for check-user');
        console.log('Request headers:', request.headers);
        console.log('Request body:', request.body);
        
        let telegramId = '';
        let isFullyAuthorized = false;
        
        // Шаг 1: Попытка валидировать initData (безопасный путь)
        if (request.body.initData) {
          try {
            // Пытаемся выполнить полную валидацию
            const userData = await authService.validateInitData(request.body.initData);
            telegramId = String(userData.id || '');
            console.log(`Successfully validated initData, telegramId: ${telegramId}`);
            isFullyAuthorized = true;
          } catch (validationError) {
            console.warn('Could not validate initData, will try fallback method:', 
              validationError instanceof Error ? validationError.message : String(validationError));
            // Не выбрасываем ошибку, продолжим с запасным вариантом
          }
        }
        
        // Шаг 2: Если не удалось получить telegramId через валидацию, 
        // используем id из telegram_data (запасной путь)
        if (!telegramId && request.body.telegram_data && request.body.telegram_data.id) {
          telegramId = String(request.body.telegram_data.id);
          console.log(`Using telegram_data.id as fallback: ${telegramId}`);
        }
        
        // Если всё ещё нет telegramId, возвращаем ошибку
        if (!telegramId) {
          console.error('No valid Telegram ID found in request');
          return reply.code(200).send({
            success: false,
            error: 'No valid Telegram ID provided',
            exists: false,
            timestamp: new Date().toISOString()
          });
        }
        
        // Проверяем существование пользователя
        const userExists = await authService.checkUserExistence(telegramId);
        console.log(`User exists in database: ${userExists}`);
        
        // Отправляем результат проверки
        const responseData = {
          exists: userExists,
          telegramId: telegramId,
          success: true,
          isFullyAuthorized, // Флаг указывает, был ли initData валидирован успешно
          timestamp: new Date().toISOString()
        };
        
        console.log('Success response:', responseData);
        return reply.code(200).send(responseData);
      } catch (error) {
        console.error('===== TELEGRAM CHECK USER ERROR =====');
        console.error('Error message:', (error as Error).message);
        console.error('Error stack:', (error as Error).stack);
        
        // Всегда возвращаем код 200 с данными об ошибке, чтобы клиент мог нормально обработать ответ
        return reply.code(200).send({
          success: false,
          error: (error as Error).message,
          exists: false,
          timestamp: new Date().toISOString()
        });
      }
    }
  });

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
        
        // Обработка ошибок - всегда возвращаем код 200 для клиентской обработки
        let errorType = 'Unknown';
        
        if (error instanceof InvalidTelegramDataError) {
          errorType = 'InvalidTelegramData';
        } else if (error instanceof UserCreationError) {
          errorType = 'UserCreation';
        } else if (error instanceof TokenGenerationError) {
          errorType = 'TokenGeneration';
        }
        
        return reply.code(200).send({ 
          success: false, 
          error: (error as Error).message,
          errorType: errorType,
          timestamp: new Date().toISOString()
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