# 🔍 Vision OCR & Database Design
## Sistema Completo Estrazione Dati da Screenshot e Storage

---

## 📋 INDICE

1. [Flusso Estrazione Dati da Screenshot](#flusso-estrazione-dati)
2. [Google Vision API - Come Funziona](#google-vision-api)
3. [Cosa Estrarre da Ogni Tipo Screenshot](#cosa-estrarre)
4. [Schema Database Supabase Completo](#schema-database)
5. [Cosa Salvare e Come](#cosa-salvare)
6. [Edge Functions per Processing](#edge-functions)
7. [Flusso Completo End-to-End](#flusso-completo)

---

## 🔄 FLUSSO ESTRAZIONE DATI

### **Step-by-Step Process:**

```
1. UTENTE: Carica Screenshot
   ↓
2. FRONTEND: Upload a Supabase Storage
   - Bucket: 'player-screenshots'
   - Path: {user_id}/{timestamp}_{filename}
   ↓
3. FRONTEND: Chiama Edge Function 'process-screenshot'
   - Passa: image_url, image_type, user_id
   ↓
4. EDGE FUNCTION: Download immagine da Storage
   ↓
5. EDGE FUNCTION: Chiama Google Vision API
   - OCR per testo
   - Object Detection per elementi UI
   - Label Detection per contesto
   ↓
6. EDGE FUNCTION: Parsing e Normalizzazione
   - Estrae dati strutturati
   - Valida range (0-99 per stats)
   - Matcha giocatori con database
   ↓
7. EDGE FUNCTION: Salva in Database
   - players_base (se nuovo giocatore)
   - player_builds (build utente)
   - screenshot_processing_log (audit)
   ↓
8. FRONTEND: Riceve dati estratti
   - Mostra preview
   - Permette correzione manuale
   - Conferma salvataggio
```

---

## 🎯 GOOGLE VISION API - COME FUNZIONA

### **Servizi Google Vision Utilizzati:**

#### **1. OCR (Text Detection)**
```typescript
// Estrae tutto il testo visibile nell'immagine
const response = await vision.textDetection(imageBuffer);
const detections = response.textAnnotations;

// Esempio output:
[
  { description: "98", boundingPoly: {...} },
  { description: "CF", boundingPoly: {...} },
  { description: "Kylian Mbappé", boundingPoly: {...} },
  { description: "Offensive Awareness", boundingPoly: {...} },
  { description: "85", boundingPoly: {...} },
  // ...
]
```

**Uso**: Estrae numeri (rating, statistiche) e testo (nomi, attributi)

#### **2. Object Detection (Label Detection)**
```typescript
// Identifica elementi nell'immagine
const response = await vision.labelDetection(imageBuffer);
const labels = response.labelAnnotations;

// Esempio output:
[
  { description: "screenshot", score: 0.95 },
  { description: "user interface", score: 0.89 },
  { description: "statistics", score: 0.87 },
  // ...
]
```

**Uso**: Identifica tipo screenshot (profilo giocatore, formazione, statistiche)

#### **3. Document Text Detection (Avanzato)**
```typescript
// Per layout strutturati (tabelle, form)
const response = await vision.documentTextDetection(imageBuffer);
const fullTextAnnotation = response.fullTextAnnotation;

// Output strutturato con:
// - Blocks (sezioni)
// - Paragraphs (paragrafi)
// - Words (parole)
// - Symbols (caratteri)
// - Bounding boxes (posizione)
```

**Uso**: Per estrarre dati da tabelle statistiche (più preciso)

---

## 📸 COSA ESTRARRE DA OGNI TIPO SCREENSHOT

### **TIPO 1: Profilo Giocatore (Player Profile)**

#### **Dati da Estrarre:**

```typescript
interface PlayerProfileExtraction {
  // Identificazione
  player_name: string;              // "Kylian Mbappé"
  overall_rating: number;           // 98
  position: string;                 // "CF", "LWF", ecc.
  card_type?: string;               // "Epic", "Big Time", ecc.
  team?: string;                    // "Paris Saint-Germain"
  era?: string;                     // "2023-24"
  
  // Statistiche Attacco (0-99)
  attacking: {
    offensiveAwareness: number;     // OCR: "85"
    ballControl: number;
    dribbling: number;
    tightPossession: number;
    lowPass: number;
    loftedPass: number;
    finishing: number;
    heading: number;
    placeKicking: number;
    curl: number;
  };
  
  // Statistiche Difesa (0-99)
  defending: {
    defensiveAwareness: number;
    defensiveEngagement: number;
    tackling: number;
    aggression: number;
    goalkeeping?: number;           // Solo per portieri
    gkCatching?: number;
    gkParrying?: number;
    gkReflexes?: number;
    gkReach?: number;
  };
  
  // Statistiche Forza (0-99)
  athleticism: {
    speed: number;
    acceleration: number;
    kickingPower: number;
    jump: number;
    physicalContact: number;
    balance: number;
    stamina: number;
    weakFootUsage: number;          // 1-4
    weakFootAccuracy: number;       // 1-4
    form: number;                    // 1-8
    injuryResistance: number;       // 1-3
  };
  
  // Skills (Array di stringhe)
  skills: string[];                 // ["Long Ball Expert", "Outside Curler", ...]
  comSkills: string[];              // ["MazingRun", "IncisiveRun"]
  
  // Position Ratings (valutazioni per posizione)
  positionRatings: {
    [position: string]: number;     // { "CF": 98, "LWF": 97, ... }
  };
  
  // Build (se visibile nello screenshot)
  build?: {
    levelCap: number;                // OCR: "34"
    currentLevel: number;            // OCR: "66/66"
    developmentPoints: {
      shooting: number;
      passing: number;
      dribbling: number;
      dexterity: number;
      lowerBodyStrength: number;
      aerialStrength: number;
      defending: number;
      gk1?: number;
      gk2?: number;
      gk3?: number;
    };
    activeBooster?: string;          // "Shooting +3", ecc.
  };
  
  // Match Statistics (se visibili)
  matchStats?: {
    matchesPlayed: number;
    goals: number;
    assists: number;
    // ...
  };
}
```

#### **Strategia Estrazione:**

1. **OCR Completo**: Estrae tutto il testo
2. **Pattern Matching**: 
   - Cerca pattern "Offensive Awareness: 85" o "Offensive Awareness\n85"
   - Cerca pattern "Overall: 98" o "98\nCF"
   - Cerca pattern "Skills:" seguito da lista
3. **Layout Analysis**: 
   - Identifica sezioni (Attacking, Defending, Athleticism)
   - Identifica tabelle statistiche
   - Identifica position ratings (campo 2D)
4. **Validation**: 
   - Range check (0-99 per stats)
   - Player name matching con database
   - Cross-validation (somma stats deve essere ragionevole)

---

### **TIPO 2: Formazione (Formation)**

#### **Dati da Estrarre:**

```typescript
interface FormationExtraction {
  formation_name: string;            // "4-3-3", "4-4-2", ecc.
  players: FormationPlayer[];
  tactics?: {
    attackingStyle: string;          // "Possession", "Counter Attack", ecc.
    defensiveLine: string;           // "High", "Medium", "Low"
    compactness: string;             // "Wide", "Narrow"
  };
}

interface FormationPlayer {
  position: string;                  // "GK", "CB", "CMF", "CF", ecc.
  player_name?: string;              // Se visibile
  player_id?: string;                // Se matchato con DB
  x: number;                         // Posizione X (0-100)
  y: number;                         // Posizione Y (0-100)
}
```

#### **Strategia Estrazione:**

1. **Object Detection**: Identifica campo da calcio
2. **Player Icons Detection**: Identifica icone giocatori
3. **Position Mapping**: Mappa posizioni (GK, CB, LB, RB, DMF, CMF, AMF, LWF, RWF, SS, CF)
4. **Formation Recognition**: Riconosce pattern formazione (4-3-3, 4-4-2, ecc.)

---

### **TIPO 3: Statistiche Post-Match**

#### **Dati da Estrarre:**

```typescript
interface PostMatchStatsExtraction {
  match_result: {
    home_score: number;
    away_score: number;
    user_score: number;              // Score utente
    opponent_score: number;
  };
  
  possession: {
    user: number;                    // Percentuale
    opponent: number;
  };
  
  shots: {
    user: number;
    opponent: number;
  };
  
  shots_on_target: {
    user: number;
    opponent: number;
  };
  
  passes: {
    user: number;
    opponent: number;
  };
  
  // Altri stats disponibili
  [key: string]: any;
}
```

---

## 🗄️ SCHEMA DATABASE SUPABASE

### **TABELLA 1: `players_base`**
**Scopo**: Database giocatori base (da Konami/Google Drive)

```sql
CREATE TABLE players_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificazione
  player_name TEXT NOT NULL,
  konami_id TEXT UNIQUE,              -- ID da Konami (se disponibile)
  efootballhub_id TEXT,                -- ID da efootballhub (se disponibile)
  
  -- Dati Base
  position TEXT,                       -- "CF", "AMF", ecc.
  card_type TEXT,                      -- "Epic", "Big Time", "Standard"
  team TEXT,
  era TEXT,
  
  -- Statistiche Base (senza build)
  base_stats JSONB NOT NULL,          -- { attacking: {...}, defending: {...}, athleticism: {...} }
  
  -- Abilità
  skills TEXT[],                      -- Array skills
  com_skills TEXT[],                   -- Array com skills
  
  -- Position Ratings
  position_ratings JSONB,             -- { "CF": 98, "LWF": 97, ... }
  
  -- Booster Disponibili
  available_boosters JSONB,           -- Array di booster disponibili
  
  -- Metadata
  metadata JSONB,                     -- Altri dati (height, weight, age, foot, ecc.)
  source TEXT,                        -- "konami", "efootballhub", "user_upload"
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici
CREATE INDEX idx_players_name ON players_base(player_name);
CREATE INDEX idx_players_position ON players_base(position);
CREATE INDEX idx_players_konami_id ON players_base(konami_id);
```

---

### **TABELLA 2: `player_builds`**
**Scopo**: Build giocatori degli utenti (come hanno buildato)

```sql
CREATE TABLE player_builds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_base_id UUID NOT NULL REFERENCES players_base(id) ON DELETE CASCADE,
  
  -- Build Data
  development_points JSONB NOT NULL,  -- { shooting: 10, passing: 8, ... }
  active_booster_id UUID,             -- Riferimento a booster (se applicato)
  active_booster_name TEXT,           -- "Shooting +3" (per facilità query)
  
  -- Livello
  current_level INTEGER,               -- 66
  level_cap INTEGER,                  -- 34
  
  -- Statistiche Finali (calcolate)
  final_stats JSONB,                  -- Statistiche finali dopo build + booster
  final_overall_rating INTEGER,       -- Overall rating finale
  final_position_ratings JSONB,      -- Position ratings finali
  
  -- Source (come è stato creato)
  source TEXT,                        -- "screenshot", "voice", "manual", "import"
  source_data JSONB,                  -- { screenshot_id, confidence, ecc. }
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: un utente può avere una build per giocatore base
  UNIQUE(user_id, player_base_id)
);

-- Indici
CREATE INDEX idx_builds_user_id ON player_builds(user_id);
CREATE INDEX idx_builds_player_base_id ON player_builds(player_base_id);
```

---

### **TABELLA 3: `user_rosa`**
**Scopo**: Rose (squadre) degli utenti

```sql
CREATE TABLE user_rosa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Info Rosa
  name TEXT,                          -- "La mia squadra principale"
  description TEXT,
  
  -- Giocatori (riferimenti a player_builds)
  player_build_ids UUID[] NOT NULL,   -- Array di ID da player_builds
  
  -- Formazione Preferita
  preferred_formation TEXT,           -- "4-3-3", "4-4-2", ecc.
  
  -- Analisi Squadra (calcolata)
  squad_analysis JSONB,               -- { strengths: [...], weaknesses: [...], ... }
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: nome unico per utente
  UNIQUE(user_id, name)
);

-- Indici
CREATE INDEX idx_rosa_user_id ON user_rosa(user_id);
```

---

### **TABELLA 4: `screenshot_processing_log`**
**Scopo**: Log processing screenshot (audit, debug, re-processing)

```sql
CREATE TABLE screenshot_processing_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Immagine
  image_url TEXT NOT NULL,            -- URL Supabase Storage
  image_type TEXT NOT NULL,           -- "player_profile", "formation", "post_match_stats"
  
  -- Processing
  processing_status TEXT,             -- "pending", "processing", "completed", "failed"
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  
  -- Risultati OCR/Vision
  raw_ocr_data JSONB,                 -- Dati grezzi da Google Vision
  extracted_data JSONB,               -- Dati estratti e normalizzati
  confidence_score DECIMAL(3,2),      -- 0.00-1.00 (confidenza estrazione)
  
  -- Risultati Matching
  matched_player_id UUID REFERENCES players_base(id), -- Se giocatore matchato
  matching_confidence DECIMAL(3,2),   -- Confidenza matching
  
  -- Errori
  error_message TEXT,
  error_details JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici
CREATE INDEX idx_screenshot_user_id ON screenshot_processing_log(user_id);
CREATE INDEX idx_screenshot_status ON screenshot_processing_log(processing_status);
CREATE INDEX idx_screenshot_created_at ON screenshot_processing_log(created_at DESC);
```

---

### **TABELLA 5: `boosters`**
**Scopo**: Database booster disponibili

```sql
CREATE TABLE boosters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Info Booster
  name TEXT NOT NULL UNIQUE,          -- "Shooting +3", "Total Package +2"
  description TEXT,
  
  -- Effetti
  effects JSONB NOT NULL,             -- [{ stat: "finishing", bonus: 3 }, ...]
  
  -- Tipo
  booster_type TEXT,                  -- "stat_boost", "special", "total_package"
  rarity TEXT,                        -- "common", "rare", "epic"
  
  -- Disponibilità
  available_for_positions TEXT[],     -- ["CF", "SS", "AMF", ...] o null = tutti
  available_for_card_types TEXT[],    -- ["Epic", "Big Time", ...] o null = tutti
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### **TABELLA 6: `unified_match_contexts`**
**Scopo**: Contesti partita multimodali (da ARCHITECTURE_DESIGN.md)

```sql
CREATE TABLE unified_match_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Riferimento Rosa (se applicabile)
  rosa_id UUID REFERENCES user_rosa(id),
  
  -- Image Context
  image_id TEXT,
  image_url TEXT,
  image_type TEXT,
  image_extracted_data JSONB,
  
  -- Voice Context
  audio_id TEXT,
  audio_url TEXT,
  transcription TEXT,
  voice_semantic_analysis JSONB,
  
  -- Derived Insights
  derived_insights JSONB,
  game_state JSONB,
  
  -- Metadata
  session_metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici
CREATE INDEX idx_contexts_user_id ON unified_match_contexts(user_id);
CREATE INDEX idx_contexts_rosa_id ON unified_match_contexts(rosa_id);
```

---

### **TABELLA 7: `coaching_suggestions`**
**Scopo**: Suggerimenti coaching generati

```sql
CREATE TABLE coaching_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_id UUID REFERENCES unified_match_contexts(id) ON DELETE CASCADE,
  rosa_id UUID REFERENCES user_rosa(id) ON DELETE CASCADE,
  
  suggestion_type TEXT NOT NULL,      -- "build_optimization", "player_substitution", "formation_change"
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  reasoning TEXT,
  priority INTEGER DEFAULT 0,         -- 0-10
  
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 💾 COSA SALVARE E COME

### **1. Screenshot Originale**
- **Dove**: Supabase Storage
- **Bucket**: `player-screenshots`
- **Path**: `{user_id}/{timestamp}_{filename}.{ext}`
- **Formato**: JPG, PNG, WebP
- **Max Size**: 10MB
- **Access**: Privato (solo utente proprietario)

### **2. Dati Estratti**
- **Dove**: `screenshot_processing_log.extracted_data` (JSONB)
- **Formato**: Struttura TypeScript normalizzata
- **Validazione**: Range check, type check, required fields

### **3. Giocatore Base**
- **Dove**: `players_base`
- **Quando**: Se giocatore non esiste nel database
- **Matching**: Per nome (fuzzy matching) o ID Konami/efootballhub

### **4. Build Utente**
- **Dove**: `player_builds`
- **Quando**: Sempre (ogni utente ha la sua build)
- **Link**: `player_builds.player_base_id` → `players_base.id`

### **5. Rosa**
- **Dove**: `user_rosa`
- **Quando**: Quando utente completa rosa (11 giocatori)
- **Link**: `user_rosa.player_build_ids[]` → `player_builds.id[]`

---

## ⚙️ EDGE FUNCTIONS PER PROCESSING

### **Function 1: `process-screenshot`**

```typescript
// supabase/functions/process-screenshot/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleAuth } from "https://deno.land/x/google_auth@v1.0.0/mod.ts"

interface ProcessScreenshotRequest {
  image_url: string;
  image_type: 'player_profile' | 'formation' | 'post_match_stats';
  user_id: string;
}

serve(async (req) => {
  try {
    const { image_url, image_type, user_id }: ProcessScreenshotRequest = await req.json()
    
    // 1. Inizializza Supabase Client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // 2. Crea log entry
    const { data: logEntry } = await supabase
      .from('screenshot_processing_log')
      .insert({
        user_id,
        image_url,
        image_type,
        processing_status: 'processing',
        processing_started_at: new Date().toISOString()
      })
      .select()
      .single()
    
    // 3. Download immagine da Storage
    const imageResponse = await fetch(image_url)
    const imageBuffer = await imageResponse.arrayBuffer()
    
    // 4. Chiama Google Vision API
    const visionClient = new GoogleAuth({
      credentials: JSON.parse(Deno.env.get('GOOGLE_VISION_CREDENTIALS') ?? '{}')
    })
    
    const vision = await visionClient.getClient()
    
    // OCR
    const [ocrResult] = await vision.textDetection({
      image: { content: imageBuffer }
    })
    
    // Document Text Detection (per tabelle)
    const [docResult] = await vision.documentTextDetection({
      image: { content: imageBuffer }
    })
    
    // Label Detection
    const [labelResult] = await vision.labelDetection({
      image: { content: imageBuffer }
    })
    
    // 5. Estrai dati strutturati
    const extractedData = extractPlayerData(
      ocrResult,
      docResult,
      labelResult,
      image_type
    )
    
    // 6. Matcha giocatore con database
    const matchedPlayer = await matchPlayer(extractedData.player_name, supabase)
    
    // 7. Salva/aggiorna players_base (se nuovo)
    let playerBaseId = matchedPlayer?.id
    if (!playerBaseId) {
      const { data: newPlayer } = await supabase
        .from('players_base')
        .insert({
          player_name: extractedData.player_name,
          position: extractedData.position,
          base_stats: extractedData.attacking ? {
            attacking: extractedData.attacking,
            defending: extractedData.defending,
            athleticism: extractedData.athleticism
          } : null,
          skills: extractedData.skills || [],
          com_skills: extractedData.comSkills || [],
          source: 'user_upload'
        })
        .select()
        .single()
      
      playerBaseId = newPlayer.id
    }
    
    // 8. Salva build utente
    if (extractedData.build) {
      await supabase
        .from('player_builds')
        .upsert({
          user_id,
          player_base_id: playerBaseId,
          development_points: extractedData.build.developmentPoints,
          current_level: extractedData.build.currentLevel,
          level_cap: extractedData.build.levelCap,
          active_booster_name: extractedData.build.activeBooster,
          source: 'screenshot',
          source_data: {
            screenshot_id: logEntry.id,
            confidence: extractedData.confidence
          }
        }, {
          onConflict: 'user_id,player_base_id'
        })
    }
    
    // 9. Aggiorna log
    await supabase
      .from('screenshot_processing_log')
      .update({
        processing_status: 'completed',
        processing_completed_at: new Date().toISOString(),
        raw_ocr_data: { ocr: ocrResult, doc: docResult, labels: labelResult },
        extracted_data: extractedData,
        confidence_score: extractedData.confidence,
        matched_player_id: playerBaseId,
        matching_confidence: matchedPlayer?.confidence || 1.0
      })
      .eq('id', logEntry.id)
    
    return new Response(
      JSON.stringify({
        success: true,
        log_id: logEntry.id,
        extracted_data: extractedData,
        matched_player_id: playerBaseId
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

// Helper: Estrai dati da OCR
function extractPlayerData(ocrResult, docResult, labelResult, imageType) {
  // Implementazione parsing OCR
  // Pattern matching, layout analysis, validation
  // Return: PlayerProfileExtraction
}

// Helper: Matcha giocatore
async function matchPlayer(playerName, supabase) {
  // Fuzzy matching con players_base
  // Return: { id, confidence }
}
```

---

## 🔄 FLUSSO COMPLETO END-TO-END

### **Scenario: Utente carica screenshot profilo giocatore**

```
1. FRONTEND: User carica screenshot
   ↓
2. FRONTEND: Upload a Supabase Storage
   - Bucket: player-screenshots
   - Path: {user_id}/2025-01-12_14-30-00_mbappe.png
   ↓
3. FRONTEND: Chiama Edge Function
   POST /functions/v1/process-screenshot
   Body: {
     image_url: "https://.../mbappe.png",
     image_type: "player_profile",
     user_id: "user-123"
   }
   ↓
4. EDGE FUNCTION: Crea log entry
   INSERT INTO screenshot_processing_log
   ↓
5. EDGE FUNCTION: Download immagine
   ↓
6. EDGE FUNCTION: Google Vision API
   - OCR: Estrae tutto il testo
   - Document Text: Estrae tabelle
   - Labels: Identifica tipo screenshot
   ↓
7. EDGE FUNCTION: Parsing
   - Pattern matching: "Offensive Awareness: 85"
   - Layout analysis: Identifica sezioni
   - Validation: Range check, type check
   ↓
8. EDGE FUNCTION: Matching Giocatore
   - Cerca "Kylian Mbappé" in players_base
   - Fuzzy matching se non trovato esatto
   ↓
9. EDGE FUNCTION: Salva Dati
   - Se nuovo giocatore: INSERT INTO players_base
   - Sempre: UPSERT INTO player_builds
   - Aggiorna log: UPDATE screenshot_processing_log
   ↓
10. FRONTEND: Riceve risposta
    {
      success: true,
      extracted_data: { ... },
      matched_player_id: "player-456"
    }
    ↓
11. FRONTEND: Mostra preview
    - Dati estratti
    - Possibilità correzione manuale
    - Conferma salvataggio
    ↓
12. FRONTEND: Aggiunge a Rosa
    - Se rosa non esiste: crea nuova
    - Se rosa esiste: aggiunge giocatore
    - Aggiorna user_rosa.player_build_ids[]
```

---

## 🎯 PROSSIMI STEP

1. ⏳ **Setup Google Vision API**
   - Creare progetto Google Cloud
   - Abilitare Vision API
   - Creare service account
   - Salvare credentials in Supabase Secrets

2. ⏳ **Creare Schema Database**
   - Eseguire migrazioni SQL
   - Creare storage buckets
   - Configurare RLS (Row Level Security)

3. ⏳ **Implementare Edge Function**
   - `process-screenshot`
   - Helper functions (parsing, matching)

4. ⏳ **Frontend Integration**
   - Componente upload screenshot
   - Preview dati estratti
   - Correzione manuale

5. ⏳ **Testing**
   - Test con screenshot reali
   - Validazione accuracy
   - Ottimizzazione parsing

---

**Status**: 🟡 Design completato, pronto per implementazione
