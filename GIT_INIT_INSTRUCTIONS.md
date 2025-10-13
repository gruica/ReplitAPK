# 🔄 Kreiranje Clean Git Repository

## COPY-PASTE Ove Komande u Shell

### Korak 1: Inicijalizuj Git
```bash
git init
```

### Korak 2: Add Sve Fajlove
```bash
git add .
```

### Korak 3: Initial Commit
```bash
git commit -m "Initial commit - Clean repository after removing binary files"
```

### Korak 4: Provjeri Veličinu Novog .git Foldera
```bash
du -sh .git
```
**(Trebalo bi ~50MB umjesto 2.2GB!)**

### Korak 5: Provjeri Ukupnu Veličinu Workspace-a
```bash
du -sh .
```
**(Trebalo bi ~3.5GB umjesto 5.5GB)**

---

## ✅ Šta Očekuješ Da Vidiš

```bash
Initialized empty Git repository in /home/runner/workspace/.git/
[main (root-commit) abc123] Initial commit - Clean repository
 XXX files changed, XXXXX insertions(+)
 
.git size: ~50MB  ✅
Workspace: ~3.5GB ✅
```

---

## 📊 Prije vs Poslije

| Metrika | Prije | Poslije | Ušteda |
|---------|-------|---------|--------|
| .git folder | 2.2GB | ~50MB | 2.15GB |
| Workspace | 5.5GB | 3.4GB | 2.1GB |
| Deployment package | 3.3GB+ | ~1.5GB | 1.8GB |

---

**Kada završiš sve komande, kopiraj output i pošalji mi!**
