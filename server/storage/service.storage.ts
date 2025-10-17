/**
 * SERVICE STORAGE MODULE
 * Modularizovani storage za service management funkcionalnost
 * Izdvojeno iz monolitnog storage.ts za bolju organizaciju
 */

import { db } from "../db.js";
import { pool } from "../db.js";
import { 
  services, clients, appliances, applianceCategories, 
  manufacturers, technicians 
} from "../../shared/schema/index.js";
import { eq, and, desc, sql } from "drizzle-orm";
import type { 
  Service,
  InsertService,
  ServiceWithDetails,
  ServiceStatus
} from "../../shared/schema/index.js";

export class ServiceStorage {

  // PLACEHOLDER - CEO KOD SE DODAJE U SLEDEĆEM KORAKU
  
  async getAllServices(limit?: number): Promise<ServiceWithDetails[]> {
    try {
      console.log('Dohvatanje svih servisa...');
      
      let query = db.select({
        id: services.id,
        clientId: services.clientId,
        applianceId: services.applianceId,
        technicianId: services.technicianId,
        description: services.description,
        status: services.status,
        warrantyStatus: services.warrantyStatus,
        createdAt: services.createdAt,
        scheduledDate: services.scheduledDate,
        completedDate: services.completedDate,
        technicianNotes: services.technicianNotes,
        cost: services.cost,
        usedParts: services.usedParts,
        machineNotes: services.machineNotes,
        isCompletelyFixed: services.isCompletelyFixed,
        businessPartnerId: services.businessPartnerId,
        partnerCompanyName: services.partnerCompanyName,
        clientName: clients.fullName,
        clientCity: clients.city,
        clientAddress: clients.address,
        clientPhone: clients.phone,
        clientEmail: clients.email,
        applianceName: appliances.model,
        applianceSerialNumber: appliances.serialNumber,
        categoryName: applianceCategories.name,
        manufacturerName: manufacturers.name,
        technicianName: technicians.fullName
      })
      .from(services)
      .innerJoin(clients, eq(services.clientId, clients.id))
      .innerJoin(appliances, eq(services.applianceId, appliances.id))
      .leftJoin(applianceCategories, eq(appliances.categoryId, applianceCategories.id))
      .leftJoin(manufacturers, eq(appliances.manufacturerId, manufacturers.id))
      .leftJoin(technicians, eq(services.technicianId, technicians.id))
      .orderBy(desc(services.createdAt));
      
      if (limit && limit > 0) {
        query = query.limit(limit) as any;
      }
      
      const result = await query;
      
      if (result.length > 0) {
        console.log("Ključevi prvog servisa:", Object.keys(result[0]));
        if (result[0].createdAt) {
          console.log("Prvi servis createdAt:", new Date(result[0].createdAt).toISOString().split('T')[0]);
        }
      }
      
      console.log(`Uspješno dohvaćeno ${result.length} servisa sa validnim referencama`);
      
      const transformedResult = result.map(service => {
        const transformed = { ...service };
        
        if (!transformed.createdAt && (transformed as any).created_at) {
          transformed.createdAt = (transformed as any).created_at;
        }
        
        if (!transformed.completedDate && (transformed as any).completed_date) {
          transformed.completedDate = (transformed as any).completed_date;
        }
        
        return transformed;
      });
      
      return transformedResult;
    } catch (error) {
      console.error("Greška pri dobijanju svih servisa sa validacijom veza:", error);
      console.log("Korištenje fallback upita za dohvatanje servisa");
      return await db.select().from(services);
    }
  }

  async getService(id: number): Promise<Service | undefined> {
    console.log(`[storage.getService] Pozvan za ID: ${id}, tip: ${typeof id}`);
    
    try {
      const rawResult = await db.execute(sql`SELECT * FROM services WHERE id = ${id}`);
      console.log(`[storage.getService] RAW SQL rezultat:`, rawResult.rows?.length || 0, 'redova');
    } catch (e) {
      console.error(`[storage.getService] RAW SQL greška:`, e);
    }
    
    const result = await db.select()
      .from(services)
      .where(eq(services.id, id));
    
    console.log(`[storage.getService] Drizzle rezultat - pronađeno ${result.length} rezultata`);
    if (result.length > 0) {
      console.log(`[storage.getService] Prvi rezultat ID:`, result[0].id);
    }
    
    const service = result[0];
    console.log(`[storage.getService] Vraćam:`, service ? `Servis ID ${service.id}` : 'undefined');
    return service;
  }

  async getServicesByClient(clientId: number): Promise<Service[]> {
    return await db.select().from(services).where(eq(services.clientId, clientId));
  }

  async getServicesByStatus(status: ServiceStatus, limit?: number): Promise<Service[]> {
    let query = db.select().from(services).where(eq(services.status, status));
    
    if (limit && limit > 0) {
      query = query.limit(limit) as any;
    }
    
    return await query;
  }

  async getServicesByStatusDetailed(status: ServiceStatus): Promise<any[]> {
    console.log(`getServicesByStatusDetailed called with status: ${status}`);
    return [];
  }

  async createService(data: InsertService): Promise<Service> {
    const [service] = await db.insert(services).values(data).returning();
    return service;
  }

  async updateService(id: number, data: InsertService): Promise<Service | undefined> {
    const [updatedService] = await db
      .update(services)
      .set(data)
      .where(eq(services.id, id))
      .returning();
    return updatedService;
  }

  async getServicesByTechnician(technicianId: number, limit?: number): Promise<ServiceWithDetails[]> {
    try {
      console.log(`Dohvatam servise za tehničara ${technicianId} sa JOIN podacima`);
      
      let query = db.select({
        id: services.id,
        clientId: services.clientId,
        applianceId: services.applianceId,
        technicianId: services.technicianId,
        description: services.description,
        status: services.status,
        warrantyStatus: services.warrantyStatus,
        createdAt: services.createdAt,
        scheduledDate: services.scheduledDate,
        completedDate: services.completedDate,
        technicianNotes: services.technicianNotes,
        cost: services.cost,
        usedParts: services.usedParts,
        machineNotes: services.machineNotes,
        isCompletelyFixed: services.isCompletelyFixed,
        businessPartnerId: services.businessPartnerId,
        partnerCompanyName: services.partnerCompanyName,
        clientName: clients.fullName,
        clientCity: clients.city,
        clientAddress: clients.address,
        clientPhone: clients.phone,
        clientEmail: clients.email,
        applianceName: appliances.model,
        applianceSerialNumber: appliances.serialNumber,
        categoryName: applianceCategories.name,
        manufacturerName: manufacturers.name,
        technicianName: technicians.fullName
      })
      .from(services)
      .innerJoin(clients, eq(services.clientId, clients.id))
      .innerJoin(appliances, eq(services.applianceId, appliances.id))
      .leftJoin(applianceCategories, eq(appliances.categoryId, applianceCategories.id))
      .leftJoin(manufacturers, eq(appliances.manufacturerId, manufacturers.id))
      .leftJoin(technicians, eq(services.technicianId, technicians.id))
      .where(eq(services.technicianId, technicianId))
      .orderBy(desc(services.createdAt));
        
      if (limit && limit > 0) {
        query = query.limit(limit) as any;
      }
      
      const result = await query;
      console.log(`Pronađeno ${result.length} servisa za tehničara ${technicianId} sa kompletnim podacima`);
      
      return result as Service[];
    } catch (error) {
      console.error(`Greška pri dohvatanju servisa za tehničara ${technicianId}:`, error);
      throw error;
    }
  }

  async getServicesByTechnicianAndStatus(technicianId: number, status: ServiceStatus, limit?: number): Promise<ServiceWithDetails[]> {
    try {
      console.log(`Dohvatam servise za tehničara ${technicianId} sa statusom '${status}'`);
      
      let query = db
        .select()
        .from(services)
        .where(and(
          eq(services.technicianId, technicianId),
          eq(services.status, status)
        ))
        .orderBy(desc(services.createdAt));
        
      if (limit && limit > 0) {
        query = query.limit(limit) as any;
      }
      
      const results = await query;
      console.log(`Pronađeno ${results.length} servisa za tehničara ${technicianId} sa statusom '${status}'`);
      return results;
    } catch (error) {
      console.error(`Greška pri dohvatanju servisa za tehničara ${technicianId} sa statusom '${status}':`, error);
      throw error;
    }
  }
}

// Singleton instance
export const serviceStorage = new ServiceStorage();
