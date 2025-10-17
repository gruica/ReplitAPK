/**
 * MAINTENANCE STORAGE MODULE
 * Modularizovani storage za maintenance schedule i alert funkcionalnost
 * Izdvojeno iz monolitnog storage.ts za bolju organizaciju
 */

import { db } from "../db.js";
import { maintenanceSchedules, maintenanceAlerts } from "../../shared/schema/index.js";
import { eq, and, gte, lte } from "drizzle-orm";
import type { 
  MaintenanceSchedule,
  InsertMaintenanceSchedule,
  MaintenanceAlert,
  InsertMaintenanceAlert
} from "../../shared/schema/index.js";

export class MaintenanceStorage {
  
  // ===== MAINTENANCE SCHEDULE METHODS =====
  
  async getAllMaintenanceSchedules(): Promise<MaintenanceSchedule[]> {
    return await db.select().from(maintenanceSchedules);
  }

  async getMaintenanceSchedule(id: number): Promise<MaintenanceSchedule | undefined> {
    const [schedule] = await db
      .select()
      .from(maintenanceSchedules)
      .where(eq(maintenanceSchedules.id, id));
    return schedule;
  }

  async getMaintenanceSchedulesByAppliance(applianceId: number): Promise<MaintenanceSchedule[]> {
    return await db
      .select()
      .from(maintenanceSchedules)
      .where(eq(maintenanceSchedules.applianceId, applianceId));
  }

  async createMaintenanceSchedule(data: InsertMaintenanceSchedule): Promise<MaintenanceSchedule> {
    const [schedule] = await db.insert(maintenanceSchedules).values({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return schedule;
  }

  async updateMaintenanceSchedule(id: number, data: Partial<MaintenanceSchedule>): Promise<MaintenanceSchedule | undefined> {
    const [updatedSchedule] = await db
      .update(maintenanceSchedules)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(maintenanceSchedules.id, id))
      .returning();
    return updatedSchedule;
  }

  async deleteMaintenanceSchedule(id: number): Promise<boolean> {
    try {
      const result = await db.delete(maintenanceSchedules).where(eq(maintenanceSchedules.id, id));
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      console.error("Greška pri brisanju rasporeda održavanja:", error);
      return false;
    }
  }

  async getUpcomingMaintenanceSchedules(daysThreshold: number): Promise<MaintenanceSchedule[]> {
    const now = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(now.getDate() + daysThreshold);
    
    return await db
      .select()
      .from(maintenanceSchedules)
      .where(
        and(
          eq(maintenanceSchedules.isActive, true),
          gte(maintenanceSchedules.nextMaintenanceDate, now),
          lte(maintenanceSchedules.nextMaintenanceDate, thresholdDate)
        )
      );
  }

  // ===== MAINTENANCE ALERT METHODS =====
  
  async getAllMaintenanceAlerts(): Promise<MaintenanceAlert[]> {
    return await db.select().from(maintenanceAlerts);
  }

  async getMaintenanceAlert(id: number): Promise<MaintenanceAlert | undefined> {
    const [alert] = await db
      .select()
      .from(maintenanceAlerts)
      .where(eq(maintenanceAlerts.id, id));
    return alert;
  }

  async getMaintenanceAlertsBySchedule(scheduleId: number): Promise<MaintenanceAlert[]> {
    return await db
      .select()
      .from(maintenanceAlerts)
      .where(eq(maintenanceAlerts.scheduleId, scheduleId));
  }

  async createMaintenanceAlert(data: InsertMaintenanceAlert): Promise<MaintenanceAlert> {
    const [alert] = await db.insert(maintenanceAlerts).values({
      ...data,
      createdAt: new Date()
    }).returning();
    return alert;
  }

  async updateMaintenanceAlert(id: number, data: Partial<MaintenanceAlert>): Promise<MaintenanceAlert | undefined> {
    const [updatedAlert] = await db
      .update(maintenanceAlerts)
      .set(data)
      .where(eq(maintenanceAlerts.id, id))
      .returning();
    return updatedAlert;
  }

  async deleteMaintenanceAlert(id: number): Promise<boolean> {
    try {
      const result = await db.delete(maintenanceAlerts).where(eq(maintenanceAlerts.id, id));
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      console.error("Greška pri brisanju alarma:", error);
      return false;
    }
  }

  async getUnreadMaintenanceAlerts(): Promise<MaintenanceAlert[]> {
    return await db
      .select()
      .from(maintenanceAlerts)
      .where(eq(maintenanceAlerts.isRead, false));
  }

  async markMaintenanceAlertAsRead(id: number): Promise<MaintenanceAlert | undefined> {
    const [updatedAlert] = await db
      .update(maintenanceAlerts)
      .set({ isRead: true })
      .where(eq(maintenanceAlerts.id, id))
      .returning();
    return updatedAlert;
  }
}

// Singleton instance
export const maintenanceStorage = new MaintenanceStorage();
