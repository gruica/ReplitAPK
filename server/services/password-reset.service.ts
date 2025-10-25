/**
 * MODULARNI SERVIS ZA RESETOVANJE LOZINKE
 * 
 * Odgovornosti:
 * - Generisanje i slanje reset kodova na email
 * - Validacija reset kodova
 * - Promena lozinke sa validnim kodom
 * 
 * Ne zavisi od drugih servisa osim email-service i storage
 */

import { storage } from "../storage";
import { emailService } from "../email-service";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

/**
 * Hash lozinke (mora biti identičan sa auth.ts)
 */
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export class PasswordResetService {
  private static instance: PasswordResetService;

  private constructor() {}

  public static getInstance(): PasswordResetService {
    if (!PasswordResetService.instance) {
      PasswordResetService.instance = new PasswordResetService();
    }
    return PasswordResetService.instance;
  }

  /**
   * Generiše nasumični 6-cifreni kod
   */
  private generateResetCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Šalje reset kod na email
   * @param email - Email adresa korisnika
   * @returns Objekat sa success i message
   */
  public async sendResetCode(email: string): Promise<{ success: boolean; message: string }> {
    try {
      // Provera da li korisnik sa ovim email-om postoji
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Sigurnosna mera: ne otkrivamo da korisnik ne postoji
        return {
          success: true,
          message: "Ako je email registrovan, kod za resetovanje je poslat."
        };
      }

      // Generisanje reset koda
      const resetCode = this.generateResetCode();
      
      // Postavljanje vremena isteka (30 minuta)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 30);

      // Čuvanje koda u bazi
      await storage.createPasswordReset({
        email,
        resetCode,
        used: false,
        attempts: 0,
        expiresAt
      });

      // Slanje emaila
      const emailSent = await emailService.sendEmail({
        to: email,
        subject: "Resetovanje lozinke - Frigo Sistem Todosijević",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #dc2626; text-align: center;">🔑 Resetovanje lozinke</h2>
            <p>Poštovani <strong>${user.fullName}</strong>,</p>
            <p>Primili smo zahtev za resetovanje lozinke na vašem nalogu. Koristite sledeći kod da postavite novu lozinku:</p>
            <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
              <h1 style="color: #1f2937; font-size: 36px; margin: 0; letter-spacing: 6px; font-family: monospace;">${resetCode}</h1>
            </div>
            <p><strong>⏱️ Važno:</strong> Ovaj kod važi <strong>30 minuta</strong> od trenutka slanja.</p>
            <p>Ako niste vi zatražili resetovanje lozinke, molimo vas da ignorišete ovaj email i vaša lozinka će ostati nepromenjena.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">
              Frigo Sistem Todosijević<br>
              Servis bele tehnike<br>
              Crna Gora
            </p>
          </div>
        `,
        text: `Resetovanje lozinke\n\nVaš kod za resetovanje: ${resetCode}\n\nOvaj kod važi 30 minuta.\n\nAko niste vi zatražili resetovanje, ignorišite ovaj email.\n\nFrigo Sistem Todosijević`
      });

      if (emailSent) {
        return {
          success: true,
          message: "Kod za resetovanje lozinke je poslat na vašu email adresu."
        };
      } else {
        return {
          success: false,
          message: "Greška pri slanju email-a. Molimo pokušajte kasnije."
        };
      }

    } catch (error) {
      console.error("[PasswordResetService] Greška pri slanju reset koda:", error);
      return {
        success: false,
        message: "Došlo je do greške. Molimo pokušajte kasnije."
      };
    }
  }

  /**
   * Resetuje lozinku korisnika pomoću koda
   * @param email - Email adresa
   * @param code - Reset kod (6 cifara)
   * @param newPassword - Nova lozinka
   * @returns Objekat sa success i message
   */
  public async resetPassword(
    email: string, 
    code: string, 
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Validacija koda
      const isValid = await storage.validatePasswordReset(email, code);
      
      if (!isValid) {
        return {
          success: false,
          message: "Neispravan ili istekao kod za resetovanje."
        };
      }

      // Provera da li korisnik postoji
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return {
          success: false,
          message: "Korisnik sa ovom email adresom ne postoji."
        };
      }

      // Hash nove lozinke
      const hashedPassword = await hashPassword(newPassword);

      // Ažuriranje lozinke u bazi
      await storage.updateUserPassword(user.id, hashedPassword);

      // Označavanje koda kao iskorišćenog
      await storage.markPasswordResetAsUsed(email, code);

      return {
        success: true,
        message: "Lozinka je uspešno promenjena. Možete se sada prijaviti."
      };

    } catch (error) {
      console.error("[PasswordResetService] Greška pri resetovanju lozinke:", error);
      return {
        success: false,
        message: "Došlo je do greške pri resetovanju lozinke."
      };
    }
  }

  /**
   * Čišćenje isteklih reset kodova (poziva se periodično)
   */
  public async cleanupExpiredCodes(): Promise<void> {
    try {
      await storage.cleanupExpiredPasswordResets();
      console.log("[PasswordResetService] Istekli reset kodovi uspešno obrisani.");
    } catch (error) {
      console.error("[PasswordResetService] Greška pri čišćenju kodova:", error);
    }
  }
}

export const passwordResetService = PasswordResetService.getInstance();
