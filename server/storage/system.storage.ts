/**
 * SYSTEM STORAGE MODULE
 * Modularizovani storage za system settings funkcionalnost
 * Izdvojeno iz monolitnog storage.ts za bolju organizaciju
 */

import { db } from "../db.js";
import { systemSettings } from "../../shared/schema/index.js";
import { eq } from "drizzle-orm";
import type { 
  SystemSetting, 
  InsertSystemSetting
} from "../../shared/schema/index.js";

export class SystemStorage {
  
  // ===== SYSTEM SETTINGS METHODS =====
  
  async getSystemSettings(): Promise<SystemSetting[]> {
    try {
      return await db.select().from(systemSettings);
    } catch (error) {
      console.error('Greška pri dohvatanju sistemskih postavki:', error);
      return [];
    }
  }

  // Alias metoda za mobile SMS kompatibilnost
  async getAllSystemSettings(): Promise<SystemSetting[]> {
    return this.getSystemSettings();
  }

  async getSystemSetting(key: string): Promise<SystemSetting | undefined> {
    try {
      const [setting] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, key))
        .limit(1);
      return setting;
    } catch (error) {
      console.error('Greška pri dohvatanju sistemske postavke:', error);
      return undefined;
    }
  }

  async getSystemSettingsByCategory(category: string): Promise<SystemSetting[]> {
    try {
      return await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.category, category));
    } catch (error) {
      console.error('Greška pri dohvatanju sistemskih postavki po kategoriji:', error);
      return [];
    }
  }

  async createSystemSetting(setting: InsertSystemSetting): Promise<SystemSetting> {
    try {
      const [newSetting] = await db
        .insert(systemSettings)
        .values(setting)
        .returning();
      return newSetting;
    } catch (error) {
      console.error('Greška pri kreiranju sistemske postavke:', error);
      throw error;
    }
  }

  async updateSystemSetting(key: string, setting: Partial<SystemSetting>): Promise<SystemSetting | undefined> {
    try {
      // Uklanjamo undefined vrednosti iz setting objekta
      const cleanSetting = Object.fromEntries(
        Object.entries(setting).filter(([_, value]) => value !== undefined)
      );
      
      if (Object.keys(cleanSetting).length === 0) {
        console.error('Nema validnih podataka za ažuriranje');
        return undefined;
      }
      
      const [updatedSetting] = await db
        .update(systemSettings)
        .set(cleanSetting)
        .where(eq(systemSettings.key, key))
        .returning();
      return updatedSetting;
    } catch (error) {
      console.error('Greška pri ažuriranju sistemske postavke:', error);
      return undefined;
    }
  }

  async deleteSystemSetting(key: string): Promise<boolean> {
    try {
      const result = await db
        .delete(systemSettings)
        .where(eq(systemSettings.key, key))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error('Greška pri brisanju sistemske postavke:', error);
      return false;
    }
  }

  async setSystemSetting(key: string, value: string): Promise<void> {
    try {
      const existing = await db.select()
        .from(systemSettings)
        .where(eq(systemSettings.key, key))
        .limit(1);
      
      if (existing.length > 0) {
        await db.update(systemSettings)
          .set({ value, updatedAt: new Date() })
          .where(eq(systemSettings.key, key));
      } else {
        await db.insert(systemSettings)
          .values({ key, value });
      }
    } catch (error) {
      console.error('Greška pri postavljanju sistemske postavke:', error);
      throw error;
    }
  }
}

// Singleton instance
export const systemStorage = new SystemStorage();
