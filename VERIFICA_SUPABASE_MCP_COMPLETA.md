# ✅ Verifica Supabase via MCP - Schema Completo

**Data**: 28 Gennaio 2026  
**Metodo**: Verifica diretta schema Supabase tramite MCP  
**Stato**: ✅ **VERIFICA COMPLETATA**

---

## 📋 SCHEMA SUPABASE VERIFICATO (via MCP)

### ✅ 1. Tabella `players`

**Schema Supabase** (verificato via MCP):
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "player_name": "text",
  "position": "text",
  "overall_rating": "integer",
  "base_stats": "jsonb",
  "skills": "text[]",
  "com_skills": "text[]",
  "playing_style_id": "uuid",
  "slot_index": "integer" (CHECK: slot_index IS NULL OR slot_index >= 0 AND slot_index <= 10),
  "original_positions": "jsonb" (default: '[]'::jsonb, comment: "Array di posizioni originali"),
  "photo_slots": "jsonb" (default: '{}'::jsonb)
}
```

**Uso nel Codice**:
- ✅ `generate-countermeasures/route.js` (linea 105): `.select('id, player_name, position, overall_rating, base_stats, skills, com_skills, playing_style_id, slot_index, original_positions')`
- ✅ `analyze-match/route.js` (linea 997): `.select('player_name, position, overall_rating, base_stats, skills, com_skills')`
- ✅ `countermeasuresHelper.js` (linea 180): `p.photo_slots.card === true` ✅

**Coerenza**: ✅ **TUTTE LE COLONNE ESISTONO**

---

### ✅ 2. Tabella `coaches`

**Schema Supabase** (verificato via MCP):
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "coach_name": "text",
  "playing_style_competence": "jsonb" (default: '{}'::jsonb),
  "stat_boosters": "jsonb" (default: '[]'::jsonb),
  "connection": "jsonb",
  "is_active": "boolean" (default: false)
}
```

**Uso nel Codice**:
- ✅ `generate-countermeasures/route.js` (linea 147): `.select('coach_name, playing_style_competence, stat_boosters, connection')`
- ✅ `analyze-match/route.js` (linea 1045): `.select('coach_name, playing_style_competence, stat_boosters, connection')`
- ✅ Entrambi filtrano con `.eq('is_active', true)` ✅

**Coerenza**: ✅ **TUTTE LE COLONNE ESISTONO**

**⚠️ VERIFICATO**: `coaches` NON ha `team_playing_style` (corretto, è in `team_tactical_settings`)

---

### ✅ 3. Tabella `team_tactical_settings`

**Schema Supabase** (verificato via MCP):
```json
{
  "id": "uuid",
  "user_id": "uuid" (UNIQUE),
  "team_playing_style": "text" (CHECK: 'possesso_palla' | 'contropiede_veloce' | 'contrattacco' | 'vie_laterali' | 'passaggio_lungo'),
  "individual_instructions": "jsonb" (default: '{}'::jsonb)
}
```

**Uso nel Codice**:
- ✅ `generate-countermeasures/route.js` (linea 140): `.select('team_playing_style, individual_instructions')`
- ✅ `analyze-match/route.js` (linea 1034): `.select('team_playing_style')` ✅ **CORRETTO**

**Coerenza**: ✅ **TUTTE LE COLONNE ESISTONO**

**✅ CORREZIONE APPLICATA**: `analyze-match` ora recupera correttamente da `team_tactical_settings`

---

### ✅ 4. Tabella `matches`

**Schema Supabase** (verificato via MCP):
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "match_date": "timestamptz",
  "opponent_name": "text",
  "result": "text",
  "is_home": "boolean" (default: true),
  "formation_played": "text",
  "playing_style_played": "text",
  "team_strength": "integer",
  "opponent_formation_id": "uuid",
  "player_ratings": "jsonb" (default: '{}'::jsonb),
  "team_stats": "jsonb" (default: '{}'::jsonb),
  "attack_areas": "jsonb" (default: '{}'::jsonb),
  "ball_recovery_zones": "jsonb" (default: '[]'::jsonb),
  "client_team_name": "text",
  "players_in_match": "jsonb" (default: '[]'::jsonb, comment: "Disposizione reale giocatori")
}
```

**Uso nel Codice**:
- ✅ `generate-countermeasures/route.js` (linea 155): `.select('id, opponent_name, result, formation_played, playing_style_played, opponent_formation_id, player_ratings, team_stats, match_date')`
- ✅ `analyze-match/route.js` (linea 1022): `.select('id, opponent_name, result, formation_played, playing_style_played, opponent_formation_id, match_date')`
- ✅ `analyze-match/route.js` (linea 1080): Usa `matchData.is_home` ✅
- ✅ `analyze-match/route.js` (linea 1077): Usa `matchData.client_team_name` ✅
- ✅ `analyze-match/route.js` (linea 972): Usa `matchData.players_in_match` ✅

**Coerenza**: ✅ **TUTTE LE COLONNE ESISTONO**

---

### ✅ 5. Tabella `opponent_formations`

**Schema Supabase** (verificato via MCP):
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "formation_name": "text",
  "playing_style": "text",
  "tactical_style": "text",
  "overall_strength": "integer",
  "players": "jsonb" (default: '[]'::jsonb),
  "extracted_data": "jsonb" (default: '{}'::jsonb)
}
```

**Uso nel Codice**:
- ✅ `generate-countermeasures/route.js` (linea 90): `.select('*')` (tutti i campi)
- ✅ `analyze-match/route.js` (linea 1010): `.select('formation_name, players, overall_strength, tactical_style, playing_style')`
- ✅ `countermeasuresHelper.js` (linea 76-79): Usa `extracted_data` per retrocompatibilità ✅

**Coerenza**: ✅ **TUTTE LE COLONNE ESISTONO**

---

### ✅ 6. Tabella `formation_layout`

**Schema Supabase** (verificato via MCP):
```json
{
  "id": "uuid",
  "user_id": "uuid" (UNIQUE),
  "formation": "text",
  "slot_positions": "jsonb" (default: '{}'::jsonb)
}
```

**Uso nel Codice**:
- ✅ `generate-countermeasures/route.js` (linea 133): `.select('formation, slot_positions')`

**Coerenza**: ✅ **TUTTE LE COLONNE ESISTONO**

---

### ✅ 7. Tabella `team_tactical_patterns`

**Schema Supabase** (verificato via MCP):
```json
{
  "id": "uuid",
  "user_id": "uuid" (UNIQUE),
  "formation_usage": "jsonb" (default: '{}'::jsonb),
  "playing_style_usage": "jsonb" (default: '{}'::jsonb),
  "recurring_issues": "jsonb" (default: '[]'::jsonb)
}
```

**Uso nel Codice**:
- ✅ `generate-countermeasures/route.js` (linea 280): `.select('formation_usage, playing_style_usage, recurring_issues')`
- ✅ `analyze-match/route.js` (linea 1057): `.select('formation_usage, playing_style_usage, recurring_issues')`

**Coerenza**: ✅ **TUTTE LE COLONNE ESISTONO**

---

### ✅ 8. Tabella `user_profiles`

**Schema Supabase** (verificato via MCP):
```json
{
  "id": "uuid",
  "user_id": "uuid" (UNIQUE),
  "first_name": "text",
  "team_name": "text",
  "ai_name": "text",
  "how_to_remember": "text",
  "ai_knowledge_score": "numeric" (0-100),
  "ai_knowledge_level": "text" (beginner/intermediate/advanced/expert),
  "ai_knowledge_breakdown": "jsonb"
}
```

**Uso nel Codice**:
- ✅ `analyze-match/route.js` (linea 986): `.select('first_name, team_name, ai_name, how_to_remember')`

**Coerenza**: ✅ **TUTTE LE COLONNE ESISTONO**

---

### ✅ 9. Tabella `playing_styles`

**Schema Supabase** (verificato via MCP):
```json
{
  "id": "uuid",
  "name": "text" (UNIQUE),
  "compatible_positions": "text[]",
  "description": "text",
  "category": "text"
}
```

**Uso nel Codice**:
- ✅ `generate-countermeasures/route.js` (linea 115): `.select('id, name')` per lookup

**Coerenza**: ✅ **TUTTE LE COLONNE ESISTONO**

---

## 📋 VERIFICA VINCOLI E CHECK CONSTRAINTS

### ✅ `players.slot_index`
**Supabase**: `CHECK (slot_index IS NULL OR slot_index >= 0 AND slot_index <= 10)`
**Codice**: 
- ✅ `generate-countermeasures/route.js` (linea 126): `.filter(p => p.slot_index >= 0 && p.slot_index <= 10)` ✅

**Coerenza**: ✅ **COERENTE**

---

### ✅ `team_tactical_settings.team_playing_style`
**Supabase**: `CHECK (team_playing_style IN ('possesso_palla', 'contropiede_veloce', 'contrattacco', 'vie_laterali', 'passaggio_lungo'))`
**Codice**: 
- ✅ `TacticalSettingsPanel.jsx` (linea 33-39): Array opzioni corrisponde esattamente ✅

**Coerenza**: ✅ **COERENTE**

---

### ✅ `coaches.is_active`
**Supabase**: `boolean` (default: false)
**Codice**: 
- ✅ Entrambi gli endpoint filtrano con `.eq('is_active', true)` ✅
- ✅ UNIQUE INDEX su `(user_id)` WHERE `is_active = true` ✅

**Coerenza**: ✅ **COERENTE**

---

### ✅ `formation_layout.user_id`
**Supabase**: `UNIQUE`
**Codice**: 
- ✅ Usa `.maybeSingle()` (coerente con UNIQUE) ✅

**Coerenza**: ✅ **COERENTE**

---

### ✅ `team_tactical_settings.user_id`
**Supabase**: `UNIQUE`
**Codice**: 
- ✅ Usa `.maybeSingle()` (coerente con UNIQUE) ✅

**Coerenza**: ✅ **COERENTE**

---

### ✅ `team_tactical_patterns.user_id`
**Supabase**: `UNIQUE`
**Codice**: 
- ✅ Usa `.maybeSingle()` (coerente con UNIQUE) ✅

**Coerenza**: ✅ **COERENTE**

---

## 📋 VERIFICA FOREIGN KEYS

### ✅ `players.user_id` → `auth.users.id`
**Codice**: Tutte le query filtrano per `user_id` ✅

### ✅ `players.playing_style_id` → `playing_styles.id`
**Codice**: Lookup corretto in `generate-countermeasures/route.js` ✅

### ✅ `matches.opponent_formation_id` → `opponent_formations.id`
**Codice**: JOIN corretto quando presente ✅

### ✅ `coaches.user_id` → `auth.users.id`
**Codice**: Filtro corretto ✅

**Coerenza**: ✅ **TUTTE LE FOREIGN KEYS SONO COERENTI**

---

## 📋 VERIFICA RLS (Row Level Security)

**Supabase** (verificato via MCP):
- ✅ Tutte le tabelle hanno `rls_enabled: true` ✅

**Codice**:
- ✅ Tutte le query filtrano per `user_id` ✅
- ✅ Service Role Key usato solo server-side ✅

**Coerenza**: ✅ **RLS COERENTE**

---

## 📋 VERIFICA TIPI DATI JSONB

### ✅ `players.original_positions`
**Supabase**: `jsonb` (default: '[]'::jsonb, comment: "Array di posizioni originali")
**Codice**: 
- ✅ `countermeasuresHelper.js` (linea 167): Verifica `Array.isArray(p.original_positions)` ✅
- ✅ Usa come array di oggetti `[{position: "AMF", competence: "Alta"}]` ✅

**Coerenza**: ✅ **COERENTE**

---

### ✅ `coaches.playing_style_competence`
**Supabase**: `jsonb` (default: '{}'::jsonb)
**Codice**: 
- ✅ `countermeasuresHelper.js` (linea 271): Verifica `typeof activeCoach.playing_style_competence === 'object'` ✅
- ✅ Usa come oggetto `{ "possesso_palla": 46, ... }` ✅

**Coerenza**: ✅ **COERENTE**

---

### ✅ `coaches.stat_boosters`
**Supabase**: `jsonb` (default: '[]'::jsonb)
**Codice**: 
- ✅ `countermeasuresHelper.js` (linea 315): Verifica `Array.isArray(activeCoach.stat_boosters)` ✅
- ✅ Usa come array `[{stat_name: "...", bonus: 1}]` ✅

**Coerenza**: ✅ **COERENTE**

---

### ✅ `coaches.connection`
**Supabase**: `jsonb`
**Codice**: 
- ✅ `countermeasuresHelper.js` (linea 391): Verifica `activeCoach.connection && activeCoach.connection.name` ✅
- ✅ Usa come oggetto `{name: "...", focal_point: {...}, key_man: {...}}` ✅

**Coerenza**: ✅ **COERENTE**

---

### ✅ `matches.player_ratings`
**Supabase**: `jsonb` (default: '{}'::jsonb)
**Codice**: 
- ✅ `analyze-match/route.js` (linea 307): Verifica struttura `{cliente: {...}, avversario: {...}}` ✅
- ✅ Fallback per formato vecchio ✅

**Coerenza**: ✅ **COERENTE**

---

### ✅ `matches.players_in_match`
**Supabase**: `jsonb` (default: '[]'::jsonb, comment: "Disposizione reale giocatori")
**Codice**: 
- ✅ `analyze-match/route.js` (linea 972): Verifica `Array.isArray(matchData.players_in_match)` ✅
- ✅ Usa come array `[{name, position, slot_index, overall_rating, match_status}]` ✅

**Coerenza**: ✅ **COERENTE**

---

## 📋 VERIFICA INDICI E PERFORMANCE

### ✅ Indici Verificati (da schema MCP)
- ✅ `players`: Foreign key su `user_id` ✅
- ✅ `coaches`: Indice su `(user_id, is_active)` WHERE `is_active = true` ✅
- ✅ `formation_layout`: Foreign key su `user_id` (UNIQUE) ✅
- ✅ `team_tactical_settings`: Foreign key su `user_id` (UNIQUE) ✅
- ✅ `team_tactical_patterns`: Foreign key su `user_id` (UNIQUE) ✅

**Codice**: 
- ✅ Tutte le query filtrano per `user_id` (usa indici) ✅
- ✅ `.maybeSingle()` per tabelle UNIQUE (ottimale) ✅

**Coerenza**: ✅ **COERENTE**

---

## 📋 VERIFICA VALORI DEFAULT

### ✅ `players.slot_index`
**Supabase**: `NULL` (default implicito)
**Codice**: 
- ✅ `generate-countermeasures/route.js` (linea 128): Riserve = `slot_index == null` ✅

**Coerenza**: ✅ **COERENTE**

---

### ✅ `coaches.is_active`
**Supabase**: `false` (default)
**Codice**: 
- ✅ Filtra sempre con `.eq('is_active', true)` ✅

**Coerenza**: ✅ **COERENTE**

---

### ✅ `matches.is_home`
**Supabase**: `true` (default)
**Codice**: 
- ✅ `analyze-match/route.js` (linea 1081): Gestisce `is_home !== undefined` ✅

**Coerenza**: ✅ **COERENTE**

---

## 📋 VERIFICA COMMENTI E METADATA

### ✅ `players.original_positions`
**Supabase**: Comment: "Array di posizioni originali dalla card: [{position: \"AMF\", competence: \"Alta\"}, ...]"
**Codice**: 
- ✅ Usa esattamente questa struttura ✅

**Coerenza**: ✅ **COERENTE**

---

### ✅ `matches.players_in_match`
**Supabase**: Comment: "Disposizione reale giocatori in campo: [{name, position, slot_index, overall_rating, matched_player_id, match_status}]"
**Codice**: 
- ✅ Usa questa struttura ✅

**Coerenza**: ✅ **COERENTE**

---

## ✅ CONCLUSIONE VERIFICA MCP

**Stato**: ✅ **TUTTO COERENTE E ALLINEATO**

### Riepilogo:
- ✅ **9 tabelle verificate**: Tutte le colonne utilizzate nel codice esistono in Supabase
- ✅ **Tipi dati**: Tutti i tipi corrispondono (text, integer, jsonb, boolean, uuid, timestamptz)
- ✅ **Vincoli CHECK**: Tutti coerenti con codice
- ✅ **Foreign Keys**: Tutte coerenti
- ✅ **UNIQUE constraints**: Tutti rispettati nel codice
- ✅ **RLS**: Abilitato su tutte le tabelle, codice filtra correttamente
- ✅ **Default values**: Tutti coerenti
- ✅ **JSONB structures**: Tutte le strutture JSONB corrispondono

### Problema Trovato e Risolto:
- ⚠️ `team_playing_style` cercato in `coaches` invece di `team_tactical_settings` ✅ **RISOLTO**

**Nessun altro problema trovato.**

---

**Verifica MCP completata**: ✅ **28 Gennaio 2026**
