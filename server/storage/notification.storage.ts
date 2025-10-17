/**
 * NOTIFICATION STORAGE MODULE
 * Modularizovani storage za notification funkcionalnost
 * Izdvojeno iz monolitnog storage.ts za bolju organizaciju
 */

import { db } from "../db.js";
import { notifications } from "../../shared/schema/index.js";
import { eq, and, desc } from "drizzle-orm";
import type { 
  Notification,
  InsertNotification
} from "../../shared/schema/index.js";

export class NotificationStorage {
  
  async getAllNotifications(userId?: number): Promise<Notification[]> {
    try {
      if (userId) {
        return await db.select()
          .from(notifications)
          .where(eq(notifications.userId, userId))
          .orderBy(desc(notifications.createdAt));
      } else {
        return await db.select()
          .from(notifications)
          .orderBy(desc(notifications.createdAt));
      }
    } catch (error) {
      console.error('Greška pri dohvatanju svih notifikacija:', error);
      return [];
    }
  }

  async getNotification(id: number): Promise<Notification | undefined> {
    try {
      const [notification] = await db.select()
        .from(notifications)
        .where(eq(notifications.id, id))
        .limit(1);
      return notification;
    } catch (error) {
      console.error('Greška pri dohvatanju notifikacije:', error);
      return undefined;
    }
  }

  async getNotificationsByUser(userId: number): Promise<Notification[]> {
    try {
      return await db.select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt));
    } catch (error) {
      console.error('Greška pri dohvatanju notifikacija korisnika:', error);
      return [];
    }
  }

  async getUnreadNotifications(userId: number): Promise<Notification[]> {
    try {
      return await db.select()
        .from(notifications)
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        ))
        .orderBy(desc(notifications.createdAt));
    } catch (error) {
      console.error('Greška pri dohvatanju nepročitanih notifikacija:', error);
      return [];
    }
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    try {
      const [newNotification] = await db.insert(notifications)
        .values({
          ...notification,
          createdAt: new Date(),
          isRead: false
        })
        .returning();
      return newNotification;
    } catch (error) {
      console.error('Greška pri kreiranju notifikacije:', error);
      throw error;
    }
  }

  async updateNotification(id: number, notification: Partial<Notification>): Promise<Notification | undefined> {
    try {
      const [updatedNotification] = await db.update(notifications)
        .set(notification)
        .where(eq(notifications.id, id))
        .returning();
      return updatedNotification;
    } catch (error) {
      console.error('Greška pri ažuriranju notifikacije:', error);
      return undefined;
    }
  }

  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    try {
      const [updatedNotification] = await db.update(notifications)
        .set({ 
          isRead: true,
          readAt: new Date()
        })
        .where(eq(notifications.id, id))
        .returning();
      return updatedNotification;
    } catch (error) {
      console.error('Greška pri označavanju notifikacije kao pročitane:', error);
      return undefined;
    }
  }

  async markAllNotificationsAsRead(userId: number): Promise<void> {
    try {
      await db.update(notifications)
        .set({ 
          isRead: true,
          readAt: new Date()
        })
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        ));
    } catch (error) {
      console.error('Greška pri označavanju svih notifikacija kao pročitane:', error);
      throw error;
    }
  }

  async deleteNotification(id: number): Promise<boolean> {
    try {
      const result = await db.delete(notifications)
        .where(eq(notifications.id, id));
      return true;
    } catch (error) {
      console.error('Greška pri brisanju notifikacije:', error);
      return false;
    }
  }
}

// Singleton instance
export const notificationStorage = new NotificationStorage();
