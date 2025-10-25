/**
 * MODULARNI ROUTES ZA AUTENTIFIKACIJU I VERIFIKACIJU
 * 
 * Endpoints:
 * - POST /api/auth/send-email-verification - Šalje email verifikacijski kod
 * - POST /api/auth/verify-email - Verifikuje email kod
 * - POST /api/auth/send-password-reset - Šalje password reset kod
 * - POST /api/auth/reset-password - Resetuje lozinku sa kodom
 * 
 * Odvojen od glavnih auth routes za bolju organizaciju
 */

import { Router, Request, Response } from "express";
import { emailVerificationService } from "../email-verification";
import { passwordResetService } from "../services/password-reset.service";
import { recaptchaService } from "../services/recaptcha.service";
import { z } from "zod";

const router = Router();

// ===== VALIDATION SCHEMAS =====

const sendEmailVerificationSchema = z.object({
  email: z.string().email("Nevalidna email adresa"),
  recaptchaToken: z.string().optional()
});

const verifyEmailSchema = z.object({
  email: z.string().email("Nevalidna email adresa"),
  code: z.string().length(6, "Kod mora imati 6 cifara")
});

const sendPasswordResetSchema = z.object({
  email: z.string().email("Nevalidna email adresa"),
  recaptchaToken: z.string().optional()
});

const resetPasswordSchema = z.object({
  email: z.string().email("Nevalidna email adresa"),
  code: z.string().length(6, "Kod mora imati 6 cifara"),
  newPassword: z.string().min(6, "Lozinka mora imati najmanje 6 karaktera")
});

// ===== ENDPOINTS =====

/**
 * POST /api/auth/send-email-verification
 * Šalje 6-cifreni kod na email za verifikaciju
 */
router.post("/send-email-verification", async (req: Request, res: Response) => {
  try {
    const validation = sendEmailVerificationSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: validation.error.errors[0].message
      });
    }

    const { email, recaptchaToken } = validation.data;

    // Verifikacija reCAPTCHA (ako je omogućena)
    if (recaptchaService.isEnabled() && recaptchaToken) {
      const isValidRecaptcha = await recaptchaService.verifyToken(
        recaptchaToken, 
        req.ip
      );
      
      if (!isValidRecaptcha) {
        return res.status(400).json({
          success: false,
          message: "reCAPTCHA verifikacija neuspešna. Molimo pokušajte ponovo."
        });
      }
    }

    // Slanje verifikacionog koda
    const result = await emailVerificationService.sendVerificationEmail(email);
    
    return res.status(result.success ? 200 : 400).json(result);

  } catch (error) {
    console.error("[AuthVerificationRoutes] Greška pri slanju email verifikacije:", error);
    return res.status(500).json({
      success: false,
      message: "Došlo je do greške pri slanju email verifikacije."
    });
  }
});

/**
 * POST /api/auth/verify-email
 * Verifikuje email sa kodom
 */
router.post("/verify-email", async (req: Request, res: Response) => {
  try {
    const validation = verifyEmailSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: validation.error.errors[0].message
      });
    }

    const { email, code } = validation.data;

    // Verifikacija koda
    const result = await emailVerificationService.verifyEmail(email, code);
    
    return res.status(result.success ? 200 : 400).json(result);

  } catch (error) {
    console.error("[AuthVerificationRoutes] Greška pri verifikaciji email-a:", error);
    return res.status(500).json({
      success: false,
      message: "Došlo je do greške pri verifikaciji email-a."
    });
  }
});

/**
 * POST /api/auth/send-password-reset
 * Šalje 6-cifreni kod za resetovanje lozinke na email
 */
router.post("/send-password-reset", async (req: Request, res: Response) => {
  try {
    const validation = sendPasswordResetSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: validation.error.errors[0].message
      });
    }

    const { email, recaptchaToken } = validation.data;

    // Verifikacija reCAPTCHA (ako je omogućena)
    if (recaptchaService.isEnabled() && recaptchaToken) {
      const isValidRecaptcha = await recaptchaService.verifyToken(
        recaptchaToken, 
        req.ip
      );
      
      if (!isValidRecaptcha) {
        return res.status(400).json({
          success: false,
          message: "reCAPTCHA verifikacija neuspešna. Molimo pokušajte ponovo."
        });
      }
    }

    // Slanje reset koda
    const result = await passwordResetService.sendResetCode(email);
    
    return res.status(result.success ? 200 : 400).json(result);

  } catch (error) {
    console.error("[AuthVerificationRoutes] Greška pri slanju password reset:", error);
    return res.status(500).json({
      success: false,
      message: "Došlo je do greške pri slanju koda za resetovanje."
    });
  }
});

/**
 * POST /api/auth/reset-password
 * Resetuje lozinku koristeći kod sa email-a
 */
router.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const validation = resetPasswordSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: validation.error.errors[0].message
      });
    }

    const { email, code, newPassword } = validation.data;

    // Reset lozinke
    const result = await passwordResetService.resetPassword(email, code, newPassword);
    
    return res.status(result.success ? 200 : 400).json(result);

  } catch (error) {
    console.error("[AuthVerificationRoutes] Greška pri resetovanju lozinke:", error);
    return res.status(500).json({
      success: false,
      message: "Došlo je do greške pri resetovanju lozinke."
    });
  }
});

export default router;
