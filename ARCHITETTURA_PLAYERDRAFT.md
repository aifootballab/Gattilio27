# Architettura PlayerDraft - Spiegazione Dettagliata

## 🎯 PROBLEMA ATTUALE

### Scenario Reale:
L'utente carica 3 screenshot di Ronaldinho:
- **Foto 1**: Stats dettagliate (attacking, defending, athleticism)
- **Foto 2**: Skills e AI Playstyles
- **Foto 3**: Boosters

### Cosa Succede Oggi:
1. Tutte e 3 le foto vengono inviate insieme all'AI
2. L'AI cerca di fare merge di TUTTO in un unico passaggio
3. **RISULTATO**: Spesso l'AI perde informazioni o fa merge sbagliato
4. L'utente non sa quali foto hanno contribuito a cosa

### Problemi Specifici:
- ❌ Se l'AI non vede bene una skill nella foto 2, viene persa
- ❌ Se la foto 3 ha un booster diverso, può sovrascrivere quello della foto 1
- ❌ Nessun feedback su "quale foto ha dato cosa"
- ❌ Se due foto hanno nomi leggermente diversi, vengono trattate come giocatori diversi

---

## ✅ SOLUZIONE: PlayerDraft con Merge Progressivo

### Concetto Base:
Invece di processare tutto insieme, processiamo **UNA FOTO ALLA VOLTA** e facciamo merge progressivo.

### Flusso Dettagliato:

#### STEP 1: Upload e Classificazione Iniziale
```
Utente carica 3 foto → [Foto1, Foto2, Foto3]
↓
Classificazione rapida (come ora):
- Foto1 → "Ronaldinho" (screen_type: "stats")
- Foto2 → "Ronaldinho" (screen_type: "skills")  
- Foto3 → "Ronaldinho" (screen_type: "boosters")
↓
Raggruppamento: Tutte e 3 → Gruppo "Ronaldinho"
```

#### STEP 2: Processing Sequenziale (NUOVO)
```
Per ogni foto nel gruppo, UNA ALLA VOLTA:

Foto1 (stats):
  → Estrai SOLO stats
  → PlayerDraft.identity = { player_name: "Ronaldinho", ... }
  → PlayerDraft.stats = { attacking: {...}, defending: {...}, ... }
  → UI mostra: "Identity ✓ | Stats ✓ | Skills ✗ | Boosters ✗"

Foto2 (skills):
  → Estrai SOLO skills
  → PlayerDraft.skills = { skills: [...], com_skills: [...], ai_playstyles: [...] }
  → UI mostra: "Identity ✓ | Stats ✓ | Skills ✓ | Boosters ✗"

Foto3 (boosters):
  → Estrai SOLO boosters
  → PlayerDraft.boosters = [{ name: "...", effect: "..." }]
  → UI mostra: "Identity ✓ | Stats ✓ | Skills ✓ | Boosters ✓"
```

#### STEP 3: Merge Progressivo (Frontend)
```javascript
// Esempio concreto di merge

// Dopo Foto1:
playerDraft = {
  identity: { player_name: "Ronaldinho", position: "AMF", overall_rating: 98 },
  stats: { attacking: { finishing: 95, ... }, ... },
  skills: null,
  boosters: null
}

// Dopo Foto2:
playerDraft = {
  identity: { player_name: "Ronaldinho", position: "AMF", overall_rating: 98 }, // invariato
  stats: { attacking: { finishing: 95, ... }, ... }, // invariato
  skills: { 
    skills: ["Elastico", "Doppio tocco", "Tiro a giro"], // merge array
    com_skills: ["Passaggio filtrante"],
    ai_playstyles: ["Funambolo", "Serpentina"]
  },
  boosters: null
}

// Dopo Foto3:
playerDraft = {
  identity: { player_name: "Ronaldinho", position: "AMF", overall_rating: 98 },
  stats: { attacking: { finishing: 95, ... }, ... },
  skills: { skills: [...], ... },
  boosters: [
    { name: "Fantasista", effect: "+5 Dribbling", activation_condition: "..." }
  ]
}
```

---

## 🏗️ ARCHITETTURA TECNICA

### 1. Nuovo Endpoint: `/api/extract-section`

**Input:**
```json
{
  "imageDataUrl": "data:image/jpeg;base64,...",
  "expectedSection": "stats" | "skills" | "boosters" | "identity" | "auto"
}
```

**Output:**
```json
{
  "section": "stats",  // quale sezione è stata estratta
  "data": {
    // Solo i dati di quella sezione
    "attacking": { "finishing": 95, ... },
    "defending": { ... },
    "athleticism": { ... }
  },
  "identity": {  // sempre presente per validazione
    "player_name": "Ronaldinho",
    "position": "AMF",
    "overall_rating": 98
  },
  "confidence": 0.95,
  "missing": ["defending.aggression"]  // campi non visibili
}
```

**Vantaggi:**
- ✅ Processing sequenziale garantito (1 foto alla volta)
- ✅ Output più piccolo e preciso
- ✅ L'AI si concentra su UNA cosa alla volta

### 2. Frontend: PlayerDraft State

```javascript
// Struttura dati
const [playerDrafts, setPlayerDrafts] = useState({
  "ronaldinho-123": {  // key: player_id (normalizzato)
    player_id: "ronaldinho-123",
    
    // Sezioni
    identity: {
      player_name: "Ronaldinho",
      position: "AMF",
      overall_rating: 98,
      card_type: "Legend",
      team: "Barcellona",
      // ...
    } | null,
    
    stats: {
      attacking: { finishing: 95, ... },
      defending: { ... },
      athleticism: { ... }
    } | null,
    
    skills: {
      skills: ["Elastico", ...],
      com_skills: ["Passaggio filtrante"],
      ai_playstyles: ["Funambolo"]
    } | null,
    
    boosters: [
      { name: "Fantasista", effect: "...", activation_condition: "..." }
    ] | null,
    
    // Metadata
    completeness: {
      identity: true,   // ✓
      stats: true,      // ✓
      skills: true,     // ✓
      boosters: true    // ✓
    },
    
    // Conflitti (se due foto hanno identity diverse)
    conflicts: {
      identity: [
        { source: "foto1", data: { player_name: "Ronaldinho", position: "AMF" } },
        { source: "foto2", data: { player_name: "Ronaldinho", position: "CF" } }
      ]
    },
    
    // Tracciamento
    processedImages: ["foto1-id", "foto2-id", "foto3-id"],
    processingQueue: []  // immagini ancora da processare
  }
})
```

### 3. Merge Logic (Frontend)

```javascript
function mergeSection(playerDraft, newSection, sectionType) {
  switch(sectionType) {
    case 'identity':
      // Se c'è conflitto, salva in conflicts
      if (playerDraft.identity && 
          playerDraft.identity.player_name !== newSection.player_name) {
        playerDraft.conflicts.identity.push(newSection)
        return playerDraft // non merge, aspetta risoluzione utente
      }
      // Merge: usa il più completo
      playerDraft.identity = {
        ...playerDraft.identity,
        ...newSection  // sovrascrive solo campi presenti
      }
      break
      
    case 'stats':
      // Merge numerico: sovrascrive solo se nuovo valore è presente
      playerDraft.stats = {
        attacking: {
          ...(playerDraft.stats?.attacking || {}),
          ...newSection.attacking
        },
        defending: {
          ...(playerDraft.stats?.defending || {}),
          ...newSection.defending
        },
        athleticism: {
          ...(playerDraft.stats?.athleticism || {}),
          ...newSection.athleticism
        }
      }
      break
      
    case 'skills':
      // Merge array con dedup
      playerDraft.skills = {
        skills: dedupArray([
          ...(playerDraft.skills?.skills || []),
          ...(newSection.skills || [])
        ]),
        com_skills: dedupArray([
          ...(playerDraft.skills?.com_skills || []),
          ...(newSection.com_skills || [])
        ]),
        ai_playstyles: dedupArray([
          ...(playerDraft.skills?.ai_playstyles || []),
          ...(newSection.ai_playstyles || [])
        ])
      }
      break
      
    case 'boosters':
      // Merge array con dedup (max 2)
      const merged = dedupArray([
        ...(playerDraft.boosters || []),
        ...(newSection.boosters || [])
      ])
      playerDraft.boosters = merged.slice(0, 2)
      break
  }
  
  // Aggiorna completeness
  playerDraft.completeness = {
    identity: !!playerDraft.identity,
    stats: !!playerDraft.stats,
    skills: !!playerDraft.skills,
    boosters: !!playerDraft.boosters && playerDraft.boosters.length > 0
  }
  
  return playerDraft
}
```

### 4. UI Completeness

```jsx
// Componente visualizzazione progresso
function PlayerDraftCard({ draft }) {
  return (
    <div>
      <h3>{draft.identity?.player_name || "Giocatore sconosciuto"}</h3>
      
      {/* Badge completeness */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <Badge status={draft.completeness.identity}>
          Identity {draft.completeness.identity ? '✓' : '✗'}
        </Badge>
        <Badge status={draft.completeness.stats}>
          Stats {draft.completeness.stats ? '✓' : '✗'}
        </Badge>
        <Badge status={draft.completeness.skills}>
          Skills {draft.completeness.skills ? '✓' : '✗'}
        </Badge>
        <Badge status={draft.completeness.boosters}>
          Boosters {draft.completeness.boosters ? '✓' : '✗'}
        </Badge>
      </div>
      
      {/* Progress bar */}
      <ProgressBar 
        value={Object.values(draft.completeness).filter(Boolean).length}
        max={4}
      />
      
      {/* Conflitti */}
      {draft.conflicts.identity.length > 0 && (
        <ConflictResolver 
          conflicts={draft.conflicts.identity}
          onResolve={(resolved) => {
            // Utente sceglie quale identity usare
            draft.identity = resolved
            draft.conflicts.identity = []
          }}
        />
      )}
      
      {/* Salvataggio */}
      <button 
        disabled={!canSave(draft)}
        onClick={() => savePlayerDraft(draft)}
      >
        Salva Giocatore
      </button>
    </div>
  )
}

function canSave(draft) {
  // Regola: identity + (stats OR skills)
  return draft.completeness.identity && 
         (draft.completeness.stats || draft.completeness.skills)
}
```

---

## 🔄 FLUSSO COMPLETO (Esempio Reale)

### Scenario: Utente carica 3 foto di Ronaldinho

#### Fase 1: Upload
```
Utente: [Drag & Drop 3 foto]
↓
Frontend: images = [
  { id: "img1", dataUrl: "...", file: File1 },
  { id: "img2", dataUrl: "...", file: File2 },
  { id: "img3", dataUrl: "...", file: File3 }
]
```

#### Fase 2: Classificazione Rapida (come ora)
```
POST /api/extract-batch (solo classificazione)
↓
Response: {
  groups: [{
    group_id: "g1",
    label: "Ronaldinho",
    image_ids: ["img1", "img2", "img3"]
  }]
}
↓
Frontend: Crea PlayerDraft
playerDrafts["ronaldinho-123"] = {
  player_id: "ronaldinho-123",
  identity: null,
  stats: null,
  skills: null,
  boosters: null,
  completeness: { identity: false, stats: false, skills: false, boosters: false },
  conflicts: { identity: [] },
  processedImages: [],
  processingQueue: ["img1", "img2", "img3"]
}
```

#### Fase 3: Processing Sequenziale
```
// Loop sequenziale (await)
for (const imageId of processingQueue) {
  // 1. Estrai sezione
  const result = await fetch('/api/extract-section', {
    method: 'POST',
    body: JSON.stringify({
      imageDataUrl: images.find(i => i.id === imageId).dataUrl,
      expectedSection: "auto"  // AI decide automaticamente
    })
  })
  
  const { section, data, identity } = await result.json()
  
  // 2. Merge progressivo
  setPlayerDrafts(prev => {
    const draft = prev["ronaldinho-123"]
    const merged = mergeSection(draft, data, section)
    merged.processedImages.push(imageId)
    return { ...prev, "ronaldinho-123": merged }
  })
  
  // 3. UI si aggiorna automaticamente
  // "Identity ✓ | Stats ✓ | Skills ✗ | Boosters ✗"
}

// Dopo tutte le foto:
// "Identity ✓ | Stats ✓ | Skills ✓ | Boosters ✓"
```

#### Fase 4: Salvataggio
```
Utente clicca "Salva Giocatore"
↓
Frontend: Converte PlayerDraft → formato save-player
const playerPayload = {
  player_name: draft.identity.player_name,
  position: draft.identity.position,
  base_stats: draft.stats,
  skills: draft.skills.skills,
  com_skills: draft.skills.com_skills,
  ai_playstyles: draft.skills.ai_playstyles,
  boosters: draft.boosters,
  // ...
}
↓
POST /api/supabase/save-player
↓
✅ Giocatore salvato con TUTTE le informazioni
```

---

## 🎨 UI/UX

### Visualizzazione PlayerDraft

```
┌─────────────────────────────────────────┐
│ Ronaldinho                               │
│ ───────────────────────────────────────  │
│                                          │
│ [Identity ✓] [Stats ✓] [Skills ✓] [Boosters ✓] │
│ ████████████████████████░░░░ 3/4         │
│                                          │
│ 📊 Stats:                                │
│   Attacking: 95, 89, 90, ...            │
│   Defending: 49, 68, ...                │
│                                          │
│ 🎯 Skills:                               │
│   Elastico, Doppio tocco, Tiro a giro   │
│                                          │
│ ⚡ Boosters:                             │
│   Fantasista (+5 Dribbling)             │
│                                          │
│ [Salva Giocatore]                       │
└─────────────────────────────────────────┘
```

### Durante Processing

```
┌─────────────────────────────────────────┐
│ Ronaldinho                               │
│ ───────────────────────────────────────  │
│                                          │
│ [Identity ✓] [Stats ✓] [Skills ✗] [Boosters ✗] │
│ ████████████░░░░░░░░░░ 2/4               │
│                                          │
│ ⏳ Processando foto 2/3...               │
│ [████████░░░░░░░░] 66%                   │
│                                          │
│ 📊 Stats: ✓ Completo                    │
│ 🎯 Skills: ⏳ In elaborazione...        │
│ ⚡ Boosters: ⏳ In attesa...              │
│                                          │
│ [Salva Giocatore] (disabilitato)        │
└─────────────────────────────────────────┘
```

---

## 🔒 HARDENING

### 1. API Sempre JSON Valido
```javascript
// /api/extract-section
export async function POST(req) {
  try {
    // ... processing ...
    
    // SEMPRE restituisci JSON valido
    return NextResponse.json({
      section: section || "unknown",
      data: data || {},
      identity: identity || null,
      confidence: confidence || 0,
      error: null
    })
  } catch (err) {
    // Anche in caso di errore, JSON valido
    return NextResponse.json({
      section: "error",
      data: {},
      identity: null,
      confidence: 0,
      error: err.message || "Unknown error"
    }, { status: 500 })
  }
}
```

### 2. Frontend Safe Parsing
```javascript
// Mai fare JSON.parse su body vuoto
const handleResponse = async (res) => {
  if (!res.ok) {
    const text = await res.text()
    return { error: text || "Unknown error" }
  }
  
  const text = await res.text()
  if (!text || text.trim() === '') {
    return { error: "Empty response" }
  }
  
  try {
    return JSON.parse(text)
  } catch (err) {
    return { error: "Invalid JSON", raw: text }
  }
}
```

---

## 📊 VANTAGGI vs APPROCCIO ATTUALE

| Aspetto | Attuale | PlayerDraft |
|---------|---------|-------------|
| **Processing** | Parallelo (tutto insieme) | Sequenziale (1 alla volta) |
| **Merge** | AI fa tutto | Frontend controlla merge |
| **Feedback** | Nessuno | Progresso in tempo reale |
| **Conflitti** | Ignorati | Gestiti con UI |
| **Completeness** | Sconosciuta | Visibile (0-4 sezioni) |
| **Perdita dati** | Possibile | Minimizzata |
| **Debug** | Difficile | Tracciabile (quale foto = quale dato) |

---

## ❓ DOMANDE APERTE

1. **Raggruppamento**: Mantenere classificazione iniziale o fare tutto sequenziale?
   - **Raccomandazione**: Mantenere classificazione iniziale (più veloce), poi sequenziale

2. **Conflitti Identity**: Modal UI o auto-merge?
   - **Raccomandazione**: Auto-merge con confidence, UI solo se conflitto forte

3. **Compatibilità**: Sostituire batch o mantenere entrambi?
   - **Raccomandazione**: Sostituire gradualmente, batch come fallback

4. **Performance**: Processing sequenziale è più lento?
   - **Risposta**: Sì, ma più accurato. Possiamo parallelizzare classificazione iniziale

---

## 🚀 IMPLEMENTAZIONE

### Fasi:
1. ✅ Creare `/api/extract-section` endpoint
2. ✅ Implementare PlayerDraft state management
3. ✅ Implementare merge logic
4. ✅ Creare UI completeness
5. ✅ Gestione conflitti
6. ✅ Testing con 2-3 foto reali

### Tempo stimato: 4-6 ore

---

## 💡 CONCLUSIONE

**PlayerDraft** risolve il problema principale: **perdita di informazioni durante il merge**.

Con processing sequenziale e merge progressivo, ogni foto contribuisce in modo tracciabile e l'utente vede esattamente cosa manca.
