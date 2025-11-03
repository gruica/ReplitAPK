/**
 * SERVICE STORAGE MODULE
 * Modularizovani storage za service management funkcionalnost
 * Izdvojeno iz monolitnog storage.ts za bolju organizaciju
 */

import { db } from "../db.js";
import { pool } from "../db.js";
import { 
  services, clients, appliances, applianceCategories, 
  manufacturers, technicians, removedParts, notifications
} from "../../shared/schema/index.js";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
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
      let query = db.select({
        // ALL service fields
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
        billingPrice: services.billingPrice,
        billingPriceReason: services.billingPriceReason,
        excludeFromBilling: services.excludeFromBilling,
        usedParts: services.usedParts,
        machineNotes: services.machineNotes,
        isCompletelyFixed: services.isCompletelyFixed,
        businessPartnerId: services.businessPartnerId,
        partnerCompanyName: services.partnerCompanyName,
        clientUnavailableReason: services.clientUnavailableReason,
        needsRescheduling: services.needsRescheduling,
        reschedulingNotes: services.reschedulingNotes,
        devicePickedUp: services.devicePickedUp,
        pickupDate: services.pickupDate,
        pickupNotes: services.pickupNotes,
        customerRefusesRepair: services.customerRefusesRepair,
        customerRefusalReason: services.customerRefusalReason,
        repairFailed: services.repairFailed,
        repairFailureReason: services.repairFailureReason,
        replacedPartsBeforeFailure: services.replacedPartsBeforeFailure,
        repairFailureDate: services.repairFailureDate,
        isWarrantyService: services.isWarrantyService,
        // JOIN fields
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
      return await db.select().from(services);
    }
  }

  async getService(id: number): Promise<Service | undefined> {
    console.log(`🔍 [SERVICE STORAGE] Getting service with ID: ${id}, type: ${typeof id}`);
    try {
      const result = await db.select()
        .from(services)
        .where(eq(services.id, id));
      
      console.log(`🔍 [SERVICE STORAGE] Raw result:`, JSON.stringify(result).slice(0, 200));
      console.log(`🔍 [SERVICE STORAGE] Result array length:`, result.length);
      console.log(`🔍 [SERVICE STORAGE] Query result:`, result.length > 0 ? 'FOUND' : 'NOT FOUND', result[0] ? `Service ID: ${result[0].id}` : 'No data');
      
      return result[0];
    } catch (error) {
      console.error(`🔍 [SERVICE STORAGE] ERROR in getService:`, error);
      return undefined;
    }
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
      let query = db.select({
        // ALL service fields
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
        billingPrice: services.billingPrice,
        billingPriceReason: services.billingPriceReason,
        excludeFromBilling: services.excludeFromBilling,
        usedParts: services.usedParts,
        machineNotes: services.machineNotes,
        isCompletelyFixed: services.isCompletelyFixed,
        businessPartnerId: services.businessPartnerId,
        partnerCompanyName: services.partnerCompanyName,
        clientUnavailableReason: services.clientUnavailableReason,
        needsRescheduling: services.needsRescheduling,
        reschedulingNotes: services.reschedulingNotes,
        devicePickedUp: services.devicePickedUp,
        pickupDate: services.pickupDate,
        pickupNotes: services.pickupNotes,
        customerRefusesRepair: services.customerRefusesRepair,
        customerRefusalReason: services.customerRefusalReason,
        repairFailed: services.repairFailed,
        repairFailureReason: services.repairFailureReason,
        replacedPartsBeforeFailure: services.replacedPartsBeforeFailure,
        repairFailureDate: services.repairFailureDate,
        isWarrantyService: services.isWarrantyService,
        // JOIN fields
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
      
      return result as Service[];
    } catch (error) {
      console.error(`Greška pri dohvatanju servisa za tehničara ${technicianId}:`, error);
      throw error;
    }
  }

  async getServicesByTechnicianAndStatus(technicianId: number, status: ServiceStatus, limit?: number): Promise<ServiceWithDetails[]> {
    try {
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
      return results;
    } catch (error) {
      console.error(`Greška pri dohvatanju servisa za tehničara ${technicianId} sa statusom '${status}':`, error);
      throw error;
    }
  }

  async getRecentServices(limit: number): Promise<ServiceWithDetails[]> {
    const results = await db
      .select({
        id: services.id,
        clientId: services.clientId,
        applianceId: services.applianceId,
        technicianId: services.technicianId,
        description: services.description,
        status: services.status,
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
        warrantyStatus: services.warrantyStatus,
        clientFullName: clients.fullName,
        clientPhone: clients.phone,
        clientEmail: clients.email,
        clientAddress: clients.address,
        clientCity: clients.city,
        applianceModel: appliances.model,
        applianceSerialNumber: appliances.serialNumber,
        categoryName: applianceCategories.name,
        categoryIcon: applianceCategories.icon,
        manufacturerName: manufacturers.name
      })
      .from(services)
      .leftJoin(clients, eq(services.clientId, clients.id))
      .leftJoin(appliances, eq(services.applianceId, appliances.id))
      .leftJoin(applianceCategories, eq(appliances.categoryId, applianceCategories.id))
      .leftJoin(manufacturers, eq(appliances.manufacturerId, manufacturers.id))
      .orderBy(desc(services.createdAt))
      .limit(limit);

    return results.map(row => ({
      id: row.id,
      clientId: row.clientId,
      applianceId: row.applianceId,
      technicianId: row.technicianId,
      description: row.description,
      status: row.status,
      createdAt: row.createdAt,
      scheduledDate: row.scheduledDate,
      completedDate: row.completedDate,
      technicianNotes: row.technicianNotes,
      cost: row.cost,
      usedParts: row.usedParts,
      machineNotes: row.machineNotes,
      isCompletelyFixed: row.isCompletelyFixed,
      businessPartnerId: row.businessPartnerId,
      partnerCompanyName: row.partnerCompanyName,
      warrantyStatus: row.warrantyStatus,
      devicePickedUp: false,
      pickupDate: null,
      pickupNotes: null,
      isWarrantyService: false,
      clientRating: null,
      clientFeedback: null,
      feedbackDate: null,
      feedbackNotes: null,
      hasApplianceDefect: false,
      defectDescription: null,
      defectDetectionDate: null,
      warrantyExpirationDate: null,
      partsNeeded: false,
      estimatedCost: null,
      repairPossible: true,
      repairFailureReason: null,
      repairFailureDate: null,
      priority: 'medium' as const,
      notes: null,
      client: row.clientFullName ? {
        id: row.clientId,
        fullName: row.clientFullName,
        phone: row.clientPhone,
        email: row.clientEmail,
        address: row.clientAddress,
        city: row.clientCity,
        companyName: null
      } : undefined,
      appliance: row.applianceModel || row.categoryName ? {
        id: row.applianceId,
        model: row.applianceModel,
        serialNumber: row.applianceSerialNumber,
        category: row.categoryName ? {
          id: row.applianceId,
          name: row.categoryName,
          icon: row.categoryIcon
        } : undefined,
        manufacturer: row.manufacturerName ? {
          name: row.manufacturerName
        } : undefined
      } : undefined
    })) as any[]; // Type cast to any[] for complex JOIN mapping
  }

  async getServicesByPartner(partnerId: number): Promise<any[]> {
    try {
      const rawServices = await db
        .select({
          id: services.id,
          clientId: services.clientId,
          applianceId: services.applianceId,
          technicianId: services.technicianId,
          description: services.description,
          status: services.status,
          createdAt: services.createdAt,
          scheduledDate: services.scheduledDate,
          completedDate: services.completedDate,
          technicianNotes: services.technicianNotes,
          cost: services.cost,
          isCompletelyFixed: services.isCompletelyFixed,
          businessPartnerId: services.businessPartnerId,
          partnerCompanyName: services.partnerCompanyName,
          clientFullName: clients.fullName,
          clientEmail: clients.email,
          clientPhone: clients.phone,
          clientAddress: clients.address,
          clientCity: clients.city,
          applianceModel: appliances.model,
          applianceSerialNumber: appliances.serialNumber,
          applianceCategoryId: appliances.categoryId,
          applianceManufacturerId: appliances.manufacturerId,
          categoryName: applianceCategories.name,
          categoryIcon: applianceCategories.icon,
          manufacturerName: manufacturers.name,
          technicianFullName: technicians.fullName,
          technicianSpecialization: technicians.specialization
        })
        .from(services)
        .leftJoin(clients, eq(services.clientId, clients.id))
        .leftJoin(appliances, eq(services.applianceId, appliances.id))
        .leftJoin(applianceCategories, eq(appliances.categoryId, applianceCategories.id))
        .leftJoin(manufacturers, eq(appliances.manufacturerId, manufacturers.id))
        .leftJoin(technicians, eq(services.technicianId, technicians.id))
        .where(eq(services.businessPartnerId, partnerId))
        .orderBy(desc(services.createdAt));

      const servicesWithDetails = rawServices.map(row => ({
        id: row.id,
        clientId: row.clientId,
        applianceId: row.applianceId,
        technicianId: row.technicianId,
        description: row.description,
        status: row.status,
        createdAt: row.createdAt,
        scheduledDate: row.scheduledDate,
        completedDate: row.completedDate,
        technicianNotes: row.technicianNotes,
        cost: row.cost,
        isCompletelyFixed: row.isCompletelyFixed,
        businessPartnerId: row.businessPartnerId,
        partnerCompanyName: row.partnerCompanyName,
        client: row.clientFullName ? {
          id: row.clientId,
          fullName: row.clientFullName,
          email: row.clientEmail,
          phone: row.clientPhone,
          address: row.clientAddress,
          city: row.clientCity,
          companyName: null
        } : null,
        appliance: row.applianceModel ? {
          model: row.applianceModel,
          serialNumber: row.applianceSerialNumber,
          categoryId: row.applianceCategoryId,
          manufacturerId: row.applianceManufacturerId
        } : null,
        category: row.categoryName ? {
          name: row.categoryName,
          icon: row.categoryIcon
        } : null,
        manufacturer: row.manufacturerName ? {
          name: row.manufacturerName
        } : null,
        technician: row.technicianFullName ? {
          fullName: row.technicianFullName,
          specialization: row.technicianSpecialization
        } : null
      }));

      return servicesWithDetails;
    } catch (error) {
      console.error('Greška pri dobijanju servisa za poslovnog partnera:', error);
      return [];
    }
  }

  async getServiceWithDetails(serviceId: number): Promise<any> {
    const [service] = await db.select().from(services).where(eq(services.id, serviceId));
    
    if (!service) return null;
    
    let client = null;
    if (service.clientId) {
      const [clientData] = await db.select().from(clients).where(eq(clients.id, service.clientId));
      if (clientData) {
        client = {
          id: clientData.id,
          fullName: clientData.fullName,
          phone: clientData.phone,
          email: clientData.email,
          address: clientData.address,
          city: clientData.city
        };
      }
    }
    
    let appliance = null;
    
    if (service.applianceId) {
      // Use raw SQL to avoid Drizzle mapping issues with purchaseDate
      const applianceResult = await db.execute(
        sql`SELECT id, client_id as "clientId", category_id as "categoryId", manufacturer_id as "manufacturerId", 
            model, serial_number as "serialNumber", purchase_date as "purchaseDate", notes 
            FROM appliances WHERE id = ${service.applianceId}`
      );
      const applianceData = applianceResult.rows[0] as any;
      
      console.log(`🔍 DEBUG - applianceData RAW (SQL):`, JSON.stringify(applianceData, null, 2));
      
      if (applianceData) {
        let category = null;
        let manufacturer = null;
        
        if (applianceData.categoryId) {
          const [categoryData] = await db.select().from(applianceCategories).where(eq(applianceCategories.id, applianceData.categoryId));
          if (categoryData) {
            category = {
              id: categoryData.id,
              name: categoryData.name
            };
          }
        }
        
        if (applianceData.manufacturerId) {
          const [manufacturerData] = await db.select().from(manufacturers).where(eq(manufacturers.id, applianceData.manufacturerId));
          if (manufacturerData) {
            manufacturer = {
              id: manufacturerData.id,
              name: manufacturerData.name
            };
          }
        }
        
        appliance = {
          id: applianceData.id,
          model: applianceData.model,
          serialNumber: applianceData.serialNumber,
          purchaseDate: applianceData.purchaseDate,
          category,
          manufacturer
        };
      }
    }
    
    let technician = null;
    if (service.technicianId) {
      const [technicianData] = await db.select().from(technicians).where(eq(technicians.id, service.technicianId));
      if (technicianData) {
        technician = {
          id: technicianData.id,
          fullName: technicianData.fullName,
          phone: technicianData.phone,
          email: technicianData.email,
          specialization: technicianData.specialization
        };
      }
    }
    
    const removedPartsList = await db.select().from(removedParts).where(eq(removedParts.serviceId, serviceId));
    
    return {
      ...service,
      client,
      appliance,
      technician,
      removedParts: removedPartsList
    };
  }

  async getServiceStatusHistory(serviceId: number): Promise<any[]> {
    const [service] = await db.select().from(services).where(eq(services.id, serviceId));
    
    if (!service) return [];
    
    const history = [];
    
    history.push({
      id: 1,
      serviceId,
      oldStatus: "",
      newStatus: "on_hold",
      notes: "Servis kreiran",
      createdAt: service.createdAt,
      createdBy: "Poslovni partner"
    });
    
    if (service.status !== "on_hold") {
      history.push({
        id: 2,
        serviceId,
        oldStatus: "on_hold",
        newStatus: "pending",
        notes: "Servis primljen na razmatranje",
        createdAt: new Date(new Date(service.createdAt).getTime() + 86400000).toISOString(),
        createdBy: "Administrator"
      });
    }
    
    if (service.status === "in_progress" || service.status === "completed" || service.status === "canceled") {
      history.push({
        id: 3,
        serviceId,
        oldStatus: "pending",
        newStatus: "in_progress",
        notes: "Serviser dodeljen",
        createdAt: service.scheduledDate || new Date(new Date(service.createdAt).getTime() + 172800000).toISOString(),
        createdBy: service.technicianId ? `Serviser ${service.technicianId}` : "Administrator"
      });
    }
    
    if (service.status === "completed") {
      history.push({
        id: 4,
        serviceId,
        oldStatus: "in_progress",
        newStatus: "completed",
        notes: service.technicianNotes || "Servis završen",
        createdAt: service.completedDate || new Date().toISOString(),
        createdBy: service.technicianId ? `Serviser ${service.technicianId}` : "Administrator"
      });
    } else if (service.status === "canceled") {
      history.push({
        id: 4,
        serviceId,
        oldStatus: "in_progress",
        newStatus: "canceled",
        notes: "Servis otkazan",
        createdAt: new Date().toISOString(),
        createdBy: "Administrator"
      });
    }
    
    return history;
  }

  async getAdminServices(): Promise<any[]> {
    try {
      const allServices = await db
        .select()
        .from(services)
        .orderBy(desc(services.createdAt));
      
      if (allServices.length === 0) {
        return [];
      }

      const clientIds = [...new Set(allServices.map(s => s.clientId))];
      const applianceIds = [...new Set(allServices.map(s => s.applianceId))];
      const technicianIds = [...new Set(allServices.map(s => s.technicianId).filter(id => id !== null))];

      const clientsData = await db
        .select()
        .from(clients)
        .where(inArray(clients.id, clientIds));

      const appliancesData = await db
        .select({
          id: appliances.id,
          model: appliances.model,
          serialNumber: appliances.serialNumber,
          categoryId: appliances.categoryId,
          manufacturerId: appliances.manufacturerId,
          categoryName: applianceCategories.name,
          categoryIcon: applianceCategories.icon,
          manufacturerName: manufacturers.name,
        })
        .from(appliances)
        .innerJoin(applianceCategories, eq(appliances.categoryId, applianceCategories.id))
        .innerJoin(manufacturers, eq(appliances.manufacturerId, manufacturers.id))
        .where(inArray(appliances.id, applianceIds));

      const techniciansData = technicianIds.length > 0 
        ? await db
            .select()
            .from(technicians)
            .where(inArray(technicians.id, technicianIds))
        : [];

      const clientsMap = new Map(clientsData.map(c => [c.id, c]));
      const appliancesMap = new Map(appliancesData.map(a => [a.id, a]));
      const techniciansMap = new Map(techniciansData.map(t => [t.id, t]));

      return allServices.map(service => {
        const client = clientsMap.get(service.clientId);
        const appliance = appliancesMap.get(service.applianceId);
        const technician = service.technicianId ? techniciansMap.get(service.technicianId) : null;

        return {
          id: service.id,
          status: service.status,
          description: service.description,
          createdAt: service.createdAt,
          updatedAt: service.createdAt,
          scheduledDate: service.scheduledDate,
          completedDate: service.completedDate,
          isWarrantyService: service.isWarrantyService,
          devicePickedUp: service.devicePickedUp || false,
          pickupDate: service.pickupDate,
          pickupNotes: service.pickupNotes,
          technicianId: service.technicianId,
          clientId: service.clientId,
          applianceId: service.applianceId,
          priority: 'medium',
          notes: null,
          technicianNotes: service.technicianNotes,
          usedParts: service.usedParts,
          machineNotes: service.machineNotes,
          cost: service.cost,
          isCompletelyFixed: service.isCompletelyFixed,
          warrantyStatus: service.warrantyStatus,
          businessPartnerId: service.businessPartnerId,
          partnerCompanyName: service.partnerCompanyName,
          client: client ? {
            id: client.id,
            fullName: client.fullName,
            phone: client.phone,
            email: client.email,
            address: client.address,
            city: client.city,
            companyName: (client as any).companyName || null,
          } : null,
          appliance: appliance ? {
            id: appliance.id,
            model: appliance.model,
            serialNumber: appliance.serialNumber,
            category: {
              id: appliance.categoryId,
              name: appliance.categoryName,
              icon: appliance.categoryIcon,
            },
            manufacturer: {
              id: appliance.manufacturerId,
              name: appliance.manufacturerName,
            },
          } : null,
          technician: technician ? {
            id: technician.id,
            fullName: technician.fullName,
            email: technician.email,
            phone: technician.phone,
            specialization: technician.specialization,
          } : null,
        };
      });
    } catch (error) {
      console.error('Greška pri dohvatanju admin servisa:', error);
      return [];
    }
  }

  async getAdminServiceById(id: number): Promise<any | undefined> {
    try {
      const [service] = await db
        .select()
        .from(services)
        .where(eq(services.id, id));

      if (!service) return undefined;

      const [client] = service.clientId ? await db
        .select()
        .from(clients)
        .where(eq(clients.id, service.clientId)) : [null];

      const [appliance] = service.applianceId ? await db
        .select()
        .from(appliances)
        .where(eq(appliances.id, service.applianceId)) : [null];

      const [technician] = service.technicianId ? await db
        .select()
        .from(technicians)
        .where(eq(technicians.id, service.technicianId)) : [null];

      let category = null;
      let manufacturer = null;
      if (appliance) {
        if (appliance.categoryId) {
          [category] = await db
            .select()
            .from(applianceCategories)
            .where(eq(applianceCategories.id, appliance.categoryId));
        }
        if (appliance.manufacturerId) {
          [manufacturer] = await db
            .select()
            .from(manufacturers)
            .where(eq(manufacturers.id, appliance.manufacturerId));
        }
      }

      return {
        id: service.id,
        status: service.status,
        description: service.description,
        createdAt: service.createdAt,
        updatedAt: service.createdAt,
        scheduledDate: service.scheduledDate,
        completedDate: service.completedDate,
        technicianId: service.technicianId,
        clientId: service.clientId,
        applianceId: service.applianceId,
        priority: 'medium',
        notes: null,
        technicianNotes: service.technicianNotes,
        usedParts: service.usedParts,
        machineNotes: service.machineNotes,
        cost: service.cost,
        isCompletelyFixed: service.isCompletelyFixed,
        warrantyStatus: service.warrantyStatus,
        businessPartnerId: service.businessPartnerId,
        partnerCompanyName: service.partnerCompanyName,
        client: client ? {
          id: client.id,
          fullName: client.fullName,
          phone: client.phone,
          email: client.email,
          address: client.address,
          city: client.city,
          companyName: (client as any).companyName || null,
        } : null,
        appliance: appliance ? {
          id: appliance.id,
          model: appliance.model,
          serialNumber: appliance.serialNumber,
          category: category ? {
            id: category.id,
            name: category.name,
            icon: category.icon,
          } : null,
          manufacturer: manufacturer ? {
            id: manufacturer.id,
            name: manufacturer.name,
          } : null,
        } : null,
        technician: technician ? {
          id: technician.id,
          fullName: technician.fullName,
          email: technician.email,
          phone: technician.phone,
          specialization: technician.specialization,
        } : null,
      };
    } catch (error) {
      console.error('Greška pri dohvatanju admin servisa:', error);
      return undefined;
    }
  }

  async updateAdminService(id: number, updates: any): Promise<any | undefined> {
    try {
      const [updated] = await db
        .update(services)
        .set({
          ...updates
        })
        .where(eq(services.id, id))
        .returning();

      if (!updated) return undefined;

      return this.getAdminServiceById(id);
    } catch (error) {
      console.error('Greška pri ažuriranju admin servisa:', error);
      return undefined;
    }
  }

  async deleteAdminService(id: number): Promise<boolean> {
    try {
      if (isNaN(id) || id <= 0) {
        console.error('Nevaljan ID servisa za brisanje:', id);
        return false;
      }

      const existingService = await db
        .select()
        .from(services)
        .where(eq(services.id, id))
        .limit(1);
      
      if (existingService.length === 0) {
        return false;
      }

      await db
        .delete(notifications)
        .where(eq(notifications.relatedServiceId, id))
        .returning();

      const result = await db
        .delete(services)
        .where(eq(services.id, id))
        .returning();

      return result.length > 0;
    } catch (error) {
      console.error('Greška pri brisanju admin servisa:', error);
      return false;
    }
  }

  async assignTechnicianToService(serviceId: number, technicianId: number): Promise<any | undefined> {
    try {
      const [updated] = await db
        .update(services)
        .set({
          technicianId,
          status: 'assigned'
        })
        .where(eq(services.id, serviceId))
        .returning();

      if (!updated) return undefined;

      return this.getAdminServiceById(serviceId);
    } catch (error) {
      console.error('Greška pri dodeli servisera:', error);
      return undefined;
    }
  }

  /**
   * GET SERVICE STATISTICS
   * Vraća statistiku servisa po statusu
   */
  async getServiceStats() {
    try {
      const [activeServices, completedServices, pendingServices, assignedServices, failedServices] = await Promise.all([
        db.select().from(services).where(eq(services.status, 'in_progress')),
        db.select().from(services).where(eq(services.status, 'completed')),
        db.select().from(services).where(eq(services.status, 'pending')),
        db.select().from(services).where(eq(services.status, 'assigned')),
        db.select().from(services).where(eq(services.status, 'repair_failed'))
      ]);

      return {
        total: activeServices.length + completedServices.length + pendingServices.length + assignedServices.length + failedServices.length,
        active: activeServices.length,
        completed: completedServices.length,
        pending: pendingServices.length,
        assigned: assignedServices.length,
        failed: failedServices.length,
        byStatus: {
          in_progress: activeServices.length,
          completed: completedServices.length,
          pending: pendingServices.length,
          assigned: assignedServices.length,
          repair_failed: failedServices.length
        }
      };
    } catch (error) {
      console.error('[ServiceStorage.getServiceStats] Greška:', error);
      throw error;
    }
  }

  /**
   * EXPORT SERVICES TO CSV
   * Exportuje servise u CSV format
   */
  async exportServicesToCSV(): Promise<string> {
    try {
      const allServices = await this.getAllServices();
      
      // CSV header
      const headers = [
        'ID', 'Status', 'Klijent', 'Telefon', 'Grad', 'Adresa',
        'Uređaj', 'Kategorija', 'Proizvođač', 'Serijski broj',
        'Serviser', 'Opis', 'Datum kreiranja', 'Zakazan datum', 'Završen datum',
        'Garancija', 'Trošak', 'Delovi', 'Napomene'
      ];

      const csvRows = [headers.join(',')];

      for (const service of allServices) {
        const row = [
          service.id,
          service.status || '',
          `"${(service.clientName || '').replace(/"/g, '""')}"`,
          service.clientPhone || '',
          service.clientCity || '',
          `"${(service.clientAddress || '').replace(/"/g, '""')}"`,
          `"${(service.applianceName || '').replace(/"/g, '""')}"`,
          service.categoryName || '',
          service.manufacturerName || '',
          service.applianceSerialNumber || '',
          service.technicianName || '',
          `"${(service.description || '').replace(/"/g, '""')}"`,
          service.createdAt || '',
          service.scheduledDate || '',
          service.completedDate || '',
          service.warrantyStatus || '',
          service.cost || '',
          service.usedParts ? `"${service.usedParts.replace(/"/g, '""')}"` : '',
          service.technicianNotes ? `"${service.technicianNotes.replace(/"/g, '""')}"` : ''
        ];
        csvRows.push(row.join(','));
      }

      return csvRows.join('\n');
    } catch (error) {
      console.error('[ServiceStorage.exportServicesToCSV] Greška:', error);
      throw error;
    }
  }
}

// Singleton instance
export const serviceStorage = new ServiceStorage();
