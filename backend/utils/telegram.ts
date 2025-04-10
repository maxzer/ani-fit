import * as crypto from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config();

export function verifyTelegramData(data: { [key: string]: string }): boolean {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error('TELEGRAM_BOT_TOKEN is not defined');
    return false;
  }

  const checkHash = data.hash;
  delete data.hash;

  const dataCheckString = Object.keys(data)
    .sort()
    .map((key) => `${key}=${data[key]}`)
    .join('\n');

  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  return calculatedHash === checkHash;
}