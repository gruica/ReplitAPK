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
  partsCatalog, partsAllocations, partsActivityLog
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
  InsertPartsCatalog,
  PartsAllocation,
  InsertPartsAllocation,
  PartsActivityLog,
  InsertPartsActivityLog
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

  // AVAILABLE PARTS & WAREHOUSE METHODS (Phase 3b)

  async markSparePartAsReceived(orderId: number, adminId: number, receivedData: { actualCost?: string; location?: string; notes?: string }): Promise<{ order: SparePartOrder; availablePart: AvailablePart } | undefined> {
    try {
      const order = await this.getSparePartOrder(orderId);
      if (!order) {
        throw new Error('Porudžbina nije pronađena');
      }

      const updatedOrder = await this.updateSparePartOrder(orderId, {
        status: 'received',
        receivedDate: new Date(),
        actualCost: receivedData.actualCost || order.actualCost
      });

      if (!updatedOrder) {
        throw new Error('Nije moguće ažurirati porudžbinu');
      }

      let serviceInfo = {
        serviceId: null as number | null,
        clientName: null as string | null,
        clientPhone: null as string | null,
        applianceInfo: null as string | null,
        serviceDescription: null as string | null
      };

      if (order.serviceId && this.storage) {
        try {
          const service = await this.storage.getService(order.serviceId);
          if (service) {
            serviceInfo.serviceId = service.id;
            serviceInfo.serviceDescription = service.description;

            if (service.clientId) {
              const client = await this.storage.getClient(service.clientId);
              if (client) {
                serviceInfo.clientName = client.fullName;
                serviceInfo.clientPhone = client.phone;
              }
            }

            if (service.applianceId) {
              const appliance = await this.storage.getAppliance(service.applianceId);
              if (appliance) {
                const category = appliance.categoryId ? await this.storage.getApplianceCategory(appliance.categoryId) : null;
                const manufacturer = appliance.manufacturerId ? await this.storage.getManufacturer(appliance.manufacturerId) : null;
                
                serviceInfo.applianceInfo = [
                  manufacturer?.name,
                  category?.name,
                  appliance.model
                ].filter(Boolean).join(' - ');
              }
            }
          }
        } catch (serviceError) {
          console.error('Greška pri dohvatanju informacija o servisu:', serviceError);
        }
      }

      const availablePartData = {
        partName: order.partName,
        partNumber: order.partNumber || null,
        quantity: order.quantity,
        description: order.description || null,
        supplierName: order.supplierName || null,
        unitCost: receivedData.actualCost || order.estimatedCost || null,
        location: receivedData.location || 'Glavno skladište',
        warrantyStatus: order.warrantyStatus as "u garanciji" | "van garancije",
        categoryId: null,
        manufacturerId: null,
        originalOrderId: orderId,
        addedBy: adminId,
        notes: receivedData.notes || null,
        serviceId: serviceInfo.serviceId,
        clientName: serviceInfo.clientName,
        clientPhone: serviceInfo.clientPhone,
        applianceInfo: serviceInfo.applianceInfo,
        serviceDescription: serviceInfo.serviceDescription
      };

      const availablePart = await this.createAvailablePart(availablePartData);

      return { order: updatedOrder, availablePart };
    } catch (error) {
      console.error('Greška pri označavanju dela kao primljenog:', error);
      throw error;
    }
  }

  async getAllAvailableParts(): Promise<AvailablePart[]> {
    try {
      const parts = await db.select().from(availableParts).orderBy(desc(availableParts.createdAt));
      return parts;
    } catch (error) {
      console.error('Greška pri dohvatanju svih dostupnih delova:', error);
      throw error;
    }
  }

  async getAvailablePart(id: number): Promise<AvailablePart | undefined> {
    try {
      const [part] = await db.select().from(availableParts).where(eq(availableParts.id, id));
      return part;
    } catch (error) {
      console.error('Greška pri dohvatanju dostupnog dela:', error);
      throw error;
    }
  }

  async getAvailablePartsByCategory(categoryId: number): Promise<AvailablePart[]> {
    try {
      const parts = await db
        .select()
        .from(availableParts)
        .where(eq(availableParts.categoryId, categoryId))
        .orderBy(desc(availableParts.createdAt));
      return parts;
    } catch (error) {
      console.error('Greška pri dohvatanju delova po kategoriji:', error);
      throw error;
    }
  }

  async getAvailablePartsByManufacturer(manufacturerId: number): Promise<AvailablePart[]> {
    try {
      const parts = await db
        .select()
        .from(availableParts)
        .where(eq(availableParts.manufacturerId, manufacturerId))
        .orderBy(desc(availableParts.createdAt));
      return parts;
    } catch (error) {
      console.error('Greška pri dohvatanju delova po proizvođaču:', error);
      throw error;
    }
  }

  async getAvailablePartsByWarrantyStatus(warrantyStatus: string): Promise<AvailablePart[]> {
    try {
      const parts = await db
        .select()
        .from(availableParts)
        .where(eq(availableParts.warrantyStatus, warrantyStatus))
        .orderBy(desc(availableParts.createdAt));
      return parts;
    } catch (error) {
      console.error('Greška pri dohvatanju delova po garancijskom statusu:', error);
      throw error;
    }
  }

  async searchAvailableParts(searchTerm: string): Promise<AvailablePart[]> {
    try {
      const parts = await db
        .select()
        .from(availableParts)
        .where(
          or(
            like(availableParts.partName, `%${searchTerm}%`),
            like(availableParts.partNumber, `%${searchTerm}%`)
          )
        )
        .orderBy(desc(availableParts.createdAt));
      return parts;
    } catch (error) {
      console.error('Greška pri pretraživanju dostupnih delova:', error);
      throw error;
    }
  }

  async createAvailablePart(part: InsertAvailablePart): Promise<AvailablePart> {
    try {
      const [newPart] = await db.insert(availableParts).values(part).returning();
      return newPart;
    } catch (error) {
      console.error('Greška pri kreiranju dostupnog dela:', error);
      throw error;
    }
  }

  async updateAvailablePart(id: number, part: Partial<AvailablePart>): Promise<AvailablePart | undefined> {
    try {
      const [updatedPart] = await db
        .update(availableParts)
        .set(part)
        .where(eq(availableParts.id, id))
        .returning();
      return updatedPart;
    } catch (error) {
      console.error('Greška pri ažuriranju dostupnog dela:', error);
      throw error;
    }
  }

  async deleteAvailablePart(id: number): Promise<boolean> {
    try {
      const result = await db.delete(availableParts).where(eq(availableParts.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error('Greška pri brisanju dostupnog dela:', error);
      return false;
    }
  }

  async updateAvailablePartQuantity(id: number, quantityChange: number): Promise<AvailablePart | undefined> {
    try {
      const part = await this.getAvailablePart(id);
      if (!part) {
        throw new Error('Deo nije pronađen');
      }

      const newQuantity = part.quantity + quantityChange;
      if (newQuantity < 0) {
        throw new Error('Količina ne može biti negativna');
      }

      const [updatedPart] = await db
        .update(availableParts)
        .set({ quantity: newQuantity })
        .where(eq(availableParts.id, id))
        .returning();

      return updatedPart;
    } catch (error) {
      console.error('Greška pri ažuriranju količine dela:', error);
      throw error;
    }
  }

  // PARTS ALLOCATION METHODS

  async createPartsAllocation(allocationData: InsertPartsAllocation): Promise<PartsAllocation> {
    try {
      const [allocation] = await db
        .insert(partsAllocations)
        .values(allocationData)
        .returning();
      return allocation;
    } catch (error) {
      console.error('Greška pri kreiranju alokacije delova:', error);
      throw error;
    }
  }

  async getAllocatePartToTechnician(
    partId: number,
    serviceId: number,
    technicianId: number,
    quantity: number,
    allocatedBy: number
  ): Promise<{ allocation: PartsAllocation; remainingQuantity: number } | undefined> {
    try {
      const part = await this.getAvailablePart(partId);
      if (!part) {
        throw new Error('Deo nije pronađen');
      }

      if (part.quantity < quantity) {
        throw new Error('Nedovoljno delova na lageru');
      }

      const updatedPart = await this.updateAvailablePartQuantity(partId, -quantity);

      const allocationData = {
        partId,
        serviceId,
        technicianId,
        quantity,
        allocatedBy,
        allocationDate: new Date()
      };

      const allocation = await this.createPartsAllocation(allocationData);

      return {
        allocation,
        remainingQuantity: updatedPart?.quantity || 0
      };
    } catch (error) {
      console.error('Greška pri alokaciji dela tehničaru:', error);
      throw error;
    }
  }

  async getPartsAllocationsByService(serviceId: number): Promise<PartsAllocation[]> {
    try {
      const allocations = await db
        .select()
        .from(partsAllocations)
        .where(eq(partsAllocations.serviceId, serviceId))
        .orderBy(desc(partsAllocations.allocationDate));
      return allocations;
    } catch (error) {
      console.error('Greška pri dohvatanju alokacija po servisu:', error);
      throw error;
    }
  }

  async getPartsAllocationsByTechnician(technicianId: number): Promise<PartsAllocation[]> {
    try {
      const allocations = await db
        .select()
        .from(partsAllocations)
        .where(eq(partsAllocations.technicianId, technicianId))
        .orderBy(desc(partsAllocations.allocationDate));
      return allocations;
    } catch (error) {
      console.error('Greška pri dohvatanju alokacija po tehničaru:', error);
      throw error;
    }
  }

  async getAllPartsAllocations(): Promise<PartsAllocation[]> {
    try {
      const allocations = await db
        .select()
        .from(partsAllocations)
        .orderBy(desc(partsAllocations.allocationDate));
      return allocations;
    } catch (error) {
      console.error('Greška pri dohvatanju svih alokacija:', error);
      throw error;
    }
  }

  async allocatePartToTechnician(allocation: InsertPartsAllocation): Promise<any> {
    try {
      const part = allocation.partId ? await this.getAvailablePart(allocation.partId) : null;
      
      if (part && part.quantity < allocation.quantity) {
        throw new Error('Nedovoljno delova na lageru');
      }

      const [newAllocation] = await db
        .insert(partsAllocations)
        .values({
          ...allocation,
          allocationDate: new Date()
        })
        .returning();

      if (allocation.partId && this.storage) {
        await this.storage.logPartActivity({
          partId: allocation.partId,
          action: 'allocated',
          previousQuantity: part?.quantity || 0,
          newQuantity: (part?.quantity || 0) - allocation.quantity,
          technicianId: allocation.technicianId,
          serviceId: allocation.serviceId,
          userId: allocation.allocatedBy,
          description: `Deo dodeljen tehničaru za servis #${allocation.serviceId}`,
          timestamp: new Date()
        });
      }

      if (part && allocation.partId) {
        await this.updateAvailablePartQuantity(allocation.partId, -allocation.quantity);
      }

      return newAllocation;
    } catch (error) {
      console.error('Greška pri dodeli dela tehničaru:', error);
      throw error;
    }
  }

  async getPartAllocations(serviceId?: number, technicianId?: number): Promise<any[]> {
    try {
      let query = db
        .select({
          id: partsAllocations.id,
          partId: partsAllocations.partId,
          serviceId: partsAllocations.serviceId,
          technicianId: partsAllocations.technicianId,
          quantity: partsAllocations.quantity,
          allocationDate: partsAllocations.allocationDate,
          allocatedBy: partsAllocations.allocatedBy
        })
        .from(partsAllocations);

      if (serviceId && technicianId) {
        query = query.where(
          and(
            eq(partsAllocations.serviceId, serviceId),
            eq(partsAllocations.technicianId, technicianId)
          )
        );
      } else if (serviceId) {
        query = query.where(eq(partsAllocations.serviceId, serviceId));
      } else if (technicianId) {
        query = query.where(eq(partsAllocations.technicianId, technicianId));
      }

      const allocations = await query.orderBy(desc(partsAllocations.allocationDate));
      return allocations;
    } catch (error) {
      console.error('Greška pri dohvatanju alokacija delova:', error);
      return [];
    }
  }

  // PARTS ACTIVITY LOG METHODS

  async logPartActivity(data: InsertPartsActivityLog): Promise<PartsActivityLog> {
    try {
      const [activityLog] = await db
        .insert(partsActivityLog)
        .values(data)
        .returning();
      return activityLog;
    } catch (error) {
      console.error('Greška pri upisu aktivnosti rezervnog dela:', error);
      throw error;
    }
  }

  async getPartActivityLog(partId?: number, limit: number = 50): Promise<any[]> {
    try {
      if (!this.storage) {
        return [];
      }

      let query = db
        .select({
          id: partsActivityLog.id,
          partId: partsActivityLog.partId,
          action: partsActivityLog.action,
          previousQuantity: partsActivityLog.previousQuantity,
          newQuantity: partsActivityLog.newQuantity,
          technicianId: partsActivityLog.technicianId,
          serviceId: partsActivityLog.serviceId,
          userId: partsActivityLog.userId,
          description: partsActivityLog.description,
          timestamp: partsActivityLog.timestamp
        })
        .from(partsActivityLog);

      if (partId) {
        query = query.where(eq(partsActivityLog.partId, partId));
      }

      const logs = await query.orderBy(desc(partsActivityLog.timestamp)).limit(limit);
      return logs;
    } catch (error) {
      console.error('Greška pri dohvatanju loga aktivnosti delova:', error);
      return [];
    }
  }
}

// Singleton instance
export const sparePartsStorage = new SparePartsStorage();
