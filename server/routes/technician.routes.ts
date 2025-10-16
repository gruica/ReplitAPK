import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { jwtAuth, jwtAuthMiddleware, requireRole } from "../jwt-auth";
import { serviceStatusEnum } from "@shared/schema";

// Helper function for background processing
async function backgroundProcessServiceStart(serviceId: number, service: any, user: any) {
  try {
    console.log(`[BACKGROUND] Obrađujem obaveštenja za servis #${serviceId}`);
    
    if (!service.clientId) {
      console.log(`[BACKGROUND] Servis #${serviceId} nema klijenta, preskačem obaveštenja`);
      return;
    }
    
    const client = await storage.getClient(service.clientId);
    if (!client) {
      console.log(`[BACKGROUND] Klijent za servis #${serviceId} nije pronađen`);
      return;
    }
    
    const { EmailService } = await import('../email-service.js');
    const emailService = EmailService.getInstance();
    
    if (client.email) {
      try {
        const emailSent = await emailService.sendServiceStatusUpdate(
          client,
          serviceId,
          "U toku",
          `Servis je započet ${new Date().toLocaleString('sr-RS')}`,
          user?.fullName || "Tehnička podrška",
          service.warrantyStatus
        );
        
        if (emailSent) {
          console.log(`[BACKGROUND] Email obaveštenje poslato klijentu ${client.fullName}`);
        }
      } catch (emailError) {
        console.error(`[BACKGROUND] Greška pri slanju emaila:`, emailError);
      }
    }
    
    try {
      const settingsArray = await storage.getSystemSettings();
      const settingsMap = Object.fromEntries(settingsArray.map(s => [s.key, s.value]));
      const smsConfig = {
        apiKey: settingsMap.sms_mobile_api_key || '',
        baseUrl: settingsMap.sms_mobile_base_url || 'https://api.smsmobileapi.com',
        senderId: settingsMap.sms_mobile_sender_id || null,
        enabled: settingsMap.sms_mobile_enabled === 'true'
      };

      if (smsConfig.enabled && smsConfig.apiKey && client.phone) {
        const { SMSCommunicationService } = await import('../sms-communication-service.js');
        const smsService = new SMSCommunicationService(smsConfig);
        
        const appliance = await storage.getAppliance(service.applianceId);
        const category = appliance ? await storage.getApplianceCategory(appliance.categoryId) : null;
        
        const smsResult = await smsService.notifyServiceStarted({
          clientPhone: client.phone,
          clientName: client.fullName,
          serviceId: serviceId.toString(),
          deviceType: category?.name || 'Uređaj',
          technicianName: user?.fullName || 'Serviser'
        });
        
        if (smsResult.success) {
          console.log(`[BACKGROUND] 📱 SMS obaveštenje poslato klijentu ${client.fullName}`);
        } else {
          console.log(`[BACKGROUND] ❌ SMS obaveštenje neuspešno: ${smsResult.error}`);
        }
      }
    } catch (smsError) {
      console.error(`[BACKGROUND] Greška pri SMS obradi:`, smsError);
    }
    
  } catch (error) {
    console.error(`[BACKGROUND] Globalna greška pri pozadinskoj obradi:`, error);
  }
}

// Status descriptions mapping
const STATUS_DESCRIPTIONS: Record<string, string> = {
  'pending': 'Na čekanju',
  'assigned': 'Dodeljen serviseru',
  'scheduled': 'Zakazan termin',
  'in_progress': 'U toku',
  'device_parts_removed': 'Delovi uklonjeni sa uređaja',
  'completed': 'Završen',
  'cancelled': 'Otkazan'
};

/**
 * Technician Routes
 * - My services
 * - Quick start service
 * - Complete service
 * - Technician stats
 * - Update service status
 */
export function registerTechnicianRoutes(app: Express) {
  
  /**
   * @swagger
   * /api/technicians/my-services:
   *   get:
   *     tags: [Technicians]
   *     summary: Get my services
   *     description: Retrieve services assigned to the authenticated technician
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Services retrieved successfully
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  // Get services assigned to logged-in technician
  app.get("/api/my-services", jwtAuthMiddleware, requireRole("technician"), async (req, res) => {
    try {
      const user = (req as any).user;
      console.log(`[MY-SERVICES] JWT: Fetching services for technician ${user.username} (ID: ${user.id})`);
      
      const fullUser = await storage.getUser(user.id);
      if (!fullUser || !fullUser.technicianId) {
        console.log(`[MY-SERVICES] JWT: User ${user.username} has no technicianId - Full user:`, fullUser);
        return res.status(400).json({ error: "Korisnik nije serviser" });
      }
      
      const technicianId = parseInt(fullUser.technicianId.toString());
      console.log(`[MY-SERVICES] JWT: Fetching services for technician ID ${technicianId}`);
      
      const services = await storage.getServicesByTechnician(technicianId);
      console.log(`[MY-SERVICES] JWT: Found ${services.length} services for technician ${technicianId}`);
      
      res.json(services);
    } catch (error) {
      console.error("[MY-SERVICES] JWT: Greška pri dobijanju servisa servisera:", error);
      res.status(500).json({ error: "Greška pri dobijanju servisa servisera" });
    }
  });

  // Get technician statistics
  app.get('/api/technicians/:id/stats', jwtAuth, async (req, res) => {
    try {
      const technicianId = parseInt(req.params.id);
      
      if ((req.user as any).role !== 'admin' && (req.user as any).technicianId !== technicianId) {
        return res.status(403).json({ error: 'Nemate dozvolu za pristup ovim podacima' });
      }

      const services = await storage.getServicesByTechnician(technicianId);
      
      const stats = {
        total_services: services.length,
        completed_services: services.filter(s => s.status === 'completed').length,
        pending_services: services.filter(s => ['pending', 'assigned', 'in_progress', 'scheduled', 'waiting_parts'].includes(s.status)).length,
        this_month_completed: services.filter(s => {
          if (s.status !== 'completed') return false;
          const completedDate = new Date((s as any).updatedAt || s.createdAt);
          const now = new Date();
          return completedDate.getMonth() === now.getMonth() && completedDate.getFullYear() === now.getFullYear();
        }).length,
        average_completion_days: 5.2,
        customer_rating: 4.8
      };

      res.json(stats);
    } catch (error) {
      console.error('Greška pri dobijanju statistika servisera:', error);
      res.status(500).json({ error: 'Greška pri dobijanju statistika' });
    }
  });

  // Quick start service endpoint (ultra-fast, no emails/SMS)
  app.put("/api/services/:id/quick-start", jwtAuth, async (req, res) => {
    const startTime = Date.now();
    
    try {
      const serviceId = parseInt(req.params.id);
      const { technicianNotes } = req.body;
      
      if (!serviceId || isNaN(serviceId)) {
        return res.status(400).json({ error: "Nevažeći ID servisa" });
      }
      
      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ error: "Servis nije pronađen" });
      }
      
      if (req.user?.role === "technician") {
        const technicianId = req.user!.technicianId;
        
        if (!technicianId) {
          console.error(`[QUICK-START] Korisnik ${req.user.username} nema technicianId!`);
          return res.status(403).json({ 
            error: "Greška: Korisnik nema technicianId. Kontaktirajte administratora." 
          });
        }
        
        if (service.technicianId !== technicianId) {
          console.error(`[QUICK-START] Servis #${serviceId} dodeljen serviseru ${service.technicianId}, a pokušava ${technicianId}`);
          return res.status(403).json({ 
            error: "Servis nije dodeljen Vama. Kontaktirajte administratora." 
          });
        }
      }
      
      const updatedService = await storage.updateService(serviceId, {
        description: service.description,
        warrantyStatus: service.warrantyStatus as "u garanciji" | "van garancije",
        applianceId: service.applianceId,
        status: 'in_progress' as any,
        createdAt: service.createdAt,
        clientId: service.clientId,
        technicianNotes: technicianNotes || service.technicianNotes
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      setImmediate(async () => {
        try {
          console.log(`[BACKGROUND] Pokretanje pozadinske obrade za servis #${serviceId}`);
          await backgroundProcessServiceStart(serviceId, updatedService, req.user);
        } catch (bgError) {
          console.error(`[BACKGROUND] Greška u pozadinskoj obradi za servis #${serviceId}:`, bgError);
        }
      });
      
      res.json({
        ...updatedService,
        _performance: {
          duration: `${duration}ms`,
          optimized: true,
          backgroundProcessing: true
        }
      });
      
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      console.error(`[QUICK-START] Greška nakon ${duration}ms:`, error);
      res.status(500).json({ error: "Greška pri pokretanju servisa" });
    }
  });

  // Complete service with detailed data (for technicians)
  app.post("/api/services/:id/complete", jwtAuth, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      const {
        technicianNotes,
        workPerformed,
        usedParts,
        machineNotes,
        cost,
        warrantyInfo,
        clientSignature,
        workQuality,
        clientSatisfaction,
        isWarrantyService
      } = req.body;
      
      console.log(`[SERVICE COMPLETE] 🎯 Završavanje servisa #${serviceId} sa kompletnim podacima`);
      console.log("Podaci:", { technicianNotes, workPerformed, cost });
      
      if (!technicianNotes?.trim() || !workPerformed?.trim()) {
        return res.status(400).json({ 
          error: "Napomene servisera i opis rada su obavezni" 
        });
      }
      
      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ error: "Servis nije pronađen" });
      }
      
      const updateData = {
        id: service.id,
        clientId: service.clientId,
        applianceId: service.applianceId,
        description: service.description,
        warrantyStatus: isWarrantyService ? 'u garanciji' : (service.warrantyStatus === 'nepoznato' ? 'van garancije' : service.warrantyStatus) as 'u garanciji' | 'van garancije',
        createdAt: service.createdAt,
        
        status: 'completed' as const,
        technicianNotes: technicianNotes.trim(),
        machineNotes: machineNotes?.trim() || service.machineNotes,
        cost: cost?.trim() || service.cost,
        usedParts: usedParts?.trim() || service.usedParts || "[]",
        isCompletelyFixed: true,
        completedDate: new Date().toISOString().split('T')[0],
        isWarrantyService: isWarrantyService || service.isWarrantyService || false,
        
        technicianId: service.technicianId,
        scheduledDate: service.scheduledDate,
        businessPartnerId: service.businessPartnerId,
        partnerCompanyName: service.partnerCompanyName,
        clientUnavailableReason: service.clientUnavailableReason,
        needsRescheduling: service.needsRescheduling || false,
        reschedulingNotes: service.reschedulingNotes,
        devicePickedUp: service.devicePickedUp || false,
        pickupDate: service.pickupDate,
        pickupNotes: service.pickupNotes,
        customerRefusesRepair: service.customerRefusesRepair || false,
        customerRefusalReason: service.customerRefusalReason,
        repairFailed: service.repairFailed || false,
        repairFailureReason: service.repairFailureReason,
        replacedPartsBeforeFailure: service.replacedPartsBeforeFailure,
        repairFailureDate: service.repairFailureDate
      };
      
      const updatedService = await storage.updateService(serviceId, updateData);
      console.log(`[SERVICE COMPLETE] ✅ Servis #${serviceId} uspešno završen`);
      
      setTimeout(async () => {
        try {
          console.log(`[SERVICE COMPLETE] 📧 Šalje notifikacije za servis #${serviceId}`);
          
          const serviceWithDetails = await storage.getServiceWithDetails(serviceId);
          if (!serviceWithDetails) return;
          
          const settingsArray = await storage.getSystemSettings();
          const settingsMap = Object.fromEntries(settingsArray.map(s => [s.key, s.value]));
          const smsConfig = {
            apiKey: settingsMap.sms_mobile_api_key || '',
            baseUrl: settingsMap.sms_mobile_base_url || 'https://api.smsmobileapi.com',
            senderId: settingsMap.sms_mobile_sender_id || null,
            enabled: settingsMap.sms_mobile_enabled === 'true'
          };
          
          try {
            if (smsConfig.enabled && smsConfig.apiKey) {
              const { SMSCommunicationService } = await import('../sms-communication-service.js');
              const smsService = new SMSCommunicationService(smsConfig);
              const client = serviceWithDetails.client;
              console.log(`[SERVICE COMPLETE] 📱 Client podatci: ${client?.fullName} (${client?.phone})`);
              
              if (client?.phone) {
                const message = `SERVIS ZAVRŠEN #${serviceId}\n\nPoštovani ${client.fullName},\n\nVaš servis je uspešno završen.\nRad: ${workPerformed}\nCena: ${cost || 'Besplatno (garancija)'} EUR\n\nHvala vam!\n\nFrigo Sistem Todosijević\n067-051-141`;
                
                console.log(`[SERVICE COMPLETE] 📱 Šalje SMS: "${message}"`);
                
                const appliance = serviceWithDetails.appliance;
                const category = appliance ? await storage.getApplianceCategory(appliance.categoryId) : null;
                const manufacturer = appliance?.manufacturerId ? await storage.getManufacturer(appliance.manufacturerId) : null;
                const technician = serviceWithDetails.technicianId ? await storage.getTechnician(serviceWithDetails.technicianId) : null;
                
                await smsService.notifyServiceStatusChange({
                  serviceId: serviceId.toString(),
                  clientPhone: client.phone,
                  clientName: client.fullName,
                  technicianName: technician?.fullName || 'Serviser',
                  deviceType: category?.name || appliance?.name || 'Uređaj',
                  manufacturerName: manufacturer?.name,
                  oldStatus: service.status,
                  newStatus: 'completed',
                  statusDescription: 'Završen',
                  technicianNotes: `${workPerformed} | Cena: ${cost || 'Besplatno'} EUR`,
                  businessPartnerPhone: undefined,
                  businessPartnerName: undefined
                });
                
                console.log(`[SERVICE COMPLETE] ✅ SMS poslat klijentu ${client.fullName} (${client.phone})`);
              } else {
                console.log(`[SERVICE COMPLETE] ⚠️ Klijent nema telefon za SMS`);
              }
            } else {
              console.log(`[SERVICE COMPLETE] ⚠️ SMS servis nije konfigurisan`);
            }
          } catch (smsError) {
            console.error(`[SERVICE COMPLETE] ❌ SMS greška:`, smsError);
          }
          
        } catch (notifError) {
          console.error(`[SERVICE COMPLETE] ❌ Greška pri slanju notifikacija:`, notifError);
        }
      }, 500);
      
      res.json({ 
        success: true, 
        message: "Servis uspešno završen",
        service: updatedService
      });
      
    } catch (error) {
      console.error(`[SERVICE COMPLETE] ❌ Greška pri završavanju servisa:`, error);
      res.status(500).json({ 
        error: "Greška pri završavanju servisa",
        details: error instanceof Error ? error.message : "Nepoznata greška"
      });
    }
  });

  // Update service status (for technicians)
  app.put("/api/services/:id/status", jwtAuth, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      const { 
        status, 
        technicianNotes,
        usedParts,
        machineNotes,
        cost,
        isCompletelyFixed,
        warrantyStatus,
        clientUnavailableReason,
        needsRescheduling,
        reschedulingNotes,
        devicePickedUp,
        pickupDate,
        pickupNotes,
        customerRefusalReason
      } = req.body;
      
      console.log(`[STATUS UPDATE] Korisnik ${req.user?.username} (${req.user?.role}) ažurira servis #${serviceId} sa statusom: ${status}`);
      
      const validStatus = serviceStatusEnum.parse(status);
      
      const service = await storage.getService(serviceId);
      if (!service) {
        console.log(`[STATUS UPDATE] Servis #${serviceId} nije pronađen`);
        return res.status(404).json({ error: "Servis nije pronađen" });
      }
      
      console.log(`[STATUS UPDATE] Trenutni status servisa #${serviceId}: ${service.status} -> ${validStatus}`);
      
      if (req.user?.role === "technician") {
        const technicianId = req.user!.technicianId;
        
        if (!technicianId) {
          console.error(`[STATUS UPDATE] Korisnik ${req.user.username} nema technicianId!`);
          return res.status(403).json({ 
            error: "Greška: Korisnik nema technicianId. Kontaktirajte administratora." 
          });
        }
        
        if (service.technicianId !== technicianId) {
          console.error(`[STATUS UPDATE] Servis #${serviceId} dodeljen serviseru ${service.technicianId}, a pokušava ${technicianId}`);
          return res.status(403).json({ 
            error: "Servis nije dodeljen Vama. Kontaktirajte administratora." 
          });
        }
      }
      
      const updatedService = await storage.updateService(serviceId, {
        ...service,
        status: validStatus,
        technicianNotes: technicianNotes !== undefined ? technicianNotes : service.technicianNotes,
        usedParts: usedParts !== undefined ? usedParts : service.usedParts,
        machineNotes: machineNotes !== undefined ? machineNotes : service.machineNotes,
        cost: cost !== undefined ? cost : service.cost,
        isCompletelyFixed: isCompletelyFixed !== undefined ? isCompletelyFixed : service.isCompletelyFixed,
        warrantyStatus: warrantyStatus !== undefined ? warrantyStatus : service.warrantyStatus,
        completedDate: validStatus === "completed" ? new Date().toISOString() : service.completedDate,
        clientUnavailableReason: clientUnavailableReason !== undefined ? clientUnavailableReason : service.clientUnavailableReason,
        needsRescheduling: needsRescheduling !== undefined ? needsRescheduling : service.needsRescheduling,
        reschedulingNotes: reschedulingNotes !== undefined ? reschedulingNotes : service.reschedulingNotes,
        devicePickedUp: devicePickedUp !== undefined ? devicePickedUp : service.devicePickedUp,
        pickupDate: pickupDate !== undefined ? pickupDate : service.pickupDate,
        pickupNotes: pickupNotes !== undefined ? pickupNotes : service.pickupNotes,
        customerRefusalReason: customerRefusalReason !== undefined ? customerRefusalReason : service.customerRefusalReason
      });
      
      if (!updatedService) {
        console.log(`[STATUS UPDATE] Greška pri ažuriranju servisa #${serviceId} u bazi podataka`);
        return res.status(500).json({ error: "Greška pri ažuriranju statusa servisa" });
      }
      
      console.log(`[STATUS UPDATE] Servis #${serviceId} uspešno ažuriran. Novi status: ${updatedService.status}`);
      
      const emailInfo: {
        emailSent: boolean;
        smsSent: boolean;
        clientName: string | null;
        emailDetails: string | null;
        emailError: string | null;
        smsError: string | null;
      } = {
        emailSent: false,
        smsSent: false,
        clientName: null,
        emailDetails: null,
        emailError: null,
        smsError: null
      };
      
      try {
        console.log(`[EMAIL SISTEM] Započinjem slanje obaveštenja o promeni statusa servisa #${serviceId} u "${validStatus}"`);

        if (service.clientId) {
          const client = await storage.getClient(service.clientId);
          const technician = service.technicianId ? await storage.getTechnician(service.technicianId) : null;
          const technicianName = technician ? technician.fullName : "Nepoznat serviser";
          const statusDescription = STATUS_DESCRIPTIONS[validStatus] || validStatus;
          
          if (client) {
            emailInfo.clientName = client.fullName;
            
            console.log(`[EMAIL SISTEM] Pronađen klijent: ${client.fullName}, email: ${client.email || 'nije dostupan'}`);
            
            if (client.email) {
              console.log(`[EMAIL SISTEM] Pokušavam slanje emaila klijentu ${client.fullName} (${client.email})`);
              
              let clientEmailSent = false;
              
              if (validStatus === "customer_refused_repair" && customerRefusalReason) {
                console.log(`[EMAIL SISTEM] Slanje profesionalnog email-a za odbijanje popravke`);
                
                const appliance = service.applianceId ? await storage.getAppliance(service.applianceId) : null;
                const category = appliance ? await storage.getApplianceCategory(appliance.categoryId) : null;
                const applianceName = category ? category.name : "uređaj";
                
                const { EmailService } = await import('../email-service.js');
                const emailService = EmailService.getInstance();
                
                clientEmailSent = await emailService.sendCustomerRefusalNotification(
                  client,
                  serviceId,
                  applianceName,
                  customerRefusalReason,
                  technicianName
                );
              }
              
              if (clientEmailSent) {
                emailInfo.emailSent = true;
                emailInfo.emailDetails = `Email poslan klijentu ${client.fullName}`;
                console.log(`[EMAIL SISTEM] ✅ Email uspešno poslan klijentu: ${client.fullName}`);
              } else if (!clientEmailSent && validStatus !== "customer_refused_repair") {
                console.log(`[EMAIL SISTEM] Email nije poslan za status: ${validStatus}`);
              }
            }
          }
        }
      } catch (emailError) {
        console.error(`[EMAIL SISTEM] Greška pri slanju email obaveštenja:`, emailError);
        emailInfo.emailError = emailError instanceof Error ? emailError.message : 'Nepoznata greška';
      }
      
      res.json({
        ...updatedService,
        ...emailInfo
      });
    } catch (error) {
      console.error("[STATUS UPDATE] Greška pri ažuriranju statusa servisa:", error);
      res.status(500).json({ error: "Greška pri ažuriranju statusa servisa" });
    }
  });

  // GET /api/technician/service-report-pdf/:serviceId - Generate service PDF report for technicians
  app.get('/api/technician/service-report-pdf/:serviceId', jwtAuthMiddleware, requireRole(['technician']), async (req: Request, res: Response) => {
    try {
      const serviceId = parseInt(req.params.serviceId);
      const technicianId = (req as any).user?.technicianId;
      
      if (isNaN(serviceId)) {
        return res.status(400).json({ 
          error: 'Nevaljan ID servisa' 
        });
      }

      // Provjera da li servis pripada ovom serviseru
      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({
          error: "Servis nije pronađen"
        });
      }

      if (service.technicianId !== technicianId) {
        return res.status(403).json({
          error: "Nemate dozvolu",
          message: "Možete preuzeti PDF samo za svoje servise"
        });
      }

      console.log(`📄 [TECHNICIAN PDF] Zahtev za PDF izvještaj servisa ${serviceId} od servisera ${technicianId}`);

      const { pdfService } = await import('../pdf-service.js');
      
      console.log(`📄 [TECHNICIAN PDF] PDF service učitan, generisanje PDF-a...`);
      
      const pdfBuffer = await pdfService.generateServiceReportPDF(serviceId);
      
      console.log(`📄 [TECHNICIAN PDF] ✅ PDF uspešno generisan (${pdfBuffer.length} bytes)`);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="service-report-${serviceId}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Cache-Control', 'no-cache');
      
      res.send(pdfBuffer);
      
      console.log(`📄 [TECHNICIAN PDF] ✅ PDF izvještaj za servis ${serviceId} uspešno poslat`);
      
    } catch (error) {
      console.error('📄 [TECHNICIAN PDF] ❌ Greška pri generisanju PDF izvještaja:', error);
      res.status(500).json({ 
        error: 'Greška pri generisanju PDF izvještaja',
        message: 'Došlo je do greške. Pokušajte ponovo.'
      });
    }
  });

  console.log("✅ Technician routes registered");
}
