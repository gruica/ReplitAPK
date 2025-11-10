# 🚀 PLAN IMPLEMENTACIJE - GLASOVNI UNOS FIX

## KRITIČNE IZMENE (IMPLEMENTIRAJ ODMAH)

### FAZA 1: AndroidManifest.xml + MainActivity.java (~25 minuta)

#### Fajl 1: `android/app/src/main/AndroidManifest.xml`

**Izmena:** Dodaj `android:windowSoftInputMode="adjustResize|stateHidden"` u activity tag

**Tačna lokacija:** Linija ~12, u `<activity>` tag

**PRE:**
```xml
<activity
    android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode|navigation"
    android:name=".MainActivity"
    android:label="@string/title_activity_main"
    android:theme="@style/AppTheme.NoActionBarLaunch"
    android:launchMode="singleTask"
    android:exported="true">
```

**POSLE:**
```xml
<activity
    android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode|navigation"
    android:name=".MainActivity"
    android:label="@string/title_activity_main"
    android:theme="@style/AppTheme.NoActionBarLaunch"
    android:launchMode="singleTask"
    android:exported="true"
    android:windowSoftInputMode="adjustResize|stateHidden">
```

**Procenjen uticaj:** 🔴 **70-80% poboljšanja!**

---

#### Fajl 2: `android/app/src/main/java/com/servistodosijevic/app/MainActivity.java`

**Kompletan novi kod** (vidi ANDROID_VOICE_INPUT_ANALYSIS.md, Rešenje 2)

---

### FAZA 2: config.xml + capacitor.config.ts (~8 minuta)

#### Fajl 3: `android/app/src/main/res/xml/config.xml`

**Kompletan novi kod** (vidi ANDROID_VOICE_INPUT_ANALYSIS.md, Rešenje 3)

---

#### Fajl 4: `capacitor.config.ts`

**Izmena:** U Keyboard plugin konfiguraciji

**PRE:**
```typescript
Keyboard: {
  resize: "ionic", 
  style: "dark",
  resizeOnFullScreen: true,
}
```

**POSLE:**
```typescript
Keyboard: {
  resize: "body", // 🔄 PROMENJEN sa "ionic" na "body"
  style: "dark",
  resizeOnFullScreen: true,
  accessoryBarVisible: false, // 🆕 DODATO
  scroller: true, // 🆕 DODATO
}
```

---

## BUILD I TEST PROCEDURE

1. **Implementiraj izmene**
2. **Rebuild APK:**
   ```bash
   npm run build
   npx cap sync android
   cd android
   ./gradlew assembleRelease
   ```
3. **Testiraj glasovni unos:**
   - Otvori formu
   - Koristi glasovni unos
   - Proveri da li tekst odmah stoji
   - Submit formu
   - Potvrdi da je vrednost poslata

4. **Testiraj copy-paste:**
   - Kopiraj tekst
   - Paste u polje
   - Proveri da li se odmah prikazuje
   - Submit
   - Potvrdi

---

## PROCENA VREMENA

| Faza | Vreme | Uticaj |
|------|-------|--------|
| FAZA 1 - AndroidManifest.xml | 2 min | 70-80% |
| FAZA 1 - MainActivity.java | 20 min | 15-20% |
| FAZA 2 - config.xml | 5 min | 5-10% |
| FAZA 2 - capacitor.config.ts | 3 min | 5% |
| **UKUPNO** | **~30 min** | **>95%** |

---

**Status:** ✅ SPREMAN ZA IMPLEMENTACIJU
