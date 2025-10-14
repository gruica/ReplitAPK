import type { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { jwtAuth, jwtAuthMiddleware, requireRole } from "../jwt-auth";
import { emailService } from "../email-service";
import { logger } from "../production-logger";
import { 
  serviceStatusEnum,
  insertServiceCompletionReportSchema 
} from "@shared/schema";

const STATUS_DESCRIPTIONS: Record<string, string> = {
  pending: "Na čekanju",
  assigned: "Dodeljen serviseru",
  in_progress: "U toku",
  completed: "Završen",
  repair_failed: "Neuspješna popravka",
  cancelled: "Otkazan"
};

/**
 * Service Routes
 * - Services CRUD (GET, POST, PUT, DELETE)
 * - Service assignment
 * - Service completion reports
 * - Business partner services
 * - Service conversations
 */
export function registerServiceRoutes(app: Express) {
  
  // ========== CORE SERVICE CRUD ==========
  
  /**
   * @swagger
   * /api/services:
   *   get:
   *     tags: [Services]
   *     summary: Get all services
   *     description: Retrieve services with optional filters (status, technician, limit)
   *     parameters:
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [pending, assigned, in_progress, completed, repair_failed, cancelled]
   *         description: Filter by service status
   *       - in: query
   *         name: technicianId
   *         schema:
   *           type: integer
   *         description: Filter by technician ID
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *         description: Limit number of results
   *     responses:
   *       200:
   *         description: Services retrieved successfully
   *         headers:
   *           X-Execution-Time:
   *             description: Query execution time in milliseconds
   *             schema:
   *               type: string
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Service'
   *       400:
   *         description: Invalid parameters
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  // GET /api/services - Get all services with optional filters
  app.get("/api/services", async (req, res) => {
    try {
      const startTime = Date.now();
      const { status, technicianId, limit } = req.query;
      
      let limitNumber = undefined;
      if (limit && typeof limit === 'string') {
        try {
          limitNumber = parseInt(limit);
        } catch {
          // Ignore invalid limit
        }
      }
      
      let services;
      
      if (technicianId && typeof technicianId === 'string') {
        try {
          const techId = parseInt(technicianId);
          
          if (status && typeof status === 'string' && status !== 'all') {
            try {
              const validStatus = serviceStatusEnum.parse(status);
              services = await storage.getServicesByTechnicianAndStatus(techId, validStatus, limitNumber);
            } catch {
              return res.status(400).json({ error: "Nevažeći status servisa" });
            }
          } else {
            services = await storage.getServicesByTechnician(techId, limitNumber);
          }
        } catch (err) {
          return res.status(400).json({ error: "Nevažeći ID servisera" });
        }
      }
      else if (status && typeof status === 'string' && status !== 'all') {
        try {
          const validStatus = serviceStatusEnum.parse(status);
          services = await storage.getServicesByStatus(validStatus, limitNumber);
        } catch {
          return res.status(400).json({ error: "Nevažeći status servisa" });
        }
      } else {
        services = await storage.getAllServices(limitNumber);
      }
      
      let formattedServices = services;
      
      if (services.length > 0 && !services[0].createdAt && (services[0] as any).created_at) {
        logger.debug("Potrebno mapiranje iz snake_case u camelCase");
        formattedServices = services.map(service => {
          if (!service.createdAt && (service as any).created_at) {
            return {
              ...service,
              createdAt: (service as any).created_at
            };
          }
          return service;
        });
      }
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      if (executionTime > 200) {
        logger.debug(`API vraća ${formattedServices.length} servisa - SPORO (${executionTime}ms)`);
      } else {
        logger.debug(`API vraća ${formattedServices.length} servisa (${executionTime}ms)`);
      }
      
      if (formattedServices.length > 0) {
        logger.debug("Ključevi prvog servisa:", Object.keys(formattedServices[0]));
      }
      
      res.setHeader('X-Execution-Time', executionTime.toString());
      res.json(formattedServices);
    } catch (error) {
      console.error("Greška pri dobijanju servisa:", error);
      res.status(500).json({ error: "Greška pri dobijanju servisa" });
    }
  });
  
  /**
   * @swagger
   * /api/services/{id}:
   *   get:
   *     tags: [Services]
   *     summary: Get service by ID
   *     description: Retrieve detailed information about a specific service
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Service ID
   *     responses:
   *       200:
   *         description: Service retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Service'
   *       404:
   *         description: Service not found
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  // GET /api/services/:id - Get single service
  app.get("/api/services/:id", async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      console.log(`[GET /api/services/:id] Dohvatanje servisa ID: ${serviceId}`);
      const service = await storage.getService(serviceId);
      console.log(`[GET /api/services/:id] Rezultat:`, service ? 'Pronađen' : 'NIJE PRONAĐEN');
      if (service) {
        console.log(`[GET /api/services/:id] Servis ključevi:`, Object.keys(service));
      }
      if (!service) return res.status(404).json({ error: "Servis nije pronađen" });
      res.json(service);
    } catch (error) {
      console.error(`[GET /api/services/:id] Greška:`, error);
      res.status(500).json({ error: "Greška pri dobijanju servisa" });
    }
  });

  // GET /api/clients/:clientId/services - Get services for a client
  app.get("/api/clients/:clientId/services", async (req, res) => {
    try {
      const services = await storage.getServicesByClient(parseInt(req.params.clientId));
      res.json(services);
    } catch (error) {
      res.status(500).json({ error: "Greška pri dobijanju servisa klijenta" });
    }
  });

  // GET /api/services/technician/:technicianId - Get services for a technician
  app.get("/api/services/technician/:technicianId", jwtAuth, async (req, res) => {
    try {
      const technicianId = parseInt(req.params.technicianId);
      
      if (isNaN(technicianId)) {
        return res.status(400).json({ error: "Nevažeći ID servisera" });
      }

      if (req.user?.role === "technician" && req.user.technicianId !== technicianId) {
        return res.status(403).json({ error: "Nemate dozvolu da vidite servise drugih servisera" });
      }

      if (req.user?.role !== "admin" && req.user?.role !== "technician") {
        return res.status(403).json({ error: "Nemate dozvolu za pristup servisima" });
      }

      console.log(`[TEHNIČKI SERVISI] Dohvatanje servisa za servisera ${technicianId}, korisnik: ${req.user?.username} (${req.user?.role})`);

      const services = await storage.getServicesByTechnician(technicianId);
      
      console.log(`[TEHNIČKI SERVISI] Pronađeno ${services.length} servisa za servisera ${technicianId}`);
      
      res.json(services);
    } catch (error) {
      console.error("Greška pri dohvatanju servisa servisera:", error);
      res.status(500).json({ error: "Greška pri dohvatanju servisa" });
    }
  });

  // POST /api/services - Create new service
  app.post("/api/services", jwtAuth, async (req, res) => {
    try {
      logger.debug("=== KREIRANJE NOVOG SERVISA ===");
      logger.debug("Podaci iz frontend forme:", req.body);
      
      if (!["admin", "technician"].includes(req.user?.role || "")) {
        return res.status(403).json({ 
          error: "Nemate dozvolu", 
          message: "Samo administratori i serviseri mogu kreirati servise."
        });
      }
      
      console.log("Korisnik kreira servis:", req.user?.username, "uloga:", req.user?.role);
      
      const { clientId, applianceId, description } = req.body;
      
      if (!clientId || clientId <= 0) {
        return res.status(400).json({ 
          error: "Klijent je obavezan", 
          message: "Morate odabrati klijenta za servis."
        });
      }
      
      if (!applianceId || applianceId <= 0) {
        return res.status(400).json({ 
          error: "Uređaj je obavezan", 
          message: "Morate odabrati uređaj za servis."
        });
      }
      
      if (!description || description.trim() === "") {
        return res.status(400).json({ 
          error: "Opis je obavezan", 
          message: "Morate uneti opis servisa."
        });
      }
      
      const validatedData = {
        clientId: parseInt(clientId),
        applianceId: parseInt(applianceId),
        description: description.trim(),
        status: req.body.status || "pending",
        warrantyStatus: req.body.warrantyStatus || "out_of_warranty",
        createdAt: req.body.createdAt || new Date().toISOString().split('T')[0],
        technicianId: req.body.technicianId && req.body.technicianId > 0 ? parseInt(req.body.technicianId) : null,
        scheduledDate: req.body.scheduledDate || null,
        businessPartnerId: req.body.businessPartnerId || null,
        partnerCompanyName: req.body.partnerCompanyName || null
      };
      
      console.log("Validovani podaci za kreiranje:", validatedData);
      
      const service = await storage.createService(validatedData);
      if (!service) return res.status(500).json({ error: "Greška pri kreiranju servisa" });
      
      console.log("✅ Kreiran servis:", service.id);
      
      try {
        // SMS/WhatsApp notifications su opcioni - ne blokira kreiranje servisa
        // const { smsService } = await import('../sms-service.js'); // TODO: Fix import - file doesn't exist
        const { whatsappBusinessAPIService } = await import('../whatsapp-business-api-service.js');
        
        // WhatsApp notifikacije su trenutno onemogućene
        // if (whatsappBusinessAPIService && whatsappBusinessAPIService.isConfigured()) {
        //   // WhatsApp logic ovdje
        // }
      } catch (notificationError) {
        console.log('[NOTIFICATIONS] Optional notifications skipped:', notificationError);
      }
      
      res.status(201).json({
        success: true,
        message: "Servis je uspešno kreiran",
        data: service
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Nevažeći podaci servisa", details: error.format() });
      }
      console.error("Greška pri kreiranju servisa:", error);
      res.status(500).json({ error: "Greška pri kreiranju servisa", message: error instanceof Error ? error.message : "Nepoznata greška" });
    }
  });

  // PUT /api/services/:id - Update service (complex with email/SMS notifications)
  app.put("/api/services/:id", jwtAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      console.log("=== AŽURIRANJE SERVISA ===");
      console.log("ID servisa:", id);
      logger.debug("Podaci iz frontend forme:", req.body);
      
      const originalService = await storage.getService(id);
      if (!originalService) return res.status(404).json({ error: "Servis nije pronađen" });
      
      const { clientId, applianceId, description } = req.body;
      
      const validatedData = {
        clientId: clientId ? parseInt(clientId) : originalService.clientId,
        applianceId: applianceId ? parseInt(applianceId) : originalService.applianceId,
        description: description ? description.trim() : originalService.description,
        status: req.body.status || originalService.status,
        warrantyStatus: req.body.warrantyStatus || originalService.warrantyStatus || "out_of_warranty",
        createdAt: req.body.createdAt || originalService.createdAt,
        technicianId: req.body.technicianId !== undefined ? 
          (req.body.technicianId && req.body.technicianId > 0 ? parseInt(req.body.technicianId) : null) : 
          originalService.technicianId,
        scheduledDate: req.body.scheduledDate !== undefined ? req.body.scheduledDate : originalService.scheduledDate,
        completedDate: req.body.completedDate !== undefined ? req.body.completedDate : originalService.completedDate,
        technicianNotes: req.body.technicianNotes !== undefined ? req.body.technicianNotes : originalService.technicianNotes,
        cost: req.body.cost !== undefined ? req.body.cost : originalService.cost,
        usedParts: req.body.usedParts !== undefined ? req.body.usedParts : originalService.usedParts,
        machineNotes: req.body.machineNotes !== undefined ? req.body.machineNotes : originalService.machineNotes,
        isCompletelyFixed: req.body.isCompletelyFixed !== undefined ? req.body.isCompletelyFixed : originalService.isCompletelyFixed,
        businessPartnerId: req.body.businessPartnerId !== undefined ? req.body.businessPartnerId : originalService.businessPartnerId,
        partnerCompanyName: req.body.partnerCompanyName !== undefined ? req.body.partnerCompanyName : originalService.partnerCompanyName
      };
      
      console.log("Validovani podaci za ažuriranje:", validatedData);
      
      const updatedService = await storage.updateService(id, validatedData);
      if (!updatedService) return res.status(404).json({ error: "Greška pri ažuriranju servisa" });
      
      const emailInfo: {
        emailSent: boolean;
        clientName: string | null;
        emailDetails: string | null;
        emailError: string | null;
      } = {
        emailSent: false,
        clientName: null,
        emailDetails: null,
        emailError: null
      };
      
      // Proveravamo da li treba poslati email notifikaciju klijentu
      // Email se šalje u sledećim scenarijima:
      // 1. Status se promenio
      // 2. Servis je upravo završen (promenjen u "completed")
      // 3. Klijent je odbio popravku (customerRefusesRepair se promenio na true)
      // 4. Dodati su važni detalji kao što su troškovi ili delovi (kada je servis completed)
      const statusChanged = originalService.status !== updatedService.status;
      const justCompleted = statusChanged && updatedService.status === 'completed';
      const customerRefusedRepair = updatedService.customerRefusesRepair && 
                                    !originalService.customerRefusesRepair;
      const importantDetailsAdded = updatedService.status === 'completed' && (
        (updatedService.cost && updatedService.cost !== originalService.cost) ||
        (updatedService.usedParts && updatedService.usedParts !== originalService.usedParts) ||
        (updatedService.technicianNotes && updatedService.technicianNotes !== originalService.technicianNotes)
      );
      
      const shouldSendEmail = statusChanged || justCompleted || customerRefusedRepair || importantDetailsAdded;
      
      // Logovanje razloga slanja emaila za debugging
      if (shouldSendEmail) {
        const reasons = [];
        if (statusChanged) reasons.push(`status promenjen (${originalService.status} → ${updatedService.status})`);
        if (justCompleted) reasons.push('servis upravo završen');
        if (customerRefusedRepair) reasons.push('klijent odbio popravku');
        if (importantDetailsAdded) reasons.push('dodati važni detalji');
        console.log(`[EMAIL SISTEM] Email će biti poslat jer: ${reasons.join(', ')}`);
      }
      
      if (shouldSendEmail) {
        try {
          console.log(`[EMAIL SISTEM] Započinjem slanje obaveštenja o promeni statusa servisa #${id} u "${updatedService.status}"`);
          
          if (updatedService.clientId) {
            const client = await storage.getClient(updatedService.clientId);
            const technician = updatedService.technicianId ? await storage.getTechnician(updatedService.technicianId) : null;
            const technicianName = technician ? technician.fullName : "Nepoznat serviser";
            const statusDescription = STATUS_DESCRIPTIONS[updatedService.status] || updatedService.status;
            
            if (client) {
              emailInfo.clientName = client.fullName;
              
              console.log(`[EMAIL SISTEM] Pronađen klijent: ${client.fullName}, email: ${client.email || 'nije dostupan'}`);
              
              if (client.email) {
                console.log(`[EMAIL SISTEM] Pokušavam slanje emaila klijentu ${client.fullName} (${client.email})`);
                
                const clientEmailContent = updatedService.technicianNotes || updatedService.description || "";
                const clientEmailSent = await emailService.sendServiceStatusUpdate(
                  client, 
                  id,
                  statusDescription,
                  clientEmailContent,
                  technicianName,
                  updatedService.warrantyStatus,
                  updatedService.customerRefusesRepair || undefined,
                  updatedService.customerRefusalReason || undefined
                );
                
                if (clientEmailSent) {
                  console.log(`[EMAIL SISTEM] ✅ Uspešno poslato obaveštenje klijentu ${client.fullName}`);
                  emailInfo.emailSent = true;
                } else {
                  console.error(`[EMAIL SISTEM] ❌ Neuspešno slanje obaveštenja klijentu ${client.fullName}`);
                  emailInfo.emailError = `Nije moguće poslati email klijentu ${client.fullName}. Proverite SMTP konfiguraciju.`;
                }
              } else {
                emailInfo.emailError = `Klijent ${client.fullName} nema email adresu.`;
              }
            }
          }
        } catch (emailError: any) {
          console.error("Error sending email notifications:", emailError);
          emailInfo.emailError = emailError.message || "Nepoznata greška pri slanju emaila";
        }

        // SMS notifications
        try {
          const settingsArray = await storage.getSystemSettings();
          const settingsMap = Object.fromEntries(settingsArray.map(s => [s.key, s.value]));
          const smsConfig = {
            apiKey: settingsMap.sms_mobile_api_key || '',
            baseUrl: settingsMap.sms_mobile_base_url || 'https://api.smsmobileapi.com',
            senderId: settingsMap.sms_mobile_sender_id || null,
            enabled: settingsMap.sms_mobile_enabled === 'true'
          };
          
          if (smsConfig.enabled && smsConfig.apiKey) {
            const { SMSCommunicationService } = await import('../sms-communication-service.js');
            const smsService = new SMSCommunicationService(smsConfig);
            
            console.log(`[SMS SISTEM] Početak automatskih SMS triggera za servis #${id}`);
            
            if (updatedService.clientId) {
              const client = await storage.getClient(updatedService.clientId);
              if (client && client.phone) {
                try {
                  const statusDescription = STATUS_DESCRIPTIONS[updatedService.status] || updatedService.status;
                  await smsService.notifyClientStatusUpdate({
                    clientPhone: client.phone,
                    clientName: client.fullName,
                    serviceId: id.toString(),
                    deviceType: 'uređaj',
                    statusDescription: statusDescription,
                    technicianNotes: updatedService.technicianNotes || undefined
                  });
                  console.log(`[SMS SISTEM] ✅ SMS poslat korisniku ${client.fullName} (${client.phone})`);
                } catch (smsError) {
                  console.error(`[SMS SISTEM] ❌ Greška pri slanju SMS-a korisniku:`, smsError);
                }
              }
            }

            if (updatedService.businessPartnerId) {
              try {
                const businessPartner = await storage.getUser(updatedService.businessPartnerId);
                if (businessPartner && businessPartner.phone) {
                  const client = await storage.getClient(updatedService.clientId!);
                  const statusDescription = STATUS_DESCRIPTIONS[updatedService.status] || updatedService.status;
                  
                  await smsService.notifyBusinessPartnerStatusUpdate({
                    partnerPhone: businessPartner.phone,
                    partnerName: businessPartner.fullName,
                    serviceId: id.toString(),
                    clientName: client?.fullName || 'Nepoznat klijent', 
                    deviceType: 'uređaj',
                    statusDescription: statusDescription,
                    technicianNotes: updatedService.technicianNotes || undefined
                  });
                  console.log(`[SMS SISTEM] ✅ SMS poslat poslovnom partneru ${businessPartner.fullName} (${businessPartner.phone})`);
                }
              } catch (smsError) {
                console.error(`[SMS SISTEM] ❌ Greška pri slanju SMS-a poslovnom partneru:`, smsError);
              }
            }
            
          } else {
            console.log("[SMS SISTEM] SMS servis nije konfigurisan, preskačem automatske triggere");
          }
        } catch (smsError) {
          console.error("[SMS SISTEM] Globalna greška pri slanju SMS obaveštenja:", smsError);
        }
      }
      
      res.json({
        ...updatedService,
        ...emailInfo
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Nevažeći podaci servisa", details: error.format() });
      }
      res.status(500).json({ error: "Greška pri ažuriranju servisa" });
    }
  });

  // PUT /api/services/:id/assign-technician - Assign technician to service (admin only)
  app.put('/api/services/:id/assign-technician', jwtAuth, requireRole(['admin']), async (req: any, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      const { technicianId } = req.body;
      
      console.log(`[ADMIN SERVICES] Dodeljavanje servisera ${technicianId} servisu ${serviceId}`);
      
      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ error: "Servis nije pronađen" });
      }
      
      const technician = await storage.getTechnician(technicianId);
      if (!technician) {
        return res.status(404).json({ error: "Serviser nije pronađen" });
      }
      
      await storage.updateService(serviceId, {
        clientId: service.clientId,
        applianceId: service.applianceId,
        description: service.description,
        warrantyStatus: service.warrantyStatus === 'nepoznato' ? 'van garancije' as const : service.warrantyStatus as 'u garanciji' | 'van garancije',
        createdAt: service.createdAt,
        technicianId: technicianId,
        status: 'assigned' as any
      });
      
      console.log(`✅ [ADMIN SERVICES] Serviser ${technician.fullName} dodeljen servisu ${serviceId}`);
      res.json({ 
        success: true, 
        message: `Serviser ${technician.fullName} uspešno dodeljen servisu`,
        technician: technician 
      });
      
    } catch (error) {
      console.error('[ADMIN SERVICES] Greška pri dodeli servisera:', error);
      res.status(500).json({ error: "Greška pri dodeli servisera" });
    }
  });

  // PUT /api/services/:id/repair-failed - Mark service as repair failed
  app.put("/api/services/:id/repair-failed", jwtAuth, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      const { 
        status,
        repairFailureReason, 
        replacedPartsBeforeFailure, 
        technicianNotes,
        repairFailureDate
      } = req.body;
      
      console.log(`[REPAIR FAILED] Servis #${serviceId} označen kao neuspešan od strane ${req.user?.username}`);
      
      if (!repairFailureReason || repairFailureReason.trim().length < 5) {
        return res.status(400).json({ 
          error: "Razlog neuspešnog servisa je obavezan i mora imati najmanje 5 karaktera" 
        });
      }
      
      const service = await storage.getService(serviceId);
      if (!service) {
        console.log(`[REPAIR FAILED] Servis #${serviceId} nije pronađen`);
        return res.status(404).json({ error: "Servis nije pronađen" });
      }
      
      if (req.user?.role === "technician") {
        const technicianId = req.user!.technicianId;
        if (!technicianId || service.technicianId !== technicianId) {
          return res.status(403).json({ 
            error: "Nemate dozvolu da mijenjate ovaj servis" 
          });
        }
      }
      
      const updatedService = await storage.updateService(serviceId, {
        ...service,
        warrantyStatus: service.warrantyStatus === 'nepoznato' ? 'van garancije' as const : service.warrantyStatus as 'u garanciji' | 'van garancije',
        status: 'repair_failed' as any,
        repairFailed: true,
        repairFailureReason: repairFailureReason.trim(),
        replacedPartsBeforeFailure: replacedPartsBeforeFailure?.trim() || null,
        technicianNotes: technicianNotes?.trim() || service.technicianNotes,
        repairFailureDate: repairFailureDate || new Date().toISOString().split('T')[0]
      });
      
      console.log(`[REPAIR FAILED] Servis #${serviceId} ažuriran. Razlog: ${repairFailureReason.substring(0, 50)}...`);
      
      res.json(updatedService);
    } catch (error) {
      console.error(`[REPAIR FAILED] Greška kod servisa #${req.params.id}:`, error);
      res.status(500).json({ error: "Greška pri obeležavanju servisa kao neuspešnog" });
    }
  });

  // PATCH /api/services/:id/supplement-generali - Supplement Generali service data
  app.patch("/api/services/:id/supplement-generali", jwtAuth, async (req, res) => {
    try {
      console.log(`[GENERALI DOPUNA] ✅ Početak dopunjavanja servisa #${req.params.id}`);
      
      if (req.user?.role !== "technician" && req.user?.role !== "business_partner") {
        return res.status(403).json({ error: "Samo serviseri i poslovni partneri mogu dopunjavati Generali servise" });
      }

      const serviceId = parseInt(req.params.id);
      const updateData = req.body;
      console.log(`[GENERALI DOPUNA] 📝 Podaci za dopunu:`, updateData);

      const { supplementGeneraliServiceSchema } = await import("@shared/schema");
      const validationResult = supplementGeneraliServiceSchema.safeParse({
        serviceId,
        ...updateData
      });

      if (!validationResult.success) {
        console.log(`[GENERALI DOPUNA] ❌ Validacija neuspešna:`, validationResult.error.errors);
        return res.status(400).json({
          error: "Neispravni podaci",
          details: validationResult.error.errors
        });
      }

      const validData = validationResult.data;
      console.log(`[GENERALI DOPUNA] ✅ Validacija uspešna`);

      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ error: "Servis nije pronađen" });
      }

      const userDetails = await storage.getUser(req.user.id);
      
      if (req.user.role === "technician" && (!userDetails || !userDetails.technicianId)) {
        return res.status(403).json({ error: "Nemate ulogu servisera" });
      }

      if (req.user.role === "business_partner") {
        if (service.businessPartnerId !== req.user.id) {
          return res.status(403).json({ error: "Možete dopunjavati samo servise koje ste vi kreirali" });
        }
      }

      console.log(`[GENERALI DOPUNA] 🔄 Ažuriranje podataka...`);

      if (validData.clientEmail || validData.clientAddress || validData.clientCity) {
        const updateClientData: any = {};
        if (validData.clientEmail) updateClientData.email = validData.clientEmail;
        if (validData.clientAddress) updateClientData.address = validData.clientAddress;
        if (validData.clientCity) updateClientData.city = validData.clientCity;

        await storage.updateClient(service.clientId, updateClientData);
        console.log(`[GENERALI DOPUNA] ✅ Klijent ažuriran`);
      }

      if (validData.serialNumber || validData.model || validData.purchaseDate) {
        const updateApplianceData: any = {};
        if (validData.serialNumber) updateApplianceData.serialNumber = validData.serialNumber;
        if (validData.model) updateApplianceData.model = validData.model;
        if (validData.purchaseDate) updateApplianceData.purchaseDate = validData.purchaseDate;

        await storage.updateAppliance(service.applianceId, updateApplianceData);
        console.log(`[GENERALI DOPUNA] ✅ Aparat ažuriran`);
      }

      if (validData.supplementNotes) {
        const currentNotes = service.technicianNotes || "";
        const updatedNotes = currentNotes ? 
          `${currentNotes}\n\n[DOPUNA GENERALI] ${validData.supplementNotes}` :
          `[DOPUNA GENERALI] ${validData.supplementNotes}`;
        
        await storage.updateService(serviceId, { 
          clientId: service.clientId,
          applianceId: service.applianceId,
          description: service.description,
          warrantyStatus: service.warrantyStatus === 'nepoznato' ? 'van garancije' as const : service.warrantyStatus as 'u garanciji' | 'van garancije',
          createdAt: service.createdAt,
          status: service.status,
          technicianNotes: updatedNotes 
        });
        console.log(`[GENERALI DOPUNA] ✅ Napomene dodane`);
      }

      const updatedService = await storage.getService(serviceId);
      console.log(`[GENERALI DOPUNA] ✅ Generali servis #${serviceId} uspešno dopunjen`);
      
      res.json({ 
        success: true, 
        message: "Generali servis je uspešno dopunjen",
        service: updatedService 
      });

    } catch (error) {
      console.error("❌ GENERALI DOPUNA - Greška:", error);
      res.status(500).json({ error: "Greška pri dopunjavanju servisa" });
    }
  });

  // POST /api/services/:serviceId/spare-parts - Request spare part for service
  app.post("/api/services/:serviceId/spare-parts", jwtAuth, async (req, res) => {
    try {
      if (req.user?.role !== 'technician' && req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Samo serviseri mogu da zahtevaju rezervne delove" });
      }

      const serviceId = parseInt(req.params.serviceId);
      
      const requestData = {
        partName: req.body.partName || '',
        partNumber: req.body.catalogNumber || req.body.partNumber || '',
        quantity: req.body.quantity || 1,
        description: req.body.description || '',
        urgency: req.body.urgency || 'normal',
        warrantyStatus: 'van garancije' as const,
        serviceId: serviceId,
        status: "pending" as const,
        technicianId: req.user.technicianId || req.user.id,
        requesterType: "technician",
        requesterUserId: req.user.technicianId || req.user.id,
        requesterName: req.user.fullName || req.user.username
      };

      console.log(`📱 [MOBILNI] Serviser ${req.user.username} zahtevao rezervni deo za servis #${serviceId}: ${requestData.partName}`);
      
      const order = await storage.createSparePartOrder(requestData);
      
      res.json({ 
        success: true, 
        message: "Zahtev za rezervni deo je uspešno poslat administratoru", 
        order 
      });
    } catch (error) {
      console.error("❌ [MOBILNI] Greška pri zahtevu za rezervni deo:", error);
      res.status(500).json({ error: "Greška pri slanju zahteva za rezervni deo" });
    }
  });

  // ========== BUSINESS PARTNER SERVICES ==========
  
  // GET /api/business/services - Get services for business partner
  app.get("/api/business/services", jwtAuth, async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'business_partner') {
        return res.status(403).json({ error: "Nemate dozvolu za pristup ovim podacima" });
      }
      
      logger.debug(`Dohvatanje detaljnih servisa za poslovnog partnera sa ID: ${(req as any).user.id}`);
      
      const reqUser = (req as any).user;
      const services = await storage.getServicesByPartner(reqUser.id);
      
      const enhancedServices = await Promise.all(services.map(async (service) => {
        const spareParts = await storage.getSparePartsByService(service.id);
        const removedParts = await storage.getRemovedPartsByService(service.id) || [];
        const technician = service.technicianId ? await storage.getTechnician(Number(service.technicianId)) : null;
        const techUser = technician ? await storage.getUserByTechnicianId(Number(service.technicianId)) : null;
        
        const workSummary = {
          ...service,
          technician: technician ? {
            fullName: technician.fullName,
            phone: techUser?.phone,
            email: techUser?.email,
            specialization: technician.specialization
          } : null,
          spareParts: spareParts.map(part => ({
            partName: part.partName,
            quantity: part.quantity,
            productCode: (part as any).productCode || 'N/A',
            urgency: part.urgency,
            warrantyStatus: part.warrantyStatus,
            status: part.status,
            orderDate: part.createdAt,
            estimatedDeliveryDate: (part as any).estimatedDeliveryDate || null,
            actualDeliveryDate: (part as any).actualDeliveryDate || null
          })),
          removedParts: (Array.isArray(removedParts) ? removedParts : []).map(part => ({
            partName: part.partName,
            removalReason: part.removalReason,
            currentLocation: part.currentLocation,
            removalDate: part.removalDate,
            returnDate: (part as any).returnDate || null,
            status: (part as any).status || 'unknown',
            repairCost: part.repairCost
          })),
          workTimeline: [
            { date: service.createdAt, event: 'Servis kreiran', status: 'pending' },
            (service as any).assignedAt ? { date: (service as any).assignedAt, event: `Dodeljen serviseru ${technician?.fullName}`, status: 'assigned' } : null,
            service.scheduledDate ? { date: service.scheduledDate, event: 'Zakazan termin', status: 'scheduled' } : null,
            (service as any).startedAt ? { date: (service as any).startedAt, event: 'Servis započet', status: 'in_progress' } : null,
            service.completedAt ? { date: service.completedAt, event: 'Servis završen', status: 'completed' } : null
          ].filter(Boolean),
          isCompleted: service.status === 'completed',
          totalCost: service.cost || 0,
          partsCount: spareParts.length,
          removedPartsCount: Array.isArray(removedParts) ? removedParts.length : 0
        };
        
        return workSummary;
      }));
      
      res.json(enhancedServices);
    } catch (error) {
      console.error("Greška pri dobijanju detaljnih servisa za poslovnog partnera:", error);
      res.status(500).json({ error: "Greška pri dobijanju servisa" });
    }
  });
  
  // GET /api/business/services/:id - Get single service for business partner
  app.get("/api/business/services/:id", jwtAuth, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      
      if (!req.user || req.user.role !== 'business_partner') {
        return res.status(403).json({ error: "Nemate dozvolu za pristup ovim podacima" });
      }
      
      const service = await storage.getService(serviceId);
      
      if (!service) {
        return res.status(404).json({ error: "Servis nije pronađen" });
      }
      
      if (!req.user || service.businessPartnerId !== req.user.id) {
        return res.status(403).json({ error: "Nemate pristup ovom servisu" });
      }
      
      logger.debug(`Dohvatanje proširenih detalja servisa ${serviceId} za poslovnog partnera ${(req as any).user.id}`);
      
      const spareParts = await storage.getSparePartsByService(serviceId);
      const removedParts = await storage.getRemovedPartsByService(serviceId) || [];
      const serviceDetails = await storage.getServiceWithDetails(serviceId);
      const technician = service.technicianId ? await storage.getTechnician(Number(service.technicianId)) : null;
      const techUser = technician ? await storage.getUserByTechnicianId(Number(service.technicianId)) : null;
      const statusHistory = await storage.getServiceStatusHistory(serviceId);
      
      const response = {
        ...serviceDetails,
        technician: technician ? {
          fullName: technician.fullName,
          phone: techUser?.phone,
          email: techUser?.email,
          specialization: technician.specialization
        } : serviceDetails.technician,
        spareParts: spareParts.map(part => ({
          partName: part.partName,
          quantity: part.quantity,
          productCode: (part as any).productCode || 'N/A',
          urgency: part.urgency,
          warrantyStatus: part.warrantyStatus,
          status: part.status,
          orderDate: part.createdAt,
          estimatedDeliveryDate: (part as any).estimatedDeliveryDate || null,
          actualDeliveryDate: (part as any).actualDeliveryDate || null
        })),
        removedParts: (Array.isArray(removedParts) ? removedParts : []).map(part => ({
          partName: part.partName,
          removalReason: part.removalReason,
          currentLocation: part.currentLocation,
          removalDate: part.removalDate,
          returnDate: (part as any).returnDate || null,
          status: (part as any).status || 'unknown',
          repairCost: part.repairCost
        })),
        workTimeline: [
          { date: service.createdAt, event: 'Servis kreiran', status: 'pending' },
          (service as any).assignedAt ? { date: (service as any).assignedAt, event: `Dodeljen serviseru ${technician?.fullName}`, status: 'assigned' } : null,
          service.scheduledDate ? { date: service.scheduledDate, event: 'Zakazan termin', status: 'scheduled' } : null,
          (service as any).startedAt ? { date: (service as any).startedAt, event: 'Servis započet', status: 'in_progress' } : null,
          (service as any).completedDate ? { date: (service as any).completedDate, event: 'Servis završen', status: 'completed' } : null
        ].filter(Boolean),
        statusHistory
      };
      
      logger.debug(`Prošireni detalji servisa ${serviceId}:`, {
        spareParts: spareParts.length,
        removedParts: Array.isArray(removedParts) ? removedParts.length : 0,
        statusHistory: statusHistory.length,
        hasUsedParts: !!service.usedParts,
        hasMachineNotes: !!service.machineNotes
      });
      
      res.json(response);
    } catch (error) {
      console.error("Greška pri dobijanju detalja servisa:", error);
      res.status(500).json({ error: "Greška pri dobijanju detalja servisa" });
    }
  });

  // POST /api/business/services-jwt - Create service by business partner (JWT)
  app.post("/api/business/services-jwt", jwtAuth, async (req, res) => {
    try {
      console.log("=== KREIRANJE NOVOG SERVISA OD BUSINESS PARTNERA ===");
      logger.debug("Podaci iz frontend forme:", req.body);
      
      if (req.user?.role !== 'business_partner') {
        return res.status(403).json({ 
          error: "Nemate dozvolu", 
          message: "Samo poslovni partneri mogu kreirati servise."
        });
      }
      
      console.log("Poslovni partner kreira servis:", req.user?.username);
      
      const { clientId, applianceId, description } = req.body;
      
      if (!clientId || clientId <= 0) {
        return res.status(400).json({ 
          error: "Klijent je obavezan", 
          message: "Morate odabrati klijenta za servis."
        });
      }
      
      if (!applianceId || applianceId <= 0) {
        return res.status(400).json({ 
          error: "Uređaj je obavezan", 
          message: "Morate odabrati uređaj za servis."
        });
      }
      
      if (!description || description.trim() === "") {
        return res.status(400).json({ 
          error: "Opis je obavezan", 
          message: "Morate uneti opis servisa."
        });
      }
      
      const validatedData = {
        clientId: parseInt(clientId),
        applianceId: parseInt(applianceId),
        description: description.trim(),
        status: "pending",
        warrantyStatus: req.body.warrantyStatus || "out_of_warranty",
        createdAt: new Date().toISOString().split('T')[0],
        businessPartnerId: req.user.id,
        partnerCompanyName: req.user.fullName
      };
      
      const service = await storage.createService(validatedData);
      if (!service) return res.status(500).json({ error: "Greška pri kreiranju servisa" });
      
      console.log("✅ Poslovni partner kreirao servis:", service.id);
      
      res.status(201).json({
        success: true,
        message: "Servis je uspešno kreiran od strane poslovnog partnera",
        data: service
      });
    } catch (error) {
      console.error("Greška pri kreiranju servisa od poslovnog partnera:", error);
      res.status(500).json({ error: "Greška pri kreiranju servisa" });
    }
  });

  // ========== SERVICE COMPLETION REPORTS ==========
  
  // POST /api/service-completion-reports - Create service completion report
  app.post("/api/service-completion-reports", jwtAuth, async (req, res) => {
    try {
      const validatedData = insertServiceCompletionReportSchema.parse(req.body);
      
      const report = await storage.createServiceCompletionReport(validatedData);
      
      res.status(201).json(report);
    } catch (error: any) {
      logger.error('Greška pri kreiranju completion reporta:', error);
      res.status(400).json({ 
        error: error.message || 'Greška pri kreiranju izveštaja o završetku servisa' 
      });
    }
  });

  // GET /api/service-completion-reports/:serviceId - Get completion reports by service
  app.get("/api/service-completion-reports/:serviceId", jwtAuth, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.serviceId);
      
      if (isNaN(serviceId)) {
        return res.status(400).json({ error: 'Nevažeći ID servisa' });
      }

      const reports = await storage.getServiceCompletionReportsByService(serviceId);
      
      res.json(reports);
    } catch (error: any) {
      logger.error('Greška pri dohvatanju completion reporta:', error);
      res.status(500).json({ 
        error: 'Greška pri dohvatanju izveštaja o završetku servisa' 
      });
    }
  });

  // ========== CONVERSATION MESSAGES API ==========
  
  // GET /api/conversations/:serviceId - Get conversation messages for service
  app.get('/api/conversations/:serviceId', jwtAuth, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.serviceId);
      console.log(`📞 [CONVERSATION] Admin dohvata conversation za servis #${serviceId}`);
      
      const messages = await storage.getConversationMessages(serviceId);
      console.log(`📞 [CONVERSATION] Pronađeno ${messages.length} poruka za servis #${serviceId}`);
      
      res.json(messages);
    } catch (error) {
      console.error('❌ [CONVERSATION] Greška pri dohvatanju conversation poruka:', error);
      res.status(500).json({ error: 'Greška pri dohvatanju conversation poruka' });
    }
  });

  // POST /api/conversations/message - Create conversation message
  app.post('/api/conversations/message', jwtAuth, async (req, res) => {
    try {
      console.log(`📞 [CONVERSATION] Nova conversation poruka: ${JSON.stringify(req.body)}`);
      
      const message = await storage.createConversationMessage(req.body);
      console.log(`📞 [CONVERSATION] ✅ Conversation poruka kreirana: ID #${message.id}`);
      
      res.json(message);
    } catch (error) {
      console.error('❌ [CONVERSATION] Greška pri kreiranju conversation poruke:', error);
      res.status(500).json({ error: 'Greška pri kreiranju conversation poruke' });
    }
  });

  // PUT /api/conversations/:id/status - Update conversation message status
  app.put('/api/conversations/:id/status', jwtAuth, async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const { status } = req.body;
      
      console.log(`📞 [CONVERSATION] Ažuriranje statusa poruke #${messageId} na "${status}"`);
      
      const updatedMessage = await storage.updateConversationMessageStatus(messageId, status);
      if (!updatedMessage) {
        return res.status(404).json({ error: 'Conversation poruka nije pronađena' });
      }
      
      console.log(`📞 [CONVERSATION] ✅ Status poruke #${messageId} ažuriran na "${status}"`);
      res.json(updatedMessage);
    } catch (error) {
      console.error('❌ [CONVERSATION] Greška pri ažuriranju statusa poruke:', error);
      res.status(500).json({ error: 'Greška pri ažuriranju statusa conversation poruke' });
    }
  });

  // GET /api/conversations/:serviceId/history - Get detailed conversation history
  app.get('/api/conversations/:serviceId/history', jwtAuth, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.serviceId);
      console.log(`📞 [CONVERSATION] Admin dohvata detaljnu conversation istoriju za servis #${serviceId}`);
      
      const history = await storage.getServiceConversationHistory(serviceId);
      console.log(`📞 [CONVERSATION] Detaljana istorija: ${history.length} poruka za servis #${serviceId}`);
      
      res.json({
        serviceId,
        totalMessages: history.length,
        messages: history,
        lastActivity: history.length > 0 ? history[history.length - 1].createdAt : null
      });
    } catch (error) {
      console.error('❌ [CONVERSATION] Greška pri dohvatanju conversation istorije:', error);
      res.status(500).json({ error: 'Greška pri dohvatanju conversation istorije' });
    }
  });
  
  console.log("✅ Service routes registered");
}
