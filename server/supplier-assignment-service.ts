/**
 * SUPPLIER ASSIGNMENT SERVICE
 * 
 * Automatski pronalazi i dodeljuje najboljeg dobavljača za rezervne delove
 * Kreiran za potpunu integraciju admin ordering sistema sa supplier portalom
 */

import { storage } from './storage.js';
import { emailService } from './email-service.js';
import type { Supplier, SupplierOrder, InsertSupplierOrder } from '../shared/schema/index.js';

export interface SupplierAssignmentRequest {
  sparePartOrderId: number;
  brandName?: string;
  manufacturerName?: string;
  partName: string;
  partNumber?: string;
  quantity: number;
  urgency: 'normal' | 'high' | 'urgent';
  warrantyStatus: 'u garanciji' | 'van garancije';
  description?: string;
  serviceId?: number;
}

export interface SupplierAssignmentResult {
  success: boolean;
  supplier?: Supplier;
  supplierOrder?: SupplierOrder;
  message: string;
  errorCode?: string;
}

class SupplierAssignmentService {

  /**
   * Glavni metod - dodeljuje dobavljača i kreira supplier_order
   */
  async assignSupplierToOrder(request: SupplierAssignmentRequest): Promise<SupplierAssignmentResult> {
    try {
      console.log(`[SUPPLIER ASSIGNMENT] Processing assignment for spare part order #${request.sparePartOrderId}`);

      // 1. Pronađi najboljeg dobavljača
      const supplier = await this.findBestSupplier(request);
      
      if (!supplier) {
        return {
          success: false,
          message: 'Nije pronađen odgovarajući dobavljač za ovaj brend',
          errorCode: 'NO_SUPPLIER_FOUND'
        };
      }

      console.log(`[SUPPLIER ASSIGNMENT] Selected supplier: ${supplier.name} (ID: ${supplier.id}, Priority: ${supplier.priority})`);

      // 2. Kreiraj supplier_order zapis
      const supplierOrder = await this.createSupplierOrder(supplier.id, request);

      console.log(`[SUPPLIER ASSIGNMENT] Created supplier order #${supplierOrder.id}`);

      // 3. Pošalji email notifikaciju dobavljaču
      await this.sendSupplierNotification(supplier, supplierOrder, request);

      return {
        success: true,
        supplier,
        supplierOrder,
        message: `Uspešno dodeljeno dobavljaču ${supplier.name}`
      };

    } catch (error) {
      console.error('[SUPPLIER ASSIGNMENT] Error:', error);
      return {
        success: false,
        message: `Greška pri dodeljivanju dobavljača: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errorCode: 'ASSIGNMENT_ERROR'
      };
    }
  }

  /**
   * Pronalazi najboljeg dobavljača za dati brend
   */
  private async findBestSupplier(request: SupplierAssignmentRequest): Promise<Supplier | null> {
    try {
      // Dohvati sve aktivne dobavljače
      const activeSuppliers = await storage.getActiveSuppliers();

      if (activeSuppliers.length === 0) {
        console.warn('[SUPPLIER ASSIGNMENT] No active suppliers found');
        return null;
      }

      // Odredi brend za pretragu
      const brandToSearch = request.brandName || request.manufacturerName;

      if (!brandToSearch) {
        // Ako nema brenda, vrati dobavljača sa najvišim prioritetom
        console.log('[SUPPLIER ASSIGNMENT] No brand specified, selecting highest priority supplier');
        return activeSuppliers[0]; // Već sortirano po prioritetu
      }

      // Filtriraj dobavljače koji podržavaju ovaj brend
      const matchingSuppliers = activeSuppliers.filter(supplier => {
        if (!supplier.supportedBrands) return false;

        try {
          // Parse supported brands (može biti JSON array ili string)
          let supportedBrands: string[] = [];
          
          if (supplier.supportedBrands.trim().startsWith('[')) {
            supportedBrands = JSON.parse(supplier.supportedBrands);
          } else {
            supportedBrands = supplier.supportedBrands.split(',').map(b => b.trim());
          }

          // Proveri da li neki od podržanih brendova odgovara
          const brandLower = brandToSearch.toLowerCase();
          return supportedBrands.some(supportedBrand => {
            const supportedLower = supportedBrand.toLowerCase();
            return supportedLower.includes(brandLower) || 
                   brandLower.includes(supportedLower) ||
                   this.areBrandsSimilar(supportedLower, brandLower);
          });

        } catch (error) {
          console.warn(`[SUPPLIER ASSIGNMENT] Error parsing brands for supplier ${supplier.name}:`, error);
          return false;
        }
      });

      if (matchingSuppliers.length === 0) {
        console.warn(`[SUPPLIER ASSIGNMENT] No suppliers found for brand: ${brandToSearch}`);
        // Fallback: vrati dobavljača sa najvišim prioritetom
        return activeSuppliers[0];
      }

      // Sortiraj po prioritetu i vrati najboljeg
      matchingSuppliers.sort((a, b) => b.priority - a.priority);
      
      console.log(`[SUPPLIER ASSIGNMENT] Found ${matchingSuppliers.length} matching suppliers for brand ${brandToSearch}`);
      console.log(`[SUPPLIER ASSIGNMENT] Selected: ${matchingSuppliers[0].name} (priority: ${matchingSuppliers[0].priority})`);

      return matchingSuppliers[0];

    } catch (error) {
      console.error('[SUPPLIER ASSIGNMENT] Error finding supplier:', error);
      return null;
    }
  }

  /**
   * Proverava da li su dva brenda slična (npr. Electrolux i Electrolux Service)
   */
  private areBrandsSimilar(brand1: string, brand2: string): boolean {
    // Ukloni česte sufikse
    const cleanBrand1 = brand1.replace(/\s*(service|servis|parts|delovi)\s*/gi, '').trim();
    const cleanBrand2 = brand2.replace(/\s*(service|servis|parts|delovi)\s*/gi, '').trim();
    
    return cleanBrand1 === cleanBrand2;
  }

  /**
   * Kreira supplier_order zapis u bazi
   */
  private async createSupplierOrder(
    supplierId: number, 
    request: SupplierAssignmentRequest
  ): Promise<SupplierOrder> {
    try {
      const orderNumber = this.generateOrderNumber(request.sparePartOrderId);
      const estimatedDelivery = this.calculateEstimatedDelivery(7); // Default 7 days

      const supplierOrderData: InsertSupplierOrder = {
        supplierId,
        sparePartOrderId: request.sparePartOrderId,
        orderNumber,
        status: 'pending',
        estimatedDelivery,
        currency: 'EUR'
      };

      const supplierOrder = await storage.createSupplierOrder(supplierOrderData);
      
      return supplierOrder;

    } catch (error) {
      console.error('[SUPPLIER ASSIGNMENT] Error creating supplier order:', error);
      throw error;
    }
  }

  /**
   * Generiše jedinstveni broj porudžbine
   */
  private generateOrderNumber(sparePartOrderId: number): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `SPO-${sparePartOrderId}-${timestamp}-${random}`;
  }

  /**
   * Računa procenjeni datum isporuke
   */
  private calculateEstimatedDelivery(days: number): Date {
    const delivery = new Date();
    delivery.setDate(delivery.getDate() + days);
    return delivery;
  }

  /**
   * Šalje email notifikaciju dobavljaču
   */
  private async sendSupplierNotification(
    supplier: Supplier,
    supplierOrder: SupplierOrder,
    request: SupplierAssignmentRequest
  ): Promise<void> {
    try {
      // Dohvati dodatne informacije ako postoji serviceId
      let serviceDetails = '';
      if (request.serviceId) {
        try {
          const service = await storage.getAdminServiceById(request.serviceId);
          if (service) {
            serviceDetails = `
=== INFORMACIJE O SERVISU ===
Servis ID: #${service.id}
Klijent: ${service.clientName}
Telefon: ${service.clientPhone}
Adresa: ${service.clientAddress}, ${service.clientCity}
Aparat: ${service.manufacturerName || ''} ${service.applianceModel || ''}
Problem: ${service.description || 'N/A'}
`;
          }
        } catch (error) {
          console.warn('[SUPPLIER ASSIGNMENT] Could not fetch service details:', error);
        }
      }

      const subject = `Nova porudžbina rezervnog dela - ${request.partName}`;
      const body = `
Poštovani ${supplier.contactPerson || supplier.name},

Imate novu porudžbinu rezervnog dela u sistemu.

=== REZERVNI DEO ===
Naziv: ${request.partName}
${request.partNumber ? `Kataloški broj: ${request.partNumber}` : ''}
Količina: ${request.quantity}
Hitnost: ${request.urgency === 'urgent' ? '🔴 HITNO' : request.urgency === 'high' ? '🟡 Visoka' : '🟢 Normalna'}
Garancija: ${request.warrantyStatus}
${request.description ? `Opis: ${request.description}` : ''}
${serviceDetails}

=== PORUDŽBINA ===
Broj porudžbine: ${supplierOrder.orderNumber}
Datum: ${new Date().toLocaleDateString('sr-RS')}
Procenjena isporuka: ${supplierOrder.estimatedDelivery ? new Date(supplierOrder.estimatedDelivery).toLocaleDateString('sr-RS') : 'N/A'}

=== SLEDEĆI KORACI ===
1. Prijavite se na vaš dobavljač portal
2. Proverite detalje porudžbine
3. Kliknite "Odvojio deo" kada pripremite rezervni deo
4. Kliknite "Poslao deo" kada pošaljete rezervni deo

Portal: ${process.env.REPLIT_DEV_DOMAIN || 'https://your-domain.replit.app'}/auth-page

Hvala na saradnji!

---
Automatska notifikacija
Frigo Sistem Todosijević
      `.trim();

      await emailService.sendEmail({
        to: supplier.email,
        subject,
        textContent: body,
        htmlContent: body
      });

      console.log(`[SUPPLIER ASSIGNMENT] Email sent to ${supplier.email}`);

    } catch (error) {
      console.error('[SUPPLIER ASSIGNMENT] Error sending email:', error);
      // Ne bacaj grešku - email nije kritičan za proces
    }
  }

  /**
   * Ažurira spare_part_order sa informacijama o dodeljenom dobavljaču
   */
  async updateSparePartOrderWithSupplier(
    sparePartOrderId: number, 
    supplierName: string
  ): Promise<void> {
    try {
      await storage.updateSparePartOrder(sparePartOrderId, {
        supplierName,
        status: 'ordered',
        orderDate: new Date()
      });
    } catch (error) {
      console.error('[SUPPLIER ASSIGNMENT] Error updating spare part order:', error);
      throw error;
    }
  }

  /**
   * Sinhronizuje status između supplier_order i spare_part_order
   */
  async synchronizeStatus(
    supplierOrderId: number,
    newStatus: 'pending' | 'separated' | 'sent' | 'delivered' | 'cancelled'
  ): Promise<void> {
    try {
      const supplierOrder = await storage.getSupplierOrder(supplierOrderId);
      
      if (!supplierOrder) {
        throw new Error('Supplier order not found');
      }

      // Mapiranje supplier_order statusa na spare_part_order status
      const statusMap: Record<string, string> = {
        'pending': 'ordered',
        'separated': 'ordered',
        'sent': 'waiting_delivery',
        'delivered': 'received',
        'cancelled': 'cancelled'
      };

      const sparePartStatus = statusMap[newStatus] || 'ordered';

      // Ažuriraj spare_part_order
      await storage.updateSparePartOrder(supplierOrder.sparePartOrderId, {
        status: sparePartStatus
      });

      console.log(`[SUPPLIER ASSIGNMENT] Synchronized status: ${newStatus} → ${sparePartStatus}`);

    } catch (error) {
      console.error('[SUPPLIER ASSIGNMENT] Error synchronizing status:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const supplierAssignmentService = new SupplierAssignmentService();
