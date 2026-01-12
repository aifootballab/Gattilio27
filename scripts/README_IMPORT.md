# 📥 Guida Import Giocatori da JSON

## 🎯 Scopo

Importare i dati dei giocatori dal file `giocatori_completo.json` (50 MB) nel database Supabase per:
- Popolare `players_base` con dati canonici
- Migliorare l'autocomplete nel form di inserimento
- Ridurre inserimento manuale dell'80%

## 📋 Prerequisiti

1. **File JSON disponibile**:
   - File locale: `giocatori_completo.json`
   - Oppure URL Google Drive pubblico

2. **Variabili d'ambiente**:
   ```bash
   export NEXT_PUBLIC_SUPABASE_URL="https://tuo-progetto.supabase.co"
   export SUPABASE_SERVICE_ROLE_KEY="tua-service-role-key"
   ```

3. **Dependencies**:
   ```bash
   npm install @supabase/supabase-js
   ```

## 🚀 Uso

### Opzione 1: File Locale

```bash
# Scarica il file da Google Drive
# Poi esegui:
node scripts/import-players-from-json.js ./giocatori_completo.json
```

### Opzione 2: URL Google Drive

```bash
# Rendi il file pubblico su Google Drive
# Ottieni il link diretto (formato: https://drive.google.com/uc?export=download&id=FILE_ID)
# Poi esegui:
node scripts/import-players-from-json.js "https://drive.google.com/uc?export=download&id=FILE_ID"
```

## 🔧 Adattamento Struttura JSON

**IMPORTANTE**: Lo script `import-players-from-json.js` ha una funzione `mapPlayerData()` che mappa i campi del JSON al formato database.

**Devi adattarla alla struttura reale del tuo JSON!**

### Esempio Struttura Attesa

Il JSON può essere:
- **Array diretto**: `[{player1}, {player2}, ...]`
- **Oggetto con array**: `{players: [{player1}, ...]}` o `{data: [{player1}, ...]}`

### Campi Supportati (con alias)

Lo script cerca questi campi (in ordine di priorità):

| Campo Database | Alias nel JSON |
|---------------|----------------|
| `player_name` | `name`, `player_name`, `nome` |
| `position` | `position`, `pos`, `posizione` |
| `height` | `height`, `altezza` |
| `weight` | `weight`, `peso` |
| `age` | `age`, `eta` |
| `nationality` | `nationality`, `nazionalita`, `country` |
| `club_name` | `club`, `club_name`, `squadra` |
| `attacking` | `attacking`, `attacco` (oggetto) |
| `defending` | `defending`, `difesa` (oggetto) |
| `athleticism` | `athleticism`, `fisico` (oggetto) |
| `skills` | `skills` (array o stringa separata da virgola) |
| `com_skills` | `com_skills`, `comSkills` (array o stringa) |

## 📝 Passi per Adattare

1. **Apri il JSON e guarda la struttura del primo giocatore**
2. **Modifica `mapPlayerData()` in `import-players-from-json.js`** per mappare correttamente i campi
3. **Testa con un piccolo subset** prima di importare tutto

### Esempio Test

```bash
# Crea un file di test con 5 giocatori
node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('giocatori_completo.json', 'utf-8'));
const subset = Array.isArray(data) ? data.slice(0, 5) : data.players.slice(0, 5);
fs.writeFileSync('test-5-players.json', JSON.stringify(subset, null, 2));
"

# Testa l'import
node scripts/import-players-from-json.js ./test-5-players.json
```

## ⚠️ Note Importanti

1. **Il file è 50 MB**: L'import potrebbe richiedere tempo
2. **Rate Limiting**: Lo script fa pausa ogni 10 giocatori
3. **Duplicati**: Se un giocatore esiste già (stesso nome), viene aggiornato
4. **Validazione**: I giocatori senza nome vengono saltati

## 🔍 Debug

Se l'import fallisce:

1. **Verifica struttura JSON**:
   ```bash
   node -e "const data = require('./giocatori_completo.json'); console.log('Tipo:', Array.isArray(data) ? 'Array' : 'Oggetto'); console.log('Keys:', Object.keys(data)); console.log('Primo elemento:', JSON.stringify(Array.isArray(data) ? data[0] : data.players?.[0] || data.data?.[0], null, 2));"
   ```

2. **Verifica mapping**: Controlla che `mapPlayerData()` estragga correttamente i campi

3. **Test con 1 giocatore**: Importa solo il primo per verificare

## 📊 Risultato Atteso

Dopo l'import:
- ✅ `players_base` popolato con giocatori canonici
- ✅ Autocomplete nel form funzionante con precompilazione
- ✅ Riduzione inserimento manuale dell'80%

## 🆘 Supporto

Se hai problemi:
1. Condividi un esempio di 2-3 giocatori dal JSON
2. Descrivi la struttura (nomi campi principali)
3. Posso adattare lo script alla tua struttura specifica
