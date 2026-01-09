# Script di Setup Allineamento GitHub, Vercel e Cursor
# Questo script configura automaticamente Git per allineare i servizi

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup Allineamento Servizi" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verifica se siamo nella directory corretta
$packageJson = Test-Path package.json
if (-not $packageJson) {
    Write-Host "✗ Errore: package.json non trovato" -ForegroundColor Red
    Write-Host "  Esegui questo script dalla directory del progetto" -ForegroundColor Yellow
    exit 1
}

# 1. Inizializza repository Git se non esiste
Write-Host "[1/4] Inizializzazione Repository Git..." -ForegroundColor Yellow
$gitDir = Test-Path .git
if (-not $gitDir) {
    git init
    Write-Host "  ✓ Repository Git inizializzato" -ForegroundColor Green
} else {
    Write-Host "  ✓ Repository Git già esistente" -ForegroundColor Green
}

Write-Host ""

# 2. Configura Git User
Write-Host "[2/4] Configurazione Git User..." -ForegroundColor Yellow
git config user.name "mrway80"
git config user.email "mrway80@gmail.com"
Write-Host "  ✓ Git user configurato: mrway80 (mrway80@gmail.com)" -ForegroundColor Green

Write-Host ""

# 3. Configura Git Remote
Write-Host "[3/4] Configurazione Git Remote..." -ForegroundColor Yellow
$currentRemote = git remote get-url origin 2>$null
if (-not $currentRemote) {
    git remote add origin https://github.com/aifootballab/Gattilio27.git
    Write-Host "  ✓ Remote aggiunto: https://github.com/aifootballab/Gattilio27.git" -ForegroundColor Green
} elseif ($currentRemote -notlike "*aifootballab/Gattilio27*") {
    git remote set-url origin https://github.com/aifootballab/Gattilio27.git
    Write-Host "  ✓ Remote aggiornato: https://github.com/aifootballab/Gattilio27.git" -ForegroundColor Green
} else {
    Write-Host "  ✓ Remote già configurato correttamente" -ForegroundColor Green
}

Write-Host ""

# 4. Verifica configurazione
Write-Host "[4/4] Verifica finale..." -ForegroundColor Yellow
$gitUser = git config --get user.name
$gitEmail = git config --get user.email
$gitRemote = git remote get-url origin

if ($gitUser -eq "mrway80" -and $gitEmail -eq "mrway80@gmail.com" -and $gitRemote -like "*aifootballab/Gattilio27*") {
    Write-Host "  ✓ Tutto configurato correttamente!" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Qualche problema nella configurazione" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup Completato!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Prossimi passi:" -ForegroundColor Cyan
Write-Host "1. Connetti GitHub a Vercel:" -ForegroundColor White
Write-Host "   https://vercel.com/dashboard" -ForegroundColor Gray
Write-Host "2. Vai su Settings → Git → Connect @mrway80" -ForegroundColor White
Write-Host "3. Autorizza Vercel ad accedere al repository" -ForegroundColor White
Write-Host ""
Write-Host "Per verificare la configurazione, esegui:" -ForegroundColor Cyan
Write-Host "  .\check-alignment.ps1" -ForegroundColor White
Write-Host ""
