import type { Express } from "express";
import { storage } from "../storage.js";
import { jwtAuth, requireRole } from "../jwt-auth.js";
import { emailService } from "../email-service.js";
import { supplierAssignmentService } from "../supplier-assignment-service.js";

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

// ComPlus brendovi za automatsku detekciju - STVARNI PODACI
const complusBrands = [
  'Electrolux', 'Elica', 'Candy', 'Hoover', 'Turbo Air'
];

// Mapa dobavljača sa prioritetom za ComPlus brend - AŽURIRANO SA STVARNIM PODACIMA
const supplierEmailConfig = new Map([
  // 🎯 COMPLUS - GLAVNA DESTINACIJA ZA REZERVNE DELOVE
  ["ComPlus", "servis@complus.me"],
  ["ComPlus Servis", "servis@complus.me"],
  ["servis@complus.me", "servis@complus.me"],
  
  // ComPlus povezani brendovi - STVARNI PODACI
  ["Electrolux", "servis@complus.me"], // ComPlus brend
  ["Electrolux Service", "servis@complus.me"], // ComPlus brend
  ["Elica", "servis@complus.me"], // ComPlus brend
  ["Elica Service", "servis@complus.me"], // ComPlus brend
  ["Candy", "servis@complus.me"], // ComPlus brend
  ["Candy Service", "servis@complus.me"], // ComPlus brend
  ["Hoover", "servis@complus.me"], // ComPlus brend
  ["Hoover Service", "servis@complus.me"], // ComPlus brend
  ["Turbo Air", "servis@complus.me"], // ComPlus brend
  ["TurboAir", "servis@complus.me"], // ComPlus brend
  ["Turbo Air Service", "servis@complus.me"], // ComPlus brend
  
  // Lokalni ComPlus partneri
  ["TehnoPlus", "robert.ivezic@tehnoplus.me"],
  ["Frigo Sistem Todosijević", "gruica@frigosistemtodosijevic.com"],
  
  // Ostali dobavljači (backup za ne-ComPlus brendove)
  ["Bosch Service", "servis@bosch.rs"],
  ["Siemens Service", "delovi@siemens.rs"],
  ["Gorenje Servis", "rezervni.delovi@gorenje.com"],
  ["Whirlpool Parts", "parts@whirlpool.rs"],
  ["Samsung Service", "spareparts@samsung.rs"],
  ["LG Electronics", "parts@lg.rs"],
  ["Beko Servis", "rezervni@beko.rs"],
  ["Miele Service", "parts@miele.rs"]
]);

/**
 * Provera da li je uređaj ComPlus brenda na osnovu proizvođača
 */
function isComplusBrand(manufacturerName: string): boolean {
  if (!manufacturerName) return false;
  return complusBrands.some(brand => 
    manufacturerName.toLowerCase().includes(brand.toLowerCase()) ||
    brand.toLowerCase().includes(manufacturerName.toLowerCase())
  );
}

/**
 * Dohvata email adresu dobavljača na osnovu naziva - OPTIMIZOVANO ZA COMPLUS
 */
function getSupplierEmailByName(supplierName: string): string | null {
  if (!supplierName) return null;
  
  // Prva provera - direktno poklapanje
  const directMatch = supplierEmailConfig.get(supplierName);
  if (directMatch) return directMatch;
  
  // Druga provera - case-insensitive poklapanje
  const normalizedName = supplierName.toLowerCase().trim();
  for (const [name, email] of supplierEmailConfig.entries()) {
    if (name.toLowerCase() === normalizedName) {
      return email;
    }
  }
  
  // Treća provera - parcijalno poklapanje (sadrži reči)
  for (const [name, email] of supplierEmailConfig.entries()) {
    const nameWords = name.toLowerCase().split(' ');
    const supplierWords = normalizedName.split(' ');
    
    const hasCommonWord = nameWords.some(nameWord => 
      supplierWords.some(supplierWord => 
        nameWord.includes(supplierWord) || supplierWord.includes(nameWord)
      )
    );
    
    if (hasCommonWord) return email;
  }
  
  return null; // Dobavljač nije pronađen
}

/**
 * Spare Parts Routes
 * 
 * Workflow statuses:
 * - pending: Technician requests part, waiting for admin approval
 * - admin_ordered: Admin approved and ordered the part
 * - waiting_delivery: Part is ordered, waiting to be delivered
 * - available: Part is in stock and ready to be used
 * - consumed: Part has been used by technician
 * 
 * Endpoints:
 * - Technician: request, get own parts, get available parts, consume
 * - Admin: order, receive, make available, approve pending, get by status, update, delete
 * - Mobile: create order, request parts for service
 */
export function registerSparePartsRoutes(app: Express) {
  
  // ===== TECHNICIAN OPERATIONS =====
  
  // 1. Zahtev servisera za rezervni deo (Technician requests spare part)
  app.post("/api/technician/spare-parts/request", jwtAuth, async (req, res) => {
    try {
      if (req.user?.role !== 'technician' && req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Samo serviseri mogu da zahtevaju rezervne delove" });
      }

      const requestData = {
        ...req.body,
        status: "requested",
        technicianId: req.user.technicianId || req.user.id,
        requesterType: "technician",
        requesterUserId: req.user.technicianId || req.user.id,
        requesterName: req.user.fullName || req.user.username
      };

      const order = await storage.createSparePartOrder(requestData);
      
      res.json({ 
        success: true, 
        message: "Zahtev za rezervni deo je uspešno poslat", 
        order 
      });
    } catch (error) {
      logger.error("Greška pri zahtevu za rezervni deo:", error);
      res.status(500).json({ error: "Greška pri slanju zahteva za rezervni deo" });
    }
  });

  // 2. Dohvati rezervne delove servisera (Get technician's spare parts)
  app.get("/api/technician/spare-parts", jwtAuth, async (req, res) => {
    try {
      if (req.user?.role !== 'technician' && req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Samo serviseri mogu da pristupe svojim zahtevima" });
      }

      const technicianId = req.user.technicianId || req.user.id;
      const requests = await storage.getTechnicianSparePartRequests(technicianId);
      
      res.json(requests);
    } catch (error) {
      logger.error("Greška pri dohvatanju zahteva servisera za rezervne delove:", error);
      res.status(500).json({ error: "Greška pri dohvatanju zahteva" });
    }
  });

  // 3. Dohvati dostupne rezervne delove za servisera (Get available parts for technician)
  app.get("/api/technician/spare-parts/available", jwtAuth, async (req, res) => {
    try {
      if (req.user?.role !== 'technician' && req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Samo serviseri mogu da pristupe dostupnim delovima" });
      }

      const orders = await storage.getSparePartOrdersByStatus("available");
      
      res.json(orders);
    } catch (error) {
      logger.error("Greška pri dohvatanju dostupnih delova:", error);
      res.status(500).json({ error: "Greška pri dohvatanju dostupnih rezervnih delova" });
    }
  });

  // 4. Serviser potroši rezervni deo (Technician consumes spare part)
  app.patch("/api/technician/spare-parts/:id/consume", jwtAuth, async (req, res) => {
    try {
      if (req.user?.role !== 'technician' && req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Samo serviseri mogu da troše rezervne delove" });
      }

      const orderId = parseInt(req.params.id);

      const order = await storage.updateSparePartOrderStatus(orderId, {
        status: "consumed",
        adminNotes: `Potrošeno od strane: ${req.user.fullName || req.user.username}`
      });

      res.json({ 
        success: true, 
        message: "Rezervni deo je označen kao potrošen", 
        order 
      });
    } catch (error) {
      logger.error("Greška pri označavanju potrošnje:", error);
      res.status(500).json({ error: "Greška pri označavanju potrošnje rezervnog dela" });
    }
  });

  // ===== ADMIN OPERATIONS =====

  // 5. Admin označi deo kao poručen + automatski pošalji email dobavljaču (Admin orders part)
  app.patch("/api/admin/spare-parts/:id/order", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Samo administratori mogu da poručuju rezervne delove" });
      }

      const orderId = parseInt(req.params.id);
      const { supplierName, estimatedDelivery, adminNotes, urgency = 'normal' } = req.body;

      // Dohvati kompletan order sa svim povezanim podacima
      const existingOrder = await storage.getSparePartOrder(orderId);
      if (!existingOrder) {
        return res.status(404).json({ error: "Porudžbina rezervnog dela nije pronađena" });
      }

      // Ažuriraj status porudžbine
      const order = await storage.updateSparePartOrderStatus(orderId, {
        status: "admin_ordered",
        supplierName,
        expectedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : undefined,
        adminNotes: adminNotes ? `${adminNotes} (Poručio: ${req.user.fullName || req.user.username})` : `Poručio: ${req.user.fullName || req.user.username}`,
        orderDate: new Date()
      });

      // 🎯 AUTOMATSKI EMAIL/SMS SISTEM
      try {
        let service = null;
        let client = null;
        let appliance = null;
        let technician = null;
        let manufacturer = null;
        let category = null;

        if (existingOrder.serviceId) {
          service = await storage.getService(existingOrder.serviceId);
          if (service) {
            if (service.clientId) {
              client = await storage.getClient(service.clientId);
            }
            if (service.applianceId) {
              appliance = await storage.getAppliance(service.applianceId);
              if (appliance?.manufacturerId) {
                manufacturer = await storage.getManufacturer(appliance.manufacturerId);
              }
              if (appliance?.categoryId) {
                category = await storage.getApplianceCategory(appliance.categoryId);
              }
            }
            if (service.technicianId) {
              technician = await storage.getTechnician(service.technicianId);
            }
          }
        }

        const manufacturerName = manufacturer?.name || '';
        const isComPlus = isComplusBrand(manufacturerName);

        // 🎯 COMPLUS BREND - Automatski email na servis@complus.me
        if (isComPlus) {
          const deviceType = category?.name || 'Uređaj';
          const complusEmailSent = await emailService.sendComplusSparePartOrder(
            existingOrder.serviceId || 0,
            client?.fullName || 'N/A',
            technician?.fullName || 'N/A',
            deviceType,
            manufacturerName,
            existingOrder.partName,
            existingOrder.partNumber || 'N/A',
            urgency,
            existingOrder.description || undefined
          );

          if (complusEmailSent) {
            console.log(`📧 [COMPLUS] Email poslat: servis@complus.me za ${existingOrder.partName}`);
          } else {
            console.log(`❌ [COMPLUS] Email greška: servis@complus.me za ${existingOrder.partName}`);
          }
        }
      } catch (emailError) {
        console.error("Email greška pri poručivanju dela:", emailError);
      }

      // 📱 AUTOMATSKI SMS PROTOKOL ZA PORUČIVANJE DELOVA
      try {
        const { createProtocolSMSService } = await import('../sms-communication-service.js');
        
        const settingsArray = await storage.getSystemSettings();
        const settingsMap = Object.fromEntries(settingsArray.map(s => [s.key, s.value]));
        
        const protocolSMS = createProtocolSMSService({
          apiKey: settingsMap.sms_mobile_api_key,
          baseUrl: settingsMap.sms_mobile_base_url || 'https://api.smsmobileapi.com',
          senderId: settingsMap.sms_mobile_sender_id || undefined,
          enabled: settingsMap.sms_mobile_enabled === 'true'
        }, storage);

        if (existingOrder.serviceId) {
          const service = await storage.getService(existingOrder.serviceId);
          const client = service?.clientId ? await storage.getClient(service.clientId) : null;
          const technician = service?.technicianId ? await storage.getTechnician(service.technicianId) : null;
          const appliance = service?.applianceId ? await storage.getAppliance(service.applianceId) : null;
          const manufacturer = appliance?.manufacturerId ? await storage.getManufacturer(appliance.manufacturerId) : null;
          const category = appliance?.categoryId ? await storage.getApplianceCategory(appliance.categoryId) : null;

          if (client && technician) {
            const smsData = {
              serviceId: existingOrder.serviceId,
              clientId: service?.clientId || 0,
              clientName: client.fullName,
              clientPhone: client.phone,
              deviceType: category?.name || 'Uređaj',
              deviceModel: appliance?.model || 'N/A',
              manufacturerName: manufacturer?.name || '',
              technicianId: technician.id,
              technicianName: technician.fullName,
              technicianPhone: technician.phone || '067123456',
              partName: existingOrder.partName,
              estimatedDate: estimatedDelivery || '3-5 dana',
              createdBy: req.user.fullName || req.user.username
            };

            await protocolSMS.sendPartsOrderedProtocol(smsData);
          }
        }
      } catch (smsError) {
        console.error("SMS greška pri poručivanju dela:", smsError);
      }

      res.json({ 
        success: true, 
        message: "Rezervni deo je uspešno poručen", 
        order 
      });
    } catch (error) {
      logger.error("Greška pri poručivanju rezervnog dela:", error);
      res.status(500).json({ error: "Greška pri poručivanju rezervnog dela" });
    }
  });

  // 6. Admin potvrdi prijem rezervnog dela (Admin receives ordered part)
  app.patch("/api/admin/spare-parts/:id/receive", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Samo administratori mogu da potvrđuju prijem rezervnih delova" });
      }

      const orderId = parseInt(req.params.id);
      const { actualCost, adminNotes } = req.body;

      const order = await storage.updateSparePartOrderStatus(orderId, {
        status: "waiting_delivery",
        actualCost,
        adminNotes: adminNotes ? `${adminNotes} (Primio: ${req.user.fullName || req.user.username})` : `Primio: ${req.user.fullName || req.user.username}`
      });

      res.json({ 
        success: true, 
        message: "Prijem rezervnog dela je uspešno potvrđen", 
        order 
      });
    } catch (error) {
      logger.error("Greška pri potvrđivanju prijema:", error);
      res.status(500).json({ error: "Greška pri potvrđivanju prijema rezervnog dela" });
    }
  });

  // 7. Admin prebaci deo u dostupno stanje (Admin makes part available)
  app.patch("/api/admin/spare-parts/:id/make-available", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Samo administratori mogu da prebacuju delove u dostupno stanje" });
      }

      const orderId = parseInt(req.params.id);

      const order = await storage.updateSparePartOrderStatus(orderId, {
        status: "available",
        adminNotes: `Dostupno napravio: ${req.user.fullName || req.user.username}`
      });

      res.json({ 
        success: true, 
        message: "Rezervni deo je prebačen u dostupno stanje", 
        order 
      });
    } catch (error) {
      logger.error("Greška pri prebacivanju u dostupno:", error);
      res.status(500).json({ error: "Greška pri prebacivanju rezervnog dela u dostupno stanje" });
    }
  });

  // 8. Odobri pending zahtev (Admin approves pending request)
  app.patch("/api/admin/spare-parts/:id/approve-pending", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Samo administratori mogu da odobravaju pending zahteve" });
      }

      const orderId = parseInt(req.params.id);
      
      const existingOrder = await storage.getSparePartOrder(orderId);
      if (!existingOrder) {
        return res.status(404).json({ error: "Porudžbina rezervnog dela nije pronađena" });
      }
      
      if (existingOrder.status !== 'pending') {
        return res.status(400).json({ error: "Samo zahtevi sa statusom 'pending' mogu biti odobreni" });
      }
      
      // DIREKTNO PREBACI U "ADMIN_ORDERED" UMESTO "REQUESTED"
      const updatedOrder = await storage.updateSparePartOrderStatus(orderId, {
        status: 'admin_ordered',
        adminNotes: existingOrder.adminNotes ? `${existingOrder.adminNotes} | Odobrio: ${req.user.fullName || req.user.username}` : `Odobrio: ${req.user.fullName || req.user.username}`,
        orderDate: new Date()
      });
      
      if (!updatedOrder) {
        return res.status(500).json({ error: "Greška pri ažuriranju statusa zahteva" });
      }

      // AUTOMATSKI EMAIL/SMS SISTEM (kopiran iz order endpoint-a)
      let serviceData: any = null;
      let clientData: any = null;
      let applianceData: any = null;
      let technicianData: any = null;
      let manufacturerData: any = null;
      let categoryData: any = null;
      let manufacturerName = '';

      try {

        if (existingOrder.serviceId) {
          serviceData = await storage.getService(existingOrder.serviceId);
          if (serviceData) {
            if (serviceData.clientId) {
              clientData = await storage.getClient(serviceData.clientId);
            }
            if (serviceData.applianceId) {
              applianceData = await storage.getAppliance(serviceData.applianceId);
              if (applianceData?.manufacturerId) {
                manufacturerData = await storage.getManufacturer(applianceData.manufacturerId);
              }
              if (applianceData?.categoryId) {
                categoryData = await storage.getApplianceCategory(applianceData.categoryId);
              }
            }
            if (serviceData.technicianId) {
              technicianData = await storage.getTechnician(serviceData.technicianId);
            }
          }
        }

        manufacturerName = manufacturerData?.name || '';
        const isComPlus = isComplusBrand(manufacturerName);

        // 🎯 COMPLUS BREND - Automatski email na servis@complus.me
        if (isComPlus) {
          const deviceType = categoryData?.name || 'Uređaj';
          const complusEmailSent = await emailService.sendComplusSparePartOrder(
            existingOrder.serviceId || 0,
            clientData?.fullName || 'N/A',
            technicianData?.fullName || 'N/A',
            deviceType,
            manufacturerName,
            existingOrder.partName,
            existingOrder.partNumber || 'N/A',
            'normal',
            existingOrder.description || undefined
          );

          if (complusEmailSent) {
            console.log(`📧 [COMPLUS] Email poslat pri odobrenju: servis@complus.me`);
          }
        }
      } catch (emailError) {
        console.error("Email greška pri odobrenju:", emailError);
      }

      // 📱 AUTOMATSKI SMS PROTOKOL
      try {
        const { createProtocolSMSService } = await import('../sms-communication-service.js');
        
        const settingsArray = await storage.getSystemSettings();
        const settingsMap = Object.fromEntries(settingsArray.map(s => [s.key, s.value]));
        
        const protocolSMS = createProtocolSMSService({
          apiKey: settingsMap.sms_mobile_api_key,
          baseUrl: settingsMap.sms_mobile_base_url || 'https://api.smsmobileapi.com',
          senderId: settingsMap.sms_mobile_sender_id || undefined,
          enabled: settingsMap.sms_mobile_enabled === 'true'
        }, storage);

        if (existingOrder.serviceId && clientData && technicianData) {
          const smsData = {
            serviceId: existingOrder.serviceId,
            clientId: serviceData?.clientId || 0,
            clientName: clientData.fullName,
            clientPhone: clientData.phone,
            deviceType: categoryData?.name || 'Uređaj',
            deviceModel: applianceData?.model || 'N/A',
            manufacturerName: manufacturerName,
            technicianId: technicianData.id,
            technicianName: technicianData.fullName,
            technicianPhone: technicianData.phone || '067123456',
            partName: existingOrder.partName,
            estimatedDate: '3-5 dana',
            createdBy: req.user.fullName || req.user.username
          };

          await protocolSMS.sendPartsOrderedProtocol(smsData);
        }
      } catch (smsError) {
        console.error("SMS greška pri odobrenju:", smsError);
      }

      res.json({ 
        success: true, 
        message: 'Zahtev je odobren i postavljen u admin_ordered status',
        order: updatedOrder 
      });
    } catch (error) {
      logger.error('Greška pri odobravanju pending zahteva:', error);
      res.status(500).json({ error: 'Greška pri odobravanju zahteva' });
    }
  });

  // 9a. Admin dodeljuje rezervni deo dobavljaču (Assign part to supplier)
  app.patch("/api/admin/spare-parts/:id/assign-to-supplier", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const { supplierId, notes } = req.body;

      if (!supplierId) {
        return res.status(400).json({ error: "ID dobavljača je obavezan" });
      }

      // Proveri da li order postoji
      const existingOrder = await storage.getSparePartOrder(orderId);
      if (!existingOrder) {
        return res.status(404).json({ error: "Porudžbina rezervnog dela nije pronađena" });
      }

      // Proveri da li dobavljač postoji
      const supplier = await storage.getSupplier(supplierId);
      if (!supplier) {
        return res.status(400).json({ error: "Nevažeći dobavljač" });
      }

      // Ažuriraj order - dodeli dobavljaču
      const updatedOrder = await storage.updateSparePartOrderStatus(orderId, {
        status: 'assigned_to_supplier' as any,
        assignedToSupplierId: supplierId,
        assignedAt: new Date(),
        assignedBy: req.user!.id,
        adminNotes: notes 
          ? `${existingOrder.adminNotes || ''}\n\nDodeljen dobavljaču ${supplier.name} (${supplier.contactPerson || 'N/A'}): ${notes}`
          : `${existingOrder.adminNotes || ''}\n\nDodeljen dobavljaču ${supplier.name} (${supplier.contactPerson || 'N/A'}) - ${new Date().toLocaleString('sr-RS')}`
      });

      // Pošalji email notifikaciju dobavljaču
      try {
        if (supplier.email) {
          await emailService.sendEmail({
            to: supplier.email,
            subject: `Dodeljen rezervni deo - ${existingOrder.partName}`,
            html: `
              <h2>Poštovani ${supplier.contactPerson || supplier.name},</h2>
              <p>Dodeljen vam je rezervni deo za obradu:</p>
              <ul>
                <li><strong>Naziv dela:</strong> ${existingOrder.partName}</li>
                <li><strong>Kataloški broj:</strong> ${existingOrder.partNumber || 'N/A'}</li>
                <li><strong>Količina:</strong> ${existingOrder.quantity}</li>
                <li><strong>Opis:</strong> ${existingOrder.description || 'N/A'}</li>
                ${notes ? `<li><strong>Napomena:</strong> ${notes}</li>` : ''}
              </ul>
              <p>Molimo vas da kontaktirate naš tim za dalje detalje.</p>
              <p>Srdačan pozdrav,<br>Frigo Sistem Todosijević</p>
            `
          });
        }
      } catch (emailError) {
        logger.error("Greška pri slanju email-a dobavljaču:", emailError);
      }

      res.json({
        success: true,
        message: `Rezervni deo je uspešno dodeljen dobavljaču ${supplier.name}`,
        order: updatedOrder
      });
    } catch (error) {
      logger.error("Greška pri dodeljivanju dela dobavljaču:", error);
      res.status(500).json({ error: "Greška pri dodeljivanju rezervnog dela" });
    }
  });

  // 9b. Admin dodeljuje rezervni deo poslovnom partneru (Assign part to business partner) - STARI ENDPOINT
  app.patch("/api/admin/spare-parts/:id/assign-to-partner", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const { partnerId, notes } = req.body;

      if (!partnerId) {
        return res.status(400).json({ error: "ID poslovnog partnera je obavezan" });
      }

      // Proveri da li order postoji
      const existingOrder = await storage.getSparePartOrder(orderId);
      if (!existingOrder) {
        return res.status(404).json({ error: "Porudžbina rezervnog dela nije pronađena" });
      }

      // Proveri da li poslovni partner postoji
      const partner = await storage.getUser(partnerId);
      if (!partner || (partner.role !== 'business_partner' && partner.role !== 'business')) {
        return res.status(400).json({ error: "Nevažeći poslovni partner" });
      }

      // Ažuriraj order - dodeli poslovnom partneru
      const updatedOrder = await storage.updateSparePartOrderStatus(orderId, {
        status: 'assigned_to_partner' as any,
        assignedToPartnerId: partnerId,
        assignedAt: new Date(),
        assignedBy: req.user!.id,
        adminNotes: notes 
          ? `${existingOrder.adminNotes || ''}\n\nDodeljen partneru ${partner.fullName} (${partner.companyName || 'N/A'}): ${notes}`
          : `${existingOrder.adminNotes || ''}\n\nDodeljen partneru ${partner.fullName} (${partner.companyName || 'N/A'}) - ${new Date().toLocaleString('sr-RS')}`
      });

      // Pošalji email notifikaciju poslovnom partneru
      try {
        if (partner.email) {
          await emailService.sendEmail({
            to: partner.email,
            subject: `Dodeljen rezervni deo - ${existingOrder.partName}`,
            html: `
              <h2>Poštovani ${partner.fullName},</h2>
              <p>Dodeljen vam je rezervni deo za obradu:</p>
              <ul>
                <li><strong>Naziv dela:</strong> ${existingOrder.partName}</li>
                <li><strong>Kataloški broj:</strong> ${existingOrder.partNumber || 'N/A'}</li>
                <li><strong>Količina:</strong> ${existingOrder.quantity}</li>
                <li><strong>Opis:</strong> ${existingOrder.description || 'N/A'}</li>
                ${notes ? `<li><strong>Napomena:</strong> ${notes}</li>` : ''}
              </ul>
              <p>Molimo vas da se prijavite u sistem kako biste videli detalje i nastavili sa obradom.</p>
              <p>Srdačan pozdrav,<br>Frigo Sistem Todosijević</p>
            `
          });
        }
      } catch (emailError) {
        logger.error("Greška pri slanju email-a partneru:", emailError);
      }

      res.json({
        success: true,
        message: `Rezervni deo je uspešno dodeljen poslovnom partneru ${partner.fullName}`,
        order: updatedOrder
      });
    } catch (error) {
      logger.error("Greška pri dodeljivanju dela poslovnom partneru:", error);
      res.status(500).json({ error: "Greška pri dodeljivanju rezervnog dela" });
    }
  });

  // 10. Dohvati rezervne delove po statusu (Get parts by status)
  app.get("/api/admin/spare-parts/status/:status", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const status = req.params.status;
      const orders = await storage.getSparePartOrdersByStatus(status);
      
      res.json(orders);
    } catch (error) {
      logger.error("Greška pri dohvatanju po statusu:", error);
      res.status(500).json({ error: "Greška pri dohvatanju rezervnih delova po statusu" });
    }
  });

  // 10. PUT endpoint za ažuriranje spare parts order-a (Update spare part)
  app.put("/api/admin/spare-parts/:id", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      
      // Proverava da li order postoji
      const existingOrder = await storage.getSparePartOrder(orderId);
      if (!existingOrder) {
        return res.status(404).json({ error: "Porudžbina rezervnog dela nije pronađena" });
      }

      // Ažuriraj order sa prosleđenim podacima
      const updates = req.body;
      
      // Convert date strings to Date objects for Drizzle ORM
      if (updates.expectedDelivery && typeof updates.expectedDelivery === 'string') {
        updates.expectedDelivery = new Date(updates.expectedDelivery);
      }
      if (updates.receivedDate && typeof updates.receivedDate === 'string') {
        updates.receivedDate = new Date(updates.receivedDate);
      }
      if (updates.orderDate && typeof updates.orderDate === 'string') {
        updates.orderDate = new Date(updates.orderDate);
      }
      if (updates.deliveryConfirmedAt && typeof updates.deliveryConfirmedAt === 'string') {
        updates.deliveryConfirmedAt = new Date(updates.deliveryConfirmedAt);
      }
      if (updates.removedFromOrderingAt && typeof updates.removedFromOrderingAt === 'string') {
        updates.removedFromOrderingAt = new Date(updates.removedFromOrderingAt);
      }
      
      const updatedOrder = await storage.updateSparePartOrderStatus(orderId, updates);
      
      res.json({ 
        success: true, 
        message: "Porudžbina rezervnog dela je uspešno ažurirana",
        order: updatedOrder
      });
    } catch (error) {
      logger.error(`Greška pri ažuriranju spare parts order-a:`, error);
      res.status(500).json({ error: "Greška pri ažuriranju porudžbine rezervnog dela" });
    }
  });

  // 11. DELETE endpoint za brisanje spare parts order-a (Delete spare part)
  app.delete("/api/admin/spare-parts/:id", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      
      // Proverava da li order postoji
      const existingOrder = await storage.getSparePartOrder(orderId);
      if (!existingOrder) {
        return res.status(404).json({ error: "Porudžbina rezervnog dela nije pronađena" });
      }

      // Brisanje order-a
      const result = await storage.deleteSparePartOrder(orderId);
      
      if (result) {
        res.json({ 
          success: true, 
          message: "Porudžbina rezervnog dela je uspešno obrisana" 
        });
      } else {
        res.status(500).json({ error: "Greška pri brisanju porudžbine" });
      }
    } catch (error) {
      logger.error(`Greška pri brisanju spare parts order-a:`, error);
      res.status(500).json({ error: "Greška pri brisanju porudžbine rezervnog dela" });
    }
  });

  // ===== MOBILE/GENERAL OPERATIONS =====

  // 12. Endpoint koji poziva mobilni interface za rezervne delove (Mobile interface creates order)
  app.post("/api/spare-parts/order", async (req, res) => {
    try {
      const orderData = {
        ...req.body,
        status: "pending",
        requesterType: "mobile"
      };

      const order = await storage.createSparePartOrder(orderData);
      
      res.json({ 
        success: true, 
        message: "Porudžbina rezervnog dela je uspešno kreirana", 
        order 
      });
    } catch (error) {
      logger.error("Greška pri kreiranju porudžbine:", error);
      res.status(500).json({ error: "Greška pri kreiranju porudžbine rezervnog dela" });
    }
  });

  // 13. Mobilni interface zahteva rezervne delove za servis (Request parts for service)
  app.post("/api/services/:serviceId/spare-parts", jwtAuth, async (req, res) => {
    try {
      if (req.user?.role !== 'technician' && req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Samo serviseri mogu da zahtevaju rezervne delove" });
      }

      const serviceId = parseInt(req.params.serviceId);
      
      // Pripremi podatke koristeći isti format kao postojeći sistem
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

  // ===== NEW INTEGRATED ADMIN ORDERING WITH SUPPLIER ASSIGNMENT =====

  /**
   * Admin kreira porudžbinu sa automatskim dodeljivanjem suplajera
   * Ovo je novi sistem koji povezuje admin ordering sa supplier portalom
   */
  app.post("/api/admin/spare-parts/order-with-supplier", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const {
        serviceId,
        partName,
        partNumber,
        quantity,
        description,
        urgency,
        warrantyStatus,
        brand,
        brandName, // Podržava i brandName (frontend šalje brandName)
        deviceModel,
        applianceCategory
      } = req.body;
      
      // Koristi brandName ako je poslat, inače brand (backward compatibility)
      const effectiveBrand = brandName || brand;

      logger.info("[ADMIN ORDER] Creating spare part order with automatic supplier assignment");

      // 1. Kreiraj spare_part_order
      const sparePartOrderData = {
        serviceId: serviceId || null,
        partName,
        partNumber: partNumber || null,
        quantity: quantity || 1,
        description: description || null,
        urgency: urgency || 'normal',
        warrantyStatus: warrantyStatus || 'van garancije',
        status: 'ordered',
        requesterType: 'admin',
        requesterUserId: req.user!.id,
        requesterName: req.user!.fullName || req.user!.username,
        orderDate: new Date()
      };

      const sparePartOrder = await storage.createSparePartOrder(sparePartOrderData);
      logger.info(`[ADMIN ORDER] Created spare_part_order #${sparePartOrder.id}`);

      // 2. Automatski dodeli suplajera
      const assignmentResult = await supplierAssignmentService.assignSupplierToOrder({
        sparePartOrderId: sparePartOrder.id,
        brandName: effectiveBrand,
        manufacturerName: effectiveBrand,
        partName,
        partNumber,
        quantity: quantity || 1,
        urgency: urgency || 'normal',
        warrantyStatus: warrantyStatus || 'van garancije',
        description,
        serviceId: serviceId || undefined
      });

      if (!assignmentResult.success) {
        logger.warn(`[ADMIN ORDER] Supplier assignment failed: ${assignmentResult.message}`);
        // Nastavi dalje bez suplajera - admin može kasnije ručno dodeliti
      } else {
        logger.info(`[ADMIN ORDER] Assigned to supplier: ${assignmentResult.supplier?.name}`);
        
        // 3. Ažuriraj spare_part_order sa supplier informacijama
        await supplierAssignmentService.updateSparePartOrderWithSupplier(
          sparePartOrder.id,
          assignmentResult.supplier!.name
        );
      }

      res.json({
        success: true,
        message: assignmentResult.success 
          ? `Porudžbina kreirana i dodeljena dobavljaču ${assignmentResult.supplier?.name}`
          : 'Porudžbina kreirana, ali dobavljač nije automatski dodeljen',
        sparePartOrder,
        supplierOrder: assignmentResult.supplierOrder,
        supplier: assignmentResult.supplier
      });

    } catch (error) {
      logger.error("[ADMIN ORDER] Error creating order with supplier:", error);
      res.status(500).json({ 
        error: "Greška pri kreiranju porudžbine", 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  /**
   * GET endpoint za dohvatanje enriched spare part orders sa supplier informacijama
   */
  app.get("/api/admin/spare-parts-with-suppliers", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      // Dohvati sve spare part orders
      const sparePartOrders = await storage.getAllSparePartOrders();
      
      // Enrichuj sa supplier informacijama
      const enrichedOrders = await Promise.all(
        sparePartOrders.map(async (order) => {
          // Dohvati supplier orders za ovaj spare part order
          const supplierOrders = await storage.getSupplierOrdersBySparePartOrder(order.id);
          
          // Dohvati supplier detalje ako postoji supplier order
          let supplierDetails = null;
          if (supplierOrders.length > 0) {
            const latestSupplierOrder = supplierOrders[0];
            supplierDetails = await storage.getSupplier(latestSupplierOrder.supplierId);
          }

          return {
            ...order,
            supplierOrders,
            supplierDetails,
            hasSupplierAssigned: supplierOrders.length > 0,
            latestSupplierStatus: supplierOrders.length > 0 ? supplierOrders[0].status : null
          };
        })
      );

      res.json(enrichedOrders);
    } catch (error) {
      logger.error("[ADMIN] Error fetching spare parts with suppliers:", error);
      res.status(500).json({ error: "Greška pri dohvatanju porudžbina" });
    }
  });

  // ===== BUSINESS PARTNER ENDPOINTS =====

  /**
   * GET endpoint za poslovne partnere da vide svoje dodeljene rezervne delove
   */
  app.get("/api/business/spare-parts/assigned", jwtAuth, async (req, res) => {
    try {
      if (!req.user || (req.user.role !== 'business_partner' && req.user.role !== 'business' && req.user.role !== 'admin')) {
        return res.status(403).json({ error: "Samo poslovni partneri mogu pristupiti ovim podacima" });
      }

      const partnerId = req.user.id;
      
      // Dohvati sve delove dodeljene ovom partneru
      const assignedParts = await storage.getSparePartOrdersByAssignedPartner(partnerId);
      
      res.json({
        success: true,
        parts: assignedParts,
        meta: {
          count: assignedParts.length,
          partnerId,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error("Greška pri dohvatanju dodeljenih delova za partnera:", error);
      res.status(500).json({ error: "Greška pri dohvatanju dodeljenih rezervnih delova" });
    }
  });

  /**
   * PATCH endpoint za poslovne partnere da ažuriraju status dodeljenog dela
   */
  app.patch("/api/business/spare-parts/:id/update-status", jwtAuth, async (req, res) => {
    try {
      if (!req.user || (req.user.role !== 'business_partner' && req.user.role !== 'business')) {
        return res.status(403).json({ error: "Samo poslovni partneri mogu ažurirati status" });
      }

      const orderId = parseInt(req.params.id);
      const { status, notes } = req.body;

      // Proveri da li order postoji i da li je dodeljen ovom partneru
      const existingOrder = await storage.getSparePartOrder(orderId);
      if (!existingOrder) {
        return res.status(404).json({ error: "Porudžbina rezervnog dela nije pronađena" });
      }

      if (existingOrder.assignedToPartnerId !== req.user.id) {
        return res.status(403).json({ error: "Nemate pristup ovom rezervnom delu" });
      }

      // Ažuriraj status
      const updatedOrder = await storage.updateSparePartOrderStatus(orderId, {
        status: status || 'partner_processing',
        adminNotes: notes 
          ? `${existingOrder.adminNotes || ''}\n\n[${req.user.fullName}]: ${notes} - ${new Date().toLocaleString('sr-RS')}`
          : existingOrder.adminNotes
      });

      res.json({
        success: true,
        message: "Status rezervnog dela je uspešno ažuriran",
        order: updatedOrder
      });
    } catch (error) {
      logger.error("Greška pri ažuriranju statusa od strane partnera:", error);
      res.status(500).json({ error: "Greška pri ažuriranju statusa rezervnog dela" });
    }
  });

  console.log("✅ Spare Parts routes registered (with supplier integration & business partner features)");
}
