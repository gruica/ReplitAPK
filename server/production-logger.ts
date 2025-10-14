/**
 * Production-Ready Logger
 * Automatski disabluje debug logove u produkciji
 */

const isProduction = process.env.REPLIT_DEPLOYMENT === 'true' || process.env.NODE_ENV === 'production';

export const logger = {
  // Debug logovi - samo u development
  debug: (...args: any[]) => {
    if (!isProduction) {
      console.log('[DEBUG]', ...args);
    }
  },

  // Info logovi - samo u development
  info: (...args: any[]) => {
    if (!isProduction) {
      console.log('[INFO]', ...args);
    }
  },

  // Warning logovi - uvek prikazuj
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args);
  },

  // Error logovi - uvek prikazuj
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  },

  // Kritični logovi - uvek prikazuj
  critical: (...args: any[]) => {
    console.error('[CRITICAL]', ...args);
  },

  // Success logovi - samo važni u produkciji
  success: (...args: any[]) => {
    if (!isProduction) {
      console.log('[SUCCESS]', ...args);
    }
  },

  // Sistem logovi - uvek prikazuj (startup, shutdown, health checks)
  system: (...args: any[]) => {
    console.log('[SYSTEM]', ...args);
  },

  // Performance logovi - samo u development
  performance: (message: string, duration: number, ...args: any[]) => {
    if (!isProduction) {
      console.log(`[PERFORMANCE] ${message}: ${duration}ms`, ...args);
    }
  },

  // Database logovi - samo u development
  database: (...args: any[]) => {
    if (!isProduction) {
      console.log('[DATABASE]', ...args);
    }
  },

  // Security logovi - uvek prikazuj (važno za sigurnost)
  security: (...args: any[]) => {
    console.log('[SECURITY]', ...args);
  },

  // API logovi - samo u development
  api: (method: string, path: string, status: number, duration: number) => {
    if (!isProduction) {
      console.log(`[API] ${method} ${path} ${status} in ${duration}ms`);
    }
  }
};

// Default export
export default logger;
