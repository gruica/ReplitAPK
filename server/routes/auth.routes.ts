import type { Express } from "express";
import { storage } from "../storage";
import { comparePassword } from "../auth";
import { generateToken, jwtAuthMiddleware } from "../jwt-auth";
import { getBotChallenge, verifyBotAnswer } from "../bot-verification";
import { getRateLimitStatus } from "../rate-limiting";
import { emailVerificationService } from "../email-verification";

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
  
  // JWT Login endpoint - replacing session-based login
  app.post("/api/jwt-login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Korisničko ime i lozinka su obavezni" });
      }
      
      logger.debug(`JWT Login attempt for: ${username}`);
      
      // Find user
      const user = await storage.getUserByUsername(username);
      if (!user) {
        logger.debug(`JWT Login: User ${username} not found`);
        return res.status(401).json({ error: "Neispravno korisničko ime ili lozinka" });
      }
      
      // Check password
      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        logger.debug(`JWT Login: Invalid password for ${username}`);
        return res.status(401).json({ error: "Neispravno korisničko ime ili lozinka" });
      }
      
      // Check if user is verified
      if (!user.isVerified) {
        logger.debug(`JWT Login: User ${username} not verified`);
        return res.status(401).json({ error: "Račun nije verifikovan. Kontaktirajte administratora." });
      }
      
      // Generate JWT token
      const token = generateToken({
        userId: user.id,
        username: user.username,
        role: user.role
      });
      
      logger.info(`JWT Login successful for: ${username} (${user.role})`);
      
      // Return token and user info
      res.json({
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          email: user.email,
          phone: user.phone,
          technicianId: user.technicianId
        },
        token
      });
      
    } catch (error) {
      logger.error("JWT Login error:", error);
      res.status(500).json({ error: "Greška pri prijavljivanju" });
    }
  });

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
        technicianId: user.technicianId
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
