import type { Express, Request, Response, NextFunction } from "express";
import { jwtAuthMiddleware, generateToken } from "../jwt-auth";
import { storage } from "../storage";
import { comparePassword } from "../auth";

/**
 * API v1 Routes
 * 
 * Ovo je wrapper koji omogućava API versioning.
 * - /api/v1/* endpoint-i pokazuju na postojeće /api/* endpoint-e
 * - Postojeći /api/* endpoint-i ostaju netaknuti (backward compatibility)
 * - Spremno za budući /api/v2 kada zatreba
 * 
 * Primjer:
 * - POST /api/v1/jwt-login → poziva postojeći POST /api/jwt-login handler
 * - GET /api/v1/services → poziva postojeći GET /api/services handler
 */

/**
 * Setup API v1 routes as middleware wrapper
 */
export function registerApiV1Routes(app: Express) {
  console.log("🔄 Setting up API v1 versioning...");
  
  // v1 wrapper middleware - redirectuje /api/v1/* na /api/*
  app.use('/api/v1', (req: Request, res: Response, next: NextFunction) => {
    // Prepakuj URL sa /api/v1/... na /api/...
    const originalUrl = req.url;
    req.url = originalUrl; // Ostavi originalni path za API v1
    
    // Dodaj v1 header za tracking
    res.setHeader('X-API-Version', 'v1');
    
    // Nastavi normalno kroz middleware chain
    // Express će automatski pronaći matching route
    next();
  });
  
  /**
   * @swagger
   * /api/v1/jwt-login:
   *   post:
   *     tags: [Authentication - v1]
   *     summary: JWT Login (v1)
   *     description: |
   *       **API Version 1** - Authenticate user and receive JWT token
   *       
   *       This is the versioned endpoint. Identical to /api/jwt-login
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
   *         headers:
   *           X-API-Version:
   *             description: API version used
   *             schema:
   *               type: string
   *               example: v1
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 user:
   *                   $ref: '#/components/schemas/User'
   *                 token:
   *                   type: string
   */
  
  // Dupliciraj postojeće auth route-ove za v1
  // v1 JWT Login - identičan kao /api/jwt-login
  app.post("/api/v1/jwt-login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Korisničko ime i lozinka su obavezni" });
      }
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Neispravno korisničko ime ili lozinka" });
      }
      
      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Neispravno korisničko ime ili lozinka" });
      }
      
      if (!user.isVerified) {
        return res.status(401).json({ error: "Račun nije verifikovan. Kontaktirajte administratora." });
      }
      
      // 🔧 FIX: Add technicianId and supplierId to token
      const token = generateToken({
        userId: user.id,
        username: user.username,
        role: user.role,
        ...(user.supplierId ? { supplierId: user.supplierId } : {}),
        ...(user.technicianId ? { technicianId: user.technicianId } : {})
      });
      
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
      console.error("v1 JWT Login error:", error);
      res.status(500).json({ error: "Greška pri prijavljivanju" });
    }
  });
  
  /**
   * @swagger
   * /api/v1/jwt-user:
   *   get:
   *     tags: [Authentication - v1]
   *     summary: Get current user (v1)
   *     description: |
   *       **API Version 1** - Retrieve authenticated user details
   *       
   *       This is the versioned endpoint. Identical to /api/jwt-user
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: User info retrieved
   *         headers:
   *           X-API-Version:
   *             description: API version used
   *             schema:
   *               type: string
   *               example: v1
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/User'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   */
  
  // v1 JWT User - identičan kao /api/jwt-user
  app.get("/api/v1/jwt-user", jwtAuthMiddleware, async (req, res) => {
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
      console.error("v1 JWT User error:", error);
      res.status(500).json({ error: "Greška pri učitavanju korisnika" });
    }
  });
  
  console.log("✅ API v1 versioning registered");
  console.log("📌 Available: /api/v1/jwt-login, /api/v1/jwt-user");
  console.log("📌 Original endpoints (/api/*) remain unchanged for backward compatibility");
}
