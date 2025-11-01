import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { jwtAuth, requireRole } from "../jwt-auth";
import QRCode from "qrcode";
import { promises as fs } from "fs";
import path from "path";
import { db } from "../db";
import { desc, eq } from "drizzle-orm";
import { emailService } from "../email-service";
import multer from "multer";

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

// Download statistics interface
interface DownloadHistoryEntry {
  timestamp: string;
  device: 'android' | 'ios' | 'desktop' | 'unknown';
  userAgent: string;
  ip: string;
}

interface DownloadStats {
  total: number;
  byDevice: {
    android: number;
    ios: number;
    desktop: number;
    unknown: number;
  };
  history: DownloadHistoryEntry[];
}

// In-memory statistics tracking
const downloadStats: DownloadStats = {
  total: 0,
  byDevice: {
    android: 0,
    ios: 0,
    desktop: 0,
    unknown: 0
  },
  history: []
};

// Device detection helper
function detectDevice(userAgent: string): 'android' | 'ios' | 'desktop' | 'unknown' {
  const ua = userAgent.toLowerCase();
  if (ua.includes('android')) return 'android';
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) return 'ios';
  if (ua.includes('windows') || ua.includes('macintosh') || ua.includes('linux')) return 'desktop';
  return 'unknown';
}

// 🔒 SECURITY: User-Agent sanitization funkcija - uklanja potencijalno maliciozne karaktere
function sanitizeUserAgent(userAgent: string | undefined): string {
  if (!userAgent) return 'unknown';
  
  // Uklanjamo HTML tagove, script tagove i opasne karaktere
  return userAgent
    .replace(/[<>\"']/g, '') // Ukloni HTML/script karaktere
    .replace(/[{}[\]]/g, '') // Ukloni zagrade koje mogu biti problematične
    .substring(0, 200); // Limit na 200 karaktera za sigurnost
}

// Rate limiting for QR generation (per IP)
const qrRateLimit = new Map<string, { count: number; resetTime: number }>();

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }
    // Max URL length 2KB to prevent abuse
    if (url.length > 2048) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function checkQRRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = qrRateLimit.get(ip);
  
  if (!limit || now > limit.resetTime) {
    // Reset every 5 minutes, allow 10 requests per window
    qrRateLimit.set(ip, { count: 1, resetTime: now + 300000 });
    return true;
  }
  
  if (limit.count >= 10) {
    return false;
  }
  
  limit.count++;
  return true;
}

// Service photo access check helper
async function checkServicePhotoAccess(userId: number, userRole: string, serviceId: number, technicianId?: number | null) {
  try {
    const service = await storage.getService(serviceId);
    console.log(`🔒 [PHOTO ACCESS] userId=${userId}, userRole=${userRole}, technicianId=${technicianId}, serviceId=${serviceId}, service=${!!service}`);
    
    if (!service) {
      console.log(`🔒 [PHOTO ACCESS] Service not found`);
      return { hasAccess: false };
    }

    // Admin has full access
    if (userRole === 'admin') {
      console.log(`🔒 [PHOTO ACCESS] Admin access granted`);
      return { hasAccess: true, service };
    }

    // Assigned technician has access
    if (userRole === 'technician' && technicianId && service.technicianId === technicianId) {
      console.log(`🔒 [PHOTO ACCESS] Technician access granted (technicianId=${technicianId})`);
      return { hasAccess: true, service };
    }

    // Business partner has access to their services
    if (userRole === 'business_partner' && service.businessPartnerId === userId) {
      return { hasAccess: true, service };
    }

    // Client owner has access to their own service
    if ((userRole === 'customer' || userRole === 'client') && service.clientId === userId) {
      return { hasAccess: true, service };
    }

    console.log(`🔒 [PHOTO ACCESS] Access denied`);
    return { hasAccess: false, service };
  } catch (error) {
    console.error("Error checking service photo access:", error);
    return { hasAccess: false };
  }
}

/**
 * Miscellaneous Routes
 * - Global Search
 * - Health Checks
 * - Dashboard Stats
 * - APK Downloads & QR codes
 * - Analytics (web-vitals)
 * - Service Photos
 * - Data Deletion Requests (GDPR)
 * - Security & Compliance
 * - Reviewer Endpoints (Facebook App Review)
 */
export function registerMiscRoutes(app: Express) {
  
  // ===== GLOBAL SEARCH ENDPOINT =====
  app.get("/api/search", jwtAuth, async (req, res) => {
    try {
      const query = req.query.q as string;
      
      logger.debug(`🔍 [SEARCH DEBUG] Received query: "${query}", length: ${query?.length || 0}`);
      
      if (!query || query.length < 2) {
        logger.debug(`🔍 [SEARCH DEBUG] Query too short, returning empty array`);
        return res.json([]);
      }

      const results: any[] = [];

      // Search clients
      const clients = await storage.getAllClients();
      const matchingClients = clients.filter(client => 
        client.fullName.toLowerCase().includes(query.toLowerCase()) ||
        client.phone.includes(query) ||
        (client.email && client.email.toLowerCase().includes(query.toLowerCase()))
      ).slice(0, 5);

      matchingClients.forEach(client => {
        results.push({
          id: client.id,
          type: "client",
          fullName: client.fullName,
          phone: client.phone,
          email: client.email,
          city: client.city
        });
      });

      // Search services
      const services = await storage.getAllServices();
      const matchingServices = services.filter(service => 
        service.id.toString().includes(query) ||
        service.description.toLowerCase().includes(query.toLowerCase()) ||
        (service.clientName && service.clientName.toLowerCase().includes(query.toLowerCase()))
      ).slice(0, 5);

      matchingServices.forEach(service => {
        results.push({
          id: service.id,
          type: "service",
          clientName: service.clientName,
          applianceName: service.applianceName,
          status: service.status,
          description: service.description
        });
      });

      // Search spare parts if user is admin
      if (req.user.role === "admin") {
        try {
          const spareParts = await storage.getAllSparePartOrders();
          const matchingSpareParts = spareParts.filter(part => 
            part.partName.toLowerCase().includes(query.toLowerCase()) ||
            (part.partNumber && part.partNumber.toLowerCase().includes(query.toLowerCase()))
          ).slice(0, 3);

          matchingSpareParts.forEach(part => {
            results.push({
              id: part.id,
              type: "spare-part",
              partName: part.partName,
              partNumber: part.partNumber,
              quantity: part.quantity,
              status: part.status
            });
          });
        } catch (error) {
          console.error("Greška pri pretraživanju rezervnih delova:", error);
        }
      }

      // Search technicians if user is admin
      if (req.user.role === "admin") {
        try {
          const users = await storage.getAllUsers();
          const technicians = users.filter(user => user.role === "technician");
          const matchingTechnicians = technicians.filter(tech => 
            tech.fullName.toLowerCase().includes(query.toLowerCase()) ||
            (tech.specialization && tech.specialization.toLowerCase().includes(query.toLowerCase()))
          ).slice(0, 3);

          matchingTechnicians.forEach(tech => {
            results.push({
              id: tech.id,
              type: "technician",
              fullName: tech.fullName,
              specialization: tech.specialization,
              phone: tech.phone
            });
          });
        } catch (error) {
          console.error("Greška pri pretraživanju tehničara:", error);
        }
      }

      // Limit total results
      const limitedResults = results.slice(0, 10);
      
      logger.debug(`🔍 [SEARCH] Query: "${query}" - Found ${limitedResults.length} results`);
      res.json(limitedResults);
    } catch (error) {
      logger.error("Greška pri globalnoj pretrazi:", error);
      res.status(500).json({ error: "Greška pri pretrazi" });
    }
  });

  // ===== HEALTH CHECK ENDPOINTS =====
  app.get("/health", (req, res) => {
    res.status(200).json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: "1.0.0"
    });
  });
  
  app.get("/api/health", (req, res) => {
    res.status(200).json({ 
      status: "ok", 
      api: "ready",
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  app.get('/healthz', (req, res) => {
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      service: 'Frigo Sistem Todosijevic WhatsApp Business API'
    });
  });

  // ===== DASHBOARD STATS ENDPOINT =====
  app.get("/api/stats", async (req, res) => {
    try {
      console.log("📊 Dohvatanje dashboard statistika...");
      
      const activeServices = await storage.getServicesByStatus("in_progress");
      const completedServices = await storage.getServicesByStatus("completed");
      const pendingServices = await storage.getServicesByStatus("pending");
      const clients = await storage.getAllClients();
      const applianceStats = await storage.getApplianceStats();
      const recentServices = await storage.getRecentServices(5);
      const recentClients = await storage.getRecentClients(3);

      console.log(`📊 Statistike: ${activeServices.length} aktivnih, ${completedServices.length} završenih, ${pendingServices.length} na čekanju, ${clients.length} klijenata`);

      res.json({
        activeCount: activeServices.length,
        completedCount: completedServices.length,
        pendingCount: pendingServices.length,
        clientCount: clients.length,
        recentServices,
        recentClients,
        applianceStats
      });
    } catch (error) {
      console.error("❌ Greška pri dobijanju statistike:", error);
      res.status(500).json({ error: "Greška pri dobijanju statistike" });
    }
  });

  // ===== APK DOWNLOAD ENDPOINTS =====
  app.get("/api/downloads/apk", async (req, res) => {
    try {
      const apkPath = path.join(process.cwd(), 'android/app/build/outputs/apk/release/app-release.apk');
      
      // Check if APK exists
      await fs.access(apkPath);
      
      // 🔒 SECURITY: Sanitizuj User-Agent prije korištenja
      const rawUserAgent = req.get('User-Agent') || '';
      const userAgent = sanitizeUserAgent(rawUserAgent);
      const device = detectDevice(userAgent);
      
      // Update statistics
      downloadStats.total++;
      downloadStats.byDevice[device as keyof typeof downloadStats.byDevice]++;
      downloadStats.history.push({
        timestamp: new Date().toISOString(),
        device,
        userAgent,
        ip: req.ip || 'unknown'
      });

      // Keep only last 1000 entries in history
      if (downloadStats.history.length > 1000) {
        downloadStats.history = downloadStats.history.slice(-1000);
      }

      // Set proper headers for APK download
      res.set({
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': 'attachment; filename="FrigoSistem-v2025.1.0.apk"',
        'Content-Security-Policy': 'default-src \'none\'',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });

      // Stream the APK file
      const stat = await fs.stat(apkPath);
      res.set('Content-Length', stat.size.toString());
      
      const { createReadStream } = await import('fs');
      const readStream = createReadStream(apkPath);
      readStream.pipe(res);

    } catch (error) {
      logger.error('APK Download Error:', error);
      
      if ((error as any)?.code === 'ENOENT') {
        return res.status(404).json({ 
          error: 'APK file not found',
          message: 'The APK file is not currently available. Please try again later.'
        });
      }

      res.status(500).json({ 
        error: 'Download failed',
        message: 'Unable to download APK file. Please try again later.'
      });
    }
  });

  app.get("/api/downloads/stats", (req, res) => {
    const stats = {
      total: downloadStats.total,
      byDevice: { ...downloadStats.byDevice },
      lastUpdated: new Date().toISOString(),
      recentDownloads: downloadStats.history.slice(-10).map(entry => ({
        timestamp: entry.timestamp,
        device: entry.device,
        // Don't expose full user agent and IP for privacy
        hasUserAgent: !!entry.userAgent
      }))
    };

    res.json(stats);
  });

  app.get("/api/downloads/qr", async (req, res) => {
    try {
      const { url, size = '200' } = req.query;
      const clientIP = req.ip || 'unknown';
      
      // Rate limiting check
      if (!checkQRRateLimit(clientIP)) {
        return res.status(429).json({ 
          error: 'Rate limit exceeded',
          message: 'Too many QR code requests. Please try again later.' 
        });
      }
      
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'URL parameter is required' });
      }

      // URL validation
      if (!isValidUrl(url)) {
        return res.status(400).json({ 
          error: 'Invalid URL',
          message: 'URL must be a valid http/https URL under 2KB' 
        });
      }

      // Size validation: clamp between 100-512px
      const qrSize = Math.min(512, Math.max(100, parseInt(size as string) || 200));
      
      const qrCodeDataUrl = await QRCode.toDataURL(url, {
        width: qrSize,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });

      // Return as base64 image
      res.set('Content-Type', 'image/png');
      res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      res.set('X-Content-Type-Options', 'nosniff');
      
      const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
      res.send(Buffer.from(base64Data, 'base64'));

    } catch (error) {
      logger.error('QR Code Error:', error);
      res.status(500).json({ error: 'Failed to generate QR code' });
    }
  });

  // ===== ANALYTICS ENDPOINT =====
  app.post('/api/analytics/web-vitals', (req, res) => {
    // Jednostavno prihvatamo podatke bez obrade/skladištenja za maksimalnu brzinu
    // U production okruženju ovi podaci bi se slali u analitički servis
    res.status(200).json({ success: true });
  });

  // ===== SERVICE PHOTOS ENDPOINTS =====
  app.get("/api/service-photos", jwtAuth, async (req, res) => {
    try {
      const serviceId = parseInt(req.query.serviceId as string);
      if (!serviceId || isNaN(serviceId)) {
        return res.status(400).json({ error: "Valjan serviceId je potreban" });
      }

      // Check authorization
      const accessCheck = await checkServicePhotoAccess(req.user.id, req.user.role, serviceId, req.user.technicianId);
      if (!accessCheck.hasAccess) {
        return res.status(403).json({ error: "Nemate dozvolu za pristup fotografijama ovog servisa" });
      }

      const photos = await storage.getServicePhotos(serviceId);
      res.json(photos);
    } catch (error) {
      console.error("Error fetching service photos:", error);
      res.status(500).json({ error: "Neuspešno dohvatanje fotografija servisa" });
    }
  });

  app.post("/api/service-photos", jwtAuth, async (req, res) => {
    try {
      const { ObjectStorageService } = await import("../objectStorage");
      const { insertServicePhotoSchema } = await import("@shared/schema");
      
      // Map frontend field names to backend schema
      const mappedBody = {
        ...req.body,
        // Map photoUrl to photoPath and photoCategory to category
        photoPath: req.body.photoUrl || req.body.photoPath,
        category: req.body.photoCategory || req.body.category,
        uploadedBy: req.user.id
      };

      // Remove unmapped fields to avoid validation issues
      delete mappedBody.photoUrl;
      delete mappedBody.photoCategory;

      console.log(`📸 [PHOTO UPLOAD] Original photoPath: ${mappedBody.photoPath}`);

      // Validate service ID first
      const serviceId = mappedBody.serviceId;
      if (!serviceId || isNaN(parseInt(serviceId))) {
        return res.status(400).json({ error: "Valjan serviceId je potreban" });
      }

      // Check authorization
      const accessCheck = await checkServicePhotoAccess(req.user.id, req.user.role, parseInt(serviceId), req.user.technicianId);
      if (!accessCheck.hasAccess) {
        return res.status(403).json({ error: "Nemate dozvolu za dodavanje fotografija ovom servisu" });
      }

      // 🔧 FIX: Normalizuj photoPath PRE nego što se sačuva u bazu
      if (mappedBody.photoPath && mappedBody.photoPath.startsWith("https://storage.googleapis.com/")) {
        const objectStorageService = new ObjectStorageService();
        const normalizedPath = objectStorageService.normalizeObjectEntityPath(mappedBody.photoPath);
        console.log(`📸 [PHOTO UPLOAD] Normalized photoPath: ${normalizedPath}`);
        
        // Postavi ACL policy za fotografiju
        try {
          await objectStorageService.trySetObjectEntityAclPolicy(
            mappedBody.photoPath,
            {
              owner: req.user.id.toString(),
              visibility: "private", // Privatne fotografije servisa
            },
          );
          console.log(`📸 [PHOTO UPLOAD] ACL policy set successfully`);
        } catch (aclError) {
          console.error("Error setting ACL policy:", aclError);
          // Nastavi sa normalizovanom putanjom čak i ako ACL postavljanje ne uspe
        }
        
        // Zameni punu URL sa normalizovanom putanjom
        mappedBody.photoPath = normalizedPath;
      }

      const validatedData = insertServicePhotoSchema.parse(mappedBody);

      console.log(`📸 [PHOTO UPLOAD] Saving to database with photoPath: ${validatedData.photoPath}`);

      // Kreiranje fotografije u bazi sa već normalizovanom putanjom
      const newPhoto = await storage.createServicePhoto(validatedData);

      console.log(`📸 [PHOTO UPLOAD] Photo saved successfully with ID: ${newPhoto.id}, photoPath: ${newPhoto.photoPath}`);

      res.status(201).json(newPhoto);
    } catch (error: any) {
      console.error("Error creating service photo:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Neispravni podaci", details: error.errors });
      }
      res.status(500).json({ error: "Neuspešno kreiranje fotografije servisa" });
    }
  });

  app.delete("/api/service-photos/:id", jwtAuth, async (req, res) => {
    try {
      const photoId = parseInt(req.params.id);
      if (!photoId || isNaN(photoId)) {
        return res.status(400).json({ error: "Valjan ID fotografije je potreban" });
      }

      // Get photo details before deletion for authorization and cleanup
      const photo = await storage.getServicePhoto(photoId);
      if (!photo) {
        return res.status(404).json({ error: "Fotografija nije pronađena" });
      }

      // Check authorization
      const accessCheck = await checkServicePhotoAccess(req.user.id, req.user.role, photo.serviceId, req.user.technicianId);
      if (!accessCheck.hasAccess) {
        return res.status(403).json({ error: "Nemate dozvolu za brisanje ove fotografije" });
      }

      // Delete from object storage if it's a cloud URL
      if (photo.photoPath.startsWith("https://storage.googleapis.com/")) {
        try {
          const { ObjectStorageService } = await import("../objectStorage");
          const objectStorageService = new ObjectStorageService();
          await objectStorageService.deleteObject(photo.photoPath);
          console.log(`🗑️ [PHOTOS] Deleted object from storage: ${photo.photoPath}`);
        } catch (storageError) {
          console.error("Error deleting from object storage:", storageError);
          // Continue with database deletion even if storage deletion fails
        }
      }

      // Delete from database
      await storage.deleteServicePhoto(photoId);
      console.log(`🗑️ [PHOTOS] Deleted photo record ${photoId} from database`);
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting service photo:", error);
      res.status(500).json({ error: "Neuspešno brisanje fotografije servisa" });
    }
  });

  app.get("/api/service-photos/:serviceId/category/:category", jwtAuth, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.serviceId);
      const category = req.params.category;
      
      if (!serviceId || isNaN(serviceId)) {
        return res.status(400).json({ error: "Valjan serviceId je potreban" });
      }

      // Validate category
      const validCategories = ["before", "after", "parts", "damage", "documentation", "other"];
      if (!validCategories.includes(category)) {
        return res.status(400).json({ error: "Nevalidna kategorija fotografije" });
      }

      // Check authorization
      const accessCheck = await checkServicePhotoAccess(req.user.id, req.user.role, serviceId, req.user.technicianId);
      if (!accessCheck.hasAccess) {
        return res.status(403).json({ error: "Nemate dozvolu za pristup fotografijama ovog servisa" });
      }

      const photos = await storage.getServicePhotosByCategory(serviceId, category);
      res.json(photos);
    } catch (error) {
      console.error("Error fetching service photos by category:", error);
      res.status(500).json({ error: "Neuspešno dohvatanje fotografija po kategoriji" });
    }
  });

  app.get("/api/service-photo-proxy/:id", jwtAuth, async (req, res) => {
    try {
      const photoId = parseInt(req.params.id);
      if (!photoId || isNaN(photoId)) {
        return res.status(400).json({ error: "Valjan ID fotografije je potreban" });
      }

      const photo = await storage.getServicePhoto(photoId);
      if (!photo) {
        return res.status(404).json({ error: "Fotografija nije pronađena" });
      }

      // Check authorization
      const accessCheck = await checkServicePhotoAccess(req.user.id, req.user.role, photo.serviceId, req.user.technicianId);
      if (!accessCheck.hasAccess) {
        return res.status(403).json({ error: "Nemate dozvolu za pristup ovoj fotografiji" });
      }

      logger.info(`📸 [PROXY] Serving photo ${photoId} with path: ${photo.photoPath}`);

      // Handle Object Storage paths (/objects/...)
      if (photo.photoPath.startsWith('/objects/')) {
        try {
          const { ObjectStorageService } = await import("../objectStorage");
          const objectStorageService = new ObjectStorageService();
          
          const file = await objectStorageService.getObjectEntityFile(photo.photoPath);
          await objectStorageService.downloadObject(file, res);
          
          logger.info(`📸 [PROXY] Successfully streamed photo ${photoId}`);
          return;
        } catch (storageError: any) {
          logger.error(`Error accessing Object Storage for photo ${photoId}:`, storageError);
          return res.status(404).json({ error: "Fotografija nije pronađena u Object Storage" });
        }
      }

      // Legacy paths (/uploads/...) - these files no longer exist
      if (photo.photoPath.startsWith('/uploads/')) {
        logger.warn(`📸 [PROXY] Legacy upload path detected for photo ${photoId}: ${photo.photoPath}`);
        return res.status(404).json({ 
          error: "Fotografija više nije dostupna (legacy format)",
          message: "Ova fotografija je sačuvana sa starim sistemom i nije dostupna. Molimo ponovo uploadujte."
        });
      }

      // Google Storage URLs - redirect to signed URL
      if (photo.photoPath.startsWith('https://storage.googleapis.com/')) {
        logger.info(`📸 [PROXY] Redirecting to Google Storage URL for photo ${photoId}`);
        return res.redirect(photo.photoPath);
      }

      // Unknown format
      logger.warn(`📸 [PROXY] Unknown photo path format for photo ${photoId}: ${photo.photoPath}`);
      return res.status(404).json({ error: "Nepoznat format fotografije" });

    } catch (error) {
      logger.error("Error proxying service photo:", error);
      res.status(500).json({ error: "Neuspešno dohvatanje fotografije" });
    }
  });

  // ===== DATA DELETION REQUEST ENDPOINTS - GDPR COMPLIANCE =====
  app.post("/api/data-deletion-request", async (req, res) => {
    try {
      const { insertDataDeletionRequestSchema, dataDeletionRequests } = await import("@shared/schema");
      
      const validatedData = insertDataDeletionRequestSchema.parse({
        ...req.body,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: sanitizeUserAgent(req.get('User-Agent')),
      });
      
      const [newRequest] = await db.insert(dataDeletionRequests).values(validatedData).returning();
      
      // Send notification email to admin
      try {
        await emailService.sendEmail({
          to: 'gruica@frigosistemtodosijevic.com',
          subject: '🔒 Novi zahtev za brisanje podataka - GDPR',
          html: `
            <h2>🔒 Novi zahtev za brisanje podataka</h2>
            <p><strong>Email:</strong> ${validatedData.email}</p>
            <p><strong>Ime i prezime:</strong> ${validatedData.fullName}</p>
            <p><strong>Telefon:</strong> ${validatedData.phone || 'Nije naveden'}</p>
            <p><strong>Razlog:</strong> ${validatedData.reason || 'Nije naveden'}</p>
            <p><strong>Vreme zahteva:</strong> ${new Date().toLocaleString('sr-RS')}</p>
            <p><strong>IP adresa:</strong> ${validatedData.ipAddress}</p>
            <hr>
            <p>Molimo da obradi zahtev u admin panelu aplikacije.</p>
          `
        });
      } catch (emailError) {
        console.error('Greška pri slanju email notifikacije za brisanje podataka:', emailError);
      }
      
      res.status(201).json({ 
        message: "Zahtev za brisanje podataka je uspešno poslat. Kontaktiraćemo vas u najkraćem roku.",
        requestId: newRequest.id 
      });
    } catch (error) {
      console.error('Greška pri kreiranju zahteva za brisanje podataka:', error);
      res.status(400).json({ error: "Greška pri kreiranju zahteva" });
    }
  });

  app.get("/api/admin/data-deletion-requests", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Nemate dozvolu za pristup ovim podacima" });
      }
      
      const { dataDeletionRequests } = await import("@shared/schema");
      const requests = await db.select().from(dataDeletionRequests).orderBy(desc(dataDeletionRequests.requestedAt));
      res.json(requests);
    } catch (error) {
      console.error('Greška pri preuzimanju zahteva za brisanje podataka:', error);
      res.status(500).json({ error: "Greška servera" });
    }
  });

  app.patch("/api/admin/data-deletion-requests/:id", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: "Nemate dozvolu za ovu akciju" });
      }
      
      const { dataDeletionRequests } = await import("@shared/schema");
      const { id } = req.params;
      const { status, adminNotes } = req.body;
      
      if (!['pending', 'approved', 'rejected', 'completed'].includes(status)) {
        return res.status(400).json({ error: "Nevaljan status" });
      }
      
      const [updatedRequest] = await db.update(dataDeletionRequests)
        .set({ 
          status, 
          adminNotes,
          processedAt: new Date(),
          processedBy: req.user.id 
        })
        .where(eq(dataDeletionRequests.id, parseInt(id)))
        .returning();
      
      if (!updatedRequest) {
        return res.status(404).json({ error: "Zahtev nije pronađen" });
      }
      
      res.json(updatedRequest);
    } catch (error) {
      console.error('Greška pri ažuriranju zahteva za brisanje podataka:', error);
      res.status(500).json({ error: "Greška servera" });
    }
  });

  // ===== SECURITY & COMPLIANCE ENDPOINTS =====
  app.get('/.well-known/security.txt', (req, res) => {
    res.type('text/plain');
    res.send(`Contact: info@frigosistemtodosijevic.me
Canonical: https://frigosistemtodosijevic.me/.well-known/security.txt
Preferred-Languages: sr, en
Acknowledgments: https://frigosistemtodosijevic.me/about
Policy: https://frigosistemtodosijevic.me/privacy/policy
Hiring: https://frigosistemtodosijevic.me/about
Encryption: https://keys.openpgp.org/search?q=info@frigosistemtodosijevic.me`);
  });

  // ===== REVIEWER ENDPOINTS - FOR FACEBOOK APP REVIEW =====
  app.get('/api/reviewer/credentials', (req, res) => {
    res.json({
      message: 'Test credentials for Facebook App Review',
      environment: 'Demo/Test Environment',
      access: {
        admin: {
          username: 'facebook_reviewer_admin',
          password: 'FB_Review_2025_Demo',
          role: 'Admin',
          permissions: ['view_all', 'test_whatsapp', 'view_logs']
        },
        technician: {
          username: 'facebook_reviewer_tech',
          password: 'FB_Tech_Demo_2025',
          role: 'Technician',
          permissions: ['view_services', 'test_mobile']
        },
        business_partner: {
          username: 'facebook_reviewer_partner',
          password: 'FB_Partner_Demo_2025',
          role: 'Business Partner',
          permissions: ['submit_services', 'view_status']
        }
      },
      test_urls: {
        main_app: 'https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev/',
        reviewer_demo: 'https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev/reviewer',
        privacy_policy: 'https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev/privacy-policy.html',
        data_deletion: 'https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev/data-deletion.html'
      },
      whatsapp_test: {
        phone_number: '+1 555 123 4567',
        template_names: ['service_confirmation', 'appointment_reminder', 'completion_notice'],
        webhook_url: 'https://883c0e1c-965e-403d-8bc0-39adca99d551-00-liflphmab0x.riker.replit.dev/api/webhook/whatsapp',
        verify_token: 'frigo_sistem_todosijevic_webhook_2024'
      },
      instructions: [
        '1. Visit the reviewer demo page for live WhatsApp testing',
        '2. Use test credentials above to access different user roles',
        '3. Test phone number +1 555 123 4567 is Meta approved for testing',
        '4. All data in this environment is for demonstration only',
        '5. Real business data is isolated and protected'
      ]
    });
  });

  app.post('/api/reviewer/test-whatsapp', async (req, res) => {
    try {
      const { phone, templateName, testMode } = req.body;
      
      // Simuliraj API poziv ka WhatsApp Cloud API
      const messageId = `reviewer_test_${Date.now()}`;
      const timestamp = new Date().toISOString();
      
      // Simuliraj uspešan odgovor
      const apiResponse = {
        success: true,
        messageId,
        status: 'sent',
        to: phone,
        template: templateName,
        timestamp,
        meta: {
          api_version: 'v17.0',
          business_account_id: 'demo_account',
          phone_number_id: 'demo_phone'
        }
      };
      
      // Sačekaj 1 sekund da demonstriraš API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      res.json(apiResponse);
      
    } catch (error: any) {
      logger.error('REVIEWER WhatsApp test failed:', error);
      res.status(500).json({
        success: false,
        error: 'Test WhatsApp poziv nije uspeo',
        details: error.message
      });
    }
  });

  // ===== NEW ENDPOINT: SERVICE PHOTOS UPLOAD =====
  // Multer configuration for memory storage
  const photoUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Samo slike su dozvoljene'));
      }
    }
  });

  app.post("/api/service-photos/upload", jwtAuth, photoUpload.single('photo'), async (req, res) => {
    console.log('🔥 [ENDPOINT HIT] /api/service-photos/upload endpoint called!');
    try {
      const { ObjectStorageService } = await import("../objectStorage");
      const { insertServicePhotoSchema } = await import("@shared/schema");

      console.log('🔥 [FILE CHECK] Checking if file exists...');
      if (!req.file) {
        return res.status(400).json({ error: "Fajl nije pronađen" });
      }

      const serviceId = parseInt(req.body.serviceId);
      if (!serviceId || isNaN(serviceId)) {
        return res.status(400).json({ error: "Valjan serviceId je potreban" });
      }

      // Check authorization
      const accessCheck = await checkServicePhotoAccess(req.user!.id, req.user!.role, serviceId, req.user!.technicianId);
      if (!accessCheck.hasAccess) {
        return res.status(403).json({ error: "Nemate dozvolu za dodavanje fotografija ovom servisu" });
      }

      console.log(`📸 [UPLOAD] Uploading photo for service ${serviceId}`);

      // Upload to Object Storage
      const objectStorageService = new ObjectStorageService();
      const uploadUrl = await objectStorageService.getObjectEntityUploadURL();
      
      console.log(`📸 [UPLOAD] Got signed URL: ${uploadUrl}`);

      // Upload file to signed URL
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: req.file.buffer,
        headers: {
          'Content-Type': req.file.mimetype,
        }
      });

      if (!uploadResponse.ok) {
        throw new Error(`Object Storage upload failed: ${uploadResponse.status}`);
      }

      // Extract relative object path from signed URL
      const urlParts = new URL(uploadUrl);
      const fullPathname = urlParts.pathname;
      
      // Get PRIVATE_OBJECT_DIR to extract relative path
      const privateDir = objectStorageService.getPrivateObjectDir();
      
      console.log(`📸 [PATH DEBUG] fullPathname: ${fullPathname}`);
      console.log(`📸 [PATH DEBUG] privateDir: ${privateDir}`);
      
      // Remove leading slash and extract entity ID relative to PRIVATE_OBJECT_DIR
      // Example: /bucket/.private/uploads/UUID -> uploads/UUID
      let relativePath = fullPathname.slice(1); // Remove leading /
      console.log(`📸 [PATH DEBUG] relativePath after removing slash: ${relativePath}`);
      
      if (relativePath.startsWith(privateDir)) {
        relativePath = relativePath.slice(privateDir.length);
        console.log(`📸 [PATH DEBUG] relativePath after removing privateDir: ${relativePath}`);
        if (relativePath.startsWith('/')) {
          relativePath = relativePath.slice(1);
          console.log(`📸 [PATH DEBUG] relativePath after removing leading slash: ${relativePath}`);
        }
      }
      
      // Store as /objects/uploads/UUID (without bucket/.private prefix)
      const objectPath = `/objects/${relativePath}`;

      console.log(`📸 [UPLOAD] File uploaded successfully to ${objectPath}`);

      // Create database record
      const photoData = {
        serviceId,
        photoPath: objectPath,
        category: req.body.photoCategory || 'other',
        description: req.body.description || `Uploaded: ${req.file.originalname}`,
        uploadedBy: req.user!.id,
      };

      const validatedData = insertServicePhotoSchema.parse(photoData);
      const newPhoto = await storage.createServicePhoto(validatedData);

      logger.info(`📸 [UPLOAD] Photo record created in database with ID ${newPhoto.id}`);

      res.status(201).json({
        success: true,
        photo: newPhoto,
        message: 'Fotografija uspešno uploadovana'
      });

    } catch (error: any) {
      logger.error('Error uploading service photo:', error);
      if (error.name === 'MulterError') {
        return res.status(400).json({ error: `Greška pri upload-u: ${error.message}` });
      }
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Neispravni podaci", details: error.errors });
      }
      res.status(500).json({ error: "Neuspešno upload-ovanje fotografije" });
    }
  });

  console.log("✅ Misc routes registered");
  console.log("🔥🔥🔥 SERVICE PHOTOS UPLOAD ENDPOINT REGISTERED AT: /api/service-photos/upload");
}
