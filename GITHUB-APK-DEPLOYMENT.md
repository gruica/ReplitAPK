# 🚀 GitHub Actions - Kompletni Vodič za APK Build

> **NULTA TOLERANCIJA NA GREŠKE** - Ovaj vodič sadrži svaki korak potreban za uspešno kreiranje potpisanog Android APK fajla pomoću GitHub Actions.

---

## 📋 SADRŽAJ

1. [Preduslovi](#preduslovi)
2. [Kreiranje Android Keystore](#1-kreiranje-android-keystore)
3. [Dodavanje GitHub Secrets](#2-dodavanje-github-secrets)
4. [Push na GitHub](#3-push-na-github)
5. [Pokretanje Build-a](#4-pokretanje-build-a)
6. [Preuzimanje APK-a](#5-preuzimanje-apk-a)
7. [Troubleshooting](#troubleshooting)

---

## PREDUSLOVI

### Potrebni alati:
- ✅ Java JDK 11+ instaliran (za `keytool` komandu)
- ✅ Git instaliran
- ✅ GitHub repository kreiran
- ✅ GitHub nalog sa pristupom repository-ju

### Provera instalacije:
```bash
# Provera Java verzije
java -version
# Trebalo bi da vidite verziju 11 ili noviju

# Provera keytool-a (dolazi sa Java-om)
keytool -help
# Trebalo bi da vidite listu komandi
```

---

## 1. KREIRANJE ANDROID KEYSTORE

### Šta je Keystore?
Keystore je digitalni fajl koji sadrži **privatni ključ** za potpisivanje vaše Android aplikacije. Ovo je **KRITIČAN FAJL** - bez njega ne možete ažurirati aplikaciju na Google Play Store-u.

### 🔐 VAŽNO UPOZORENJE:
- **NIKADA nemojte commitovati keystore na GitHub**
- **Sačuvajte backup keystore fajla na sigurnom mestu**
- **Zapišite password i alias - ako ih izgubite, ne možete ažurirati aplikaciju**

### Korak 1.1: Kreiranje Keystore fajla

Otvorite terminal/command prompt i pokrenite:

```bash
keytool -genkey -v \
  -keystore servis-todosijevic-release.keystore \
  -alias servis-todosijevic \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

**Za Windows (Command Prompt):**
```cmd
keytool -genkey -v -keystore servis-todosijevic-release.keystore -alias servis-todosijevic -keyalg RSA -keysize 2048 -validity 10000
```

### Korak 1.2: Popunjavanje Informacija

Sistem će vam postaviti pitanja. Evo preporučenih odgovora:

```
Enter keystore password: [NAPRAVITE JAK PASSWORD - zapišite ga!]
Re-enter new password: [PONOVITE PASSWORD]

What is your first and last name?
  [Unknown]: Frigo Sistem Todosijević

What is the name of your organizational unit?
  [Unknown]: IT

What is the name of your organization?
  [Unknown]: Frigo Sistem Todosijević

What is the name of your City or Locality?
  [Unknown]: Beograd

What is the name of your State or Province?
  [Unknown]: Srbija

What is the two-letter country code for this unit?
  [Unknown]: RS

Is CN=Frigo Sistem Todosijević, OU=IT, O=Frigo Sistem Todosijević, L=Beograd, ST=Srbija, C=RS correct?
  [no]: yes

Enter key password for <servis-todosijevic>
  (RETURN if same as keystore password): [PRITISNITE ENTER da koristite isti password]
```

### Korak 1.3: Sačuvajte Važne Informacije

**NAPRAVITE TXT FAJL sa ovim informacijama:**

```
KEYSTORE INFORMACIJE - ČUVATI NA SIGURNOM MESTU
================================================
Keystore fajl: servis-todosijevic-release.keystore
Keystore password: [VAŠ PASSWORD OVDE]
Key alias: servis-todosijevic
Key password: [ISTI KAO KEYSTORE PASSWORD]

Datum kreiranja: [DANAŠNJI DATUM]
Lokacija backup-a: [GDE STE SAČUVALI KEYSTORE]
```

### Korak 1.4: Backup Keystore Fajla

```bash
# Kopirajte keystore na 2-3 sigurne lokacije:
# 1. Eksterni hard disk
# 2. USB stick
# 3. Cloud storage (enkriptovan folder)

# PRIMER:
cp servis-todosijevic-release.keystore ~/Documents/backup/
```

### Korak 1.5: Konvertovanje Keystore u Base64

GitHub Secrets podržavaju samo tekst, pa moramo konvertovati keystore u Base64 format:

**Za Linux/Mac:**
```bash
base64 -i servis-todosijevic-release.keystore -o keystore-base64.txt
```

**Za Windows (PowerShell):**
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("servis-todosijevic-release.keystore")) | Out-File -Encoding ASCII keystore-base64.txt
```

**Rezultat:** Dobićete `keystore-base64.txt` fajl sa dugim Base64 stringom.

---

## 2. DODAVANJE GITHUB SECRETS

### Korak 2.1: Otvaranje GitHub Repository Settings

1. Idite na vaš GitHub repository
2. Kliknite na **Settings** (gornji desni ugao)
3. U levom meniju kliknite **Secrets and variables** → **Actions**
4. Kliknite **New repository secret**

### Korak 2.2: Dodavanje Prva Tri Secrets

#### Secret 1: KEYSTORE_FILE

- **Name:** `KEYSTORE_FILE`
- **Value:** Otvorite `keystore-base64.txt` i kopirajte **KOMPLETAN sadržaj** (jedan dugi string bez razmaka)
- Kliknite **Add secret**

**NAPOMENA:** Base64 string može biti dug 2000+ karaktera - to je normalno!

#### Secret 2: KEYSTORE_ALIAS

- **Name:** `KEYSTORE_ALIAS`
- **Value:** `servis-todosijevic` (tačno kako ste uneli pri kreiranju keystore-a)
- Kliknite **Add secret**

#### Secret 3: KEYSTORE_PASSWORD

- **Name:** `KEYSTORE_PASSWORD`
- **Value:** [VAŠ KEYSTORE PASSWORD koji ste kreirali]
- Kliknite **Add secret**

### Korak 2.3: Provera Secrets

Nakon dodavanja, trebalo bi da vidite 3 secrets-a:

```
✅ KEYSTORE_FILE
✅ KEYSTORE_ALIAS
✅ KEYSTORE_PASSWORD
```

**NAPOMENA:** GitHub ne prikazuje vrednosti secrets-a iz sigurnosnih razloga.

---

## 3. PUSH NA GITHUB

### Korak 3.1: Provera Stanja Git Repository-ja

```bash
# Proverite trenutne izmene
git status

# Trebalo bi da vidite izmene na:
# - .gitignore
# - .github/workflows/build-apk.yml
```

### Korak 3.2: Commit i Push

```bash
# Dodajte sve izmene
git add .

# Kreirajte commit
git commit -m "🚀 Pripremljen GitHub Actions workflow za APK build"

# Push na GitHub
git push origin main
```

**NAPOMENA:** Ako nemate GitHub repository, prvo ga kreirajte:

```bash
# Ako repository ne postoji, kreirajte ga na GitHub-u, pa:
git remote add origin https://github.com/VAS-USERNAME/VAS-REPO.git
git branch -M main
git push -u origin main
```

---

## 4. POKRETANJE BUILD-A

### Automatski Build

Workflow **automatski** počinje kada:
- ✅ Push-ujete na `main` branch
- ✅ Kreirate Pull Request ka `main` branch-u
- ✅ Tagujete verziju (npr. `git tag v1.0.0`)

### Ručno Pokretanje (Preporučeno za prvi put)

1. Idite na vaš GitHub repository
2. Kliknite na tab **Actions**
3. U levom meniju kliknite **Build Signed Android APK**
4. Kliknite **Run workflow** (dugme desno)
5. Izaberite branch `main`
6. Kliknite zeleno dugme **Run workflow**

### Praćenje Progresa

1. Na **Actions** stranici videćete novi workflow run
2. Kliknite na njega da vidite detalje
3. Pratite svaki korak:
   - ✅ Checkout code
   - ✅ Set up JDK 17
   - ✅ Set up Node.js 20
   - ✅ Install dependencies
   - ✅ Build web application
   - ✅ Decode keystore
   - ✅ Sync Capacitor
   - ✅ **Build and Sign Release APK** ← Najvažniji korak
   - ✅ Verify APK signature
   - ✅ Upload APK
   - ✅ Create GitHub Release

**Vreme trajanja:** 3-7 minuta (zavisi od brzine GitHub servera)

---

## 5. PREUZIMANJE APK-A

### Metoda 1: Preuzimanje iz Artifacts (Preporučeno)

1. Na stranici workflow run-a, skrolujte dole do sekcije **Artifacts**
2. Videćete: `servis-todosijevic-signed-apk-v123` (broj zavisi od build broja)
3. Kliknite na artifact da preuzmete ZIP fajl
4. Raspakovite ZIP - unutra je `app-release.apk`

### Metoda 2: Preuzimanje iz Releases

1. Idite na glavnu stranicu repository-ja
2. Kliknite na **Releases** (desna strana)
3. Kliknite na najnoviji release (npr. `v123`)
4. U sekciji **Assets** kliknite na `app-release.apk`

### Metoda 3: Direktan Download Link

```
https://github.com/VAS-USERNAME/VAS-REPO/releases/latest/download/app-release.apk
```

---

## 6. INSTALACIJA APK-A NA ANDROID TELEFON

### Korak 6.1: Transfer APK-a na Telefon

**Opcija A: Email**
- Pošaljite sebi email sa APK-om kao attachment
- Otvorite email na telefonu i preuzmite APK

**Opcija B: USB Cable**
- Povežite telefon sa računarom
- Kopirajte APK u `Downloads` folder na telefonu

**Opcija C: Cloud Storage**
- Upload APK na Google Drive / Dropbox
- Preuzmite sa telefona

### Korak 6.2: Omogućavanje Instalacije iz Nepoznatih Izvora

**Za Android 8.0+:**
1. Podešavanja → Bezbednost
2. Pronađite "Instalacija nepoznatih aplikacija"
3. Izaberite pretraživač/app koji koristite (npr. Chrome, Downloads)
4. Uključite "Dozvoli iz ovog izvora"

**Za starije Android verzije:**
1. Podešavanja → Bezbednost
2. Označite "Nepoznati izvori"

### Korak 6.3: Instalacija

1. Otvorite APK fajl (kroz pretraživač ili file manager)
2. Android će prikazati ekran za instalaciju
3. Kliknite **Instaliraj**
4. Sačekajte da se instalacija završi
5. Kliknite **Otvori**

---

## TROUBLESHOOTING

### Problem 1: Build Fails - "Keystore password incorrect"

**Simptomi:**
```
Execution failed for task ':app:validateSigningRelease'
> Keystore was tampered with, or password was incorrect
```

**Rešenje:**
- Proverite da li je `KEYSTORE_PASSWORD` secret tačan
- Proverite da li ste koristili isti password za keystore i key
- Kreirajte novi keystore ako ste zaboravili password

### Problem 2: Base64 Decode Fails

**Simptomi:**
```
base64: invalid input
```

**Rešenje:**
- Proverite da `KEYSTORE_FILE` secret ne sadrži razmake ili novi redove
- Ponovo konvertujte keystore sa `-w 0` opcijom (Linux):
  ```bash
  base64 -w 0 servis-todosijevic-release.keystore > keystore-base64.txt
  ```

### Problem 3: Gradle Build Fails

**Simptomi:**
```
Task :app:assembleRelease FAILED
```

**Rešenje 1: Proverite Node verziju**
- Workflow koristi Node 20 - proverite da vaš `package.json` to podržava

**Rešenje 2: Proverite Capacitor sync**
- Lokalno pokrenite: `npx cap sync android`
- Commitujte eventualne izmene

### Problem 4: APK Nije Potpisan

**Simptomi:**
```
jarsigner: unable to sign jar: java.util.zip.ZipException: invalid entry compressed size
```

**Rešenje:**
- Proverite da je keystore fajl ispravno dekodiran
- Dodajte `-verbose` flag u build komandu za više detalja

### Problem 5: GitHub Actions Nije Pokrenut

**Rešenje:**
1. Proverite da je workflow fajl na pravom mestu: `.github/workflows/build-apk.yml`
2. Proverite sintaksu YAML fajla
3. Idite na **Actions** tab pa **Enable workflows** ako je onemogućeno

---

## 🎯 CHECKLIST PRE PRODUCTION BUILD-A

Pre nego što napravite finalni APK za distribuciju:

- [ ] Ažurirajte `versionCode` u `android/app/build.gradle` (svaki release mora imati veći broj)
- [ ] Ažurirajte `versionName` u `android/app/build.gradle` (npr. "1.0.1")
- [ ] Testirajte aplikaciju lokalno: `npm run build && npx cap sync android`
- [ ] Proverite da su svi secrets tačni na GitHub-u
- [ ] Napravite Git tag za verziju: `git tag v1.0.1 && git push --tags`
- [ ] Pokrenite GitHub Actions workflow
- [ ] Preuzmite i testirajte APK na pravom Android uređaju
- [ ] Proverite potpis APK-a: `jarsigner -verify -verbose -certs app-release.apk`

---

## 📞 DODATNA POMOĆ

### GitHub Actions Dokumentacija
- https://docs.github.com/en/actions

### Android Signing Dokumentacija
- https://developer.android.com/studio/publish/app-signing

### Capacitor Build Dokumentacija
- https://capacitorjs.com/docs/android

### Kontakt za Podršku
- Email: jelena@frigosistemtodosijevic.com

---

## 🔄 REDOVNI WORKFLOW ZA NOVE VERZIJE

1. Napravite izmene u kodu
2. Testirajte lokalno
3. Ažurirajte verziju u `android/app/build.gradle`:
   ```gradle
   versionCode 3  // Uvećajte za 1
   versionName "1.0.2"  // Ažurirajte verziju
   ```
4. Commit i push:
   ```bash
   git add .
   git commit -m "Release v1.0.2"
   git tag v1.0.2
   git push origin main --tags
   ```
5. GitHub Actions automatski kreira novi APK
6. Preuzmite iz Releases
7. Distribuirajte korisnicima

---

**USPEŠAN BUILD! 🎉**

Ako ste sledili sve korake, sada imate potpisan Android APK koji možete distribuirati korisnicima ili upload-ovati na Google Play Store.
