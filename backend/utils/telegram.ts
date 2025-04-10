import * as crypto from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config();

export function verifyTelegramData(data: any): boolean {
  console.log('Received data:', data);
  console.log('TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN);
  console.log('Starting verifyTelegramData function');

  if (!data) {
    console.error('Data is empty!');
    return false;
  }

  const requiredFields = ['hash', 'auth_date', 'id', 'first_name', 'username'];
  for (const field of requiredFields) {
    if (!data[field]) {
        console.error(`Missing field: ${field}`);
      return false;
    }
  }

  const secret = process.env.TELEGRAM_BOT_TOKEN;
  if (!secret) {
    console.error('TELEGRAM_BOT_TOKEN is not set!');
    return false;
  }
    const dataCheckString = Object.keys(data)
        .filter(key => key !== 'hash')
        .sort()
        .map(key => `${key}=${data[key]}`)
        .join('\n');

    console.log('Data check string:', dataCheckString)

  const hmac = crypto
    .createHmac('sha256', secret)
    .update(dataCheckString)
    .digest('hex');
    console.log('Calculated hash:', hmac);
    console.log('Received hash:', data.hash);

  const isValid = hmac === data.hash;
  console.log('Is valid:', isValid);

  return isValid;
}