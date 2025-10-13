# 🗑️ Instrukcije Za Brisanje .git Foldera

## COPY-PASTE Ove Komande u Replit Shell

### Korak 1: Otvori Shell
Klikni na **"Shell"** dugme u Replit-u (pored Console)

### Korak 2: Copy-Paste Ovu Komandu
```bash
rm -rf .git
```

### Korak 3: Verifikuj Da Je Obrisan
```bash
ls -la | grep .git
```
**(Trebalo bi da kaže "No such file")**

### Korak 4: Proveri Novu Veličinu Workspace-a
```bash
du -sh .
```
**(Trebalo bi da bude ~3.3GB umjesto 5.5GB)**

---

## 🔄 Nakon Brisanja

**Javi mi kada obrišeš .git folder**, ja ću onda:
1. ✅ Reinitializovati clean git repository
2. ✅ Kreirati initial commit sa trenutnim stanjem
3. ✅ Verifikovati da je deployment spreman
4. ✅ Testirati deployment

---

## ⚠️ Napomena

**Ovo je bezbjedna operacija:**
- ✅ Svi fajlovi ostaju
- ✅ Kod ostaje isti
- ✅ Samo git historija se briše
- ✅ Replit rollback sistem ostaje aktivan

---

**Kada završiš, javi mi: "Obrisao sam .git"**
