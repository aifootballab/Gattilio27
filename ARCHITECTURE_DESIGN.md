# 🏗️ Architettura Piattaforma eFootball AI Coach
## Documento di Progettazione Iniziale

**Versione**: 1.0.0  
**Data**: 2025-01-27  
**Status**: 🟡 Brainstorming / Design Phase

---

## 📋 Indice

1. [Visione e Principi Fondamentali](#visione-e-principi-fondamentali)
2. [Architettura Concettuale](#architettura-concettuale)
3. [Unified Match Context](#unified-match-context)
4. [Flusso Dati e Pipeline](#flusso-dati-e-pipeline)
5. [Struttura Dati](#struttura-dati)
6. [Componenti Frontend](#componenti-frontend)
7. [Componenti Backend](#componenti-backend)
8. [Punti di Riuso da Dota 2](#punti-di-riuso-da-dota-2)
9. [Criticità e Considerazioni](#criticità-e-considerazioni)
10. [Roadmap Implementazione](#roadmap-implementazione)

---

## 1. Visione e Principi Fondamentali

### 1.1 Modello Mentale

> **"Il cliente racconta la partita come farebbe con un coach umano"**

La piattaforma non è un tool tecnico, ma un **coach digitale multimodale** che:
- Ascolta e comprende il contesto (voce + immagine)
- Analizza in modo contestuale e intelligente
- Fornisce coaching personalizzato, non predizioni generiche
- Spiega le decisioni, non fornisce solo risposte secche

### 1.2 Principi di Coerenza (Obbligatori)

✅ **Stesso linguaggio di prodotto del progetto Dota 2**
- Coaching → non prediction pura
- Spiegazioni → non risposte secche
- UX orientata a: chiarezza, fiducia, percezione di valore premium

✅ **Nessuna logica hardcoded su eFootball**
- Tutto parametrico e adattabile
- Architettura estendibile ad altri giochi sportivi
- Configurazione basata su game-specific rules

---

## 2. Architettura Concettuale

### 2.1 Pattern Architetturale (da Dota 2)

```
┌─────────────────────────────────────────────────────────────┐
│                    INPUT LAYER                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Immagine   │  │     Voce     │  │  Metadata    │      │
│  │  (Screenshot)│  │ (Speech-to-  │  │  (User,      │      │
│  │              │  │    Text)     │  │   Match ID)  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼──────────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
          ┌──────────────────▼──────────────────┐
          │     NORMALIZATION LAYER              │
          │  ┌──────────────────────────────┐  │
          │  │  Image Context Extractor     │  │
          │  │  Voice Context Parser        │  │
          │  │  Metadata Enricher           │  │
          │  └──────────────┬───────────────┘  │
          └─────────────────┼──────────────────┘
                            │
          ┌─────────────────▼──────────────────┐
          │   UNIFIED MATCH CONTEXT             │
          │  ┌──────────────────────────────┐  │
          │  │  image_context               │  │
          │  │  voice_context               │  │
          │  │  derived_insights            │  │
          │  │  game_state                  │  │
          │  └──────────────┬───────────────┘  │
          └─────────────────┼──────────────────┘
                            │
          ┌─────────────────▼──────────────────┐
          │      ANALYSIS LAYER                 │
          │  ┌──────────────────────────────┐  │
          │  │  Context Fusion              │  │
          │  │  Tactical Analysis           │  │
          │  │  Player Performance Analysis │  │
          │  │  Recommendation Engine       │  │
          │  └──────────────┬───────────────┘  │
          └─────────────────┼──────────────────┘
                            │
          ┌─────────────────▼──────────────────┐
          │       OUTPUT LAYER                  │
          │  ┌──────────────────────────────┐  │
          │  │  Coaching Suggestions        │  │
          │  │  Tactical Recommendations    │  │
          │  │  Player Positioning Advice   │  │
          │  │  Strategic Insights          │  │
          │  └──────────────────────────────┘  │
          └────────────────────────────────────┘
```

### 2.2 Separazione delle Responsabilità

| Layer | Responsabilità | Tecnologie Proposte |
|-------|---------------|---------------------|
| **Input** | Raccolta e validazione input multimodale | React, Web Audio API, File Upload |
| **Normalization** | Estrazione e standardizzazione dati | Vision AI (OCR/Vision), Speech-to-Text API |
| **Unified Context** | Creazione contesto unificato | TypeScript, Supabase (storage) |
| **Analysis** | Analisi intelligente e coaching | LLM API (OpenAI/Anthropic), Game Rules Engine |
| **Output** | Presentazione risultati | React Components, Voice Synthesis (opzionale) |

---

## 3. Unified Match Context

### 3.1 Struttura Dati Core

```typescript
interface UnifiedMatchContext {
  // Identificatori
  id: string;                    // UUID del contesto
  user_id: string;               // ID utente (Supabase Auth)
  match_id?: string;             // ID partita eFootball (opzionale)
  timestamp: ISO8601;
  game_type: 'efootball';        // Estendibile: 'dota2', 'fifa', ecc.
  
  // Input Contexts
  image_context: ImageContext;
  voice_context: VoiceContext;
  
  // Derived Data
  derived_insights: DerivedInsights;
  game_state: GameState;
  
  // Metadata
  session_metadata: SessionMetadata;
}

interface ImageContext {
  image_id: string;              // ID storage Supabase
  image_url: string;              // URL pubblico
  image_type: 'screenshot' | 'formation' | 'stats' | 'result';
  
  // Estrazione dati visivi
  extracted_data: {
    // OCR / Vision AI results
    text_content?: string[];      // Testo estratto (es. statistiche)
    detected_players?: PlayerDetection[];
    detected_formation?: FormationData;
    detected_stats?: MatchStats;
    detected_score?: ScoreData;
  };
  
  // Metadata immagine
  metadata: {
    width: number;
    height: number;
    format: string;
    uploaded_at: ISO8601;
  };
}

interface VoiceContext {
  audio_id: string;              // ID storage Supabase
  audio_url: string;              // URL pubblico
  transcription: string;          // Speech-to-Text result
  
  // Analisi semantica
  semantic_analysis: {
    intent: string;               // "formation_question", "tactical_advice", ecc.
    entities: Entity[];           // Giocatori, tattiche, situazioni menzionate
    sentiment: 'positive' | 'neutral' | 'frustrated' | 'questioning';
    key_phrases: string[];        // Frasi chiave estratte
  };
  
  // Metadata audio
  metadata: {
    duration_seconds: number;
    language: string;             // Default: 'it'
    transcribed_at: ISO8601;
  };
}

interface DerivedInsights {
  // Fusion di image + voice
  fused_context: {
    primary_concern: string;      // Preoccupazione principale dell'utente
    match_situation: string;      // Situazione partita dedotta
    tactical_focus: string[];     // Aree tattiche su cui concentrarsi
  };
  
  // Analisi cross-modale
  cross_modal_validation: {
    consistency_score: number;    // 0-1: quanto image e voice sono coerenti
    contradictions?: string[];     // Eventuali contraddizioni rilevate
    complementary_info: string[]; // Info che si completano a vicenda
  };
}

interface GameState {
  // Stato partita dedotto
  phase: 'pre_match' | 'in_match' | 'post_match';
  current_score?: { home: number; away: number };
  possession?: { user: number; opponent: number };
  time_elapsed?: number;          // Minuti di gioco
  
  // Formazione e tattiche
  user_formation?: Formation;
  opponent_formation?: Formation;
  user_tactics?: Tactics;
  opponent_tactics?: Tactics;
  
  // Performance
  player_performances?: PlayerPerformance[];
  team_stats?: TeamStats;
}

interface SessionMetadata {
  subscription_tier: 'free' | 'elite' | 'premium';
  voice_minutes_remaining: number;
  session_start_time: ISO8601;
  previous_contexts?: string[];   // ID contesti precedenti (storia)
}
```

### 3.2 Estendibilità

La struttura è progettata per essere **game-agnostic**:

```typescript
// Configurazione per eFootball
const efootballConfig = {
  game_rules: {
    max_players: 11,
    formation_types: ['4-3-3', '4-4-2', '3-5-2', ...],
    tactical_styles: ['possession', 'counter_attack', 'wing_play', ...],
  },
  image_types: ['screenshot', 'formation', 'stats', 'result'],
  voice_intents: ['formation_question', 'tactical_advice', 'player_selection', ...],
};

// Configurazione per Dota 2 (esempio riuso futuro)
const dota2Config = {
  game_rules: {
    max_players: 5,
    roles: ['carry', 'mid', 'offlane', 'support', ...],
    strategies: ['push', 'teamfight', 'split_push', ...],
  },
  image_types: ['minimap', 'items', 'stats', 'replay'],
  voice_intents: ['draft_advice', 'item_build', 'positioning', ...],
};
```

---

## 4. Flusso Dati e Pipeline

### 4.1 User Journey Completo

```
1. UTENTE ACCEDE ALLA DASHBOARD
   ↓
2. SELEZIONA INPUT MODALITÀ
   ├─ "Carica Immagine" → Upload file
   └─ "Parla Ora" → Registrazione audio
   ↓
3. UPLOAD E STORAGE
   ├─ Immagine → Supabase Storage (bucket: 'match-images')
   └─ Audio → Supabase Storage (bucket: 'voice-recordings')
   ↓
4. PROCESSING PARALLELO
   ├─ Image Processing:
   │  ├─ OCR/Vision AI (estrazione testo)
   │  ├─ Object Detection (giocatori, formazioni)
   │  └─ Stats Parsing (se stats screen)
   │
   └─ Voice Processing:
      ├─ Speech-to-Text (transcription)
      └─ NLP Analysis (intent, entities, sentiment)
   ↓
5. CREAZIONE UNIFIED MATCH CONTEXT
   ├─ Fusion di image_context + voice_context
   ├─ Validazione cross-modale
   └─ Enrichment con game_state
   ↓
6. ANALISI E COACHING
   ├─ Context Fusion Engine
   ├─ Tactical Analysis
   ├─ Player Performance Analysis
   └─ Recommendation Generation
   ↓
7. OUTPUT E PRESENTAZIONE
   ├─ Coaching Suggestions (testo strutturato)
   ├─ Tactical Recommendations (formazioni, posizionamenti)
   ├─ Player Advice (sostituzioni, ruoli)
   └─ Strategic Insights (analisi post-match)
   ↓
8. PERSISTENZA
   ├─ Salvataggio UnifiedMatchContext in DB
   ├─ Storico sessioni utente
   └─ Analytics e miglioramento continuo
```

### 4.2 API Endpoints Proposti

```typescript
// Backend API Structure (Supabase Edge Functions o API Routes)

POST /api/context/create
  Body: { image_file?, audio_file?, metadata }
  Response: { context_id, upload_urls }

POST /api/context/process
  Body: { context_id }
  Response: { status: 'processing' | 'completed', unified_context }

POST /api/context/analyze
  Body: { context_id }
  Response: { coaching_suggestions, tactical_recommendations, ... }

GET /api/context/:id
  Response: UnifiedMatchContext completo

GET /api/user/contexts
  Query: { limit, offset, game_type }
  Response: { contexts: UnifiedMatchContext[], total }
```

---

## 5. Struttura Dati

### 5.1 Database Schema (Supabase)

```sql
-- Tabella principale: unified_match_contexts
CREATE TABLE unified_match_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id TEXT,
  game_type TEXT NOT NULL DEFAULT 'efootball',
  
  -- Image context
  image_id TEXT,
  image_url TEXT,
  image_type TEXT,
  image_extracted_data JSONB,
  
  -- Voice context
  audio_id TEXT,
  audio_url TEXT,
  transcription TEXT,
  voice_semantic_analysis JSONB,
  
  -- Derived insights
  derived_insights JSONB,
  game_state JSONB,
  
  -- Metadata
  session_metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX idx_contexts_user_id ON unified_match_contexts(user_id);
CREATE INDEX idx_contexts_game_type ON unified_match_contexts(game_type);
CREATE INDEX idx_contexts_created_at ON unified_match_contexts(created_at DESC);

-- Tabella: coaching_suggestions (output persistito)
CREATE TABLE coaching_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_id UUID REFERENCES unified_match_contexts(id) ON DELETE CASCADE,
  
  suggestion_type TEXT NOT NULL, -- 'tactical', 'formation', 'player', 'strategic'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  reasoning TEXT, -- Perché questa raccomandazione
  priority INTEGER DEFAULT 0, -- 0-10, più alto = più importante
  
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabella: user_sessions (tracking sessioni)
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_start TIMESTAMPTZ DEFAULT NOW(),
  session_end TIMESTAMPTZ,
  contexts_created INTEGER DEFAULT 0,
  voice_minutes_used DECIMAL(10,2) DEFAULT 0,
  subscription_tier TEXT DEFAULT 'free'
);
```

### 5.2 Storage Buckets (Supabase)

```
match-images/
  ├─ {user_id}/
  │  ├─ {context_id}/
  │  │  └─ image.{jpg|png|webp}

voice-recordings/
  ├─ {user_id}/
  │  ├─ {context_id}/
  │  │  └─ audio.{mp3|wav|webm}
```

---

## 6. Componenti Frontend

### 6.1 Struttura Directory Proposta

```
src/
├── components/
│   ├── dashboard/
│   │   ├── DashboardLayout.jsx
│   │   ├── UserProfile.jsx
│   │   └── SubscriptionBadge.jsx
│   │
│   ├── input/
│   │   ├── ImageUploader.jsx
│   │   ├── VoiceRecorder.jsx
│   │   └── InputSelector.jsx
│   │
│   ├── context/
│   │   ├── ContextViewer.jsx
│   │   ├── ImagePreview.jsx
│   │   ├── TranscriptionView.jsx
│   │   └── ContextFusionIndicator.jsx
│   │
│   ├── coaching/
│   │   ├── CoachingPanel.jsx
│   │   ├── TacticalRecommendations.jsx
│   │   ├── PlayerAdvice.jsx
│   │   ├── FormationSuggestions.jsx
│   │   └── StrategicInsights.jsx
│   │
│   ├── match-center/
│   │   ├── MatchCenter.jsx
│   │   ├── LiveStats.jsx
│   │   ├── PlayerFocus.jsx
│   │   └── TacticalPitch.jsx (3D pitch visualization)
│   │
│   └── shared/
│       ├── LoadingSpinner.jsx
│       ├── ErrorBoundary.jsx
│       └── ToastNotifications.jsx
│
├── hooks/
│   ├── useMatchContext.js
│   ├── useVoiceRecorder.js
│   ├── useImageUpload.js
│   └── useCoachingAnalysis.js
│
├── services/
│   ├── api/
│   │   ├── contextService.js
│   │   ├── coachingService.js
│   │   └── storageService.js
│   │
│   ├── ai/
│   │   ├── visionService.js
│   │   ├── speechService.js
│   │   └── analysisService.js
│   │
│   └── game/
│       ├── efootballRules.js
│       └── gameStateParser.js
│
├── utils/
│   ├── contextFusion.js
│   ├── dataNormalization.js
│   └── formatters.js
│
└── App.jsx
```

### 6.2 Componenti Chiave

#### `InputSelector.jsx`
- Permette selezione input: "Carica Immagine" o "Parla Ora"
- Gestisce upload paralleli
- Mostra progress per entrambi gli input

#### `ContextViewer.jsx`
- Visualizza Unified Match Context
- Mostra image_context e voice_context side-by-side
- Indica stato di processing (loading, completed, error)

#### `CoachingPanel.jsx`
- Presenta coaching suggestions in modo strutturato
- Priorità e categorizzazione
- Spiegazioni dettagliate (non solo risposte secche)

#### `TacticalPitch.jsx`
- Visualizzazione 3D del campo (come nell'immagine di riferimento)
- Mostra posizionamenti suggeriti
- Animazioni per movimenti tattici

---

## 7. Componenti Backend

### 7.1 Supabase Edge Functions

```
supabase/functions/
├── process-image/
│   └── index.ts
│       - OCR/Vision AI processing
│       - Object detection
│       - Stats parsing
│
├── process-voice/
│   └── index.ts
│       - Speech-to-Text
│       - NLP analysis
│       - Intent extraction
│
├── create-context/
│   └── index.ts
│       - Crea UnifiedMatchContext
│       - Fusion di image + voice
│       - Validazione cross-modale
│
├── analyze-context/
│   └── index.ts
│       - Coaching analysis
│       - Tactical recommendations
│       - Player advice generation
│
└── get-context/
    └── index.ts
        - Retrieve context by ID
        - User context history
```

### 7.2 Servizi Esterni Integrati

| Servizio | Uso | Alternativa |
|----------|-----|-------------|
| **Vision AI** | OCR, Object Detection | OpenAI Vision API / Google Cloud Vision |
| **Speech-to-Text** | Trascrizione audio | OpenAI Whisper / Google Speech-to-Text |
| **LLM** | Analisi e coaching | OpenAI GPT-4 / Anthropic Claude |
| **NLP** | Intent, entities | spaCy / OpenAI Embeddings |

---

## 8. Punti di Riuso da Dota 2

### 8.1 Pattern Architetturali

✅ **Separazione Input → Normalization → Analysis → Output**
- Pattern già validato in Dota 2
- Applicabile direttamente a eFootball

✅ **Unified Context Pattern**
- Struttura dati unificata per contesto partita
- Estendibile con `game_type` parameter

✅ **Coaching-first Approach**
- Non prediction pura, ma spiegazioni e consigli
- Linguaggio di prodotto coerente

### 8.2 Componenti Riusabili (da adattare)

| Componente Dota 2 | Adattamento eFootball | Note |
|-------------------|----------------------|------|
| Match Context Builder | ✅ Riusabile | Cambiare solo game rules |
| Analysis Engine | ✅ Riusabile | Parametrizzare per eFootball |
| Coaching Formatter | ✅ Riusabile | Stesso formato output |
| User Session Manager | ✅ Riusabile | Identico |
| Subscription System | ✅ Riusabile | Identico |

### 8.3 Differenze Chiave

| Aspetto | Dota 2 | eFootball |
|---------|--------|-----------|
| **Input primario** | Replay files, minimap | Screenshot, formazione |
| **Game rules** | 5v5, roles, items | 11v11, formations, tactics |
| **Tactical focus** | Draft, item builds | Formazioni, posizionamenti |
| **Visualization** | Minimap 2D | Pitch 3D |

---

## 9. Criticità e Considerazioni

### 9.1 Criticità Tecniche

🔴 **Alta Complessità: Vision AI per Screenshot**
- **Problema**: Estrazione dati da screenshot eFootball è complessa
  - Formazioni possono variare in layout
  - Statistiche in formati diversi
  - UI del gioco può cambiare con aggiornamenti
- **Soluzione**: 
  - Training dataset specifico per eFootball UI
  - Fallback a input manuale se OCR fallisce
  - Template matching per formati noti

🔴 **Costo API Esterni**
- **Problema**: Vision AI + Speech-to-Text + LLM = costi elevati
- **Soluzione**:
  - Caching intelligente (stesso screenshot = stesso risultato)
  - Batch processing quando possibile
  - Limiti per tier subscription (free: 5 analisi/mese)

🟡 **Latency Processing**
- **Problema**: Processing sequenziale può essere lento
- **Soluzione**:
  - Processing parallelo (image + voice simultanei)
  - Streaming results (mostra risultati parziali)
  - Background jobs per analisi pesanti

🟡 **Cross-modal Validation**
- **Problema**: Validare coerenza image + voice è complesso
- **Soluzione**:
  - Confidence scores per ogni modalità
  - Flagging contraddizioni evidenti
  - Chiedere conferma all'utente se incoerenze

### 9.2 Criticità UX

🟡 **Onboarding Input Multimodale**
- **Problema**: Utenti potrebbero non capire come usare immagine + voce insieme
- **Soluzione**:
  - Tutorial interattivo al primo accesso
  - Esempi concreti ("Carica screenshot formazione + descrivi problema")
  - UI chiara con tooltips

🟡 **Percezione Valore Premium**
- **Problema**: Distinguersi da tool generici
- **Soluzione**:
  - Design premium (come nell'immagine di riferimento)
  - Spiegazioni dettagliate (non solo output)
  - Personalizzazione basata su storico utente

### 9.3 Considerazioni Strategiche

✅ **Estendibilità Futura**
- Architettura già progettata per multi-game
- Configurazione game-specific in database
- API generiche, implementazione specifica

✅ **Scalabilità**
- Supabase Edge Functions scalano automaticamente
- Storage Supabase per immagini/audio
- Database relazionale per contesti e storico

✅ **Privacy e Sicurezza**
- RLS (Row Level Security) su Supabase
- Audio/immagini privati per utente
- Nessun dato condiviso tra utenti

---

## 10. Roadmap Implementazione

### Fase 1: Foundation (Settimane 1-2)
- [ ] Setup database schema (Supabase)
- [ ] Creazione storage buckets
- [ ] Base frontend: Dashboard + Input Selector
- [ ] Integrazione Supabase Auth

### Fase 2: Input Processing (Settimane 3-4)
- [ ] Image Upload component
- [ ] Voice Recorder component
- [ ] Supabase Storage integration
- [ ] Basic image/audio validation

### Fase 3: Processing Pipeline (Settimane 5-6)
- [ ] Edge Function: process-image (OCR/Vision)
- [ ] Edge Function: process-voice (Speech-to-Text)
- [ ] Edge Function: create-context (Fusion)
- [ ] Testing con dati reali

### Fase 4: Analysis Engine (Settimane 7-8)
- [ ] Edge Function: analyze-context
- [ ] LLM integration per coaching
- [ ] Tactical analysis logic
- [ ] Player performance analysis

### Fase 5: Output & UX (Settimane 9-10)
- [ ] CoachingPanel component
- [ ] TacticalPitch visualization
- [ ] Formation suggestions UI
- [ ] Strategic insights display

### Fase 6: Polish & Optimization (Settimane 11-12)
- [ ] Performance optimization
- [ ] Error handling completo
- [ ] Loading states e feedback
- [ ] Mobile responsiveness

### Fase 7: Testing & Launch (Settimane 13-14)
- [ ] Testing end-to-end
- [ ] User acceptance testing
- [ ] Bug fixes
- [ ] Production deployment

---

## 11. Domande Aperte per Discussione

1. **Vision AI**: Quale servizio preferisci? (OpenAI Vision, Google Cloud Vision, altro?)
2. **Speech-to-Text**: Preferisci Whisper (OpenAI) o servizio alternativo?
3. **LLM per Coaching**: GPT-4, Claude, o modello fine-tunato?
4. **Pricing Model**: Come strutturare i tier subscription? (free/elite/premium)
5. **Real-time vs Batch**: Processing in tempo reale o background jobs?
6. **3D Pitch Visualization**: Libreria preferita? (Three.js, React Three Fiber, altro?)

---

## 12. Next Steps

**Immediati**:
1. ✅ Review di questo documento
2. ⏳ Decisioni su domande aperte (sezione 11)
3. ⏳ Conferma architettura proposta
4. ⏳ Setup iniziale branch GitHub

**Dopo Approvazione**:
1. Creazione branch `feature/multimodal-coaching`
2. Setup database schema
3. Implementazione Fase 1 (Foundation)

---

**Documento creato da**: Cursor AI  
**Per**: Progetto eFootball AI Coach  
**Basato su**: Pattern architetturali Dota 2 + Requisiti multimodali

---

*Questo documento è un living document e verrà aggiornato durante lo sviluppo.*
