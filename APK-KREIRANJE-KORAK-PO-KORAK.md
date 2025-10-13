# 📱 APK KREIRANJE - PRAKTIČAN VODIČ KORAK PO KORAK

**Datum:** 10. oktobar 2025  
**Za:** Servis Todosijević Mobile App  
**Potrebno vrijeme:** 20 minuta ukupno

---

## 🎯 ŠTA ĆETE DOBITI

✅ Potpuno funkcionalan Android APK  
✅ Automatsko kreiranje APK-a kad god napravite izmjene  
✅ Download link za distribuciju servisarima  

---

## 📋 KORAK 1: GITHUB NALOG (5 minuta)

### 1.1 Kreirajte nalog (ako nemate)
1. **Idite na:** https://github.com
2. **Kliknite:** "Sign up" (gore desno)
3. **Unesite:**
   - Email: vaša email adresa
   - Password: napravite sigurnu lozinku
   - Username: npr. `servis-todosijevic` ili bilo koje ime
4. **Verifikujte** email adresu (provjerite inbox)
5. **Izaberite** FREE plan (besplatno)

### 1.2 Ako već imate GitHub nalog
- Samo se ulogujte na https://github.com
- Prijavite se sa vašim username/password

---

## 📋 KORAK 2: KREIRANJE REPOSITORY (2 minute)

### 2.1 Novi Repository
1. **GitHub početna stranica** → Kliknite **"New"** (zeleno dugme gore lijevo)
   - Ili idite direktno: https://github.com/new

2. **Unesite podatke:**
   ```
   Repository name: servis-todosijevic-app
   Description: Mobilna aplikacija za upravljanje servisima
   
   ✅ Public (besplatno) ili Private (ako želite)
   ✅ Add a README file (čekirajte!)
   ```

3. **Kliknite:** "Create repository" (zeleno dugme dole)

### 2.2 Kopirajte Repository URL
Nakon kreiranja repository-ja vidjet ćete zeleno dugme **"Code"**:

1. Kliknite "Code"
2. Kopirajte URL - izgleda otprilike ovako:
   ```
   https://github.com/servis-todosijevic/servis-todosijevic-app.git
   ```
3. **SAČUVAJTE ovaj URL** - trebat će vam za sledeći korak!

---

## 📋 KORAK 3: POVEZIVANJE SA REPLIT (3 minute)

### 3.1 U Replit konzoli
Otvori **Shell** tab u Replit-u (dole) i pokreni:

```bash
# Inicijalizuj git (ako već nije)
git init

# Dodaj GitHub kao remote
git remote add origin https://github.com/VAŠ-USERNAME/servis-todosijevic-app.git

# Primjer:
# git remote add origin https://github.com/servis-todosijevic/servis-todosijevic-app.git
```

### 3.2 Provjera
```bash
# Provjeri da li je uspješno dodato
git remote -v
```

Trebalo bi da vidite:
```
origin  https://github.com/VAŠ-USERNAME/servis-todosijevic-app.git (fetch)
origin  https://github.com/VAŠ-USERNAME/servis-todosijevic-app.git (push)
```

---

## 📋 KORAK 4: PRVI PUSH NA GITHUB (5 minuta)

### 4.1 Automatski script (NAJLAKŠE!)

U Replit Shell-u:

```bash
# Daj execute permission
chmod +x github-push.sh

# Pokreni automatski push
./github-push.sh
```

Script će **automatski**:
- ✅ Dodati sve fajlove
- ✅ Kreirati commit
- ✅ Push-ovati na GitHub
- ✅ Pokrenuti APK build

### 4.2 Ručni način (ako automatski ne radi)

```bash
# 1. Dodaj sve fajlove
git add .

# 2. Commit sa porukom
git commit -m "Initial commit - APK build"

# 3. Postavi main branch
git branch -M main

# 4. Push na GitHub
git push -u origin main
```

**Možda će zatražiti GitHub pristup:**
- Username: vaš GitHub username
- Password: **NAPRAVITE Personal Access Token** (objasnio sam dole)

---

## 📋 KORAK 5: GITHUB PERSONAL ACCESS TOKEN (ako je potrebno)

Ako GitHub traži password i odbija običan password:

### 5.1 Kreiranje Token-a
1. **GitHub** → Kliknite vašu profilnu sliku (gore desno)
2. **Settings** → **Developer settings** (dole lijevo)
3. **Personal access tokens** → **Tokens (classic)**
4. **Generate new token (classic)**

### 5.2 Podešavanja Token-a
```
Note: Replit APK Build Access
Expiration: 90 days
Čekirajte: 
  ✅ repo (puni pristup)
  ✅ workflow
```

5. **Generate token** (zeleno dugme dole)
6. **KOPIRAJTE token odmah!** (neće se više prikazati)

### 5.3 Korištenje Token-a
```bash
# Kada GitHub traži password, PASTE TOKEN umjesto passworda!
git push -u origin main
Username: vaš-github-username
Password: <PASTE TOKEN OVDJE>
```

---

## 📋 KORAK 6: PRAĆENJE APK BUILD-a (10-15 minuta)

### 6.1 Gdje gledati
1. **Idite na vaš GitHub repository:**
   ```
   https://github.com/VAŠ-USERNAME/servis-todosijevic-app
   ```

2. **Kliknite tab "Actions"** (između Pull requests i Projects)

3. **Vidjet ćete:**
   - 🟡 **Žuto** = Build u toku (čekajte)
   - ✅ **Zeleno** = Build uspješan!
   - ❌ **Crveno** = Build failed (javite mi)

### 6.2 Praćenje progresa
Kliknite na **"Build Android APK"** workflow i vidjet ćete:
- ✅ Checkout repository
- ✅ Setup Node.js
- ✅ Setup Java
- ✅ Build web application
- ✅ Setup Android SDK
- ✅ Build APK
- ✅ Upload APK

---

## 📋 KORAK 7: DOWNLOAD APK-a (1 minut)

### 7.1 Način 1: GitHub Artifacts (BRŽI)
1. **Actions tab** → Kliknite najnoviji **zeleni** workflow
2. **Scrollujte dole** do "Artifacts" sekcije
3. **Download:** "servis-todosijevic-debug-apk"
4. **Unzip fajl** → Gotov APK!

### 7.2 Način 2: GitHub Releases (LAKŠI)
1. **Idite na Releases:**
   ```
   https://github.com/VAŠ-USERNAME/servis-todosijevic-app/releases
   ```
2. **Kliknite najnoviji Release** (npr. "v1")
3. **Download** `app-debug.apk` direktno
4. **Gotovo!**

---

## 📱 KORAK 8: INSTALACIJA APK-a (2 minute)

### 8.1 Na Android telefonu
1. **Prebacite APK** na telefon (WhatsApp, email, USB...)
2. **Otvorite APK fajl**
3. **Ako kaže "Blocked":**
   - Settings → Security → Install unknown apps
   - Omogućite za Chrome/Files/WhatsApp (odakle ste preuzeli)
4. **Kliknite "Install"**
5. **Otvorite aplikaciju** i ulogujte se!

---

## 🔄 BUDUĆI BUILD-OVI (AUTOMATSKI!)

Kad god napravite izmjene u aplikaciji:

### Opcija 1: Automatski script
```bash
./github-push.sh
```

### Opcija 2: Ručno
```bash
git add .
git commit -m "Nova verzija aplikacije"
git push
```

**GitHub Actions će automatski kreirati novi APK!** 🤖

---

## 🆘 ČESTA PITANJA

### ❓ Build je crveno (failed) - šta sad?
1. **Kliknite na crveni workflow**
2. **Pogledajte koji korak je pao**
3. **Screenshot greške i pošaljite mi**
4. Ili pokrenite ponovo: kliknite "Re-run jobs"

### ❓ Ne vidim Artifacts sekciju?
- **Čekajte da build završi** (zelena kvačica)
- **Artefacts se pojave samo kad je build uspješan**

### ❓ Git kaže "permission denied"?
- **Koristite Personal Access Token** umjesto passworda
- **Token treba** `repo` i `workflow` permisije

### ❓ APK se ne instalira na telefonu?
```
1. Android 7.0+ potreban
2. Enable "Install unknown apps"
3. Re-download APK (možda je corrupted)
4. Clear Downloads folder i pokušaj ponovo
```

---

## 📞 GDJE TRAŽITI POMOĆ

**GitHub Repository:**  
https://github.com/VAŠ-USERNAME/servis-todosijevic-app

**APK Downloads:**  
https://github.com/VAŠ-USERNAME/servis-todosijevic-app/releases

**GitHub Actions (build status):**  
https://github.com/VAŠ-USERNAME/servis-todosijevic-app/actions

---

## ✅ CHECKLIST - PROVJERITE DA STE URADILI:

- [ ] GitHub nalog kreiran/ulogovan
- [ ] Repository kreiran (`servis-todosijevic-app`)
- [ ] Repository URL kopiran
- [ ] `git remote add origin` izvršeno
- [ ] Prvi push uspješan (`./github-push.sh` ili `git push`)
- [ ] GitHub Actions pokrenuti (vidite u Actions tab-u)
- [ ] Build je zeleno (uspješan)
- [ ] APK downloadovan (Artifacts ili Releases)
- [ ] APK testiran na telefonu

---

## 🎉 GOTOVO!

Sada imate **potpuno automatizovan sistem** za kreiranje Android APK-a!

**Svaki put kad napravite izmjenu:**
1. Push na GitHub (`./github-push.sh`)
2. Čekaj 10-15 minuta
3. Download novi APK
4. Distribuiraj servisarima!

**Uživajte! 📱🚀**
