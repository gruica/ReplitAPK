import { emailService } from '../server/email-service';
import { pdfService } from '../server/pdf-service';
import { db } from '../server/db';
import { services, clients } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function sendServiceEmailWithPDF() {
  try {
    const serviceId = 667;
    
    console.log(`\n📧 TESTIRANJE SLANJA EMAIL-A SA PDF-OM\n`);
    console.log(`🔍 Pronalaženje servisa #${serviceId}...`);
    
    // Dohvati servis direktno iz baze
    const serviceResults = await db.select().from(services).where(eq(services.id, serviceId)).limit(1);
    const service = serviceResults[0];
    
    if (!service) {
      console.error(`❌ Servis #${serviceId} nije pronađen!`);
      return;
    }
    console.log(`✅ Servis pronađen: #${service.id}`);
    
    // Dohvati klijenta direktno iz baze
    const clientResults = await db.select().from(clients).where(eq(clients.id, service.clientId)).limit(1);
    const client = clientResults[0];
    
    if (!client) {
      console.error(`❌ Klijent nije pronađen!`);
      return;
    }
    console.log(`✅ Klijent: ${client.fullName}`);
    
    if (!client.email) {
      console.error(`❌ Klijent ${client.fullName} nema email adresu!`);
      return;
    }
    console.log(`✅ Email klijenta: ${client.email}`);
    
    // Generiši PDF
    console.log(`\n📄 Generisanje PDF izvještaja...`);
    const pdfBuffer = await pdfService.generateServiceReportPDF(serviceId);
    console.log(`✅ PDF generisan: ${pdfBuffer.length} bytes (${(pdfBuffer.length / 1024).toFixed(2)} KB)`);
    
    // Pripremi email
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
            📎 <strong>U prilogu ovog email-a</strong> nalazi se detaljan izvještaj o izvršenom servisu u PDF formatu.
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
    
    // Pošalji email
    console.log(`\n📧 Slanje email-a...`);
    console.log(`   📤 Primaoc: ${client.email}`);
    console.log(`   📝 Naslov: ${subject}`);
    console.log(`   📎 Prilog: servisni-izvjestaj-${serviceId}.pdf (${(pdfBuffer.length / 1024).toFixed(2)} KB)`);
    
    const emailSent = await emailService.sendEmail({
      to: client.email,
      subject: subject,
      html: html,
      attachments: [{
        filename: `servisni-izvjestaj-${serviceId}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }]
    }, 3);
    
    if (emailSent) {
      console.log(`\n✅ USPJEŠNO! Email sa PDF izvještajem poslat na ${client.email}`);
      console.log(`\n📊 REZIME:`);
      console.log(`   • Servis ID: ${serviceId}`);
      console.log(`   • Klijent: ${client.fullName}`);
      console.log(`   • Email: ${client.email}`);
      console.log(`   • PDF veličina: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
      console.log(`   • Status: ✅ POSLAT`);
    } else {
      console.error(`\n❌ GREŠKA! Email nije poslat. Provjerite SMTP konfiguraciju.`);
    }
    
  } catch (error) {
    console.error(`\n❌ KRITIČNA GREŠKA:`, error);
    if (error instanceof Error) {
      console.error(`   Poruka: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
    }
  } finally {
    process.exit(0);
  }
}

sendServiceEmailWithPDF();
