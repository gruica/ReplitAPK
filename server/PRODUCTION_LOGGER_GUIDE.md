# Production Logger - Vodič za Upotrebu

## 📋 Pregled

Production Logger automatski detektuje okruženje i prilagođava logging:
- **Development**: Loguje sve (debug, info, performance, database, api)
- **Production**: Loguje samo kritično (warn, error, security, system)

## 🚀 Kako Koristiti

### Import Logger-a

```typescript
import { logger } from './production-logger';
```

## 📊 Dostupne Metode

### 1. **debug()** - Debug Informacije
```typescript
// PRIJE (loše - uvijek loguje):
console.log("Dohvatanje klijenta ID:", clientId);

// POSLIJE (dobro - samo u development):
logger.debug("Dohvatanje klijenta ID:", clientId);
```

### 2. **info()** - Informativne Poruke
```typescript
// PRIJE:
console.log("Započinjem slanje email-a");

// POSLIJE:
logger.info("Započinjem slanje email-a");
```

### 3. **performance()** - Performance Metrike
```typescript
// PRIJE:
console.log(`Query izvršen za ${duration}ms`);

// POSLIJE:
logger.performance("Database query", duration);
```

### 4. **database()** - Database Operacije
```typescript
// PRIJE:
console.log("Baza: Nova konekcija uspostavljena");

// POSLIJE:
logger.database("Nova konekcija uspostavljena");
```

### 5. **api()** - API Request/Response
```typescript
// PRIJE:
console.log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);

// POSLIJE:
logger.api(req.method, req.path, res.statusCode, duration);
```

### 6. **security()** - Sigurnosni Događaji
```typescript
// Uvijek loguje (kritično za sigurnost):
logger.security("🚨 Rate limit exceeded for IP:", req.ip);
logger.security("✅ Uspješan login za korisnika:", username);
```

### 7. **warn()** - Upozorenja
```typescript
// Uvijek loguje:
logger.warn("Session blizu isteka");
```

### 8. **error()** - Greške
```typescript
// Uvijek loguje:
logger.error("Greška pri slanju email-a:", error);
```

### 9. **critical()** - Kritične Greške
```typescript
// Uvijek loguje:
logger.critical("Database konekcija izgubljena!");
```

### 10. **system()** - Sistemski Događaji
```typescript
// Uvijek loguje (startup, shutdown, health):
logger.system("✅ Server pokrenut na portu 5000");
logger.system("🔄 Graceful shutdown započet");
```

### 11. **success()** - Uspješne Operacije
```typescript
// Samo u development:
logger.success("Email uspješno poslan");
```

## 🎯 Prioritet Migracije

### **HITNO** (Najčešće korišteni fajlovi):

1. **server/storage.ts** (295 console.log)
   - Zamijeni database operacije sa `logger.database()`
   - Zamijeni performance log-ove sa `logger.performance()`

2. **server/email-service.ts** (246 console.log)
   - Zamijeni sa `logger.info()` ili `logger.debug()`
   - Greške sa `logger.error()`

3. **server/routes/service.routes.ts** (67 console.log)
   - Zamijeni sa `logger.api()` ili `logger.debug()`

4. **server/sms-communication-service.ts** (55 console.log)
   - Zamijeni sa `logger.info()` ili `logger.debug()`

### **POŽELJNO** (Ostali fajlovi):
- server/routes/*.ts fajlovi
- server/cron servisi
- server/notification servisi

## ⚡ Automatska Zamjena (Regex Pattern)

Za brzu migraciju, možete koristiti find & replace sa regex:

**Pattern za traženje:**
```regex
console\.log\(([^)]+)\)
```

**Zamjena ovisno o kontekstu:**
```typescript
logger.debug($1)      // Za debug informacije
logger.info($1)       // Za info poruke
logger.database($1)   // Za database operacije
logger.performance($1) // Za performance metrike
```

## 📈 Benefiti

### U Development:
✅ Svi log-ovi vidljivi za debugging
✅ Performance metrike prikazane
✅ Database operacije praćene

### U Production:
✅ Samo kritični log-ovi (error, warn, security)
✅ Smanjeno opterećenje sistema
✅ Čisti log fajlovi
✅ Nema curenja osjetljivih podataka

## 🔒 Sigurnost

Production Logger **NIKAD NE LOGUJE** u produkciji:
- Debug informacije
- Database query detalje
- API response podatke
- Performance metrike
- Info poruke

Ovo štiti od:
- Curenja osjetljivih podataka
- Loših performansi
- Zagađenih log fajlova

## 📝 Primjer Transformacije

### PRIJE (server/storage.ts):
```typescript
async getClient(id: number) {
  console.log(`Dohvatanje klijenta sa ID: ${id}`);
  const startTime = Date.now();
  
  const client = await db.query.clients.findFirst({
    where: eq(clients.id, id)
  });
  
  console.log(`Query izvršen za ${Date.now() - startTime}ms`);
  console.log(`Klijent pronađen:`, client);
  
  return client;
}
```

### POSLIJE:
```typescript
import { logger } from './production-logger';

async getClient(id: number) {
  logger.debug(`Dohvatanje klijenta sa ID: ${id}`);
  const startTime = Date.now();
  
  const client = await db.query.clients.findFirst({
    where: eq(clients.id, id)
  });
  
  logger.performance("getClient query", Date.now() - startTime);
  logger.debug(`Klijent pronađen:`, client);
  
  return client;
}
```

## ✅ Najbolje Prakse

1. **Uvijek koristi logger.security() za sigurnosne događaje**
2. **Koristi logger.error() za sve greške**
3. **Koristi logger.database() za database operacije**
4. **Koristi logger.performance() za performance metrike**
5. **Koristi logger.debug() za sve ostale debug poruke**
6. **NIKAD ne loguj lozinke, tokene ili osjetljive podatke**

## 🎯 Cilj

**Prije Deploy-a**: Minimalno 80% console.log poziva zamijenjeno sa logger metodama u kritičnim fajlovima (storage, routes, services).

**Status**: 
- ✅ Production Logger kreiran i proširen
- ⏳ Migracija u toku (prioritet: storage.ts, email-service.ts, service.routes.ts)
- ⏳ Ciljano smanjenje sa 295+ na <50 production log-ova
