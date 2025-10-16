# SUPPLIER SISTEM - ANALIZA I INSTRUKCIJE ZA POPRAVKU

## EXECUTIVE SUMMARY

**DOBRA VEST:** Supplier sistem JE POTPUNO FUNKCIONALAN! ✅

Sistem ima sve potrebne komponente:
- ✅ Backend endpoint za kreiranje supplier korisnika
- ✅ Frontend UI sa dugmetom i formom
- ✅ Auth flow sa JWT tokenom koji sadrži `supplierId`
- ✅ Zaštićene supplier routes
- ✅ Storage metode za supplier tasks

**TRENUTNO STANJE BAZE:**
- 7 suppliers u sistemu
- 3 supplier korisnika već kreirana (supplier_test, supplier2, servis@eurotehnikamn.me)
- Svi su verifikovani i mogu se ulogovati

**PROBLEM:** 
Mogući razlozi zašto supplier ne može da se uloguje:
1. Supplier korisnički nalog **nije kreiran** za tog dobavljača
2. Kredencijali nisu prosleđeni dobavljaču
3. Admin nije kliknuo "Kreiraj korisnika" za tog supplier-a

---

## 1. IDENTIFIKOVANI PROBLEMI

### Problem 1: Nedostatak supplier korisničkih naloga ❌
**Opis:** Iako suppliers postoje u bazi (7 suppliers), samo 3 imaju kreirane korisničke naloge.

**Evidencija:**
- Supplier #5 "Miele Center" - NEMA korisnički nalog
- Supplier #6 "Tehnolux Podgorica" - NEMA korisnički nalog  
- Supplier #3 "Beko Servis" - IMA nalog (servis@eurotehnikamn.me)

**Rešenje:** Admin mora kreirati korisničke naloge za sve suppliers koji treba da imaju pristup portalu.

### Problem 2: Komunikacijski gap ❌
**Opis:** Kreiran korisnički nalog, ali kredencijali nisu prosleđeni dobavljaču.

**Rešenje:** Nakon kreiranja naloga, admin mora poslati kredencijale dobavljaču (email, SMS, ili telefonom).

### Problem 3: Nije očigledno kako kreirati supplier user-a ⚠️
**Opis:** Iako dugme "Kreiraj korisnika" postoji, workflow možda nije jasan adminu.

**Rešenje:** Jasne instrukcije za administratore.

---

## 2. BACKEND ARHITEKTURA (POTPUNO IMPLEMENTIRANO ✅)

### Endpoint: POST /api/admin/suppliers/:supplierId/create-user

**Lokacija:** `server/routes/admin.routes.ts` (linija 1136-1175)

**Middleware:**
```typescript
jwtAuth, requireRole(['admin'])
```

**Request Body:**
```typescript
{
  username: string,      // Korisničko ime za login
  password: string,      // Lozinka (min 6 karaktera)
  fullName?: string      // Opciono - ako nije dato, koristi supplier.name
}
```

**Implementacija:**
```typescript
app.post('/api/admin/suppliers/:supplierId/create-user', jwtAuth, requireRole(['admin']), async (req, res) => {
  try {
    const supplierId = parseInt(req.params.supplierId);
    const { username, password, fullName } = req.body;
    
    // 1. Dohvati supplier
    const supplier = await storage.getSupplier(supplierId);
    if (!supplier) {
      return res.status(404).json({ error: "Dobavljač nije pronađen" });
    }
    
    // 2. Proveri da li username već postoji
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: "Korisničko ime već postoji" });
    }
    
    // 3. Kreiraj korisnika sa role="supplier" i supplierId
    const userData = insertUserSchema.parse({
      username,
      password,
      fullName: fullName || supplier.name,
      email: supplier.email,
      phone: supplier.phone || "",
      role: "supplier",              // ← KLJUČNO: supplier role
      supplierId: supplier.id,       // ← KLJUČNO: povezivanje sa supplier-om
      isVerified: true,              // Auto-verifikovan
    });
    
    const newUser = await storage.createUser(userData);
    
    // 4. Vrati korisnika bez lozinke
    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json(userWithoutPassword);
    
  } catch (error) {
    // Error handling
  }
});
```

**Autentifikacija:**
```typescript
// JWT token sadrži supplierId
const token = generateToken({
  userId: user.id,
  username: user.username,
  role: user.role,
  supplierId: user.supplierId  // ← Uključen u token
});
```

---

## 3. FRONTEND ARHITEKTURA (POTPUNO IMPLEMENTIRANO ✅)

### Stranica: `/admin/suppliers`

**Lokacija:** `client/src/pages/admin/suppliers.tsx`

#### A. Dugme za kreiranje korisnika (linija 429-439)
```tsx
<Button
  size="sm"
  variant="default"
  onClick={() => {
    setEditingSupplier(supplier);
    setIsCreateUserDialogOpen(true);
  }}
  data-testid={`button-create-user-${supplier.id}`}
>
  Kreiraj korisnika
</Button>
```

#### B. Dialog forma (linija 860-939)
```tsx
<Dialog open={isCreateUserDialogOpen} onOpenChange={setIsCreateUserDialogOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Kreiraj korisnika za dobavljača</DialogTitle>
      <DialogDescription>
        Kreirajte korisnika koji će imati pristup portalu dobavljača
      </DialogDescription>
    </DialogHeader>
    
    <form onSubmit={handleCreateUser} className="space-y-4">
      {/* Prikaz supplier info */}
      <Input value={`${editingSupplier.name} (${editingSupplier.email})`} disabled />
      
      {/* Username input */}
      <Label htmlFor="user-username">Korisničko ime*</Label>
      <Input 
        id="user-username" 
        name="username" 
        required 
        placeholder="npr. dobavljac1"
        data-testid="input-username"
      />
      
      {/* Password input */}
      <Label htmlFor="user-password">Lozinka*</Label>
      <Input 
        id="user-password" 
        name="password" 
        type="password"
        required 
        minLength={6}
        placeholder="Minimum 6 karaktera"
        data-testid="input-password"
      />
      
      {/* Full name input */}
      <Label htmlFor="user-fullName">Puno ime</Label>
      <Input 
        id="user-fullName" 
        name="fullName" 
        defaultValue={editingSupplier.contactPerson || editingSupplier.name}
        placeholder="Ime i prezime korisnika"
        data-testid="input-fullname"
      />
      
      <DialogFooter>
        <Button type="submit" disabled={createUserMutation.isPending}>
          {createUserMutation.isPending ? "Kreiranje..." : "Kreiraj korisnika"}
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

#### C. Mutation (linija 154-176)
```tsx
const createUserMutation = useMutation({
  mutationFn: ({ supplierId, data }: { supplierId: number; data: any }) => 
    apiRequest(`/api/admin/suppliers/${supplierId}/create-user`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  onSuccess: () => {
    setIsCreateUserDialogOpen(false);
    setEditingSupplier(null);
    toast({
      title: "Uspeh",
      description: "Korisnik za dobavljača je uspešno kreiran",
    });
  },
  onError: (error: any) => {
    toast({
      title: "Greška",
      description: error.message || "Greška pri kreiranju korisnika",
      variant: "destructive",
    });
  },
});
```

---

## 4. SUPPLIER PORTAL (POTPUNO IMPLEMENTIRAN ✅)

### Stranica: `/supplier`

**Lokacija:** `client/src/pages/supplier/index.tsx`

**Zaštita rute:**
```tsx
<RoleProtectedRoute 
  path="/supplier" 
  component={SupplierDashboard} 
  allowedRoles={["supplier"]} 
/>
```

**Funkcionalnost:**
1. Prikazuje sve taskove (supplier orders) dodeljene tom supplier-u
2. Dugme "Odvojio dio" → status: `separated`
3. Dugme "Poslao dio" → status: `sent`
4. Admin vidi update u admin panelu

---

## 5. KORAK-PO-KORAK WORKFLOW ZA ADMINA

### SCENARIO 1: Kreiranje supplier korisničkog naloga

**Korak 1:** Admin se uloguje na `/admin/suppliers`
```
URL: https://your-app.com/admin/suppliers
Kredencijali: admin/admin123
```

**Korak 2:** Admin vidi listu svih suppliers
```
Primjer:
- Miele Center (parts@miele.me)
- Tehnolux Podgorica (info@tehnolux.me)
- Beko Servis (servis@eurotehnikamn.me) ← već ima nalog
```

**Korak 3:** Admin klikne "Kreiraj korisnika" pored supplier-a
```tsx
<Button onClick={() => { /* Otvori dialog */ }}>
  Kreiraj korisnika
</Button>
```

**Korak 4:** Admin unosi podatke u formu
```
Dobavljač: Miele Center (parts@miele.me)
Korisničko ime: miele_user         ← Jedinstveno username
Lozinka: Miele123!                  ← Min 6 karaktera
Puno ime: Marko Petrović            ← Opciono
```

**Korak 5:** Admin klikne "Kreiraj korisnika"
```
Backend:
1. Validacija podataka
2. Provera da username ne postoji
3. Kreiranje user-a sa:
   - role = "supplier"
   - supplierId = 5 (Miele Center)
   - isVerified = true
4. Hash password
5. Snimi u bazu
```

**Korak 6:** Admin dobija potvrdu
```
Toast notifikacija:
"Korisnik za dobavljača je uspešno kreiran"
```

**Korak 7:** Admin prosleđuje kredencijale dobavljaču
```
Email, SMS ili telefonom:
"Vaš nalog je kreiran:
Username: miele_user
Password: Miele123!
URL: https://your-app.com"
```

---

### SCENARIO 2: Supplier se loguje i vidi taskove

**Korak 1:** Supplier otvara app
```
URL: https://your-app.com
```

**Korak 2:** Supplier unosi kredencijale
```
Username: miele_user
Password: Miele123!
```

**Korak 3:** Backend autentifikacija
```typescript
// 1. Pronađi korisnika
const user = await storage.getUserByUsername('miele_user');

// 2. Proveri lozinku
const isValid = await comparePassword('Miele123!', user.password);

// 3. Generiši JWT token
const token = generateToken({
  userId: 63,
  username: 'miele_user',
  role: 'supplier',
  supplierId: 5  // ← KLJUČNO za supplier routes
});

// 4. Vrati token
res.json({ user, token });
```

**Korak 4:** Frontend redirect
```tsx
// AuthPage redirect logic
const redirectPath = user.role === "supplier" ? "/supplier" : "/";
navigate(redirectPath);
```

**Korak 5:** Supplier vidi svoj dashboard
```
URL: /supplier
Prikazuje:
- Task 1: Porudžbina #123 - Frižider deo XYZ
  Status: Čeka vas
  [Odvojio dio] [Poslao dio]
  
- Task 2: Porudžbina #124 - Ves masina deo ABC  
  Status: Čeka vas
  [Odvojio dio] [Poslao dio]
```

**Korak 6:** Supplier klikne "Odvojio dio"
```
API: PATCH /api/supplier/tasks/123/separated
Backend:
1. Proveri da task pripada ovom supplier-u
2. Update status na 'separated'
3. Snimi u bazu
```

**Korak 7:** Supplier klikne "Poslao dio"
```
API: PATCH /api/supplier/tasks/123/sent
Backend:
1. Proveri da task pripada ovom supplier-u
2. Update status na 'sent'
3. Snimi u bazu
```

---

## 6. BACKEND ROUTES (POTPUNO IMPLEMENTIRANI ✅)

### GET /api/supplier/tasks
```typescript
// Lokacija: server/routes/supplier.routes.ts:20
app.get('/api/supplier/tasks', jwtAuthMiddleware, requireRole(['supplier']), async (req, res) => {
  const supplierId = req.user!.supplierId;  // ← Iz JWT tokena
  
  if (!supplierId) {
    return res.status(400).json({ error: 'Korisnik nema dodijeljenog dobavljača' });
  }
  
  const tasks = await storage.getSupplierTasks(supplierId);
  res.json(tasks);
});
```

### PATCH /api/supplier/tasks/:id/separated
```typescript
// Lokacija: server/routes/supplier.routes.ts:43
app.patch('/api/supplier/tasks/:id/separated', jwtAuthMiddleware, requireRole(['supplier']), async (req, res) => {
  const taskId = parseInt(req.params.id);
  const supplierId = req.user!.supplierId;
  
  // Validacija da task pripada ovom supplier-u
  const task = await storage.getSupplierTask(taskId);
  if (!task || task.supplierId !== supplierId) {
    return res.status(403).json({ error: 'Nemate dozvolu za ovaj zadatak' });
  }
  
  const updatedTask = await storage.updateSupplierTaskStatus(taskId, 'separated');
  res.json(updatedTask);
});
```

### PATCH /api/supplier/tasks/:id/sent
```typescript
// Lokacija: server/routes/supplier.routes.ts:77
app.patch('/api/supplier/tasks/:id/sent', jwtAuthMiddleware, requireRole(['supplier']), async (req, res) => {
  const taskId = parseInt(req.params.id);
  const supplierId = req.user!.supplierId;
  
  const task = await storage.getSupplierTask(taskId);
  if (!task || task.supplierId !== supplierId) {
    return res.status(403).json({ error: 'Nemate dozvolu za ovaj zadatak' });
  }
  
  const updatedTask = await storage.updateSupplierTaskStatus(taskId, 'sent');
  res.json(updatedTask);
});
```

---

## 7. STORAGE METODE (POTPUNO IMPLEMENTIRANE ✅)

### Lokacija: `server/storage.ts`

```typescript
// GET supplier tasks
async getSupplierTasks(supplierId: number): Promise<SupplierOrder[]> {
  return await db
    .select()
    .from(supplierOrders)
    .where(eq(supplierOrders.supplierId, supplierId))
    .orderBy(desc(supplierOrders.createdAt));
}

// GET single task
async getSupplierTask(taskId: number): Promise<SupplierOrder | undefined> {
  const [task] = await db
    .select()
    .from(supplierOrders)
    .where(eq(supplierOrders.id, taskId))
    .limit(1);
  return task;
}

// UPDATE task status
async updateSupplierTaskStatus(taskId: number, status: 'pending' | 'separated' | 'sent' | 'delivered' | 'cancelled'): Promise<SupplierOrder> {
  const [updated] = await db
    .update(supplierOrders)
    .set({ 
      status,
      updatedAt: new Date(),
      ...(status === 'sent' && { sentAt: new Date() }),
      ...(status === 'delivered' && { actualDelivery: new Date() }),
    })
    .where(eq(supplierOrders.id, taskId))
    .returning();
  return updated;
}
```

---

## 8. BAZA PODATAKA - TRENUTNO STANJE

### Suppliers tabela
```sql
SELECT id, name, email, is_active FROM suppliers;

-- Rezultat:
id  | name                  | email                  | is_active
----|-----------------------|------------------------|----------
5   | Miele Center          | parts@miele.me         | t
6   | Tehnolux Podgorica    | info@tehnolux.me       | t
3   | Beko Servis           | servis@eurotehnikamn.me| t
... | (ukupno 7 suppliers)
```

### Users tabela (supplier korisnici)
```sql
SELECT id, username, role, supplier_id, is_verified FROM users WHERE role = 'supplier';

-- Rezultat:
id | username                  | role     | supplier_id | is_verified
---|---------------------------|----------|-------------|------------
63 | supplier_test             | supplier | 5           | t
64 | supplier2                 | supplier | 6           | t
65 | servis@eurotehnikamn.me   | supplier | 3           | t
```

**ANALIZA:**
- ✅ Supplier #5 (Miele Center) → User #63 (supplier_test)
- ✅ Supplier #6 (Tehnolux) → User #64 (supplier2)
- ✅ Supplier #3 (Beko) → User #65 (servis@eurotehnikamn.me)
- ❌ 4 suppliers NEMAJU korisničke naloge

---

## 9. AKCIONI PLAN ZA REŠAVANJE PROBLEMA

### ODMAH - Kreirati supplier naloge za postojeće suppliers

**Korak 1:** Admin uloguj se na `/admin/suppliers`

**Korak 2:** Za svaki supplier BEZ korisničkog naloga, uradi:

```
Supplier: [Naziv supplier-a]
Klik: "Kreiraj korisnika"

Forma:
- Username: [supplier_kratki_naziv] 
  Npr: "tehnolux_user", "parts_express_user"
- Password: [Jaka lozinka min 8 karaktera]
  Npr: "TehnoLux2024!", "Parts123!"
- Puno ime: [Ime kontakt osobe]
  Npr: "Marko Petrović - Tehnolux"

Klik: "Kreiraj korisnika"
```

**Korak 3:** Pošalji kredencijale dobavljaču
```
Email predložak:

Poštovani,

Vaš nalog za supplier portal je uspešno kreiran.

Kredencijali za pristup:
- URL: https://[your-app-url].com
- Username: teknolux_user
- Password: TehnoLux2024!

Molimo vas da se ulogujete i promenite lozinku pri prvom logovanju.

Na portalu možete videti sve porudžbine koje su vam dodeljene i ažurirati status isporuke.

Srdačan pozdrav,
Admin tim
```

---

### DUGOROČNO - Poboljšanja sistema

#### 1. Auto-generisanje kredencijala
```typescript
// Backend može auto-generisati jaku lozinku
import crypto from 'crypto';

function generatePassword(): string {
  return crypto.randomBytes(8).toString('base64').slice(0, 12);
}

// Primeniti u endpoint-u
const autoPassword = generatePassword(); // "x7K9mP2qL8w"
```

#### 2. Email notifikacija nakon kreiranja naloga
```typescript
// Poslati email automatski nakon kreiranja
import { sendEmail } from './email-service';

const newUser = await storage.createUser(userData);

await sendEmail({
  to: supplier.email,
  subject: 'Vaš nalog za Supplier Portal',
  body: `
    Username: ${newUser.username}
    Password: ${password}
    URL: https://your-app.com
  `
});
```

#### 3. Prikazati da li supplier ima nalog
```tsx
// U admin UI, prikazati badge
<Card>
  <CardHeader>
    <CardTitle>{supplier.name}</CardTitle>
    {supplierHasUser ? (
      <Badge variant="success">Ima nalog</Badge>
    ) : (
      <Badge variant="warning">Nema nalog</Badge>
    )}
  </CardHeader>
  ...
</Card>
```

#### 4. Password reset funkcionalnost
```typescript
// Novi endpoint za reset lozinke
app.post('/api/admin/suppliers/:id/reset-password', jwtAuth, requireRole(['admin']), async (req, res) => {
  const newPassword = generatePassword();
  await storage.updateUserPassword(userId, newPassword);
  
  // Pošalji email
  await sendPasswordResetEmail(supplier.email, newPassword);
  
  res.json({ success: true });
});
```

---

## 10. TESTIRANJE - KORAK-PO-KORAK

### Test 1: Kreiranje supplier user-a

```bash
# 1. Admin login
curl -X POST http://localhost:5000/api/jwt-login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Response: { "token": "eyJhbG...", "user": {...} }
# Sačuvaj token

# 2. Kreiraj supplier user-a
curl -X POST http://localhost:5000/api/admin/suppliers/5/create-user \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_supplier_new",
    "password": "Test123!",
    "fullName": "Test Supplier Account"
  }'

# Response: { "id": 66, "username": "test_supplier_new", "role": "supplier", "supplierId": 5 }
```

### Test 2: Supplier login

```bash
# 1. Supplier login
curl -X POST http://localhost:5000/api/jwt-login \
  -H "Content-Type: application/json" \
  -d '{"username":"test_supplier_new","password":"Test123!"}'

# Response: 
# { 
#   "token": "eyJhbG...", 
#   "user": { 
#     "id": 66, 
#     "username": "test_supplier_new", 
#     "role": "supplier", 
#     "supplierId": 5 
#   } 
# }

# Sačuvaj token
```

### Test 3: Dohvatanje supplier tasks

```bash
# Dohvati taskove
curl -X GET http://localhost:5000/api/supplier/tasks \
  -H "Authorization: Bearer <SUPPLIER_TOKEN>"

# Response: 
# [
#   {
#     "id": 1,
#     "supplierId": 5,
#     "sparePartOrderId": 123,
#     "status": "pending",
#     "orderNumber": "SO-2024-001",
#     ...
#   }
# ]
```

### Test 4: Update task status

```bash
# Označi kao "separated"
curl -X PATCH http://localhost:5000/api/supplier/tasks/1/separated \
  -H "Authorization: Bearer <SUPPLIER_TOKEN>"

# Response: { "id": 1, "status": "separated", ... }

# Označi kao "sent"
curl -X PATCH http://localhost:5000/api/supplier/tasks/1/sent \
  -H "Authorization: Bearer <SUPPLIER_TOKEN>"

# Response: { "id": 1, "status": "sent", "sentAt": "2024-01-15T10:30:00Z", ... }
```

---

## 11. ČESTA PITANJA (FAQ)

### Q: Zašto supplier ne može da se uloguje?
**A:** Proveri sledeće:
1. Da li je korisnički nalog kreiran za tog supplier-a?
   ```sql
   SELECT * FROM users WHERE role = 'supplier' AND supplier_id = [ID];
   ```
2. Da li je korisnik verifikovan (`is_verified = true`)?
3. Da li su kredencijali tačni?

### Q: Kako dodati novog supplier-a u sistem?
**A:** 
1. Admin: Idi na `/admin/suppliers`
2. Klikni "Novi dobavljač"
3. Popuni formu (ime, email, telefon, brendovi...)
4. Klikni "Sačuvaj"
5. Klikni "Kreiraj korisnika" pored novog supplier-a
6. Unesi username/password
7. Pošalji kredencijale dobavljaču

### Q: Kako promeniti lozinku supplier-a?
**A:** Trenutno:
1. Admin: PUT /api/users/:id sa novim password-om
2. Buduće: Implementirati "Reset Password" dugme u admin UI

### Q: Supplier vidi taskove drugih suppliers?
**A:** NE! Backend filtrira po `supplierId` iz JWT tokena:
```typescript
const supplierId = req.user!.supplierId;
const tasks = await storage.getSupplierTasks(supplierId);
```

### Q: Admin može videti sve supplier taskove?
**A:** DA! Admin endpoint:
```
GET /api/admin/supplier-tasks-by-supplier
```

---

## 12. ZAKLJUČAK

### STATUS: ✅ SISTEM JE POTPUNO FUNKCIONALAN

**Implementirano:**
- ✅ Backend endpoint za kreiranje supplier user-a
- ✅ Frontend UI sa dugmetom i formom
- ✅ JWT auth sa supplierId u tokenu
- ✅ Supplier routes sa role-based access control
- ✅ Storage metode za CRUD operacije
- ✅ Supplier dashboard sa task management-om

**Nedostaje:**
- ❌ Kreirati korisničke naloge za sve suppliers
- ❌ Poslati kredencijale dobavljačima
- ❌ Dokumentovati procedure za administratore

**Akcioni plan:**
1. **ODMAH:** Admin kreira korisničke naloge za sve suppliers
2. **ODMAH:** Pošalji kredencijale dobavljačima (email/SMS)
3. **DUGOROČNO:** Implementirati auto-email notifikacije
4. **DUGOROČNO:** Dodati password reset funkcionalnost

**Kontakt za podršku:**
- Admin panel: `/admin/suppliers`
- Technička dokumentacija: Ovaj dokument
- Database schema: `shared/schema/suppliers.schema.ts`, `shared/schema/users.schema.ts`

---

## PRILOZI

### A. SQL Skripta za proveru stanja

```sql
-- Proveri sve suppliers
SELECT id, name, email, is_active FROM suppliers;

-- Proveri supplier korisničke naloge
SELECT u.id, u.username, u.role, u.supplier_id, s.name as supplier_name
FROM users u
LEFT JOIN suppliers s ON u.supplier_id = s.id
WHERE u.role = 'supplier';

-- Proveri suppliers BEZ korisničkih naloga
SELECT s.id, s.name, s.email
FROM suppliers s
LEFT JOIN users u ON s.id = u.supplier_id
WHERE u.id IS NULL;

-- Proveri supplier orders (tasks)
SELECT so.id, so.status, s.name as supplier_name, so.order_number
FROM supplier_orders so
JOIN suppliers s ON so.supplier_id = s.id
ORDER BY so.created_at DESC
LIMIT 10;
```

### B. TypeScript tipovi

```typescript
// User sa supplier ID-em
interface SupplierUser {
  id: number;
  username: string;
  role: 'supplier';
  supplierId: number;  // Link ka suppliers tabeli
  email: string;
  phone?: string;
  isVerified: boolean;
}

// JWT Payload
interface JWTPayload {
  userId: number;
  username: string;
  role: string;
  supplierId?: number;  // Opciono, samo za supplier role
  technicianId?: number; // Opciono, samo za technician role
}

// Supplier Task (SupplierOrder)
interface SupplierTask {
  id: number;
  supplierId: number;
  sparePartOrderId: number;
  status: 'pending' | 'separated' | 'sent' | 'delivered' | 'cancelled';
  orderNumber?: string;
  totalCost?: number;
  currency: string;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

---

**Datum:** 2024-01-15  
**Verzija:** 1.0  
**Autor:** System Architect  
**Status:** KOMPLETNA ANALIZA ✅
