/**
 * TECHNICIAN STORAGE MODULE
 * Modularizovani storage za technician funkcionalnost
 * Izdvojeno iz monolitnog storage.ts za bolju organizaciju
 */

import { db } from "../db.js";
import { technicians, users } from "../../shared/schema/index.js";
import { eq } from "drizzle-orm";
import type { 
  Technician, 
  InsertTechnician,
  User
} from "../../shared/schema/index.js";

export class TechnicianStorage {
  
  // ===== TECHNICIAN METHODS =====
  
  async getAllTechnicians(): Promise<Technician[]> {
    return await db.select().from(technicians);
  }

  async getTechnician(id: number): Promise<Technician | undefined> {
    const [technician] = await db.select().from(technicians).where(eq(technicians.id, id));
    return technician;
  }

  async createTechnician(insertTechnician: InsertTechnician): Promise<Technician> {
    const [technician] = await db.insert(technicians).values(insertTechnician).returning();
    return technician;
  }

  async updateTechnician(id: number, data: InsertTechnician): Promise<Technician | undefined> {
    const [updatedTechnician] = await db
      .update(technicians)
      .set(data)
      .where(eq(technicians.id, id))
      .returning();
    return updatedTechnician;
  }
  
  async getUserByTechnicianId(technicianId: number): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.technicianId, technicianId));
    return user;
  }
}

// Singleton instance
export const technicianStorage = new TechnicianStorage();
