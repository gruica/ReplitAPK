import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { jwtAuth, requireRole } from "../jwt-auth";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, or, ne, isNotNull, isNull, gte, lte, lt, desc, sql } from "drizzle-orm";
import { verifyToken } from "../jwt-auth";
import puppeteer from "puppeteer";
import { writeFile } from "fs/promises";
import path from "path";

// Brand groupings for billing
const bekoBrands = ['Beko', 'Grundig', 'Blomberg'];
const complusBrands = ['Electrolux', 'Elica', 'Candy', 'Hoover', 'Turbo Air'];

// Standard billing tariffs
const BEKO_STANDARD_TARIFF = 30.25;
const COMPLUS_STANDARD_TARIFF = 25.00;

/**
 * Billing Routes
 * - Beko billing reports (enhanced, regular, out-of-warranty)
 * - ComPlus billing reports (enhanced, regular, smart, out-of-warranty)
 * - Billing price management
 */
export function registerBillingRoutes(app: Express) {

  // ============================================================================
  // BEKO BILLING ENDPOINTS
  // ============================================================================
  
  /**
   * @swagger
   * /api/admin/billing/beko/enhanced:
   *   get:
   *     tags: [Admin - Billing]
   *     summary: Beko billing report (enhanced)
   *     description: Generate enhanced Beko billing report for warranty services
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: month
   *         required: true
   *         schema:
   *           type: integer
   *       - in: query
   *         name: year
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Billing report generated successfully
   *       400:
   *         description: Missing required parameters
   *       403:
   *         description: Admin access required
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  // ENHANCED BEKO BILLING - Automatsko hvatanje svih završenih servisa
  app.get("/api/admin/billing/beko/enhanced", jwtAuth, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Admin privilegije potrebne" });
      }

      const { month, year } = req.query;
      
      if (!month || !year) {
        return res.status(400).json({ 
          error: "Parametri month i year su obavezni" 
        });
      }

      const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDayOfMonth = new Date(parseInt(year as string), parseInt(month as string), 0).getDate();
      const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;
      
      const endDateWithTimestamp = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}T23:59:59.999Z`;
      const nextMonth = parseInt(month as string) + 1;
      const nextMonthYear = nextMonth > 12 ? parseInt(year as string) + 1 : parseInt(year as string);
      const nextMonthNum = nextMonth > 12 ? 1 : nextMonth;
      const nextMonthStr = `${nextMonthYear}-${String(nextMonthNum).padStart(2, '0')}-01`;

      console.log(`[ENHANCED BEKO BILLING] Automatsko hvatanje SVIH završenih servisa za ${month}/${year}`);
      console.log(`[ENHANCED BEKO BILLING] Brendovi: ${bekoBrands.join(', ')}`);
      console.log(`[ENHANCED BEKO BILLING] Date range: ${startDateStr} do ${endDateWithTimestamp}`);

      const services = await db
        .select({
          serviceId: schema.services.id,
          clientId: schema.services.clientId,
          applianceId: schema.services.applianceId,
          technicianId: schema.services.technicianId,
          description: schema.services.description,
          technicianNotes: schema.services.technicianNotes,
          usedParts: schema.services.usedParts,
          status: schema.services.status,
          warrantyStatus: schema.services.warrantyStatus,
          completedDate: schema.services.completedDate,
          createdAt: schema.services.createdAt,
          cost: schema.services.cost,
          billingPrice: schema.services.billingPrice,
          billingPriceReason: schema.services.billingPriceReason,
          excludeFromBilling: schema.services.excludeFromBilling,
          clientName: schema.clients.fullName,
          clientPhone: schema.clients.phone,
          clientAddress: schema.clients.address,
          clientCity: schema.clients.city,
          applianceCategory: schema.applianceCategories.name,
          manufacturerName: schema.manufacturers.name,
          applianceModel: schema.appliances.model,
          serialNumber: schema.appliances.serialNumber,
          technicianName: schema.technicians.fullName
        })
        .from(schema.services)
        .leftJoin(schema.clients, eq(schema.services.clientId, schema.clients.id))
        .leftJoin(schema.appliances, eq(schema.services.applianceId, schema.appliances.id))
        .leftJoin(schema.applianceCategories, eq(schema.appliances.categoryId, schema.applianceCategories.id))
        .leftJoin(schema.manufacturers, eq(schema.appliances.manufacturerId, schema.manufacturers.id))
        .leftJoin(schema.technicians, eq(schema.services.technicianId, schema.technicians.id))
        .where(
          and(
            eq(schema.services.status, 'completed'),
            eq(schema.services.warrantyStatus, 'u garanciji'),
            ne(schema.services.excludeFromBilling, true),
            or(
              eq(schema.manufacturers.name, 'Beko'),
              eq(schema.manufacturers.name, 'Grundig'),
              eq(schema.manufacturers.name, 'Blomberg')
            ),
            or(
              and(
                isNotNull(schema.services.completedDate),
                sql`LEFT(${schema.services.completedDate}, 10) >= ${startDateStr}`,
                sql`LEFT(${schema.services.completedDate}, 10) < ${nextMonthStr}`
              ),
              and(
                isNull(schema.services.completedDate),
                gte(schema.services.createdAt, startDateStr),
                or(
                  lt(schema.services.createdAt, nextMonthStr),
                  lte(schema.services.createdAt, endDateWithTimestamp)
                )
              )
            )
          )
        )
        .orderBy(
          desc(schema.services.completedDate),
          desc(schema.services.createdAt)
        );
      
      // Povuci utrošene rezervne dijelove za sve servise
      const serviceIds = services.map(s => s.serviceId);
      const partsAllocations = serviceIds.length > 0 ? await db
        .select({
          serviceId: schema.partsAllocations.serviceId,
          partName: schema.availableParts.partName,
          partNumber: schema.availableParts.partNumber,
          allocatedQuantity: schema.partsAllocations.allocatedQuantity,
          unitCost: schema.availableParts.unitCost,
        })
        .from(schema.partsAllocations)
        .leftJoin(schema.availableParts, eq(schema.partsAllocations.availablePartId, schema.availableParts.id))
        .where(sql`${schema.partsAllocations.serviceId} IN (${sql.raw(serviceIds.join(','))})`)
        : [];
      
      // Grupiši rezervne dijelove po servisima
      const partsByService = partsAllocations.reduce((acc, part) => {
        if (!acc[part.serviceId]) {
          acc[part.serviceId] = [];
        }
        acc[part.serviceId].push({
          partName: part.partName || '',
          partNumber: part.partNumber || '',
          quantity: part.allocatedQuantity || 0,
          unitCost: part.unitCost || ''
        });
        return acc;
      }, {} as Record<number, Array<{partName: string, partNumber: string, quantity: number, unitCost: string}>>);
      
      const billingServices = services.map(service => {
        const hasCompletedDate = service.completedDate && service.completedDate.trim() !== '';
        const displayDate = hasCompletedDate ? service.completedDate : service.createdAt;
        
        const billingAmount = (service.billingPrice !== null && service.billingPrice !== undefined && service.billingPrice !== '') 
          ? parseFloat(service.billingPrice) 
          : BEKO_STANDARD_TARIFF;
        
        // Formatiranje utrošenih rezervnih dijelova
        const usedPartsData = partsByService[service.serviceId] || [];
        const usedPartsText = service.usedParts || '';
        
        return {
          id: service.serviceId,
          serviceNumber: service.serviceId.toString(),
          clientName: service.clientName || 'Nepoznat klijent',
          clientPhone: service.clientPhone || '',
          clientAddress: service.clientAddress || '',
          clientCity: service.clientCity || '',
          applianceCategory: service.applianceCategory || '',
          manufacturerName: service.manufacturerName || '',
          applianceModel: service.applianceModel || '',
          serialNumber: service.serialNumber || '',
          technicianName: service.technicianName || 'Nepoznat serviser',
          completedDate: displayDate,
          originalCompletedDate: service.completedDate,
          cost: service.cost || 0,
          billingPrice: billingAmount,
          billingPriceReason: service.billingPriceReason || 'Standardna Beko tarifa',
          description: service.description || '',
          technicianNotes: service.technicianNotes || '',
          usedParts: usedPartsText,
          usedPartsDetails: usedPartsData,
          warrantyStatus: service.warrantyStatus || 'Nedefinirano',
          isWarrantyService: true,
          isAutoDetected: !hasCompletedDate,
          detectionMethod: hasCompletedDate ? 'completed_date' : 'created_at_fallback'
        };
      });

      const servicesByBrand = billingServices.reduce((groups, service) => {
        const brand = service.manufacturerName;
        if (!groups[brand]) {
          groups[brand] = [];
        }
        groups[brand].push(service);
        return groups;
      }, {} as Record<string, typeof billingServices>);

      console.log(`[ENHANCED BEKO BILLING] ✅ Pronađeno ${billingServices.length} servisa za period ${month}/${year}`);
      console.log(`[ENHANCED BEKO BILLING] Brendovi u rezultatima:`, Object.keys(servicesByBrand));

      res.json({
        month: parseInt(month as string),
        year: parseInt(year as string),
        brandGroup: 'Beko',
        bekoBrands: bekoBrands,
        services: billingServices,
        servicesByBrand: servicesByBrand,
        totalServices: billingServices.length,
        totalCost: billingServices.reduce((sum, s) => sum + (s.billingPrice || 0), 0),
        totalBillingAmount: billingServices.reduce((sum, s) => sum + (s.billingPrice || 0), 0),
        autoDetectedCount: billingServices.filter(s => s.isAutoDetected).length,
        detectionSummary: {
          withCompletedDate: billingServices.filter(s => !s.isAutoDetected).length,
          withUpdatedDateFallback: billingServices.filter(s => s.isAutoDetected).length
        },
        brandBreakdown: Object.keys(servicesByBrand).map(brand => ({
          brand,
          count: servicesByBrand[brand].length,
          cost: servicesByBrand[brand].reduce((sum, s) => sum + (s.billingPrice || 0), 0),
          billingAmount: servicesByBrand[brand].reduce((sum, s) => sum + (s.billingPrice || 0), 0)
        }))
      });

    } catch (error) {
      console.error('[ENHANCED BEKO BILLING] ❌ Greška:', error);
      res.status(500).json({ 
        error: 'Greška pri hvatanju Beko servisa',
        message: error instanceof Error ? error.message : 'Nepoznata greška'
      });
    }
  });

  // REGULAR BEKO BILLING - Samo servisi sa completedDate
  app.get("/api/admin/billing/beko", jwtAuth, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Admin privilegije potrebne" });
      }

      const { month, year } = req.query;
      
      if (!month || !year) {
        return res.status(400).json({ 
          error: "Parametri month i year su obavezni" 
        });
      }

      const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDayOfMonth = new Date(parseInt(year as string), parseInt(month as string), 0).getDate();
      const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

      console.log(`[REGULAR BEKO BILLING] Standardno hvatanje završenih servisa za ${month}/${year}`);
      console.log(`[REGULAR BEKO BILLING] Brendovi: ${bekoBrands.join(', ')}`);
      console.log(`[REGULAR BEKO BILLING] Date range: ${startDateStr} do ${endDateStr}`);

      const services = await db
        .select({
          serviceId: schema.services.id,
          clientId: schema.services.clientId,
          applianceId: schema.services.applianceId,
          technicianId: schema.services.technicianId,
          description: schema.services.description,
          technicianNotes: schema.services.technicianNotes,
          usedParts: schema.services.usedParts,
          status: schema.services.status,
          warrantyStatus: schema.services.warrantyStatus,
          completedDate: schema.services.completedDate,
          createdAt: schema.services.createdAt,
          cost: schema.services.cost,
          billingPrice: schema.services.billingPrice,
          billingPriceReason: schema.services.billingPriceReason,
          excludeFromBilling: schema.services.excludeFromBilling,
          clientName: schema.clients.fullName,
          clientPhone: schema.clients.phone,
          clientAddress: schema.clients.address,
          clientCity: schema.clients.city,
          applianceCategory: schema.applianceCategories.name,
          manufacturerName: schema.manufacturers.name,
          applianceModel: schema.appliances.model,
          serialNumber: schema.appliances.serialNumber,
          technicianName: schema.technicians.fullName
        })
        .from(schema.services)
        .leftJoin(schema.clients, eq(schema.services.clientId, schema.clients.id))
        .leftJoin(schema.appliances, eq(schema.services.applianceId, schema.appliances.id))
        .leftJoin(schema.applianceCategories, eq(schema.appliances.categoryId, schema.applianceCategories.id))
        .leftJoin(schema.manufacturers, eq(schema.appliances.manufacturerId, schema.manufacturers.id))
        .leftJoin(schema.technicians, eq(schema.services.technicianId, schema.technicians.id))
        .where(
          and(
            eq(schema.services.status, 'completed'),
            eq(schema.services.warrantyStatus, 'u garanciji'),
            ne(schema.services.excludeFromBilling, true),
            or(
              eq(schema.manufacturers.name, 'Beko'),
              eq(schema.manufacturers.name, 'Grundig'),
              eq(schema.manufacturers.name, 'Blomberg')
            ),
            and(
              isNotNull(schema.services.completedDate),
              sql`LEFT(${schema.services.completedDate}, 10) >= ${startDateStr}`,
              sql`LEFT(${schema.services.completedDate}, 10) <= ${endDateStr}`
            )
          )
        )
        .orderBy(
          desc(schema.services.completedDate)
        );

      // Povuci utrošene rezervne dijelove za sve servise
      const serviceIds = services.map(s => s.serviceId);
      const partsAllocations = serviceIds.length > 0 ? await db
        .select({
          serviceId: schema.partsAllocations.serviceId,
          partName: schema.availableParts.partName,
          partNumber: schema.availableParts.partNumber,
          allocatedQuantity: schema.partsAllocations.allocatedQuantity,
          unitCost: schema.availableParts.unitCost,
        })
        .from(schema.partsAllocations)
        .leftJoin(schema.availableParts, eq(schema.partsAllocations.availablePartId, schema.availableParts.id))
        .where(sql`${schema.partsAllocations.serviceId} IN (${sql.raw(serviceIds.join(','))})`)
        : [];
      
      // Grupiši rezervne dijelove po servisima
      const partsByService = partsAllocations.reduce((acc, part) => {
        if (!acc[part.serviceId]) {
          acc[part.serviceId] = [];
        }
        acc[part.serviceId].push({
          partName: part.partName || '',
          partNumber: part.partNumber || '',
          quantity: part.allocatedQuantity || 0,
          unitCost: part.unitCost || ''
        });
        return acc;
      }, {} as Record<number, Array<{partName: string, partNumber: string, quantity: number, unitCost: string}>>);

      const billingServices = services.map(service => {
        const billingAmount = (service.billingPrice !== null && service.billingPrice !== undefined && service.billingPrice !== '') 
          ? parseFloat(service.billingPrice) 
          : BEKO_STANDARD_TARIFF;
        
        const usedPartsData = partsByService[service.serviceId] || [];
        const usedPartsText = service.usedParts || '';
        
        return {
          id: service.serviceId,
          serviceNumber: service.serviceId.toString(),
          clientName: service.clientName || 'Nepoznat klijent',
          clientPhone: service.clientPhone || '',
          clientAddress: service.clientAddress || '',
          clientCity: service.clientCity || '',
          applianceCategory: service.applianceCategory || '',
          manufacturerName: service.manufacturerName || '',
          applianceModel: service.applianceModel || '',
          serialNumber: service.serialNumber || '',
          technicianName: service.technicianName || 'Nepoznat serviser',
          completedDate: service.completedDate,
          originalCompletedDate: service.completedDate,
          cost: service.cost || 0,
          billingPrice: billingAmount,
          billingPriceReason: service.billingPriceReason || 'Standardna Beko tarifa',
          description: service.description || '',
          technicianNotes: service.technicianNotes || '',
          usedParts: usedPartsText,
          usedPartsDetails: usedPartsData,
          warrantyStatus: service.warrantyStatus || 'Nedefinirano',
          isWarrantyService: true,
          isAutoDetected: false,
          detectionMethod: 'completed_date'
        };
      });

      const servicesByBrand = billingServices.reduce((groups, service) => {
        const brand = service.manufacturerName;
        if (!groups[brand]) {
          groups[brand] = [];
        }
        groups[brand].push(service);
        return groups;
      }, {} as Record<string, typeof billingServices>);

      const months = [
        { value: '01', label: 'Januar' },
        { value: '02', label: 'Februar' },
        { value: '03', label: 'Mart' },
        { value: '04', label: 'April' },
        { value: '05', label: 'Maj' },
        { value: '06', label: 'Jun' },
        { value: '07', label: 'Jul' },
        { value: '08', label: 'Avgust' },
        { value: '09', label: 'Septembar' },
        { value: '10', label: 'Oktobar' },
        { value: '11', label: 'Novembar' },
        { value: '12', label: 'Decembar' }
      ];

      const response = {
        month: months.find(m => m.value === String(month).padStart(2, '0'))?.label || String(month),
        year: parseInt(year as string),
        brandGroup: 'Beko',
        bekoBrands: bekoBrands,
        services: billingServices,
        servicesByBrand,
        totalServices: billingServices.length,
        totalCost: billingServices.reduce((sum, s) => sum + (s.billingPrice || 0), 0),
        totalBillingAmount: billingServices.reduce((sum, s) => sum + (s.billingPrice || 0), 0),
        autoDetectedCount: 0,
        detectionSummary: {
          withCompletedDate: billingServices.length,
          withUpdatedDateFallback: 0
        },
        brandBreakdown: Object.keys(servicesByBrand).map(brand => ({
          brand,
          count: servicesByBrand[brand].length,
          cost: servicesByBrand[brand].reduce((sum, s) => sum + (s.billingPrice || 0), 0),
          billingAmount: servicesByBrand[brand].reduce((sum, s) => sum + (s.billingPrice || 0), 0)
        }))
      };

      console.log(`[REGULAR BEKO BILLING] ✅ Pronađeno ${billingServices.length} servisa za period ${month}/${year}`);
      console.log(`[REGULAR BEKO BILLING] Brendovi u rezultatima:`, Object.keys(servicesByBrand));

      res.json(response);

    } catch (error) {
      console.error('[REGULAR BEKO BILLING] ❌ Greška:', error);
      res.status(500).json({ 
        error: 'Greška pri hvatanju Beko servisa',
        message: error instanceof Error ? error.message : 'Nepoznata greška'
      });
    }
  });

  // BEKO OUT-OF-WARRANTY BILLING
  app.get("/api/admin/billing/beko/out-of-warranty", jwtAuth, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Admin privilegije potrebne" });
      }

      const { month, year } = req.query;
      
      if (!month || !year) {
        return res.status(400).json({ 
          error: "Parametri month i year su obavezni" 
        });
      }

      const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDayOfMonth = new Date(parseInt(year as string), parseInt(month as string), 0).getDate();
      const nextMonth = parseInt(month as string) + 1;
      const nextMonthYear = nextMonth > 12 ? parseInt(year as string) + 1 : parseInt(year as string);
      const nextMonthNum = nextMonth > 12 ? 1 : nextMonth;
      const nextMonthStr = `${nextMonthYear}-${String(nextMonthNum).padStart(2, '0')}-01`;

      console.log(`[BEKO OUT-OF-WARRANTY BILLING] Hvatanje van garancije servisa za ${month}/${year}`);

      const services = await db
        .select({
          serviceId: schema.services.id,
          clientId: schema.services.clientId,
          applianceId: schema.services.applianceId,
          technicianId: schema.services.technicianId,
          description: schema.services.description,
          technicianNotes: schema.services.technicianNotes,
          status: schema.services.status,
          warrantyStatus: schema.services.warrantyStatus,
          completedDate: schema.services.completedDate,
          createdAt: schema.services.createdAt,
          cost: schema.services.cost,
          billingPrice: schema.services.billingPrice,
          billingPriceReason: schema.services.billingPriceReason,
          excludeFromBilling: schema.services.excludeFromBilling,
          clientName: schema.clients.fullName,
          clientPhone: schema.clients.phone,
          clientAddress: schema.clients.address,
          clientCity: schema.clients.city,
          applianceCategory: schema.applianceCategories.name,
          manufacturerName: schema.manufacturers.name,
          applianceModel: schema.appliances.model,
          serialNumber: schema.appliances.serialNumber,
          technicianName: schema.technicians.fullName
        })
        .from(schema.services)
        .leftJoin(schema.clients, eq(schema.services.clientId, schema.clients.id))
        .leftJoin(schema.appliances, eq(schema.services.applianceId, schema.appliances.id))
        .leftJoin(schema.applianceCategories, eq(schema.appliances.categoryId, schema.applianceCategories.id))
        .leftJoin(schema.manufacturers, eq(schema.appliances.manufacturerId, schema.manufacturers.id))
        .leftJoin(schema.technicians, eq(schema.services.technicianId, schema.technicians.id))
        .where(
          and(
            eq(schema.services.status, 'completed'),
            eq(schema.services.warrantyStatus, 'van garancije'),
            ne(schema.services.excludeFromBilling, true),
            or(
              eq(schema.manufacturers.name, 'Beko'),
              eq(schema.manufacturers.name, 'Grundig'),
              eq(schema.manufacturers.name, 'Blomberg')
            ),
            or(
              and(
                isNotNull(schema.services.completedDate),
                sql`LEFT(${schema.services.completedDate}, 10) >= ${startDateStr}`,
                sql`LEFT(${schema.services.completedDate}, 10) < ${nextMonthStr}`
              ),
              and(
                isNull(schema.services.completedDate),
                gte(schema.services.createdAt, startDateStr),
                lt(schema.services.createdAt, nextMonthStr)
              )
            )
          )
        )
        .orderBy(
          desc(schema.services.completedDate),
          desc(schema.services.createdAt)
        );

      const billingServices = services.map(service => {
        const hasCompletedDate = service.completedDate && service.completedDate.trim() !== '';
        const displayDate = hasCompletedDate ? service.completedDate : service.createdAt;
        
        const billingAmount = service.billingPrice 
          ? parseFloat(service.billingPrice) 
          : (service.cost ? parseFloat(service.cost.toString()) : 0);
        
        return {
          id: service.serviceId,
          serviceNumber: service.serviceId.toString(),
          clientName: service.clientName || 'Nepoznat klijent',
          clientPhone: service.clientPhone || '',
          clientAddress: service.clientAddress || '',
          clientCity: service.clientCity || '',
          applianceCategory: service.applianceCategory || '',
          manufacturerName: service.manufacturerName || '',
          applianceModel: service.applianceModel || '',
          serialNumber: service.serialNumber || '',
          technicianName: service.technicianName || 'Nepoznat serviser',
          completedDate: displayDate,
          originalCompletedDate: service.completedDate,
          cost: service.cost || 0,
          billingPrice: billingAmount,
          billingPriceReason: service.billingPriceReason || (service.cost ? 'Cijena iz servisa' : 'Nema unesenu cijenu'),
          description: service.description || '',
          warrantyStatus: service.warrantyStatus || 'Nedefinirano',
          isWarrantyService: false,
          isAutoDetected: !hasCompletedDate,
          detectionMethod: hasCompletedDate ? 'completed_date' : 'created_at_fallback'
        };
      });

      const totalAmount = billingServices.reduce((sum, s) => sum + s.billingPrice, 0);

      res.json({
        services: billingServices,
        totalServices: billingServices.length,
        totalAmount: totalAmount,
        month: parseInt(month as string),
        year: parseInt(year as string),
        brands: bekoBrands
      });

    } catch (error: any) {
      console.error("[BEKO OUT-OF-WARRANTY BILLING] Greška:", error);
      res.status(500).json({ error: "Greška pri dohvatanju van garancije billing izvještaja" });
    }
  });

  // ============================================================================
  // COMPLUS BILLING ENDPOINTS
  // ============================================================================

  // ENHANCED COMPLUS BILLING - Automatsko hvatanje svih završenih servisa
  app.get("/api/admin/billing/complus/enhanced", jwtAuth, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Admin privilegije potrebne" });
      }

      const { month, year } = req.query;
      
      if (!month || !year) {
        return res.status(400).json({ 
          error: "Parametri month i year su obavezni" 
        });
      }

      const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDayOfMonth = new Date(parseInt(year as string), parseInt(month as string), 0).getDate();
      const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;
      
      const endDateWithTimestamp = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}T23:59:59.999Z`;
      const nextMonth = parseInt(month as string) + 1;
      const nextMonthYear = nextMonth > 12 ? parseInt(year as string) + 1 : parseInt(year as string);
      const nextMonthNum = nextMonth > 12 ? 1 : nextMonth;
      const nextMonthStr = `${nextMonthYear}-${String(nextMonthNum).padStart(2, '0')}-01`;

      console.log(`[ENHANCED COMPLUS BILLING] Automatsko hvatanje SVIH završenih servisa za ${month}/${year}`);
      console.log(`[ENHANCED COMPLUS BILLING] Brendovi: ${complusBrands.join(', ')}`);
      console.log(`[ENHANCED COMPLUS BILLING] Date range: ${startDateStr} do ${endDateWithTimestamp}`);

      const services = await db
        .select({
          serviceId: schema.services.id,
          clientId: schema.services.clientId,
          applianceId: schema.services.applianceId,
          technicianId: schema.services.technicianId,
          description: schema.services.description,
          technicianNotes: schema.services.technicianNotes,
          usedParts: schema.services.usedParts,
          status: schema.services.status,
          warrantyStatus: schema.services.warrantyStatus,
          completedDate: schema.services.completedDate,
          createdAt: schema.services.createdAt,
          cost: schema.services.cost,
          billingPrice: schema.services.billingPrice,
          billingPriceReason: schema.services.billingPriceReason,
          excludeFromBilling: schema.services.excludeFromBilling,
          clientName: schema.clients.fullName,
          clientPhone: schema.clients.phone,
          clientAddress: schema.clients.address,
          clientCity: schema.clients.city,
          applianceCategory: schema.applianceCategories.name,
          manufacturerName: schema.manufacturers.name,
          applianceModel: schema.appliances.model,
          serialNumber: schema.appliances.serialNumber,
          technicianName: schema.technicians.fullName
        })
        .from(schema.services)
        .leftJoin(schema.clients, eq(schema.services.clientId, schema.clients.id))
        .leftJoin(schema.appliances, eq(schema.services.applianceId, schema.appliances.id))
        .leftJoin(schema.applianceCategories, eq(schema.appliances.categoryId, schema.applianceCategories.id))
        .leftJoin(schema.manufacturers, eq(schema.appliances.manufacturerId, schema.manufacturers.id))
        .leftJoin(schema.technicians, eq(schema.services.technicianId, schema.technicians.id))
        .where(
          and(
            eq(schema.services.status, 'completed'),
            eq(schema.services.warrantyStatus, 'u garanciji'),
            ne(schema.services.excludeFromBilling, true),
            or(
              eq(schema.manufacturers.name, 'Electrolux'),
              eq(schema.manufacturers.name, 'Elica'),
              eq(schema.manufacturers.name, 'Candy'),
              eq(schema.manufacturers.name, 'Hoover'),
              eq(schema.manufacturers.name, 'Turbo Air')
            ),
            or(
              and(
                isNotNull(schema.services.completedDate),
                sql`LEFT(${schema.services.completedDate}, 10) >= ${startDateStr}`,
                sql`LEFT(${schema.services.completedDate}, 10) < ${nextMonthStr}`
              ),
              and(
                isNull(schema.services.completedDate),
                gte(schema.services.createdAt, startDateStr),
                or(
                  lt(schema.services.createdAt, nextMonthStr),
                  lte(schema.services.createdAt, endDateWithTimestamp)
                )
              )
            )
          )
        )
        .orderBy(
          desc(schema.services.completedDate),
          desc(schema.services.createdAt)
        );
      
      // Povuci utrošene rezervne dijelove za sve servise
      const serviceIds = services.map(s => s.serviceId);
      const partsAllocations = serviceIds.length > 0 ? await db
        .select({
          serviceId: schema.partsAllocations.serviceId,
          partName: schema.availableParts.partName,
          partNumber: schema.availableParts.partNumber,
          allocatedQuantity: schema.partsAllocations.allocatedQuantity,
          unitCost: schema.availableParts.unitCost,
        })
        .from(schema.partsAllocations)
        .leftJoin(schema.availableParts, eq(schema.partsAllocations.availablePartId, schema.availableParts.id))
        .where(sql`${schema.partsAllocations.serviceId} IN (${sql.raw(serviceIds.join(','))})`)
        : [];
      
      // Grupiši rezervne dijelove po servisima
      const partsByService = partsAllocations.reduce((acc, part) => {
        if (!acc[part.serviceId]) {
          acc[part.serviceId] = [];
        }
        acc[part.serviceId].push({
          partName: part.partName || '',
          partNumber: part.partNumber || '',
          quantity: part.allocatedQuantity || 0,
          unitCost: part.unitCost || ''
        });
        return acc;
      }, {} as Record<number, Array<{partName: string, partNumber: string, quantity: number, unitCost: string}>>);
      
      const billingServices = services.map(service => {
        const hasCompletedDate = service.completedDate && service.completedDate.trim() !== '';
        const displayDate = hasCompletedDate ? service.completedDate : service.createdAt;
        
        const billingAmount = (service.billingPrice !== null && service.billingPrice !== undefined && service.billingPrice !== '') 
          ? parseFloat(service.billingPrice) 
          : COMPLUS_STANDARD_TARIFF;
        
        const usedPartsData = partsByService[service.serviceId] || [];
        const usedPartsText = service.usedParts || '';
        
        return {
          id: service.serviceId,
          serviceNumber: service.serviceId.toString(),
          clientName: service.clientName || 'Nepoznat klijent',
          clientPhone: service.clientPhone || '',
          clientAddress: service.clientAddress || '',
          clientCity: service.clientCity || '',
          applianceCategory: service.applianceCategory || '',
          manufacturerName: service.manufacturerName || '',
          applianceModel: service.applianceModel || '',
          serialNumber: service.serialNumber || '',
          technicianName: service.technicianName || 'Nepoznat serviser',
          completedDate: displayDate,
          originalCompletedDate: service.completedDate,
          cost: service.cost || 0,
          billingPrice: billingAmount,
          billingPriceReason: service.billingPriceReason || 'Standardna ComPlus tarifa',
          description: service.description || '',
          technicianNotes: service.technicianNotes || '',
          usedParts: usedPartsText,
          usedPartsDetails: usedPartsData,
          warrantyStatus: service.warrantyStatus || 'Nedefinirano',
          isAutoDetected: !hasCompletedDate,
          detectionMethod: hasCompletedDate ? 'completed_date' : 'created_at_fallback'
        };
      });

      const servicesByBrand = billingServices.reduce((groups, service) => {
        const brand = service.manufacturerName;
        if (!groups[brand]) {
          groups[brand] = [];
        }
        groups[brand].push(service);
        return groups;
      }, {} as Record<string, typeof billingServices>);

      console.log(`[ENHANCED COMPLUS BILLING] ✅ Pronađeno ${billingServices.length} servisa za period ${month}/${year}`);
      console.log(`[ENHANCED COMPLUS BILLING] Brendovi u rezultatima:`, Object.keys(servicesByBrand));

      res.json({
        month: parseInt(month as string),
        year: parseInt(year as string),
        brandGroup: 'ComPlus',
        complusBrands: complusBrands,
        services: billingServices,
        servicesByBrand: servicesByBrand,
        totalServices: billingServices.length,
        totalCost: billingServices.reduce((sum, s) => sum + (s.billingPrice || 0), 0),
        totalBillingAmount: billingServices.reduce((sum, s) => sum + (s.billingPrice || 0), 0),
        autoDetectedCount: billingServices.filter(s => s.isAutoDetected).length,
        detectionSummary: {
          withCompletedDate: billingServices.filter(s => !s.isAutoDetected).length,
          withUpdatedDateFallback: billingServices.filter(s => s.isAutoDetected).length
        },
        brandBreakdown: Object.keys(servicesByBrand).map(brand => ({
          brand,
          count: servicesByBrand[brand].length,
          cost: servicesByBrand[brand].reduce((sum, s) => sum + (s.billingPrice || 0), 0),
          billingAmount: servicesByBrand[brand].reduce((sum, s) => sum + (s.billingPrice || 0), 0)
        }))
      });

    } catch (error) {
      console.error('[ENHANCED COMPLUS BILLING] ❌ Greška:', error);
      res.status(500).json({ 
        error: 'Greška pri hvatanju ComPlus servisa',
        message: error instanceof Error ? error.message : 'Nepoznata greška'
      });
    }
  });

  // REGULAR COMPLUS BILLING - Samo servisi sa completedDate
  app.get("/api/admin/billing/complus", jwtAuth, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Admin privilegije potrebne" });
      }

      const { month, year } = req.query;
      
      if (!month || !year) {
        return res.status(400).json({ 
          error: "Parametri month i year su obavezni" 
        });
      }

      const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDayOfMonth = new Date(parseInt(year as string), parseInt(month as string), 0).getDate();
      const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

      console.log(`[REGULAR COMPLUS BILLING] Standardno hvatanje završenih servisa za ${month}/${year}`);
      console.log(`[REGULAR COMPLUS BILLING] Brendovi: ${complusBrands.join(', ')}`);
      console.log(`[REGULAR COMPLUS BILLING] Date range: ${startDateStr} do ${endDateStr}`);

      const services = await db
        .select({
          serviceId: schema.services.id,
          clientId: schema.services.clientId,
          applianceId: schema.services.applianceId,
          technicianId: schema.services.technicianId,
          description: schema.services.description,
          status: schema.services.status,
          warrantyStatus: schema.services.warrantyStatus,
          completedDate: schema.services.completedDate,
          createdAt: schema.services.createdAt,
          cost: schema.services.cost,
          billingPrice: schema.services.billingPrice,
          billingPriceReason: schema.services.billingPriceReason,
          clientName: schema.clients.fullName,
          clientPhone: schema.clients.phone,
          clientAddress: schema.clients.address,
          clientCity: schema.clients.city,
          applianceCategory: schema.applianceCategories.name,
          manufacturerName: schema.manufacturers.name,
          applianceModel: schema.appliances.model,
          serialNumber: schema.appliances.serialNumber,
          technicianName: schema.technicians.fullName
        })
        .from(schema.services)
        .leftJoin(schema.clients, eq(schema.services.clientId, schema.clients.id))
        .leftJoin(schema.appliances, eq(schema.services.applianceId, schema.appliances.id))
        .leftJoin(schema.applianceCategories, eq(schema.appliances.categoryId, schema.applianceCategories.id))
        .leftJoin(schema.manufacturers, eq(schema.appliances.manufacturerId, schema.manufacturers.id))
        .leftJoin(schema.technicians, eq(schema.services.technicianId, schema.technicians.id))
        .where(
          and(
            eq(schema.services.status, 'completed'),
            eq(schema.services.warrantyStatus, 'u garanciji'),
            ne(schema.services.excludeFromBilling, true),
            or(
              eq(schema.manufacturers.name, 'Electrolux'),
              eq(schema.manufacturers.name, 'Elica'),
              eq(schema.manufacturers.name, 'Candy'),
              eq(schema.manufacturers.name, 'Hoover'),
              eq(schema.manufacturers.name, 'Turbo Air')
            ),
            and(
              isNotNull(schema.services.completedDate),
              sql`LEFT(${schema.services.completedDate}, 10) >= ${startDateStr}`,
              sql`LEFT(${schema.services.completedDate}, 10) <= ${endDateStr}`
            )
          )
        )
        .orderBy(
          desc(schema.services.completedDate)
        );

      const billingServices = services.map(service => ({
        id: service.serviceId,
        serviceNumber: service.serviceId.toString(),
        clientName: service.clientName || 'Nepoznat klijent',
        clientPhone: service.clientPhone || '',
        clientAddress: service.clientAddress || '',
        clientCity: service.clientCity || '',
        applianceCategory: service.applianceCategory || '',
        manufacturerName: service.manufacturerName || '',
        applianceModel: service.applianceModel || '',
        serialNumber: service.serialNumber || '',
        technicianName: service.technicianName || 'Nepoznat serviser',
        completedDate: service.completedDate,
        originalCompletedDate: service.completedDate,
        cost: service.cost || 0,
        billingPrice: (() => {
          const amount = (service.billingPrice !== null && service.billingPrice !== undefined && service.billingPrice !== '') 
            ? parseFloat(service.billingPrice.toString())
            : 25.00;
          return amount;
        })(),
        billingPriceReason: service.billingPriceReason || 'Standardna ComPlus tarifa',
        description: service.description || '',
        warrantyStatus: service.warrantyStatus || 'Nedefinirano',
        isAutoDetected: false,
        detectionMethod: 'completed_date'
      }));

      const servicesByBrand = billingServices.reduce((groups, service) => {
        const brand = service.manufacturerName;
        if (!groups[brand]) {
          groups[brand] = [];
        }
        groups[brand].push(service);
        return groups;
      }, {} as Record<string, typeof billingServices>);

      const months = [
        { value: '01', label: 'Januar' },
        { value: '02', label: 'Februar' },
        { value: '03', label: 'Mart' },
        { value: '04', label: 'April' },
        { value: '05', label: 'Maj' },
        { value: '06', label: 'Jun' },
        { value: '07', label: 'Jul' },
        { value: '08', label: 'Avgust' },
        { value: '09', label: 'Septembar' },
        { value: '10', label: 'Oktobar' },
        { value: '11', label: 'Novembar' },
        { value: '12', label: 'Decembar' }
      ];

      const response = {
        month: months.find(m => m.value === String(month).padStart(2, '0'))?.label || String(month),
        year: parseInt(year as string),
        brandGroup: 'ComPlus',
        complusBrands: complusBrands,
        services: billingServices,
        servicesByBrand,
        totalServices: billingServices.length,
        totalCost: billingServices.reduce((sum, s) => sum + (s.billingPrice || 0), 0),
        totalBillingAmount: billingServices.reduce((sum, s) => sum + (s.billingPrice || 0), 0),
        autoDetectedCount: 0,
        detectionSummary: {
          withCompletedDate: billingServices.length,
          withUpdatedDateFallback: 0
        },
        brandBreakdown: Object.keys(servicesByBrand).map(brand => ({
          brand,
          count: servicesByBrand[brand].length,
          cost: servicesByBrand[brand].reduce((sum, s) => sum + (s.billingPrice || 0), 0),
          billingAmount: servicesByBrand[brand].reduce((sum, s) => sum + (s.billingPrice || 0), 0)
        }))
      };

      console.log(`[REGULAR COMPLUS BILLING] ✅ Pronađeno ${billingServices.length} servisa za period ${month}/${year}`);
      console.log(`[REGULAR COMPLUS BILLING] Brendovi u rezultatima:`, Object.keys(servicesByBrand));

      res.json(response);

    } catch (error) {
      console.error('[REGULAR COMPLUS BILLING] ❌ Greška:', error);
      res.status(500).json({ 
        error: 'Greška pri hvatanju ComPlus servisa',
        message: error instanceof Error ? error.message : 'Nepoznata greška'
      });
    }
  });

  // SMART COMPLUS BILLING - Auto-detekcija garancijskih servisa
  app.get('/api/admin/billing/complus/smart', jwtAuth, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Admin privilegije potrebne" });
      }

      const { month, year } = req.query;
      
      if (!month || !year) {
        return res.status(400).json({ 
          error: "Parametri month i year su obavezni" 
        });
      }

      const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDayOfMonth = new Date(parseInt(year as string), parseInt(month as string), 0).getDate();
      const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

      console.log(`[SMART COMPLUS BILLING] 🧠 Pametna auto-detekcija garancijskih servisa za ${month}/${year}`);
      console.log(`[SMART COMPLUS BILLING] Brendovi: ${complusBrands.join(', ')}`);
      console.log(`[SMART COMPLUS BILLING] Date range: ${startDateStr} do ${endDateStr}`);

      const services = await db
        .select({
          serviceId: schema.services.id,
          clientId: schema.services.clientId,
          applianceId: schema.services.applianceId,
          technicianId: schema.services.technicianId,
          description: schema.services.description,
          status: schema.services.status,
          warrantyStatus: schema.services.warrantyStatus,
          completedDate: schema.services.completedDate,
          createdAt: schema.services.createdAt,
          cost: schema.services.cost,
          clientName: schema.clients.fullName,
          clientPhone: schema.clients.phone,
          clientAddress: schema.clients.address,
          clientCity: schema.clients.city,
          applianceCategory: schema.applianceCategories.name,
          manufacturerName: schema.manufacturers.name,
          applianceModel: schema.appliances.model,
          serialNumber: schema.appliances.serialNumber,
          purchaseDate: schema.appliances.purchaseDate,
          technicianName: schema.technicians.fullName
        })
        .from(schema.services)
        .leftJoin(schema.clients, eq(schema.services.clientId, schema.clients.id))
        .leftJoin(schema.appliances, eq(schema.services.applianceId, schema.appliances.id))
        .leftJoin(schema.applianceCategories, eq(schema.appliances.categoryId, schema.applianceCategories.id))
        .leftJoin(schema.manufacturers, eq(schema.appliances.manufacturerId, schema.manufacturers.id))
        .leftJoin(schema.technicians, eq(schema.services.technicianId, schema.technicians.id))
        .where(
          and(
            eq(schema.services.status, 'completed'),
            or(
              eq(schema.manufacturers.name, 'Electrolux'),
              eq(schema.manufacturers.name, 'Elica'),
              eq(schema.manufacturers.name, 'Candy'),
              eq(schema.manufacturers.name, 'Hoover'),
              eq(schema.manufacturers.name, 'Turbo Air')
            ),
            or(
              and(
                isNotNull(schema.services.completedDate),
                gte(schema.services.completedDate, startDateStr),
                lte(schema.services.completedDate, endDateStr)
              ),
              and(
                isNull(schema.services.completedDate),
                gte(schema.services.createdAt, startDateStr),
                lte(schema.services.createdAt, endDateStr)
              )
            )
          )
        )
        .orderBy(
          desc(schema.services.completedDate),
          desc(schema.services.createdAt)
        );

      let autoDetectedWarrantyCount = 0;
      let overriddenCount = 0;

      const billingServices = services
        .map(service => {
          const hasCompletedDate = service.completedDate && service.completedDate.trim() !== '';
          const displayDate = hasCompletedDate ? service.completedDate : service.createdAt;
          const originalWarrantyStatus = service.warrantyStatus;
          
          let isSmartWarranty = false;
          let detectionReason = '';
          
          if (originalWarrantyStatus === 'u garanciji') {
            isSmartWarranty = true;
            detectionReason = 'original_warranty_status';
          }
          else if (service.purchaseDate && displayDate) {
            try {
              const purchaseDate = new Date(service.purchaseDate);
              const serviceDate = new Date(displayDate);
              const monthsDiff = (serviceDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
              
              if (monthsDiff <= 24 && monthsDiff >= 0) {
                isSmartWarranty = true;
                detectionReason = 'purchase_date_calculation';
                autoDetectedWarrantyCount++;
                
                if (originalWarrantyStatus !== 'u garanciji') {
                  overriddenCount++;
                }
              }
            } catch (error) {
              console.error(`[SMART COMPLUS] Greška pri računanju datuma za servis ${service.serviceId}:`, error);
            }
          }
          else if (originalWarrantyStatus === 'nepoznato') {
            try {
              const serviceDate = new Date(displayDate);
              const now = new Date();
              const daysDiff = (now.getTime() - serviceDate.getTime()) / (1000 * 60 * 60 * 24);
              
              if (daysDiff <= 365) {
                isSmartWarranty = true;
                detectionReason = 'recent_unknown_status';
                autoDetectedWarrantyCount++;
                overriddenCount++;
              }
            } catch (error) {
              console.error(`[SMART COMPLUS] Greška pri računanju recency za servis ${service.serviceId}:`, error);
            }
          }
          
          return {
            service,
            isSmartWarranty,
            detectionReason,
            originalWarrantyStatus,
            displayDate
          };
        })
        .filter(item => item.isSmartWarranty)
        .map(item => ({
          id: item.service.serviceId,
          serviceNumber: item.service.serviceId.toString(),
          clientName: item.service.clientName || 'Nepoznat klijent',
          clientPhone: item.service.clientPhone || '',
          clientAddress: item.service.clientAddress || '',
          clientCity: item.service.clientCity || '',
          applianceCategory: item.service.applianceCategory || '',
          manufacturerName: item.service.manufacturerName || '',
          applianceModel: item.service.applianceModel || '',
          serialNumber: item.service.serialNumber || '',
          technicianName: item.service.technicianName || 'Nepoznat serviser',
          completedDate: item.displayDate,
          originalCompletedDate: item.service.completedDate,
          cost: item.service.cost || 0,
          description: item.service.description || '',
          warrantyStatus: 'u garanciji',
          originalWarrantyStatus: item.originalWarrantyStatus,
          isAutoDetected: item.detectionReason !== 'original_warranty_status',
          detectionMethod: item.detectionReason,
          purchaseDate: item.service.purchaseDate
        }));

      const servicesByBrand = billingServices.reduce((groups, service) => {
        const brand = service.manufacturerName;
        if (!groups[brand]) {
          groups[brand] = [];
        }
        groups[brand].push(service);
        return groups;
      }, {} as Record<string, typeof billingServices>);

      const brandBreakdown = Object.entries(servicesByBrand).map(([brand, services]) => ({
        brand,
        count: services.length,
        cost: services.reduce((sum, s) => sum + (s.cost || 0), 0)
      }));

      const months = [
        { value: '01', label: 'Januar' }, { value: '02', label: 'Februar' }, { value: '03', label: 'Mart' },
        { value: '04', label: 'April' }, { value: '05', label: 'Maj' }, { value: '06', label: 'Jun' },
        { value: '07', label: 'Jul' }, { value: '08', label: 'Avgust' }, { value: '09', label: 'Septembar' },
        { value: '10', label: 'Oktobar' }, { value: '11', label: 'Novembar' }, { value: '12', label: 'Decembar' }
      ];

      const response = {
        month: months.find(m => m.value === String(month).padStart(2, '0'))?.label || String(month),
        year: parseInt(year as string),
        brandGroup: 'ComPlus Smart',
        complusBrands: complusBrands,
        services: billingServices,
        servicesByBrand,
        totalServices: billingServices.length,
        totalCost: billingServices.reduce((sum, s) => sum + (s.cost || 0), 0),
        autoDetectedCount: autoDetectedWarrantyCount,
        overriddenCount: overriddenCount,
        detectionSummary: {
          withOriginalWarrantyStatus: billingServices.filter(s => !s.isAutoDetected).length,
          autoDetectedByPurchaseDate: billingServices.filter(s => s.detectionMethod === 'purchase_date_calculation').length,
          autoDetectedByRecency: billingServices.filter(s => s.detectionMethod === 'recent_unknown_status').length
        },
        brandBreakdown
      };

      console.log(`[SMART COMPLUS BILLING] 🧠 Pronađeno ${billingServices.length} SMART garancijskih servisa (${autoDetectedWarrantyCount} auto-detektovanih, ${overriddenCount} prepisanih)`);
      console.log(`[SMART COMPLUS BILLING] Brendovi u rezultatima:`, Object.keys(servicesByBrand));

      res.json(response);

    } catch (error) {
      console.error('[SMART COMPLUS BILLING] ❌ Greška:', error);
      res.status(500).json({ 
        error: 'Greška pri pametnoj detekciji ComPlus servisa',
        message: error instanceof Error ? error.message : 'Nepoznata greška'
      });
    }
  });

  // COMPLUS OUT-OF-WARRANTY BILLING
  app.get("/api/admin/billing/complus/out-of-warranty", jwtAuth, async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Admin privilegije potrebne" });
      }

      const { month, year } = req.query;
      
      if (!month || !year) {
        return res.status(400).json({ 
          error: "Parametri month i year su obavezni" 
        });
      }

      const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDayOfMonth = new Date(parseInt(year as string), parseInt(month as string), 0).getDate();
      const nextMonth = parseInt(month as string) + 1;
      const nextMonthYear = nextMonth > 12 ? parseInt(year as string) + 1 : parseInt(year as string);
      const nextMonthNum = nextMonth > 12 ? 1 : nextMonth;
      const nextMonthStr = `${nextMonthYear}-${String(nextMonthNum).padStart(2, '0')}-01`;

      console.log(`[COMPLUS OUT-OF-WARRANTY BILLING] Hvatanje van garancije servisa za ${month}/${year}`);

      const services = await db
        .select({
          serviceId: schema.services.id,
          clientId: schema.services.clientId,
          applianceId: schema.services.applianceId,
          technicianId: schema.services.technicianId,
          description: schema.services.description,
          technicianNotes: schema.services.technicianNotes,
          status: schema.services.status,
          warrantyStatus: schema.services.warrantyStatus,
          completedDate: schema.services.completedDate,
          createdAt: schema.services.createdAt,
          cost: schema.services.cost,
          billingPrice: schema.services.billingPrice,
          billingPriceReason: schema.services.billingPriceReason,
          excludeFromBilling: schema.services.excludeFromBilling,
          clientName: schema.clients.fullName,
          clientPhone: schema.clients.phone,
          clientAddress: schema.clients.address,
          clientCity: schema.clients.city,
          applianceCategory: schema.applianceCategories.name,
          manufacturerName: schema.manufacturers.name,
          applianceModel: schema.appliances.model,
          serialNumber: schema.appliances.serialNumber,
          technicianName: schema.technicians.fullName
        })
        .from(schema.services)
        .leftJoin(schema.clients, eq(schema.services.clientId, schema.clients.id))
        .leftJoin(schema.appliances, eq(schema.services.applianceId, schema.appliances.id))
        .leftJoin(schema.applianceCategories, eq(schema.appliances.categoryId, schema.applianceCategories.id))
        .leftJoin(schema.manufacturers, eq(schema.appliances.manufacturerId, schema.manufacturers.id))
        .leftJoin(schema.technicians, eq(schema.services.technicianId, schema.technicians.id))
        .where(
          and(
            eq(schema.services.status, 'completed'),
            eq(schema.services.warrantyStatus, 'van garancije'),
            ne(schema.services.excludeFromBilling, true),
            or(
              eq(schema.manufacturers.name, 'Electrolux'),
              eq(schema.manufacturers.name, 'Elica'),
              eq(schema.manufacturers.name, 'Candy'),
              eq(schema.manufacturers.name, 'Hoover'),
              eq(schema.manufacturers.name, 'Turbo Air')
            ),
            or(
              and(
                isNotNull(schema.services.completedDate),
                sql`LEFT(${schema.services.completedDate}, 10) >= ${startDateStr}`,
                sql`LEFT(${schema.services.completedDate}, 10) < ${nextMonthStr}`
              ),
              and(
                isNull(schema.services.completedDate),
                gte(schema.services.createdAt, startDateStr),
                lt(schema.services.createdAt, nextMonthStr)
              )
            )
          )
        )
        .orderBy(
          desc(schema.services.completedDate),
          desc(schema.services.createdAt)
        );

      const billingServices = services.map(service => {
        const hasCompletedDate = service.completedDate && service.completedDate.trim() !== '';
        const displayDate = hasCompletedDate ? service.completedDate : service.createdAt;
        
        const billingAmount = service.billingPrice 
          ? parseFloat(service.billingPrice) 
          : (service.cost ? parseFloat(service.cost.toString()) : 0);
        
        return {
          id: service.serviceId,
          serviceNumber: service.serviceId.toString(),
          clientName: service.clientName || 'Nepoznat klijent',
          clientPhone: service.clientPhone || '',
          clientAddress: service.clientAddress || '',
          clientCity: service.clientCity || '',
          applianceCategory: service.applianceCategory || '',
          manufacturerName: service.manufacturerName || '',
          applianceModel: service.applianceModel || '',
          serialNumber: service.serialNumber || '',
          technicianName: service.technicianName || 'Nepoznat serviser',
          completedDate: displayDate,
          originalCompletedDate: service.completedDate,
          cost: service.cost || 0,
          billingPrice: billingAmount,
          billingPriceReason: service.billingPriceReason || (service.cost ? 'Cijena iz servisa' : 'Nema unesenu cijenu'),
          description: service.description || '',
          warrantyStatus: service.warrantyStatus || 'Nedefinirano',
          isWarrantyService: false,
          isAutoDetected: !hasCompletedDate,
          detectionMethod: hasCompletedDate ? 'completed_date' : 'created_at_fallback'
        };
      });

      const totalAmount = billingServices.reduce((sum, s) => sum + s.billingPrice, 0);

      res.json({
        services: billingServices,
        totalServices: billingServices.length,
        totalAmount: totalAmount,
        month: parseInt(month as string),
        year: parseInt(year as string),
        brands: complusBrands
      });

    } catch (error: any) {
      console.error("[COMPLUS OUT-OF-WARRANTY BILLING] Greška:", error);
      res.status(500).json({ error: "Greška pri dohvatanju van garancije billing izvještaja" });
    }
  });

  // ============================================================================
  // BILLING PRICE MANAGEMENT
  // ============================================================================

  // PATCH /api/admin/services/:id/billing - Ažurira billing cijenu i dokumentaciju za servis
  app.patch("/api/admin/services/:id/billing", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Nedostaje autorizacioni token" });
      }

      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      
      if (!decoded || !decoded.userId) {
        return res.status(401).json({ error: "Nevažeći token" });
      }

      if (decoded.role !== 'admin') {
        return res.status(403).json({ error: "Nemate dozvolu za ovu akciju" });
      }

      const serviceId = parseInt(req.params.id);
      if (isNaN(serviceId)) {
        return res.status(400).json({ error: "Nevažeći ID servisa" });
      }

      const { billingPrice, billingPriceReason } = req.body;
      
      console.log(`📝 [BILLING UPDATE] Primljeni podaci za servis #${serviceId}:`, { billingPrice, billingPriceReason, type: typeof billingPrice });
      
      if (billingPrice !== undefined && (typeof billingPrice !== 'number' || billingPrice < 0)) {
        return res.status(400).json({ error: "Nevažeća cijena - mora biti pozitivan broj" });
      }

      if (billingPriceReason !== undefined && typeof billingPriceReason !== 'string') {
        return res.status(400).json({ error: "Nevažeća dokumentacija - mora biti tekst" });
      }

      const existingService = await db.query.services.findFirst({
        where: eq(schema.services.id, serviceId)
      });

      if (!existingService) {
        return res.status(404).json({ error: "Servis nije pronađen" });
      }

      console.log(`🔍 [BILLING UPDATE] Postojeći billing podaci za servis #${serviceId}:`, {
        oldBillingPrice: existingService.billingPrice,
        oldBillingPriceReason: existingService.billingPriceReason
      });

      console.log(`🔧 [BILLING UPDATE] Izvršavam UPDATE sa:`, {
        serviceId,
        billingPriceString: billingPrice?.toString(),
        billingPriceReason: billingPriceReason
      });
      
      const updatedService = await db
        .update(schema.services)
        .set({
          billingPrice: (billingPrice !== undefined && billingPrice !== null) ? billingPrice.toString() : null,
          billingPriceReason: billingPriceReason || null
        })
        .where(eq(schema.services.id, serviceId))
        .returning();

      console.log(`✅ [BILLING UPDATE] Servis #${serviceId} ažuriran:`, {
        newBillingPrice: updatedService[0].billingPrice,
        newBillingPriceReason: updatedService[0].billingPriceReason,
        fullService: updatedService[0]
      });
      
      const verifyService = await db.query.services.findFirst({
        where: eq(schema.services.id, serviceId),
        columns: {
          id: true,
          billingPrice: true,
          billingPriceReason: true
        }
      });
      console.log(`🔍 [BILLING UPDATE] Verifikacija iz baze:`, verifyService);
      
      res.status(200).json({
        success: true,
        service: updatedService[0],
        message: "Billing podatci uspješno ažurirani"
      });
    } catch (error: any) {
      console.error("❌ [BILLING UPDATE] Greška pri ažuriranju billing podataka:", error);
      res.status(500).json({ error: "Greška pri ažuriranju billing podataka" });
    }
  });

  // ============================================================================
  // PDF GENERATION ENDPOINT - BEKO BILLING (PRODUCTION DATA)
  // ============================================================================

  /**
   * @swagger
   * /api/admin/billing/beko/enhanced/pdf/{year}/{month}:
   *   get:
   *     tags: [Admin - Billing]
   *     summary: Generate Beko billing PDF from production database
   *     description: Creates a PDF report for Beko warranty services using production data
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: year
   *         required: true
   *         schema:
   *           type: integer
   *       - in: path
   *         name: month
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: PDF generated successfully
   *         content:
   *           application/pdf:
   *             schema:
   *               type: string
   *               format: binary
   *       400:
   *         description: Invalid parameters
   *       403:
   *         description: Admin access required
   */

  app.get('/api/admin/billing/beko/enhanced/pdf/:year/:month', jwtAuth, requireRole(['admin']), async (req: Request, res: Response) => {
    console.log(`📄 [PDF GENERATION] PDF zahtjev za ${req.params.year}/${req.params.month}`);
    try {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);

      if (!year || !month || month < 1 || month > 12) {
        return res.status(400).json({ error: "Neispravni parametri godine ili meseca" });
      }

      console.log(`📄 [PDF GENERATION] Generisanje Beko billing PDF-a za ${month}/${year} iz PRODUKCIJSKE baze`);

      // Kreiranje datumskih raspona
      const startDate = new Date(year, month - 1, 1);
      const nextMonthDate = new Date(year, month, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const nextMonthStr = nextMonthDate.toISOString().split('T')[0];
      const endDateWithTimestamp = endDate.toISOString().replace('T', ' ').substring(0, 19);

      // Izvlačenje servisa iz PRODUKCIJSKE baze
      const services = await db
        .select({
          serviceId: schema.services.id,
          clientId: schema.services.clientId,
          applianceId: schema.services.applianceId,
          technicianId: schema.services.technicianId,
          description: schema.services.description,
          technicianNotes: schema.services.technicianNotes,
          usedParts: schema.services.usedParts,
          status: schema.services.status,
          warrantyStatus: schema.services.warrantyStatus,
          completedDate: schema.services.completedDate,
          createdAt: schema.services.createdAt,
          cost: schema.services.cost,
          billingPrice: schema.services.billingPrice,
          billingPriceReason: schema.services.billingPriceReason,
          excludeFromBilling: schema.services.excludeFromBilling,
          clientName: schema.clients.fullName,
          clientPhone: schema.clients.phone,
          clientAddress: schema.clients.address,
          clientCity: schema.clients.city,
          applianceCategory: schema.applianceCategories.name,
          manufacturerName: schema.manufacturers.name,
          applianceModel: schema.appliances.model,
          serialNumber: schema.appliances.serialNumber,
          technicianName: schema.technicians.fullName
        })
        .from(schema.services)
        .leftJoin(schema.clients, eq(schema.services.clientId, schema.clients.id))
        .leftJoin(schema.appliances, eq(schema.services.applianceId, schema.appliances.id))
        .leftJoin(schema.applianceCategories, eq(schema.appliances.categoryId, schema.applianceCategories.id))
        .leftJoin(schema.manufacturers, eq(schema.appliances.manufacturerId, schema.manufacturers.id))
        .leftJoin(schema.technicians, eq(schema.services.technicianId, schema.technicians.id))
        .where(
          and(
            eq(schema.services.status, 'completed'),
            eq(schema.services.warrantyStatus, 'u garanciji'),
            ne(schema.services.excludeFromBilling, true),
            or(
              eq(schema.manufacturers.name, 'Beko'),
              eq(schema.manufacturers.name, 'Grundig'),
              eq(schema.manufacturers.name, 'Blomberg')
            ),
            or(
              and(
                isNotNull(schema.services.completedDate),
                sql`LEFT(${schema.services.completedDate}, 10) >= ${startDateStr}`,
                sql`LEFT(${schema.services.completedDate}, 10) < ${nextMonthStr}`
              ),
              and(
                isNull(schema.services.completedDate),
                gte(schema.services.createdAt, startDateStr),
                or(
                  lt(schema.services.createdAt, nextMonthStr),
                  lte(schema.services.createdAt, endDateWithTimestamp)
                )
              )
            )
          )
        )
        .orderBy(
          desc(schema.services.completedDate),
          desc(schema.services.createdAt)
        );

      // Izvlačenje rezervnih dijelova
      const serviceIds = services.map(s => s.serviceId);
      const partsAllocations = serviceIds.length > 0 ? await db
        .select({
          serviceId: schema.partsAllocations.serviceId,
          partName: schema.availableParts.partName,
          partNumber: schema.availableParts.partNumber,
          allocatedQuantity: schema.partsAllocations.allocatedQuantity,
          unitCost: schema.availableParts.unitCost,
        })
        .from(schema.partsAllocations)
        .leftJoin(schema.availableParts, eq(schema.partsAllocations.availablePartId, schema.availableParts.id))
        .where(sql`${schema.partsAllocations.serviceId} IN (${sql.raw(serviceIds.join(','))})`)
        : [];

      // Grupisanje rezervnih dijelova po servisima
      const partsByService = partsAllocations.reduce((acc, part) => {
        if (!acc[part.serviceId]) {
          acc[part.serviceId] = [];
        }
        acc[part.serviceId].push({
          partName: part.partName || '',
          partNumber: part.partNumber || '',
          quantity: part.allocatedQuantity || 0,
          unitCost: part.unitCost || ''
        });
        return acc;
      }, {} as Record<number, Array<{partName: string, partNumber: string, quantity: number, unitCost: string}>>);

      // Formatiranje servisa
      const billingServices = services.map(service => {
        const hasCompletedDate = service.completedDate && service.completedDate.trim() !== '';
        const displayDate = hasCompletedDate ? service.completedDate : service.createdAt;
        
        const billingAmount = (service.billingPrice !== null && service.billingPrice !== undefined && service.billingPrice !== '') 
          ? parseFloat(service.billingPrice) 
          : BEKO_STANDARD_TARIFF;
        
        const usedPartsData = partsByService[service.serviceId] || [];
        const usedPartsText = service.usedParts || '';
        
        return {
          id: service.serviceId,
          serviceNumber: service.serviceId.toString(),
          clientName: service.clientName || 'Nepoznat klijent',
          clientPhone: service.clientPhone || '',
          clientAddress: service.clientAddress || '',
          clientCity: service.clientCity || '',
          applianceCategory: service.applianceCategory || '',
          manufacturerName: service.manufacturerName || '',
          applianceModel: service.applianceModel || '',
          serialNumber: service.serialNumber || '',
          technicianName: service.technicianName || 'Nepoznat serviser',
          completedDate: displayDate,
          cost: service.cost || 0,
          billingPrice: billingAmount,
          billingPriceReason: service.billingPriceReason || 'Standardna Beko tarifa',
          description: service.description || '',
          technicianNotes: service.technicianNotes || '',
          usedParts: usedPartsText,
          usedPartsDetails: usedPartsData
        };
      });

      // Kalkulacija ukupnih vrednosti
      const totalServices = billingServices.length;
      const totalBillingAmount = billingServices.reduce((sum, s) => sum + (s.billingPrice || 0), 0);
      
      const brandBreakdown = billingServices.reduce((acc, service) => {
        const brand = service.manufacturerName;
        const existing = acc.find(b => b.brand === brand);
        if (existing) {
          existing.count++;
          existing.totalAmount += service.billingPrice || 0;
        } else {
          acc.push({
            brand,
            count: 1,
            totalAmount: service.billingPrice || 0
          });
        }
        return acc;
      }, [] as Array<{brand: string, count: number, totalAmount: number}>);

      const monthNames = ['Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun', 'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'];
      const monthName = monthNames[month - 1];

      console.log(`📊 [PDF GENERATION] Pronađeno ${totalServices} servisa, ukupna vrednost: ${totalBillingAmount.toFixed(2)}€`);

      // Kreiranje HTML sadržaja za PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Beko Fakturisanje - ${monthName} ${year}</title>
            <style>
              @page { size: A4 landscape; margin: 15mm; }
              body { 
                font-family: Arial, sans-serif; 
                margin: 0; 
                font-size: 8px; 
                line-height: 1.2; 
              }
              .header { 
                text-align: center; 
                margin-bottom: 15px; 
                border-bottom: 2px solid #333; 
                padding-bottom: 8px; 
              }
              .header h1 { margin: 0; font-size: 18px; color: #d32f2f; }
              .header h2 { margin: 5px 0; font-size: 14px; color: #666; }
              .header p { margin: 3px 0; font-size: 10px; color: #666; }
              .summary { 
                display: flex; 
                justify-content: space-around; 
                margin-bottom: 12px; 
                padding: 8px; 
                background: #f5f5f5; 
                border-radius: 5px; 
                font-size: 9px;
              }
              .summary div { text-align: center; }
              .summary strong { color: #d32f2f; }
              .services-table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-top: 10px; 
                font-size: 7px;
              }
              .services-table th { 
                background: #d32f2f; 
                color: white; 
                padding: 4px 2px; 
                text-align: left; 
                font-weight: bold; 
                border: 1px solid #b71c1c;
                font-size: 7px;
              }
              .services-table td { 
                border: 1px solid #ccc; 
                padding: 3px 2px; 
                vertical-align: top;
                max-width: 80px;
                overflow: hidden;
                text-overflow: ellipsis;
                font-size: 7px;
              }
              .services-table tr:nth-child(even) { background: #f9f9f9; }
              .service-number { font-weight: bold; color: #d32f2f; }
              .cost { font-weight: bold; color: #2e7d32; }
              .brand { font-size: 6px; color: #666; }
              .phone { font-size: 6px; }
              .serial { font-size: 6px; font-family: monospace; }
              .notes { font-size: 6px; max-height: 30px; overflow: hidden; }
              .footer { 
                margin-top: 10px; 
                text-align: center; 
                font-size: 7px; 
                color: #666; 
                border-top: 1px solid #ccc;
                padding-top: 5px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>BEKO FAKTURISANJE - GARANCIJSKI SERVISI</h1>
              <h2>${monthName} ${year}</h2>
              <p>Svi Beko brendovi (Beko, Grundig, Blomberg) | Frigo Sistem Todosijević</p>
            </div>
            
            <div class="summary">
              <div><strong>Ukupno servisa:</strong><br>${totalServices}</div>
              <div><strong>Ukupna vrednost:</strong><br>${totalBillingAmount.toFixed(2)} €</div>
              <div><strong>Brendovi:</strong><br>${brandBreakdown.map(b => `${b.brand}: ${b.count} (${b.totalAmount.toFixed(2)}€)`).join(' | ')}</div>
            </div>
            
            <table class="services-table">
              <thead>
                <tr>
                  <th style="width: 3%;">#</th>
                  <th style="width: 9%;">Klijent</th>
                  <th style="width: 6%;">Telefon</th>
                  <th style="width: 10%;">Adresa</th>
                  <th style="width: 6%;">Grad</th>
                  <th style="width: 7%;">Uređaj</th>
                  <th style="width: 5%;">Brend</th>
                  <th style="width: 8%;">Model</th>
                  <th style="width: 7%;">Serijski #</th>
                  <th style="width: 7%;">Serviser</th>
                  <th style="width: 5%;">Datum</th>
                  <th style="width: 4%;">Cena</th>
                  <th style="width: 11%;">Izvršeni rad</th>
                  <th style="width: 12%;">Utrošeni dijelovi</th>
                </tr>
              </thead>
              <tbody>
                ${billingServices.map(service => {
                  const partsText = service.usedPartsDetails && service.usedPartsDetails.length > 0
                    ? service.usedPartsDetails.map(p => `${p.partName} x${p.quantity}`).join(', ')
                    : (service.usedParts || '-');
                  
                  const displayDate = service.completedDate ? service.completedDate.substring(0, 10).split('-').reverse().join('.') : '-';
                  
                  return `
                  <tr>
                    <td class="service-number">#${service.serviceNumber}</td>
                    <td>${service.clientName}</td>
                    <td class="phone">${service.clientPhone}</td>
                    <td>${service.clientAddress}</td>
                    <td>${service.clientCity}</td>
                    <td>${service.applianceCategory}</td>
                    <td class="brand">${service.manufacturerName}</td>
                    <td>${service.applianceModel}</td>
                    <td class="serial">${service.serialNumber}</td>
                    <td>${service.technicianName}</td>
                    <td>${displayDate}</td>
                    <td class="cost">${service.billingPrice.toFixed(2)}€</td>
                    <td class="notes">${service.technicianNotes || '-'}</td>
                    <td class="notes">${partsText}</td>
                  </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
            
            <div class="footer">
              Izveštaj generisan: ${new Date().toLocaleString('sr-RS', { dateStyle: 'short', timeStyle: 'short' })} | 
              Frigo Sistem Todosijević | 
              Ukupno servisa: ${totalServices} | 
              Ukupna vrednost: ${totalBillingAmount.toFixed(2)} €
            </div>
          </body>
        </html>
      `;

      // Pokretanje Puppeteer-a i generisanje PDF-a
      console.log(`🚀 [PDF GENERATION] Pokretanje Puppeteer-a...`);
      const browser = await puppeteer.launch({
        headless: true,
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--single-process']
      });

      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: true,
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm'
        },
        printBackground: true
      });

      await browser.close();

      // Čuvanje PDF-a u attached_assets folder
      const fileName = `Beko_Billing_${monthName}_${year}_${Date.now()}.pdf`;
      const filePath = path.join(process.cwd(), 'attached_assets', fileName);
      
      await writeFile(filePath, pdfBuffer);

      console.log(`✅ [PDF GENERATION] PDF uspešno generisan: ${fileName}`);
      console.log(`📁 [PDF GENERATION] Putanja: ${filePath}`);

      // Slanje PDF-a korisniku
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(pdfBuffer);

    } catch (error: any) {
      console.error("❌ [PDF GENERATION] Greška pri generisanju PDF-a:", error);
      res.status(500).json({ 
        error: "Greška pri generisanju PDF izvještaja",
        details: error.message 
      });
    }
  });

  console.log("✅ Billing routes registered");
}
