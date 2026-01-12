# 🔄 Flussi Salvataggio Completi
## Come i dati vengono salvati in Supabase

**Data**: 2025-01-12  
**Status**: ✅ **DOCUMENTAZIONE COMPLETA**

---

## 📸 FLUSSO 1: Screenshot → Database

### **Step-by-Step**:

```
1. UTENTE CARICA SCREENSHOT
   └─> ScreenshotUpload.jsx
       └─> uploadAndProcessScreenshot()
           └─> visionService.uploadScreenshot()
               └─> Supabase Storage: player-screenshots/{userId}/{timestamp}.jpg
           └─> visionService.processScreenshot()
               └─> Edge Function: process-screenshot
```

```
2. EDGE FUNCTION: process-screenshot
   └─> Download immagine da Storage
   └─> Google Vision API OCR
   └─> extractPlayerData() → extractedData
   └─> parseGoogleDriveData() → parsedData (se formato Google Drive)
```

```
3. SALVATAGGIO players_base (se nuovo giocatore)
   └─> Match per nome: "Vinícius Júnior"
   └─> Se NON trovato:
       INSERT INTO players_base (
         player_name: parsedData.player_name,
         position: parsedData.position,
         role: parsedData.role,
         height: parsedData.height,
         weight: parsedData.weight,
         age: parsedData.age,
         nationality: parsedData.nationality,
         team: parsedData.club_name,
         potential_max: parsedData.potential_max,
         cost: parsedData.cost,
         form: parsedData.form,
         base_stats: parsedData.base_stats,  // ⭐ STATISTICHE BASE
         skills: extractedData.skills || [],
         com_skills: extractedData.comSkills || [],
         position_ratings: extractedData.positionRatings || {},
         source: 'google_drive' | 'user_upload'
       )
       └─> Risultato: playerBaseId = "base_vinicius_123"
```

```
4. SALVATAGGIO player_builds (build utente)
   └─> UPSERT INTO player_builds (
         user_id: userId,
         player_base_id: playerBaseId,
         development_points: extractedData.build?.developmentPoints || {},
         current_level: extractedData.build?.currentLevel || null,
         level_cap: parsedData.level_cap || extractedData.build?.levelCap || null,
         active_booster_id: null,  // Se booster visibile, match con boosters table
         active_booster_name: extractedData.build?.activeBooster || null,
         final_overall_rating: parsedData.overall_rating,  // ⭐ OVERALL FINALE
         final_stats: parsedData.base_stats,  // ⭐ STATISTICHE FINALI
         source: 'google_drive' | 'screenshot',
         source_data: {
           screenshot_id: logEntry.id,
           confidence: extractedData.confidence,
           form: parsedData.form
         }
       )
       ON CONFLICT (user_id, player_base_id) DO UPDATE
       └─> Risultato: buildId = "build_vinicius_user123_456"
```

```
5. SALVATAGGIO screenshot_processing_log
   └─> UPDATE screenshot_processing_log
       SET processing_status = 'completed',
           extracted_data = { ...extractedData, parsed_data: parsedData },
           matched_player_id = playerBaseId
       WHERE id = logEntry.id
```

```
6. RISPOSTA AL FRONTEND
   └─> {
         success: true,
         log_id: logEntry.id,
         extracted_data: { ...extractedData, parsed_data: parsedData },
         matched_player_id: playerBaseId
       }
```

---

## 🎯 FLUSSO 2: Aggiunta a Rosa

### **Step-by-Step**:

```
1. UTENTE CONFERMA INSERIMENTO
   └─> PlayerDestinationSelector
       └─> Utente seleziona: Titolare, Slot 9
       └─> onConfirm({ destination: 'titolare', slot: 9 })
```

```
2. FRONTEND: handleDestinationConfirm()
   └─> playerService.upsertPlayerBuild(buildData)
       └─> Crea/aggiorna player_builds
   └─> rosaService.addPlayerToRosaInSlot(
         rosaId,
         playerBuildId,
         'titolare',
         9
       )
```

```
3. BACKEND: addPlayerToRosaInSlot()
   └─> SELECT player_build_ids FROM user_rosa WHERE id = rosaId
   └─> Array corrente: [id1, id2, ..., id9, null, ...]
   └─> Se slot 9 occupato:
       └─> Sposta id9 esistente → primo slot riserva libero (es: 12)
   └─> Inserisci nuovo buildId in slot 9
   └─> Array aggiornato: [id1, id2, ..., build_vinicius_user123, ...]
```

```
4. UPDATE user_rosa
   └─> UPDATE user_rosa
       SET player_build_ids = [id1, id2, ..., build_vinicius_user123, ...],
           updated_at = NOW()
       WHERE id = rosaId
```

```
5. FRONTEND RICARICA ROSA
   └─> rosaService.getRosaById(rosaId)
       └─> SELECT * FROM user_rosa WHERE id = rosaId
       └─> Per ogni player_build_id in array:
           └─> SELECT * FROM player_builds WHERE id = buildId
           └─> SELECT * FROM players_base WHERE id = player_base_id
           └─> SELECT * FROM boosters WHERE id = active_booster_id (se presente)
       └─> Costruisce array 21 elementi (con null per slot vuoti)
       └─> Mantiene ordine slot (0-20)
```

```
6. VISUALIZZAZIONE
   └─> RosaTitolari: rosa.players.slice(0, 11) → slot 0-10
   └─> RosaPanchina: rosa.players.slice(11, 21) → slot 11-20
```

---

## 🔍 FLUSSO 3: Query Giocatore Completo

### **Query Supabase**:

```sql
-- Ottieni giocatore completo (base + build + booster)
SELECT 
  pb.id as build_id,
  pb.user_id,
  pb.development_points,
  pb.active_booster_id,
  pb.active_booster_name,
  pb.current_level,
  pb.level_cap,
  pb.final_stats,
  pb.final_overall_rating,
  pb.final_position_ratings,
  
  -- Dati base
  pbase.id as base_id,
  pbase.player_name,
  pbase.position,
  pbase.role,
  pbase.height,
  pbase.weight,
  pbase.age,
  pbase.nationality,
  pbase.team,
  pbase.potential_max,
  pbase.cost,
  pbase.form,
  pbase.base_stats,
  pbase.skills,
  pbase.com_skills,
  pbase.position_ratings,
  pbase.available_boosters,
  
  -- Booster attivo (se presente)
  b.id as booster_id,
  b.name as booster_name,
  b.effects as booster_effects,
  b.booster_type,
  b.rarity
  
FROM player_builds pb
JOIN players_base pbase ON pbase.id = pb.player_base_id
LEFT JOIN boosters b ON b.id = pb.active_booster_id
WHERE pb.id = 'build_vinicius_user123'
  AND pb.user_id = 'user_123';
```

**Risultato**:
```json
{
  "build_id": "build_vinicius_user123",
  "player_name": "Vinícius Júnior",
  "position": "ESA",
  "role": "ESA Ala prolifica",
  "height": 176,
  "weight": 73,
  "age": 24,
  "base_stats": { "attacking": {...}, ... },
  "final_stats": { "attacking": { "finishing": 92, ... }, ... },
  "final_overall_rating": 98,
  "development_points": { "shooting": 14, ... },
  "active_booster_name": "Attacco +2",
  "booster_effects": [{ "stat": "finishing", "value": 2 }, ...],
  "skills": ["First Time Shot", ...]
}
```

---

## 📊 FLUSSO 4: Visualizzazione Rosa Completa

### **Query Supabase**:

```sql
-- Ottieni rosa con tutti i giocatori
WITH rosa_data AS (
  SELECT 
    ur.id,
    ur.name,
    ur.player_build_ids,
    ur.preferred_formation,
    ur.squad_analysis
  FROM user_rosa ur
  WHERE ur.id = 'rosa_user123'
    AND ur.user_id = 'user_123'
),
builds_data AS (
  SELECT 
    pb.id as build_id,
    pb.player_base_id,
    pb.final_overall_rating,
    pb.final_stats,
    pb.active_booster_id,
    pb.active_booster_name,
    pb.development_points,
    pb.current_level,
    pb.level_cap,
    -- Dati base
    pbase.player_name,
    pbase.position,
    pbase.role,
    pbase.base_stats,
    pbase.skills,
    pbase.com_skills,
    pbase.height,
    pbase.weight,
    pbase.age,
    -- Booster
    b.effects as booster_effects
  FROM player_builds pb
  JOIN players_base pbase ON pbase.id = pb.player_base_id
  LEFT JOIN boosters b ON b.id = pb.active_booster_id
  WHERE pb.id = ANY(
    SELECT unnest(player_build_ids) FROM rosa_data
  )
  AND pb.user_id = 'user_123'
)
SELECT 
  rd.*,
  json_agg(
    json_build_object(
      'build_id', bd.build_id,
      'player_name', bd.player_name,
      'position', bd.position,
      'overall_rating', bd.final_overall_rating,
      'final_stats', bd.final_stats,
      'base_stats', bd.base_stats,
      'skills', bd.skills,
      'active_booster', bd.active_booster_name,
      'booster_effects', bd.booster_effects
    )
    ORDER BY array_position(rd.player_build_ids, bd.build_id)
  ) as players
FROM rosa_data rd
LEFT JOIN builds_data bd ON bd.build_id = ANY(rd.player_build_ids)
GROUP BY rd.id;
```

**Risultato**:
```json
{
  "id": "rosa_user123",
  "name": "La mia squadra",
  "player_build_ids": ["build_1", "build_2", ..., "build_21"],
  "players": [
    {
      "build_id": "build_1",
      "player_name": "Vinícius Júnior",
      "position": "ESA",
      "overall_rating": 98,
      "final_stats": {...},
      "base_stats": {...},
      "skills": [...],
      "active_booster": "Attacco +2",
      "booster_effects": [...]
    },
    // ... altri giocatori in ordine slot
  ]
}
```

---

## 🎯 RIEPILOGO FLUSSI

### **Salvataggio**:
1. Screenshot → `players_base` (se nuovo) + `player_builds` (sempre)
2. Aggiunta rosa → `user_rosa.player_build_ids[]` (array aggiornato)
3. Booster → `boosters` (catalogo) + `player_builds.active_booster_id` (riferimento)

### **Lettura**:
1. Rosa → `user_rosa` → `player_build_ids[]` → `player_builds` → `players_base` + `boosters`
2. Giocatore → `player_builds` → `players_base` + `boosters`

### **Relazioni**:
- `player_builds.player_base_id` → `players_base.id` (1:N)
- `player_builds.active_booster_id` → `boosters.id` (N:1)
- `user_rosa.player_build_ids[]` → `player_builds.id[]` (1:N array)

---

**Status**: 🟢 **FLUSSI DOCUMENTATI E CHIARI**
