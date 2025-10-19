import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import NodeCache from "node-cache";
import { registerAllRoutes } from "./routes/index";

import { setupVite, serveStatic, log } from "./vite";
import { maintenanceService } from "./maintenance-service";
import { setupAuth } from "./auth";
import { complusCronService } from "./complus-cron-service";
import { ServisKomercCronService } from "./servis-komerc-cron-service";
import { BekoCronService } from "./beko-cron-service.js";
import { backupCronService } from "./backup-cron-service.js";

const servisKomercCronService = new ServisKomercCronService();
const bekoCronService = BekoCronService.getInstance();

import { storage } from "./storage";
// Mobile SMS Service has been completely removed

const app = express();

// PERFORMANCE: Kreiranje cache instance za optimizaciju
const cache = new NodeCache({ 
  stdTTL: 300, // 5 minuta default TTL
  checkperiod: 120, // Proverava expired keys svakih 2 minuta
  useClones: false // Bolje performanse, ali paziti na mutiranje objekata
});

// Export cache za korišćenje u drugim modulima
export { cache };

// Omogući trust proxy za Replit
app.set('trust proxy', 1);

// PERFORMANCE: Compression middleware za smanjivanje response veličine
app.use(compression({
  level: 6, // Balans između brzine i kompresije
  threshold: 1024, // Kompresuj samo response-e veće od 1KB
  filter: (req: express.Request, res: express.Response) => {
    // Ne kompresuj ako je client zahtevao da se ne kompresuje
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Kompresuj sve što compression middleware podržava
    return compression.filter(req, res);
  }
}));

// SECURITY: Helmet middleware za dodatne security headers
app.use(helmet({
  contentSecurityPolicy: false, // Jer imamo custom CSP
  crossOriginEmbedderPolicy: false, // Za Replit embedding
  frameguard: { action: 'deny' }, // Sprečava clickjacking
  hsts: {
    maxAge: 31536000, // 1 godina
    includeSubDomains: true,
    preload: true
  },
  noSniff: true, // Sprečava MIME type sniffing
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true // XSS zaštita
}));

// SECURITY: Globalni rate limiting za sve API pozive
const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuta
  max: 1000, // Maksimalno 1000 zahteva po IP-u za 15 minuta
  message: {
    error: 'Previše zahteva',
    message: 'Molimo sačekajte pre slanja novih zahteva.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Preskoči rate limit za statičke fajlove
    return req.url.startsWith('/assets/') || 
           req.url.startsWith('/images/') ||
           req.url.endsWith('.css') ||
           req.url.endsWith('.js') ||
           req.url.endsWith('.ico');
  }
});

// Primeni globalni rate limit na sve rute
app.use(globalRateLimit);

// GLOBALNI CSP MIDDLEWARE - MORA BITI PRE VITE SETUP-A
app.use((req, res, next) => {
  // Postavi CSP frame-ancestors header za sve Replit domene
  res.header('Content-Security-Policy', 'frame-ancestors \'self\' https://replit.com https://*.replit.com https://*.replit.dev https://*.repl.co https://*.id.repl.co https://*.riker.replit.dev http://127.0.0.1:5000');
  next();
});

// PRVO postavi JSON body parser middleware sa povećanim limitom za Base64 fotografije
app.use(express.json({ limit: '10mb' })); // Povećano sa default 1mb na 10mb za Base64 fotografije
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// SECURITY: Input validation i sanitization middleware
app.use((req, res, next) => {
  // Logujem suspicious aktivnosti - izbegavam false positives za user agents
  const suspiciousPatterns = [
    /(\<script.*?\>)|(\<\/script\>)/gi, // XSS script tags
    /((\%3C)|<)((\%2F)|\/)*[a-z0-9\%]+((\%3E)|>)/gi, // XSS encoded
    /((\%3C)|<)[^\n]+((\%3E)|>)/gi, // HTML tags
    /\b(union\s+select|drop\s+table|delete\s+from|insert\s+into)\b/gi, // SQL injection multi-word keywords only
    /\.\.\//gi, // Directory traversal (samo sa /)
    /((\%2E)|\.){2}\//gi // Directory traversal encoded (samo sa /)
  ];

  let hasSuspiciousInput = false;
  
  const checkSuspicious = (obj: any, path = '') => {
    if (hasSuspiciousInput) return; // Ako je već pronađen, prekini proveru
    
    if (typeof obj === 'string') {
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(obj)) {
          console.warn(`🔒 [SECURITY] Suspicious input detected at ${path}: ${obj.substring(0, 100)}`);
          hasSuspiciousInput = true;
          return;
        }
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const key of Object.keys(obj)) {
        checkSuspicious(obj[key], `${path}.${key}`);
        if (hasSuspiciousInput) return;
      }
    }
  };

  // Proverim body, query i params
  if (req.body) checkSuspicious(req.body, 'body');
  if (!hasSuspiciousInput && req.query) checkSuspicious(req.query, 'query');
  if (!hasSuspiciousInput && req.params) checkSuspicious(req.params, 'params');

  if (hasSuspiciousInput) {
    return res.status(400).json({
      error: 'Nevaljan input',
      message: 'Zahtev sadrži nedozvoljene karaktere.'
    });
  }

  next();
});

// ZATIM CORS middleware za omogućavanje cookies
app.use((req, res, next) => {
  // Lista dozvoljenih origin-a za APK i web pristup
  const allowedOrigins = [
    'https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev', // Development Replit
    'https://tehnikamne.me', // Production domen
    'https://www.tehnikamne.me', // Production domen sa www
    'http://127.0.0.1:5000', // Local development
    'http://localhost:5000' // Local development alternativa
  ];
  
  const requestOrigin = req.headers.origin || req.headers.referer;
  let allowedOrigin = allowedOrigins[0]; // Default fallback
  
  // Proveri da li je origin u listi dozvoljenih - SECURITY FIX: Exact match only
  if (requestOrigin) {
    // Parse both origins to compare exact hostnames
    try {
      const requestUrl = new URL(requestOrigin);
      const isAllowed = allowedOrigins.some(origin => {
        const allowedUrl = new URL(origin);
        return requestUrl.hostname === allowedUrl.hostname && requestUrl.protocol === allowedUrl.protocol;
      });
      if (isAllowed) {
        // Use only origin (scheme + host) to prevent path injection
        allowedOrigin = requestUrl.origin;
      }
    } catch (error) {
      // Invalid URL - deny by default
      console.warn(`🚨 [SECURITY] Invalid origin blocked: ${requestOrigin}`);
    }
  }
  
  res.header('Access-Control-Allow-Origin', allowedOrigin);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  // CSP header za iframe embedding će biti postavljen nakon Vite setup-a
  
  // CORS debug logging removed completely
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
});

// NAKON body parser-a postavi session middleware
setupAuth(app);

// Session middleware je konfigurisan u setupAuth()

// JEDNOSTAVAN ENDPOINT ZA SERVIRANJE SLIKA DIREKTNO OVDE
app.get('/uploads/:fileName', async (req, res) => {
  const fs = await import('fs');
  const path = await import('path');
  const fileName = req.params.fileName;
  const filePath = path.join(process.cwd(), 'uploads', fileName);
  
  // Development only logging
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📷 Serving image: ${fileName}`);
  }
  
  if (!fs.existsSync(filePath)) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📷 Image not found: ${filePath}`);
    }
    return res.status(404).send('Image not found');
  }
  
  try {
    const ext = path.extname(fileName).toLowerCase();
    let contentType = 'image/jpeg';
    if (ext === '.webp') contentType = 'image/webp';
    else if (ext === '.png') contentType = 'image/png';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📷 ✅ Image served: ${fileName}`);
    }
    
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`📷 ❌ Error serving image:`, error);
    }
    res.status(500).send('Error serving image');
  }
});

// API logging middleware - optimized for production
app.use((req, res, next) => {
  // Skip logging for health check endpoints to improve performance
  if (req.path === '/health' || req.path === '/api/health') {
    return next();
  }

  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    // Only capture response in development mode
    if (process.env.NODE_ENV !== 'production') {
      capturedJsonResponse = bodyJson;
    }
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      // Only include response data in development
      if (capturedJsonResponse && process.env.NODE_ENV !== 'production') {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Mobile SMS Service has been completely removed
  
  // Auto-wake Neon database if suspended (5min inactivity auto-suspends)
  const { wakeNeonDatabase } = await import('./db.js');
  await wakeNeonDatabase();
  
  // Auto-verify test users ONLY in development mode
  if (process.env.NODE_ENV !== 'production') {
    try {
      const testUsernames = ['test_admin', 'test_supplier', 'test_technician', 'test_business'];
      for (const username of testUsernames) {
        const user = await storage.getUserByUsername(username);
        if (user && !user.isVerified) {
          await storage.verifyUser(user.id, 1); // Auto-verify with system admin ID
          console.log(`✅ [DEV ONLY] Auto-verified test user: ${username}`);
        }
        
        // Special handling for test_technician - assign first available technicianId
        if (username === 'test_technician' && user && !user.technicianId) {
          const technicians = await storage.getAllTechnicians();
          if (technicians && technicians.length > 0) {
            await storage.updateUser(user.id, { technicianId: technicians[0].id });
            console.log(`✅ [DEV ONLY] Assigned technicianId ${technicians[0].id} to test_technician`);
          }
        }
      }
    } catch (error) {
      console.error('[DEV ONLY] ⚠️ Failed to auto-verify test users:', error);
    }
  }
  
  // Register all modular routes
  registerAllRoutes(app);
  
  // 📚 SWAGGER/OpenAPI DOCUMENTATION
  const { setupSwagger } = await import('./swagger.js');
  setupSwagger(app);
  
  // Create HTTP server for WebSocket support
  const { createServer } = await import('http');
  const server = createServer(app);
  
  // 🛡️ GLOBAL ERROR HANDLER - MORA BITI PRIJE VITE SETUP-A ALI POSLIJE ROUTES
  // Hvata sve greške koje nisu pokrivene try-catch blokovima
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    // Logiraj grešku sa detaljima
    console.error('🚨 [GLOBAL ERROR HANDLER]:', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      status: err.status || err.statusCode || 500
    });

    // Pošalji odgovor klijentu
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ 
      error: message,
      ...(app.get("env") === "development" && { stack: err.stack }) // Stack trace samo u development
    });
    
    // VAŽNO: NE bacaj grešku ponovo - to bi srušilo server!
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
  const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '0.0.0.0';
  
  server.listen({
    port,
    host,
    reusePort: true,
  }, () => {
    log(`serving on ${host}:${port} (env: ${app.get("env")})`);
    
    // Pokreni servis za automatsko održavanje sa error handling-om
    try {
      maintenanceService.start();
      log("Servis za održavanje je pokrenut");
    } catch (error) {
      console.error("Greška pri pokretanju servisa za održavanje:", error);
      // Aplikacija i dalje može da radi bez servisa za održavanje
    }

    // Pokreni ComPlus automatske izveštaje
    try {
      complusCronService.start();
      log("ComPlus automatski izveštaji pokrenuti");
    } catch (error) {
      console.error("Greška pri pokretanju ComPlus cron servisa:", error);
      // Aplikacija i dalje može da radi bez ComPlus cron servisa
    }

    // Pokreni Servis Komerc automatske izveštaje
    try {
      servisKomercCronService.start();
      log("Servis Komerc automatski izveštaji pokrenuti");
    } catch (error) {
      console.error("Greška pri pokretanju Servis Komerc cron servisa:", error);
      // Aplikacija i dalje može da radi bez Servis Komerc cron servisa
    }

    // Pokreni Beko automatske izveštaje
    try {
      bekoCronService.start();
      log("Beko automatski izveštaji pokrenuti");
    } catch (error) {
      console.error("Greška pri pokretanju Beko cron servisa:", error);
      // Aplikacija i dalje može da radi bez Beko cron servisa
    }

    // Pokreni Storage Optimization cron job-ove
    (async () => {
      try {
        const { StorageOptimizationCron } = await import('./storage-optimization-cron');
        StorageOptimizationCron.startAll();
        log("Storage optimization cron job-ovi pokrenuti");
      } catch (error) {
        console.error("Greška pri pokretanju Storage optimization cron servisa:", error);
        // Aplikacija i dalje može da radi bez Storage optimization cron servisa
      }
    })();
  });

  // PROFESSIONAL GRACEFUL SHUTDOWN HANDLER - DODANO NA KRAJ
  // Replit best practices za čist restart aplikacije
  let isShuttingDown = false;
  
  function gracefulShutdown(signal: string) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    console.log(`🔄 [SHUTDOWN] Received ${signal}. Gracefully shutting down server...`);
    
    server.close(() => {
      console.log('✅ [SHUTDOWN] HTTP server closed');
      
      // Close database connections
      (async () => {
        try {
          const { pool } = await import('./db.js');
          await pool.end();
          console.log('✅ [SHUTDOWN] Database connections closed');
        } catch (error) {
          console.error('❌ [SHUTDOWN] Error closing database:', error);
        }
        
        // Exit gracefully
        console.log('✅ [SHUTDOWN] Process terminated cleanly');
        process.exit(0);
      })();
    });
    
    // Force shutdown after 10 seconds if graceful shutdown fails
    setTimeout(() => {
      console.error('❌ [SHUTDOWN] Forcing shutdown after timeout');
      process.exit(1);
    }, 10000);
  }

  // Register shutdown handlers for various signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // For Replit restarts
  
  // Handle uncaught exceptions and unhandled rejections
  process.on('uncaughtException', (error) => {
    console.error('❌ [UNCAUGHT EXCEPTION]:', error);
    
    // Don't shutdown on Neon database errors - they're usually temporary
    const errorMessage = error.message || '';
    const errorStack = error.stack || '';
    
    if (errorMessage.includes('Cannot set property message') && 
        errorStack.includes('@neondatabase/serverless')) {
      console.log('🔧 [DATABASE] Ignoring known Neon database error - continuing operation');
      return;
    }
    
    // Only shutdown on severe errors that are not database-related
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ [UNHANDLED REJECTION] at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
  });

})();
