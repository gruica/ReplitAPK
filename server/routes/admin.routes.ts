import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { jwtAuth, jwtAuthMiddleware, requireRole } from "../jwt-auth";
import { logger } from "../production-logger";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";
import path from "path";
import { promises as fs } from "fs";
import { neon } from "@neondatabase/serverless";

// 🔒 SECURITY: User-Agent sanitization funkcija - uklanja potencijalno maliciozne karaktere
function sanitizeUserAgent(userAgent: string | undefined): string {
  if (!userAgent) return 'unknown';
  
  // Uklanjamo HTML tagove, script tagove i opasne karaktere
  return userAgent
    .replace(/[<>\"']/g, '') // Ukloni HTML/script karaktere
    .replace(/[{}[\]]/g, '') // Ukloni zagrade koje mogu biti problematične
    .substring(0, 200); // Limit na 200 karaktera za sigurnost
}

/**
 * Admin Routes
 * - User Management (CRUD)
 * - Service Management (admin view, return from technician, delete)
 * - Permissions & Audit Logs
 * - Deleted Services (soft delete, restore)
 * - Static Pages Management
 * - Security & System (audit, performance, backup, health)
 */
export function registerAdminRoutes(app: Express) {
  
  // ========== USER MANAGEMENT ==========
  
  /**
   * @swagger
   * /api/technicians:
   *   get:
   *     tags: [Admin - Users]
   *     summary: Get all technicians
   *     description: Retrieve list of all technicians (Admin only)
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Technicians retrieved successfully
   *       403:
   *         description: Admin access required
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  // GET /api/technicians - Get all technicians (Admin only)
  app.get("/api/technicians", jwtAuth, async (req, res) => {
    try {
      const userRole = (req.user as any)?.role;
      if (userRole !== 'admin') {
        return res.status(403).json({ error: "Nemate dozvolu za pristup serviserima" });
      }

      const technicians = await storage.getAllTechnicians();
      res.json(technicians);
    } catch (error) {
      console.error("Error fetching technicians:", error);
      res.status(500).json({ error: "Greška pri dohvatanju servisera" });
    }
  });

  /**
   * @swagger
   * /api/users:
   *   get:
   *     tags: [Admin - Users]
   *     summary: Get all users
   *     description: Retrieve list of all users (Admin only)
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Users retrieved successfully
   *       403:
   *         description: Admin access required
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  // GET /api/users - Get all users (Admin only)
  app.get("/api/users", jwtAuth, async (req, res) => {
    try {
      const userRole = (req.user as any)?.role;
      if (userRole !== 'admin') {
        return res.status(403).json({ error: "Nemate dozvolu za pristup korisnicima" });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Greška pri dohvatanju korisnika" });
    }
  });

  // POST /api/users - Create new user (Admin only)
  app.post("/api/users", jwtAuth, async (req, res) => {
    try {
      const userRole = (req.user as any)?.role;
      if (userRole !== 'admin') {
        return res.status(403).json({ error: "Nemate dozvolu za kreiranje korisnika" });
      }

      const userData = req.body;
      const newUser = await storage.createUser(userData);
      res.status(201).json(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Greška pri kreiranju korisnika" });
    }
  });

  // PUT /api/users/:id - Update user (Admin only)
  app.put("/api/users/:id", jwtAuth, async (req, res) => {
    try {
      const userRole = (req.user as any)?.role;
      if (userRole !== 'admin') {
        return res.status(403).json({ error: "Nemate dozvolu za ažuriranje korisnika" });
      }

      const userId = parseInt(req.params.id);
      const userData = req.body;
      const updatedUser = await storage.updateUser(userId, userData);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Greška pri ažuriranju korisnika" });
    }
  });

  // DELETE /api/users/:id - Delete user (Admin only)
  app.delete("/api/users/:id", jwtAuth, async (req, res) => {
    try {
      const userRole = (req.user as any)?.role;
      if (userRole !== 'admin') {
        return res.status(403).json({ error: "Nemate dozvolu za brisanje korisnika" });
      }

      const userId = parseInt(req.params.id);
      await storage.deleteUser(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Greška pri brisanju korisnika" });
    }
  });

  // POST /api/technician-users - Create technician user
  app.post("/api/technician-users", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ error: "Nemate dozvolu za ovu akciju" });
      }
      
      const { technicianId, username, password, fullName } = req.body;
      
      const technician = await storage.getTechnician(parseInt(technicianId));
      if (!technician) {
        return res.status(404).json({ error: "Serviser nije pronađen" });
      }
      
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Korisničko ime već postoji" });
      }
      
      const userData = insertUserSchema.parse({
        username,
        password,
        fullName: fullName || technician.fullName,
        role: "technician",
        technicianId: technician.id
      });
      
      const newUser = await storage.createUser(userData);
      
      const { password: _, ...userWithoutPassword } = newUser;
      
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Nevažeći podaci korisnika", details: error.format() });
      }
      res.status(500).json({ error: "Greška pri kreiranju korisnika servisera" });
    }
  });

  // ========== ADMIN SERVICE MANAGEMENT ==========

  // GET /api/admin/services - Get all admin services
  app.get("/api/admin/services", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const userRole = (req.user as any)?.role;
      if (userRole !== 'admin') {
        return res.status(403).json({ error: "Nemate dozvolu za pristup admin servisima" });
      }

      console.log("[ADMIN SERVICES] 📋 Dohvatanje svih admin servisa...");
      const adminServices = await storage.getAdminServices();
      console.log(`[ADMIN SERVICES] ✅ Uspešno dohvaćeno ${adminServices.length} servisa`);
      
      res.json(adminServices);
    } catch (error) {
      console.error("❌ [ADMIN SERVICES] Greška pri dohvatanju admin servisa:", error);
      res.status(500).json({ error: "Greška pri dohvatanju admin servisa" });
    }
  });

  // GET /api/admin/services-by-technicians - Get services grouped by technicians
  app.get("/api/admin/services-by-technicians", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const userRole = (req.user as any)?.role;
      if (userRole !== 'admin') {
        return res.status(403).json({ error: "Nemate dozvolu za pristup ovim podacima" });
      }

      const services = await storage.getAllServices();
      console.log(`[SERVICES BY TECHNICIANS] Vraćam ${services.length} servisa sa podacima:`, 
        services.slice(0, 1).map(s => ({
          id: s.id,
          clientName: s.clientName,
          applianceName: s.applianceName,
          technicianName: s.technicianName,
          status: s.status
        }))
      );
      res.json(services);
    } catch (error) {
      console.error("Error fetching services by technicians:", error);
      res.status(500).json({ error: "Greška pri dohvatanju servisa po serviserima" });
    }
  });

  // POST /api/admin/services/:id/return-from-technician - Return service from technician to admin
  app.post('/api/admin/services/:id/return-from-technician', jwtAuth, requireRole(['admin']), async (req: any, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      const { reason, notes } = req.body;
      
      console.log(`[ADMIN SERVICES] Vraćanje servisa ${serviceId} od servisera u admin bazu`);
      
      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ error: "Servis nije pronađen" });
      }
      
      await storage.updateService(serviceId, {
        clientId: service.clientId,
        applianceId: service.applianceId,
        description: service.description,
        warrantyStatus: service.warrantyStatus === 'nepoznato' ? 'van garancije' as const : service.warrantyStatus as 'u garanciji' | 'van garancije',
        createdAt: service.createdAt,
        status: 'pending',
        technicianId: null,
        technicianNotes: notes ? `VRAĆEN OD SERVISERA: ${reason}\nBeleške: ${notes}\n\n${service.technicianNotes || ''}` : service.technicianNotes
      });
      
      console.log(`✅ [ADMIN SERVICES] Servis ${serviceId} uspešno vraćen u admin bazu`);
      res.json({ success: true, message: "Servis uspešno vraćen od servisera" });
      
    } catch (error) {
      console.error('[ADMIN SERVICES] Greška pri vraćanju servisa:', error);
      res.status(500).json({ error: "Greška pri vraćanju servisa" });
    }
  });

  // DELETE /api/admin/services/:id - Delete service permanently
  app.delete("/api/admin/services/:id", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const userRole = (req.user as any)?.role;
      if (userRole !== 'admin') {
        return res.status(403).json({ error: "Nemate dozvolu za brisanje servisa" });
      }

      const serviceId = parseInt(req.params.id);
      if (isNaN(serviceId)) {
        return res.status(400).json({ error: "Nevažeći ID servisa" });
      }

      console.log(`[DELETE SERVICE API] Admin ${req.user?.username} briše servis ${serviceId}`);
      
      const success = await storage.deleteAdminService(serviceId);
      
      if (success) {
        console.log(`[DELETE SERVICE API] ✅ Servis ${serviceId} uspešno obrisan`);
        res.json({ success: true, message: "Servis je uspešno obrisan" });
      } else {
        console.log(`[DELETE SERVICE API] ❌ Servis ${serviceId} nije pronađen ili nije obrisan`);
        res.status(404).json({ error: "Servis nije pronađen ili nije mogao biti obrisan" });
      }
    } catch (error) {
      console.error("Error deleting service:", error);
      res.status(500).json({ error: "Greška pri brisanju servisa" });
    }
  });

  // GET /api/admin/service-report-pdf/:serviceId - Generate service PDF report
  app.get('/api/admin/service-report-pdf/:serviceId', jwtAuthMiddleware, requireRole(['admin']), async (req, res) => {
    try {
      const serviceId = parseInt(req.params.serviceId);
      
      if (isNaN(serviceId)) {
        return res.status(400).json({ 
          error: 'Nevaljan ID servisa' 
        });
      }

      console.log(`📄 [PDF API] Zahtev za PDF izvještaj servisa ${serviceId} od korisnika ${(req as any).user?.id}`);

      const { pdfService } = await import('../pdf-service.js');
      
      console.log(`📄 [PDF API] PDF service učitan, generisanje PDF-a...`);
      
      const pdfBuffer = await pdfService.generateServiceReportPDF(serviceId);
      
      console.log(`📄 [PDF API] ✅ PDF uspešno generisan (${pdfBuffer.length} bytes)`);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="service-report-${serviceId}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Cache-Control', 'no-cache');
      
      res.send(pdfBuffer);
      
      console.log(`📄 [PDF API] ✅ PDF izvještaj za servis ${serviceId} uspešno poslat`);
      
    } catch (error) {
      console.error('📄 [PDF API] ❌ Greška pri generisanju PDF izvještaja:', error);
      res.status(500).json({ 
        error: 'Greška pri generisanju PDF izvještaja',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ========== PERMISSIONS & AUDIT LOGS ==========
  
  // GET /api/user/permissions/check - Check user permissions
  app.get('/api/user/permissions/check', jwtAuth, async (req, res) => {
    try {
      const canDeleteServices = await storage.canUserDeleteServices(req.user!.id);
      const permissions = await storage.getUserPermissions(req.user!.id);
      
      res.json({
        canDeleteServices: canDeleteServices,
        permissions: permissions,
        userRole: req.user!.role
      });
    } catch (error) {
      console.error('Greška pri proveri privilegija:', error);
      res.status(500).json({ error: 'Greška pri proveri privilegija' });
    }
  });

  // GET /api/admin/user-permissions/:userId - Get user permissions
  app.get('/api/admin/user-permissions/:userId', jwtAuth, async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Samo admin može upravljati privilegijama' });
      }
      
      const userId = parseInt(req.params.userId);
      const permissions = await storage.getUserPermissions(userId);
      
      if (!permissions) {
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: 'Korisnik ne postoji' });
        }
        
        const defaultPermissions = {
          userId: userId,
          canDeleteServices: user.role === 'admin',
          canDeleteClients: user.role === 'admin',
          canDeleteAppliances: user.role === 'admin',
          canViewAllServices: user.role === 'admin',
          canManageUsers: user.role === 'admin',
          grantedBy: req.user!.id,
          notes: 'Default privilegije na osnovu role'
        };
        
        const newPermissions = await storage.createUserPermission(defaultPermissions);
        return res.json(newPermissions);
      }
      
      res.json(permissions);
    } catch (error) {
      console.error('Greška pri dohvatanju user permissions:', error);
      res.status(500).json({ error: 'Greška pri dohvatanju user permissions' });
    }
  });

  // POST /api/admin/user-permissions/:userId - Update user permissions
  app.post('/api/admin/user-permissions/:userId', jwtAuth, async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Samo admin može upravljati privilegijama' });
      }
      
      const userId = parseInt(req.params.userId);
      const updates = {
        ...req.body,
        grantedBy: req.user!.id
      };
      
      const updatedPermissions = await storage.updateUserPermissions(userId, updates);
      
      await storage.createServiceAuditLog({
        serviceId: 0,
        action: 'user_permissions_updated',
        performedBy: req.user!.id,
        performedByUsername: req.user!.username,
        performedByRole: req.user!.role,
        oldValues: null,
        newValues: JSON.stringify(updates),
        ipAddress: req.ip,
        userAgent: sanitizeUserAgent(req.get('User-Agent')),
        notes: `Privilegije ažurirane za korisnika ${userId}`
      });
      
      res.json(updatedPermissions);
    } catch (error) {
      console.error('Greška pri ažuriranju user permissions:', error);
      res.status(500).json({ error: 'Greška pri ažuriranju user permissions' });
    }
  });

  // GET /api/admin/audit-logs - Get all audit logs
  app.get('/api/admin/audit-logs', jwtAuth, async (req: Request, res: Response) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Samo admin može pristupiti audit log-ovima' });
      }
      
      const limit = parseInt(req.query.limit as string) || 100;
      const auditLogs = await storage.getAllAuditLogs(limit);
      res.json(auditLogs);
    } catch (error) {
      console.error('Greška pri dohvatanju audit log-ova:', error);
      res.status(500).json({ error: 'Greška pri dohvatanju audit log-ova' });
    }
  });

  // GET /api/admin/audit-logs/service/:serviceId - Get audit logs for service
  app.get('/api/admin/audit-logs/service/:serviceId', jwtAuth, async (req: Request, res: Response) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Samo admin može pristupiti audit log-ovima' });
      }
      
      const serviceId = parseInt(req.params.serviceId);
      const auditLogs = await storage.getServiceAuditLogs(serviceId);
      res.json(auditLogs);
    } catch (error) {
      console.error('Greška pri dohvatanju audit log-ova za servis:', error);
      res.status(500).json({ error: 'Greška pri dohvatanju audit log-ova za servis' });
    }
  });

  // ========== DELETED SERVICES (SOFT DELETE/RESTORE) ==========

  // DELETE /api/admin/services/:id/safe - Safe delete service with confirmation
  app.delete('/api/admin/services/:id/safe', jwtAuth, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      const deleteReason = req.body.reason;
      
      const canDelete = await storage.canUserDeleteServices(req.user!.id);
      if (!canDelete) {
        return res.status(403).json({ 
          error: 'Nemate privilegije za brisanje servisa. Kontaktirajte administratora.' 
        });
      }
      
      const success = await storage.softDeleteService(
        serviceId,
        req.user!.id,
        req.user!.username,
        req.user!.role,
        deleteReason,
        req.ip,
        sanitizeUserAgent(req.get('User-Agent'))
      );
      
      if (success) {
        res.json({ 
          success: true, 
          message: 'Servis je sigurno obrisan i može biti vraćen ako je potrebno' 
        });
      } else {
        res.status(400).json({ 
          error: 'Greška pri brisanju servisa. Servis možda ne postoji.' 
        });
      }
      
    } catch (error) {
      res.status(500).json({ error: 'Greška pri sigurnom brisanju servisa' });
    }
  });

  // GET /api/admin/deleted-services - Get all deleted services
  app.get('/api/admin/deleted-services', jwtAuth, async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Samo admin može videti obrisane servise' });
      }
      
      const deletedServices = await storage.getDeletedServices();
      res.json(deletedServices);
    } catch (error) {
      console.error('Greška pri dohvatanju obrisanih servisa:', error);
      res.status(500).json({ error: 'Greška pri dohvatanju obrisanih servisa' });
    }
  });

  // POST /api/admin/deleted-services/:serviceId/restore - Restore deleted service
  app.post('/api/admin/deleted-services/:serviceId/restore', jwtAuth, async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Samo admin može vraćati obrisane servise' });
      }
      
      const serviceId = parseInt(req.params.serviceId);
      
      const success = await storage.restoreDeletedService(
        serviceId,
        req.user!.id,
        req.user!.username,
        req.user!.role
      );
      
      if (success) {
        res.json({ 
          success: true, 
          message: 'Servis je uspešno vraćen u sistem sa novim ID-jem' 
        });
      } else {
        res.status(400).json({ 
          error: 'Greška pri vraćanju servisa. Servis možda ne može biti vraćen.' 
        });
      }
      
    } catch (error) {
      logger.error('Greška pri vraćanju servisa:', error);
      res.status(500).json({ error: 'Greška pri vraćanju servisa' });
    }
  });

  // DELETE /api/admin/services/:id/safe-delete - Safe delete service with description confirmation
  app.delete("/api/admin/services/:id/safe-delete", jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      console.log(`🛡️ [SAFE DELETE SERVICE] Admin ${req.user?.username} pokušava zaštićeno brisanje servisa ${req.params.id}`);
      
      const serviceId = parseInt(req.params.id);
      const { description } = req.body;
      
      if (isNaN(serviceId)) {
        return res.status(400).json({ error: "Neispravan ID servisa" });
      }
      
      if (!description || typeof description !== 'string') {
        return res.status(400).json({ 
          error: "Potrebno je uneti opis servisa", 
          hint: "Unesite tačan opis servisa kao što je zapisan u bazi podataka" 
        });
      }
      
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ error: "Servis nije pronađen" });
      }
      
      const trimmedInputDescription = description.trim();
      const trimmedServiceDescription = service.description.trim();
      
      if (trimmedInputDescription !== trimmedServiceDescription) {
        console.log(`🚫 [SAFE DELETE SERVICE] Nepodudarnost opisa:`);
        console.log(`   Uneto: "${trimmedInputDescription}"`);
        console.log(`   U bazi: "${trimmedServiceDescription}"`);
        
        return res.status(400).json({ 
          error: "Uneti opis servisa se ne slaže sa podacima u bazi", 
          hint: `Tačan opis u bazi: "${trimmedServiceDescription}"`,
          inputReceived: trimmedInputDescription 
        });
      }
      
      console.log(`🛡️ [SAFE DELETE SERVICE] ✅ Opis potvrđen - brišem servis ${serviceId} (${trimmedServiceDescription})`);
      const success = await storage.deleteAdminService(serviceId);
      
      if (success) {
        console.log(`🛡️ [SAFE DELETE SERVICE] ✅ Servis ${serviceId} uspešno obrisan`);
        res.json({ 
          success: true, 
          message: `Servis "${trimmedServiceDescription}" je uspešno obrisan`,
          deletedService: {
            id: serviceId,
            description: trimmedServiceDescription
          }
        });
      } else {
        res.status(500).json({ error: "Servis nije pronađen ili nije mogao biti obrisan" });
      }
      
    } catch (error) {
      console.error("🛡️ [SAFE DELETE SERVICE] ❌ Greška:", error);
      res.status(500).json({ 
        error: "Greška pri zaštićenom brisanju servisa", 
        message: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // DELETE /api/admin/clients/:id/safe-delete - Safe delete client with name confirmation
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
      
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ error: "Klijent nije pronađen" });
      }
      
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
      
      const clientServices = await storage.getServicesByClient(clientId);
      if (clientServices.length > 0) {
        return res.status(400).json({ 
          error: "Klijent ima aktivne servise", 
          message: "Prvo obriši sve servise povezane sa ovim klijentom",
          activeServicesCount: clientServices.length
        });
      }

      const clientAppliances = await storage.getAppliancesByClient(clientId);
      if (clientAppliances.length > 0) {
        return res.status(400).json({ 
          error: "Klijent ima registrovane uređaje", 
          message: "Prvo obriši sve uređaje povezane sa ovim klijentom",
          activeAppliancesCount: clientAppliances.length
        });
      }

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

  // ========== STATIC PAGES MANAGEMENT ==========
  
  // GET /api/admin/static-pages/:filename - Get static page content
  app.get('/api/admin/static-pages/:filename', jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { filename } = req.params;
      
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin dozvola potrebna' });
      }
      
      const allowedFiles = [
        'privacy-policy.html',
        'data-deletion.html', 
        'reviewer-instructions.html',
        'facebook-resubmission-guide.html',
        'screencast-guide.html'
      ];
      
      if (!allowedFiles.includes(filename)) {
        return res.status(400).json({ error: 'Fajl nije dozvoljen za uređivanje' });
      }
      
      console.log(`📄 [ADMIN] Čitam statičku stranicu: ${filename}`);
      
      const filePath = path.join(process.cwd(), 'public', filename);
      
      try {
        const [content, stats] = await Promise.all([
          fs.readFile(filePath, 'utf8').catch(() => ''),
          fs.stat(filePath).catch(() => null)
        ]);
        
        res.json({
          success: true,
          filename,
          content,
          lastModified: stats ? stats.mtime.toLocaleString('sr-RS') : null,
          size: stats ? stats.size : 0
        });
        
      } catch (fileError) {
        res.status(200).json({ 
          success: true,
          filename,
          content: '',
          lastModified: null,
          size: 0
        });
      }
      
    } catch (error) {
      logger.error('ADMIN Greška pri čitanju statičke stranice:', error);
      res.status(500).json({ 
        error: 'Server greška pri čitanju stranice',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // PUT /api/admin/static-pages/:filename - Update static page content
  app.put('/api/admin/static-pages/:filename', jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { filename } = req.params;
      const { content } = req.body;
      
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin dozvola potrebna' });
      }
      
      const allowedFiles = [
        'privacy-policy.html',
        'data-deletion.html',
        'reviewer-instructions.html', 
        'facebook-resubmission-guide.html',
        'screencast-guide.html'
      ];
      
      if (!allowedFiles.includes(filename)) {
        return res.status(400).json({ error: 'Fajl nije dozvoljen za uređivanje' });
      }
      
      if (!content || typeof content !== 'string') {
        return res.status(400).json({ error: 'Sadržaj stranice je obavezan' });
      }
      
      console.log(`📄 [ADMIN] Ažuriram statičku stranicu: ${filename} (${content.length} karaktera)`);
      
      const filePath = path.join(process.cwd(), 'public', filename);
      
      try {
        const existingContent = await fs.readFile(filePath, 'utf8');
        const backupPath = path.join(process.cwd(), 'public', `${filename}.backup.${Date.now()}`);
        await fs.writeFile(backupPath, existingContent, 'utf8');
        console.log(`💾 [ADMIN] Kreiran backup: ${backupPath}`);
      } catch (backupError) {
        // Backup optional
      }
      
      try {
        await fs.writeFile(filePath, content, 'utf8');
        const stats = await fs.stat(filePath);
        
        res.json({
          success: true,
          message: 'Stranica je uspešno ažurirana',
          filename,
          size: stats.size,
          lastModified: stats.mtime.toLocaleString('sr-RS')
        });
        
      } catch (writeError) {
        res.status(500).json({ 
          error: 'Ne mogu sačuvati fajl',
          filename,
          details: writeError instanceof Error ? writeError.message : String(writeError)
        });
      }
      
    } catch (error) {
      logger.error('ADMIN Greška pri ažuriranju statičke stranice:', error);
      res.status(500).json({ 
        error: 'Server greška pri ažuriranju stranice',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ========== SECURITY & SYSTEM ==========

  // POST /api/admin/reset-all-users - Mass logout (reset all user sessions)
  app.post('/api/admin/reset-all-users', jwtAuth, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ 
          error: "Nemate dozvolu", 
          message: "Samo administratori mogu resetovati korisničke sesije." 
        });
      }

      console.log("🔄 [ADMIN RESET] Pokrećem resetovanje svih korisničkih sesija...");
      console.log("🔄 [ADMIN RESET] Zahtev od:", req.user?.username);

      const deleteSessionsQuery = 'DELETE FROM user_sessions';
      
      try {
        const result = await storage.db.query(deleteSessionsQuery);
        const deletedSessionsCount = result.rowCount || 0;
        console.log(`🗑️ [ADMIN RESET] Obrisano ${deletedSessionsCount} sesija iz baze podataka`);
        
        const resetStats = {
          deletedSessions: deletedSessionsCount,
          resetTimestamp: new Date().toISOString(),
          resetBy: req.user?.username,
          method: 'session_table_truncate'
        };

        console.log("✅ [ADMIN RESET] Svi korisnici su uspešno odjavljeni");
        console.log("📊 [ADMIN RESET] Statistike resetovanja:", resetStats);

        res.json({
          success: true,
          message: "Svi korisnici su uspešno odjavljeni",
          stats: resetStats
        });

      } catch (dbError) {
        console.error("❌ [ADMIN RESET] Greška pri brisanju sesija iz baze:", dbError);
        throw dbError;
      }

    } catch (error) {
      console.error("❌ [ADMIN RESET] Greška pri resetovanju korisnika:", error);
      res.status(500).json({ 
        error: "Greška pri resetovanju korisničkih sesija",
        message: error instanceof Error ? error.message : "Nepoznata greška"
      });
    }
  });

  // GET /api/admin/security/audit - Get security audit report
  app.get('/api/admin/security/audit', jwtAuth, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Samo administratori mogu pristupiti security audit-u" });
      }

      const { securityAudit } = await import('../security-audit.js');
      const report = await securityAudit.generateSecurityReport();
      res.json(report);
    } catch (error) {
      console.error("Security audit error:", error);
      res.status(500).json({ error: "Greška pri generisanju security izveštaja" });
    }
  });

  // GET /api/admin/security/events - Get recent security events
  app.get('/api/admin/security/events', jwtAuth, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const { securityAudit } = await import('../security-audit.js');
      const hours = parseInt(req.query.hours as string) || 24;
      const events = securityAudit.getRecentSecurityEvents(hours);
      res.json(events);
    } catch (error) {
      console.error("Security events error:", error);
      res.status(500).json({ error: "Greška pri dohvatanju security događaja" });
    }
  });

  // POST /api/admin/security/scan - Run security vulnerability scan
  app.post('/api/admin/security/scan', jwtAuth, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const { securityAudit } = await import('../security-audit.js');
      const vulnerabilities = await securityAudit.scanForVulnerabilities();
      securityAudit.logSecurityEvent('vulnerability_scan', 'medium', 'Manual security scan performed', req.ip || 'unknown', req.user.id);
      res.json(vulnerabilities);
    } catch (error) {
      console.error("Security scan error:", error);
      res.status(500).json({ error: "Greška pri security scan-u" });
    }
  });

  // GET /api/admin/performance/report - Get performance report
  app.get('/api/admin/performance/report', jwtAuth, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Samo administratori mogu pristupiti performance izvještajima" });
      }

      const { performanceOptimizer } = await import('../performance-optimizer.js');
      const report = performanceOptimizer.getPerformanceReport();
      res.json(report);
    } catch (error) {
      console.error("Performance report error:", error);
      res.status(500).json({ error: "Greška pri generisanju performance izveštaja" });
    }
  });

  // POST /api/admin/performance/clear-cache - Clear performance cache
  app.post('/api/admin/performance/clear-cache', jwtAuth, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const { performanceOptimizer } = await import('../performance-optimizer.js');
      performanceOptimizer.flush();
      res.json({ success: true, message: "Cache uspešno očišćen" });
    } catch (error) {
      console.error("Clear cache error:", error);
      res.status(500).json({ error: "Greška pri brisanju cache-a" });
    }
  });

  // POST /api/admin/backup/database - Create database backup
  app.post('/api/admin/backup/database', jwtAuth, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Samo administratori mogu kreirati backup-e" });
      }

      const { backupSystem } = await import('../backup-system.js');
      const result = await backupSystem.createDatabaseBackup();
      res.json(result);
    } catch (error) {
      console.error("Database backup error:", error);
      res.status(500).json({ error: "Greška pri kreiranju database backup-a" });
    }
  });

  // POST /api/admin/backup/files - Create files backup
  app.post('/api/admin/backup/files', jwtAuth, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const { backupSystem } = await import('../backup-system.js');
      const result = await backupSystem.createFilesBackup();
      res.json(result);
    } catch (error) {
      console.error("Files backup error:", error);
      res.status(500).json({ error: "Greška pri kreiranju files backup-a" });
    }
  });

  // GET /api/admin/system/health - Get overall system health
  app.get('/api/admin/system/health', jwtAuth, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Samo administratori mogu pristupiti system health" });
      }

      const { securityAudit } = await import('../security-audit.js');
      const { performanceOptimizer } = await import('../performance-optimizer.js');
      const { backupSystem } = await import('../backup-system.js');

      const [securityReport, performanceReport, backupStatus, backupTest] = await Promise.all([
        securityAudit.generateSecurityReport(),
        Promise.resolve(performanceOptimizer.getPerformanceReport()),
        Promise.resolve(backupSystem.getBackupStatus()),
        backupSystem.testBackupSystem()
      ]);

      const systemHealth = {
        timestamp: new Date(),
        security: {
          score: securityReport.overallScore,
          status: securityReport.overallScore >= 80 ? 'healthy' : securityReport.overallScore >= 60 ? 'warning' : 'critical',
          vulnerabilities: securityReport.vulnerabilities.length,
          criticalEvents: securityReport.auditLogSummary.criticalEvents
        },
        performance: {
          status: performanceReport.cache.hitRate >= 80 && 
                  parseFloat(performanceReport.memory.current) < 400 ? 'healthy' : 'warning',
          cacheHitRate: performanceReport.cache.hitRate,
          memoryUsage: performanceReport.memory.current,
          slowQueries: performanceReport.queries.filter((q: any) => q.avgTime > 1000).length
        },
        backup: {
          status: backupTest.databaseBackup && backupTest.filesBackup ? 'healthy' : 'warning',
          lastBackup: backupStatus.lastBackupTime,
          totalBackups: backupStatus.totalBackups,
          failedBackups: backupStatus.failedBackups,
          isRunning: backupStatus.isRunning
        },
        overallStatus: 'healthy'
      };

      const statuses = [systemHealth.security.status, systemHealth.performance.status, systemHealth.backup.status];
      if (statuses.includes('critical')) {
        systemHealth.overallStatus = 'critical';
      } else if (statuses.includes('warning')) {
        systemHealth.overallStatus = 'warning';
      } else {
        systemHealth.overallStatus = 'healthy';
      }

      res.json(systemHealth);
    } catch (error) {
      console.error("System health check error:", error);
      res.status(500).json({ error: "Greška pri system health provjeri" });
    }
  });

  // ========== SUPPLIER MANAGEMENT ==========

  // GET /api/admin/suppliers - Get all suppliers
  app.get('/api/admin/suppliers', jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      console.log("[SUPPLIERS] Fetching all suppliers");
      const suppliers = await storage.getAllSuppliers();
      res.json(suppliers);
    } catch (error) {
      console.error("[SUPPLIERS] Error fetching suppliers:", error);
      res.status(500).json({ error: "Greška pri dohvatanju dobavljača" });
    }
  });

  // GET /api/admin/suppliers/stats - Get supplier statistics
  app.get('/api/admin/suppliers/stats', jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const suppliers = await storage.getAllSuppliers();
      const supplierOrders = await storage.getAllSupplierOrders();
      
      const stats = {
        totalSuppliers: suppliers.length,
        activeSuppliers: suppliers.filter(s => s.isActive).length,
        pendingOrders: supplierOrders.filter(o => o.status === 'pending').length,
        emailIntegrations: suppliers.filter(s => s.integrationMethod === 'email').length,
      };
      
      res.json(stats);
    } catch (error) {
      console.error("[SUPPLIERS] Error fetching supplier stats:", error);
      res.status(500).json({ error: "Greška pri dohvatanju statistike dobavljača" });
    }
  });

  // POST /api/admin/suppliers - Create new supplier
  app.post('/api/admin/suppliers', jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      console.log("[SUPPLIERS] Creating new supplier:", req.body.name);
      const newSupplier = await storage.createSupplier(req.body);
      res.status(201).json(newSupplier);
    } catch (error) {
      console.error("[SUPPLIERS] Error creating supplier:", error);
      res.status(500).json({ error: "Greška pri kreiranju dobavljača" });
    }
  });

  // PUT /api/admin/suppliers/:id - Update supplier
  app.put('/api/admin/suppliers/:id', jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const supplierId = parseInt(req.params.id);
      console.log(`[SUPPLIERS] Updating supplier ${supplierId}`);
      const updatedSupplier = await storage.updateSupplier(supplierId, req.body);
      res.json(updatedSupplier);
    } catch (error) {
      console.error("[SUPPLIERS] Error updating supplier:", error);
      res.status(500).json({ error: "Greška pri ažuriranju dobavljača" });
    }
  });

  // DELETE /api/admin/suppliers/:id - Delete supplier
  app.delete('/api/admin/suppliers/:id', jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const supplierId = parseInt(req.params.id);
      console.log(`[SUPPLIERS] Deleting supplier ${supplierId}`);
      await storage.deleteSupplier(supplierId);
      res.json({ success: true });
    } catch (error) {
      console.error("[SUPPLIERS] Error deleting supplier:", error);
      res.status(500).json({ error: "Greška pri brisanju dobavljača" });
    }
  });

  // GET /api/admin/supplier-orders - Get all supplier orders
  app.get('/api/admin/supplier-orders', jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      console.log("[SUPPLIERS] Fetching all supplier orders");
      const supplierOrders = await storage.getAllSupplierOrders();
      res.json(supplierOrders);
    } catch (error) {
      console.error("[SUPPLIERS] Error fetching supplier orders:", error);
      res.status(500).json({ error: "Greška pri dohvatanju porudžbina dobavljača" });
    }
  });

  // POST /api/admin/suppliers/:supplierId/create-user - Create user for supplier
  app.post('/api/admin/suppliers/:supplierId/create-user', jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const supplierId = parseInt(req.params.supplierId);
      const { username, password, fullName } = req.body;
      
      const supplier = await storage.getSupplier(supplierId);
      if (!supplier) {
        return res.status(404).json({ error: "Dobavljač nije pronađen" });
      }
      
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Korisničko ime već postoji" });
      }
      
      const userData = insertUserSchema.parse({
        username,
        password,
        fullName: fullName || supplier.name,
        email: supplier.email,
        phone: supplier.phone || "",
        role: "supplier",
        supplierId: supplier.id,
        isVerified: true,
      });
      
      const newUser = await storage.createUser(userData);
      
      const { password: _, ...userWithoutPassword } = newUser;
      
      console.log(`[SUPPLIERS] ✅ Created user for supplier ${supplier.name}`);
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Nevažeći podaci korisnika", details: error.format() });
      }
      console.error("[SUPPLIERS] Error creating supplier user:", error);
      res.status(500).json({ error: "Greška pri kreiranju korisnika dobavljača" });
    }
  });

  // GET /api/admin/spare-parts - Get all spare part orders
  app.get('/api/admin/spare-parts', jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      console.log("[ADMIN SPARE PARTS] Fetching all spare part orders");
      const orders = await storage.getAllSparePartOrders();
      res.json(orders);
    } catch (error) {
      console.error("[ADMIN SPARE PARTS] Error fetching orders:", error);
      res.status(500).json({ error: "Greška pri dohvatanju porudžbina" });
    }
  });

  // POST /api/admin/spare-parts/:orderId/assign-supplier - Assign spare part order to supplier
  app.post('/api/admin/spare-parts/:orderId/assign-supplier', jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const { supplierId, orderNumber, estimatedDelivery, totalCost, currency, notes } = req.body;
      
      console.log(`[SUPPLIER ASSIGNMENT] Assigning spare part order ${orderId} to supplier ${supplierId}`);
      
      // Get spare part order
      const sparePartOrder = await storage.getSparePartOrder(orderId);
      if (!sparePartOrder) {
        return res.status(404).json({ error: "Porudžbina rezervnog dela nije pronađena" });
      }
      
      // Get supplier
      const supplier = await storage.getSupplier(supplierId);
      if (!supplier) {
        return res.status(404).json({ error: "Dobavljač nije pronađen" });
      }
      
      // Create supplier order (task for supplier)
      const supplierOrder = await storage.createSupplierOrder({
        supplierId: supplierId,
        sparePartOrderId: orderId,
        orderNumber: orderNumber || undefined,
        status: 'pending',
        totalCost: totalCost ? parseFloat(totalCost) : undefined,
        currency: currency || 'EUR',
        estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : undefined,
        emailContent: notes || undefined,
      });
      
      // Update spare part order status to 'ordered'
      await storage.updateSparePartOrder(orderId, {
        status: 'ordered',
        supplierName: supplier.name,
        orderDate: new Date().toISOString(),
        expectedDelivery: estimatedDelivery || undefined,
      });
      
      console.log(`[SUPPLIER ASSIGNMENT] ✅ Created supplier order ${supplierOrder.id} for supplier ${supplier.name}`);
      
      res.status(201).json(supplierOrder);
    } catch (error) {
      console.error("[SUPPLIER ASSIGNMENT] Error assigning order to supplier:", error);
      res.status(500).json({ error: "Greška pri dodeli porudžbine dobavljaču" });
    }
  });

  // GET /api/admin/supplier-tasks-by-supplier - Get supplier tasks grouped by supplier
  app.get('/api/admin/supplier-tasks-by-supplier', jwtAuth, requireRole(['admin']), async (req, res) => {
    try {
      console.log("[SUPPLIER TASKS] Fetching tasks grouped by supplier");
      
      const suppliers = await storage.getAllSuppliers();
      const allSupplierOrders = await storage.getAllSupplierOrders();
      
      const tasksBySupplier = suppliers.map(supplier => ({
        supplier,
        tasks: allSupplierOrders.filter(order => order.supplierId === supplier.id),
        stats: {
          total: allSupplierOrders.filter(o => o.supplierId === supplier.id).length,
          pending: allSupplierOrders.filter(o => o.supplierId === supplier.id && o.status === 'pending').length,
          separated: allSupplierOrders.filter(o => o.supplierId === supplier.id && o.status === 'separated').length,
          sent: allSupplierOrders.filter(o => o.supplierId === supplier.id && o.status === 'sent').length,
          delivered: allSupplierOrders.filter(o => o.supplierId === supplier.id && o.status === 'delivered').length,
        }
      }));
      
      res.json(tasksBySupplier);
    } catch (error) {
      console.error("[SUPPLIER TASKS] Error fetching tasks by supplier:", error);
      res.status(500).json({ error: "Greška pri dohvatanju zadataka po dobavljačima" });
    }
  });

  // JavaScript error tracking endpoints
  app.post("/api/errors/javascript", (req, res) => {
    console.error("💥 [BROWSER JS ERROR]:", {
      message: req.body.message,
      filename: req.body.filename,
      lineno: req.body.lineno,
      colno: req.body.colno,
      stack: req.body.stack,
      url: req.body.url,
      timestamp: req.body.timestamp
    });
    res.json({ success: true });
  });

  app.post("/api/errors/promise", (req, res) => {
    console.error("💥 [BROWSER PROMISE ERROR]:", {
      reason: req.body.reason,
      stack: req.body.stack,
      url: req.body.url,
      timestamp: req.body.timestamp
    });
    res.json({ success: true });
  });

  // POST /api/admin/send-service-email-with-pdf/:serviceId - Send professional email with PDF report
  app.post('/api/admin/send-service-email-with-pdf/:serviceId', jwtAuthMiddleware, requireRole(['admin']), async (req, res) => {
    try {
      const serviceId = parseInt(req.params.serviceId);
      
      if (isNaN(serviceId)) {
        return res.status(400).json({ 
          error: 'Nevaljan ID servisa' 
        });
      }

      console.log(`📧 [EMAIL+PDF API] Zahtev za slanje email-a sa PDF-om za servis ${serviceId}`);

      // Dohvati servis i klijenta
      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ error: 'Servis nije pronađen' });
      }

      const client = await storage.getClient(service.clientId);
      if (!client) {
        return res.status(404).json({ error: 'Klijent nije pronađen' });
      }

      if (!client.email) {
        return res.status(400).json({ error: `Klijent ${client.fullName} nema email adresu` });
      }

      // Generiši PDF
      const { pdfService } = await import('../pdf-service.js');
      console.log(`📄 [EMAIL+PDF API] Generisanje PDF-a...`);
      const pdfBuffer = await pdfService.generateServiceReportPDF(serviceId);
      console.log(`📄 [EMAIL+PDF API] ✅ PDF generisan (${pdfBuffer.length} bytes)`);

      // Pripremi email sa PDF prilogom
      const { emailService } = await import('../email-service.js');
      
      const subject = `Izvještaj o završenom servisu #${serviceId} - Frigo Sistem Todosijević`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0; font-size: 28px;">FRIGO SISTEM TODOSIJEVIĆ</h1>
            <h2 style="color: #64748b; margin: 5px 0; font-size: 18px; font-weight: normal;">Servis bijele tehnike</h2>
          </div>
          
          <h2 style="color: #0066cc;">Izvještaj o završenom servisu</h2>
          
          <p>Poštovani/a ${client.fullName},</p>
          
          <p>Zahvaljujemo se što ste nam ukazali povjerenje. Vaš servis je uspješno završen.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">Detalji servisa:</h3>
            <p><strong>Broj servisa:</strong> #${serviceId}</p>
            <p><strong>Status:</strong> ${service.status}</p>
            ${service.description ? `<p><strong>Opis:</strong> ${service.description}</p>` : ''}
            ${service.technicianNotes ? `<p><strong>Napomene:</strong> ${service.technicianNotes}</p>` : ''}
          </div>
          
          <div style="background-color: #dbeafe; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #1e40af;">
              📎 <strong>U prilogu ovog email-a</strong> nalaze se detaljni izvještaj o izvršenom servisu u PDF formatu.
            </p>
          </div>
          
          <p>Ukoliko imate bilo kakvih pitanja ili nedoumica, slobodno nas kontaktirajte.</p>
          
          <p>Srdačan pozdrav,<br><strong>Tim Frigo Sistema Todosijević</strong></p>
          
          <hr style="border: 1px solid #e2e8f0; margin: 30px 0;">
          
          <div style="text-align: center; color: #64748b; font-size: 13px;">
            <p><strong>FRIGO SISTEM TODOSIJEVIĆ</strong></p>
            <p>Kontakt telefon: 033 402 402</p>
            <p>Email: info@frigosistemtodosijevic.com</p>
            <p>Podgorica, Crna Gora</p>
          </div>
        </div>
      `;

      console.log(`📧 [EMAIL+PDF API] Slanje email-a na: ${client.email}`);
      
      const emailSent = await emailService.sendEmail({
        to: client.email,
        subject: subject,
        html: html,
        attachments: [{
          filename: `servisni-izvjestaj-${serviceId}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }]
      }, 3); // 3 pokušaja

      if (emailSent) {
        console.log(`📧 [EMAIL+PDF API] ✅ Email sa PDF-om uspješno poslat na ${client.email}`);
        res.json({ 
          success: true, 
          message: `Profesionalni email sa PDF izvještajem uspješno poslat klijentu ${client.fullName} (${client.email})`,
          serviceId: serviceId,
          clientEmail: client.email
        });
      } else {
        console.error(`📧 [EMAIL+PDF API] ❌ Neuspješno slanje email-a`);
        res.status(500).json({ 
          error: 'Greška pri slanju email-a. Provjerite SMTP konfiguraciju.' 
        });
      }
      
    } catch (error) {
      console.error('📧 [EMAIL+PDF API] ❌ Greška pri slanju email-a sa PDF-om:', error);
      res.status(500).json({ 
        error: 'Greška pri slanju email-a sa PDF izvještajem',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ========== TEMPORARY PRODUCTION CHECK ENDPOINT ==========
  
  /**
   * GET /api/admin/check-technicians-production
   * CRITICAL: Direct production database check
   * Reads production DATABASE_URL regardless of current environment
   * Admin only - READ ONLY operation
   */
  app.get("/api/admin/check-technicians-production", jwtAuth, async (req, res) => {
    try {
      const userRole = (req.user as any)?.role;
      if (userRole !== 'admin') {
        return res.status(403).json({ error: "Samo administrator može pristupiti ovom endpointu" });
      }

      const currentEnv = process.env.REPLIT_DEPLOYMENT === '1' ? 'PRODUCTION' : 'DEVELOPMENT';
      console.log(`🔍 [TECH CHECK] Current Environment: ${currentEnv}`);
      
      // 🔒 DIRECT PRODUCTION DATABASE ACCESS (READ ONLY)
      const productionDbUrl = process.env.DATABASE_URL; // Always points to production in Replit
      
      if (!productionDbUrl) {
        return res.status(500).json({ error: 'Production DATABASE_URL nije konfigurisan' });
      }

      console.log(`🔍 [TECH CHECK] Connecting to production database...`);
      const sql = neon(productionDbUrl);
      
      // Direct SQL query - READ ONLY
      const technicians = await sql`
        SELECT id, username, full_name, role, technician_id, is_verified 
        FROM users 
        WHERE role = 'technician' 
        ORDER BY id
      `;

      console.log(`🔍 [TECH CHECK] Found ${technicians.length} technicians in PRODUCTION`);
      
      // Check for problems (missing technicianId)
      const problems = technicians.filter((t: any) => !t.technician_id);
      
      res.json({
        databaseSource: 'PRODUCTION (Direct DATABASE_URL)',
        currentEnvironment: currentEnv,
        timestamp: new Date().toISOString(),
        totalTechnicians: technicians.length,
        problemsFound: problems.length,
        technicians: technicians.map((t: any) => ({
          id: t.id,
          username: t.username,
          fullName: t.full_name,
          role: t.role,
          technicianId: t.technician_id,
          isVerified: t.is_verified
        })),
        problemTechnicians: problems.map((t: any) => ({
          id: t.id,
          username: t.username,
          fullName: t.full_name,
          technicianId: t.technician_id
        })),
        summary: problems.length > 0 
          ? `⚠️ PRONAĐENO ${problems.length} tehničara BEZ technicianId!` 
          : '✅ Svi tehničari imaju technicianId'
      });
      
    } catch (error) {
      console.error('❌ [TECH CHECK] Error checking production technicians:', error);
      res.status(500).json({ 
        error: 'Greška pri proveri production tehničara',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  console.log("✅ Admin routes registered");
}
