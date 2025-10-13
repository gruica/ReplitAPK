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
  }
};

// Default export
export default logger;
