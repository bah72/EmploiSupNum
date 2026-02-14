# Script de déploiement des corrections de copie des cartes combinées

Write-Host "🚀 Deploiement des corrections sur Vercel" -ForegroundColor Green
Write-Host ""

# Étape 1: Nettoyer le verrou Git si nécessaire
Write-Host "1️⃣ Verification du verrou Git..." -ForegroundColor Cyan
$lockFile = ".git\index.lock"
if (Test-Path $lockFile) {
    Write-Host "   ⚠️  Fichier verrou detecte, suppression..." -ForegroundColor Yellow
    Remove-Item $lockFile -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "   ✅ Verrou supprime" -ForegroundColor Green
} else {
    Write-Host "   ✅ Pas de verrou detecte" -ForegroundColor Green
}

Write-Host ""

# Étape 2: Vérifier le statut Git
Write-Host "2️⃣ Verification des modifications..." -ForegroundColor Cyan
git status --short

Write-Host ""

# Étape 3: Ajouter les fichiers modifiés
Write-Host "3️⃣ Ajout des fichiers modifies..." -ForegroundColor Cyan
try {
    git add app/page.tsx
    Write-Host "   ✅ app/page.tsx ajoute" -ForegroundColor Green
    
    git add COPIE_CARTES_COMBINEES.md
    Write-Host "   ✅ COPIE_CARTES_COMBINEES.md ajoute" -ForegroundColor Green
    
    git add test-copie-cartes-combinees.html
    Write-Host "   ✅ test-copie-cartes-combinees.html ajoute" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Erreur lors de l'ajout des fichiers: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "⚠️  SOLUTION MANUELLE REQUISE:" -ForegroundColor Yellow
    Write-Host "   1. Fermez tous les terminaux Git et votre IDE" -ForegroundColor Yellow
    Write-Host "   2. Supprimez manuellement: .git\index.lock" -ForegroundColor Yellow
    Write-Host "   3. Relancez ce script" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Étape 4: Créer le commit
Write-Host "4️⃣ Creation du commit..." -ForegroundColor Cyan
$commitMessage = "Fix: Amelioration copie cartes combinees - detection Ctrl multi-methodes

- Ajout de 3 methodes de detection Ctrl pour plus de fiabilite
- Correction du badge COPIE pour utiliser la variable globale
- Support complet de la copie des cartes combinees depuis le planning
- Logs de debogage ameliores"

try {
    git commit -m $commitMessage
    Write-Host "   ✅ Commit cree avec succes" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Erreur lors du commit: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Étape 5: Push vers GitHub
Write-Host "5️⃣ Push vers GitHub..." -ForegroundColor Cyan
try {
    git push origin master
    Write-Host "   ✅ Push reussi vers GitHub" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Erreur lors du push: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ DEPLOIEMENT TERMINE!" -ForegroundColor Green
Write-Host ""
Write-Host "📦 Vercel va automatiquement detecter les changements et deployer." -ForegroundColor Cyan
Write-Host "🌐 Verifiez le statut sur: https://vercel.com/dashboard" -ForegroundColor Cyan
Write-Host ""
Write-Host "⏱️  Le deploiement prend generalement 2-3 minutes." -ForegroundColor Yellow
Write-Host ""
