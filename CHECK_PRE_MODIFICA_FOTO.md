# 🔍 CHECK PRE-MODIFICA: Sistema Gestione Foto

**Data**: 26 Gennaio 2026  
**Scopo**: Analisi completa prima di modificare sistema gestione foto per evitare rotture

---

## 🗄️ SCHEMA DATABASE SUPABASE

### **TABELLE PRINCIPALI E DIPENDENZE**

#### **1. `players` - Giocatori Rosa**

**Constraint Critici**:
```sql
-- UNIQUE: Un giocatore per slot per utente
UNIQUE (user_id, slot_index) WHERE slot_index IS NOT NULL

-- CHECK: slot_index 0-10 o NULL
CHECK (slot_index IS NULL OR (slot_index >= 0 AND slot_index <= 10))

-- FK: user_id → auth.users (ON DELETE CASCADE)
user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
```

**Indici**:
- `idx_players_user_slot`: `(user_id, slot_index)` - Query veloci per slot
- `idx_players_playing_style_id`: `(playing_style_id)` - JOIN con playing_styles
- `idx_players_original_positions`: GIN su `original_positions` (JSONB)

**Colonne JSONB**:
- `photo_slots` (JSONB) - `{ card: true, statistiche: true, abilita: true, booster: true }`
- `base_stats` (JSONB) - Statistiche complete
- `skills` (JSONB) - Array abilità
- `com_skills` (JSONB) - Array com skills
- `available_boosters` (JSONB) - Array booster
- `original_positions` (JSONB) - `[{ position: "AMF", competence: "Alta" }, ...]`
- `extracted_data` (JSONB) - Dati raw dall'estrazione
- `metadata` (JSONB) - Metadata aggiuntive

**Trigger**: ❌ Nessuno (aggiornato manualmente nel codice)

**Dipendenze**:
- Referenziata da: `formation_layout` (sincronizzazione position)
- Usata in: `team_tactical_settings` (individual_instructions.player_id)

---

#### **2. `matches` - Partite**

**Constraint Critici**:
```sql
-- CHECK: photos_uploaded 0-5
CHECK (photos_uploaded >= 0 AND photos_uploaded <= 5)

-- CHECK: data_completeness 'partial' | 'complete'
CHECK (data_completeness IN ('partial', 'complete'))

-- FK: opponent_formation_id → opponent_formations (ON DELETE SET NULL)
opponent_formation_id UUID REFERENCES opponent_formations(id) ON DELETE SET NULL
```

**Trigger**:
```sql
-- BEFORE UPDATE: Aggiorna updated_at automaticamente
CREATE TRIGGER trigger_update_matches_updated_at
BEFORE UPDATE ON matches
FOR EACH ROW
EXECUTE FUNCTION update_matches_updated_at();
```

**Funzione Trigger**:
```sql
CREATE OR REPLACE FUNCTION update_matches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Dipendenze**:
- `opponent_formations` (FK nullable)
- Usata in: `team_tactical_patterns` (calcolo pattern)

---

#### **3. `user_profiles` - Profili Utente**

**Constraint Critici**:
```sql
-- UNIQUE: Un profilo per utente
UNIQUE (user_id)

-- CHECK: profile_completion_score 0-100
CHECK (profile_completion_score >= 0 AND profile_completion_score <= 100)

-- CHECK: profile_completion_level valori specifici
CHECK (profile_completion_level IN ('beginner', 'intermediate', 'complete'))
```

**Trigger**:
```sql
-- BEFORE INSERT OR UPDATE: Calcola automaticamente profile_completion_score
CREATE TRIGGER trigger_calculate_profile_completion
BEFORE INSERT OR UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION calculate_profile_completion_score();
```

**Funzione Trigger**:
```sql
CREATE OR REPLACE FUNCTION calculate_profile_completion_score()
RETURNS TRIGGER AS $$
-- Calcola score basato su 8 campi opzionali
-- Ogni campo = 12.5%, max 100%
-- Aggiorna anche profile_completion_level
END;
$$ LANGUAGE plpgsql;
```

**⚠️ ATTENZIONE**: Questo trigger calcola automaticamente `profile_completion_score` e `profile_completion_level` ad ogni INSERT/UPDATE. **NON sovrascrivere questi campi nel codice** se non necessario.

---

#### **4. `coaches` - Allenatori**

**Constraint Critici**:
```sql
-- UNIQUE PARZIALE: Solo un allenatore attivo per utente
CREATE UNIQUE INDEX coaches_user_id_is_active_unique 
ON coaches(user_id) 
WHERE is_active = true;
```

**Trigger**:
```sql
-- BEFORE UPDATE: Aggiorna updated_at automaticamente
CREATE TRIGGER coaches_updated_at_trigger
BEFORE UPDATE ON coaches
FOR EACH ROW
EXECUTE FUNCTION update_coaches_updated_at();
```

**Dipendenze**:
- Usato in: `analyze-match` (activeCoach)
- Usato in: `gestione-formazione` (mostra allenatore attivo)

---

#### **5. `formation_layout` - Layout Formazione**

**Constraint Critici**:
```sql
-- UNIQUE: Un layout per utente
UNIQUE (user_id)
```

**Dipendenze**:
- Usato in: `save-formation-layout` (sincronizza `players.position`)
- Usato in: `assign-player-to-slot` (calcola position da slot)
- Usato in: `gestione-formazione` (render campo 2D)

**⚠️ ATTENZIONE**: Dopo salvataggio layout, il codice **sincronizza automaticamente** `players.position` con `slot_positions[slot_index].position`. Non rompere questo flusso.

---

#### **6. `team_tactical_settings` - Impostazioni Tattiche**

**Constraint Critici**:
```sql
-- UNIQUE: Un record per utente
UNIQUE (user_id)

-- CHECK: team_playing_style valori specifici
CHECK (team_playing_style IN (
  'possesso_palla',
  'contropiede_veloce', 
  'contrattacco',
  'vie_laterali',
  'passaggio_lungo'
))
```

**Trigger**:
```sql
-- BEFORE UPDATE: Aggiorna updated_at automaticamente
CREATE TRIGGER update_team_tactical_settings_updated_at
BEFORE UPDATE ON team_tactical_settings
FOR EACH ROW
EXECUTE FUNCTION update_team_tactical_settings_updated_at();
```

**Dipendenze**:
- `individual_instructions.player_id` → `players.id` (validazione nel codice)

---

#### **7. `opponent_formations` - Formazioni Avversarie**

**Constraint Critici**:
```sql
-- FK: matches.opponent_formation_id → opponent_formations.id (ON DELETE SET NULL)
```

**Dipendenze**:
- Referenziata da: `matches` (FK nullable)
- Usata in: `generate-countermeasures` (analisi formazione avversaria)

---

#### **8. `team_tactical_patterns` - Pattern Tattici**

**Constraint Critici**:
```sql
-- UNIQUE: Un record per utente
UNIQUE (user_id)
```

**⚠️ ATTENZIONE**: Tabella **NON ha migration SQL** (probabilmente creata manualmente). Verificare struttura prima di modificare.

**Dipendenze**:
- Usata in: `analyze-match` (pattern ricorrenti)
- Usata in: `generate-countermeasures` (formazioni che soffre)
- Usata in: `recalculate-patterns` (calcolo pattern)

---

## 🔗 FOREIGN KEY RELATIONSHIPS

### **Dipendenze Critiche**

```
auth.users
  ├── user_profiles (ON DELETE CASCADE, UNIQUE)
  ├── players (ON DELETE CASCADE)
  ├── matches (ON DELETE CASCADE)
  ├── coaches (ON DELETE CASCADE)
  ├── formation_layout (ON DELETE CASCADE, UNIQUE)
  ├── team_tactical_settings (ON DELETE CASCADE, UNIQUE)
  ├── opponent_formations (ON DELETE CASCADE)
  └── team_tactical_patterns (ON DELETE CASCADE, UNIQUE)

opponent_formations
  └── matches.opponent_formation_id (ON DELETE SET NULL)

playing_styles
  └── players.playing_style_id (FK, nullable)
```

**⚠️ ATTENZIONE**: 
- `ON DELETE CASCADE` su tutte le tabelle → eliminare utente elimina tutti i suoi dati
- `ON DELETE SET NULL` su `matches.opponent_formation_id` → eliminare formazione avversaria non elimina match

---

## ⚙️ TRIGGER E FUNZIONI SQL

### **Trigger Attivi**

1. **`trigger_calculate_profile_completion`** (user_profiles)
   - **Quando**: BEFORE INSERT OR UPDATE
   - **Cosa fa**: Calcola `profile_completion_score` e `profile_completion_level`
   - **⚠️ NON sovrascrivere**: Se aggiorni `user_profiles`, il trigger ricalcola automaticamente

2. **`trigger_update_matches_updated_at`** (matches)
   - **Quando**: BEFORE UPDATE
   - **Cosa fa**: Aggiorna `updated_at = NOW()`
   - **⚠️ NON sovrascrivere**: Il trigger gestisce automaticamente

3. **`coaches_updated_at_trigger`** (coaches)
   - **Quando**: BEFORE UPDATE
   - **Cosa fa**: Aggiorna `updated_at = NOW()`
   - **⚠️ NON sovrascrivere**: Il trigger gestisce automaticamente

4. **`update_team_tactical_settings_updated_at`** (team_tactical_settings)
   - **Quando**: BEFORE UPDATE
   - **Cosa fa**: Aggiorna `updated_at = NOW()`
   - **⚠️ NON sovrascrivere**: Il trigger gestisce automaticamente

---

## 🔄 FLUSSI CRITICI DA PRESERVARE

### **1. Flusso Upload Giocatore**

**File**: `app/gestione-formazione/page.jsx` (riga 676-877)

**Flusso Attuale**:
```
1. Cliente carica 1-3 foto → FileReader → base64
2. Per ogni foto: chiama /api/extract-player
3. Merge dati da tutte le foto (esclude overall_rating durante merge)
4. Math.max() su overall_rating da tutte le foto
5. Mostra modal selezione posizioni
6. Salva tramite /api/supabase/save-player
```

**⚠️ PRESERVARE**:
- Loop estrazione foto (riga 696-763)
- Merge dati (riga 715-744)
- Math.max() overall_rating (riga 781-786)
- Modal selezione posizioni (riga 788-803)
- Validazione duplicati (riga 805-868)

---

### **2. Flusso Salvataggio Giocatore**

**File**: `app/api/supabase/save-player/route.js`

**Flusso Attuale**:
```
1. Valida input (MAX_TEXT_LENGTH = 255)
2. Lookup playing_style_id
3. Prepara playerData (toInt, toText, cast)
4. Verifica giocatore esistente nello slot (SELECT)
5. Se esiste → UPDATE con merge:
   - photo_slots: { ...existing, ...new }
   - base_stats: merge oggetti
   - skills/com_skills: concatena e rimuovi duplicati
   - overall_rating: Math.max(existing, new)
6. Se non esiste → INSERT
7. Verifica duplicati (campo e riserve)
```

**⚠️ PRESERVARE**:
- Validazione MAX_TEXT_LENGTH (riga 68-92)
- Lookup playing_style_id (riga 52-65)
- Merge photo_slots (riga 169-172)
- Math.max() overall_rating (riga 203-207)
- Verifica duplicati (riga 270-329)

---

### **3. Flusso Sincronizzazione Position**

**File**: `app/api/supabase/save-formation-layout/route.js` (riga 175-189)

**Flusso Attuale**:
```
1. Salva formation_layout
2. DOPO salvataggio: sincronizza players.position
3. Per ogni slot 0-10:
   - Trova giocatore con slot_index
   - Aggiorna position = slot_positions[slot_index].position
```

**⚠️ PRESERVARE**: Questo flusso è critico per mantenere coerenza tra layout e giocatori.

---

### **4. Flusso Assign Player to Slot**

**File**: `app/api/supabase/assign-player-to-slot/route.js`

**Flusso Attuale**:
```
1. Recupera formation_layout
2. Calcola slotPosition = slot_positions[slot_index].position
3. Se giocatore esiste → UPDATE:
   - slot_index
   - position = slotPosition (adatta automaticamente)
   - Se original_positions vuoto → salva
4. Se non esiste → INSERT con position adattata
```

**⚠️ PRESERVARE**:
- Adattamento automatico position (riga 191-196, 213-237)
- Salvataggio original_positions se vuoto (riga 213-237)

---

## 🚨 VINCOLI E CONSTRAINT DA RISPETTARE

### **1. Slot Index (0-10)**

**Constraint**: `CHECK (slot_index IS NULL OR (slot_index >= 0 AND slot_index <= 10))`

**Codice**: `app/api/supabase/save-player/route.js` (riga 136-138)
```javascript
slot_index: Math.max(0, Math.min(10, Number(player.slot_index)))
```

**⚠️ NON MODIFICARE**: Questo clamp è necessario per rispettare il constraint.

---

### **2. Photo Slots (JSONB)**

**Struttura Attesa**:
```javascript
{
  card: true | false,
  statistiche: true | false,
  abilita: true | false,
  booster: true | false
}
```

**⚠️ PRESERVARE**: 
- Chiavi devono essere: `card`, `statistiche`, `abilita`, `booster`
- Valori devono essere boolean (`true`/`false`)

---

### **3. Overall Rating (40-110)**

**Validazione**: `app/api/extract-formation/route.js` (riga 195-197)
```javascript
if (rating < 40 || rating > 110) {
  player.overall_rating = null
}
```

**⚠️ PRESERVARE**: Range 40-110 supporta boosters.

---

### **4. Max Text Length (255)**

**Constraint**: Validazione nel codice (non nel DB)

**File**: `app/api/supabase/save-player/route.js` (riga 68)
```javascript
const MAX_TEXT_LENGTH = 255
```

**⚠️ PRESERVARE**: Validazione lato server per evitare errori DB.

---

## 📊 OPERAZIONI DATABASE CRITICHE

### **1. Query Dirette (Frontend)**

**Pattern**: Query Supabase Client con RLS automatico

**Esempi**:
```javascript
// gestione-formazione/page.jsx (riga 91-98)
const { data: players } = await supabase
  .from('players')
  .select('*')
  .order('created_at', { ascending: false })
```

**⚠️ PRESERVARE**: 
- RLS gestisce accesso automaticamente
- Non bypassare con Service Role Key nel frontend

---

### **2. Operazioni con Service Role (Backend)**

**Pattern**: Admin client per operazioni che richiedono privilegi

**Esempi**:
```javascript
// save-player/route.js (riga 42-44)
const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})
```

**⚠️ PRESERVARE**: 
- Service Role Key solo nel backend
- Non esporre al frontend

---

### **3. Merge Strategia**

**Pattern**: Merge intelligente per evitare perdita dati

**Esempi**:
```javascript
// save-player/route.js (riga 169-197)
const mergedPhotoSlots = { ...existingPhotoSlots, ...newPhotoSlots }
const mergedBaseStats = { ...existing, ...new }
const mergedSkills = [...existing, ...new].filter((v, i, a) => a.indexOf(v) === i)
const finalOverall = Math.max(existingOverall, newOverall)
```

**⚠️ PRESERVARE**: 
- Merge photo_slots: nuovi sovrascrivono esistenti
- Merge skills: concatena e rimuovi duplicati
- Overall rating: sempre Math.max() (evita downgrade)

---

## 🔒 ROW LEVEL SECURITY (RLS)

### **Pattern RLS**

**Tutte le tabelle usano**:
```sql
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id)
```

**⚠️ PRESERVARE**: 
- Pattern `(select auth.uid())` è ottimizzato (valutato una volta)
- Non cambiare a `auth.uid()` diretto (più lento)

---

## 🎯 CHECKLIST PRE-MODIFICA

### **Database**

- [ ] ✅ Verificato constraint `slot_index` (0-10)
- [ ] ✅ Verificato UNIQUE `(user_id, slot_index)`
- [ ] ✅ Verificato trigger `calculate_profile_completion` (user_profiles)
- [ ] ✅ Verificato trigger `updated_at` (matches, coaches, team_tactical_settings)
- [ ] ✅ Verificato FK `opponent_formation_id` (ON DELETE SET NULL)
- [ ] ✅ Verificato UNIQUE `user_id` (user_profiles, formation_layout, team_tactical_settings)

### **Codice**

- [ ] ✅ Verificato merge photo_slots (non perdere dati esistenti)
- [ ] ✅ Verificato Math.max() overall_rating (evita downgrade)
- [ ] ✅ Verificato validazione MAX_TEXT_LENGTH (255)
- [ ] ✅ Verificato clamp slot_index (Math.max(0, Math.min(10, ...)))
- [ ] ✅ Verificato sincronizzazione position (save-formation-layout)
- [ ] ✅ Verificato adattamento position (assign-player-to-slot)

### **Flussi**

- [ ] ✅ Verificato flusso upload giocatore (3 foto → merge → Math.max)
- [ ] ✅ Verificato flusso salvataggio (UPDATE vs INSERT)
- [ ] ✅ Verificato flusso verifica duplicati (campo e riserve)
- [ ] ✅ Verificato flusso sincronizzazione position

---

## ⚠️ COSE DA NON TOCCARE

### **1. Trigger SQL**

**NON modificare**:
- `calculate_profile_completion_score()` - Calcola automaticamente score
- `update_*_updated_at()` - Aggiorna timestamp automaticamente

**Se modifichi**: Potresti rompere calcolo score o timestamp.

---

### **2. Constraint Database**

**NON modificare**:
- `CHECK (slot_index IS NULL OR (slot_index >= 0 AND slot_index <= 10))`
- `UNIQUE (user_id, slot_index)` WHERE slot_index IS NOT NULL
- `UNIQUE (user_id)` su user_profiles, formation_layout, team_tactical_settings

**Se modifichi**: Potresti permettere dati inconsistenti.

---

### **3. Merge Logica**

**NON modificare**:
- Merge photo_slots: `{ ...existing, ...new }` (nuovi sovrascrivono)
- Merge skills: concatena e rimuovi duplicati
- Math.max() overall_rating (evita downgrade)

**Se modifichi**: Potresti perdere dati o permettere downgrade.

---

### **4. Sincronizzazione Position**

**NON modificare**:
- Sincronizzazione `players.position` dopo salvataggio `formation_layout`
- Adattamento automatico `position` in `assign-player-to-slot`

**Se modifichi**: Potresti rompere coerenza tra layout e giocatori.

---

## 🎯 PROPOSTA MODIFICA: Semplificazione Gestione Foto

### **Approccio Ibrido**

**1. Estrazione Semplice**:
- OCR estrae solo quello che vede chiaramente
- Nessun merge complesso durante loop
- Nessun Math.max() (usa valore dalla foto "card" se presente)

**2. Check Finale**:
- Dopo tutte le foto, lista cosa manca
- Distingui obbligatorio vs opzionale

**3. Alert Intelligente**:
- Obbligatorio mancante → blocco con inserimento manuale
- Opzionale mancante → warning ma permette salvare

**4. Opzioni Chiare**:
- "Inserisci manuale" → form inline
- "Ricarica foto" → riprova estrazione

---

## 🔍 RISCHI IDENTIFICATI

### **1. Rischio: Perdita Dati Esistenti**

**Scenario**: Se modifichi merge photo_slots, potresti perdere tracciamento foto già caricate.

**Mitigazione**: 
- Mantieni merge `{ ...existing, ...new }`
- Verifica che photo_slots esistenti non vengano persi

---

### **2. Rischio: Downgrade Overall Rating**

**Scenario**: Se rimuovi Math.max(), potresti permettere downgrade quando si caricano foto aggiuntive.

**Mitigazione**:
- Mantieni Math.max() o logica equivalente
- Verifica che nuovo valore >= esistente

---

### **3. Rischio: Rottura Sincronizzazione Position**

**Scenario**: Se modifichi flusso salvataggio, potresti rompere sincronizzazione position.

**Mitigazione**:
- Mantieni sincronizzazione dopo save-formation-layout
- Verifica che position sia aggiornata correttamente

---

### **4. Rischio: Violazione Constraint**

**Scenario**: Se modifichi validazione slot_index, potresti violare constraint DB.

**Mitigazione**:
- Mantieni clamp `Math.max(0, Math.min(10, ...))`
- Verifica che slot_index sia sempre 0-10 o NULL

---

### **5. Rischio: Trigger Non Funzionanti**

**Scenario**: Se modifichi user_profiles senza rispettare trigger, potresti rompere calcolo score.

**Mitigazione**:
- NON sovrascrivere `profile_completion_score` manualmente
- Lascia che il trigger calcoli automaticamente

---

## ✅ CHECKLIST FINALE

### **Prima di Modificare**

- [ ] ✅ Verificato tutti i constraint DB
- [ ] ✅ Verificato tutti i trigger SQL
- [ ] ✅ Verificato tutte le FK e dipendenze
- [ ] ✅ Verificato flussi critici
- [ ] ✅ Identificato cosa preservare
- [ ] ✅ Identificato rischi

### **Durante Modifica**

- [ ] ✅ Mantieni merge photo_slots
- [ ] ✅ Mantieni Math.max() overall_rating
- [ ] ✅ Mantieni validazione MAX_TEXT_LENGTH
- [ ] ✅ Mantieni clamp slot_index
- [ ] ✅ Mantieni sincronizzazione position
- [ ] ✅ NON toccare trigger SQL
- [ ] ✅ NON toccare constraint DB

### **Dopo Modifica**

- [ ] ✅ Test upload giocatore (3 foto)
- [ ] ✅ Test merge dati esistenti
- [ ] ✅ Test Math.max() overall_rating
- [ ] ✅ Test verifica duplicati
- [ ] ✅ Test sincronizzazione position
- [ ] ✅ Test constraint DB (slot_index 0-10)
- [ ] ✅ Test trigger (profile_completion_score)

---

## 📝 NOTE FINALI

### **Cosa Funziona Bene (NON TOCCARE)**

1. ✅ Merge photo_slots - Funziona correttamente
2. ✅ Math.max() overall_rating - Evita downgrade
3. ✅ Sincronizzazione position - Mantiene coerenza
4. ✅ Verifica duplicati - Previene duplicati
5. ✅ Trigger SQL - Calcolano automaticamente

### **Cosa Potrebbe Essere Semplificato**

1. ⚠️ Merge complesso durante loop - Potrebbe essere semplificato
2. ⚠️ Math.max() su multiple foto - Potrebbe usare solo foto "card"
3. ⚠️ Validazioni rimosse - Potrebbero essere ripristinate con check finale

### **Raccomandazione**

**Approccio Incrementale**:
1. Aggiungi check finale (non rimuovere merge esistente)
2. Aggiungi alert per dati mancanti (non bloccare flusso esistente)
3. Aggiungi opzione inserimento manuale (non sostituire estrazione)
4. Testa tutto prima di rimuovere codice esistente

**Principio**: "Aggiungi, non rimuovere" finché non verifichi che funziona.

---

**Ultimo Aggiornamento**: 26 Gennaio 2026  
**Status**: ✅ **CHECK COMPLETO - Pronto per Modifica Sicura**
