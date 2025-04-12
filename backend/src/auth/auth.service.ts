import { createHmac } from 'crypto';
import { PrismaClient, User } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { TelegramUserData, TelegramInitData, TokenPair, InvalidTelegramDataError, UserCreationError, TokenGenerationError } from '../types/telegram';

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

      // Парсим параметры из строки initData
      const params = new URLSearchParams(initData);
      console.log('[Telegram Auth] Parsed params:', Object.fromEntries(params.entries()));

      // Проверяем hash
      const hash = params.get('hash');
      console.log('[Telegram Auth] Hash from params:', hash);
      if (!hash) {
        console.error('[Telegram Auth] Error: Hash is missing');
        throw new InvalidTelegramDataError('Hash is missing');
      }

      // Проверяем auth_date
      const authDate = params.get('auth_date');
      console.log('[Telegram Auth] Auth date from params:', authDate);
      if (!authDate) {
        console.error('[Telegram Auth] Error: Auth date is missing');
        throw new InvalidTelegramDataError('Auth date is missing');
      }

      // Проверяем user data
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
        user = await this.prisma.user.create({
          data: {
            telegramId: String(data.id),
            firstName: data.first_name,
            lastName: data.last_name || '',
            username: data.username || '',
            photoUrl: data.photo_url,
            email: `telegram_${data.id}@example.com`, // Создаем фейковый email для совместимости
            // Добавляем реальные ФИО, если они предоставлены
            realName: realNameData?.realName || '',
            realLastName: realNameData?.realLastName || '',
            realPatronymic: realNameData?.realPatronymic || ''
          }
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
      // Создаем access token (короткий срок жизни)
      const accessToken = jwt.sign(
        { userId: user.id },
        this.accessSecret,
        { expiresIn: '15m' }
      );

      // Создаем refresh token (длинный срок жизни)
      const refreshToken = jwt.sign(
        { userId: user.id, tokenType: 'refresh' },
        this.refreshSecret,
        { expiresIn: '7d' }
      );

      return { accessToken, refreshToken };
    } catch (error) {
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
} 