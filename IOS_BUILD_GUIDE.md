# 📱 iOS Build Instrukcije za Servis Todosijević

## 🎯 Pregled

iOS projekat je uspešno konfigurisan i spreman za build na vašem Mac računaru! FST logo i splash screens su već integrisani.

---

## ✅ Trenutno Stanje

- ✅ iOS platforma dodata (`ios/` folder kreiran)
- ✅ FST logo ikonica (1024x1024) generisana
- ✅ Splash screens (2732x2732) kreirani sa FST logom
- ✅ Capacitor config optimizovan za production API (tehnikamne.me)
- ✅ Svi plugini konfigurisani (Camera, SplashScreen, StatusBar, Network, itd.)
- ⏳ Čeka se Apple Developer Account verifikacija (~2 dana)

---

## 🔧 Preduslov: Instalacija Alata na Mac-u

### 1. Xcode (Obavezno)
```bash
# Proverite da li je Xcode instaliran
xcode-select --version

# Ako nije instaliran, preuzmite ga sa App Store-a:
# https://apps.apple.com/us/app/xcode/id497799835
```

### 2. CocoaPods (Dependency Manager za iOS)
```bash
# Instalirajte CocoaPods
sudo gem install cocoapods

# Proverite instalaciju
pod --version
```

### 3. Node.js Dependencies
```bash
# Navigirajte do projekta
cd /putanja/do/projekta

# Instalirajte node packages (ako već nisu)
npm install
```

---

## 🏗️ Proces Build-ovanja iOS Aplikacije

### **Korak 1: Pull Poslednje Promene sa GitHub-a**

```bash
# Povucite poslednje izmene
git pull origin main
```

### **Korak 2: Build Frontend Aplikacije**

```bash
# Build production verzije fronta
npm run build
```

### **Korak 3: Sync iOS Projekta sa Web Assets**

```bash
# Sync Capacitor projekat sa iOS folderom
npx cap sync ios
```

**Ova komanda će:**
- Kopirati web assets (HTML, CSS, JS) u iOS App folder
- Instalirati CocoaPods dependencies za sve plugine
- Update-ovati Xcode projekat sa najnovijim kodom

### **Korak 4: Otvorite iOS Projekat u Xcode**

```bash
# Otvori Xcode projekat
npx cap open ios
```

**Alternativno:**
```bash
# Ručno otvorite u Xcode
open ios/App/App.xcworkspace
```

⚠️ **VAŽNO:** Uvek otvarajte `.xcworkspace` fajl, NE `.xcodeproj` (workspace sadrži CocoaPods dependencies)!

---

## 🎨 Xcode Konfiguracija

### **1. Izaberite Development Team**

1. U Xcode-u, kliknite na projekat `App` u Project Navigator-u (leva strana)
2. Izaberite target `App` pod TARGETS
3. Idite na tab **Signing & Capabilities**
4. Pod **Team** odaberite svoj Apple Developer nalog
   - Ako se još nije verifikovao, stavite "Personal Team" privremeno

### **2. Proverite Bundle Identifier**

- Bundle ID: `com.servistodosijevic.mobile`
- Ovo je već konfigurisano u `capacitor.config.ts`

### **3. Proverite Deployment Target**

- Minimum iOS verzija: Preporučeno 13.0+
- Postavite u **General** tabu → **Deployment Info** → **iOS**

---

## 📦 Build za Testiranje na Uređaju

### **Opcija A: Build na Fizičkom iPhone/iPad Uređaju**

1. Povežite iPhone/iPad na Mac USB kablom
2. U Xcode-u, izaberite svoj uređaj iz dropdown-a (gore levo, pored "App" naziva)
3. Kliknite **Run** dugme (▶️ Play ikona)
4. Xcode će:
   - Build-ovati aplikaciju
   - Instalirati je na vaš uređaj
   - Automatski pokrenuti aplikaciju

⚠️ **Prvo Pokretanje na Uređaju:**
- iPhone će možda prikazati upozorenje "Untrusted Developer"
- Idite na **Settings → General → VPN & Device Management**
- Tapnite na vaš developer certifikat i **Trust**

### **Opcija B: Build za iOS Simulator (za testiranje)**

1. U Xcode-u, izaberite simulator (npr. "iPhone 15 Pro")
2. Kliknite **Run** (▶️)
3. iOS Simulator će se pokrenuti sa vašom aplikacijom

**Napomena:** Simulator NE podržava:
- Camera plugin (neće raditi foto upload)
- SMS/Phone funkcije
- Push notifications

---

## 🏪 Build za App Store Distribution

**Kada budete spremni da objavite na App Store:**

### **1. Arhivirajte Aplikaciju**

1. U Xcode-u, idite na **Product → Archive**
2. Sačekajte da se build završi (može trajati nekoliko minuta)
3. Otvoriće se **Organizer** prozor sa vašim arhivama

### **2. Upload na App Store Connect**

1. U Organizer-u, izaberite najnoviju arhivu
2. Kliknite **Distribute App**
3. Izaberite **App Store Connect**
4. Pratite čarobnjak (wizard) za upload
5. Aplikacija će biti upload-ovana na Apple server

### **3. App Store Connect Konfiguracija**

Idite na [App Store Connect](https://appstoreconnect.apple.com):

1. Kreirajte novu aplikaciju (ako je prva verzija)
2. Popunite metadata:
   - **Ime**: Servis Todosijević
   - **Opis**: Opis aplikacije za servis bele tehnike
   - **Screenshots**: Napravite screenshots iz aplikacije
   - **Ikonica**: FST logo (već generisan - 1024x1024)
   - **Privacy Policy**: Link ka privacy policy
3. Sačekajte Apple review (~1-3 dana)
4. Kada se odobri, aplikacija će biti dostupna na App Store-u

---

## 🔄 Update Postojeće Aplikacije

**Kada napravite izmene u kodu:**

```bash
# 1. Pull poslednje izmene
git pull origin main

# 2. Build frontend
npm run build

# 3. Sync sa iOS projektom
npx cap sync ios

# 4. Otvori u Xcode
npx cap open ios

# 5. U Xcode-u:
#    - Povećajte version number (npr. 1.0.0 → 1.0.1)
#    - Povećajte build number (npr. 1 → 2)
#    - Pokrenite build/arhiviranje
```

---

## 🐛 Troubleshooting

### Problem: "CocoaPods not installed"
```bash
sudo gem install cocoapods
pod setup
```

### Problem: "Unable to find xcodebuild"
```bash
# Instalirajte Xcode Command Line Tools
xcode-select --install
```

### Problem: "Signing requires a development team"
- Idite na Xcode → Preferences → Accounts
- Dodajte vaš Apple ID
- Izaberite Personal Team (besplatno) ili Developer Team

### Problem: Build greška sa pluginima
```bash
# Reinstalirajte CocoaPods dependencies
cd ios/App
pod install --repo-update
```

### Problem: Aplikacija ne komunicira sa serverom
- **Proverite:** `capacitor.config.ts` → `server.url` treba biti `https://tehnikamne.me`
- **Ako testrate lokalno:** Povremeno buildujte production verziju da vidite production API

---

## 📚 Korisni Resursi

- [Capacitor iOS Documentation](https://capacitorjs.com/docs/ios)
- [Apple Developer Documentation](https://developer.apple.com/documentation/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [CocoaPods](https://cocoapods.org/)

---

## 📝 Napomene

### FST Logo & Branding
- ✅ Logo je već integrisan u ikonu aplikacije (1024x1024)
- ✅ Splash screen prikazuje FST logo na plavoj pozadini
- ✅ Logo je takođe prisutan u mobilnom interfejsu (header + hamburger menu)

### Production API
- iOS aplikacija je konfigurisana da automatski koristi production server: `https://tehnikamne.me`
- HTTPS je obavezan za sigurnost
- Nema potrebe za dodatnom konfiguracijom

### Test Nalozi
- **Admin:** jelena@frigosistemtodosijevic.com / admin123
- **Tehničar:** gruica@frigosistemtodosijevic.com / serviser123

---

## 🎉 Sledeći Koraci

1. ⏳ **Sačekajte Apple Developer Account verifikaciju** (~2 dana)
2. 🔧 **Pratite korake iznad** da build-ujete aplikaciju na Mac-u
3. 📱 **Testirajte na fizičkom iPhone/iPad** uređaju
4. 🚀 **Upload na App Store** kada budete spremni

---

**Ako imate bilo kakvih pitanja tokom procesa, kontaktirajte me!** 🚀
