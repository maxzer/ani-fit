import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

// Расширяем интерфейс FastifyInstance для поддержки jwt
declare module 'fastify' {
  interface FastifyInstance {
    jwt: {
      sign: (payload: any, options?: any) => string;
    };
  }
}

export default async function authController(fastify: FastifyInstance, prisma: PrismaClient) {
  // Вспомогательная функция для создания токена
  function createToken(userId: number): string {
    const secret = process.env.JWT_SECRET || 'default_secret';
    return jwt.sign(
      { userId },
      secret,
      { expiresIn: '30d' }
    );
  }

  // Основные методы аутентификации будут добавлены здесь
} 