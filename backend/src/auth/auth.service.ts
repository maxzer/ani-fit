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
    // Выводим сырую initData в консоль
    console.log('=====================================================');
    console.log('TELEGRAM RAW INIT DATA:', initData);
    console.log('=====================================================');
    
    try {
      // Парсим initData как URLSearchParams
      const params = new URLSearchParams(initData);
      const hash = params.get('hash');
      params.delete('hash');

      if (!hash) {
        throw new InvalidTelegramDataError('Hash is missing');
      }

      // Сортируем параметры по ключу и создаем строку для проверки
      const dataCheckString = Array.from(params.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

      // Создаем секретный ключ из токена бота
      const secretKey = createHmac('sha256', 'WebAppData')
        .update(this.botToken)
        .digest();

      // Вычисляем хеш для проверки
      const calculatedHash = createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

      // Сравниваем хеши
      if (calculatedHash !== hash) {
        throw new InvalidTelegramDataError('Invalid hash');
      }

      // Проверяем срок действия auth_date
      const authDate = parseInt(params.get('auth_date') || '0');
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Данные считаются устаревшими, если прошло более 24 часов
      if (currentTime - authDate > 86400) {
        throw new InvalidTelegramDataError('Auth data is expired');
      }

      // Парсим данные пользователя из параметра user
      const userDataStr = params.get('user');
      if (!userDataStr) {
        throw new InvalidTelegramDataError('User data is missing');
      }

      const userData: TelegramUserData = JSON.parse(userDataStr);
      return userData;
    } catch (error) {
      if (error instanceof InvalidTelegramDataError) {
        throw error;
      }
      throw new InvalidTelegramDataError(`Failed to validate initData: ${(error as Error).message}`);
    }
  }

  async findOrCreateUser(data: TelegramUserData): Promise<User> {
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
          }
        });
      } else {
        // Обновляем данные пользователя
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            firstName: data.first_name,
            lastName: data.last_name || '',
            username: data.username || '',
            photoUrl: data.photo_url,
          }
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