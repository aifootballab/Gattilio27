# Script di Verifica Allineamento GitHub, Vercel e Cursor
# Esegui questo script per verificare che tutto sia configurato correttamente

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Verifica Allineamento Servizi" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verifica Git Configuration
Write-Host "[1/5] Verifica Configurazione Git..." -ForegroundColor Yellow
$gitUser = git config --get user.name
$gitEmail = git config --get user.email
$gitRemote = git remote get-url origin 2>$null

if ($gitUser) {
    Write-Host "  ✓ Git User: $gitUser" -ForegroundColor Green
} else {
    Write-Host "  ✗ Git User non configurato" -ForegroundColor Red
}

if ($gitEmail) {
    Write-Host "  ✓ Git Email: $gitEmail" -ForegroundColor Green
} else {
    Write-Host "  ✗ Git Email non configurata" -ForegroundColor Red
}

if ($gitRemote) {
    Write-Host "  ✓ Git Remote: $gitRemote" -ForegroundColor Green
} else {
    Write-Host "  ✗ Git Remote non configurato" -ForegroundColor Red
}

Write-Host ""

# 2. Verifica Repository Git nella directory corrente
Write-Host "[2/5] Verifica Repository Git..." -ForegroundColor Yellow
$gitDir = Test-Path .git
if ($gitDir) {
    Write-Host "  ✓ Repository Git trovato nella directory corrente" -ForegroundColor Green
} else {
    Write-Host "  ✗ Repository Git NON trovato nella directory corrente" -ForegroundColor Red
    Write-Host "    Esegui: git init" -ForegroundColor Yellow
}

Write-Host ""

# 3. Verifica Configurazione Vercel
Write-Host "[3/5] Verifica Configurazione Vercel..." -ForegroundColor Yellow
$vercelConfig = Test-Path vercel.json
if ($vercelConfig) {
    Write-Host "  ✓ vercel.json trovato" -ForegroundColor Green
    $vercelContent = Get-Content vercel.json | ConvertFrom-Json
    Write-Host "    - Build Command: $($vercelContent.buildCommand)" -ForegroundColor Gray
    Write-Host "    - Output Directory: $($vercelContent.outputDirectory)" -ForegroundColor Gray
} else {
    Write-Host "  ✗ vercel.json non trovato" -ForegroundColor Red
}

Write-Host ""

# 4. Verifica Package.json
Write-Host "[4/5] Verifica Package.json..." -ForegroundColor Yellow
$packageJson = Test-Path package.json
if ($packageJson) {
    Write-Host "  ✓ package.json trovato" -ForegroundColor Green
    $packageContent = Get-Content package.json | ConvertFrom-Json
    Write-Host "    - Nome progetto: $($packageContent.name)" -ForegroundColor Gray
    Write-Host "    - Versione: $($packageContent.version)" -ForegroundColor Gray
} else {
    Write-Host "  ✗ package.json non trovato" -ForegroundColor Red
}

Write-Host ""

# 5. Verifica Allineamento Account
Write-Host "[5/5] Verifica Allineamento Account..." -ForegroundColor Yellow
if ($gitUser -eq "mrway80" -and $gitEmail -eq "mrway80@gmail.com") {
    Write-Host "  ✓ Account GitHub configurato correttamente (@mrway80)" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Account GitHub non corrisponde a @mrway80" -ForegroundColor Yellow
    Write-Host "    Configurato: $gitUser ($gitEmail)" -ForegroundColor Gray
    Write-Host "    Atteso: mrway80 (mrway80@gmail.com)" -ForegroundColor Gray
}

if ($gitRemote -like "*aifootballab/Gattilio27*") {
    Write-Host "  ✓ Repository remoto configurato correttamente" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Repository remoto non corrisponde" -ForegroundColor Yellow
    if ($gitRemote) {
        Write-Host "    Configurato: $gitRemote" -ForegroundColor Gray
    }
    Write-Host "    Atteso: https://github.com/aifootballab/Gattilio27.git" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Riepilogo" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Riepilogo azioni necessarie
$actionsNeeded = @()

if (-not $gitDir) {
    $actionsNeeded += "Inizializza repository Git: git init"
}

if ($gitUser -ne "mrway80" -or $gitEmail -ne "mrway80@gmail.com") {
    $actionsNeeded += "Configura Git user: git config user.name 'mrway80'"
    $actionsNeeded += "Configura Git email: git config user.email 'mrway80@gmail.com'"
}

if (-not $gitRemote -or $gitRemote -notlike "*aifootballab/Gattilio27*") {
    if (-not $gitRemote) {
        $actionsNeeded += "Aggiungi remote: git remote add origin https://github.com/aifootballab/Gattilio27.git"
    } else {
        $actionsNeeded += "Aggiorna remote: git remote set-url origin https://github.com/aifootballab/Gattilio27.git"
    }
}

if ($actionsNeeded.Count -eq 0) {
    Write-Host "✓ Tutto configurato correttamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Prossimi passi:" -ForegroundColor Cyan
    Write-Host "1. Connetti GitHub a Vercel: https://vercel.com/dashboard" -ForegroundColor White
    Write-Host "2. Vai su Settings → Git → Connect @mrway80" -ForegroundColor White
    Write-Host "3. Autorizza Vercel ad accedere al repository" -ForegroundColor White
} else {
    Write-Host "⚠ Azioni necessarie:" -ForegroundColor Yellow
    foreach ($action in $actionsNeeded) {
        Write-Host "  - $action" -ForegroundColor White
    }
}

Write-Host ""
