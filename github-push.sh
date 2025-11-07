#!/bin/bash

# 🚀 GITHUB APK DEPLOYMENT - AUTOMATSKI SCRIPT
# Ovaj script automatski push-uje kod na GitHub i pokreće APK build

echo "🚀 GitHub APK Deployment Script"
echo "================================"
echo ""

# Provjeri da li postoji GitHub repository
if ! git remote | grep -q origin; then
  echo "❌ GitHub repository nije povezan!"
  echo ""
  echo "📋 Prvo morate povezati repository:"
  echo "1. Kreirajte repository na GitHub.com"
  echo "2. Kopirajte repository URL (npr: https://github.com/korisnik/repo.git)"
  echo "3. Pokrenite: git remote add origin <URL>"
  echo ""
  exit 1
fi

# Dohvati GitHub repository info
REPO_URL=$(git remote get-url origin)
echo "✅ GitHub repository povezan: $REPO_URL"
echo ""

# Provjeri trenutni branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📌 Trenutni branch: $CURRENT_BRANCH"
echo ""

# Stage sve promjene
echo "📦 Pripremam fajlove za push..."
git add .

# Commit sa detaljnom porukom o izmjenama
COMMIT_MSG="Fix: Mobile voice input and copy-paste bug + billing search functionality

🐛 FIXED MOBILE BUGS:
- Fixed MobileInput component to sync onInput/onChange events
- Fixed MobileTextarea component to sync onInput/onChange events
- Voice dictation now works reliably - text saves without additional typing
- Copy-paste operations preserve content properly
- All mobile form fields now work with voice input and paste

✨ NEW FEATURES:
- Added search functionality to UniversalBillingReport
- Added search functionality to BekoOutOfWarrantyBillingReport
- Added search functionality to ComplusOutOfWarrantyBillingReport
- Search filters by: client name, phone, address, city, service number, appliance model, serial number, manufacturer, technician

📝 FILES CHANGED:
- client/src/components/ui/mobile-input.tsx
- client/src/components/ui/mobile-textarea.tsx
- client/src/components/admin/UniversalBillingReport.tsx
- client/src/components/admin/BekoOutOfWarrantyBillingReport.tsx
- client/src/components/admin/ComplusOutOfWarrantyBillingReport.tsx
- replit.md

🎯 IMPACT:
Critical bug fix for mobile technician workflow - voice input and copy-paste now work correctly in all service completion forms."

echo "💾 Commit poruka pripremljena..."
echo ""
git commit -m "$COMMIT_MSG" 2>/dev/null || {
  echo "⚠️  Nema novih promjena za commit"
  echo ""
  echo "📋 Provjerite status:"
  git status
  exit 0
}

# Push na GitHub
echo ""
echo "🚀 Šaljem kod na GitHub..."
git push origin $CURRENT_BRANCH

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ ✅ ✅ KOD USPJEŠNO POSLAT NA GITHUB! ✅ ✅ ✅"
  echo ""
  echo "🎉 IZMJENE PRENESENE:"
  echo "   ✅ Mobile voice input fix"
  echo "   ✅ Mobile copy-paste fix"
  echo "   ✅ Billing search functionality"
  echo ""
  echo "🤖 GitHub Actions će automatski pokrenuti APK build..."
  echo "⏱️  Build traje oko 10-15 minuta"
  echo ""
  echo "📥 Da preuzmete APK:"
  echo "1. Idite na: $REPO_URL/actions"
  echo "2. Kliknite na najnoviji 'Build Android APK' workflow"
  echo "3. Pričekajte da se build završi (zelena kvačica ✓)"
  echo "4. Scrollujte dole do 'Artifacts'"
  echo "5. Download 'servis-todosijevic-debug-apk'"
  echo ""
  echo "📱 Ili čekajte GitHub Release:"
  echo "   $REPO_URL/releases"
  echo ""
  echo "🔔 VAŽNO: Nakon instalacije novog APK-a:"
  echo "   • Glasovni unos će raditi odmah"
  echo "   • Copy-paste će čuvati tekst"
  echo "   • Testirajte u poljima za završavanje servisa"
  echo ""
else
  echo ""
  echo "❌ GREŠKA PRI PUSH-U!"
  echo ""
  echo "🔧 Moguća rješenja:"
  echo "1. Pokušajte: git push origin $CURRENT_BRANCH --force"
  echo "2. Provjerite GitHub pristup i token"
  echo "3. Provjerite internet konekciju"
  echo ""
  exit 1
fi
