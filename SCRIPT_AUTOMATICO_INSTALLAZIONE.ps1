# Script PowerShell per Installazione Automatica Node.js e Supabase CLI
# Esegui questo script come Amministratore

Write-Host "🚀 Installazione Automatica Node.js e Supabase CLI" -ForegroundColor Green
Write-Host ""

# Verifica se Node.js è già installato
$nodeInstalled = Get-Command node -ErrorAction SilentlyContinue

if ($nodeInstalled) {
    Write-Host "✅ Node.js già installato: $(node --version)" -ForegroundColor Green
    $nodeVersion = node --version
} else {
    Write-Host "❌ Node.js non trovato. Installazione necessaria." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📥 Per installare Node.js:" -ForegroundColor Cyan
    Write-Host "   1. Vai su: https://nodejs.org/" -ForegroundColor White
    Write-Host "   2. Scarica la versione LTS" -ForegroundColor White
    Write-Host "   3. Esegui l'installer" -ForegroundColor White
    Write-Host "   4. Riavvia PowerShell e riesegui questo script" -ForegroundColor White
    Write-Host ""
    Write-Host "Oppure usa Chocolatey (se installato):" -ForegroundColor Cyan
    Write-Host "   choco install nodejs" -ForegroundColor White
    exit
}

# Verifica npm
$npmInstalled = Get-Command npm -ErrorAction SilentlyContinue

if ($npmInstalled) {
    Write-Host "✅ npm già installato: $(npm --version)" -ForegroundColor Green
} else {
    Write-Host "❌ npm non trovato. Reinstalla Node.js." -ForegroundColor Red
    exit
}

# Installa Supabase CLI
Write-Host ""
Write-Host "📦 Installazione Supabase CLI..." -ForegroundColor Cyan

try {
    npm install -g supabase
    Write-Host "✅ Supabase CLI installato con successo!" -ForegroundColor Green
} catch {
    Write-Host "❌ Errore durante installazione Supabase CLI" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit
}

# Verifica installazione Supabase CLI
$supabaseInstalled = Get-Command supabase -ErrorAction SilentlyContinue

if ($supabaseInstalled) {
    Write-Host ""
    Write-Host "✅ Supabase CLI installato: $(supabase --version)" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎯 Prossimi passi:" -ForegroundColor Cyan
    Write-Host "   1. Esegui: supabase login" -ForegroundColor White
    Write-Host "   2. Esegui: supabase link --project-ref YOUR_PROJECT_REF" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "❌ Supabase CLI non trovato dopo installazione" -ForegroundColor Red
    Write-Host "   Riavvia PowerShell e verifica: supabase --version" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Script completato!" -ForegroundColor Green
