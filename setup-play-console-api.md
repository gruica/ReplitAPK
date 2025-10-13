# 🔧 Setup Google Play Console API

Da biste mogli automatski upload-ovati AAB na Google Play Console, potrebno je da:

## 1. 📱 Kreirajte Google Cloud Project

**1.1. Idite na:** https://console.cloud.google.com/
**1.2. Kreirajte novi project** ili odaberite postojeći
**1.3. Omogućite Google Play Android Developer API:**
   - Idite na "APIs & Services" > "Library"
   - Tražite "Google Play Android Developer API"
   - Kliknite "Enable"

## 2. 🔑 Kreirajte Service Account

**2.1. Idite na:** "IAM & Admin" > "Service Accounts"
**2.2. Kliknite "Create Service Account":**
   - **Service account name:** `play-console-uploader`
   - **Service account ID:** `play-console-uploader`
   - **Description:** `Automated AAB upload to Play Console`

**2.3. Kreirajte i download-ujte JSON key:**
   - Kliknite na kreiran service account
   - Idite na "Keys" tab
   - "Add Key" > "Create new key" > "JSON"
   - Download i sačuvajte kao `service-account.json`

## 3. 🔗 Linkujte Service Account sa Play Console

**3.1. Idite na:** https://play.google.com/console/
**3.2. Idite na:** Settings > API Access
**3.3. Kliknite "Link project"** i linkujte vaš Google Cloud project
**3.4. Pronađite vaš service account** u listi i kliknite "Grant access"
**3.5. Dodelite dozvole:**
   - ✅ **Release apps to testing tracks**
   - ✅ **View app information and download bulk reports**
   - ✅ **Reply to reviews**

## 4. 📦 Instalirajte Python dependencies

```bash
pip install google-api-python-client google-auth google-auth-oauthlib google-auth-httplib2
```

## 5. 🚀 Pokrenite upload

```bash
# Stavite service-account.json u isti folder kao script
python3 play-store-upload.py
```

## 📋 Šta script radi:

1. **Autentifikuje** se sa Google Play Developer API
2. **Kreira novi edit** u Play Console
3. **Upload-uje AAB fajl** (`servis-todosijevic-release.aab`)
4. **Dodeljuje na internal track** (za testiranje)
5. **Commit-uje promene**

## ⚠️ Napomene:

- **Prvi upload** mora biti manuel putem Play Console UI
- **Service account JSON** treba da bude siguran - ne commit-ujte ga u git
- **Internal track** je za testiranje - dodajte testera u Play Console
- **Production track** koristi tek nakon testiranja

## 📞 Za podršku:

Ako imate probleme, proverite:
1. Da li je Google Play Android Developer API enabled
2. Da li service account ima prave dozvole u Play Console
3. Da li je JSON fajl valjan i na pravom mestu