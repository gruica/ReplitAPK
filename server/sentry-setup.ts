/**
 * Sentry Error Monitoring Setup
 * 
 * Automatski prati greške u produkciji i šalje detaljne izvještaje.
 * Aktivira se SAMO u production okruženju.
 */

import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import type { Express } from "express";

/**
 * Inicijalizuje Sentry za backend error monitoring
 */
export function initializeSentry(app: Express) {
  // Aktiviraj SAMO u produkciji
  const isProduction = process.env.NODE_ENV === 'production' || process.env.REPLIT_DEPLOYMENT === 'true';
  
  if (!isProduction) {
    console.log('📊 [SENTRY] Sentry monitoring disabled (development mode)');
    return;
  }

  // Provjeri da li je SENTRY_DSN postavljen
  const sentryDsn = process.env.SENTRY_DSN;
  
  if (!sentryDsn) {
    console.warn('⚠️ [SENTRY] SENTRY_DSN environment variable nije postavljena. Sentry monitoring je onemogućen.');
    console.warn('ℹ️  [SENTRY] Za aktivaciju: Dodajte SENTRY_DSN u Secrets (Tools > Secrets)');
    return;
  }

  try {
    Sentry.init({
      dsn: sentryDsn,
      
      // Environment info
      environment: process.env.REPLIT_DEPLOYMENT ? 'production' : 'development',
      
      // Release tracking (opciono - koristiti git commit hash)
      // release: "servis-todosijevic@" + process.env.REPLIT_DEPLOYMENT_ID,
      
      // Performance Monitoring
      tracesSampleRate: 1.0, // 100% transakcija u produkciji (smanjiti na 0.1 za high-traffic)
      
      // Profiling (CPU, memory tracking)
      profilesSampleRate: 1.0, // 100% profiling (smanjiti na 0.1 za high-traffic)
      
      integrations: [
        // Performance profiling
        nodeProfilingIntegration(),
      ],
      
      // Ignored errors (nisu kritični)
      ignoreErrors: [
        // Browser errors koji dolaze kroz webhooks
        'ResizeObserver loop limit exceeded',
        'Non-Error promise rejection captured',
        // Network timeouts (očekivani)
        'Network request failed',
        'timeout',
        // Neon database reconnection (automatski se oporavlja)
        'Cannot set property message',
      ],
      
      // Before send hook - filtriranje osjetljivih podataka
      beforeSend(event, hint) {
        // Ukloni osjetljive podatke iz breadcrumbs
        if (event.breadcrumbs) {
          event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
            if (breadcrumb.data) {
              // Ukloni password, token, key iz breadcrumbs
              const sanitized: Record<string, any> = { ...breadcrumb.data };
              Object.keys(sanitized).forEach(key => {
                if (key.toLowerCase().includes('password') || 
                    key.toLowerCase().includes('token') ||
                    key.toLowerCase().includes('key') ||
                    key.toLowerCase().includes('secret')) {
                  sanitized[key] = '[REDACTED]';
                }
              });
              breadcrumb.data = sanitized;
            }
            return breadcrumb;
          });
        }
        
        // Ukloni osjetljive podatke iz request data
        if (event.request?.data) {
          const data: any = event.request.data;
          if (typeof data === 'object' && data !== null) {
            Object.keys(data).forEach(key => {
              if (key.toLowerCase().includes('password') || 
                  key.toLowerCase().includes('token') ||
                  key.toLowerCase().includes('key')) {
                data[key] = '[REDACTED]';
              }
            });
          }
        }
        
        return event;
      },
    });

    console.log('✅ [SENTRY] Error monitoring aktivan');
    console.log(`📊 [SENTRY] Environment: ${process.env.REPLIT_DEPLOYMENT ? 'production' : 'development'}`);
    
  } catch (error) {
    console.error('❌ [SENTRY] Greška pri inicijalizaciji Sentry:', error);
  }
}

/**
 * Sentry Request Handler - dodaje se prije svih ruta
 */
export function sentryRequestHandler() {
  return Sentry.setupExpressErrorHandler;
}

/**
 * Sentry Error Handler - dodaje se NAKON svih ruta
 */
export function sentryErrorHandler() {
  return (err: any, req: any, res: any, next: any) => {
    // Prati sve 4xx i 5xx greške
    if (err.status && err.status >= 400) {
      Sentry.captureException(err);
    }
    next(err);
  };
}

/**
 * Ručno logovanje custom greške u Sentry
 */
export function logErrorToSentry(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Logovanje custom poruke u Sentry
 */
export function logMessageToSentry(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>) {
  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Postavljanje korisničkog konteksta (za praćenje ko je dobio grešku)
 */
export function setSentryUser(userId: number, username: string, role?: string) {
  Sentry.setUser({
    id: userId.toString(),
    username,
    role,
  });
}

/**
 * Brisanje korisničkog konteksta (logout)
 */
export function clearSentryUser() {
  Sentry.setUser(null);
}

// Export Sentry za direktnu upotrebu
export { Sentry };
