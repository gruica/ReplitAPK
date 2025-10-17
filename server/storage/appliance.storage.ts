/**
 * APPLIANCE STORAGE MODULE
 * Modularizovani storage za appliance, category i manufacturer funkcionalnost
 * Izdvojeno iz monolitnog storage.ts za bolju organizaciju
 */

import { db } from "../db.js";
import { applianceCategories, manufacturers, appliances, services } from "../../shared/schema/index.js";
import { eq, sql } from "drizzle-orm";
import type { 
  ApplianceCategory,
  InsertApplianceCategory,
  Manufacturer,
  InsertManufacturer,
  Appliance,
  InsertAppliance,
  Service
} from "../../shared/schema/index.js";

export class ApplianceStorage {
  
  // ===== APPLIANCE CATEGORY METHODS =====
  
  async getAllApplianceCategories(): Promise<ApplianceCategory[]> {
    return await db.select().from(applianceCategories);
  }

  async getApplianceCategory(id: number): Promise<ApplianceCategory | undefined> {
    const [category] = await db
      .select()
      .from(applianceCategories)
      .where(eq(applianceCategories.id, id));
    return category;
  }

  async createApplianceCategory(data: InsertApplianceCategory): Promise<ApplianceCategory> {
    const [category] = await db.insert(applianceCategories).values(data).returning();
    return category;
  }

  // ===== MANUFACTURER METHODS =====
  
  async getAllManufacturers(): Promise<Manufacturer[]> {
    return await db.select().from(manufacturers);
  }

  async getManufacturer(id: number): Promise<Manufacturer | undefined> {
    const [manufacturer] = await db
      .select()
      .from(manufacturers)
      .where(eq(manufacturers.id, id));
    return manufacturer;
  }

  async createManufacturer(data: InsertManufacturer): Promise<Manufacturer> {
    const [manufacturer] = await db.insert(manufacturers).values(data).returning();
    return manufacturer;
  }

  // ===== APPLIANCE METHODS =====
  
  async getAllAppliances(): Promise<Appliance[]> {
    return await db.select().from(appliances);
  }

  async getAppliance(id: number): Promise<Appliance | undefined> {
    const [appliance] = await db.select().from(appliances).where(eq(appliances.id, id));
    return appliance;
  }
  
  async getApplianceBySerialNumber(serialNumber: string): Promise<Appliance | undefined> {
    const [appliance] = await db.select().from(appliances).where(eq(appliances.serialNumber, serialNumber));
    return appliance;
  }

  async getAppliancesByClient(clientId: number): Promise<Appliance[]> {
    return await db.select().from(appliances).where(eq(appliances.clientId, clientId));
  }

  async createAppliance(data: InsertAppliance): Promise<Appliance> {
    const [appliance] = await db.insert(appliances).values(data).returning();
    return appliance;
  }

  async updateAppliance(id: number, data: Partial<InsertAppliance>): Promise<Appliance | undefined> {
    const [updatedAppliance] = await db
      .update(appliances)
      .set(data)
      .where(eq(appliances.id, id))
      .returning();
    return updatedAppliance;
  }

  async deleteAppliance(id: number): Promise<void> {
    await db.delete(appliances).where(eq(appliances.id, id));
  }

  async getServicesByAppliance(applianceId: number): Promise<Service[]> {
    return await db.select().from(services).where(eq(services.applianceId, applianceId));
  }

  async getApplianceStats(): Promise<{categoryId: number, count: number}[]> {
    const result = await db
      .select({
        categoryId: appliances.categoryId,
        count: sql<number>`count(*)::int`
      })
      .from(appliances)
      .groupBy(appliances.categoryId);
    
    return result;
  }
}

// Singleton instance
export const applianceStorage = new ApplianceStorage();
