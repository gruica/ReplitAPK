import type { Express, Request, Response } from "express";
import { storage } from "../storage.js";
import { jwtAuthMiddleware, requireRole } from "../jwt-auth.js";
import { supplierAssignmentService } from "../supplier-assignment-service.js";

/**
 * Supplier Routes Module
 * Handles supplier portal functionality for parts procurement
 * 
 * Workflow:
 * 1. Admin creates spare part order and assigns to supplier
 * 2. Supplier sees tasks in portal
 * 3. Supplier clicks "Odvojio dio" (separated status)
 * 4. Supplier clicks "Poslao dio" (sent status)
 * 5. Admin receives and marks as delivered
 */

export function registerSupplierRoutes(app: Express) {
  
  // GET /api/supplier/tasks - Get supplier's assigned tasks with spare part order details
  app.get('/api/supplier/tasks', jwtAuthMiddleware, requireRole(['supplier']), async (req: Request, res: Response) => {
    try {
      const supplierId = req.user!.supplierId;
      
      if (!supplierId) {
        return res.status(400).json({ error: 'Korisnik nema dodijeljenog dobavljača' });
      }
      
      console.log(`[SUPPLIER] Fetching tasks for supplier ${supplierId}`);
      
      // Get all supplier orders assigned to this supplier
      const tasks = await storage.getSupplierTasks(supplierId);
      
      console.log(`[SUPPLIER] Found ${tasks.length} tasks for supplier ${supplierId}`);

      // 🔄 ENRICH with spare_part_order details
      const enrichedTasks = await Promise.all(
        tasks.map(async (task) => {
          try {
            // Get spare part order details
            const sparePartOrder = await storage.getSparePartOrder(task.sparePartOrderId);
            
            // Get service details if available
            let serviceDetails = null;
            if (sparePartOrder?.serviceId) {
              try {
                serviceDetails = await storage.getAdminServiceById(sparePartOrder.serviceId);
              } catch (err) {
                console.warn(`[SUPPLIER] Could not fetch service for task ${task.id}:`, err);
              }
            }

            return {
              ...task,
              sparePartOrder,
              serviceDetails
            };
          } catch (error) {
            console.error(`[SUPPLIER] Error enriching task ${task.id}:`, error);
            return task; // Return original task if enrichment fails
          }
        })
      );
      
      res.json(enrichedTasks);
    } catch (error) {
      console.error('[SUPPLIER] Error fetching tasks:', error);
      res.status(500).json({ error: 'Greška pri dohvatanju zadataka' });
    }
  });

  // PATCH /api/supplier/tasks/:id/separated - Mark part as separated
  app.patch('/api/supplier/tasks/:id/separated', jwtAuthMiddleware, requireRole(['supplier']), async (req: Request, res: Response) => {
    try {
      const taskId = parseInt(req.params.id);
      const supplierId = req.user!.supplierId;
      
      if (!supplierId) {
        return res.status(400).json({ error: 'Korisnik nema dodijeljenog dobavljača' });
      }
      
      if (isNaN(taskId)) {
        return res.status(400).json({ error: 'Nevaljan ID zadatka' });
      }

      console.log(`[SUPPLIER] Supplier ${supplierId} marking task ${taskId} as separated`);
      
      // Verify task belongs to this supplier
      const task = await storage.getSupplierTask(taskId);
      if (!task || task.supplierId !== supplierId) {
        return res.status(403).json({ error: 'Nemate dozvolu za ovaj zadatak' });
      }

      // Update status to separated
      const updatedTask = await storage.updateSupplierTaskStatus(taskId, 'separated');
      
      console.log(`[SUPPLIER] ✅ Task ${taskId} marked as separated`);

      // 🔄 SYNCHRONIZE with spare_part_order
      try {
        await supplierAssignmentService.synchronizeStatus(taskId, 'separated');
        console.log(`[SUPPLIER] ✅ Synchronized status to spare_part_order`);
      } catch (syncError) {
        console.error(`[SUPPLIER] ⚠️ Status sync failed:`, syncError);
        // Don't fail the request if sync fails
      }
      
      res.json(updatedTask);
    } catch (error) {
      console.error('[SUPPLIER] Error marking task as separated:', error);
      res.status(500).json({ error: 'Greška pri ažuriranju statusa' });
    }
  });

  // PATCH /api/supplier/tasks/:id/sent - Mark part as sent
  app.patch('/api/supplier/tasks/:id/sent', jwtAuthMiddleware, requireRole(['supplier']), async (req: Request, res: Response) => {
    try {
      const taskId = parseInt(req.params.id);
      const supplierId = req.user!.supplierId;
      
      if (!supplierId) {
        return res.status(400).json({ error: 'Korisnik nema dodijeljenog dobavljača' });
      }
      
      if (isNaN(taskId)) {
        return res.status(400).json({ error: 'Nevaljan ID zadatka' });
      }

      console.log(`[SUPPLIER] Supplier ${supplierId} marking task ${taskId} as sent`);
      
      // Verify task belongs to this supplier
      const task = await storage.getSupplierTask(taskId);
      if (!task || task.supplierId !== supplierId) {
        return res.status(403).json({ error: 'Nemate dozvolu za ovaj zadatak' });
      }

      // Update status to sent
      const updatedTask = await storage.updateSupplierTaskStatus(taskId, 'sent');
      
      console.log(`[SUPPLIER] ✅ Task ${taskId} marked as sent`);

      // 🔄 SYNCHRONIZE with spare_part_order
      try {
        await supplierAssignmentService.synchronizeStatus(taskId, 'sent');
        console.log(`[SUPPLIER] ✅ Synchronized status to spare_part_order`);
      } catch (syncError) {
        console.error(`[SUPPLIER] ⚠️ Status sync failed:`, syncError);
        // Don't fail the request if sync fails
      }
      
      res.json(updatedTask);
    } catch (error) {
      console.error('[SUPPLIER] Error marking task as sent:', error);
      res.status(500).json({ error: 'Greška pri ažuriranju statusa' });
    }
  });

  // GET /api/supplier/stats - Get supplier statistics
  app.get('/api/supplier/stats', jwtAuthMiddleware, requireRole(['supplier']), async (req: Request, res: Response) => {
    try {
      const supplierId = req.user!.supplierId;
      
      if (!supplierId) {
        return res.status(400).json({ error: 'Korisnik nema dodijeljenog dobavljača' });
      }
      
      const tasks = await storage.getSupplierTasks(supplierId);
      
      const stats = {
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'pending').length,
        separated: tasks.filter(t => t.status === 'separated').length,
        sent: tasks.filter(t => t.status === 'sent').length,
        delivered: tasks.filter(t => t.status === 'delivered').length,
      };
      
      res.json(stats);
    } catch (error) {
      console.error('[SUPPLIER] Error fetching stats:', error);
      res.status(500).json({ error: 'Greška pri dohvatanju statistike' });
    }
  });

  console.log("✅ Supplier routes registered");
}
