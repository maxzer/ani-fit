export interface TelegramUserData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
}

export interface TelegramInitData {
  query_id?: string;
  user?: TelegramUserData;
  auth_date: number;
  hash: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class InvalidTelegramDataError extends Error {
  constructor(message: string = 'Invalid Telegram data') {
    super(message);
    this.name = 'InvalidTelegramDataError';
  }
}

export class UserCreationError extends Error {
  constructor(message: string = 'Error creating user') {
    super(message);
    this.name = 'UserCreationError';
  }
}

export class TokenGenerationError extends Error {
  constructor(message: string = 'Error generating tokens') {
    super(message);
    this.name = 'TokenGenerationError';
  }
} 