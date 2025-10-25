/**
 * SECURITY STORAGE MODULE
 * Modularizovani storage za security verification funkcionalnost
 * Izdvojeno iz monolitnog storage.ts za bolju organizaciju
 */

import { db } from "../db.js";
import { botVerification, emailVerification, passwordReset } from "../../shared/schema/index.js";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import type { 
  BotVerification, 
  InsertBotVerification,
  EmailVerification,
  InsertEmailVerification,
  PasswordReset,
  InsertPasswordReset
} from "../../shared/schema/index.js";

export class SecurityStorage {
  
  // ===== BOT VERIFICATION METHODS =====
  
  async getBotVerification(sessionId: string): Promise<BotVerification | undefined> {
    try {
      const [verification] = await db
        .select()
        .from(botVerification)
        .where(eq(botVerification.sessionId, sessionId));
      return verification;
    } catch (error) {
      console.error('Greška pri dohvatanju bot verifikacije:', error);
      return undefined;
    }
  }

  async createBotVerification(verification: InsertBotVerification): Promise<BotVerification> {
    const [newVerification] = await db
      .insert(botVerification)
      .values(verification)
      .returning();
    return newVerification;
  }

  async updateBotVerification(sessionId: string, update: Partial<BotVerification>): Promise<BotVerification | undefined> {
    try {
      const [updatedVerification] = await db
        .update(botVerification)
        .set(update)
        .where(eq(botVerification.sessionId, sessionId))
        .returning();
      return updatedVerification;
    } catch (error) {
      console.error('Greška pri ažuriranju bot verifikacije:', error);
      return undefined;
    }
  }

  async cleanupExpiredBotVerifications(): Promise<void> {
    try {
      const now = new Date();
      await db
        .delete(botVerification)
        .where(lte(botVerification.expiresAt, now));
    } catch (error) {
      console.error('Greška pri čišćenju isteklih bot verifikacija:', error);
    }
  }

  // ===== EMAIL VERIFICATION METHODS =====
  
  async getEmailVerification(email: string): Promise<EmailVerification | undefined> {
    try {
      const [verification] = await db
        .select()
        .from(emailVerification)
        .where(and(
          eq(emailVerification.email, email),
          eq(emailVerification.used, false),
          gte(emailVerification.expiresAt, new Date())
        ))
        .orderBy(desc(emailVerification.createdAt));
      return verification;
    } catch (error) {
      console.error('Greška pri dohvatanju email verifikacije:', error);
      return undefined;
    }
  }

  async createEmailVerification(verification: InsertEmailVerification): Promise<EmailVerification> {
    const [newVerification] = await db
      .insert(emailVerification)
      .values(verification)
      .returning();
    return newVerification;
  }

  async updateEmailVerification(id: number, update: Partial<EmailVerification>): Promise<EmailVerification | undefined> {
    try {
      const [updatedVerification] = await db
        .update(emailVerification)
        .set(update)
        .where(eq(emailVerification.id, id))
        .returning();
      return updatedVerification;
    } catch (error) {
      console.error('Greška pri ažuriranju email verifikacije:', error);
      return undefined;
    }
  }

  async validateEmailVerification(email: string, code: string): Promise<boolean> {
    try {
      const verification = await this.getEmailVerification(email);
      if (!verification) return false;
      
      if (verification.verificationCode === code) {
        await this.updateEmailVerification(verification.id, { used: true });
        return true;
      } else {
        await this.updateEmailVerification(verification.id, { 
          attempts: verification.attempts + 1 
        });
        return false;
      }
    } catch (error) {
      console.error('Greška pri validaciji email verifikacije:', error);
      return false;
    }
  }

  async cleanupExpiredEmailVerifications(): Promise<void> {
    try {
      const now = new Date();
      await db
        .delete(emailVerification)
        .where(lte(emailVerification.expiresAt, now));
    } catch (error) {
      console.error('Greška pri čišćenju isteklih email verifikacija:', error);
    }
  }

  // ===== PASSWORD RESET METHODS =====
  
  async createPasswordReset(reset: InsertPasswordReset): Promise<PasswordReset> {
    const [newReset] = await db
      .insert(passwordReset)
      .values(reset)
      .returning();
    return newReset;
  }

  async getPasswordReset(email: string): Promise<PasswordReset | undefined> {
    try {
      const [reset] = await db
        .select()
        .from(passwordReset)
        .where(and(
          eq(passwordReset.email, email),
          eq(passwordReset.used, false),
          gte(passwordReset.expiresAt, new Date())
        ))
        .orderBy(desc(passwordReset.createdAt));
      return reset;
    } catch (error) {
      console.error('Greška pri dohvatanju password reset:', error);
      return undefined;
    }
  }

  async validatePasswordReset(email: string, code: string): Promise<boolean> {
    try {
      const reset = await this.getPasswordReset(email);
      if (!reset) return false;
      
      if (reset.resetCode === code) {
        return true;
      } else {
        await db
          .update(passwordReset)
          .set({ attempts: reset.attempts + 1 })
          .where(eq(passwordReset.id, reset.id));
        return false;
      }
    } catch (error) {
      console.error('Greška pri validaciji password reset koda:', error);
      return false;
    }
  }

  async markPasswordResetAsUsed(email: string, code: string): Promise<void> {
    try {
      await db
        .update(passwordReset)
        .set({ used: true })
        .where(and(
          eq(passwordReset.email, email),
          eq(passwordReset.resetCode, code)
        ));
    } catch (error) {
      console.error('Greška pri označavanju password reset kao iskorišćenog:', error);
    }
  }

  async cleanupExpiredPasswordResets(): Promise<void> {
    try {
      const now = new Date();
      await db
        .delete(passwordReset)
        .where(lte(passwordReset.expiresAt, now));
    } catch (error) {
      console.error('Greška pri čišćenju isteklih password reset kodova:', error);
    }
  }
}

// Singleton instance
export const securityStorage = new SecurityStorage();
