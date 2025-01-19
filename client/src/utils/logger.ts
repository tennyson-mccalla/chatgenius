import { isDev } from '../config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
  context?: string;
  data?: any;
  code?: string;
  rateLimit?: number; // Rate limit in milliseconds
}

class Logger {
  private static messageTimestamps: Map<string, number> = new Map();
  private static LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };
  private static currentLogLevel: LogLevel = isDev ? 'debug' : 'warn';

  private static shouldLog(level: LogLevel, message: string, options?: LogOptions): boolean {
    // Check log level
    if (this.LOG_LEVELS[level] < this.LOG_LEVELS[this.currentLogLevel]) {
      return false;
    }

    // Check rate limiting
    if (options?.rateLimit) {
      const key = `${level}:${options.context}:${message}`;
      const lastLog = this.messageTimestamps.get(key) || 0;
      const now = Date.now();

      if (now - lastLog < options.rateLimit) {
        return false;
      }

      this.messageTimestamps.set(key, now);
    }

    return true;
  }

  private static formatMessage(level: LogLevel, message: string, options?: LogOptions): string[] {
    const timestamp = new Date().toISOString();
    const prefix = options?.context ? `[${options.context}]` : '';
    const code = options?.code ? `(${options.code})` : '';
    const baseMessage = `${timestamp} ${prefix} ${code} ${message}`;

    if (options?.data) {
      // For objects, only include essential properties or truncate large data
      const sanitizedData = this.sanitizeData(options.data);
      return [baseMessage, sanitizedData];
    }

    return [baseMessage];
  }

  private static sanitizeData(data: any): any {
    if (!data) return data;

    // If it's a simple value, return as is
    if (typeof data !== 'object') return data;

    // For objects, create a safe copy
    const safe = { ...data };

    // Remove sensitive or verbose fields
    delete safe.token;
    delete safe.password;

    // Truncate large arrays or objects
    Object.keys(safe).forEach(key => {
      if (Array.isArray(safe[key]) && safe[key].length > 3) {
        safe[key] = safe[key].slice(0, 3).concat(['...']);
      }
    });

    return safe;
  }

  static setLogLevel(level: LogLevel): void {
    this.currentLogLevel = level;
  }

  static debug(message: string, options?: LogOptions): void {
    if (this.shouldLog('debug', message, options)) {
      console.debug(...this.formatMessage('debug', message, options));
    }
  }

  static info(message: string, options?: LogOptions): void {
    if (this.shouldLog('info', message, options)) {
      console.info(...this.formatMessage('info', message, options));
    }
  }

  static warn(message: string, options?: LogOptions): void {
    if (this.shouldLog('warn', message, options)) {
      console.warn(...this.formatMessage('warn', message, options));
    }
  }

  static error(message: string, options?: LogOptions): void {
    if (this.shouldLog('error', message, options)) {
      console.error(...this.formatMessage('error', message, options));
    }
  }
}

export default Logger;
