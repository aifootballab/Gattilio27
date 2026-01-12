# 🗄️ Struttura Database Supabase - Spiegazione Completa
## Dove vengono salvate le caratteristiche del giocatore

**Data**: 2025-01-12  
**Status**: ✅ **DOCUMENTAZIONE COMPLETA**

---

## 🎯 CONCETTO CHIAVE: Separazione Base vs Build

**Il sistema separa i dati BASE (condivisi) dai dati BUILD (specifici utente)**

```
┌─────────────────────────────────────────┐
│  DATI BASE (Condivisi tra tutti)         │
│  - players_base                          │
│  - boosters (catalogo)                   │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  DATI BUILD (Specifici per utente)       │
│  - player_builds                        │
│  - user_rosa                            │
└─────────────────────────────────────────┘
```

---

## 📊 TABELLE PRINCIPALI

### **1. `players_base` - Database Giocatori Base**

**Scopo**: Catalogo condiviso di tutti i giocatori (come un database Konami)

**Dove vengono salvate le caratteristiche BASE**:

```sql
CREATE TABLE players_base (
  id UUID PRIMARY KEY,
  
  -- IDENTIFICAZIONE
  player_name TEXT NOT NULL,        -- "Vinícius Júnior"
  konami_id TEXT UNIQUE,            -- ID ufficiale Konami
  efootballhub_id TEXT,              -- ID eFootballHub
  
  -- DATI BASE
  position TEXT,                     -- "ESA" (posizione principale)
  role TEXT,                         -- "ESA Ala prolifica" (ruolo)
  card_type TEXT,                    -- "Standard", "Featured", etc.
  team TEXT,                         -- "Real Madrid"
  era TEXT,                          -- "2024"
  
  -- DATI FISICI
  height INTEGER,                    -- 176 (cm)
  weight INTEGER,                    -- 73 (kg)
  age INTEGER,                        -- 24
  nationality TEXT,                  -- "Brazil"
  
  -- DATI GIOCO
  potential_max INTEGER,             -- 103 (potenziale massimo)
  cost INTEGER,                      -- 0 (costo)
  form TEXT,                         -- "B" (condizione: A, B, C, D, E)
  
  -- ⭐ STATISTICHE BASE (JSONB)
  base_stats JSONB NOT NULL DEFAULT '{}',
  -- {
  --   "overall_rating": 98,
  --   "attacking": { "offensive_awareness": 84, "ball_control": 89, ... },
  --   "defending": { "defensive_awareness": 49, ... },
  --   "athleticism": { "speed": 91, "acceleration": 92, ... }
  -- }
  
  -- ⭐ ABILITÀ BASE
  skills TEXT[] DEFAULT '{}',        -- ["First Time Shot", "Acrobatic Finishing", ...]
  com_skills TEXT[] DEFAULT '{}',    -- ["MazingRun", "IncisiveRun", ...]
  
  -- ⭐ POSITION RATINGS
  position_ratings JSONB DEFAULT '{}', -- { "CF": 98, "LWF": 97, "SS": 95 }
  
  -- ⭐ BOOSTER DISPONIBILI (riferimento)
  available_boosters JSONB DEFAULT '[]', -- Array di ID booster disponibili
  
  -- METADATA
  metadata JSONB DEFAULT '{}',
  source TEXT DEFAULT 'user_upload',  -- 'google_drive', 'efootballhub', etc.
  
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Caratteristiche**:
- ✅ **Condiviso**: Tutti gli utenti vedono gli stessi dati base
- ✅ **Immutable**: Non cambia per utente (tranne aggiornamenti Konami)
- ✅ **Fonte unica**: Un giocatore = una riga (es: "Vinícius Júnior" ha una sola entry base)

---

### **2. `boosters` - Catalogo Booster**

**Scopo**: Catalogo condiviso di tutti i booster disponibili nel gioco

**Perché è separato?**:

1. **Condivisione**: Tutti gli utenti usano lo stesso catalogo booster
2. **Riuso**: Un booster può essere usato da molti giocatori
3. **Normalizzazione**: Evita duplicazione (non salvare "Attacco +2" 1000 volte)
4. **Gestione centralizzata**: Aggiornamenti booster in un solo posto

```sql
CREATE TABLE boosters (
  id UUID PRIMARY KEY,
  
  -- INFO BOOSTER
  name TEXT NOT NULL UNIQUE,         -- "Attacco +2"
  description TEXT,                  -- Descrizione effetti
  
  -- EFFETTI (JSONB)
  effects JSONB NOT NULL DEFAULT '[]',
  -- [
  --   { "stat": "finishing", "value": +2 },
  --   { "stat": "offensive_awareness", "value": +1 }
  -- ]
  
  -- TIPO
  booster_type TEXT,                 -- "attacking", "defending", etc.
  rarity TEXT,                       -- "common", "rare", "epic"
  
  -- DISPONIBILITÀ
  available_for_positions TEXT[],    -- ["CF", "SS", "LWF", ...]
  available_for_card_types TEXT[],   -- ["Standard", "Featured", ...]
  
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Esempio**:
```json
{
  "id": "booster_123",
  "name": "Attacco +2",
  "effects": [
    { "stat": "finishing", "value": 2 },
    { "stat": "offensive_awareness", "value": 1 }
  ],
  "booster_type": "attacking",
  "available_for_positions": ["CF", "SS", "LWF", "RWF"]
}
```

**Relazione con players_base**:
- `players_base.available_boosters` contiene array di ID booster
- Es: `["booster_123", "booster_456"]` = questo giocatore può usare questi booster

---

### **3. `player_builds` - Build Specifiche Utente**

**Scopo**: Come l'utente ha modificato/buildato il giocatore base

**Dove vengono salvate le caratteristiche FINALI (con build applicata)**:

```sql
CREATE TABLE player_builds (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,              -- Chi ha questa build
  player_base_id UUID NOT NULL,       -- Riferimento a players_base
  
  -- ⭐ BUILD DATA (modifiche utente)
  development_points JSONB NOT NULL DEFAULT '{}',
  -- {
  --   "shooting": 14,
  --   "passing": 8,
  --   "dribbling": 12,
  --   "lower_body_strength": 10,
  --   ...
  -- }
  
  -- ⭐ BOOSTER ATTIVO (riferimento)
  active_booster_id UUID REFERENCES boosters(id),  -- FK a boosters
  active_booster_name TEXT,           -- Cache nome (per performance)
  
  -- ⭐ LIVELLO
  current_level INTEGER,               -- 98 (livello attuale)
  level_cap INTEGER,                   -- 100 (livello massimo)
  
  -- ⭐ STATISTICHE FINALI (calcolate o da screenshot)
  final_stats JSONB,
  -- {
  --   "attacking": { "finishing": 92, ... },  // Base + Build
  --   "defending": { ... },
  --   "athleticism": { ... }
  -- }
  
  final_overall_rating INTEGER,        -- 94 (overall finale)
  final_position_ratings JSONB,        -- { "CF": 94, "LWF": 93 }
  
  -- SOURCE
  source TEXT DEFAULT 'manual',        -- 'screenshot', 'manual', 'google_drive'
  source_data JSONB DEFAULT '{}',      -- Metadata origine
  
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  
  UNIQUE(user_id, player_base_id)      -- Un utente = una build per giocatore
);
```

**Caratteristiche**:
- ✅ **Specifico utente**: Ogni utente ha la sua build
- ✅ **Riferimento base**: `player_base_id` → `players_base`
- ✅ **Riferimento booster**: `active_booster_id` → `boosters`
- ✅ **Performance finali**: Statistiche dopo build applicata

**Esempio**:
```
Utente A ha Vinícius Júnior:
- Base: Finishing 85
- Build: Shooting +14 punti
- Booster: "Attacco +2"
- Finale: Finishing 92 (85 + 7 da shooting + 2 da booster)

Utente B ha lo stesso Vinícius Júnior:
- Base: Finishing 85 (stesso)
- Build: Shooting +8 punti (diverso!)
- Booster: null
- Finale: Finishing 90 (85 + 5 da shooting)
```

---

### **4. `user_rosa` - Squadre Utente**

**Scopo**: Rosa (squadra) dell'utente con 11 titolari + 10 riserve

```sql
CREATE TABLE user_rosa (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  
  name TEXT NOT NULL,                  -- "La mia squadra"
  description TEXT,
  
  -- ⭐ GIOCATORI (array di player_build_ids)
  player_build_ids UUID[] NOT NULL DEFAULT '{}',
  -- [build_id_1, build_id_2, ..., build_id_21]
  -- Indici 0-10: Titolari
  -- Indici 11-20: Riserve
  
  preferred_formation TEXT,            -- "4-3-3"
  squad_analysis JSONB DEFAULT '{}',  -- Analisi squadra
  
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  
  UNIQUE(user_id, name)
);
```

**Caratteristiche**:
- ✅ **Array ordinato**: Mantiene ordine slot (0-10 titolari, 11-20 riserve)
- ✅ **Riferimento build**: Contiene ID di `player_builds`, non `players_base`
- ✅ **Specifico utente**: Ogni utente ha la sua rosa

---

## 🔄 FLUSSI COMPLETI

### **FLUSSO 1: Upload Screenshot**

```
1. Utente carica screenshot Vinícius Júnior
   ↓
2. Edge Function: process-screenshot
   - OCR con Google Vision API
   - Estrae dati FINALI (già buildati)
   ↓
3. Sistema cerca players_base
   - Match per nome: "Vinícius Júnior"
   - Se non esiste → CREA nuovo players_base
   ↓
4. Salvataggio players_base (se nuovo):
   INSERT INTO players_base (
     player_name: "Vinícius Júnior",
     position: "ESA",
     role: "ESA Ala prolifica",
     height: 176,
     weight: 73,
     age: 24,
     base_stats: { attacking: {...}, defending: {...}, ... },
     skills: ["First Time Shot", ...],
     ...
   )
   ↓
5. Salvataggio player_builds:
   INSERT INTO player_builds (
     user_id: "user_123",
     player_base_id: "base_vinicius_456",
     final_stats: { attacking: { finishing: 92, ... }, ... },  // Dati FINALI da screenshot
     final_overall_rating: 98,
     active_booster_name: "Attacco +2",  // Se visibile nello screenshot
     level_cap: 100,
     source: 'screenshot',
     source_data: { screenshot_id: "log_789", confidence: 0.9 }
   )
   ↓
6. Sistema INFERISCE development_points (opzionale):
   - Confronta base_stats vs final_stats
   - Stima punti sviluppo allocati
   - Salva in development_points (se inferenza riuscita)
   ↓
7. Risposta al frontend:
   {
     extracted_data: { ... },
     matched_player_id: "base_vinicius_456",
     build_id: "build_vinicius_user123"
   }
```

---

### **FLUSSO 2: Aggiunta a Rosa**

```
1. Utente conferma inserimento giocatore
   ↓
2. Frontend chiama: addPlayerToRosaInSlot()
   - rosaId: "rosa_user123"
   - playerBuildId: "build_vinicius_user123"
   - destination: "titolare"
   - slot: 9
   ↓
3. Backend: rosaService.addPlayerToRosaInSlot()
   - Ottiene user_rosa corrente
   - Array player_build_ids: [id1, id2, ..., id9, null, ...]
   - Inserisce build_id nello slot 9
   - Se slot occupato → sposta giocatore esistente in riserva
   ↓
4. UPDATE user_rosa:
   UPDATE user_rosa
   SET player_build_ids = [id1, id2, ..., id9, build_vinicius_user123, ...]
   WHERE id = "rosa_user123"
   ↓
5. Frontend ricarica rosa:
   - getRosaById() → ottiene user_rosa
   - Per ogni player_build_id → ottiene player_builds
   - Per ogni player_build → ottiene players_base
   - Costruisce array 21 elementi (con null per slot vuoti)
   ↓
6. Visualizzazione:
   - RosaTitolari: slice(0, 11) → slot 0-10
   - RosaPanchina: slice(11, 21) → slot 11-20
```

---

### **FLUSSO 3: Visualizzazione Giocatore**

```
1. Frontend: RosaTitolari mostra giocatore
   ↓
2. Dati disponibili:
   player = {
     build_id: "build_123",
     player_base_id: "base_456",
     player_name: "Vinícius Júnior",  // Da players_base
     overall_rating: 98,                // Da player_builds.final_overall_rating
     position: "ESA",                   // Da players_base
     final_stats: { ... },              // Da player_builds.final_stats
     base_stats: { ... },               // Da players_base.base_stats
     skills: [...],                     // Da players_base.skills
     active_booster: "Attacco +2",      // Da player_builds.active_booster_name
     slot_index: 9                      // Posizione in rosa
   }
   ↓
3. PlayerCardDetailed mostra:
   - Nome, OVR, Posizione (da base + build)
   - Statistiche finali (da build.final_stats)
   - Skills (da base.skills)
   - Booster attivo (da build.active_booster_name)
   - Info fisiche (da base: height, weight, age)
```

---

## 🤔 PERCHÉ BOOSTERS È SEPARATO?

### **Ragioni Architetturali**:

1. **Normalizzazione Database**:
   ```
   ❌ SBAGLIATO (duplicazione):
   players_base {
     available_boosters: [
       { name: "Attacco +2", effects: [...], ... },
       { name: "Attacco +2", effects: [...], ... },  // Duplicato!
       ...
     ]
   }
   
   ✅ CORRETTO (normalizzato):
   boosters {
     { id: "booster_1", name: "Attacco +2", ... }
   }
   
   players_base {
     available_boosters: ["booster_1", "booster_2"]  // Solo ID
   }
   ```

2. **Riuso e Condivisione**:
   - Un booster può essere usato da 1000 giocatori
   - Aggiornamento booster → un solo posto
   - Es: "Attacco +2" è lo stesso per tutti

3. **Integrità Referenziale**:
   ```sql
   -- player_builds.active_booster_id → boosters.id
   -- Se booster viene aggiornato, tutti i riferimenti restano validi
   ```

4. **Query Efficienti**:
   ```sql
   -- Trova tutti i giocatori con booster "Attacco +2"
   SELECT * FROM player_builds
   WHERE active_booster_id = (
     SELECT id FROM boosters WHERE name = 'Attacco +2'
   );
   ```

5. **Gestione Centralizzata**:
   - Admin può aggiungere/modificare booster
   - Tutti i giocatori vedono aggiornamenti automaticamente
   - Catalogo booster separato dal catalogo giocatori

---

## 📋 MAPPATURA COMPLETA DATI

### **Dove viene salvato cosa**:

| **Dato** | **Tabella** | **Campo** | **Tipo** |
|----------|-------------|-----------|----------|
| Nome giocatore | `players_base` | `player_name` | TEXT |
| Posizione | `players_base` | `position` | TEXT |
| Ruolo | `players_base` | `role` | TEXT |
| Altezza | `players_base` | `height` | INTEGER |
| Peso | `players_base` | `weight` | INTEGER |
| Età | `players_base` | `age` | INTEGER |
| Nazionalità | `players_base` | `nationality` | TEXT |
| Squadra | `players_base` | `team` | TEXT |
| Potenziale | `players_base` | `potential_max` | INTEGER |
| Condizione | `players_base` | `form` | TEXT |
| **Statistiche BASE** | `players_base` | `base_stats` | JSONB |
| **Skills BASE** | `players_base` | `skills` | TEXT[] |
| **COM Skills BASE** | `players_base` | `com_skills` | TEXT[] |
| Position Ratings BASE | `players_base` | `position_ratings` | JSONB |
| Booster Disponibili | `players_base` | `available_boosters` | JSONB (array ID) |
| **Punti Sviluppo** | `player_builds` | `development_points` | JSONB |
| **Booster Attivo** | `player_builds` | `active_booster_id` | UUID (FK) |
| Livello Attuale | `player_builds` | `current_level` | INTEGER |
| Livello Massimo | `player_builds` | `level_cap` | INTEGER |
| **Statistiche FINALI** | `player_builds` | `final_stats` | JSONB |
| **Overall Rating FINALE** | `player_builds` | `final_overall_rating` | INTEGER |
| Position Ratings FINALI | `player_builds` | `final_position_ratings` | JSONB |
| **Giocatori in Rosa** | `user_rosa` | `player_build_ids` | UUID[] |
| **Info Booster** | `boosters` | `name`, `effects`, etc. | TEXT, JSONB |

---

## 🔗 RELAZIONI TRA TABELLE

```
┌─────────────────┐
│  players_base   │ (1)
└────────┬────────┘
         │
         │ player_base_id
         │
         ▼
┌─────────────────┐         ┌──────────────┐
│ player_builds   │─────────▶│   boosters    │
│                 │         │              │
│ - user_id       │         │ - name       │
│ - player_base_id│         │ - effects    │
│ - active_booster_id ──────┘              │
│ - final_stats   │
│ - final_overall │
└────────┬────────┘
         │
         │ player_build_ids[]
         │
         ▼
┌─────────────────┐
│   user_rosa     │
│                 │
│ - user_id       │
│ - player_build_ids[] (array di 21)
└─────────────────┘
```

**Relazioni**:
- `player_builds.player_base_id` → `players_base.id` (FK)
- `player_builds.active_booster_id` → `boosters.id` (FK)
- `user_rosa.player_build_ids[]` → `player_builds.id[]` (array di FK)

---

## 🎯 ESEMPIO CONCRETO

### **Scenario: Utente A aggiunge Vinícius Júnior**

**Step 1: Crea/Salva players_base** (se non esiste)
```sql
INSERT INTO players_base (
  player_name: "Vinícius Júnior",
  position: "ESA",
  role: "ESA Ala prolifica",
  height: 176,
  weight: 73,
  age: 24,
  base_stats: {
    overall_rating: 98,
    attacking: { finishing: 85, ... },
    ...
  },
  skills: ["First Time Shot", "Acrobatic Finishing"],
  available_boosters: ["booster_attacco_123", "booster_velocita_456"]
)
-- Risultato: base_id = "base_vinicius_789"
```

**Step 2: Crea player_builds** (build utente)
```sql
INSERT INTO player_builds (
  user_id: "user_A",
  player_base_id: "base_vinicius_789",
  development_points: { shooting: 14, lower_body: 10, ... },
  active_booster_id: "booster_attacco_123",  -- FK a boosters
  active_booster_name: "Attacco +2",
  final_stats: {
    attacking: { finishing: 92, ... },  // 85 + 7 da shooting + 2 da booster
    ...
  },
  final_overall_rating: 98,
  source: 'screenshot'
)
-- Risultato: build_id = "build_vinicius_userA_123"
```

**Step 3: Aggiunge a rosa**
```sql
UPDATE user_rosa
SET player_build_ids = [
  ..., 
  "build_vinicius_userA_123",  -- Slot 9
  ...
]
WHERE id = "rosa_userA"
```

**Step 4: Query per visualizzare**
```sql
-- Ottieni rosa con giocatori completi
SELECT 
  ur.*,
  json_agg(
    json_build_object(
      'build', pb.*,
      'base', pbase.*,
      'booster', b.*
    )
  ) as players
FROM user_rosa ur
JOIN unnest(ur.player_build_ids) WITH ORDINALITY AS build_ids(id, slot_index)
  ON true
LEFT JOIN player_builds pb ON pb.id = build_ids.id
LEFT JOIN players_base pbase ON pbase.id = pb.player_base_id
LEFT JOIN boosters b ON b.id = pb.active_booster_id
WHERE ur.id = 'rosa_userA'
GROUP BY ur.id
```

---

## ✅ VANTAGGI ARCHITETTURA

### **Separazione Base vs Build**:

1. **Efficienza Storage**:
   - Base condivisa: 1 riga per giocatore
   - Build: N righe (una per utente)
   - Es: 1000 utenti con Vinícius = 1 base + 1000 build

2. **Aggiornamenti Facili**:
   - Aggiorna base → tutti vedono aggiornamento
   - Build rimangono invariate (sono dell'utente)

3. **Query Performance**:
   - Base: indicizzata per ricerca
   - Build: indicizzata per user_id

4. **Integrità Dati**:
   - FK garantiscono riferimenti validi
   - RLS garantisce privacy (utente vede solo i suoi build)

---

## 🎯 RIEPILOGO

**Dove vengono salvate le caratteristiche**:

1. **BASE (condivise)**:
   - `players_base.base_stats` → Statistiche base
   - `players_base.skills` → Skills base
   - `players_base.*` → Tutti i dati anagrafici/fisici

2. **BUILD (specifiche utente)**:
   - `player_builds.final_stats` → Statistiche FINALI (base + build)
   - `player_builds.development_points` → Punti sviluppo allocati
   - `player_builds.active_booster_id` → Booster attivo

3. **ROSA (squadra utente)**:
   - `user_rosa.player_build_ids[]` → Array di build in rosa

**Perché boosters è separato**:
- ✅ Catalogo condiviso (tutti usano stesso booster)
- ✅ Normalizzazione (evita duplicazione)
- ✅ Gestione centralizzata
- ✅ Integrità referenziale (FK)

---

**Status**: 🟢 **ARCHITETTURA CHIARA E DOCUMENTATA**
