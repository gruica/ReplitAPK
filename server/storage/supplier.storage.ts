/**
 * SUPPLIER STORAGE MODULE
 * Modularizovani storage za supplier funkcionalnost
 * Izdvojeno iz monolitnog storage.ts za bolju organizaciju
 */

import { db } from "../db.js";
import { suppliers, supplierOrders } from "../../shared/schema/index.js";
import { eq, desc, or, count } from "drizzle-orm";
import type { 
  Supplier, 
  InsertSupplier, 
  SupplierOrder, 
  InsertSupplierOrder 
} from "../../shared/schema/index.js";

export class SupplierStorage {
  
  // ===== SUPPLIER METHODS =====
  
  async getAllSuppliers(): Promise<Supplier[]> {
    try {
      return await db.select().from(suppliers).orderBy(suppliers.name);
    } catch (error) {
      console.error('Greška pri dohvatanju dobavljača:', error);
      return [];
    }
  }

  async getSupplier(id: number): Promise<Supplier | undefined> {
    try {
      const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
      return supplier;
    } catch (error) {
      console.error('Greška pri dohvatanju dobavljača:', error);
      return undefined;
    }
  }

  async getSupplierByEmail(email: string): Promise<Supplier | undefined> {
    try {
      const [supplier] = await db.select().from(suppliers).where(eq(suppliers.email, email));
      return supplier;
    } catch (error) {
      console.error('Greška pri dohvatanju dobavljača po email-u:', error);
      return undefined;
    }
  }

  async getActiveSuppliers(): Promise<Supplier[]> {
    try {
      return await db.select()
        .from(suppliers)
        .where(eq(suppliers.isActive, true))
        .orderBy(desc(suppliers.priority), suppliers.name);
    } catch (error) {
      console.error('Greška pri dohvatanju aktivnih dobavljača:', error);
      return [];
    }
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    try {
      const [newSupplier] = await db.insert(suppliers).values(supplier).returning();
      return newSupplier;
    } catch (error) {
      console.error('Greška pri kreiranju dobavljača:', error);
      throw error;
    }
  }

  async updateSupplier(id: number, supplier: Partial<Supplier>): Promise<Supplier | undefined> {
    try {
      const [updatedSupplier] = await db.update(suppliers)
        .set({ ...supplier, updatedAt: new Date() })
        .where(eq(suppliers.id, id))
        .returning();
      return updatedSupplier;
    } catch (error) {
      console.error('Greška pri ažuriranju dobavljača:', error);
      return undefined;
    }
  }

  async deleteSupplier(id: number): Promise<boolean> {
    try {
      await db.delete(suppliers).where(eq(suppliers.id, id));
      return true;
    } catch (error) {
      console.error('Greška pri brisanju dobavljača:', error);
      return false;
    }
  }

  // ===== SUPPLIER ORDER METHODS =====

  async getAllSupplierOrders(): Promise<SupplierOrder[]> {
    try {
      return await db.select().from(supplierOrders).orderBy(desc(supplierOrders.createdAt));
    } catch (error) {
      console.error('Greška pri dohvatanju porudžbina dobavljača:', error);
      return [];
    }
  }

  async getSupplierOrder(id: number): Promise<SupplierOrder | undefined> {
    try {
      const [order] = await db.select().from(supplierOrders).where(eq(supplierOrders.id, id));
      return order;
    } catch (error) {
      console.error('Greška pri dohvatanju porudžbine dobavljača:', error);
      return undefined;
    }
  }

  async getSupplierOrdersBySupplier(supplierId: number): Promise<SupplierOrder[]> {
    try {
      return await db.select()
        .from(supplierOrders)
        .where(eq(supplierOrders.supplierId, supplierId))
        .orderBy(desc(supplierOrders.createdAt));
    } catch (error) {
      console.error('Greška pri dohvatanju porudžbina za dobavljača:', error);
      return [];
    }
  }

  async getSupplierOrdersBySparePartOrder(sparePartOrderId: number): Promise<SupplierOrder[]> {
    try {
      return await db.select()
        .from(supplierOrders)
        .where(eq(supplierOrders.sparePartOrderId, sparePartOrderId))
        .orderBy(desc(supplierOrders.createdAt));
    } catch (error) {
      console.error('Greška pri dohvatanju porudžbina za rezervni deo:', error);
      return [];
    }
  }

  async getActiveSupplierOrders(): Promise<SupplierOrder[]> {
    try {
      return await db.select()
        .from(supplierOrders)
        .where(or(
          eq(supplierOrders.status, 'pending'),
          eq(supplierOrders.status, 'separated'),
          eq(supplierOrders.status, 'sent')
        ))
        .orderBy(desc(supplierOrders.createdAt));
    } catch (error) {
      console.error('Greška pri dohvatanju aktivnih porudžbina:', error);
      return [];
    }
  }

  async getPendingSupplierOrdersCount(): Promise<number> {
    try {
      const [result] = await db.select({ count: count() })
        .from(supplierOrders)
        .where(eq(supplierOrders.status, 'pending'));
      return result.count;
    } catch (error) {
      console.error('Greška pri brojanju porudžbina na čekanju:', error);
      return 0;
    }
  }

  async createSupplierOrder(order: InsertSupplierOrder): Promise<SupplierOrder> {
    try {
      const [newOrder] = await db.insert(supplierOrders).values(order).returning();
      return newOrder;
    } catch (error) {
      console.error('Greška pri kreiranju porudžbine dobavljača:', error);
      throw error;
    }
  }

  async updateSupplierOrder(id: number, order: Partial<SupplierOrder>): Promise<SupplierOrder | undefined> {
    try {
      const [updatedOrder] = await db.update(supplierOrders)
        .set({ ...order, updatedAt: new Date() })
        .where(eq(supplierOrders.id, id))
        .returning();
      return updatedOrder;
    } catch (error) {
      console.error('Greška pri ažuriranju porudžbine dobavljača:', error);
      return undefined;
    }
  }

  async deleteSupplierOrder(id: number): Promise<boolean> {
    try {
      await db.delete(supplierOrders).where(eq(supplierOrders.id, id));
      return true;
    } catch (error) {
      console.error('Greška pri brisanju porudžbine dobavljača:', error);
      return false;
    }
  }

  // ===== SUPPLIER PORTAL METHODS =====
  
  async getSupplierTasks(supplierId: number): Promise<SupplierOrder[]> {
    try {
      const tasks = await db
        .select()
        .from(supplierOrders)
        .where(eq(supplierOrders.supplierId, supplierId))
        .orderBy(desc(supplierOrders.createdAt));
      return tasks;
    } catch (error) {
      console.error('Greška pri dohvatanju supplier zadataka:', error);
      throw error;
    }
  }

  async getSupplierTask(taskId: number): Promise<SupplierOrder | undefined> {
    try {
      const [task] = await db
        .select()
        .from(supplierOrders)
        .where(eq(supplierOrders.id, taskId));
      return task;
    } catch (error) {
      console.error('Greška pri dohvatanju supplier zadatka:', error);
      throw error;
    }
  }

  async updateSupplierTaskStatus(
    taskId: number, 
    status: 'pending' | 'separated' | 'sent' | 'delivered' | 'cancelled'
  ): Promise<SupplierOrder> {
    try {
      const updateData: any = { status };
      
      // Set appropriate timestamp based on status
      if (status === 'separated') {
        updateData.confirmedAt = new Date();
      } else if (status === 'sent') {
        updateData.sentAt = new Date();
      }

      const [updated] = await db
        .update(supplierOrders)
        .set(updateData)
        .where(eq(supplierOrders.id, taskId))
        .returning();
      
      return updated;
    } catch (error) {
      console.error('Greška pri ažuriranju supplier task statusa:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const supplierStorage = new SupplierStorage();
