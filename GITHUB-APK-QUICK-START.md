# ⚡ GitHub APK Build - Brzi Start

> **5 minuta do prvog APK-a** - Sledeći samo ove korake dobićete potpisan Android APK.

---

## TRENUTNO STANJE ✅

Vaš projekat je **POTPUNO SPREMAN** za GitHub Actions build:

- ✅ `android/app/build.gradle` - Signing konfiguracija spremna
- ✅ `.github/workflows/build-apk.yml` - Workflow kreiran
- ✅ `.gitignore` - Keystore fajlovi zaštićeni
- ✅ Capacitor 7.2.0 instaliran

**Jedino što vam treba: 3 GitHub Secrets**

---

## KORACI

### 1️⃣ KREIRAJTE KEYSTORE (Jednom)

**Windows Command Prompt:**
```cmd
keytool -genkey -v -keystore servis-todosijevic-release.keystore -alias servis-todosijevic -keyalg RSA -keysize 2048 -validity 10000
```

**Mac/Linux Terminal:**
```bash
keytool -genkey -v \
  -keystore servis-todosijevic-release.keystore \
  -alias servis-todosijevic \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

**Popunite informacije:**
- Password: [NAPRAVITE JAK PASSWORD - zapišite ga!]
- Ime: Frigo Sistem Todosijević
- Organizacija: Frigo Sistem Todosijević
- Grad: Beograd
- Država: RS

**VAŽNO:** Sačuvajte keystore fajl i password - ne možete ih menjati kasnije!

---

### 2️⃣ KONVERTUJTE U BASE64

**Windows PowerShell:**
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("servis-todosijevic-release.keystore")) | Out-File -Encoding ASCII keystore-base64.txt
```

**Mac/Linux:**
```bash
base64 -i servis-todosijevic-release.keystore -o keystore-base64.txt
```

Dobićete `keystore-base64.txt` fajl sa dugim stringom.

---

### 3️⃣ DODAJTE GITHUB SECRETS

1. GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Kliknite **New repository secret** 3 puta:

| Secret Name | Vrednost |
|------------|----------|
| `KEYSTORE_FILE` | Sadržaj `keystore-base64.txt` fajla (kompletan string) |
| `KEYSTORE_ALIAS` | `servis-todosijevic` |
| `KEYSTORE_PASSWORD` | [Password koji ste kreirali u koraku 1] |

---

### 4️⃣ PUSH NA GITHUB

```bash
git add .
git commit -m "🚀 GitHub Actions APK build spreman"
git push origin main
```

---

### 5️⃣ POKRENITE BUILD

1. GitHub repo → **Actions** tab
2. Kliknite **Build Signed Android APK**
3. Kliknite **Run workflow** → **Run workflow**
4. Sačekajte 3-7 minuta

---

### 6️⃣ PREUZMITE APK

**Opcija A: Artifacts (za testiranje)**
- Na stranici workflow run-a → sekcija **Artifacts**
- Preuzmite `servis-todosijevic-signed-apk-vXXX.zip`
- Raspakovite ZIP → `app-release.apk`

**Opcija B: Releases (za distribuciju)**
- GitHub repo → **Releases**
- Najnoviji release → **Assets** → `app-release.apk`

---

## 🎉 GOTOVO!

Imate potpisan APK spremnih za instalaciju na Android uređaje.

### Za Sledeće Verzije:

1. Ažurirajte verziju u `android/app/build.gradle`:
   ```gradle
   versionCode 3  // +1
   versionName "1.0.2"
   ```

2. Push:
   ```bash
   git add .
   git commit -m "v1.0.2"
   git tag v1.0.2
   git push --tags
   ```

3. GitHub automatski kreira novi APK!

---

## 📖 Detaljni Vodič

Za troubleshooting i napredne opcije, pogledajte:
👉 **[GITHUB-APK-DEPLOYMENT.md](GITHUB-APK-DEPLOYMENT.md)**

---

## ⚠️ BACKUP UPOZORENJE

**OBAVEZNO sačuvajte backup:**
1. `servis-todosijevic-release.keystore` fajl
2. Password koji ste koristili
3. Alias: `servis-todosijevic`

Bez keystore-a **NE MOŽETE** ažurirati aplikaciju na Google Play Store!

**Backup lokacije:**
- ✅ Eksterni hard disk
- ✅ USB stick
- ✅ Cloud storage (enkriptovan folder)

---

**Kontakt:** jelena@frigosistemtodosijevic.com
