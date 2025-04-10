import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import jwt from 'jsonwebtoken';

// Расширяем интерфейс FastifyInstance для поддержки jwt
declare module 'fastify' {
  interface FastifyInstance {
    jwt?: {
      sign: (payload: any, options?: any) => string;
    };
  }
}

export default async function authController(fastify: FastifyInstance, prisma: PrismaClient) {
  // Базовая проверка данных
  function validateTelegramData(data: any): boolean {
    // Проверка обязательных полей
    if (!data.id || !data.auth_date || !data.hash) {
      console.log('Отсутствуют обязательные поля для валидации');
      return false;
    }
    
    try {
      // Проверка даты авторизации (не более 24 часов)
      const authTime = Number(data.auth_date) * 1000;
      const now = Date.now();
      
      if (now - authTime > 86400 * 1000) {
        console.log('Данные авторизации устарели (более 24 часов)');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Ошибка при валидации данных:', error);
      return false;
    }
  }

  // Проверка данных Telegram через официальный API
  async function verifyTelegramWebAppDataWithAPI(data: any): Promise<boolean> {
    try {
      // Получаем токен бота из переменных окружения
      const token = process.env.TELEGRAM_BOT_TOKEN;
      
      if (!token) {
        console.error('Отсутствует TELEGRAM_BOT_TOKEN в переменных окружения');
        return false;
      }
      
      console.log('Отправка запроса на Telegram API для проверки данных...');
      
      // Формируем данные для запроса
      const initData = Object.entries(data)
        .map(([key, value]) => `${key}=${value}`)
        .join('&');
      
      // URL для проверки данных через Telegram API
      const apiUrl = `https://api.telegram.org/bot${token}/checkWebAppData`;
      
      // Отправляем запрос через axios
      const response = await axios.post(apiUrl, { 
        web_app_data: {
          data: initData,
          button_text: "Login with Telegram"
        }
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000 // Таймаут 5 секунд
      });
      
      // Типизированная проверка ответа от API
      if (response && 
          response.data && 
          typeof response.data === 'object' && 
          'ok' in response.data && 
          'result' in response.data && 
          response.data.ok === true && 
          response.data.result === true) {
        console.log('Данные успешно проверены через API Telegram');
        return true;
      } else {
        console.warn('API Telegram не подтвердил данные:', response.data);
        return false;
      }
    } catch (error) {
      console.error('Ошибка при проверке данных через API Telegram:', error);
      return false;
    }
  }

  // Вспомогательная функция для создания токена
  function createToken(userId: number, telegramId: string): string {
    const secret = process.env.JWT_SECRET || 'default_secret';
    return jwt.sign(
      { userId, telegramId },
      secret,
      { expiresIn: '30d' }
    );
  }

  // Вспомогательная функция для создания временного токена
  function createTempToken(userId: number, telegramId: string): string {
    const secret = process.env.JWT_SECRET || 'default_secret';
    return jwt.sign(
      { userId, telegramId, temp: true },
      secret,
      { expiresIn: '24h' }
    );
  }

  fastify.post('/telegram', async (request: FastifyRequest, reply: FastifyReply) => {
    const clientIp = request.ip;
    console.log(`[AUTH] Получены данные: ${JSON.stringify(request.body)}`);
    const origin = request.headers.origin || 'unknown';
    console.log(`[AUTH] Запрос авторизации от IP: ${clientIp}, origin: ${origin}`);
    
    try {
      console.log('[AUTH] Тело запроса:', JSON.stringify(request.body));
      
      const { telegram_data } = request.body as { telegram_data: any };
      
      if (!telegram_data) {
        console.error('Отсутствуют данные telegram_data в запросе');
        return reply.status(400).send({ error: 'Отсутствуют данные авторизации', success: false });
      }
      
      console.log('[AUTH] Данные Telegram:', JSON.stringify(telegram_data));
      
      // Проверка формата данных
      if (!validateTelegramData(telegram_data)) {
        console.error('Некорректный формат данных Telegram');
        return reply.status(400).send({ error: 'Неверный формат данных', success: false });
      }
      
      // Проверка через API Telegram
      const isValid = await verifyTelegramWebAppDataWithAPI(telegram_data);
      
      if (!isValid) {
        console.error('Данные не прошли проверку через API Telegram');
        return reply.status(401).send({ error: 'Данные не прошли проверку подлинности', success: false });
      }
      
      console.log('Данные успешно прошли проверку через API Telegram');
      
      // Поиск пользователя по Telegram ID
      const telegramId = telegram_data.id.toString();
      
      let user = await prisma.user.findFirst({
        where: { telegramId: telegramId }
      });
      
      // Обработка полной авторизации (с профилем пользователя)
      if (telegram_data.first_name || telegram_data.last_name || telegram_data.username) {
        // Создание или обновление пользователя с полными данными
        user = await prisma.user.upsert({
          where: { id: user?.id ?? 0 },
          update: {
            username: telegram_data.username || user?.username || `user_${telegramId}`,
            firstName: telegram_data.first_name || user?.firstName || '',
            lastName: telegram_data.last_name || user?.lastName || '',
            photoUrl: telegram_data.photo_url || user?.photoUrl || null,
            // Обновляем дату авторизации, если поле существует в схеме
            ...(user && 'authDate' in user ? { authDate: new Date(Number(telegram_data.auth_date) * 1000) } : {})
          },
          create: {
            telegramId,
            username: telegram_data.username || `user_${telegramId}`,
            firstName: telegram_data.first_name || '',
            lastName: telegram_data.last_name || '',
            photoUrl: telegram_data.photo_url || null,
            email: `${telegramId}@telegram.user`,
            // Добавляем дату авторизации только если поле существует в схеме
            ...(true ? {} : { authDate: new Date(Number(telegram_data.auth_date) * 1000) })
          }
        });
        
        // Создание полного токена авторизации с данными пользователя
        const token = fastify.jwt?.sign ? 
          fastify.jwt.sign({
            id: user.id,
            telegramId: user.telegramId,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName
          }, { expiresIn: '30d' }) :
          createToken(user.id, user.telegramId);
        
        return reply.status(200).send({ token, user, success: true });
      } else {
        // Временная авторизация (только Telegram ID, без профиля)
        if (!user) {
          // Создаем временного пользователя
          user = await prisma.user.create({
            data: {
              telegramId,
              username: `temp_${telegramId}`,
              firstName: '',
              lastName: '',
              email: `${telegramId}@telegram.temp.user`
            }
          });
        }
        
        // Создание временного токена с ограниченным сроком
        const token = fastify.jwt?.sign ? 
          fastify.jwt.sign({
            id: user.id,
            telegramId: user.telegramId,
            temp: true
          }, { expiresIn: '1d' }) :
          createTempToken(user.id, user.telegramId);
        
        return reply.status(200).send({ token, temp: true, success: true });
      }
    } catch (error) {
      console.error(`[AUTH] Ошибка при обработке запроса: ${error}`);
      console.error('Ошибка при обработке авторизации:', error);
      return reply.status(500).send({ error: 'Внутренняя ошибка сервера', success: false });
    }
  });
} 