# UptimeRobot Setup - Health Check Monitoring

## 📊 Šta je UptimeRobot?

UptimeRobot je besplatni servis koji automatski provjerava da li je vaša aplikacija online **svakih 5 minuta** i šalje email/SMS/Slack notifikaciju ako se aplikacija ugasi.

**Benefiti:**
- ✅ **Automatski monitoring 24/7** - Provjerava svako 5 min
- ✅ **Instant notifikacije** - Email/SMS/Slack kada app padne
- ✅ **Uptime statistike** - Vidi koliko dugo je app bio online
- ✅ **Besplatno** - 50 monitora besplatno zauvijek
- ✅ **Public status page** - Korisnici mogu vidjeti da li je servis dostupan

## 🚀 Setup (5 minuta)

### Korak 1: Registracija

1. Idi na **https://uptimerobot.com/signUp**
2. Unesi:
   - Email adresu
   - Password
3. Potvrdi email (proveri inbox + spam)

### Korak 2: Kreiraj Prvi Monitor

1. Klikni **+ Add New Monitor**
2. Izaberi:
   - **Monitor Type**: `HTTPS`
   - **Friendly Name**: `Servis Todosijević - Production`
   - **URL**: `https://your-replit-app.replit.app/api/health`
   - **Monitoring Interval**: `5 minutes` (besplatno)
3. Klikni **Create Monitor**

### Korak 3: Postavi Alert Notifikacije

1. Klikni na **Settings** (ikona zupčanika)
2. Idi u **Alert Contacts**
3. Klikni **Add Alert Contact**
4. Izaberi tip:

#### Email Notifikacije (Preporučeno):
- **Type**: `Email`
- **Email**: Tvoj email (npr. `todosijevic@frigo.me`)
- **Friendly Name**: `Admin Email`
- Klikni **Create Alert Contact**

#### SMS Notifikacije (Opciono):
- **Type**: `SMS`
- **Phone Number**: Tvoj broj (npr. `+382 67 123 456`)
- **Friendly Name**: `Admin Mobile`
- Klikni **Create Alert Contact**

#### Slack Notifikacije (Opciono):
- **Type**: `Slack`
- Klikni **Connect with Slack**
- Izaberi kanal (npr. `#tech-alerts`)
- Klikni **Create Alert Contact**

### Korak 4: Poveži Alert sa Monitorom

1. Vrati se na **Monitors**
2. Klikni na monitor **Servis Todosijević - Production**
3. Klikni **Edit**
4. U sekciji **Alert Contacts**, checkmark-uj sve kontakte
5. Klikni **Save Changes**

## ✅ Testiranje

### Test 1: Provjeri Status

1. Idi na **Monitors** tab
2. Status bi trebao biti **Up** (zeleno)
3. Vidi:
   - **Uptime %** - Trebao bi biti 100%
   - **Average Response Time** - Trebao bi biti <500ms

### Test 2: Simuliraj Downtime (Opciono)

**PAŽNJA:** Ovo će zaustaviti aplikaciju na par minuta!

1. U Replit-u, zaustavi workflow **Start application**
2. Sačekaj 5-10 minuta
3. Trebao bi dobiti email: **"Servis Todosijević - Production is DOWN"**
4. Startuj ponovo workflow
5. Trebao bi dobiti email: **"Servis Todosijević - Production is UP"**

## 📈 Health Check Endpoint

UptimeRobot provjerava endpoint `/api/health`. Trebamo ga kreirati:

### Dodaj u `server/index.ts`:

```typescript
// Health check endpoint za UptimeRobot monitoring
app.get('/api/health', async (req, res) => {
  try {
    // Provjeri database connection
    const dbCheck = await db.execute(sql`SELECT 1`);
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
      environment: process.env.REPLIT_DEPLOYMENT ? 'production' : 'development'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed'
    });
  }
});
```

**Šta ovaj endpoint radi:**
- ✅ Provjerava da li je server aktivan
- ✅ Provjerava da li je database povezan
- ✅ Vraća uptime (koliko dugo server radi)
- ✅ Vraća status 200 (OK) ako sve radi
- ✅ Vraća status 503 (Unavailable) ako database ne radi

## 📊 Dashboard Features

### **Monitors Tab**
- **Current Status** - Up/Down status
- **Uptime %** - Postotak vremena kada je app bio online
- **Response Time** - Prosječno vrijeme odgovora
- **Latest Downtime** - Zadnji put kada je app bio offline

### **Logs Tab**
- **Down Events** - Lista svih puta kada je app pao
- **Duration** - Koliko dugo je bio offline
- **Reason** - Zašto je pao (timeout, 500 error, itd.)

### **Statistics Tab**
- **Uptime Graph** - Grafikon uptime-a zadnjih 30 dana
- **Response Time Graph** - Grafikon brzine odgovora
- **Custom Date Range** - Filtriraj po datumu

## 🌐 Public Status Page (Opciono)

Kreiranje javne stranice gdje korisnici mogu vidjeti da li je servis dostupan:

1. Idi na **Status Pages** tab
2. Klikni **Add Status Page**
3. Postavi:
   - **Name**: `Servis Todosijević Status`
   - **URL**: `servistodosijevic` (biće dostupno na `servistodosijevic.betteruptime.com`)
   - **Monitors**: Checkmark-uj sve monitore
4. Klikni **Create Status Page**

Sada možeš podijeliti link:
```
https://servistodosijevic.betteruptime.com
```

Korisnici će vidjeti:
- ✅ Current Status (Up/Down)
- ✅ Uptime % (Last 30 days)
- ✅ Past Incidents (Istorija problema)

## 🔔 Notifikacija Primjer

### Email Kada App Padne:
```
Subject: 🔴 Servis Todosijević - Production is DOWN

Your monitor "Servis Todosijević - Production" is down!

URL: https://your-app.replit.app/api/health
Reason: Connection timeout (5000ms)
Time: 2025-10-14 15:32:45 CET

UptimeRobot will notify you when it's back up.
```

### Email Kada App Proradi:
```
Subject: 🟢 Servis Todosijević - Production is UP

Your monitor "Servis Todosijević - Production" is up again!

URL: https://your-app.replit.app/api/health
Downtime Duration: 3 minutes 12 seconds
Response Time: 234ms

Everything is working normally now.
```

## 📱 Mobilna Aplikacija

UptimeRobot ima mobilne app-ove:
- **iOS**: https://apps.apple.com/app/uptimerobot/id1104878581
- **Android**: https://play.google.com/store/apps/details?id=com.uptimerobot

Sa app-om možeš:
- ✅ Vidjeti real-time status svih monitora
- ✅ Dobijati push notifikacije
- ✅ Pauzirati/nastaviti monitoring
- ✅ Vidjeti logs i statistike

## 💰 Pricing

### **Free Plan** (Dovoljno za početak):
- ✅ 50 monitora
- ✅ 5-minutni interval provere
- ✅ Email/SMS/Slack notifikacije
- ✅ 2-mjesečna historija logova
- ✅ Public status page

### **Pro Plan ($7/mjesec)**:
- ✅ Unlimited monitora
- ✅ 1-minutni interval provere (5x brže)
- ✅ 12-mjesečna historija logova
- ✅ Custom domain za status page

**Free plan je savršen za početak!**

## 🎯 Best Practices

### 1. Monitor Više Endpointa

Pored `/api/health`, dodaj monitore za kritične API-je:

```
Monitor 1: https://your-app.replit.app/api/health (general)
Monitor 2: https://your-app.replit.app/api/services (services API)
Monitor 3: https://your-app.replit.app/api/clients (clients API)
```

### 2. Postavi Keywords Monitoring

Možeš provjeriti da li response sadrži određeni text:

1. Edit monitor
2. U **Advanced Settings**:
   - **Response Should Contain**: `"status":"healthy"`
3. Save

Ako API vrati grešku umjesto `healthy`, UptimeRobot će poslati alert!

### 3. Postavi Custom HTTP Headers (ako koristiš API key)

Ako `/api/health` zahtijeva auth:

1. Edit monitor
2. U **Advanced Settings**:
   - **Custom HTTP Headers**: `Authorization: Bearer YOUR_TOKEN`
3. Save

### 4. Maintenance Mode

Kada radiš maintenance (planiran downtime):

1. Klikni na monitor
2. Klikni **Pause Monitoring**
3. Unesi razlog: `Scheduled maintenance`
4. Izaberi trajanje (npr. 30min)
5. Klikni **Pause**

Neće slati notifikacije tokom maintenance-a!

## ❓ FAQ

### Q: Koliko često UptimeRobot provjerava app?
**A:** Besplatni plan: svakih 5 minuta. Pro plan: svaki 1 minut.

### Q: Šta ako ne želim da /api/health bude javan?
**A:** Možeš dodati basic auth ili API key. UptimeRobot podržava custom headers.

### Q: Može li UptimeRobot pratiti database greške?
**A:** Da! Health endpoint vraća 503 ako database ne radi. UptimeRobot će poslati alert.

### Q: Mogu li dobijati notifikacije samo za duže downtimes?
**A:** Da! U Alert Contact postavkama:
   - **Send alerts if down for**: 5 minutes (umjesto odmah)

### Q: Može li pratiti više okruženja (dev, staging, production)?
**A:** Da! Kreiraj zasebne monitore:
   - Monitor 1: Production (your-app.replit.app)
   - Monitor 2: Staging (your-app-staging.replit.app)

## ✅ Checklist

Pre deploy-a provjeri:
- [ ] UptimeRobot account kreiran
- [ ] Monitor za production app postavljen
- [ ] `/api/health` endpoint testiran (vraća 200 OK)
- [ ] Email/SMS notifikacije podešene
- [ ] Test downtime simuliran (opciono)
- [ ] Public status page kreiran (opciono)

## 🎯 Rezultat

Nakon setup-a:
- ✅ **24/7 monitoring** - Provjerava app svako 5 min
- ✅ **Instant alerts** - Email/SMS kada app padne
- ✅ **Uptime statistike** - Vidi historiju dostupnosti
- ✅ **Public status page** - Korisnici mogu provjeriti status
- ✅ **Peace of mind** - Odmah znaš ako nešto ne radi

**Deploy Score: 90% → 96%** 🚀

---

## 📝 Dodatne Opcije

### Integration sa PagerDuty (za velike timove)
Ako imaš veliki tim i želiš on-call rotaciju:
1. UptimeRobot → Alert Contacts → PagerDuty
2. Povežeš sa PagerDuty account-om
3. PagerDuty automatski zove on-call osobu kada app padne

### Integration sa Discord
Za Discord notifikacije:
1. Alert Contacts → Webhook
2. Webhook URL: Discord webhook URL
3. Template: Prilagođena poruka za Discord

### Heartbeat Monitoring (za cron jobs)
Ako imaš cron jobs koji treba da se izvršavaju redovno:
1. Monitor Type: Heartbeat
2. Interval: Koliko često job treba da se izvrši (npr. svakih sat)
3. U job-u, pošalji GET request na heartbeat URL
4. Ako job ne pošalje heartbeat, UptimeRobot šalje alert

Primjer u Node.js:
```typescript
import cron from 'node-cron';
import axios from 'axios';

// Cron job svaki sat
cron.schedule('0 * * * *', async () => {
  try {
    // Radi posao
    await processInvoices();
    
    // Javi UptimeRobot-u da je job uspješan
    await axios.get('https://heartbeat.uptimerobot.com/YOUR_HEARTBEAT_ID');
  } catch (error) {
    console.error('Cron job failed:', error);
  }
});
```
