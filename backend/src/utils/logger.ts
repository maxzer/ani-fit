interface LoggerInterface {
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}

class Logger implements LoggerInterface {
  private timestamp(): string {
    return new Date().toISOString();
  }

  private formatArgs(args: any[]): string {
    return args.length
      ? args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : arg)).join(' ')
      : '';
  }

  info(message: string, ...args: any[]): void {
    console.log(`[${this.timestamp()}] INFO: ${message} ${this.formatArgs(args)}`);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`[${this.timestamp()}] WARN: ${message} ${this.formatArgs(args)}`);
  }

  error(message: string, ...args: any[]): void {
    console.error(`[${this.timestamp()}] ERROR: ${message} ${this.formatArgs(args)}`);
  }

  debug(message: string, ...args: any[]): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[${this.timestamp()}] DEBUG: ${message} ${this.formatArgs(args)}`);
    }
  }
}

export const logger = new Logger(); 