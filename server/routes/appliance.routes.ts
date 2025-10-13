import type { Express } from "express";
import { storage } from "../storage";
import { insertApplianceCategorySchema, insertManufacturerSchema, insertApplianceSchema } from "@shared/schema";
import { z } from "zod";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";

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
 * Appliance Routes
 * - Appliances CRUD
 * - Categories CRUD
 * - Manufacturers CRUD
 */
export function registerApplianceRoutes(app: Express) {
  // Appliance Categories routes
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getAllApplianceCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Greška pri dobijanju kategorija" });
    }
  });
  
  // Novi API endpoint za kategorije uređaja - posebno za dijagnostiku
  app.get("/api/appliance-categories", async (req, res) => {
    try {
      const categories = await storage.getAllApplianceCategories();
      res.json(categories || []);
    } catch (error) {
      console.error('Greška pri dobijanju kategorija uređaja:', error);
      res.status(500).json({ error: "Greška pri dobijanju kategorija uređaja", details: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      // Koristimo safeParse za detaljniju kontrolu validacije
      const validationResult = insertApplianceCategorySchema.safeParse(req.body);
      
      // Ako podaci nisu validni, vrati detaljnu poruku o grešci
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Nevažeći podaci kategorije", 
          details: validationResult.error.format(),
          message: "Svi podaci o kategoriji moraju biti pravilno uneti. Naziv i ikona su obavezni."
        });
      }
      
      const validatedData = validationResult.data;
      
      // Dodatna provera: provera da li već postoji kategorija sa istim imenom
      try {
        // Dohvati sve kategorije
        const categories = await storage.getAllApplianceCategories();
        
        // Proveri da li postoji kategorija sa istim imenom (neosjetljivo na velika/mala slova)
        const existingCategory = categories.find(
          (cat) => cat.name.toLowerCase() === validatedData.name.toLowerCase()
        );
        
        if (existingCategory) {
          return res.status(400).json({
            error: "Kategorija već postoji",
            message: `Kategorija sa nazivom '${validatedData.name}' već postoji u bazi podataka.`
          });
        }
      } catch (categoryCheckError) {
        console.error("Greška pri proveri duplikata kategorije:", categoryCheckError);
        // Ne prekidamo izvršenje u slučaju neuspele provere
      }
      
      // Ako su svi uslovi ispunjeni, kreiramo kategoriju
      const category = await storage.createApplianceCategory(validatedData);
      
      // Vrati uspešan odgovor
      res.status(201).json({
        success: true,
        message: "Kategorija uređaja je uspešno kreirana",
        data: category
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Nevažeći podaci kategorije", details: error.format() });
      }
      console.error("Greška pri kreiranju kategorije:", error);
      res.status(500).json({ error: "Greška pri kreiranju kategorije", message: error instanceof Error ? error.message : String(error) });
    }
  });

  // Manufacturers routes
  app.get("/api/manufacturers", async (req, res) => {
    try {
      const manufacturers = await storage.getAllManufacturers();
      res.json(manufacturers);
    } catch (error) {
      res.status(500).json({ error: "Greška pri dobijanju proizvođača" });
    }
  });

  app.post("/api/manufacturers", async (req, res) => {
    try {
      // Koristimo safeParse za detaljniju kontrolu validacije
      const validationResult = insertManufacturerSchema.safeParse(req.body);
      
      // Ako podaci nisu validni, vrati detaljnu poruku o grešci
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Nevažeći podaci proizvođača", 
          details: validationResult.error.format(),
          message: "Naziv proizvođača mora biti pravilno unet i imati između 2 i 100 karaktera."
        });
      }
      
      const validatedData = validationResult.data;
      
      // Dodatna provera: provera da li već postoji proizvođač sa istim imenom
      try {
        // Dohvati sve proizvođače
        const manufacturers = await storage.getAllManufacturers();
        
        // Proveri da li postoji proizvođač sa istim imenom (neosjetljivo na velika/mala slova)
        const existingManufacturer = manufacturers.find(
          (m) => m.name.toLowerCase() === validatedData.name.toLowerCase()
        );
        
        if (existingManufacturer) {
          return res.status(400).json({
            error: "Proizvođač već postoji",
            message: `Proizvođač sa nazivom '${validatedData.name}' već postoji u bazi podataka.`
          });
        }
      } catch (manufacturerCheckError) {
        console.error("Greška pri proveri duplikata proizvođača:", manufacturerCheckError);
        // Ne prekidamo izvršenje u slučaju neuspele provere
      }
      
      // Ako su svi uslovi ispunjeni, kreiramo proizvođača
      const manufacturer = await storage.createManufacturer(validatedData);
      
      // Vrati uspešan odgovor
      res.status(201).json({
        success: true,
        message: "Proizvođač je uspešno kreiran",
        data: manufacturer
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Nevažeći podaci proizvođača", details: error.format() });
      }
      console.error("Greška pri kreiranju proizvođača:", error);
      res.status(500).json({ error: "Greška pri kreiranju proizvođača", message: error instanceof Error ? error.message : String(error) });
    }
  });

  // Appliances routes
  app.get("/api/appliances", async (req, res) => {
    try {
      const appliances = await storage.getAllAppliances();
      res.json(appliances);
    } catch (error) {
      res.status(500).json({ error: "Greška pri dobijanju uređaja" });
    }
  });

  app.get("/api/appliances/:id", async (req, res) => {
    try {
      const appliance = await storage.getAppliance(parseInt(req.params.id));
      if (!appliance) return res.status(404).json({ error: "Uređaj nije pronađen" });
      res.json(appliance);
    } catch (error) {
      res.status(500).json({ error: "Greška pri dobijanju uređaja" });
    }
  });

  app.get("/api/clients/:clientId/appliances", async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      
      // Directly query database with JOIN to get category and manufacturer data
      const appliances = await db.select({
        id: schema.appliances.id,
        clientId: schema.appliances.clientId,
        model: schema.appliances.model,
        serialNumber: schema.appliances.serialNumber,
        purchaseDate: schema.appliances.purchaseDate,
        notes: schema.appliances.notes,
        category: {
          id: schema.applianceCategories.id,
          name: schema.applianceCategories.name,
          icon: schema.applianceCategories.icon,
        },
        manufacturer: {
          id: schema.manufacturers.id,
          name: schema.manufacturers.name,
        },
      })
      .from(schema.appliances)
      .leftJoin(schema.applianceCategories, eq(schema.appliances.categoryId, schema.applianceCategories.id))
      .leftJoin(schema.manufacturers, eq(schema.appliances.manufacturerId, schema.manufacturers.id))
      .where(eq(schema.appliances.clientId, clientId));
      
      res.json(appliances);
    } catch (error) {
      console.error("Error fetching client appliances:", error);
      res.status(500).json({ error: "Greška pri dobijanju uređaja klijenta" });
    }
  });

  app.post("/api/appliances", async (req, res) => {
    try {
      // Koristimo safeParse umesto parse za detaljniju kontrolu grešaka
      const validationResult = insertApplianceSchema.safeParse(req.body);
      
      // Ako podaci nisu validni, vrati detaljnu poruku o grešci
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Nevažeći podaci uređaja", 
          details: validationResult.error.format(),
          message: "Svi obavezni podaci o uređaju moraju biti pravilno uneti."
        });
      }
      
      const validatedData = validationResult.data;
      
      // Dodatna provera validnosti klijenta
      try {
        const client = await storage.getClient(validatedData.clientId);
        if (!client) {
          return res.status(400).json({
            error: "Klijent ne postoji",
            message: "Izabrani klijent nije pronađen u bazi podataka."
          });
        }
      } catch (clientError) {
        return res.status(400).json({
          error: "Greška pri proveri klijenta",
          message: "Nije moguće proveriti postojanje klijenta."
        });
      }
      
      // Dodatna provera validnosti kategorije
      try {
        const category = await storage.getApplianceCategory(validatedData.categoryId);
        if (!category) {
          return res.status(400).json({
            error: "Kategorija ne postoji",
            message: "Izabrana kategorija uređaja nije pronađena u bazi podataka."
          });
        }
      } catch (categoryError) {
        return res.status(400).json({
          error: "Greška pri proveri kategorije",
          message: "Nije moguće proveriti postojanje kategorije uređaja."
        });
      }
      
      // Dodatna provera validnosti proizvođača
      try {
        const manufacturer = await storage.getManufacturer(validatedData.manufacturerId);
        if (!manufacturer) {
          return res.status(400).json({
            error: "Proizvođač ne postoji",
            message: "Izabrani proizvođač nije pronađen u bazi podataka."
          });
        }
      } catch (manufacturerError) {
        return res.status(400).json({
          error: "Greška pri proveri proizvođača",
          message: "Nije moguće proveriti postojanje proizvođača."
        });
      }
      
      // Ako je serijski broj unet, proveri da li već postoji uređaj sa istim serijskim brojem
      if (validatedData.serialNumber) {
        try {
          const existingAppliance = await storage.getApplianceBySerialNumber(validatedData.serialNumber);
          if (existingAppliance) {
            return res.status(400).json({
              error: "Serijski broj već postoji",
              message: "Uređaj sa ovim serijskim brojem već postoji u bazi podataka."
            });
          }
        } catch (serialCheckError) {
          // Samo logujemo ali ne prekidamo izvršenje
          console.warn("Nije moguće proveriti postojanje serijskog broja:", serialCheckError);
        }
      }
      
      // Ako su svi uslovi ispunjeni, kreiramo uređaj
      const appliance = await storage.createAppliance(validatedData);
      
      // Vrati uspešan odgovor
      res.status(201).json({
        success: true,
        message: "Uređaj je uspešno kreiran",
        data: appliance
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Nevažeći podaci uređaja", details: error.format() });
      }
      console.error("Greška pri kreiranju uređaja:", error);
      res.status(500).json({ error: "Greška pri kreiranju uređaja", message: error instanceof Error ? error.message : String(error) });
    }
  });

  app.put("/api/appliances/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Proverimo prvo da li uređaj postoji
      const existingAppliance = await storage.getAppliance(id);
      if (!existingAppliance) {
        return res.status(404).json({ error: "Uređaj nije pronađen", message: "Uređaj sa traženim ID-om ne postoji u bazi podataka." });
      }
      
      // Koristimo safeParse za detaljniju kontrolu validacije
      const validationResult = insertApplianceSchema.safeParse(req.body);
      
      // Ako podaci nisu validni, vrati detaljnu poruku o grešci
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Nevažeći podaci uređaja", 
          details: validationResult.error.format(),
          message: "Svi obavezni podaci o uređaju moraju biti pravilno uneti."
        });
      }
      
      const validatedData = validationResult.data;
      
      // Dodatna provera validnosti klijenta
      try {
        const client = await storage.getClient(validatedData.clientId);
        if (!client) {
          return res.status(400).json({
            error: "Klijent ne postoji",
            message: "Izabrani klijent nije pronađen u bazi podataka."
          });
        }
      } catch (clientError) {
        console.error("Greška pri proveri klijenta:", clientError);
        return res.status(400).json({
          error: "Greška pri proveri klijenta",
          message: "Nije moguće proveriti postojanje klijenta."
        });
      }
      
      // Dodatna provera validnosti kategorije
      try {
        const category = await storage.getApplianceCategory(validatedData.categoryId);
        if (!category) {
          return res.status(400).json({
            error: "Kategorija ne postoji",
            message: "Izabrana kategorija uređaja nije pronađena u bazi podataka."
          });
        }
      } catch (categoryError) {
        console.error("Greška pri proveri kategorije:", categoryError);
        return res.status(400).json({
          error: "Greška pri proveri kategorije",
          message: "Nije moguće proveriti postojanje kategorije uređaja."
        });
      }
      
      // Dodatna provera validnosti proizvođača
      try {
        const manufacturer = await storage.getManufacturer(validatedData.manufacturerId);
        if (!manufacturer) {
          return res.status(400).json({
            error: "Proizvođač ne postoji",
            message: "Izabrani proizvođač nije pronađen u bazi podataka."
          });
        }
      } catch (manufacturerError) {
        console.error("Greška pri proveri proizvođača:", manufacturerError);
        return res.status(400).json({
          error: "Greška pri proveri proizvođača",
          message: "Nije moguće proveriti postojanje proizvođača."
        });
      }
      
      // Ako je serijski broj promenjen, proveri da li već postoji uređaj sa istim serijskim brojem
      if (validatedData.serialNumber && validatedData.serialNumber !== existingAppliance.serialNumber) {
        try {
          const existingApplianceWithSn = await storage.getApplianceBySerialNumber(validatedData.serialNumber);
          if (existingApplianceWithSn && existingApplianceWithSn.id !== id) {
            return res.status(400).json({
              error: "Serijski broj već postoji",
              message: "Uređaj sa ovim serijskim brojem već postoji u bazi podataka."
            });
          }
        } catch (serialCheckError) {
          // Samo logujemo ali ne prekidamo izvršenje
          console.warn("Nije moguće proveriti postojanje serijskog broja:", serialCheckError);
        }
      }
      
      // Ako su svi uslovi ispunjeni, ažuriramo uređaj
      const updatedAppliance = await storage.updateAppliance(id, validatedData);
      
      // Vrati uspešan odgovor
      res.status(200).json({
        success: true,
        message: "Uređaj je uspešno ažuriran",
        data: updatedAppliance
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Nevažeći podaci uređaja", details: error.format() });
      }
      console.error("Greška pri ažuriranju uređaja:", error);
      res.status(500).json({ error: "Greška pri ažuriranju uređaja", message: error instanceof Error ? error.message : String(error) });
    }
  });

  // Delete appliance endpoint
  app.delete("/api/appliances/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || (req.user?.role !== "admin" && req.user?.role !== "technician")) {
        return res.status(403).json({ error: "Nemate dozvolu za brisanje uređaja" });
      }

      const applianceId = parseInt(req.params.id);
      if (isNaN(applianceId)) {
        return res.status(400).json({ error: "Neispravan ID uređaja" });
      }

      // Check if appliance exists
      const existingAppliance = await storage.getAppliance(applianceId);
      if (!existingAppliance) {
        return res.status(404).json({ error: "Uređaj nije pronađen" });
      }

      // Check if appliance has any services
      const services = await storage.getServicesByAppliance(applianceId);
      if (services.length > 0) {
        return res.status(400).json({ 
          error: "Uređaj ima aktivne servise", 
          message: "Prvo obriši sve servise povezane sa ovim uređajem" 
        });
      }

      // Delete appliance
      await storage.deleteAppliance(applianceId);

      res.json({ 
        success: true, 
        message: "Uređaj je uspešno obrisan"
      });
    } catch (error) {
      console.error("Greška pri brisanju uređaja:", error);
      res.status(500).json({ error: "Greška pri brisanju uređaja" });
    }
  });

  console.log("✅ Appliance routes registered");
}
