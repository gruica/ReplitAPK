import type { Express } from "express";
import { storage } from "../storage";
import { comparePassword } from "../auth";
import { generateToken, jwtAuthMiddleware } from "../jwt-auth";
import { getBotChallenge, verifyBotAnswer } from "../bot-verification";
import { getRateLimitStatus } from "../rate-limiting";
import { emailVerificationService } from "../email-verification";
import rateLimit from "express-rate-limit";

// Production logger for clean deployment
class ProductionLogger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  
  debug(message: string, ...args: any[]) {
    if (this.isDevelopment) {
      console.log(message, ...args);
    }
  }
  
  info(message: string, ...args: any[]) {
    if (this.isDevelopment) {
      console.info(message, ...args);
    }
  }
  
  warn(message: string, ...args: any[]) {
    console.warn(message, ...args);
  }
  
  error(message: string, ...args: any[]) {
    console.error(message, ...args);
  }
  
  security(message: string, ...args: any[]) {
    // Always log security events
    console.log(`[SECURITY] ${message}`, ...args);
  }
}

const logger = new ProductionLogger();

// 🔒 SECURITY: Rate limiter za JWT login endpoint - zaštita od brute force napada
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuta
  max: 5, // Maksimalno 5 pokušaja prijave po IP adresi
  message: {
    error: 'Previše pokušaja prijave',
    message: 'Molimo sačekajte 15 minuta prije ponovnog pokušaja.'
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.security(`🚨 Rate limit exceeded for login attempt from IP: ${req.ip}`);
    res.status(429).json({
      error: 'Previše pokušaja prijave',
      message: 'Molimo sačekajte 15 minuta prije ponovnog pokušaja.'
    });
  }
});

/**
 * Authentication Routes
 * - JWT Login
 * - JWT User Info
 * - Bot Verification
 * - Email Verification
 * - Rate Limiting
 */
export function registerAuthRoutes(app: Express) {
  // Security routes - Bot verification and rate limiting
  app.get("/api/security/bot-challenge", getBotChallenge);
  app.post("/api/security/verify-bot", verifyBotAnswer);
  app.get("/api/security/rate-limit-status", getRateLimitStatus);
  
  /**
   * @swagger
   * /api/jwt-login:
   *   post:
   *     tags: [Authentication]
   *     summary: JWT Login
   *     description: Authenticate user and receive JWT token (30-day expiration)
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [username, password]
   *             properties:
   *               username:
   *                 type: string
   *                 example: admin
   *               password:
   *                 type: string
   *                 format: password
   *                 example: admin123
   *     responses:
   *       200:
   *         description: Login successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 user:
   *                   $ref: '#/components/schemas/User'
   *                 token:
   *                   type: string
   *                   description: JWT Bearer token
   *       401:
   *         description: Invalid credentials or user not verified
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  // JWT Login endpoint - replacing session-based login
  // 🔒 SECURITY: Rate limiter applied - max 5 attempts per 15 minutes
  app.post("/api/jwt-login", loginRateLimiter, async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Korisničko ime i lozinka su obavezni" });
      }
      
      // 🔒 SECURITY: Ne logujemo username zbog sigurnosnih razloga
      logger.debug(`JWT Login attempt from IP: ${req.ip}`);
      
      // Find user
      console.log('[JWT LOGIN DEBUG] Looking up username:', username);
      
      // DEBUG: Try finding by ID first to verify Drizzle works
      if (username === 'servis@eurotehnikamn.me') {
        const testUser = await storage.getUser(65);
        console.log('[JWT LOGIN DEBUG] Test getUser(65):', testUser ? `Found: ${testUser.username}` : 'Not found');
      }
      
      const user = await storage.getUserByUsername(username);
      console.log('[JWT LOGIN DEBUG] User lookup result:', user ? `Found user: ${user.username}` : 'User not found');
      if (!user) {
        logger.debug(`JWT Login: User not found`);
        return res.status(401).json({ error: "Neispravno korisničko ime ili lozinka" });
      }
      
      // Check password
      console.log('[JWT LOGIN DEBUG] Checking password. Stored hash:', user.password.substring(0, 20) + '...');
      const isPasswordValid = await comparePassword(password, user.password);
      console.log('[JWT LOGIN DEBUG] Password valid:', isPasswordValid);
      if (!isPasswordValid) {
        logger.debug(`JWT Login: Invalid password`);
        return res.status(401).json({ error: "Neispravno korisničko ime ili lozinka" });
      }
      
      // Check if user is verified
      if (!user.isVerified) {
        logger.debug(`JWT Login: User not verified`);
        return res.status(401).json({ error: "Račun nije verifikovan. Kontaktirajte administratora." });
      }
      
      // 🔧 FIX: Validate technician has technicianId
      if (user.role === "technician" && !user.technicianId) {
        logger.error(`Technician ${user.username} missing technicianId in database`);
        return res.status(401).json({ 
          error: "Greška u konfiguraciji naloga. Kontaktirajte administratora." 
        });
      }
      
      // Generate JWT token with supplierId and technicianId for optimized auth
      // 🔧 FIX: Pass values directly without conversion
      const token = generateToken({
        userId: user.id,
        username: user.username,
        role: user.role,
        ...(user.supplierId && { supplierId: user.supplierId }),
        ...(user.technicianId && { technicianId: user.technicianId })
      });
      
      // 🔒 SECURITY: Logujemo samo ulogu, ne i username
      logger.info(`JWT Login successful: role=${user.role}, ip=${req.ip}`);
      
      // Return token and user info
      res.json({
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          email: user.email,
          phone: user.phone,
          technicianId: user.technicianId,
          supplierId: user.supplierId
        },
        token
      });
      
    } catch (error) {
      logger.error("JWT Login error:", error);
      res.status(500).json({ error: "Greška pri prijavljivanju" });
    }
  });

  /**
   * @swagger
   * /api/jwt-user:
   *   get:
   *     tags: [Authentication]
   *     summary: Get current user info
   *     description: Retrieve authenticated user details using JWT token
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: User info retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/User'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       404:
   *         description: User not found
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  // JWT User info endpoint
  app.get("/api/jwt-user", jwtAuthMiddleware, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "Korisnik nije pronađen" });
      }
      
      res.json({
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        email: user.email,
        phone: user.phone,
        technicianId: user.technicianId,
        supplierId: user.supplierId
      });
    } catch (error) {
      logger.error("JWT User info error:", error);
      res.status(500).json({ error: "Greška pri dobijanju korisničkih podataka" });
    }
  });

  // Email verification routes
  app.post("/api/email/send-verification", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ 
          success: false, 
          message: "Email adresa je obavezna." 
        });
      }

      const result = await emailVerificationService.sendVerificationEmail(email);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      logger.error("Greška pri slanju verifikacijskog email-a:", error);
      res.status(500).json({ 
        success: false, 
        message: "Greška servera pri slanju verifikacijskog koda." 
      });
    }
  });

  app.post("/api/email/verify-code", async (req, res) => {
    try {
      const { email, code } = req.body;
      
      if (!email || !code) {
        return res.status(400).json({ 
          success: false, 
          message: "Email adresa i kod su obavezni." 
        });
      }

      const result = await emailVerificationService.verifyEmail(email, code);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      logger.error("Greška pri verifikaciji email-a:", error);
      res.status(500).json({ 
        success: false, 
        message: "Greška servera pri verifikaciji koda." 
      });
    }
  });

  app.get("/api/email/verify-status/:email", async (req, res) => {
    try {
      const { email } = req.params;
      
      if (!email) {
        return res.status(400).json({ 
          success: false, 
          message: "Email adresa je obavezna." 
        });
      }

      const isVerified = await emailVerificationService.isEmailVerified(email);
      
      res.json({ 
        success: true, 
        isVerified 
      });
    } catch (error) {
      logger.error("Greška pri proveri verifikacije:", error);
      res.status(500).json({ 
        success: false, 
        message: "Greška servera pri proveri verifikacije." 
      });
    }
  });

  console.log("✅ Auth routes registered");
}
