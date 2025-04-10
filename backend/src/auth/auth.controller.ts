import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TelegramDataDto } from './dto/telegram-data.dto';
import { verifyTelegramData } from '../utils/telegram';
import { JwtPayload } from '../utils/types';
import { User } from '../utils/decorators';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(private jwtService: JwtService, private usersService: UsersService) {}

  @Post('telegram')
  @HttpCode(HttpStatus.OK)
  async telegramAuth(@Body() telegramData: TelegramDataDto) {
    const isValid = verifyTelegramData(process.env.TELEGRAM_BOT_TOKEN, telegramData);

    if (!isValid) {
      return { error: 'Invalid Telegram data', success: false };
    }

    let user = await this.usersService.findByTelegramId(telegramData.id.toString());

    if (telegramData.first_name || telegramData.last_name || telegramData.username) {
      user = await this.usersService.upsertUser({
        id: user?.id,
        telegramId: telegramData.id.toString(),
        username: telegramData.username || user?.username || `user_${telegramData.id}`,
        firstName: telegramData.first_name || user?.firstName || '',
        lastName: telegramData.last_name || user?.lastName || '',
        photoUrl: telegramData.photo_url || user?.photoUrl,
        authDate: new Date(telegramData.auth_date * 1000),
        email: user?.email || `${telegramData.id}@telegram.user`,
      });

      const payload: JwtPayload = {
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
      };

      const token = this.jwtService.sign(payload);
      return { token, user, success: true };
    } else {
      if (!user) {
        user = await this.usersService.createUser({
          telegramId: telegramData.id.toString(),
          username: `temp_${telegramData.id}`,
          firstName: '',
          lastName: '',
          email: `${telegramData.id}@telegram.temp.user`,
        });
      }

      const payload: JwtPayload = {
        id: user.id,
        telegramId: user.telegramId,
        temp: true,
      };

      const token = this.jwtService.sign(payload, { expiresIn: '1d' });
      return { token, temp: true, success: true };
    }
  }
}