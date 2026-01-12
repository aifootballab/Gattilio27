# 🎯 Flusso Profilazione Rosa - Analisi e Ristrutturazione

## 📸 Cosa ho capito dagli screenshot

### Dati disponibili da screenshot profilo giocatore:
- **Identificazione**: Nome giocatore, Overall Rating (es. 98), Posizione (es. DC)
- **Card Info**: Tipo carta (Epico), Team/Era (FC Bayern München 73-74)
- **Statistiche Match**: Partite giocate, Gol, Assist
- **Statistiche Dettagliate**:
  - **Attacco**: Comportamento offensivo, Controllo palla, Dribbling, Passaggi, Finalizzazione, ecc.
  - **Difesa**: Comportamento difensivo, Contrasto, Aggressività, Coinvolgimento difensivo
  - **Forza**: Velocità, Accelerazione, Potenza tiro, Salto, Contatto fisico, Resistenza
  - **Caratteristiche**: Piede debole, Forma, Resistenza infortuni
- **Abilità Speciali**: Lancio lungo, Esterno a giro, Marcatore, Intercettazione, ecc.
- **Visualizzazioni**: Radar chart (6 attributi principali), Mini-pitch (posizioni)
- **AI Playstyles**: Stili di gioco IA (es. "Esperto palle lunghe", "Tiratore")

### Dati disponibili da efootballhub.net:
- Database completo giocatori eFootball
- Statistiche aggiornate
- Tier lists
- Confronto giocatori
- Formazioni suggerite

---

## 🔄 Flusso Reale Utente (da Cliente a Coach)

### FASE 1: CREAZIONE/PROFILAZIONE ROSA

```
┌─────────────────────────────────────────────────────────┐
│  UTENTE: "Voglio analizzare la mia rosa"                │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  MODALITÀ INSERIMENTO │
        └───────────────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
        ▼           ▼           ▼
    ┌──────┐   ┌────────┐  ┌──────────┐
    │ VOCE │   │SCREENSHOT│ │PRECOMPILATO│
    └──┬───┘   └────┬───┘  └─────┬─────┘
       │            │            │
       │            │            │
       │  "Ho Ronaldinho,        │  Import da
       │   Mbappé, Thuram..."    │  efootballhub
       │                         │
       │            │            │
       │            ▼            │
       │    ┌──────────────┐    │
       │    │ Vision AI    │    │
       │    │ OCR + Parsing │    │
       │    └──────┬───────┘    │
       │           │            │
       └───────────┼────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │  ROSA NORMALIZZATA   │
        │  (Squadra completa)  │
        └──────────────────────┘
```

### FASE 2: ANALISI ROSA

```
┌─────────────────────────────────────────────────────────┐
│  ROSA NORMALIZZATA                                       │
│  - 11 giocatori identificati                            │
│  - Statistiche complete per ogni giocatore              │
│  - Posizioni e ruoli                                    │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  ANALISI AUTOMATICA   │
        │  - Punti di forza     │
        │  - Punti deboli       │
        │  - Formazioni possibili│
        │  - Sinergie giocatori │
        └───────────────────────┘
```

### FASE 3: INTERAZIONE COACHING

```
┌─────────────────────────────────────────────────────────┐
│  UTENTE: "Non so se mettere Thuram o Ronaldinho"        │
│  OPPURE                                                   │
│  UTENTE: "Ho sofferto sulle fasce" + Screenshot partita │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  CONTESTO MULTIMODALE │
        │  - Rosa esistente     │
        │  - Voce (domanda)     │
        │  - Screenshot (opz.)  │
        └───────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  COACHING PERSONALIZZATO│
        │  - Suggerimenti       │
        │  - Spiegazioni        │
        │  - Tattiche           │
        └───────────────────────┘
```

---

## 🎯 Punti Chiave Capiti

### ✅ 1. ROSA è il Punto di Partenza
- **NON** partiamo da "match context" generico
- **PARTIAMO** da "squadra/rosa" che l'utente ha
- La rosa diventa il **contesto persistente** della sessione

### ✅ 2. Tre Modalità di Inserimento Rosa

#### A) **VOICE INPUT** (Dettatura)
```
Utente: "Ho Ronaldinho come trequartista, Mbappé in attacco, 
        Thuram ala sinistra, Beckenbauer in difesa..."
```
- **Processing**: Speech-to-Text → NLP (entity extraction) → Player matching
- **Sfida**: Nomi giocatori possono essere pronunciati male
- **Soluzione**: Fuzzy matching con database efootballhub

#### B) **SCREENSHOT INPUT** (Caricamento)
```
Utente: Carica screenshot profilo giocatore (come quelli visti)
```
- **Processing**: Vision AI → OCR → Parsing strutturato
- **Sfida**: Estrazione dati da UI eFootball (varia con aggiornamenti)
- **Soluzione**: Template matching + OCR per campi specifici

#### C) **PRECOMPILATO** (Import Database)
```
Utente: Seleziona da efootballhub.net o importa formazione
```
- **Processing**: API call o scraping (se disponibile) → Import diretto
- **Sfida**: efootballhub potrebbe non avere API pubblica
- **Soluzione**: Scraping controllato o database locale sincronizzato

### ✅ 3. Rosa come "Living Context"
- La rosa **non è statica**
- L'utente può:
  - Modificare giocatori
  - Chiedere consigli su sostituzioni
  - Confrontare alternative
  - Analizzare formazioni diverse

### ✅ 4. Coaching Basato su Rosa
- Tutte le domande/analisi partono dalla rosa esistente
- Esempi:
  - "Dovrei mettere Thuram o Ronaldinho?" → Analisi rosa attuale + confronto
  - "Ho sofferto sulle fasce" → Analisi rosa + identificazione problema
  - "Quale formazione mi consigli?" → Analisi rosa + suggerimenti tattici

---

## 🔧 Ristrutturazione Architettura Necessaria

### Cambiamento Concettuale:

**PRIMA** (sbagliato):
```
Match Context → Analysis → Coaching
```

**DOPO** (corretto):
```
Rosa Profiling → Rosa Context → Coaching Interactions
```

### Nuova Struttura Dati:

```typescript
// ROSA è l'entità centrale
interface SquadRoster {
  id: string;
  user_id: string;
  name?: string; // "La mia squadra principale"
  created_at: ISO8601;
  updated_at: ISO8601;
  
  // Giocatori nella rosa
  players: RosterPlayer[];
  
  // Formazioni possibili con questa rosa
  possible_formations: Formation[];
  
  // Analisi automatica
  squad_analysis: SquadAnalysis;
}

interface RosterPlayer {
  player_id: string; // ID da efootballhub o generato
  player_name: string;
  overall_rating: number;
  position: string; // "DC", "CMF", "CF", ecc.
  
  // Statistiche complete (da screenshot o DB)
  stats: PlayerStats;
  
  // Abilità speciali
  special_skills: string[];
  
  // AI Playstyles
  ai_playstyles: string[];
  
  // Source: come è stato aggiunto
  source: 'voice' | 'screenshot' | 'database' | 'manual';
  source_data?: {
    screenshot_id?: string;
    transcription?: string;
    confidence?: number;
  };
}

interface SquadAnalysis {
  strengths: string[];
  weaknesses: string[];
  recommended_formations: Formation[];
  player_synergies: PlayerSynergy[];
  tactical_suggestions: string[];
}
```

---

## ❓ Domande per Conferma

1. **Rosa Multipla?**
   - Un utente può avere più rose diverse?
   - Es: "Rosa principale", "Rosa alternativa", "Rosa per tornei"

2. **Aggiornamento Rosa?**
   - L'utente può modificare la rosa nel tempo?
   - Come gestiamo le modifiche? (Versioning?)

3. **Integrazione efootballhub:**
   - Hanno API pubblica o dobbiamo fare scraping?
   - Possiamo usare i loro dati per validare/matchare giocatori?

4. **Screenshot Multipli:**
   - L'utente carica uno screenshot per giocatore?
   - O uno screenshot con più giocatori visibili?

5. **Validazione Rosa:**
   - Come verifichiamo che la rosa sia "valida" (11 giocatori, posizioni corrette)?
   - Cosa facciamo se mancano giocatori o ci sono errori?

---

## 🎯 Prossimi Passi

1. ✅ **Conferma comprensione** (questo documento)
2. ⏳ **Ristrutturazione ARCHITECTURE_DESIGN.md** con Rosa al centro
3. ⏳ **Definizione dettagliata** delle 3 modalità di inserimento
4. ⏳ **Schema database** aggiornato (rosa come entità principale)
5. ⏳ **Flusso UX** completo: da creazione rosa a coaching

---

**Status**: 🟡 In attesa di conferma comprensione prima di procedere
