import type { Express } from "express";
import { storage } from "../storage";
import { jwtAuth, requireRole } from "../jwt-auth";
import { insertClientSchema, insertApplianceSchema } from "@shared/schema";
import { z } from "zod";

// Production logger for clean deployment
class ProductionLogger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  
  debug(message: string, ...args: any[]) {
    if (this.isDevelopment) {
      console.log(message, ...args);
    }
  }
  
  info(message: string, ...args: any[]) {
    if (this.isDevelopment) {
      console.info(message, ...args);
    }
  }
  
  warn(message: string, ...args: any[]) {
    console.warn(message, ...args);
  }
  
  error(message: string, ...args: any[]) {
    console.error(message, ...args);
  }
  
  security(message: string, ...args: any[]) {
    // Always log security events
    console.log(`[SECURITY] ${message}`, ...args);
  }
}

const logger = new ProductionLogger();

/**
 * Client Routes
 * - Client CRUD operations
 * - Client details and analysis
 * - Safe delete with validation
 */
export function registerClientRoutes(app: Express) {
  /**
   * @swagger
   * /api/clients:
   *   get:
   *     tags: [Clients]
   *     summary: Get all clients
   *     description: Retrieve list of all clients in the system
   *     responses:
   *       200:
   *         description: List of clients retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Client'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  // Client routes
  app.get("/api/clients", async (req, res) => {
    try {
      const clients = await storage.getAllClients();
      res.json(clients);
    } catch (error) {
      res.status(500).json({ error: "Greška pri dobijanju klijenata" });
    }
  });

  /**
   * @swagger
   * /api/clients/{id}:
   *   get:
   *     tags: [Clients]
   *     summary: Get client by ID
   *     description: Retrieve a specific client's information
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Client ID
   *     responses:
   *       200:
   *         description: Client retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Client'
   *       404:
   *         description: Client not found
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  app.get("/api/clients/:id", async (req, res) => {
    try {
      const client = await storage.getClient(parseInt(req.params.id));
      if (!client) return res.status(404).json({ error: "Klijent nije pronađen" });
      res.json(client);
    } catch (error) {
      res.status(500).json({ error: "Greška pri dobijanju klijenta" });
    }
  });
  
  // Endpoint za dobijanje detaljnih informacija o klijentu (sa aparatima, servisima i serviserima)
  app.get("/api/clients/:id/details", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const clientDetails = await storage.getClientWithDetails(parseInt(req.params.id));
      if (!clientDetails) return res.status(404).json({ error: "Klijent nije pronađen" });
      res.json(clientDetails);
    } catch (error) {
      logger.error("Greška pri dobijanju detalja klijenta:", error);
      res.status(500).json({ error: "Greška pri dobijanju detalja klijenta" });
    }
  });
  
  // Provera da li klijent već postoji
  app.post("/api/clients/check", async (req, res) => {
    logger.debug("🔍 /api/clients/check endpoint pozvan sa:", req.body);
    try {
      const { email } = req.body;
      if (!email) {
        logger.debug("❌ Email nije prosleđen");
        return res.status(400).json({ error: "Email je obavezan" });
      }
      
      const clients = await storage.getAllClients();
      const existingClient = clients.find(c => c.email === email);
      
      if (existingClient) {
        logger.debug("✅ Klijent pronađen:", existingClient.id);
        res.json({ exists: true, id: existingClient.id });
      } else {
        logger.debug("❌ Klijent nije pronađen");
        res.json({ exists: false });
      }
    } catch (error) {
      logger.error("Greška pri proveri klijenta:", error);
      res.status(500).json({ error: "Greška pri proveri klijenta" });
    }
  });

  /**
   * @swagger
   * /api/clients:
   *   post:
   *     tags: [Clients]
   *     summary: Create new client
   *     description: Create a new client (optionally with appliance)
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [fullName, phone]
   *             properties:
   *               fullName:
   *                 type: string
   *               email:
   *                 type: string
   *                 format: email
   *               phone:
   *                 type: string
   *               address:
   *                 type: string
   *               city:
   *                 type: string
   *               categoryId:
   *                 type: integer
   *                 description: Optional - for creating with appliance
   *               manufacturerId:
   *                 type: integer
   *                 description: Optional - for creating with appliance
   *               model:
   *                 type: string
   *                 description: Optional - for creating with appliance
   *     responses:
   *       200:
   *         description: Client created successfully
   *       400:
   *         description: Invalid client data
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  app.post("/api/clients", async (req, res) => {
    try {
      logger.debug("🔧 [ADMIN CLIENTS] POST endpoint pozvan sa podacima:", req.body);
      
      // Proverimo da li se šalje klijent sa uređajem ili samo klijent
      const hasAppliance = req.body.categoryId && req.body.manufacturerId && req.body.model;
      
      if (hasAppliance) {
        
        // Validacija kombinovanih podataka (klijent + uređaj)
        const clientData = {
          fullName: req.body.fullName,
          email: req.body.email,
          phone: req.body.phone,
          address: req.body.address,
          city: req.body.city,
        };
        
        const applianceData = {
          categoryId: req.body.categoryId,
          manufacturerId: req.body.manufacturerId,
          model: req.body.model,
          serialNumber: req.body.serialNumber,
          purchaseDate: req.body.purchaseDate,
          notes: req.body.notes,
        };
        
        // Validacija podataka klijenta
        const clientValidation = insertClientSchema.safeParse(clientData);
        if (!clientValidation.success) {
          return res.status(400).json({ 
            error: "Nevažeći podaci klijenta", 
            details: clientValidation.error.format(),
            message: "Podaci o klijentu nisu validni. Proverite unos."
          });
        }
        
        // Validacija podataka uređaja (dodajem dummy clientId za validaciju)
        const applianceValidation = insertApplianceSchema.safeParse({
          ...applianceData,
          clientId: 999 // Dummy pozitivna vrednost za validaciju - biće zamenjena pravim ID-om
        });
        
        if (!applianceValidation.success) {
          return res.status(400).json({ 
            error: "Nevažeći podaci uređaja", 
            details: applianceValidation.error.format(),
            message: "Podaci o uređaju nisu validni. Proverite unos."
          });
        }
        
        // Kreiranje klijenta
        logger.debug("👤 [ADMIN CLIENTS] Kreiranje klijenta...");
        const newClient = await storage.createClient(clientValidation.data);
        
        // Kreiranje uređaja sa ID klijenta
        const newAppliance = await storage.createAppliance({
          ...applianceData,
          clientId: newClient.id,
        });
        
        res.json({
          ...newClient,
          appliance: newAppliance,
          message: `Klijent ${newClient.fullName} je kreiran sa uređajem ${newAppliance.model}.`
        });
        
      } else {
        logger.debug("👤 [ADMIN CLIENTS] Kreiranje SAMO klijenta (bez uređaja)");
        
        // Validacija podataka klijenta
        const validationResult = insertClientSchema.safeParse(req.body);
        if (!validationResult.success) {
          return res.status(400).json({ 
            error: "Nevažeći podaci klijenta", 
            details: validationResult.error.format(),
            message: "Svi podaci o klijentu moraju biti pravilno uneti. Proverite podatke i pokušajte ponovo."
          });
        }
        
        const validatedData = validationResult.data;
        
        // Kreiranje klijenta bez uređaja
        const newClient = await storage.createClient(validatedData);
        logger.debug("🎉 [ADMIN CLIENTS] Novi klijent kreiran uspešno:", newClient);
        
        res.json(newClient);
      }
    } catch (error) {
      console.error("Greška pri kreiranju klijenta:", error);
      res.status(500).json({ 
        error: "Greška pri kreiranju klijenta", 
        message: error instanceof Error ? error.message : String(error) 
      });
    }
  });


  /**
   * @swagger
   * /api/clients/{id}:
   *   put:
   *     tags: [Clients]
   *     summary: Update client
   *     description: Update client information
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/Client'
   *     responses:
   *       200:
   *         description: Client updated successfully
   *       400:
   *         description: Invalid data
   *       404:
   *         description: Client not found
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  app.put("/api/clients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertClientSchema.parse(req.body);
      const updatedClient = await storage.updateClient(id, validatedData);
      if (!updatedClient) return res.status(404).json({ error: "Klijent nije pronađen" });
      res.json(updatedClient);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Nevažeći podaci klijenta", details: error.format() });
      }
      res.status(500).json({ error: "Greška pri ažuriranju klijenta" });
    }
  });

  /**
   * @swagger
   * /api/clients/{id}:
   *   delete:
   *     tags: [Clients]
   *     summary: Delete client
   *     description: Delete a client from the system
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Client deleted successfully
   *       404:
   *         description: Client not found
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  app.delete("/api/clients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Provera da li klijent postoji
      const client = await storage.getClient(id);
      if (!client) {
        return res.status(404).json({ error: "Klijent nije pronađen" });
      }
      
      // Brisanje klijenta
      await storage.deleteClient(id);
      
      res.json({ 
        success: true, 
        message: "Klijent je uspešno obrisan" 
      });
    } catch (error) {
      console.error("Greška pri brisanju klijenta:", error);
      res.status(500).json({ error: "Greška pri brisanju klijenta", message: error instanceof Error ? error.message : String(error) });
    }
  });

  // Client comprehensive analysis endpoint (samo admin)
  app.get("/api/admin/clients/:id/comprehensive-analysis", jwtAuth, requireRole(['admin']), async (req, res) => {
    console.log(`🔥 [CLIENT ANALYSIS ENDPOINT] POZVAN SA clientId: ${req.params.id}`);
    try {
      const clientId = parseInt(req.params.id);
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ error: "Klijent nije pronađen" });
      }

      // Get client's appliances
      const clientAppliances = await storage.getAppliancesByClient(clientId);
      
      // Get client's services
      const clientServices = await storage.getServicesByClient(clientId);
      
      // Calculate service statistics
      const completedServices = clientServices.filter(s => s.status === 'completed').length;
      const activeServices = clientServices.filter(s => s.status === 'in_progress').length;
      const warrantyServices = clientServices.filter(s => s.warrantyStatus === 'u garanciji').length;
      const totalCost = clientServices.reduce((sum, service) => sum + parseFloat(service.cost || '0'), 0);
      
      const response = {
        reportMetadata: {
          generatedAt: new Date().toISOString(),
          reportId: `CLIENT_ANALYSIS_${clientId}_${Date.now()}`,
          clientId: clientId,
          reportType: "comprehensive_client_analysis"
        },
        clientInfo: {
          id: client.id,
          fullName: client.fullName,
          email: client.email || "",
          phone: client.phone,
          address: client.address || "",
          city: client.city || "",
          totalAppliances: clientAppliances.length,
          registrationDate: client.createdAt || new Date().toISOString()
        },
        serviceStatistics: {
          totalServices: clientServices.length,
          completedServices: completedServices,
          activeServices: activeServices,
          warrantyServices: warrantyServices,
          totalCost: totalCost,
          averageServiceTimeInDays: 0,
          completionRate: clientServices.length > 0 ? Math.round((completedServices / clientServices.length) * 100) : 0,
          warrantyRate: clientServices.length > 0 ? Math.round((warrantyServices / clientServices.length) * 100) : 0
        },
        appliances: clientAppliances,
        services: clientServices,
        analytics: { 
          applianceStats: {}, 
          technicianStats: {}, 
          monthlyServiceHistory: {}, 
          problematicAppliances: [] 
        },
        spareParts: [],
        recommendations: { 
          maintenanceAlerts: 'Nema aktivnih upozorenja', 
          costOptimization: 'Redovno održavanje preporučeno', 
          technicianPreference: 'Najčešći serviser će biti prikazan' 
        }
      };
      
      console.log(`[CLIENT ANALYSIS] Kompletna analiza klijenta ${clientId} kreirana uspešno`);
      res.json(response);
    } catch (error) {
      console.error("[CLIENT ANALYSIS] Greška:", error);
      res.status(500).json({ error: "Greška pri kreiranju analize klijenta" });
    }
  });

  // ENHANCED CLIENT COMPREHENSIVE ANALYSIS - FIXES JAVASCRIPT ERRORS
  // Novi endpoint koji rešava probleme sa strukturom podataka na frontend-u
  app.get("/api/admin/clients/:id/comprehensive-analysis-enhanced", jwtAuth, requireRole(['admin']), async (req, res) => {
    console.log(`🔥 [ENHANCED CLIENT ANALYSIS] POZVAN SA clientId: ${req.params.id}`);
    try {
      const clientId = parseInt(req.params.id);
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ error: "Klijent nije pronađen" });
      }

      // Get client's appliances
      const clientAppliances = await storage.getAppliancesByClient(clientId);
      
      // Get client's services
      const clientServices = await storage.getServicesByClient(clientId);
      
      // Get spare parts for all services
      const serviceIds = clientServices.map(s => s.id);
      let allSpareParts = [];
      
      try {
        for (const serviceId of serviceIds) {
          const serviceParts = await storage.getSparePartsByService(serviceId) || [];
          allSpareParts = allSpareParts.concat(serviceParts.map(part => ({
            ...part,
            serviceId: serviceId
          })));
        }
      } catch (sparePartsError) {
        console.log('[ENHANCED CLIENT ANALYSIS] Spare parts nisu dostupni:', sparePartsError.message);
        allSpareParts = [];
      }
      
      // Enhance services with spare parts data
      const enhancedServices = clientServices.map(service => {
        const serviceParts = allSpareParts
          .filter(part => part.serviceId === service.id)
          .map(part => ({
            partName: part.partName || 'Nepoznat deo',
            status: part.status || 'unknown',
            cost: part.cost ? part.cost.toString() : undefined
          }));
        
        return {
          ...service,
          spareParts: serviceParts || [], // Osiguraj da spareParts uvek postoji
          cost: service.cost ? service.cost.toString() : undefined,
          warrantyStatus: service.warrantyStatus || 'van garancije',
          applianceModel: service.applianceModel || '',
          manufacturerName: service.manufacturerName || '',
          technicianName: service.technicianName || ''
        };
      });
      
      // Calculate service statistics
      const completedServices = enhancedServices.filter(s => s.status === 'completed').length;
      const activeServices = enhancedServices.filter(s => s.status === 'in_progress').length;
      const warrantyServices = enhancedServices.filter(s => s.warrantyStatus === 'u garanciji').length;
      const totalCost = enhancedServices.reduce((sum, service) => {
        const cost = parseFloat(service.cost || '0');
        return sum + (isNaN(cost) ? 0 : cost);
      }, 0);
      
      // Calculate average service time
      const completedServicesWithDates = enhancedServices.filter(s => 
        s.status === 'completed' && s.createdAt && s.completedDate
      );
      
      let averageServiceTimeInDays = 0;
      if (completedServicesWithDates.length > 0) {
        const totalDays = completedServicesWithDates.reduce((sum, service) => {
          const startDate = new Date(service.createdAt);
          const endDate = new Date(service.completedDate);
          const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
          return sum + Math.max(1, daysDiff); // Minimum 1 day
        }, 0);
        averageServiceTimeInDays = Math.round(totalDays / completedServicesWithDates.length);
      }
      
      // Enhanced appliances data with proper structure
      const enhancedAppliances = clientAppliances.map(appliance => ({
        id: appliance.id || 0,
        categoryName: appliance.categoryName || 'Nepoznata kategorija',
        manufacturerName: appliance.manufacturerName || 'Nepoznat proizvođač',
        model: appliance.model || 'Nepoznat model',
        serialNumber: appliance.serialNumber || '',
        purchaseDate: appliance.purchaseDate || undefined,
        serviceCount: enhancedServices.filter(s => s.applianceId === appliance.id).length,
        lastServiceDate: (() => {
          const applianceServices = enhancedServices
            .filter(s => s.applianceId === appliance.id && s.createdAt)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          return applianceServices.length > 0 ? applianceServices[0].createdAt : null;
        })()
      }));
      
      const response = {
        reportMetadata: {
          generatedAt: new Date().toISOString(),
          reportId: `CLIENT_ANALYSIS_ENHANCED_${clientId}_${Date.now()}`,
          clientId: clientId,
          reportType: "comprehensive_client_analysis_enhanced"
        },
        clientInfo: {
          id: client.id,
          fullName: client.fullName || 'Nepoznato ime',
          email: client.email || '',
          phone: client.phone || '',
          address: client.address || '',
          city: client.city || '',
          totalAppliances: enhancedAppliances.length,
          registrationDate: client.createdAt || new Date().toISOString()
        },
        serviceStatistics: {
          totalServices: enhancedServices.length,
          completedServices: completedServices,
          activeServices: activeServices,
          warrantyServices: warrantyServices,
          totalCost: totalCost,
          averageServiceTimeInDays: averageServiceTimeInDays,
          completionRate: enhancedServices.length > 0 ? Math.round((completedServices / enhancedServices.length) * 100) : 0,
          warrantyRate: enhancedServices.length > 0 ? Math.round((warrantyServices / enhancedServices.length) * 100) : 0
        },
        appliances: enhancedAppliances,
        services: enhancedServices,
        analytics: { 
          applianceStats: {}, 
          technicianStats: {}, 
          monthlyServiceHistory: {}, 
          problematicAppliances: [] 
        },
        spareParts: allSpareParts.map(part => ({
          partName: part.partName || 'Nepoznat deo',
          status: part.status || 'unknown',
          urgency: part.urgency || 'normal',
          cost: part.cost ? part.cost.toString() : undefined,
          orderDate: part.createdAt || new Date().toISOString()
        })),
        recommendations: { 
          maintenanceAlerts: enhancedServices.length > 5 ? 
            'Klijent ima veliki broj servisa - preporučuje se redovno održavanje' : 
            'Nema aktivnih upozorenja za održavanje', 
          costOptimization: totalCost > 50000 ? 
            'Visoki troškovi servisa - razmotriti preventivno održavanje' : 
            'Troškovi servisa su u normalnom opsegu', 
          technicianPreference: (() => {
            const technicianCounts = {};
            enhancedServices.forEach(service => {
              if (service.technicianName) {
                technicianCounts[service.technicianName] = (technicianCounts[service.technicianName] || 0) + 1;
              }
            });
            const mostFrequentTechnician = Object.entries(technicianCounts)
              .sort(([,a], [,b]) => b - a)[0];
            return mostFrequentTechnician ? 
              `Najčešći serviser: ${mostFrequentTechnician[0]} (${mostFrequentTechnician[1]} servisa)` : 
              'Nema dovoljno podataka o serviserima';
          })()
        }
      };
      
      console.log(`[ENHANCED CLIENT ANALYSIS] Kompletna poboljšana analiza klijenta ${clientId} kreirana uspešno`);
      console.log(`[ENHANCED CLIENT ANALYSIS] Servisi: ${enhancedServices.length}, Rezervni delovi: ${allSpareParts.length}`);
      res.json(response);
    } catch (error) {
      console.error("[ENHANCED CLIENT ANALYSIS] Greška:", error);
      res.status(500).json({ error: "Greška pri kreiranju poboljšane analize klijenta" });
    }
  });

  // 🔒 Zaštićeno brisanje klijenta - traži identično ime i prezime
  app.delete("/api/admin/clients/:id/safe-delete", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      
      const clientId = parseInt(req.params.id);
      const { fullName } = req.body;
      
      if (isNaN(clientId)) {
        return res.status(400).json({ error: "Neispravan ID klijenta" });
      }
      
      if (!fullName || typeof fullName !== 'string') {
        return res.status(400).json({ 
          error: "Potrebno je uneti ime i prezime klijenta", 
          hint: "Unesite tačno ime i prezime kao što je zapisano u bazi podataka" 
        });
      }
      
      // Dohvati podatke klijenta
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ error: "Klijent nije pronađen" });
      }
      
      // KRITIČNA PROVJERA: Ime mora biti IDENTIČNO
      const trimmedInputName = fullName.trim();
      const trimmedClientName = client.fullName.trim();
      
      if (trimmedInputName !== trimmedClientName) {
        console.log(`🚫 [SAFE DELETE CLIENT] Nepodudarnost imena:`);
        console.log(`   Uneto: "${trimmedInputName}"`);
        console.log(`   U bazi: "${trimmedClientName}"`);
        
        return res.status(400).json({ 
          error: "Uneto ime i prezime se ne slaže sa podacima u bazi", 
          hint: `Tačno ime u bazi: "${trimmedClientName}"`,
          inputReceived: trimmedInputName 
        });
      }
      
      // Proveri da li klijent ima servise
      const clientServices = await storage.getServicesByClient(clientId);
      if (clientServices.length > 0) {
        return res.status(400).json({ 
          error: "Klijent ima aktivne servise", 
          message: "Prvo obriši sve servise povezane sa ovim klijentom",
          activeServicesCount: clientServices.length
        });
      }

      // Proveri da li klijent ima uređaje
      const clientAppliances = await storage.getAppliancesByClient(clientId);
      if (clientAppliances.length > 0) {
        return res.status(400).json({ 
          error: "Klijent ima registrovane uređaje", 
          message: "Prvo obriši sve uređaje povezane sa ovim klijentom",
          activeAppliancesCount: clientAppliances.length
        });
      }

      // SIGURNO BRISANJE - ime se slaže!
      const success = await storage.deleteClient(clientId);
      
      if (success) {
        res.json({ 
          success: true, 
          message: `Klijent "${trimmedClientName}" je uspešno obrisan`,
          deletedClient: {
            id: clientId,
            fullName: trimmedClientName
          }
        });
      } else {
        res.status(500).json({ error: "Greška pri brisanju klijenta" });
      }
      
    } catch (error) {
      console.error("🛡️ [SAFE DELETE CLIENT] ❌ Greška:", error);
      res.status(500).json({ 
        error: "Greška pri zaštićenom brisanju klijenta", 
        message: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  console.log("✅ Client routes registered");
}
