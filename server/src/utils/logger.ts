type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
  context?: string;
  data?: any;
  code?: string;
}

class Logger {
  private static formatMessage(level: LogLevel, message: string, options?: LogOptions): string[] {
    const timestamp = new Date().toISOString();
    const prefix = options?.context ? `[${options.context}]` : '';
    const code = options?.code ? `(${options.code})` : '';
    const baseMessage = `${timestamp} ${level.toUpperCase()} ${prefix} ${code} ${message}`;

    if (options?.data) {
      return [baseMessage, options.data];
    }

    return [baseMessage];
  }

  static debug(message: string, options?: LogOptions): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(...this.formatMessage('debug', message, options));
    }
  }

  static info(message: string, options?: LogOptions): void {
    if (process.env.NODE_ENV === 'development') {
      console.info(...this.formatMessage('info', message, options));
    }
  }

  static warn(message: string, options?: LogOptions): void {
    console.warn(...this.formatMessage('warn', message, options));
  }

  static error(message: string, options?: LogOptions): void {
    console.error(...this.formatMessage('error', message, options));
  }
}

export default Logger;
