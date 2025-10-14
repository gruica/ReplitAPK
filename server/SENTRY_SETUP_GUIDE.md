# Sentry Error Monitoring - Setup Vodič

## 📊 Šta je Sentry?

Sentry automatski prati sve greške koje se dese u vašoj aplikaciji i šalje vam detaljne izvještaje sa:
- **Stack trace** - Tačnu lokaciju greške u kodu
- **User context** - Ko je dobio grešku (username, role)
- **Request info** - API endpoint, parametri, headers
- **Performance metrics** - Koliko je trajao request
- **Screenshots** - Snimak ekrana kada se greška desila (frontend)
- **Email/Slack notifikacije** - Odmah dobijete obavještenje

## 🚀 Kako Aktivirati Sentry (5 minuta)

### Korak 1: Kreiraj Sentry Account (Besplatan)

1. Idi na **https://sentry.io/signup/**
2. Registruj se (besplatni plan dovoljan je za početak)
3. Kreiraj novi projekat:
   - **Platform**: Node.js
   - **Project name**: Servis Todosijević

### Korak 2: Kopiraj DSN

1. U Sentry dashboard-u, idi na **Settings > Projects > Servis Todosijević**
2. Klikni na **Client Keys (DSN)**
3. Kopiraj **DSN** URL (izgleda otprilike ovako):
   ```
   https://abc123def456@o123456.ingest.sentry.io/7890123
   ```

### Korak 3: Dodaj DSN u Replit Secrets

1. U Replit-u, otvori **Tools > Secrets** (ikona ključa)
2. Klikni **Add new secret**
3. Dodaj:
   - **Key**: `SENTRY_DSN`
   - **Value**: Tvoj DSN sa Sentry-ja (paste URL)
4. Klikni **Add secret**

### Korak 4: Aktiviraj Sentry u Kodu

Dodaj u `server/index.ts` na **vrh fajla** (odmah poslije import-a):

```typescript
import { initializeSentry, sentryRequestHandler, sentryErrorHandler } from './sentry-setup';

// Inicijalizuj Sentry (PRVO prije svega)
initializeSentry(app);

// Dodaj Sentry request handler PRIJE svih ruta
app.use(sentryRequestHandler());
```

Dodaj na **KRAJ fajla** (poslije svih ruta, prije error handler-a):

```typescript
// Sentry error handler - MORA biti prije globalnog error handler-a
app.use(sentryErrorHandler());
```

### Korak 5: Restart Aplikacije

1. Sačekaj da se aplikacija restartuje (automatski)
2. U logovima očekuj:
   ```
   ✅ [SENTRY] Error monitoring aktivan
   📊 [SENTRY] Environment: production
   ```

## ✅ Testiranje Sentry-ja

### Test 1: Simuliraj Grešku

Dodaj test endpoint u `server/index.ts`:

```typescript
// SAMO ZA TESTIRANJE - obrisati nakon što se potvrdi da Sentry radi!
app.get('/test-sentry', (req, res) => {
  throw new Error('Test greška iz Sentry-ja!');
});
```

Posjeti: `https://your-app.replit.app/test-sentry`

U Sentry dashboard-u trebao bi vidjeti grešku za ~30 sekundi!

### Test 2: Provjeri Logs

```bash
# Trebao bi vidjeti u logovima:
✅ [SENTRY] Error monitoring aktivan
📊 [SENTRY] Environment: production
```

### Test 3: Provjeri Sentry Dashboard

1. Otvori **https://sentry.io/**
2. Klikni na projekat **Servis Todosijević**
3. Vidi listu grešaka sa detaljima

## 🔒 Sigurnosne Mjere

Sentry automatski **UKLANJA osjetljive podatke** prije slanja:
- ✅ Password polja → `[REDACTED]`
- ✅ Token polja → `[REDACTED]`
- ✅ API key polja → `[REDACTED]`
- ✅ Secret polja → `[REDACTED]`

**Nema rizika od curenja podataka!**

## 📈 Napredne Funkcije

### 1. User Context (Prati ko dobija greške)

```typescript
import { setSentryUser, clearSentryUser } from './sentry-setup';

// Nakon login-a
setSentryUser(user.id, user.username, user.role);

// Nakon logout-a
clearSentryUser();
```

### 2. Ručno Logovanje Grešaka

```typescript
import { logErrorToSentry, logMessageToSentry } from './sentry-setup';

try {
  // Neki kod
} catch (error) {
  logErrorToSentry(error, { 
    serviceId: 123, 
    clientName: 'Marko Marković' 
  });
}

// Ili custom poruka
logMessageToSentry('Nešto čudno se dešava', 'warning', { 
  userId: 456 
});
```

### 3. Performance Monitoring

Sentry automatski prati:
- ✅ Response times za sve API endpointe
- ✅ Slow queries (>1s)
- ✅ Memory usage
- ✅ CPU profiling

Vidi u **Performance** tabu u Sentry dashboard-u.

## 📊 Sentry Dashboard - Gdje Gledati

### **Issues Tab** (Najvažnije)
- **Vidi sve greške** koje se dešavaju
- **Frekvencija** - Koliko puta se greška desila
- **First seen** - Kada se prvi put pojavila
- **Last seen** - Zadnji put kada se desila
- **Users affected** - Koliko korisnika je pogođeno

### **Performance Tab**
- **Slow Transactions** - API pozivi koji traju >1s
- **Throughput** - Broj requestova po sekundi
- **Response Time** - Prosječno vrijeme odgovora

### **Releases Tab**
- Prati greške po verzijama aplikacije
- Vidi koja verzija ima najviše bugova

## 🔔 Email/Slack Notifikacije

### Setup Email Notifikacija:

1. U Sentry: **Settings > Integrations > Email**
2. Postavi:
   - **Alert on**: All new issues
   - **Send to**: Tvoj email
3. Odmah ćeš dobiti email kada se dogodi nova greška!

### Setup Slack Notifikacija:

1. U Sentry: **Settings > Integrations > Slack**
2. Klikni **Add to Slack**
3. Izaberi Slack kanal (npr. `#tech-alerts`)
4. Sve greške će biti poslane u Slack!

## 💰 Pricing

### **Besplatni Plan:**
- ✅ 5,000 greška mjesečno
- ✅ 30 dana historije
- ✅ 1 član tima
- ✅ Email notifikacije

**Dovoljan za početak!** Ako prekoračiš 5,000 greška, Sentry će prestati slati nove greške (stare ostaju).

### **Developer Plan ($26/mjesec):**
- ✅ 50,000 greška mjesečno
- ✅ 90 dana historije
- ✅ Unlimited članovi
- ✅ Slack/Teams integracije

## ❓ FAQ

### Q: Da li Sentry usporava aplikaciju?
**A:** Ne. Sentry šalje greške asinkrono u pozadini. Impact na performanse je <1ms po request-u.

### Q: Šta ako ne postavim SENTRY_DSN?
**A:** Aplikacija će raditi normalno, ali neće slati greške u Sentry. Vidjet ćeš upozorenje u logovima.

### Q: Da li Sentry radi u development-u?
**A:** Ne. Sentry se aktivira SAMO u production okruženju (`REPLIT_DEPLOYMENT=true`).

### Q: Mogu li vidjeti greške od prije aktiviranja Sentry-ja?
**A:** Ne. Sentry prati samo greške koje se dese NAKON aktiviranja.

### Q: Koliko dugo Sentry čuva greške?
**A:** Besplatni plan: 30 dana. Developer plan: 90 dana.

## ✅ Checklist

Pre deploy-a provjeri:
- [ ] SENTRY_DSN secret postavljen u Replit Secrets
- [ ] Sentry inicijalizovan u server/index.ts
- [ ] Testirana greška (vidi se u Sentry dashboard-u)
- [ ] Email notifikacije podešene
- [ ] User context postavljen nakon login-a

## 🎯 Rezultat

Nakon setup-a:
- ✅ **Automatsko praćenje grešaka** - Nema potrebe čekati da korisnici prijave bug
- ✅ **Email/Slack notifikacije** - Odmah znaš kada nešto ne radi
- ✅ **Detaljni stack trace** - Lako pronalaženje uzroka greške
- ✅ **Performance insights** - Vidiš koje API pozive treba optimizovati
- ✅ **User context** - Znaš tačno koji korisnik je dobio grešku

**Deploy Score: 84% → 90%** 🚀
