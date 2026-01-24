# 🔒 AUDIT SICUREZZA E ALLINEAMENTO: Pattern Tattici Dashboard

**Data**: 24 Gennaio 2026  
**Scope**: Verifica sicurezza, allineamento Supabase/backend, funzioni/const/variabili, query diretta, calcoli progressivi

---

## 🚨 PROBLEMI CRITICI IDENTIFICATI

### **1. QUERY DIRETTA DAL FRONTEND (Sicurezza)**

**File**: `app/page.jsx` (riga 126-130)

**Codice Attuale**:
```javascript
const { data: patterns, error: patternsError } = await supabase
  .from('team_tactical_patterns')
  .select('formation_usage, playing_style_usage, recurring_issues')
  .eq('user_id', userId)
  .maybeSingle()
```

**Analisi**:
- ✅ **Client**: Usa `supabase` client (anon key) - dipende da RLS
- ✅ **Tabella Esiste**: Verificato in Supabase via MCP
- ✅ **RLS Abilitato**: `rls_enabled: true` (verificato via MCP)
- ✅ **Policies Corrette**: 
  - SELECT: `auth.uid() = user_id` ✅
  - INSERT: `WITH CHECK (auth.uid() = user_id)` ✅
  - UPDATE: `USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)` ✅
  - DELETE: `USING (auth.uid() = user_id)` ✅
- ⚠️ **Tabella Vuota**: 0 righe (conferma che pattern non vengono calcolati)

**Verifica Eseguita** (via MCP Supabase):
```sql
-- ✅ Tabella esiste
SELECT EXISTS (...) → true

-- ✅ RLS abilitato
rls_enabled: true

-- ✅ Policies corrette
SELECT policyname, cmd, qual FROM pg_policies 
WHERE tablename = 'team_tactical_patterns';
```

**Raccomandazione**:
- ✅ **Sicurezza OK**: RLS configurato correttamente, query frontend è sicura
- ⚠️ **Funzionalità**: Implementare calcolo pattern (vedi sezione 2)

---

### **2. CALCOLI PROGRESSIVI: DOVE SONO SALVATI?**

**Problema**: **NON ho trovato nessun codice che calcola e salva i pattern tattici**

**Cosa ho cercato**:
- ❌ Nessun `INSERT INTO team_tactical_patterns`
- ❌ Nessun `UPDATE team_tactical_patterns`
- ❌ Nessun `UPSERT team_tactical_patterns`
- ❌ Nessun trigger PostgreSQL che calcola pattern
- ❌ Nessuna funzione PostgreSQL che calcola pattern
- ❌ Nessuna API route che calcola/salva pattern

**Implicazioni**:
1. **Tabella vuota**: Se i pattern non vengono mai calcolati, la tabella sarà sempre vuota
2. **Dashboard sempre vuota**: Il frontend mostrerà sempre il placeholder "Carica le tue partite..."
3. **IA non riceve pattern**: Le API (`analyze-match`, `generate-countermeasures`) recuperano pattern ma trovano NULL

**Dove DOVREBBERO essere calcolati**:
- **Opzione A**: Trigger PostgreSQL dopo INSERT/UPDATE su `matches`
- **Opzione B**: Funzione PostgreSQL chiamata periodicamente (cron job)
- **Opzione C**: API route che calcola pattern on-demand o dopo salvataggio match
- **Opzione D**: Processo esterno (serverless function, cron job)

**Struttura Attesa** (da documentazione):
```json
{
  "formation_usage": {
    "4-3-3": { "matches": 10, "win_rate": 0.6 },
    "4-2-3-1": { "matches": 5, "win_rate": 0.4 }
  },
  "playing_style_usage": {
    "Contrattacco": { "matches": 8, "win_rate": 0.75 },
    "Possesso palla": { "matches": 7, "win_rate": 0.43 }
  },
  "recurring_issues": [
    { "issue": "Difesa laterale vulnerabile", "frequency": "alta", "severity": "media" }
  ]
}
```

**Calcolo Logico** (da implementare):
```javascript
// Pseudo-codice per calcolo pattern
function calculateTacticalPatterns(matches) {
  const formationUsage = {}
  const playingStyleUsage = {}
  const recurringIssues = []
  
  matches.forEach(match => {
    // Conta formazioni
    const formation = match.formation_played
    if (!formationUsage[formation]) {
      formationUsage[formation] = { matches: 0, wins: 0, losses: 0, draws: 0 }
    }
    formationUsage[formation].matches++
    if (isWin(match.result)) formationUsage[formation].wins++
    else if (isLoss(match.result)) formationUsage[formation].losses++
    else formationUsage[formation].draws++
    
    // Calcola win_rate
    formationUsage[formation].win_rate = 
      formationUsage[formation].wins / formationUsage[formation].matches
    
    // Stesso per playing_style_usage...
  })
  
  return { formation_usage: formationUsage, playing_style_usage: playingStyleUsage, recurring_issues: recurringIssues }
}
```

---

### **3. ALLINEAMENTO FRONTEND/BACKEND**

**Frontend** (`app/page.jsx`):
- ✅ Query diretta a `team_tactical_patterns` (anon key, RLS)
- ✅ Gestisce `maybeSingle()` (PGRST116 = no rows)
- ✅ Salva in state `tacticalPatterns`

**Backend** (`app/api/analyze-match/route.js`, `app/api/generate-countermeasures/route.js`):
- ✅ Usa service role key (bypassa RLS)
- ✅ Query identica: `formation_usage, playing_style_usage, recurring_issues`
- ✅ Gestisce `maybeSingle()`

**Allineamento**: ✅ **OK** - Stessa struttura dati, stessa query

**Problema**: Se i pattern non vengono mai calcolati, sia frontend che backend troveranno sempre NULL

---

### **4. VERIFICA FUNZIONI/CONST/VARIABILI**

#### **`app/page.jsx`**

**State** (riga 48):
```javascript
const [tacticalPatterns, setTacticalPatterns] = React.useState(null)
```
✅ **OK**: Inizializzato a `null`, gestito correttamente

**Query** (riga 126-130):
```javascript
const { data: patterns, error: patternsError } = await supabase
  .from('team_tactical_patterns')
  .select('formation_usage, playing_style_usage, recurring_issues')
  .eq('user_id', userId)
  .maybeSingle()
```
✅ **OK**: Query corretta, usa `maybeSingle()` per gestire "no rows"

**Error Handling** (riga 132-136):
```javascript
if (patternsError && patternsError.code !== 'PGRST116') {
  console.warn('[Dashboard] Error loading tactical patterns:', patternsError)
} else if (patterns) {
  setTacticalPatterns(patterns)
}
```
✅ **OK**: Gestisce PGRST116 (no rows) come caso normale, logga altri errori

**Rendering** (riga 545-549):
```javascript
{!tacticalPatterns || (
  (!tacticalPatterns.formation_usage || Object.keys(tacticalPatterns.formation_usage).length === 0) &&
  (!tacticalPatterns.playing_style_usage || Object.keys(tacticalPatterns.playing_style_usage).length === 0) &&
  (!tacticalPatterns.recurring_issues || tacticalPatterns.recurring_issues.length === 0)
) ? (
```
⚠️ **PROBLEMA LOGICO**: La condizione è complessa e potrebbe avere bug

**Analisi Logica**:
- Se `tacticalPatterns === null` → mostra placeholder ✅
- Se `tacticalPatterns` esiste ma tutti i campi sono vuoti → mostra placeholder ✅
- **MA**: Se `tacticalPatterns` esiste e ha almeno un campo non vuoto → mostra dati ✅

**Problema Potenziale**:
```javascript
// Se tacticalPatterns = { formation_usage: {}, playing_style_usage: {}, recurring_issues: [] }
// Object.keys({}).length === 0 → true
// [].length === 0 → true
// Quindi mostra placeholder ✅ OK

// Se tacticalPatterns = { formation_usage: { "4-3-3": {...} }, playing_style_usage: {}, recurring_issues: [] }
// Object.keys({ "4-3-3": {...} }).length === 0 → false
// Quindi mostra dati ✅ OK
```

**Verdetto**: ✅ **OK** - Logica corretta, ma complessa. Potrebbe essere semplificata.

**Suggerimento Semplificazione**:
```javascript
const hasPatterns = tacticalPatterns && (
  (tacticalPatterns.formation_usage && Object.keys(tacticalPatterns.formation_usage).length > 0) ||
  (tacticalPatterns.playing_style_usage && Object.keys(tacticalPatterns.playing_style_usage).length > 0) ||
  (tacticalPatterns.recurring_issues && tacticalPatterns.recurring_issues.length > 0)
)

{!hasPatterns ? (
  <div>{t('aiInsightsNoData')}</div>
) : (
  <div>{/* Mostra pattern */}</div>
)}
```

---

### **5. VERIFICA SICUREZZA RLS** ✅ **VERIFICATO**

**Verifica Eseguita** (via MCP Supabase):

**1. Tabella Esiste**: ✅
- Nome: `team_tactical_patterns`
- Schema: `public`
- RLS: `enabled: true`

**2. Struttura Colonne** (verificata):
```sql
formation_usage      JSONB  DEFAULT '{}'::jsonb  ✅
playing_style_usage  JSONB  DEFAULT '{}'::jsonb  ✅
recurring_issues     JSONB  DEFAULT '[]'::jsonb  ✅
```

**3. RLS Policies** (verificate):
```sql
✅ SELECT:  "Users can view own team tactical patterns"
   USING: (auth.uid() = user_id)

✅ INSERT:  "Users can insert own team tactical patterns"
   WITH CHECK: (auth.uid() = user_id)

✅ UPDATE:  "Users can update own team tactical patterns"
   USING: (auth.uid() = user_id)
   WITH CHECK: (auth.uid() = user_id)

✅ DELETE:  "Users can delete own team tactical patterns"
   USING: (auth.uid() = user_id)
```

**Verdetto**: ✅ **SICUREZZA OK**
- RLS configurato correttamente
- Policies usano `auth.uid() = user_id` (pattern corretto)
- Query frontend è sicura (dipende da RLS che funziona)
- Backend usa service role (bypassa RLS, OK per API)

**Nota**: Tabella ha 0 righe, conferma che pattern non vengono calcolati (vedi sezione 2)

---

## 📋 CHECKLIST AZIONI RICHIESTE

### **CRITICO (Sicurezza)** ✅ **COMPLETATO**
- [x] **Verificare esistenza tabella `team_tactical_patterns` in Supabase** → ✅ Esiste
- [x] **Verificare RLS abilitato e policy SELECT corretta** → ✅ RLS abilitato, policies corrette
- [x] **Se RLS mancante → Creare migration SQL con RLS policies** → ✅ Non necessario, RLS già configurato

### **CRITICO (Funzionalità)**
- [ ] **Implementare calcolo pattern tattici** (trigger/funzione/API)
- [ ] **Decidere quando calcolare** (on-demand, dopo salvataggio match, periodicamente)
- [ ] **Testare che pattern vengano salvati correttamente**

### **IMPROVEMENT (Codice)**
- [ ] **Semplificare logica rendering pattern** (variabile `hasPatterns`)
- [ ] **Aggiungere logging per debug** (quando pattern sono NULL vs quando sono vuoti)

---

## 🎯 RACCOMANDAZIONI IMPLEMENTAZIONE

### **Opzione A: Trigger PostgreSQL (Consigliato)**
```sql
-- Funzione che calcola pattern dopo ogni INSERT/UPDATE su matches
CREATE OR REPLACE FUNCTION calculate_tactical_patterns()
RETURNS TRIGGER AS $$
BEGIN
  -- Calcola pattern per user_id del match
  -- UPSERT su team_tactical_patterns
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tactical_patterns_after_match
AFTER INSERT OR UPDATE ON matches
FOR EACH ROW
EXECUTE FUNCTION calculate_tactical_patterns();
```

**Vantaggi**:
- ✅ Automatico, sempre aggiornato
- ✅ Nessuna modifica codice applicazione
- ✅ Performance ottimale (calcolo solo quando necessario)

**Svantaggi**:
- ⚠️ Logica complessa in PostgreSQL
- ⚠️ Difficile da testare/debuggare

---

### **Opzione B: API Route On-Demand**
```javascript
// app/api/calculate-tactical-patterns/route.js
export async function POST(req) {
  // 1. Recupera tutte le partite utente
  // 2. Calcola pattern
  // 3. UPSERT su team_tactical_patterns
  // 4. Ritorna pattern calcolati
}
```

**Vantaggi**:
- ✅ Logica in JavaScript (più facile da testare)
- ✅ Chiamabile on-demand o dopo salvataggio match

**Svantaggi**:
- ⚠️ Richiede chiamata esplicita
- ⚠️ Potrebbe essere dimenticata

---

### **Opzione C: Calcolo in `save-match` API**
```javascript
// app/api/supabase/save-match/route.js
// Dopo INSERT match:
// 1. Calcola pattern aggiornati
// 2. UPSERT su team_tactical_patterns
```

**Vantaggi**:
- ✅ Pattern sempre aggiornati dopo ogni match
- ✅ Logica centralizzata

**Svantaggi**:
- ⚠️ Aggiunge latenza a salvataggio match
- ⚠️ Se match viene aggiornato, pattern devono essere ricalcolati

---

## 🔍 VERIFICA FINALE

### **Test Sicurezza**
1. Login come User A
2. Verificare di vedere solo i propri pattern (se esistono)
3. Tentare di accedere a pattern di User B (dovrebbe fallire con RLS)

### **Test Funzionalità**
1. Salvare 3-5 match con formazioni diverse
2. Verificare che pattern vengano calcolati
3. Verificare che dashboard mostri pattern (non placeholder)
4. Verificare che IA riceva pattern nei prompt

---

## 📊 STATO ATTUALE

| Componente | Stato | Note |
|------------|-------|------|
| **Query Frontend** | ✅ OK | Query corretta, gestisce errori |
| **Query Backend** | ✅ OK | Query identica, usa service role |
| **RLS Policies** | ⚠️ **DA VERIFICARE** | Non ho trovato migration SQL |
| **Calcolo Pattern** | ❌ **MANCANTE** | Nessun codice che calcola/salva |
| **Allineamento** | ✅ OK | Frontend e backend usano stessa struttura |
| **Error Handling** | ✅ OK | Gestisce PGRST116 correttamente |
| **Logica Rendering** | ⚠️ **COMPLESSA** | Funziona ma potrebbe essere semplificata |

---

**Fine Audit**
