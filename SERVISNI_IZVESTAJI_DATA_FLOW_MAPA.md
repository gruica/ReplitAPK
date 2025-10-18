# 📊 SERVISNI IZVEŠTAJI - KOMPLETNA MAPA TOKA PODATAKA

## 🔄 TOK PODATAKA: Od Kreiranja do PDF Izveštaja

```
Business Partner → Kreira Servis → Podaci se čuvaju → Admin Generiše PDF → Klijent dobija izveštaj
```

---

## 📋 TABELA 1: SERVICES (Glavni podaci o servisu)

**Putanja:** `services` tabela → Drizzle ORM → PDF Service

| Polje u PDF-u | Izvorna Tabela | Polje u Bazi | Ko unosi |
|---------------|----------------|--------------|----------|
| **Servis ID** | `services` | `id` | AUTO (PostgreSQL serial) |
| **Status servisa** | `services` | `status` | Business Partner (pending) → Admin/Serviser (menja) |
| **Status garancije** | `services` | `warranty_status` | ✅ **Business Partner (OBAVEZNO)** |
| **Opis problema** | `services` | `description` | Business Partner |
| **Datum kreiranja** | `services` | `created_at` | AUTO (sistem) |
| **Zakazano** | `services` | `scheduled_date` | Admin/Serviser |
| **Završeno** | `services` | `completed_date` | Serviser (kada završi) |
| **Troškovi** | `services` | `cost` | Serviser/Admin |
| **Cena za naplatu** | `services` | `billing_price` | Admin (za fakturisanje) |
| **Napomene servisera** | `services` | `technician_notes` | Serviser (rešenje problema) |
| **Potpuno ispravljeno** | `services` | `is_completely_fixed` | Serviser (DA/NE) |
| **Uređaj preuzet** | `services` | `device_picked_up` | Serviser (DA/NE) |
| **Poslovni partner** | `services` | `partner_company_name` | AUTO (iz user sesije) |

---

## 👤 TABELA 2: CLIENTS (Podaci o klijentu)

**Putanja:** `clients` tabela → JOIN preko `service.clientId` → PDF

| Polje u PDF-u | Izvorna Tabela | Polje u Bazi | Ko unosi |
|---------------|----------------|--------------|----------|
| **Ime i prezime** | `clients` | `full_name` | Business Partner |
| **Telefon** | `clients` | `phone` | Business Partner |
| **Email** | `clients` | `email` | Business Partner (opciono) |
| **Adresa** | `clients` | `address` | Business Partner (opciono) |
| **Grad** | `clients` | `city` | Business Partner (opciono) |

**NAPOMENA:** Ako klijent već postoji u bazi, Business Partner samo odabere postojećeg. Ako ne postoji, sistem automatski kreira novog klijenta sa unetim podacima.

---

## 🔧 TABELA 3: APPLIANCES (Podaci o uređaju)

**Putanja:** `appliances` tabela → JOIN preko `service.applianceId` → PDF

| Polje u PDF-u | Izvorna Tabela | Polje u Bazi | Ko unosi |
|---------------|----------------|--------------|----------|
| **Model** | `appliances` | `model` | Business Partner |
| **Serijski broj** | `appliances` | `serial_number` | Business Partner (opciono) |
| **Datum kupovine** | `appliances` | `purchase_date` | Business Partner (opciono) |
| **Kategorija ID** | `appliances` | `category_id` | Business Partner (dropdown) |
| **Proizvođač ID** | `appliances` | `manufacturer_id` | Business Partner (dropdown) |

**NAPOMENA:** Ako uređaj već postoji za tog klijenta, Business Partner može odabrati postojeći. Ako ne, sistem kreira novi uređaj.

---

## 📦 TABELA 4: APPLIANCE_CATEGORIES (Kategorija uređaja)

**Putanja:** `appliance_categories` → JOIN preko `appliance.categoryId` → PDF

| Polje u PDF-u | Izvorna Tabela | Polje u Bazi | Ko popunjava |
|---------------|----------------|--------------|-------------|
| **Kategorija** | `appliance_categories` | `name` | ✅ **Sistem (predefinisano)** |
| *Primeri* | - | - | *Frižider, Veš mašina, Šporet...* |

**NAPOMENA:** Kategorije su **PREDEFINISANE** u sistemu. Business Partner bira iz liste.

---

## 🏭 TABELA 5: MANUFACTURERS (Proizvođač)

**Putanja:** `manufacturers` → JOIN preko `appliance.manufacturerId` → PDF

| Polje u PDF-u | Izvorna Tabela | Polje u Bazi | Ko popunjava |
|---------------|----------------|--------------|-------------|
| **Proizvođač** | `manufacturers` | `name` | ✅ **Sistem (predefinisano)** |
| *Primeri* | - | - | *Bosch, Samsung, LG, Beko...* |

**NAPOMENA:** Proizvođači su **PREDEFINISANI** u sistemu. Business Partner bira iz liste.

---

## 👨‍🔧 TABELA 6: TECHNICIANS (Serviser)

**Putanja:** `technicians` → JOIN preko `service.technicianId` → PDF

| Polje u PDF-u | Izvorna Tabela | Polje u Bazi | Ko dodeljuje |
|---------------|----------------|--------------|--------------|
| **Ime servisera** | `technicians` | `full_name` | Admin (dodeljuje servisera) |
| **Telefon** | `technicians` | `phone` | Admin (podaci servisera) |
| **Email** | `technicians` | `email` | Admin |
| **Specijalizacija** | `technicians` | `specialization` | Admin |

**NAPOMENA:** Business Partner **NE MOŽE** dodeliti servisera. To radi samo Admin kasnije.

---

## 🔩 TABELA 7: REMOVED_PARTS (Utrošeni rezervni delovi)

**Putanja:** `removed_parts` → JOIN preko `serviceId` → PDF (tabela)

| Polje u PDF-u | Izvorna Tabela | Polje u Bazi | Ko unosi |
|---------------|----------------|--------------|----------|
| **Naziv dela** | `removed_parts` | `part_name` | Serviser |
| **Šifra dela** | `removed_parts` | `part_number` | Serviser |
| **Količina** | `removed_parts` | `quantity` | Serviser |
| **Napomena** | `removed_parts` | `notes` | Serviser |

**NAPOMENA:** Ovi podaci se dodaju **TOKOM** ili **NAKON** servisa od strane servisera.

---

## 🎯 KO UNOSI ŠTA - PREGLED PO ULOGAMA

### 1️⃣ BUSINESS PARTNER (Kreira zahtev za servis)
```
✅ OBAVEZNO unosi:
  - Ime i prezime klijenta
  - Telefon klijenta
  - Kategoriju uređaja (iz liste)
  - Proizvođača (iz liste)
  - Model uređaja
  - Opis problema
  - 🛡️ STATUS GARANCIJE ("u garanciji" ili "van garancije")

📝 OPCIONO unosi:
  - Email klijenta
  - Adresa klijenta
  - Grad klijenta
  - Serijski broj uređaja
  - Datum kupovine
```

### 2️⃣ ADMINISTRATOR (Upravlja servisima)
```
✅ Dodeljuje:
  - Servisera servisu
  - Zakazuje datum intervencije
  - Može promeniti status
  - Postavlja cene za naplatu
  - Dodaje billing_price_reason

📝 Može koristiti:
  - "nepoznato" za warranty status (ako partner nije znao)
```

### 3️⃣ SERVISER (Radi na terenu)
```
✅ Popunjava nakon obilaska:
  - Napomene servisera (rešenje)
  - Potpuno ispravljeno (DA/NE)
  - Uređaj preuzet (DA/NE)
  - Datum završetka
  - Troškovi
  - Utrošeni rezervni delovi

📝 Menja status:
  - pending → in_progress → completed
```

---

## ⚠️ IDENTIFIKOVANI PROBLEMI

### ❌ PROBLEM 1: Status Garancije - REŠENO ✅
**Pre:**
- Business partneri mogli birali "nepoznato"
- Default vrednost bila prazan string ili undefined

**Posle (REŠENO):**
- ✅ Business partneri mogu SAMO "u garanciji" ili "van garancije"
- ✅ Frontend validacija forsira odabir
- ✅ Backend odbija "nepoznato" od business partnera

### ✅ PROBLEM 2: Podaci o Aparatu - SVE JASNO
**Odakle dolaze:**
```
Kategorija → appliance_categories.name (predefinisano u sistemu)
Proizvođač → manufacturers.name (predefinisano u sistemu)
Model → appliances.model (unosi Business Partner)
Serijski broj → appliances.serial_number (unosi Business Partner, opciono)
Datum kupovine → appliances.purchase_date (unosi Business Partner, opciono)
```

**Kako se JOIN-uje:**
```sql
services (id=123)
  ↓ applianceId=456
    appliances (id=456)
      ↓ categoryId=7
        appliance_categories (id=7, name="Frižider")
      ↓ manufacturerId=12
        manufacturers (id=12, name="Bosch")
```

---

## 🔍 METODA `getServiceWithDetails` - Kod Flow

```typescript
async getServiceWithDetails(serviceId: number): Promise<any> {
  // 1. Dohvati osnovni servis
  const service = await db.select().from(services).where(eq(services.id, serviceId));
  
  // 2. Dohvati klijenta preko clientId
  const client = await db.select().from(clients).where(eq(clients.id, service.clientId));
  
  // 3. Dohvati uređaj preko applianceId
  const appliance = await db.select().from(appliances).where(eq(appliances.id, service.applianceId));
  
  // 4. Dohvati kategoriju preko appliance.categoryId
  const category = await db.select().from(applianceCategories)
    .where(eq(applianceCategories.id, appliance.categoryId));
  
  // 5. Dohvati proizvođača preko appliance.manufacturerId
  const manufacturer = await db.select().from(manufacturers)
    .where(eq(manufacturers.id, appliance.manufacturerId));
  
  // 6. Dohvati servisera preko service.technicianId (ako postoji)
  const technician = await db.select().from(technicians)
    .where(eq(technicians.id, service.technicianId));
  
  // 7. Dohvati rezervne delove
  const removedParts = await db.select().from(removedParts)
    .where(eq(removedParts.serviceId, serviceId));
  
  // 8. Vrati sve zajedno
  return {
    ...service,
    client,
    appliance: {
      ...appliance,
      category,
      manufacturer
    },
    technician,
    removedParts
  };
}
```

---

## 📄 PDF GENERISANJE - Finalni Output

**Fajl:** `server/pdf-service.ts`

```typescript
// 1. Poziva getServiceWithDetails(serviceId)
const serviceData = await this.getServiceData(serviceId);

// 2. Generiše HTML sa svim podacima
const htmlContent = this.generateServiceReportHTML(serviceData);

// 3. Puppeteer konvertuje HTML → PDF
const pdfBuffer = await page.pdf({ format: 'A4' });

// 4. Vraća PDF Buffer
return pdfBuffer;
```

---

## ✅ ZAKLJUČAK

**SVE PODACI SU JASNI I DOBRO ORGANIZOVANI:**

1. ✅ **Business Partner** unosi osnovne podatke (klijent, uređaj, problem, garancija)
2. ✅ **Admin** dodeljuje servisera i upravlja statusom
3. ✅ **Serviser** popunjava tehničke detalje i delove
4. ✅ **Sistem** JOIN-uje sve podatke i generiše PDF

**KRITIČNO POBOLJŠANJE:**
- 🛡️ **Warranty status** je sada **FORSIRANO OBAVEZNO** za business partnere
- 💡 Ne mogu više izabrati "nepoznato" - samo tačan status

**SVI PODACI U PDF-u DOLAZE IZ 7 TABELA:**
1. `services` - glavni podaci servisa
2. `clients` - podaci klijenta
3. `appliances` - podaci uređaja
4. `appliance_categories` - kategorija (predefinisano)
5. `manufacturers` - proizvođač (predefinisano)
6. `technicians` - serviser (dodeljuje admin)
7. `removed_parts` - rezervni delovi (dodaje serviser)

---

**Kreirao:** Replit Agent  
**Datum:** 18. Oktobar 2025  
**Status:** ✅ KOMPLETNO DOKUMENTOVANO
