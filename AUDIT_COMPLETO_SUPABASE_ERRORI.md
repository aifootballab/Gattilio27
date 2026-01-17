# Audit Completo Supabase - Errori Trovati

**Data Audit**: 2026-01-17  
**Scope**: Tabelle, RLS Policies, Vincoli, Flussi API, Codice

---

## 🔴 ERRORI CRITICI

### 1. **PROBLEMA CRITICO: Recovery Logic Non Trova Giocatori con `source = 'json_import'`**

**File**: `app/api/supabase/get-my-players/route.js:100`

**Problema**:
```javascript
.eq('source', 'screenshot_extractor')  // ❌ Filtra solo screenshot_extractor
```

**Impatto**: 
- Pedri ha `source = 'json_import'` (dal database base)
- La recovery logic NON lo trova perché filtra solo `source = 'screenshot_extractor'`
- Giocatori aggiunti dal database base (`json_import`) non vengono recuperati dalla recovery

**Fix Necessario**:
```javascript
// Prima: cerca solo screenshot_extractor
.eq('source', 'screenshot_extractor')

// Dopo: cerca TUTTI i source, poi filtra per metadata.user_id
// Rimuovere il filtro .eq('source', ...) e filtrare solo per metadata.user_id
```

**Codice Corretto**:
```javascript
// Cerca TUTTI i players_base (non filtrare per source)
const { data: allUserPlayersBase, error: orphanErr } = await admin
  .from('players_base')
  .select('id, player_name, position, metadata, base_stats, source')

// Filtra in JS per metadata.user_id (indipendentemente da source)
const userPlayersBase = allUserPlayersBase?.filter(pb => 
  pb.metadata?.user_id === userId || pb.metadata?.extracted?.user_id === userId
) || []
```

---

### 2. **PROBLEMA CRITICO: RLS Policy Troppo Permissiva su `players_base`**

**Tabella**: `players_base`  
**Policy**: `Dev: Allow all access`  
**Qual**: `true` (sempre true)  
**With Check**: `true` (sempre true)

**Problema**:
- La policy `"Dev: Allow all access"` bypassa completamente RLS
- Permette accesso illimitato a TUTTI i giocatori per TUTTI gli utenti
- Violazione sicurezza: utenti possono vedere/modificare giocatori di altri utenti

**Impatto**: 
- **SICUREZZA**: Accesso non autorizzato ai dati
- **PRIVACY**: Gli utenti possono vedere i giocatori di altri utenti

**Fix Necessario**:
- Rimuovere la policy `"Dev: Allow all access"` in produzione
- Mantenere solo la policy `"Players base are viewable by everyone"` per SELECT (lettura pubblica è OK)
- Per UPDATE/INSERT/DELETE, usare RLS basata su `metadata.user_id` o rimuovere completamente (gestire nel backend con service role)

---

### 3. **PROBLEMA CRITICO: Incoerenza Dati - `players_base` senza `metadata.user_id`**

**Situazione Database**:
- **Total players_base**: 1167
- **Con metadata.user_id**: 19 (solo `screenshot_extractor`)
- **Con source = json_import**: 1144 (NON hanno `metadata.user_id`)
- **Con source = screenshot_extractor**: 19 (hanno `metadata.user_id`)

**Problema**:
- Pedri ha `source = 'json_import'` e `metadata.user_id = null`
- Ha un `player_build` con `user_id` corretto
- La recovery logic NON lo trova perché cerca solo `source = 'screenshot_extractor'`
- La query `.in('id', playerBaseIds)` DOVREBBE trovarlo, ma se il `players_base` non viene recuperato dalla recovery, potrebbe non essere incluso

**Fix Necessario**:
- La recovery logic deve cercare TUTTI i `players_base`, non solo `screenshot_extractor`
- Oppure: quando si salva un giocatore con `source = 'json_import'`, impostare `metadata.user_id` nel `players_base`

---

## ⚠️ ERRORI GRAVI

### 4. **PROBLEMA PERFORMANCE: Multiple Permissive Policies**

**Tabelle Affette**:
- `player_builds`: Multiple policies per INSERT/UPDATE/DELETE/SELECT
- `user_rosa`: Multiple policies per tutte le operazioni
- `screenshot_processing_log`: Multiple policies per INSERT/SELECT
- `unified_match_contexts`: Multiple policies per INSERT/UPDATE/SELECT
- `coaching_suggestions`: Multiple policies per SELECT
- `players_base`: Multiple policies per SELECT

**Problema**:
- Ogni query deve eseguire TUTTE le policies permissive per ogni riga
- Performance degradata: query più lente, consumo CPU maggiore
- Scaling issues: con molti utenti, le query diventano molto lente

**Fix Necessario**:
- Rimuovere le policy "Dev:" in produzione
- Oppure: consolidare le policies in una sola policy per operazione

---

### 5. **PROBLEMA PERFORMANCE: RLS Policies Re-Evaluate `auth.uid()` per Ogni Riga**

**Tabelle Affette**:
- `player_builds`: 4 policies
- `user_rosa`: 4 policies
- `screenshot_processing_log`: 2 policies
- `unified_match_contexts`: 3 policies
- `coaching_suggestions`: 1 policy
- `chart_data`: 2 policies
- `player_match_ratings`: 2 policies
- `heat_maps`: 1 policy
- `squad_formations`: 2 policies
- `voice_coaching_sessions`: 2 policies
- `coaching_sessions`: 3 policies
- `candidate_profiles`: 4 policies
- `user_profiles`: 3 policies

**Problema**:
- Le policies usano `auth.uid()` direttamente
- PostgreSQL re-evalua `auth.uid()` per OGNI riga (sub-ottimale)
- Dovrebbe usare `(select auth.uid())` per valutare una sola volta

**Impatto**:
- Query lente su tabelle con molte righe
- Consumo CPU maggiore

**Fix Necessario**:
```sql
-- Prima (lento):
auth.uid() = user_id

-- Dopo (veloce):
(select auth.uid()) = user_id
```

**Totale Policies da Fixare**: ~35 policies

---

### 6. **PROBLEMA SECURITY: Leaked Password Protection Disabilitata**

**Problema**: 
- Supabase Auth non controlla password compromesse contro HaveIBeenPwned.org
- Utenti possono usare password già compromesse

**Fix Necessario**:
- Abilitare leaked password protection in Supabase Dashboard
- Settings → Auth → Password Protection

---

### 7. **PROBLEMA PERFORMANCE: Foreign Keys Senza Index**

**Tabelle Affette**:
- `chart_data.chart_data_screenshot_log_id_fkey`
- `heat_maps.heat_maps_screenshot_log_id_fkey`
- `player_match_ratings.player_match_ratings_screenshot_log_id_fkey`
- `squad_formations.squad_formations_screenshot_log_id_fkey`

**Problema**:
- Foreign keys senza index causano scansioni sequenziali su JOIN
- Performance degradata su query con JOIN

**Fix Necessario**:
```sql
CREATE INDEX idx_chart_data_screenshot_log_id ON chart_data(screenshot_log_id);
CREATE INDEX idx_heat_maps_screenshot_log_id ON heat_maps(screenshot_log_id);
CREATE INDEX idx_player_match_ratings_screenshot_log_id ON player_match_ratings(screenshot_log_id);
CREATE INDEX idx_squad_formations_screenshot_log_id ON squad_formations(screenshot_log_id);
```

---

## ⚠️ WARNING / INFO

### 8. **Indici Non Utilizzati (38 indici)**

**Problema**: 
- 38 indici non sono mai stati usati
- Occupano spazio disco e rallentano INSERT/UPDATE

**Impatto**: Minore, ma può essere pulito in futuro

**Tabelle**:
- `team_playing_styles`: 2 indici
- `playing_styles`: 2 indici
- `managers`: 3 indici
- `players_base`: 2 indici
- `player_builds`: 1 indice
- `screenshot_processing_log`: 2 indici
- `unified_match_contexts`: 1 indice
- `coaching_suggestions`: 3 indici
- `manager_style_competency`: 4 indici
- `player_match_ratings`: 2 indici
- `player_links`: 2 indici
- `position_competency`: 3 indici
- `user_rosa`: 7 indici
- `coaching_sessions`: 2 indici
- `chart_data`: 1 indice
- `candidate_profiles`: 2 indici
- `heat_maps`: 2 indici
- `squad_formations`: 1 indice

**Fix**: Rimuovere indici non usati (ma verificare prima che non servano per query future)

---

### 9. **Duplicate Index: `user_rosa`**

**Problema**:
- `idx_user_rosa_is_main` e `idx_user_rosa_user_main` sono identici
- Duplicato inutile

**Fix**:
```sql
DROP INDEX idx_user_rosa_is_main;  -- Rimuovere uno dei due
```

---

## 📋 DISCREPANZE CODICE vs DATABASE

### 10. **Discrepanza: Recovery Logic vs Schema Database**

**Problema**:
- **Codice** (`get-my-players`): Cerca solo `source = 'screenshot_extractor'`
- **Database**: Pedri ha `source = 'json_import'` e `player_build` con `user_id` corretto
- **Risultato**: Pedri non viene recuperato dalla recovery logic

**Fix**: Come nell'errore #1

---

### 11. **Discrepanza: `save-player` Non Imposta `metadata.user_id` per Giocatori Esistenti**

**File**: `app/api/supabase/save-player/route.js:224-280`

**Problema**:
- `save-player` cerca giocatori esistenti per nome
- Se trova un giocatore con `source = 'json_import'`, lo riutilizza
- Ma NON imposta `metadata.user_id` sul `players_base` esistente
- Risultato: il `players_base` resta senza `metadata.user_id`, la recovery logic non lo trova

**Fix Necessario**:
```javascript
// Dopo aver trovato/creato playerBaseId, aggiornare metadata.user_id
if (playerBaseId) {
  await admin
    .from('players_base')
    .update({
      metadata: {
        ...existingPlayer?.metadata || {},
        user_id: userId,
        saved_at: new Date().toISOString()
      }
    })
    .eq('id', playerBaseId)
}
```

---

## 🔍 ANALISI FLUSSI

### Flusso `save-player` → `get-my-players`:

1. **save-player**:
   - Cerca `players_base` per nome (case-insensitive)
   - Se trova: riutilizza (NON aggiorna `metadata.user_id`) ❌
   - Se non trova: crea nuovo con `source = 'screenshot_extractor'` e `metadata.user_id` ✅
   - Crea `player_build` con `user_id` corretto ✅

2. **get-my-players**:
   - Recupera `player_builds` per `user_id` ✅
   - Recovery logic: cerca solo `source = 'screenshot_extractor'` ❌
   - Non trova giocatori con `source = 'json_import'` ❌

**Problema**: Se `save-player` riutilizza un giocatore esistente (`json_import`), la recovery logic non lo trova.

---

## 📊 STATISTICHE ERRORI

- **Errori Critici**: 3
- **Errori Gravi**: 4
- **Warning**: 2
- **Discrepanze Codice/DB**: 2
- **Totale Issues**: 11

---

## 🎯 PRIORITÀ FIX

### PRIORITÀ ALTA (Da Fixare Subito):

1. ✅ **Fix Recovery Logic** - Non trova giocatori con `json_import` (Pedri)
2. ✅ **Fix save-player** - Impostare `metadata.user_id` su giocatori esistenti
3. ⚠️ **Rimuovere RLS Policy Permissiva** - Solo in produzione, mantenere per dev

### PRIORITÀ MEDIA (Prossima Sessione):

4. ⚠️ **Fix RLS Performance** - Usare `(select auth.uid())` invece di `auth.uid()`
5. ⚠️ **Rimuovere Multiple Permissive Policies** - Consolidare in produzione
6. ⚠️ **Aggiungere Index su Foreign Keys**

### PRIORITÀ BASSA (Future):

7. ℹ️ **Abilitare Leaked Password Protection**
8. ℹ️ **Rimuovere Indici Non Utilizzati**
9. ℹ️ **Rimuovere Duplicate Index**

---

## 🔧 FIX IMMEDIATI RICOMANDATI

### Fix #1: Recovery Logic (CRITICO)

**File**: `app/api/supabase/get-my-players/route.js:97-105`

```javascript
// PRIMA (ERRATO):
const { data: allUserPlayersBase, error: orphanErr } = await admin
  .from('players_base')
  .select('id, player_name, position, metadata, base_stats, source')
  .eq('source', 'screenshot_extractor')  // ❌ Filtra solo screenshot_extractor

// DOPO (CORRETTO):
const { data: allUserPlayersBase, error: orphanErr } = await admin
  .from('players_base')
  .select('id, player_name, position, metadata, base_stats, source')
  // ❌ RIMUOVERE .eq('source', 'screenshot_extractor')
  // ✅ Cercare TUTTI i source, poi filtrare per metadata.user_id in JS
```

### Fix #2: save-player Imposta metadata.user_id (CRITICO)

**File**: `app/api/supabase/save-player/route.js:350-380` (dopo aver trovato/creato playerBaseId)

```javascript
// Dopo aver trovato/creato playerBaseId, aggiornare metadata.user_id
if (playerBaseId) {
  const { data: existingBase } = await admin
    .from('players_base')
    .select('metadata')
    .eq('id', playerBaseId)
    .single()
  
  const updatedMetadata = {
    ...(existingBase?.metadata || {}),
    user_id: userId,
    saved_at: new Date().toISOString(),
    ...(existingBase?.metadata?.source === 'screenshot_extractor' ? {} : {
      // Se è un giocatore esistente (json_import), aggiungere anche source
      source: 'screenshot_extractor'  // Opzionale: mantenere json_import se preferisci
    })
  }
  
  await admin
    .from('players_base')
    .update({ metadata: updatedMetadata })
    .eq('id', playerBaseId)
}
```

---

## ✅ VERIFICA POST-FIX

Dopo aver applicato i fix, verificare:

1. ✅ Pedri viene recuperato correttamente da `get-my-players`
2. ✅ Tutti i giocatori con `player_builds` sono visibili
3. ✅ La recovery logic trova giocatori indipendentemente da `source`
4. ✅ `save-player` imposta `metadata.user_id` su giocatori esistenti
5. ✅ RLS policies funzionano correttamente (solo in produzione dopo rimozione policy Dev)

---

**Fine Audit**
