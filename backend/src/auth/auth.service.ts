import { createHmac } from 'crypto';
import { PrismaClient, User } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { TelegramUserData, TelegramInitData, TokenPair, InvalidTelegramDataError, UserCreationError, TokenGenerationError } from '../types/telegram';
import { verifyTelegramData, extractTelegramUserData } from '../utils/telegram-auth.utils';

export class AuthService {
  private prisma: PrismaClient;
  private botToken: string;
  private accessSecret: string;
  private refreshSecret: string;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    this.accessSecret = process.env.JWT_ACCESS_SECRET || 'default_access_secret';
    this.refreshSecret = process.env.JWT_REFRESH_SECRET || 'default_refresh_secret';

    if (!this.botToken) {
      console.warn('TELEGRAM_BOT_TOKEN not set. Telegram authentication will not work properly.');
    }
  }

  async validateInitData(initData: string): Promise<TelegramUserData> {
    try {
      console.log('[Telegram Auth] Starting validation of initData');
      console.log('[Telegram Auth] Raw initData:', initData);

      // Попытка безопасной валидации с проверкой криптографической подписи
      if (this.botToken) {
        try {
          // Проверяем подпись данных с использованием токена бота
          const validatedData = verifyTelegramData(initData, this.botToken);
          console.log('[Telegram Auth] Verified Telegram data with signature:', validatedData);
          
          if (validatedData.user) {
            return validatedData.user;
          } else {
            throw new InvalidTelegramDataError('User data is missing in verified initData');
          }
        } catch (error) {
          console.warn('[Telegram Auth] Secure validation failed, falling back to basic extraction:', error);
          // Если произошла ошибка валидации подписи, продолжаем с запасным методом
        }
      }

      // Запасной метод (небезопасный) - используется только если нет токена бота или валидация не удалась
      // В продакшене рекомендуется использовать только безопасную валидацию
      
      // Парсим параметры из строки initData
      const params = new URLSearchParams(initData);
      console.log('[Telegram Auth] Parsed params:', Object.fromEntries(params.entries()));

      // Проверяем hash (базовая проверка наличия)
      const hash = params.get('hash');
      console.log('[Telegram Auth] Hash from params:', hash);
      if (!hash) {
        console.error('[Telegram Auth] Error: Hash is missing');
        throw new InvalidTelegramDataError('Hash is missing');
      }

      // Проверяем auth_date (базовая проверка наличия)
      const authDate = params.get('auth_date');
      console.log('[Telegram Auth] Auth date from params:', authDate);
      if (!authDate) {
        console.error('[Telegram Auth] Error: Auth date is missing');
        throw new InvalidTelegramDataError('Auth date is missing');
      }

      // Получаем и парсим данные пользователя
      const userDataStr = params.get('user');
      console.log('[Telegram Auth] User data string:', userDataStr);
      if (!userDataStr) {
        console.error('[Telegram Auth] Error: User data is missing');
        throw new InvalidTelegramDataError('User data is missing');
      }

      try {
        const userData: TelegramUserData = JSON.parse(userDataStr);
        console.log('[Telegram Auth] Parsed user data:', userData);
        return userData;
      } catch (parseError) {
        console.error('[Telegram Auth] Error parsing user data:', parseError);
        throw new InvalidTelegramDataError('Failed to parse user data');
      }
    } catch (error) {
      console.error('[Telegram Auth] Validation error:', error);
      if (error instanceof InvalidTelegramDataError) {
        throw error;
      }
      throw new InvalidTelegramDataError(`Failed to validate initData: ${(error as Error).message}`);
    }
  }

  async findOrCreateUser(data: TelegramUserData, realNameData?: { 
    realName?: string;
    realLastName?: string;
    realPatronymic?: string;
  }): Promise<User> {
    try {
      // Ищем пользователя по telegramId
      let user = await this.prisma.user.findFirst({
        where: { telegramId: String(data.id) }
      });

      if (!user) {
        // Создаем пользователя, если не существует
        // Используем as для приведения типа, так как поля ФИО добавлены в схему Prisma
        const userData: any = {
          telegramId: String(data.id),
          firstName: data.first_name,
          lastName: data.last_name || '',
          username: data.username || '',
          photoUrl: data.photo_url,
          email: `telegram_${data.id}@example.com`, // Создаем фейковый email для совместимости
        };

        // Добавляем реальные ФИО, если они предоставлены
        if (realNameData?.realName) {
          userData.realName = realNameData.realName;
        }
        if (realNameData?.realLastName) {
          userData.realLastName = realNameData.realLastName;
        }
        if (realNameData?.realPatronymic) {
          userData.realPatronymic = realNameData.realPatronymic;
        }

        user = await this.prisma.user.create({
          data: userData
        });
      } else {
        // Обновляем данные пользователя
        const updateData: any = {
          firstName: data.first_name,
          lastName: data.last_name || '',
          username: data.username || '',
          photoUrl: data.photo_url,
        };

        // Добавляем реальные ФИО к обновлению, только если они предоставлены
        if (realNameData?.realName) {
          updateData.realName = realNameData.realName;
        }
        if (realNameData?.realLastName) {
          updateData.realLastName = realNameData.realLastName;
        }
        if (realNameData?.realPatronymic) {
          updateData.realPatronymic = realNameData.realPatronymic;
        }

        user = await this.prisma.user.update({
          where: { id: user.id },
          data: updateData
        });
      }

      return user;
    } catch (error) {
      throw new UserCreationError(`Failed to create/update user: ${(error as Error).message}`);
    }
  }

  generateTokens(user: User): TokenPair {
    try {
      console.log(`Генерация токенов для пользователя ID: ${user.id}`);
      
      // Создаем access token (короткий срок жизни)
      const accessToken = jwt.sign(
        { userId: user.id },
        this.accessSecret,
        { expiresIn: '15m' }
      );
      
      console.log(`Access token создан с секретом: ${this.accessSecret.substring(0, 5)}... и expiresIn: 15m`);
      
      // Для отладки - декодируем токен
      try {
        const decoded = jwt.decode(accessToken);
        console.log(`Декодированный access token:`, decoded);
      } catch (decodeError) {
        console.error(`Ошибка декодирования токена для проверки:`, decodeError);
      }

      // Создаем refresh token (длинный срок жизни)
      const refreshToken = jwt.sign(
        { userId: user.id, tokenType: 'refresh' },
        this.refreshSecret,
        { expiresIn: '7d' }
      );
      
      console.log(`Refresh token создан с секретом: ${this.refreshSecret.substring(0, 5)}... и expiresIn: 7d`);

      return { accessToken, refreshToken };
    } catch (error) {
      console.error(`Ошибка генерации токенов:`, error);
      throw new TokenGenerationError(`Failed to generate tokens: ${(error as Error).message}`);
    }
  }

  async saveRefreshToken(userId: number, refreshToken: string): Promise<void> {
    try {
      // Проверяем, существует ли уже запись Auth для данного пользователя
      const authRecord = await this.prisma.auth.findUnique({ 
        where: { userId } 
      });

      if (authRecord) {
        // Обновляем существующую запись
        await this.prisma.auth.update({
          where: { userId },
          data: {
            refreshToken,
            updatedAt: new Date()
          }
        });
      } else {
        // Создаем новую запись
        await this.prisma.auth.create({
          data: {
            userId,
            refreshToken
          }
        });
      }
    } catch (error) {
      throw new Error(`Failed to save refresh token: ${(error as Error).message}`);
    }
  }

  async invalidateToken(userId: number): Promise<void> {
    try {
      const authRecord = await this.prisma.auth.findUnique({ 
        where: { userId } 
      });
      
      if (authRecord) {
        await this.prisma.auth.update({
          where: { userId },
          data: { refreshToken: null }
        });
      }
    } catch (error) {
      throw new Error(`Failed to invalidate token: ${(error as Error).message}`);
    }
  }

  // Метод для проверки существования пользователя
  async checkUserExistence(telegramId: string): Promise<boolean> {
    try {
      console.log(`[AuthService] Checking existence for telegramId: ${telegramId}`);
      
      // Более тщательная проверка telegramId
      if (!telegramId || telegramId === '' || telegramId === 'undefined' || telegramId === 'null') {
        console.error('[AuthService] Error: Invalid telegramId provided to checkUserExistence:', telegramId);
        return false;
      }
      
      // Дополнительное логирование для отладки
      console.log(`[AuthService] Finding user with telegramId: ${telegramId}`);
      
      // Ищем пользователя по telegramId
      const user = await this.prisma.user.findFirst({
        where: { telegramId: telegramId.toString() }
      });
      
      if (user) {
        console.log(`[AuthService] User found: ID=${user.id}, Name=${user.firstName} ${user.lastName}`);
        return true;
      } else {
        console.log(`[AuthService] User with telegramId ${telegramId} not found in database`);
        return false;
      }
    } catch (error) {
      console.error(`[AuthService] Error checking user existence: ${(error as Error).message}`);
      return false;
    }
  }
} 