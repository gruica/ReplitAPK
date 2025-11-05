# 🔧 Base64 Decode Error - Rešenje

## Problem

```
base64: invalid input
error: Process completed with exit code 1
```

Ova greška se javlja kada GitHub Secret `KEYSTORE_FILE` nije pravilno enkodiran ili sadrži nevažeće karaktere.

---

## ✅ BRZO REŠENJE (PREPORUČENO)

### Metoda 1: Re-enkodovanje Keystore-a BEZ Line Breaks

Problem je što standardni Base64 dodaje novi red svakih 76 karaktera. GitHub Secrets NE vole ove nove redove.

#### Za Linux/Mac:

```bash
# Enkodujte BEZ line breaks (-w 0 flag)
base64 -w 0 servis-todosijevic-release.keystore > keystore-base64.txt
```

#### Za Mac (alternativa):

```bash
# Mac verzija base64 nema -w flag, koristi ovaj pristup
base64 -i servis-todosijevic-release.keystore | tr -d '\n' > keystore-base64.txt
```

#### Za Windows PowerShell:

```powershell
# PowerShell automatski kreira jedan red bez breaks
[Convert]::ToBase64String([IO.File]::ReadAllBytes("servis-todosijevic-release.keystore")) | Out-File -Encoding ASCII -NoNewline keystore-base64.txt
```

**VAŽNO:** Rezultat mora biti **jedan kontinuirani string** bez novih redova!

---

## 📋 KORAK-PO-KORAK REŠENJE

### Korak 1: Obrišite stari secret

1. GitHub → **Settings** → **Secrets and variables** → **Actions**
2. Pronađite `KEYSTORE_FILE`
3. Kliknite **Remove**
4. Potvrdite brisanje

### Korak 2: Re-enkodujte keystore PRAVILNO

**Linux:**
```bash
base64 -w 0 servis-todosijevic-release.keystore > keystore-base64-clean.txt
```

**Mac:**
```bash
base64 -i servis-todosijevic-release.keystore | tr -d '\n' > keystore-base64-clean.txt
```

**Windows PowerShell:**
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("servis-todosijevic-release.keystore")) | Out-File -Encoding ASCII -NoNewline keystore-base64-clean.txt
```

### Korak 3: Proverite rezultat

Otvorite `keystore-base64-clean.txt` u text editoru:

✅ **DOBRO** - Jedan dugi red (~2000+ karaktera) bez razmaka:
```
MIIKPAIBAzCCCfcGCSqGSIb3DQEHAaCCCegEggnkMIIJ4DCCBpMGCSqGSIb3DQEHBqCCBoQwggaAAgEAMIIG...
```

❌ **LOŠE** - Više redova (line breaks):
```
MIIKPAIBAzCCCfcGCSqGSIb3DQEHAaCCCegEggnkMIIJ4DCCBpMGCSqGSIb3DQEHB
qCCBoQwggaAAgEAMIIG...
```

### Korak 4: Kreirajte NOVI secret

1. GitHub → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret**
3. Name: `KEYSTORE_FILE`
4. Value: Kopirajte **KOMPLETAN sadržaj** `keystore-base64-clean.txt`
5. **Add secret**

### Korak 5: Re-run GitHub Actions

1. GitHub → **Actions**
2. Pronađite failed build
3. Kliknite **Re-run jobs** → **Re-run all jobs**

---

## 🔍 PROVERA DA LI JE BASE64 ISPRAVAN

Možete testirati dekodiranje lokalno PRE nego što ga stavite u GitHub Secret:

**Linux/Mac:**
```bash
# Dekodirajte nazad i uporedite
cat keystore-base64-clean.txt | base64 --decode > test-keystore.keystore

# Uporedite sa originalom
diff servis-todosijevic-release.keystore test-keystore.keystore

# Trebalo bi da NE vidite nikakvu razliku
```

**Windows PowerShell:**
```powershell
# Dekodirajte nazad
$base64 = Get-Content keystore-base64-clean.txt
[IO.File]::WriteAllBytes("test-keystore.keystore", [Convert]::FromBase64String($base64))

# Uporedite veličine fajlova (trebalo bi da budu iste)
(Get-Item servis-todosijevic-release.keystore).Length
(Get-Item test-keystore.keystore).Length
```

Ako veličine nisu iste, Base64 encoding NIJE ispravan!

---

## 🛠️ ALTERNATIVNO REŠENJE: GitHub Action

Ako i dalje imate probleme, koristite GitHub Action umesto ručnog dekodiranja:

### Dodajte novi korak u `.github/workflows/build-apk.yml`:

Zamenite:
```yaml
- name: Decode keystore from base64
  run: |
    echo "${{ secrets.KEYSTORE_FILE }}" | base64 --decode > android/app/servis-todosijevic-release.keystore
    echo "✅ Keystore dekodovan uspešno"
    ls -lh android/app/servis-todosijevic-release.keystore
```

Sa:
```yaml
- name: Decode keystore from base64
  uses: timheuer/base64-to-file@v1
  with:
    fileName: 'servis-todosijevic-release.keystore'
    fileDir: 'android/app/'
    encodedString: ${{ secrets.KEYSTORE_FILE }}
```

Ova akcija je pouzdanija za dekodiranje Base64 stringova iz GitHub Secrets.

---

## 💡 DODATNI SAVETI

### 1. Provera da keystore postoji

Lokalno testirajte da keystore radi:

```bash
# Provera keystore-a
keytool -list -v -keystore servis-todosijevic-release.keystore
```

Trebalo bi da vidite informacije o ključu (alias, validnost, itd.)

### 2. Provera GitHub Secret veličine

GitHub Secrets mogu biti **do 64KB**. Vaš keystore keystore je ~2-3KB u Base64, što je OK.

Ako secret prelazi 64KB, videćete grešku pri dodavanju.

### 3. Provera encoding karaktera

Base64 koristi **samo** ove karaktere:
- A-Z, a-z, 0-9
- `+` i `/`
- `=` (padding na kraju)

Ako vidite druge karaktere u `keystore-base64-clean.txt`, encoding je loš!

---

## 📞 Ako ništa ne radi

### Kreirajte NOVI keystore

Možda je originalni keystore oštećen:

```bash
# Kreirajte potpuno novi keystore
keytool -genkey -v \
  -keystore servis-todosijevic-release-NEW.keystore \
  -alias servis-todosijevic-new \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# Enkodujte ga PRAVILNO
base64 -w 0 servis-todosijevic-release-NEW.keystore > new-keystore-base64.txt

# Dodajte novi secret
# KEYSTORE_FILE = sadržaj new-keystore-base64.txt
# KEYSTORE_ALIAS = servis-todosijevic-new
```

**NAPOMENA:** Ako ste već objavili APK sa starim keystore-om, **ne možete koristiti novi** za ažuriranje aplikacije!

---

## ✅ CHECKLIST ZA REŠENJE

- [ ] Re-enkodovao keystore BEZ line breaks (`-w 0` ili `tr -d '\n'`)
- [ ] Proverio da je `keystore-base64-clean.txt` **jedan red**
- [ ] Testirao dekodiranje lokalno (trebalo bi da match-uje original)
- [ ] Obrisao stari `KEYSTORE_FILE` secret
- [ ] Kreirao novi `KEYSTORE_FILE` secret sa čistim Base64
- [ ] Re-run GitHub Actions workflow
- [ ] Build je uspešan ✅

---

Pratite ove korake i GitHub Actions build će proći! 🚀
