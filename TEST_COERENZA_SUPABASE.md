# Test di Coerenza - Endpoint API e Supabase

**Data:** 2026-01-28  
**Scope:** Verifica allineamento endpoint API con schema Supabase

---

## 1. Pattern Autenticazione

### ✅ COERENTE
Tutti gli endpoint seguono lo stesso pattern:

```javascript
// 1. Estrai token
const token = extractBearerToken(req)
if (!token) {
  return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
}

// 2. Valida token
const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
if (authError || !userData?.user?.id) {
  return NextResponse.json({ error: 'Invalid or expired authentication' }, { status: 401 })
}

// 3. Ottieni userId
const userId = userData.user.id
```

**Endpoint verificati:** ✅ Tutti gli endpoint `/api/supabase/*` e `/api/*` seguono questo pattern.

---

## 2. Pattern Creazione Client Supabase

### ✅ COERENTE
Tutti gli endpoint usano **admin client** con service key:

```javascript
const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})
```

**Endpoint verificati:** ✅ Tutti gli endpoint API usano questo pattern.

**Eccezione:** `lib/supabaseClient.js` usa **anon key** (corretto per client-side).

---

## 3. Verifica Tabelle/Colonne

### ✅ `players` - COERENTE
**Colonne usate nel codice:**
- `id`, `user_id`, `player_name`, `position`, `overall_rating`
- `base_stats` (jsonb), `skills` (text[]), `com_skills` (text[])
- `slot_index`, `original_positions` (jsonb)
- `height`, `weight`, `age`, `nationality`, `club_name`
- `form`, `role`, `playing_style_id`, `current_level`, `level_cap`
- `available_boosters` (jsonb), `photo_slots` (jsonb)

**Schema Supabase:** ✅ Tutte le colonne esistono e corrispondono.

---

### ✅ `matches` - COERENTE
**Colonne usate nel codice:**
- `id`, `user_id`, `match_date`, `opponent_name`, `result`
- `is_home`, `formation_played`, `playing_style_played`, `team_strength`
- `player_ratings` (jsonb), `team_stats` (jsonb)
- `attack_areas` (jsonb), `ball_recovery_zones` (jsonb)
- `goals_events` (jsonb), `players_in_match` (jsonb)
- `photos_uploaded`, `missing_photos` (text[]), `data_completeness`

**Schema Supabase:** ✅ Tutte le colonne esistono e corrispondono.

---

### ✅ `formation_layout` - COERENTE
**Colonne usate nel codice:**
- `id`, `user_id`, `formation`, `slot_positions` (jsonb)

**Schema Supabase:** ✅ Tutte le colonne esistono e corrispondono.

**⚠️ CORRETTO:** `aiKnowledgeHelper.js` ora usa `formation_layout` (non `team_tactical_settings`).

---

### ✅ `team_tactical_settings` - COERENTE
**Colonne usate nel codice:**
- `id`, `user_id`, `team_playing_style`, `individual_instructions` (jsonb)

**Schema Supabase:** ✅ Tutte le colonne esistono e corrispondono.

**⚠️ NOTA:** `slot_positions` NON esiste in questa tabella (corretto, è in `formation_layout`).

---

### ✅ `user_profiles` - COERENTE
**Colonne usate nel codice:**
- `id`, `user_id`, `first_name`, `last_name`, `team_name`
- `current_division`, `initial_division`
- `ai_knowledge_score`, `ai_knowledge_level`, `ai_knowledge_breakdown` (jsonb)
- `ai_knowledge_last_calculated`

**Schema Supabase:** ✅ Tutte le colonne esistono e corrispondono.

---

### ✅ `coaches` - COERENTE
**Colonne usate nel codice:**
- `id`, `user_id`, `coach_name`, `age`, `nationality`, `team`
- `category`, `pack_type`, `playing_style_competence` (jsonb)
- `stat_boosters` (jsonb), `connection` (jsonb)
- `photo_slots` (jsonb), `is_active`

**Schema Supabase:** ✅ Tutte le colonne esistono e corrispondono.

---

### ✅ `team_tactical_patterns` - COERENTE
**Colonne usate nel codice:**
- `id`, `user_id`, `formation_usage` (jsonb)
- `playing_style_usage` (jsonb), `recurring_issues` (jsonb)
- `last_50_matches_count`

**Schema Supabase:** ✅ Tutte le colonne esistono e corrispondono.

---

### ✅ `playing_styles` - COERENTE
**Colonne usate nel codice:**
- `id`, `name`, `compatible_positions` (text[])

**Schema Supabase:** ✅ Tutte le colonne esistono e corrispondono.

---

## 4. Query Pattern Consistency

### ✅ SELECT Queries
Tutti gli endpoint usano pattern coerente:
```javascript
const { data, error } = await admin
  .from('table_name')
  .select('columns')
  .eq('user_id', userId)
  .maybeSingle() // o .single() o nessuno
```

### ✅ INSERT/UPDATE Queries
Pattern coerente:
```javascript
const { data, error } = await admin
  .from('table_name')
  .insert({ ... }) // o .update({ ... })
  .eq('user_id', userId)
  .select()
```

### ✅ UPSERT Queries
Pattern coerente:
```javascript
const { data, error } = await admin
  .from('table_name')
  .upsert({ ... }, { onConflict: 'user_id,other_key' })
  .select()
```

---

## 5. Gestione Errori

### ✅ COERENTE
Tutti gli endpoint gestiscono errori in modo simile:

```javascript
if (error) {
  console.error('[Endpoint] Error:', error)
  return NextResponse.json({ error: 'Message' }, { status: 500 })
}
```

---

## 6. Problemi Trovati e Risolti

### ❌ RISOLTO: `aiKnowledgeHelper.js`
**Problema:** Query su `team_tactical_settings.slot_positions` (colonna inesistente)  
**Fix:** Cambiato a `formation_layout.slot_positions`  
**Status:** ✅ Corretto

### ❌ RISOLTO: `AIKnowledgeBar.jsx`
**Problema:** Creava nuova istanza Supabase invece di usare singleton  
**Fix:** Usa `supabase` da `@/lib/supabaseClient`  
**Status:** ✅ Corretto

---

## 7. Verifica Foreign Keys

### ✅ `players`
- `user_id` → `auth.users.id` ✅
- `playing_style_id` → `playing_styles.id` ✅

### ✅ `formation_layout`
- `user_id` → `auth.users.id` ✅

### ✅ `team_tactical_settings`
- `user_id` → `auth.users.id` ✅

### ✅ `matches`
- `user_id` → `auth.users.id` ✅
- `opponent_formation_id` → `opponent_formations.id` ✅

### ✅ `coaches`
- `user_id` → `auth.users.id` ✅

---

## 8. Verifica RLS (Row Level Security)

**Nota:** Tutti gli endpoint usano **service role key** (bypass RLS), quindi RLS è gestito a livello di applicazione tramite filtri `user_id`.

**Pattern coerente:**
```javascript
.eq('user_id', userId) // Sempre presente nelle query
```

---

## 9. Rate Limiting

### ✅ COERENTE
Endpoint che usano rate limiting:
- `/api/ai-knowledge` ✅
- `/api/assistant-chat` ✅

Pattern:
```javascript
const rateLimit = await checkRateLimit(userId, endpoint, maxRequests, windowMs)
if (!rateLimit.allowed) {
  return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
}
```

---

## 10. Conclusione

### ✅ TUTTO COERENTE

**Punti di forza:**
1. ✅ Autenticazione uniforme in tutti gli endpoint
2. ✅ Pattern client Supabase coerente (admin con service key)
3. ✅ Tutte le tabelle/colonne corrispondono allo schema
4. ✅ Query pattern uniformi
5. ✅ Gestione errori coerente
6. ✅ Foreign keys rispettate
7. ✅ RLS gestito tramite filtri `user_id`

**Problemi risolti:**
1. ✅ `aiKnowledgeHelper.js` - Query tabella corretta
2. ✅ `AIKnowledgeBar.jsx` - Singleton Supabase

**Raccomandazioni:**
- ✅ Nessuna critica
- 💡 Considerare aggiungere TypeScript per type safety
- 💡 Considerare unit test per query pattern

---

**Test completato:** ✅ PASS  
**Data:** 2026-01-28
