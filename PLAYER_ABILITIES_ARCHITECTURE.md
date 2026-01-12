# 🎯 Architettura Inserimento Abilità Giocatori
## Analisi e Soluzioni Proposte

---

## 📊 Analisi Screenshot - Dati Identificati

### 1. **Statistiche Base** (0-99)
- **ATTACKING**: 10 attributi (Offensive Awareness, Ball Control, Dribbling, ecc.)
- **DEFENDING**: 9 attributi (Defensive Awareness, Tackling, ecc.)
- **ATHLETICISM**: 11 attributi (Speed, Acceleration, ecc.)
- **Totale**: ~30 attributi numerici

### 2. **Skills** (Array di stringhe)
- Skills speciali: Scissors Feint, Double Touch, Cross Over Turn, ecc.
- COM SKILLS: MazingRun, IncisiveRun (per AI)

### 3. **Position Ratings** (Valutazioni per posizione)
- Campo 2D con valutazioni per ogni posizione (CF: 88, CMF: 85, ecc.)

### 4. **Player Development** (Progress bars)
- Categorie: Shooting, Passing, Dribbling, ecc.

### 5. **Condition History** (Grafico temporale)
- Storico forma giocatore (A, B, C, D, E)

### 6. **Arrow Probabilities** (Percentuali)
- Probabilità frecce: Green 14.8%, Yellow 61.6%, ecc.

---

## 🏗️ Soluzioni Proposte

### **SOLUZIONE 1: Struttura Dati TypeScript**

```typescript
interface PlayerStats {
  // Statistiche Base
  attacking: {
    offensiveAwareness: number; // 0-99
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
  
  defending: {
    defensiveAwareness: number;
    defensiveEngagement: number;
    tackling: number;
    aggression: number;
    // GK stats (se portiere)
    goalkeeping?: number;
    gkCatching?: number;
    gkParrying?: number;
    gkReflexes?: number;
    gkReach?: number;
  };
  
  athleticism: {
    speed: number;
    acceleration: number;
    kickingPower: number;
    jump: number;
    physicalContact: number;
    balance: number;
    stamina: number;
    weakFootUsage: number; // 1-4
    weakFootAccuracy: number; // 1-4
    form: number; // 1-8
    injuryResistance: number; // 1-3
  };
}

interface Player {
  // Base info
  player_id: string;
  player_name: string;
  position: string;
  overall_rating: number;
  
  // Stats complete
  stats: PlayerStats;
  
  // Skills
  skills: string[]; // ["Scissors Feint", "Double Touch", ...]
  comSkills: string[]; // ["MazingRun", "IncisiveRun"]
  
  // Position ratings
  positionRatings: {
    [position: string]: number; // { "CF": 88, "LWF": 89, ... }
  };
  
  // Development
  development: {
    [category: string]: number; // { "Shooting": 45, "Passing": 30, ... }
  };
  
  // Condition history
  conditionHistory: Array<{
    date: string;
    grade: 'A' | 'B' | 'C' | 'D' | 'E';
  }>;
  
  // Arrow probabilities
  arrowProbabilities: {
    green: number;
    yellow: number;
    orange: number;
    red: number;
    blue: number;
  };
}
```

---

### **SOLUZIONE 2: Input Multimodale - Flusso**

#### **A. Screenshot Input**
```
1. Upload Screenshot
   ↓
2. Vision AI (GPT-4 Vision / Claude Vision)
   - OCR per numeri
   - Riconoscimento layout
   - Estrazione dati strutturati
   ↓
3. Validazione & Normalizzazione
   ↓
4. Salvataggio in Context/DB
```

**Componente**: `PlayerScreenshotInput.jsx`
- Drag & drop o file picker
- Preview immagine
- Progress bar durante processing
- Mostra dati estratti per conferma

#### **B. Voice Input**
```
1. Start Recording
   ↓
2. Speech-to-Text (Whisper API)
   ↓
3. NLP Extraction
   - Parsing: "Offensive Awareness 80, Ball Control 82..."
   - Pattern matching per attributi
   ↓
4. Validazione & Normalizzazione
   ↓
5. Salvataggio
```

**Componente**: `PlayerVoiceInput.jsx`
- Pulsante record
- Visualizzazione trascrizione live
- Conferma dati estratti

#### **C. Manual Input**
```
1. Form Step-by-Step
   - Step 1: Info Base (Nome, Posizione, Rating)
   - Step 2: Attacking Stats
   - Step 3: Defending Stats
   - Step 4: Athleticism Stats
   - Step 5: Skills
   - Step 6: Position Ratings
   ↓
2. Validazione per step
   ↓
3. Salvataggio
```

**Componente**: `PlayerManualInput.jsx`
- Multi-step form
- Validazione real-time
- Auto-save draft

---

### **SOLUZIONE 3: Backend Processing (Supabase Edge Functions)**

```typescript
// supabase/functions/process-player-screenshot/index.ts
export async function processPlayerScreenshot(imageUrl: string) {
  // 1. Download image
  // 2. Call Vision AI (OpenAI/Anthropic)
  // 3. Extract structured data
  // 4. Validate & normalize
  // 5. Return structured Player object
}

// supabase/functions/process-player-voice/index.ts
export async function processPlayerVoice(audioUrl: string) {
  // 1. Speech-to-Text
  // 2. NLP extraction
  // 3. Return structured data
}
```

---

### **SOLUZIONE 4: Database Schema (Supabase)**

```sql
-- Tabella giocatori
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_name TEXT NOT NULL,
  position TEXT,
  overall_rating INTEGER,
  stats JSONB, -- PlayerStats completo
  skills TEXT[],
  com_skills TEXT[],
  position_ratings JSONB,
  development JSONB,
  condition_history JSONB,
  arrow_probabilities JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabella rosa (squadre)
CREATE TABLE rosa (
  id UUID PRIMARY KEY,
  name TEXT,
  players UUID[] REFERENCES players(id),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

---

### **SOLUZIONE 5: UI Componenti**

#### **Componente Principale: `PlayerInputModal.jsx`**
```jsx
<PlayerInputModal>
  <Tabs>
    <Tab label="Screenshot">
      <PlayerScreenshotInput />
    </Tab>
    <Tab label="Voce">
      <PlayerVoiceInput />
    </Tab>
    <Tab label="Manuale">
      <PlayerManualInput />
    </Tab>
  </Tabs>
  
  <PlayerPreview data={extractedData} />
  <Button onClick={savePlayer}>Salva</Button>
</PlayerInputModal>
```

#### **Componente Validazione: `PlayerStatsValidator.js`**
```javascript
function validatePlayerStats(stats) {
  // Validazione range 0-99
  // Validazione skills (lista valida)
  // Validazione position ratings
  // Return { valid: boolean, errors: [] }
}
```

---

### **SOLUZIONE 6: Normalizzazione Dati**

**Problema**: Screenshot/Voce possono avere formati diversi

**Soluzione**: Normalizzatore unificato
```javascript
function normalizePlayerData(rawData, source) {
  // Mappa attributi da vari formati
  // Standardizza nomi (es: "Offensive Awareness" → "offensiveAwareness")
  // Valida range
  // Completa dati mancanti con default
}
```

---

## 🎯 Implementazione Proposta

### **Fase 1: Struttura Dati**
1. ✅ Definire TypeScript interfaces
2. ✅ Aggiornare RosaContext con nuova struttura
3. ✅ Creare validators

### **Fase 2: Input Manuale**
1. ✅ Creare form multi-step
2. ✅ Validazione real-time
3. ✅ Preview dati

### **Fase 3: Input Screenshot**
1. ⏳ Integrazione Vision AI (mock prima)
2. ⏳ UI upload + preview
3. ⏳ Estrazione dati

### **Fase 4: Input Voce**
1. ⏳ Speech-to-Text
2. ⏳ NLP extraction
3. ⏳ UI recording

### **Fase 5: Backend**
1. ⏳ Supabase Edge Functions
2. ⏳ Database schema
3. ⏳ API endpoints

---

## ❓ Decisioni da Prendere

1. **Vision AI**: Quale servizio? (OpenAI GPT-4 Vision / Anthropic Claude / Google Vision)
2. **Speech-to-Text**: Quale servizio? (Whisper API / Google Speech-to-Text)
3. **Validazione**: Client-side o Server-side?
4. **Storage**: Context locale + Supabase sync?
5. **UI Flow**: Modal unico o pagine separate?

---

## 🚀 Cosa Voglio Fare

1. **Creare struttura dati TypeScript completa**
2. **Implementare form manuale multi-step** (più semplice, funziona subito)
3. **Creare componenti UI per inserimento**
4. **Aggiungere validazione**
5. **Integrare con RosaContext**

**Poi in seguito**:
- Screenshot processing (mock prima, reale dopo)
- Voice processing (mock prima, reale dopo)
- Backend Supabase

---

**Aspetto il tuo via per procedere!** 🎯
