# ✅ Piano Correzioni Dati Supabase – 2026-01-28

**Obiettivo**: Correggere incoerenze dati identificate nell'audit senza rompere funzionalità esistenti.

**Metodo**: Approccio incrementale con validazioni, trigger, e fix dati esistenti.

---

## 📋 Problemi Identificati

1. **`individual_instructions` con `player_id` orfani** (CRITICO)
   - Istruzioni puntano a giocatori eliminati
   - Impatto: UI/IA possono mostrare istruzioni "rotte"

2. **`players.position` contiene stili invece di posizioni** (CRITICO)
   - Valori come "Opportunista", "Tra le linee", "Ala prolifica" invece di "PT", "DC", ecc.
   - Impatto: Logica filtri posizione si rompe

3. **`team_playing_style` null** (MEDIO)
   - Alcuni utenti non hanno impostato stile squadra
   - Impatto: IA non può usare contesto stile squadra

---

## 🔍 Analisi Flussi Critici

### Flussi che usano `individual_instructions`:
- ✅ `save-tactical-settings/route.js`: Valida `player_id` esiste PRIMA di salvare (linee 85-94, 134-148)
- ✅ `countermeasuresHelper.js`: Cerca giocatore nella rosa, mostra ID se non trovato (linee 247-258)
- ✅ `TacticalSettingsPanel.jsx`: Filtra giocatori compatibili per dropdown (linea 195)
- ❌ `delete-player/route.js`: **NON pulisce** `individual_instructions` quando elimina giocatore

### Flussi che usano `players.position`:
- ✅ `tacticalInstructions.js`: Filtra `p.position !== 'PT'` (linee 9-10, 23-24, 39-40, 55-56)
- ✅ `countermeasuresHelper.js`: Mostra posizione giocatore (linee 218, 254)
- ✅ `validateIndividualInstruction()`: Verifica posizione per istruzioni (linee 82-88, 102-108, 135-141)
- ❌ `save-player/route.js`: **NON valida** che `position` sia una posizione valida (solo `toText()`)

### Flussi che usano `team_playing_style`:
- ✅ `save-tactical-settings/route.js`: Gestisce null correttamente (linea 178)
- ✅ `countermeasuresHelper.js`: Gestisce null correttamente (linea 242)
- ✅ `analyze-match/route.js`: Query esplicita per `team_playing_style` (già fixato)

---

## 🛠️ Piano Correzioni

### FASE 1: Prevenzione (Trigger + Validazioni)

#### 1.1 Trigger Supabase per cleanup automatico
**File**: `migrations/fix_individual_instructions_cleanup.sql`
- Trigger `AFTER DELETE` su `players` che pulisce `individual_instructions` quando un giocatore viene eliminato
- Funzione PL/pgSQL che rimuove riferimenti orfani da `team_tactical_settings.individual_instructions`

#### 1.2 Validazione `players.position` nel codice
**File**: `app/api/supabase/save-player/route.js`
- Aggiungere validazione che `position` sia una posizione valida (PT, DC, TD, TS, CC, MED, P, SP, TRQ, CLD, CLS, EDA, ESA, CF)
- Se `position` contiene uno stile (es. "Opportunista"), loggare warning e suggerire correzione

#### 1.3 Cleanup in `delete-player` route
**File**: `app/api/supabase/delete-player/route.js`
- Prima di eliminare giocatore, pulire `individual_instructions` che lo referenziano
- Doppio livello: trigger DB + cleanup esplicito nel codice

---

### FASE 2: Correzione Dati Esistenti

#### 2.1 Script SQL per fix `individual_instructions` orfani
**File**: `migrations/fix_orphan_individual_instructions.sql`
- Query che identifica e rimuove `player_id` orfani da `individual_instructions`
- Log delle istruzioni rimosse per audit

#### 2.2 Script SQL per fix `players.position` con stili
**File**: `migrations/fix_players_position_styles.sql`
- Query che identifica giocatori con `position` = stile
- **NON correggere automaticamente** (richiede mapping manuale stile → posizione)
- Report per admin con suggerimenti correzione

#### 2.3 Validazione `team_playing_style` null
- **NON correggere automaticamente** (è un dato mancante, non un errore)
- UI già gestisce null correttamente

---

### FASE 3: Test e Verifica

#### 3.1 Test flussi critici
- ✅ Test eliminazione giocatore con `individual_instructions` attive
- ✅ Test salvataggio giocatore con `position` invalida
- ✅ Test generazione contromisure con dati corretti
- ✅ Test UI `TacticalSettingsPanel` con giocatori eliminati

#### 3.2 Verifica integrità dati
- Query di verifica post-fix per confermare correzioni

---

## 📝 Posizioni Valide eFootball

**Posizioni supportate dal codice**:
- `PT` - Portiere
- `DC` - Difensore Centrale
- `TD` - Terzino Destro
- `TS` - Terzino Sinistro
- `CC` - Centrocampista Centrale
- `MED` - Mediano
- `P` - Punta
- `SP` - Seconda Punta
- `TRQ` - Trequartista
- `CLD` - Centrocampista Laterale Destro
- `CLS` - Centrocampista Laterale Sinistro
- `EDA` - Esterno D'Attacco Destro
- `ESA` - Esterno D'Attacco Sinistro
- `CF` - Centravanti

**Stili di gioco** (NON posizioni, vanno in `playing_style_id` o `role`):
- Opportunista, Tra le linee, Ala prolifica, Collante, Giocatore chiave, Regista creativo, Onnipresente, Terzino difensivo, ecc.

---

## ⚠️ Principi di Sicurezza

1. **NON rompere funzionalità esistenti**: Tutte le modifiche sono retrocompatibili
2. **Doppio livello di protezione**: Trigger DB + validazione codice
3. **Logging**: Tutte le correzioni vengono loggate per audit
4. **Rollback**: Ogni migrazione può essere rollbackata
5. **Test incrementali**: Test dopo ogni fase

---

## 🚀 Ordine di Esecuzione

1. ✅ Creare trigger Supabase (FASE 1.1)
2. ✅ Aggiungere validazione `position` (FASE 1.2)
3. ✅ Aggiungere cleanup in `delete-player` (FASE 1.3)
4. ✅ Eseguire script fix dati esistenti (FASE 2)
5. ✅ Test completo (FASE 3)

---

**Status**: 🟡 IN ATTESA APPROVAZIONE
