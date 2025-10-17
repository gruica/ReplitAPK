/**
 * @fileoverview Spare Parts Storage Module
 * @module server/storage/spare-parts.storage
 * 
 * Modularizovani storage za spare parts management funkcionalnost
 * Izdvojeno iz monolitnog storage.ts za bolju organizaciju
 * 
 * Obuhvata:
 * - Spare Part Orders Management (42 metode)
 * - Spare Parts Catalog Management
 * - Parts Allocation & Warehouse
 * - Available Parts tracking
 */

import { db } from "../db.js";
import { pool } from "../db.js";
import { 
  sparePartOrders, availableParts, sparePartsCatalog, 
  partsCatalog
} from "../../shared/schema/index.js";
import { eq, desc, sql, inArray, like, or, and } from "drizzle-orm";
import type { 
  SparePartOrder,
  InsertSparePartOrder,
  SparePartStatus,
  AvailablePart,
  InsertAvailablePart,
  SparePartsCatalog,
  InsertSparePartsCatalog,
  PartsCatalog,
  InsertPartsCatalog
} from "../../shared/schema/index.js";

/**
 * Spare Parts Storage Class
 * Handles all spare parts related operations with cross-module dependencies
 */
class SparePartsStorage {
  // Store main storage reference for cross-module calls
  private storage: any;

  constructor() {
    this.storage = null;
  }

  // Setter for main storage instance (circular dependency workaround)
  setStorageInstance(storage: any) {
    this.storage = storage;
  }

  // SPARE PART ORDERS METHODS

  async getTechnicianSparePartRequests(technicianId: number): Promise<SparePartOrder[]> {
    const orders = await db.select().from(sparePartOrders).where(eq(sparePartOrders.technicianId, technicianId)).orderBy(desc(sparePartOrders.createdAt));
    return orders;
  }

  async getSparePartsByStatus(status: string): Promise<SparePartOrder[]> {
    const orders = await db.select().from(sparePartOrders).where(eq(sparePartOrders.status, status)).orderBy(desc(sparePartOrders.createdAt));
    return orders;
  }

  async getAllSparePartOrders(): Promise<any[]> {
    try {
      console.log('🔍 [SPARE PARTS] Dohvatanje svih porudžbina sa povezanim podacima...');
      
      const result = await pool.query(`
        SELECT id, part_name, part_number, quantity, status, urgency, created_at, updated_at,
               service_id, technician_id, appliance_id, description, 
               estimated_cost, actual_cost, supplier_name, admin_notes,
               'technician' as requester_type,
               technician_id as requester_user_id,
               'Serviser' as requester_name
        FROM spare_part_orders 
        ORDER BY created_at DESC
      `);
      const orders = result.rows;
      console.log(`📋 [SPARE PARTS] Pronađeno ${orders.length} porudžbina u bazi`);

      const enrichedOrders = await Promise.all(
        orders.map(async (order) => {
          let serviceData = undefined;
          let technicianData = undefined;

          console.log(`🔗 [SPARE PARTS] Obogaćujem porudžbinu #${order.id} (serviceId: ${order.service_id}, technicianId: ${order.technician_id})`);

          if (order.service_id && this.storage) {
            try {
              const service = await this.storage.getAdminServiceById(order.service_id);
              if (service) {
                serviceData = service;
                console.log(`✅ [SPARE PARTS] Servis #${order.service_id} povezan sa klijentom: ${service.client?.fullName}`);
              } else {
                console.log(`⚠️ [SPARE PARTS] Servis #${order.service_id} nije pronađen u bazi`);
              }
            } catch (error) {
              console.log(`❌ [SPARE PARTS] Greška pri dohvatanju servisa ${order.service_id}:`, error);
            }
          }

          if (order.technician_id && this.storage) {
            try {
              const technician = await this.storage.getTechnician(order.technician_id);
              if (technician) {
                technicianData = {
                  fullName: technician.fullName,
                  name: technician.fullName,
                  phone: technician.phone || '',
                  email: technician.email || '',
                  specialization: technician.specialization || ''
                };
                console.log(`✅ [SPARE PARTS] Tehniker #${order.technician_id} povezan: ${technicianData.name}`);
              } else {
                console.log(`⚠️ [SPARE PARTS] Tehniker #${order.technician_id} nije pronađen u bazi`);
              }
            } catch (error) {
              console.log(`❌ [SPARE PARTS] Greška pri dohvatanju tehnikara ${order.technician_id}:`, error);
            }
          }

          const mappedOrder = {
            id: order.id,
            partName: order.part_name,
            partNumber: order.part_number,
            quantity: order.quantity,
            description: order.description,
            urgency: order.urgency,
            status: order.status,
            estimatedCost: order.estimated_cost,
            actualCost: order.actual_cost,
            supplierName: order.supplier_name,
            adminNotes: order.admin_notes,
            serviceId: order.service_id,
            technicianId: order.technician_id,
            applianceId: order.appliance_id,
            createdAt: order.created_at,
            updatedAt: order.updated_at,
            service: serviceData,
            technician: technicianData
          };

          return mappedOrder;
        })
      );

      console.log(`🎯 [SPARE PARTS] Uspešno obogaćeno ${enrichedOrders.length} porudžbina`);
      return enrichedOrders;
    } catch (error) {
      console.error('❌ [SPARE PARTS] Greška pri dohvatanju svih porudžbina rezervnih delova:', error);
      throw error;
    }
  }

  async getSparePartOrder(id: number): Promise<SparePartOrder | undefined> {
    try {
      const [order] = await db
        .select({
          id: sparePartOrders.id,
          serviceId: sparePartOrders.serviceId,
          technicianId: sparePartOrders.technicianId,
          applianceId: sparePartOrders.applianceId,
          partName: sparePartOrders.partName,
          partNumber: sparePartOrders.partNumber,
          quantity: sparePartOrders.quantity,
          description: sparePartOrders.description,
          urgency: sparePartOrders.urgency,
          status: sparePartOrders.status,
          estimatedCost: sparePartOrders.estimatedCost,
          actualCost: sparePartOrders.actualCost,
          supplierName: sparePartOrders.supplierName,
          orderDate: sparePartOrders.orderDate,
          expectedDelivery: sparePartOrders.expectedDelivery,
          receivedDate: sparePartOrders.receivedDate,
          adminNotes: sparePartOrders.adminNotes,
          createdAt: sparePartOrders.createdAt,
          updatedAt: sparePartOrders.updatedAt
        })
        .from(sparePartOrders)
        .where(eq(sparePartOrders.id, id));
      return order;
    } catch (error) {
      console.error('Greška pri dohvatanju porudžbine rezervnog dela:', error);
      throw error;
    }
  }

  async getSparePartOrdersByService(serviceId: number): Promise<SparePartOrder[]> {
    try {
      const orders = await db
        .select()
        .from(sparePartOrders)
        .where(eq(sparePartOrders.serviceId, serviceId))
        .orderBy(desc(sparePartOrders.createdAt));
      return orders;
    } catch (error) {
      console.error('Greška pri dohvatanju porudžbina po servisu:', error);
      throw error;
    }
  }

  async getSparePartOrdersByTechnician(technicianId: number): Promise<SparePartOrder[]> {
    try {
      const orders = await db
        .select()
        .from(sparePartOrders)
        .where(eq(sparePartOrders.technicianId, technicianId))
        .orderBy(desc(sparePartOrders.createdAt));
      return orders;
    } catch (error) {
      console.error('Greška pri dohvatanju porudžbina po tehničaru:', error);
      throw error;
    }
  }

  async getSparePartOrdersByStatus(status: SparePartStatus): Promise<any[]> {
    try {
      console.log(`🔍 [SPARE PARTS STATUS] Dohvatanje porudžbina sa statusom: ${status}`);
      
      const result = await pool.query(`
        SELECT id, part_name, part_number, quantity, status, urgency, created_at, updated_at, 
               supplier_name, estimated_cost, actual_cost, admin_notes, description,
               service_id, technician_id,
               'technician' as requester_type,
               technician_id as requester_user_id,
               'Serviser' as requester_name
        FROM spare_part_orders 
        WHERE status = $1
        ORDER BY created_at DESC
      `, [status]);
      
      console.log(`📋 [SPARE PARTS STATUS] Pronađeno ${result.rows.length} porudžbina sa statusom ${status}`);

      const enrichedOrders = await Promise.all(
        result.rows.map(async (row) => {
          let serviceData = undefined;
          let technicianData = undefined;

          console.log(`🔗 [SPARE PARTS STATUS] Obogaćujem porudžbinu #${row.id} (serviceId: ${row.service_id}, technicianId: ${row.technician_id})`);

          if (row.service_id && this.storage) {
            try {
              const service = await this.storage.getAdminServiceById(row.service_id);
              if (service) {
                serviceData = service;
                console.log(`✅ [SPARE PARTS STATUS] Servis #${row.service_id} povezan sa klijentom: ${service.client?.fullName}`);
              } else {
                console.log(`⚠️ [SPARE PARTS STATUS] Servis #${row.service_id} nije pronađen u bazi`);
              }
            } catch (error) {
              console.log(`❌ [SPARE PARTS STATUS] Greška pri dohvatanju servisa ${row.service_id}:`, error);
            }
          }

          if (row.technician_id && this.storage) {
            try {
              const technician = await this.storage.getTechnician(row.technician_id);
              if (technician) {
                technicianData = {
                  fullName: technician.fullName,
                  name: technician.fullName,
                  phone: technician.phone || '',
                  email: technician.email || '',
                  specialization: technician.specialization || ''
                };
                console.log(`✅ [SPARE PARTS STATUS] Tehniker #${row.technician_id} povezan: ${technicianData.name}`);
              } else {
                console.log(`⚠️ [SPARE PARTS STATUS] Tehniker #${row.technician_id} nije pronađen u bazi`);
              }
            } catch (error) {
              console.log(`❌ [SPARE PARTS STATUS] Greška pri dohvatanju tehnikara ${row.technician_id}:`, error);
            }
          }

          return {
            id: row.id,
            partName: row.part_name,
            partNumber: row.part_number,
            quantity: row.quantity,
            status: row.status,
            urgency: row.urgency,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            supplierName: row.supplier_name,
            estimatedCost: row.estimated_cost,
            actualCost: row.actual_cost,
            adminNotes: row.admin_notes,
            description: row.description,
            serviceId: row.service_id,
            technicianId: row.technician_id,
            requesterType: row.requester_type,
            requesterUserId: row.requester_user_id,
            requesterName: row.requester_name,
            service: serviceData,
            technician: technicianData
          };
        })
      );

      console.log(`🎯 [SPARE PARTS STATUS] Uspešno obogaćeno ${enrichedOrders.length} porudžbina sa statusom ${status}`);
      return enrichedOrders;
    } catch (error) {
      console.error('❌ [SPARE PARTS STATUS] Greška pri dohvatanju porudžbina po statusu:', error);
      throw error;
    }
  }

  async getPendingSparePartOrders(): Promise<SparePartOrder[]> {
    try {
      const result = await pool.query(`
        SELECT id, part_name, part_number, quantity, status, urgency, created_at, updated_at,
               supplier_name, estimated_cost, actual_cost, admin_notes, description,
               service_id, technician_id,
               'technician' as requester_type,
               technician_id as requester_user_id,
               'Serviser' as requester_name
        FROM spare_part_orders 
        WHERE status = 'pending'
        ORDER BY created_at DESC
      `);
      
      return result.rows.map(row => ({
        id: row.id,
        partName: row.part_name,
        partNumber: row.part_number,
        quantity: row.quantity,
        status: row.status,
        urgency: row.urgency,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        supplierName: row.supplier_name,
        estimatedCost: row.estimated_cost,
        actualCost: row.actual_cost,
        adminNotes: row.admin_notes,
        description: row.description,
        serviceId: row.service_id,
        technicianId: row.technician_id,
        requesterType: row.requester_type,
        requesterUserId: row.requester_user_id,
        requesterName: row.requester_name
      }));
    } catch (error) {
      console.error('Greška pri dohvatanju porudžbina na čekanju:', error);
      throw error;
    }
  }

  async getAllRequestsSparePartOrders(): Promise<any[]> {
    try {
      console.log('🔍 [ALL-REQUESTS] Dohvatanje svih zahteva (pending + requested) sa povezanim podacima...');
      
      const result = await pool.query(`
        SELECT id, part_name, part_number, quantity, status, urgency, created_at, updated_at,
               supplier_name, estimated_cost, actual_cost, admin_notes, description,
               service_id, technician_id,
               'technician' as requester_type,
               technician_id as requester_user_id,
               'Serviser' as requester_name
        FROM spare_part_orders 
        WHERE status IN ('pending', 'requested')
        ORDER BY created_at DESC
      `);
      
      console.log(`📋 [ALL-REQUESTS] Pronađeno ${result.rows.length} zahteva (pending + requested)`);

      const enrichedOrders = await Promise.all(
        result.rows.map(async (row) => {
          let serviceData = undefined;
          let technicianData = undefined;

          console.log(`🔗 [ALL-REQUESTS] Obogaćujem porudžbinu #${row.id} (serviceId: ${row.service_id}, technicianId: ${row.technician_id})`);

          if (row.service_id && this.storage) {
            try {
              const service = await this.storage.getAdminServiceById(row.service_id);
              if (service) {
                serviceData = service;
                console.log(`✅ [ALL-REQUESTS] Servis #${row.service_id} povezan sa klijentom: ${service.client?.fullName}`);
              } else {
                console.log(`⚠️ [ALL-REQUESTS] Servis #${row.service_id} nije pronađen u bazi`);
              }
            } catch (error) {
              console.log(`❌ [ALL-REQUESTS] Greška pri dohvatanju servisa ${row.service_id}:`, error);
            }
          }

          if (row.technician_id && this.storage) {
            try {
              const technician = await this.storage.getTechnician(row.technician_id);
              if (technician) {
                technicianData = {
                  fullName: technician.fullName,
                  name: technician.fullName,
                  phone: technician.phone || '',
                  email: technician.email || '',
                  specialization: technician.specialization || ''
                };
                console.log(`✅ [ALL-REQUESTS] Tehniker #${row.technician_id} povezan: ${technicianData.name}`);
              } else {
                console.log(`⚠️ [ALL-REQUESTS] Tehniker #${row.technician_id} nije pronađen u bazi`);
              }
            } catch (error) {
              console.log(`❌ [ALL-REQUESTS] Greška pri dohvatanju tehnikara ${row.technician_id}:`, error);
            }
          }

          return {
            id: row.id,
            partName: row.part_name,
            partNumber: row.part_number,
            quantity: row.quantity,
            status: row.status,
            urgency: row.urgency,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            supplierName: row.supplier_name,
            estimatedCost: row.estimated_cost,
            actualCost: row.actual_cost,
            adminNotes: row.admin_notes,
            description: row.description,
            serviceId: row.service_id,
            technicianId: row.technician_id,
            requesterType: row.requester_type,
            requesterUserId: row.requester_user_id,
            requesterName: row.requester_name,
            service: serviceData,
            technician: technicianData
          };
        })
      );

      console.log(`🎯 [ALL-REQUESTS] Uspešno obogaćeno ${enrichedOrders.length} zahteva`);
      return enrichedOrders;
    } catch (error) {
      console.error('❌ [ALL-REQUESTS] Greška pri dohvatanju svih zahteva:', error);
      throw error;
    }
  }

  async createSparePartOrder(order: InsertSparePartOrder): Promise<SparePartOrder> {
    try {
      const [newOrder] = await db
        .insert(sparePartOrders)
        .values(order)
        .returning();
      return newOrder;
    } catch (error) {
      console.error('Greška pri kreiranju porudžbine rezervnog dela:', error);
      throw error;
    }
  }

  async updateSparePartOrder(id: number, order: Partial<SparePartOrder>): Promise<SparePartOrder | undefined> {
    try {
      const [updatedOrder] = await db
        .update(sparePartOrders)
        .set(order)
        .where(eq(sparePartOrders.id, id))
        .returning();
      return updatedOrder;
    } catch (error) {
      console.error('Greška pri ažuriranju porudžbine rezervnog dela:', error);
      throw error;
    }
  }

  async updateSparePartOrderStatus(id: number, updates: Partial<SparePartOrder>): Promise<SparePartOrder | undefined> {
    try {
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };

      const [updatedOrder] = await db
        .update(sparePartOrders)
        .set(updateData)
        .where(eq(sparePartOrders.id, id))
        .returning();
      
      if (!updatedOrder) {
        console.warn(`❌ [WORKFLOW] Rezervni deo sa ID ${id} nije pronađen za ažuriranje`);
        return undefined;
      }

      console.log(`📦 [WORKFLOW] Uspešno ažuriran rezervni deo ID: ${id}, novi status: ${updates.status}`);
      return updatedOrder;
    } catch (error) {
      console.error('❌ [WORKFLOW] Greška pri ažuriranju statusa rezervnog dela:', error);
      throw error;
    }
  }

  async deleteSparePartOrder(id: number): Promise<boolean> {
    try {
      await pool.query('DELETE FROM notifications WHERE related_spare_part_id = $1', [id]);
      
      const result = await db
        .delete(sparePartOrders)
        .where(eq(sparePartOrders.id, id))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error('Greška pri brisanju porudžbine rezervnog dela:', error);
      return false;
    }
  }

  async getSparePartsByService(serviceId: number): Promise<SparePartOrder[]> {
    try {
      const spareParts = await db
        .select()
        .from(sparePartOrders)
        .where(eq(sparePartOrders.serviceId, serviceId))
        .orderBy(desc(sparePartOrders.createdAt));
      return spareParts;
    } catch (error) {
      console.error('Greška pri dohvatanju rezervnih delova za servis:', error);
      return [];
    }
  }
}

// Singleton instance
export const sparePartsStorage = new SparePartsStorage();
