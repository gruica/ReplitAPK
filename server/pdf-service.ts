import puppeteer from 'puppeteer';
import { storage } from './storage';

interface ServicePDFData {
  service: any;
  client: any;
  appliance: any;
  technician: any;
}

export class PDFService {
  
  // Generisanje HTML template-a za PDF
  private generateServiceReportHTML(data: ServicePDFData): string {
    const { service, client, appliance, technician } = data;
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Servisni izvještaj #${service.id}</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          margin: 0;
          padding: 20px;
          font-size: 14px;
          line-height: 1.6;
          color: #333;
        }
        .header {
          text-align: center;
          border-bottom: 3px solid #2563eb;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header h1 {
          color: #2563eb;
          margin: 0;
          font-size: 28px;
        }
        .header h2 {
          color: #64748b;
          margin: 5px 0;
          font-size: 18px;
          font-weight: normal;
        }
        .section {
          margin-bottom: 25px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
        }
        .section-title {
          color: #1e40af;
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 15px;
          border-bottom: 2px solid #dbeafe;
          padding-bottom: 8px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }
        .info-item {
          margin-bottom: 10px;
        }
        .info-label {
          font-weight: bold;
          color: #475569;
          display: inline-block;
          width: 140px;
        }
        .info-value {
          color: #1e293b;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
        }
        .status-pending { background: #fef3c7; color: #92400e; }
        .status-in-progress { background: #dbeafe; color: #1d4ed8; }
        .status-completed { background: #d1fae5; color: #047857; }
        .status-cancelled { background: #fee2e2; color: #dc2626; }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 12px;
          color: #64748b;
          border-top: 1px solid #e2e8f0;
          padding-top: 20px;
        }
        .signature-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
        }
        .signature-box {
          text-align: center;
          padding: 20px;
          border: 1px dashed #94a3b8;
          border-radius: 8px;
        }
        .date-created {
          text-align: right;
          color: #64748b;
          font-size: 12px;
          margin-bottom: 20px;
        }
      </style>
    </head>
    <body>
      <div class="date-created">
        Izvještaj kreiran: ${new Date().toLocaleDateString('sr-RS', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </div>

      <div class="header">
        <h1>FRIGO SISTEM TODOSIJEVIĆ</h1>
        <h2>Servisni izvještaj #${service.id}</h2>
        <p>Servis bijele tehnike | Crna Gora</p>
      </div>

      <div class="section">
        <div class="section-title">📋 Osnovne informacije o servisu</div>
        <div class="info-grid">
          <div>
            <div class="info-item">
              <span class="info-label">Status:</span>
              <span class="status-badge status-${service.status}">
                ${service.status === 'pending' ? 'Na čekanju' : 
                  service.status === 'in_progress' ? 'U toku' :
                  service.status === 'completed' ? 'Završen' :
                  service.status === 'cancelled' ? 'Otkazan' : service.status}
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">Prioritet:</span>
              <span class="info-value">${service.priority || 'Normalan'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Kreiran:</span>
              <span class="info-value">${new Date(service.createdAt).toLocaleDateString('sr-RS')}</span>
            </div>
          </div>
          <div>
            <div class="info-item">
              <span class="info-label">Zakazano:</span>
              <span class="info-value">${service.scheduledDate ? new Date(service.scheduledDate).toLocaleDateString('sr-RS') : 'Nije zakazano'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Završeno:</span>
              <span class="info-value">${service.completedDate ? new Date(service.completedDate).toLocaleDateString('sr-RS') : 'Nije završeno'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Troškovi:</span>
              <span class="info-value">${service.cost || 'Nisu definisani'}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">👤 Podaci o klijentu</div>
        <div class="info-grid">
          <div>
            <div class="info-item">
              <span class="info-label">Ime i prezime:</span>
              <span class="info-value">${client.fullName}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Telefon:</span>
              <span class="info-value">${client.phone}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Email:</span>
              <span class="info-value">${client.email || 'Nije unesen'}</span>
            </div>
          </div>
          <div>
            <div class="info-item">
              <span class="info-label">Adresa:</span>
              <span class="info-value">${client.address || 'Nije unesena'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Grad:</span>
              <span class="info-value">${client.city || 'Nije unesen'}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">🔧 Podaci o aparatu</div>
        <div class="info-grid">
          <div>
            <div class="info-item">
              <span class="info-label">Kategorija:</span>
              <span class="info-value">${appliance.category?.name || 'Nepoznato'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Proizvođač:</span>
              <span class="info-value"><strong>${appliance.manufacturer?.name || 'Nepoznato'}</strong></span>
            </div>
            <div class="info-item">
              <span class="info-label">Model:</span>
              <span class="info-value">${appliance.model || 'Nije unesen'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Status garancije:</span>
              <span class="info-value"><strong>${service.warrantyStatus === 'u garanciji' ? 'U GARANCIJI' : service.warrantyStatus === 'van garancije' ? 'VAN GARANCIJE' : 'NEPOZNATO'}</strong></span>
            </div>
          </div>
          <div>
            <div class="info-item">
              <span class="info-label">Serijski broj:</span>
              <span class="info-value">${appliance.serialNumber || 'Nije unesen'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Datum kupovine:</span>
              <span class="info-value">${appliance.purchaseDate ? new Date(appliance.purchaseDate).toLocaleDateString('sr-RS') : 'Nije unesen'}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">🛠️ Serviser i tehnički detalji</div>
        <div class="info-grid">
          <div>
            <div class="info-item">
              <span class="info-label">Serviser:</span>
              <span class="info-value">${technician?.fullName || 'Nije dodeljen'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Specijalizacija:</span>
              <span class="info-value">${technician?.specialization || 'Nije specificirana'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Kontakt:</span>
              <span class="info-value">${technician?.phone || 'Nije unesen'}</span>
            </div>
          </div>
          <div>
            <div class="info-item">
              <span class="info-label">Potpuno ispravljeno:</span>
              <span class="info-value"><strong>${service.isCompletelyFixed ? 'DA' : 'NE'}</strong></span>
            </div>
            <div class="info-item">
              <span class="info-label">Garancijski servis:</span>
              <span class="info-value"><strong>${service.isWarrantyService ? 'DA' : 'NE'}</strong></span>
            </div>
            <div class="info-item">
              <span class="info-label">Isključen iz fakturisanja:</span>
              <span class="info-value">${service.excludeFromBilling ? 'Da' : 'Ne'}</span>
            </div>
          </div>
        </div>
      </div>

      ${service.partnerCompanyName || service.businessPartnerId ? `
      <div class="section">
        <div class="section-title">🏢 Poslovni partner</div>
        <div class="info-grid">
          <div>
            ${service.partnerCompanyName ? `
            <div class="info-item">
              <span class="info-label">Naziv kompanije:</span>
              <span class="info-value"><strong>${service.partnerCompanyName}</strong></span>
            </div>
            ` : ''}
            ${service.businessPartnerId ? `
            <div class="info-item">
              <span class="info-label">ID partnera:</span>
              <span class="info-value">${service.businessPartnerId}</span>
            </div>
            ` : ''}
          </div>
        </div>
      </div>
      ` : ''}

      ${service.devicePickedUp || service.pickupDate || service.pickupNotes ? `
      <div class="section">
        <div class="section-title">📦 Informacije o preuzimanju uređaja</div>
        <div class="info-grid">
          <div>
            <div class="info-item">
              <span class="info-label">Uređaj preuzet:</span>
              <span class="info-value"><strong>${service.devicePickedUp ? 'DA' : 'NE'}</strong></span>
            </div>
            ${service.pickupDate ? `
            <div class="info-item">
              <span class="info-label">Datum preuzimanja:</span>
              <span class="info-value">${new Date(service.pickupDate).toLocaleDateString('sr-RS')}</span>
            </div>
            ` : ''}
          </div>
          <div>
            ${service.pickupNotes ? `
            <div class="info-item">
              <span class="info-label">Napomena o preuzimanju:</span>
              <div style="background: #f0fdf4; padding: 10px; border-radius: 6px; margin-top: 5px;">
                ${service.pickupNotes}
              </div>
            </div>
            ` : ''}
          </div>
        </div>
      </div>
      ` : ''}

      <div class="section">
        <div class="section-title">📝 Opis problema i rešenje</div>
        <div style="margin-bottom: 15px;">
          <div class="info-label" style="display: block; margin-bottom: 5px;">Opis problema:</div>
          <div style="background: #f8fafc; padding: 15px; border-radius: 6px; border-left: 4px solid #2563eb;">
            ${service.description || 'Opis nije unesen'}
          </div>
        </div>
        ${service.technicianNotes ? `
        <div style="margin-bottom: 15px;">
          <div class="info-label" style="display: block; margin-bottom: 5px;">Napomene servisera:</div>
          <div style="background: #f0fdf4; padding: 15px; border-radius: 6px; border-left: 4px solid #059669;">
            ${service.technicianNotes}
          </div>
        </div>
        ` : ''}
        ${service.machineNotes ? `
        <div style="margin-bottom: 15px;">
          <div class="info-label" style="display: block; margin-bottom: 5px;">Napomene o mašini / aparatu:</div>
          <div style="background: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b;">
            ${service.machineNotes}
          </div>
        </div>
        ` : ''}
      </div>

      ${service.needsRescheduling || service.reschedulingNotes || service.clientUnavailableReason ? `
      <div class="section">
        <div class="section-title">📅 Informacije o zakazivanju i dostupnosti</div>
        <div class="info-grid">
          <div>
            ${service.needsRescheduling !== null && service.needsRescheduling !== undefined ? `
            <div class="info-item">
              <span class="info-label">Potrebno ponovno zakazivanje:</span>
              <span class="info-value"><strong style="color: ${service.needsRescheduling ? '#dc2626' : '#047857'};">${service.needsRescheduling ? 'DA' : 'NE'}</strong></span>
            </div>
            ` : ''}
            ${service.clientUnavailableReason ? `
            <div class="info-item">
              <span class="info-label">Razlog nedostupnosti:</span>
              <div style="background: #fee2e2; padding: 10px; border-radius: 6px; margin-top: 5px;">
                ${service.clientUnavailableReason}
              </div>
            </div>
            ` : ''}
          </div>
          <div>
            ${service.reschedulingNotes ? `
            <div class="info-item">
              <span class="info-label">Napomene o zakazivanju:</span>
              <div style="background: #fef3c7; padding: 10px; border-radius: 6px; margin-top: 5px;">
                ${service.reschedulingNotes}
              </div>
            </div>
            ` : ''}
          </div>
        </div>
      </div>
      ` : ''}

      ${service.customerRefusesRepair || service.customerRefusalReason ? `
      <div class="section" style="border-left: 4px solid #dc2626;">
        <div class="section-title" style="color: #dc2626;">⚠️ Odbijanje popravke od strane kupca</div>
        <div class="info-grid">
          <div>
            <div class="info-item">
              <span class="info-label">Kupac odbija popravku:</span>
              <span class="info-value"><strong style="color: #dc2626;">DA</strong></span>
            </div>
          </div>
          <div>
            ${service.customerRefusalReason ? `
            <div class="info-item">
              <span class="info-label">Razlog odbijanja:</span>
              <div style="background: #fee2e2; padding: 10px; border-radius: 6px; margin-top: 5px; border-left: 3px solid #dc2626;">
                ${service.customerRefusalReason}
              </div>
            </div>
            ` : ''}
          </div>
        </div>
      </div>
      ` : ''}

      ${service.repairFailed || service.repairFailureReason ? `
      <div class="section" style="border-left: 4px solid #dc2626;">
        <div class="section-title" style="color: #dc2626;">❌ Neuspješna popravka</div>
        <div class="info-grid">
          <div>
            <div class="info-item">
              <span class="info-label">Popravka neuspješna:</span>
              <span class="info-value"><strong style="color: #dc2626;">DA</strong></span>
            </div>
            ${service.repairFailureDate ? `
            <div class="info-item">
              <span class="info-label">Datum neuspjeha:</span>
              <span class="info-value">${new Date(service.repairFailureDate).toLocaleDateString('sr-RS')}</span>
            </div>
            ` : ''}
          </div>
          <div>
            ${service.repairFailureReason ? `
            <div class="info-item">
              <span class="info-label">Razlog neuspjeha:</span>
              <div style="background: #fee2e2; padding: 10px; border-radius: 6px; margin-top: 5px; border-left: 3px solid #dc2626;">
                ${service.repairFailureReason}
              </div>
            </div>
            ` : ''}
          </div>
        </div>
        ${service.replacedPartsBeforeFailure ? `
        <div style="margin-top: 15px;">
          <div class="info-label" style="display: block; margin-bottom: 5px;">Zamijenjeni dijelovi prije neuspjeha:</div>
          <div style="background: #fef3c7; padding: 10px; border-radius: 6px;">
            ${service.replacedPartsBeforeFailure}
          </div>
        </div>
        ` : ''}
      </div>
      ` : ''}

      ${service.usedParts ? `
      <div class="section">
        <div class="section-title">🔧 Upotrijebljeni rezervni dijelovi</div>
        <div style="background: #f8fafc; padding: 15px; border-radius: 6px; border-left: 4px solid #2563eb;">
          ${service.usedParts}
        </div>
      </div>
      ` : ''}

      ${service.removedParts && service.removedParts.length > 0 ? `
      <div class="section">
        <div class="section-title">🔩 Uklonjeni / Zamijenjeni rezervni dijelovi</div>
        ${service.removedParts.map((part: any, index: number) => `
          <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 15px; background: ${index % 2 === 0 ? '#f8fafc' : '#ffffff'};">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 10px;">
              <div>
                <div style="font-weight: bold; color: #1e40af; margin-bottom: 5px;">
                  ${index + 1}. ${part.partName || 'Nepoznat dio'}
                </div>
                ${part.partDescription ? `
                <div style="color: #64748b; font-size: 13px; margin-bottom: 8px;">
                  ${part.partDescription}
                </div>
                ` : ''}
              </div>
              <div style="text-align: right;">
                <span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; 
                  background: ${part.partStatus === 'returned' ? '#d1fae5' : part.partStatus === 'in_repair' ? '#fef3c7' : part.partStatus === 'repaired' ? '#dbeafe' : part.partStatus === 'replaced' ? '#fee2e2' : '#f1f5f9'}; 
                  color: ${part.partStatus === 'returned' ? '#047857' : part.partStatus === 'in_repair' ? '#92400e' : part.partStatus === 'repaired' ? '#1d4ed8' : part.partStatus === 'replaced' ? '#dc2626' : '#475569'};">
                  ${part.partStatus === 'removed' ? 'UKLONJENO' : 
                    part.partStatus === 'in_repair' ? 'NA POPRAVCI' :
                    part.partStatus === 'repaired' ? 'POPRAVLJENO' :
                    part.partStatus === 'returned' ? 'VRAĆENO' :
                    part.partStatus === 'replaced' ? 'ZAMIJENJENO' : part.partStatus?.toUpperCase() || 'NEPOZNATO'}
                </span>
                ${part.isReinstalled ? `
                <div style="margin-top: 5px; font-size: 11px; color: #047857; font-weight: bold;">
                  ✓ Reinstalirano
                </div>
                ` : ''}
              </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; font-size: 12px; margin-top: 10px; padding-top: 10px; border-top: 1px solid #e2e8f0;">
              <div>
                <span style="font-weight: bold; color: #475569;">Datum uklanjanja:</span><br/>
                <span style="color: #1e293b;">${part.removalDate ? new Date(part.removalDate).toLocaleDateString('sr-RS') : 'N/A'}</span>
              </div>
              <div>
                <span style="font-weight: bold; color: #475569;">Trenutna lokacija:</span><br/>
                <span style="color: #1e293b;">
                  ${part.currentLocation === 'workshop' ? '🔧 Radionica' : 
                    part.currentLocation === 'external_repair' ? '🏭 Vanjska popravka' :
                    part.currentLocation === 'returned' ? '✓ Vraćeno' : part.currentLocation || 'N/A'}
                </span>
              </div>
              ${part.repairCost ? `
              <div>
                <span style="font-weight: bold; color: #475569;">Trošak popravke:</span><br/>
                <span style="color: #047857; font-weight: bold;">${part.repairCost} €</span>
              </div>
              ` : '<div></div>'}
            </div>
            
            ${part.expectedReturnDate || part.actualReturnDate ? `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #e2e8f0;">
              ${part.expectedReturnDate ? `
              <div>
                <span style="font-weight: bold; color: #475569;">Očekivani povratak:</span><br/>
                <span style="color: #1e293b;">${new Date(part.expectedReturnDate).toLocaleDateString('sr-RS')}</span>
              </div>
              ` : ''}
              ${part.actualReturnDate ? `
              <div>
                <span style="font-weight: bold; color: #475569;">Stvarni povratak:</span><br/>
                <span style="color: #047857; font-weight: bold;">${new Date(part.actualReturnDate).toLocaleDateString('sr-RS')}</span>
              </div>
              ` : ''}
            </div>
            ` : ''}
            
            ${part.removalReason ? `
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #e2e8f0;">
              <div style="font-weight: bold; color: #475569; font-size: 12px; margin-bottom: 5px;">Razlog uklanjanja:</div>
              <div style="background: #fef3c7; padding: 8px; border-radius: 4px; font-size: 12px; color: #1e293b; border-left: 3px solid #f59e0b;">
                ${part.removalReason}
              </div>
            </div>
            ` : ''}
            
            ${part.technicianNotes ? `
            <div style="margin-top: 10px;">
              <div style="font-weight: bold; color: #475569; font-size: 12px; margin-bottom: 5px;">Napomene servisera:</div>
              <div style="background: #f0fdf4; padding: 8px; border-radius: 4px; font-size: 12px; color: #1e293b; border-left: 3px solid #059669;">
                ${part.technicianNotes}
              </div>
            </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
      ` : ''}

      ${service.billingPrice ? `
      <div class="section">
        <div class="section-title">💰 Naplata i fakturisanje</div>
        <div class="info-grid">
          <div>
            <div class="info-item">
              <span class="info-label">Cijena za naplatu:</span>
              <span class="info-value"><strong style="font-size: 18px; color: #059669;">${service.billingPrice} €</strong></span>
            </div>
          </div>
          <div>
            ${service.billingPriceReason ? `
            <div class="info-item">
              <span class="info-label">Napomena o cijeni:</span>
              <div style="background: #fef3c7; padding: 10px; border-radius: 6px; margin-top: 5px;">
                ${service.billingPriceReason}
              </div>
            </div>
            ` : ''}
          </div>
        </div>
      </div>
      ` : ''}

      <div class="signature-section">
        <div class="signature-box">
          <div style="margin-bottom: 40px;">Potpis servisera</div>
          <div>_________________________</div>
          <div style="margin-top: 10px; font-size: 12px;">${technician?.fullName || 'Ime servisera'}</div>
        </div>
        <div class="signature-box">
          <div style="margin-bottom: 40px;">Potpis klijenta</div>
          <div>_________________________</div>
          <div style="margin-top: 10px; font-size: 12px;">${client.fullName}</div>
        </div>
      </div>

      <div class="footer">
        <p><strong>FRIGO SISTEM TODOSIJEVIĆ</strong></p>
        <p>Servis bijele tehnike | Crna Gora</p>
        <p>Ovaj izvještaj je automatski generisan ${new Date().toLocaleDateString('sr-RS')}</p>
      </div>
    </body>
    </html>
    `;
  }

  // Generisanje PDF-a
  async generateServiceReportPDF(serviceId: number): Promise<Buffer> {
    let browser = null;
    
    try {
      console.log(`📄 Generisanje PDF izvještaja za servis ID: ${serviceId}`);
      
      // Dohvatanje podataka o servisu
      const serviceData = await this.getServiceData(serviceId);
      if (!serviceData) {
        throw new Error(`Servis sa ID ${serviceId} nije pronađen`);
      }

      console.log(`📄 Podaci servisa dohvaćeni uspešno`);

      // Pokretanje puppeteer-a sa sistemskim Chromium
      browser = await puppeteer.launch({
        headless: true,
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--disable-default-apps',
          '--disable-features=TranslateUI'
        ]
      });

      const page = await browser.newPage();
      
      // Postavljanje viewport-a za A4
      await page.setViewport({
        width: 794,
        height: 1123,
        deviceScaleFactor: 1,
      });

      console.log(`📄 Browser pokrenut, generisanje HTML template-a...`);

      // Generisanje HTML-a
      const htmlContent = this.generateServiceReportHTML(serviceData);
      
      // Učitavanje HTML sadržaja
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      console.log(`📄 HTML učitan, generisanje PDF-a...`);

      // Generisanje PDF-a
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '1cm',
          right: '1cm',
          bottom: '1cm',
          left: '1cm'
        }
      });

      console.log(`📄 ✅ PDF uspešno generisan (${pdfBuffer.length} bytes)`);
      
      return Buffer.from(pdfBuffer);
      
    } catch (error) {
      console.error(`📄 ❌ Greška pri generisanju PDF-a:`, error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
        console.log(`📄 Browser zatvoren`);
      }
    }
  }

  // Dohvatanje podataka servisa iz baze
  private async getServiceData(serviceId: number): Promise<ServicePDFData | null> {
    try {
      console.log(`📊 Dohvatanje podataka servisa ${serviceId} iz baze...`);
      
      // Koristi postojeći storage interface sa details
      const service = await storage.getServiceWithDetails(serviceId);
      if (!service) {
        console.log(`📊 ❌ Servis ${serviceId} nije pronađen`);
        return null;
      }

      console.log(`📊 ✅ Servis sa detaljima dohvaćen: ${service.id}`);
      
      return {
        service,
        client: service.client,
        appliance: service.appliance, 
        technician: service.technician
      };
      
    } catch (error) {
      console.error(`📊 ❌ Greška pri dohvatanju podataka servisa:`, error);
      throw error;
    }
  }
}

// Singleton instance
export const pdfService = new PDFService();