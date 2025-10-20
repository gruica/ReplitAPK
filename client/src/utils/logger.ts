/**
 * Production-ready logger for frontend
 * 
 * Usage:
 *   import { logger } from '@/utils/logger';
 *   logger.log('User logged in', { userId: 123 });
 *   logger.warn('API call slow', { duration: 5000 });
 *   logger.error('Failed to fetch data', { error });
 */

const isDevelopment = import.meta.env.DEV;

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: string;
}

class Logger {
  private shouldLog(level: LogLevel): boolean {
    if (isDevelopment) {
      return true;
    }
    
    // In production, only log warnings and errors
    return level === 'warn' || level === 'error';
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${level.toUpperCase()}] ${timestamp}`;
    
    if (data !== undefined) {
      return `${prefix} ${message}`;
    }
    
    return `${prefix} ${message}`;
  }

  private sendToBackend(entry: LogEntry): void {
    // Only send errors and warnings to backend in production
    if (!isDevelopment && (entry.level === 'error' || entry.level === 'warn')) {
      try {
        fetch('/api/analytics/frontend-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry)
        }).catch(() => {
          // Silently fail if backend logging fails
        });
      } catch {
        // Silently fail
      }
    }
  }

  log(message: string, ...args: any[]): void {
    if (this.shouldLog('log')) {
      console.log(this.formatMessage('log', message, args.length > 0 ? args[0] : undefined), ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, args.length > 0 ? args[0] : undefined), ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, args.length > 0 ? args[0] : undefined), ...args);
      this.sendToBackend({
        level: 'warn',
        message,
        data: args,
        timestamp: new Date().toISOString()
      });
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, args.length > 0 ? args[0] : undefined), ...args);
      this.sendToBackend({
        level: 'error',
        message,
        data: args,
        timestamp: new Date().toISOString()
      });
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, args.length > 0 ? args[0] : undefined), ...args);
    }
  }
}

export const logger = new Logger();
