import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  userId: number;
  iat?: number;
  exp?: number;
}

// Простая реализация ограничения запросов (rate limiting)
class RateLimiter {
  private attempts: Map<string, { count: number, resetAt: number }> = new Map();
  public readonly maxAttempts: number;
  private readonly windowMs: number;
  
  constructor(maxAttempts = 10, windowMs = 60000) { // По умолчанию 10 запросов в минуту
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    
    // Очистка старых данных каждую минуту
    setInterval(() => this.cleanup(), 60000);
  }
  
  // Очистка устаревших записей для предотвращения утечки памяти
  private cleanup(): void {
    const now = Date.now();
    for (const [key, data] of this.attempts.entries()) {
      if (now > data.resetAt) {
        this.attempts.delete(key);
      }
    }
  }
  
  // Проверка лимита для IP-адреса
  check(ip: string): { allowed: boolean; remainingAttempts: number; resetAt: Date } {
    const now = Date.now();
    const key = `ip:${ip}`;
    
    // Получаем текущие данные или создаем новые
    let data = this.attempts.get(key);
    if (!data || now > data.resetAt) {
      data = { count: 0, resetAt: now + this.windowMs };
      this.attempts.set(key, data);
    }
    
    // Увеличиваем счетчик
    data.count++;
    
    // Проверяем лимит
    const allowed = data.count <= this.maxAttempts;
    const remainingAttempts = Math.max(0, this.maxAttempts - data.count);
    
    return {
      allowed,
      remainingAttempts,
      resetAt: new Date(data.resetAt)
    };
  }
}

// Создаем лимитеры для разных типов запросов
const authLimiter = new RateLimiter(15, 60000); // 15 попыток авторизации в минуту
const profileLimiter = new RateLimiter(10, 60000); // 10 попыток сохранения профиля в минуту

// Защита от частых запросов авторизации
export function rateLimitMiddleware(request: FastifyRequest, reply: FastifyReply, done: Function) {
  const ip = request.ip || 'unknown';
  const path = request.url;
  
  let limiterResult;
  
  // Выбираем лимитер в зависимости от маршрута
  if (path === '/auth/login' || path === '/api/auth/login') {
    limiterResult = authLimiter.check(ip);
  } else if (path === '/auth/profile' || path === '/api/auth/profile') {
    limiterResult = profileLimiter.check(ip);
  } else {
    done();
    return;
  }
  
  // Добавляем заголовки для информирования клиента о лимитах
  reply.header('X-RateLimit-Limit', authLimiter.maxAttempts);
  reply.header('X-RateLimit-Remaining', limiterResult.remainingAttempts);
  reply.header('X-RateLimit-Reset', limiterResult.resetAt.getTime());
  
  // Если лимит превышен, возвращаем ошибку
  if (!limiterResult.allowed) {
    console.warn(`Rate limit exceeded for IP ${ip} on ${path}`);
    reply.status(429).send({
      success: false,
      error: 'Слишком много запросов. Пожалуйста, повторите попытку позже.',
      retryAfter: Math.ceil((limiterResult.resetAt.getTime() - Date.now()) / 1000)
    });
    return;
  }
  
  done();
}

export function authMiddleware(prisma: PrismaClient) {
  return async (request: any, reply: any, done: any) => {
    try {
      // Получаем токен из заголовка
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return reply.status(401).send({ 
          success: false, 
          error: 'Требуется авторизация' 
        });
      }
      
      // Извлекаем токен из заголовка
      const token = authHeader.split(' ')[1];
      if (!token) {
        return reply.status(401).send({ 
          success: false, 
          error: 'Неверный формат токена авторизации' 
        });
      }
      
      // Проверяем токен
      const secret = process.env.JWT_SECRET || 'default_secret';
      let decoded: JwtPayload;
      
      try {
        decoded = jwt.verify(token, secret) as JwtPayload;
      } catch (err) {
        return reply.status(401).send({ 
          success: false, 
          error: 'Недействительный или истекший токен' 
        });
      }
      
      // Проверяем сессию в базе данных
      const session = await prisma.session.findFirst({
        where: {
          token,
          userId: decoded.userId,
          expiresAt: {
            gt: new Date()
          }
        },
        include: {
          user: true
        }
      });
      
      if (!session) {
        return reply.status(401).send({ 
          success: false, 
          error: 'Сессия не найдена или устарела' 
        });
      }
      
      // Добавляем данные пользователя в запрос
      request.user = session.user;
      
      // Продолжаем обработку запроса
      done();
    } catch (error) {
      console.error('Ошибка аутентификации:', error);
      return reply.status(500).send({ 
        success: false, 
        error: 'Внутренняя ошибка сервера' 
      });
    }
  };
}

// Middleware для обновления токенов
export async function refreshTokens(request: FastifyRequest, reply: FastifyReply, prisma: PrismaClient) {
  try {
    // Получаем refresh токен из cookie
    const refreshToken = request.cookies.refreshToken;
    
    if (!refreshToken) {
      return;
    }
    
    // Проверяем refresh токен
    const refreshSecret = process.env.JWT_REFRESH_SECRET || 'default_refresh_secret';
    const payload = jwt.verify(refreshToken, refreshSecret) as { userId: number, tokenType?: string };
    
    // Проверяем, что это действительно refresh токен
    if (!payload || !payload.userId || payload.tokenType !== 'refresh') {
      return;
    }
    
    // Проверяем, что токен есть в базе данных
    const authRecord = await prisma.auth.findUnique({
      where: { userId: payload.userId },
      include: { user: true }
    });
    
    if (!authRecord || authRecord.refreshToken !== refreshToken) {
      return;
    }
    
    // Генерируем новый access токен
    const accessSecret = process.env.JWT_ACCESS_SECRET || 'default_access_secret';
    const newAccessToken = jwt.sign(
      { userId: payload.userId },
      accessSecret,
      { expiresIn: '15m' }
    );
    
    // Возвращаем новый access токен
    reply.header('X-New-Access-Token', newAccessToken);
  } catch (error) {
    // Если произошла ошибка при обновлении токена, просто продолжаем без обновления
    console.error('Ошибка при обновлении токена:', error);
  }
}

interface AuthMiddlewareOptions {
  excludePaths?: string[];
}

export function registerAuthMiddleware(fastify: FastifyInstance, prisma: PrismaClient, options: AuthMiddlewareOptions = {}) {
  const { excludePaths = [] } = options;

  const middleware = authMiddleware(prisma);
  
  // Сначала проверяем ограничения запросов для защищенных маршрутов
  fastify.addHook('preHandler', (request, reply, done) => {
    // Пропускаем middleware для публичных маршрутов
    const path = request.url;
    if (
      path === '/ping'
    ) {
      done();
      return;
    }
    
    // Проверяем ограничения запросов для маршрутов авторизации и профиля
    if (
      path === '/auth/login' ||
      path === '/auth/profile' ||
      path === '/api/auth/login' ||
      path === '/api/auth/profile'
    ) {
      rateLimitMiddleware(request, reply, done);
      return;
    }
    
    // Пропускаем исключенные пути
    if (excludePaths.includes(path)) {
      done();
      return;
    }
    
    // Для всех остальных маршрутов применяем middleware аутентификации
    middleware(request, reply, done);
  });
  
  // Добавляем middleware для проверки и обновления токенов на каждый запрос
  fastify.addHook('onRequest', async (request, reply) => {
    // Пропускаем исключенные пути
    if (excludePaths.includes(request.routerPath)) {
      return;
    }

    try {
      // Проверяем авторизацию
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ success: false, error: 'Требуется авторизация' });
    }
  });
} 