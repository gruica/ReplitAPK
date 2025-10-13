# 📝 VODIČ: Kako Dopuniti Servis u Bazi Podataka

## 🎯 METOD 1: Database Panel (NAJLAKŠE)

### Korak po Korak:

1. **Otvori Database Panel**
   - U Replit-u, klikni na **"Database"** tab (lijeva strana)
   - Ili otvori direktno: Tools → PostgreSQL Database

2. **Pronađi Servis**
   - U Database panel-u, otvori tabelu `services`
   - Klikni "Filter" dugme
   - Upiši: `id = 667` (ili bilo koji ID servisa)
   - Klikni "Apply Filter"

3. **Ažuriraj Polja**
   - Klikni na polje koje želiš ažurirati (npr. `machine_notes`)
   - Upiši novi tekst
   - Pritisni **Enter** ili klikni "Save"

4. **Provjeri Promjene**
   - Osvježi stranicu servisa u aplikaciji
   - Novi tekst bi trebao biti vidljiv

---

## 💻 METOD 2: SQL Upit (BRZO)

### Koristi Execute SQL Tool:

```sql
-- Ažuriraj napomene o mašini
UPDATE services 
SET machine_notes = 'TVOJ TEHNIČKI IZVJEŠTAJ OVDJE'
WHERE id = 667;

-- Ažuriraj opis rada servisera
UPDATE services 
SET technician_notes = 'Detaljan opis što je serviser uradio'
WHERE id = 667;

-- Ažuriraj više polja odjednom
UPDATE services 
SET 
  machine_notes = 'Tehnički izvještaj...',
  technician_notes = 'Opis rada...',
  cost = '50'
WHERE id = 667;
```

---

## 📊 POLJA KOJE MOŽEŠ AŽURIRATI

| Polje | Gdje se prikazuje | Primjer |
|-------|-------------------|---------|
| `description` | Dijagnoza problema | "Mašina ne radi, treba pregled" |
| `technician_notes` | Detaljan opis izvršenih radova | "Zamijenjen motor, testirano..." |
| `machine_notes` | Napomene o mašini | "TEHNIČKI IZVJEŠTAJ: Pregled..." |
| `cost` | Cijena servisa | "50" |
| `used_parts` | Korišćeni dijelovi | "Motor, remen, filter" |
| `warranty_status` | Garancijski status | "u garanciji" ili "van garancije" |
| `status` | Status servisa | "completed", "in_progress", "pending" |

---

## 🔍 PRIMJER: Dopuna Servisa #667

### Što smo dodali:

**Prije:**
- `machine_notes`: *prazno*

**Poslije:**
```sql
UPDATE services 
SET machine_notes = 'DETALJNI TEHNIČKI IZVJEŠTAJ ZA TRŽIŠNU INSPEKCIJU:

1. PREGLED MAŠINE:
   - Serijski broj: 2310030702
   - Vizuelni pregled bubnja: Nema oštećenja
   ...

7. STRUČNO MIŠLJENJE:
   Mašina je potpuno ispravna...

SERVISER: Gruica Todosijević
DATUM: 10.10.2025'
WHERE id = 667;
```

---

## 📱 GDJE SE PRIKAZUJE U UI-JU?

### 1. **Admin Panel → Detalji Servisa**
   - URL: `/admin/service/667`
   - Tab: "Detaljan Izvještaj"
   - Sekcije:
     - "Dijagnoza problema" → `description`
     - "Detaljan opis izvršenih radova" → `technician_notes`
     - "Napomene o mašini" → `machine_notes` ⭐

### 2. **Billing Izvještaji**
   - Neki podaci se koriste u billing izvještajima
   - `cost` → Ukupna cijena
   - `warranty_status` → Filtrira u/van garancije

---

## ⚡ BRZI ŠABLONI

### Šablon 1: Tehnički Izvještaj
```sql
UPDATE services 
SET machine_notes = 'TEHNIČKI IZVJEŠTAJ:

1. PREGLED: 
   - [Što si pregledao]

2. TESTIRANJE:
   - [Koje testove si uradio]

3. NALAZ:
   - [Što si našao]

4. ZAKLJUČAK:
   - [Tvoj zaključak]

SERVISER: [Ime]
DATUM: [Datum]'
WHERE id = [SERVIS_ID];
```

### Šablon 2: Opis Rada
```sql
UPDATE services 
SET technician_notes = 'Izvršeni radovi:

1. [Prvo što si uradio]
2. [Drugo što si uradio]
3. [Treće što si uradio]

Rezultat: [Konačan rezultat]

Napomene: [Dodatne napomene]'
WHERE id = [SERVIS_ID];
```

---

## 🚨 VAŽNE NAPOMENE

### ✅ DOZVOLJENO:
- Ažuriranje tekstualnih polja (`description`, `technician_notes`, `machine_notes`)
- Ažuriranje cijene (`cost`)
- Ažuriranje statusa (`status`, `warranty_status`)
- Ažuriranje bilo kojeg servisa po ID-u

### ⚠️ PAŽNJA:
- **NE MIJENJAJ** `id` (jedinstveni identifikator)
- **NE MIJENJAJ** `client_id`, `appliance_id` (veze sa drugim tabelama)
- **NE BRIŠIJ** servise - samo ažuriraj

### 💡 SAVJET:
- Koristi `WHERE id = X` da ažuriraš samo jedan servis
- Uvijek provjeri rezultat nakon ažuriranja
- Napravi backup prije velikih promjena

---

## 📞 BRZA POMOĆ

### Kako provjeriti postojeće podatke:
```sql
SELECT id, description, technician_notes, machine_notes, cost 
FROM services 
WHERE id = 667;
```

### Kako provjeriti dužinu teksta:
```sql
SELECT 
  id,
  LENGTH(machine_notes) as machine_notes_length,
  LENGTH(technician_notes) as technician_notes_length
FROM services 
WHERE id = 667;
```

### Kako pronaći servise bez izvještaja:
```sql
SELECT id, description, status
FROM services 
WHERE machine_notes IS NULL OR machine_notes = ''
ORDER BY id DESC
LIMIT 20;
```

---

## ✅ ZAKLJUČAK

**Najbrži način:**
1. Otvori Database Panel u Replit-u
2. Nađi servis (tabela `services`, filter `id = 667`)
3. Klikni na polje, upiši tekst, sačuvaj

**Najfleksibilniji način:**
1. Koristi SQL upit
2. Možeš ažurirati više polja odjednom
3. Možeš koristiti šablone

**Uvijek provjeri rezultat u aplikaciji!**
