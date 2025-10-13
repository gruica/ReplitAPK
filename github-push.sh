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

# Commit sa timestamp-om
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
COMMIT_MSG="APK Build - $TIMESTAMP"

echo "💾 Commit poruka: $COMMIT_MSG"
git commit -m "$COMMIT_MSG" 2>/dev/null || echo "⚠️  Nema novih promjena za commit"

# Push na GitHub
echo ""
echo "🚀 Šaljem kod na GitHub..."
git push origin $CURRENT_BRANCH

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ KOD USPJEŠNO POSLAT NA GITHUB!"
  echo ""
  echo "🤖 GitHub Actions će automatski pokrenuti APK build..."
  echo "⏱️  Build traje oko 10-15 minuta"
  echo ""
  echo "📥 Da preuzmete APK:"
  echo "1. Idite na: $REPO_URL/actions"
  echo "2. Kliknite na najnoviji 'Build Android APK' workflow"
  echo "3. Scrollujte dole do 'Artifacts'"
  echo "4. Download 'servis-todosijevic-debug-apk'"
  echo ""
  echo "📱 Ili čekajte GitHub Release:"
  echo "   $REPO_URL/releases"
  echo ""
else
  echo ""
  echo "❌ GREŠKA PRI PUSH-U!"
  echo ""
  echo "🔧 Pokušajte ručno:"
  echo "   git push origin $CURRENT_BRANCH --force"
  echo ""
  exit 1
fi
