# 🚀 Production Deployment Checklist - Servis Todosijević

## ✅ Pre-Deployment Provera

### 1. Environment & Database
- [x] **Database URL**: Automatski koristi `DATABASE_URL` u produkciji (REPLIT_DEPLOYMENT=true)
- [x] **Development DB**: `DEV_DATABASE_URL` samo za development
- [x] **Auto-switch**: db.ts automatski switchuje između dev i production baze
- [x] **Connection Pool**: Enterprise-grade pooling (max: 25, min: 2)

### 2. Secrets Configuration ✅
Svi potrebni secrets su podešeni:
- [x] `DATABASE_URL` - Production database (Neon PostgreSQL)
- [x] `JWT_SECRET` - JWT autentifikacija
- [x] `SESSION_SECRET` - Session security
- [x] `EMAIL_PASSWORD` / `SMTP_PASSWORD` - Email servisi
- [x] `EMAIL_USER` - SMTP korisnik
- [x] `EMAIL_HOST` - SMTP server
- [x] `WHATSAPP_ACCESS_TOKEN` - WhatsApp Business API
- [x] `WHATSAPP_PHONE_NUMBER_ID` - WhatsApp broj

### 3. Production-Ready Features
- [x] **Production Logger**: `server/production-logger.ts` automatski disabluje debug logove
- [x] **Error Handling**: Svi routes imaju try-catch blokove
- [x] **Database Health Check**: Monitoring aktivan
- [x] **Session Store**: Memory store za development, production će koristiti connect-pg-simple

### 4. Email Konfiguracija
Production email adrese (LEGITIMNE, ne testne):
- [x] Admin: `jelena@frigosistemtodosijevic.com`, `jelena@frigosistemtodosijevic.me`
- [x] Beko Partner: `mp4@eurotehnikamn.me`
- [x] ComPlus: `servis@complus.me`
- [x] Servis Komerc: `info@serviscommerce.me`

### 5. WhatsApp Integration
- [x] WhatsApp Business API konfigurisana
- [x] Webhook handler aktivan
- [x] Fallback messaging sistem

### 6. Billing System
- [x] ComPlus billing (Enhanced + Regular)
- [x] Beko billing (Enhanced + Regular)  
- [x] Admin price override (billingPrice ima prioritet)
- [x] Default tarife: ComPlus 25€, Beko 30.25€
- [x] CSV export sa "Izvršeni rad" kolonom

### 7. Security
- [x] Passport autentifikacija
- [x] JWT tokens
- [x] CORS podešen
- [x] Helmet security headers
- [x] Rate limiting aktivan
- [x] SQL injection zaštita (Drizzle ORM)

### 8. Performance
- [x] Database connection pooling
- [x] Image optimization service
- [x] Caching mehanizmi
- [x] Query optimization

---

## 🔧 Deployment Koraci

### 1. Pre-Deploy Provera
```bash
# Provera TypeScript grešaka
npm run build

# Provera LSP dijagnostike
# (već urađeno - nema grešaka)
```

### 2. Environment Setup
- [x] REPLIT_DEPLOYMENT=true (automatski se setuje pri deploy-u)
- [x] NODE_ENV=production (automatski)
- [x] Svi secrets podešeni u Replit Secrets

### 3. Database Migration
```bash
# Development baza se NE dira
# Production baza: Automatski push schema
npm run db:push --force
```

### 4. Deploy Process
1. Kliknite "Deploy" dugme u Replit-u
2. Replit automatski:
   - Setuje REPLIT_DEPLOYMENT=true
   - Koristi DATABASE_URL (production)
   - Build-uje aplikaciju
   - Pokreće na port 5000

### 5. Post-Deploy Provera
- [ ] Login kao admin
- [ ] Kreiraj test servis
- [ ] Proveri email notifikacije
- [ ] Proveri billing izvještaje
- [ ] Proveri WhatsApp integraciju
- [ ] Testiranje u mobile browser-u

---

## 📊 Monitoring

### Health Check Endpoints
- `/api/health` - Database health
- `/api/jwt-user` - User authentication

### Logs
- Production logovi se automatski filtriraju (debug isključen)
- Error logovi ostaju aktivni
- WhatsApp webhook logs

### Cron Jobs
- [x] ComPlus dnevni izvještaj: 22:00
- [x] Beko dnevni izvještaj: 22:30
- [x] Servis Komerc izvještaj: 22:00
- [x] Storage cleanup: Nedeljno 03:00
- [x] Storage stats: Mesečno 09:00

---

## 🔒 Sigurnost

### Production Security Checklist
- [x] Passwordi hashirani (bcrypt)
- [x] JWT tokens sa expiracijom
- [x] Session security (httpOnly cookies)
- [x] CSRF zaštita
- [x] XSS prevention
- [x] SQL injection zaštita (Drizzle ORM)

### Secrets Management
- [x] Svi sensitiv podatci u environment variables
- [x] Nema hardkodovanih kredencijala u kodu
- [x] .env fajlovi nisu commitovani

---

## ⚠️ Važne Napomene

### Development vs Production
- **Development**: Koristi `DEV_DATABASE_URL`, debug logovi aktivni
- **Production**: Koristi `DATABASE_URL`, debug logovi isključeni

### Email Adrese
**NE MENJATI** sledeće email adrese - one su LEGITIMNE production adrese:
- jelena@frigosistemtodosijevic.com
- jelena@frigosistemtodosijevic.me  
- mp4@eurotehnikamn.me (Beko partner)
- servis@complus.me (ComPlus partner)
- info@serviscommerce.me (Servis Komerc)

### Database
- Development: `development_db` (DEV_DATABASE_URL)
- Production: `neondb` (DATABASE_URL)
- **Automatski switching aktiviran** - nema potrebe za manual konfiguraciju

---

## 🎯 Ready for Production!

✅ Aplikacija je potpuno pripremljena za produkciju:
- Svi secrets podešeni
- Database automatski switchuje
- Debug logovi isključeni u produkciji
- Security features aktivirani
- Monitoring aktivan
- Email i WhatsApp integracije spremne

**Može se pokrenuti deploy!** 🚀

---

## 📞 Support Contact
- Admin: jelena@frigosistemtodosijevic.com
- Technical: vladimir.jela.84@gmail.com
