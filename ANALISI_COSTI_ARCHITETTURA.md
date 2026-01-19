# ANALISI: Costi, Architettura e Intervento IA

**Data:** 2026-01-19  
**Obiettivo:** Valutare costi OpenAI, architettura query, e quando interviene l'IA

---

## 💰 COSTI OPENAI

### Costo Estrazione Singola Card (`/api/extract-player`)

**Modello:** `gpt-4o` (Vision API)

**Costo per chiamata:**
- Input: ~$0.005 per 1K tokens (immagine + prompt)
- Output: ~$0.015 per 1K tokens (risposta JSON)
- **Costo stimato per card singola:** ~$0.01 - $0.03 per foto

**Frequenza:**
- Cliente carica 1 foto card → 1 chiamata → ~$0.01 - $0.03

---

### Costo Estrazione Formazione (`/api/extract-formation` - NUOVA)

**Modello:** `gpt-4o` (Vision API)

**Problema:**
- Foto formazione completa contiene **11 giocatori** in una foto
- AI deve analizzare **tutta la foto** per estrarre tutti i 11

**Opzione A: Una Chiamata (Analisi Completa)**
- Input: Foto formazione completa (stessa dimensione di card singola)
- Prompt: "Estrai tutti gli 11 giocatori con posizione sul campo"
- Output: JSON con array di 11 giocatori
- **Costo stimato:** ~$0.01 - $0.05 per foto formazione

**Opzione B: 11 Chiamate Separate (Per Giocatore)**
- Analizza foto formazione 11 volte (una per giocatore)
- **Costo stimato:** ~$0.11 - $0.33 per foto formazione
- ⚠️ **Troppo costoso** - non consigliato

**Raccomandazione:** ✅ **Opzione A (Una Chiamata)**

**Costo per cliente:**
- Carica foto formazione → 1 chiamata → ~$0.01 - $0.05
- Poi completa profilazione → N chiamate (una per foto card dettagliata) → ~$0.01 - $0.03 per foto

---

### Analisi Costi Completi Workflow

**Scenario Cliente Tipo:**
1. **Carica Formazione:** 1 foto formazione → ~$0.01 - $0.05
2. **Profilazione Titolari:** 11 titolari × 3 foto (statistiche, abilità, booster) → 33 chiamate → ~$0.33 - $0.99
3. **Profilazione Riserve:** 12 riserve × 1 foto card → 12 chiamate → ~$0.12 - $0.36

**Costo Totale per Cliente:**
- Minimo: ~$0.46 (formazione + 11 titolari + 12 riserve)
- Massimo: ~$1.40 (formazione completa + profilazione dettagliata)

**Costo per Mese (Se Cliente Fa Cambi):**
- Cambia formazione: 1 foto formazione → ~$0.01 - $0.05
- Cambi formazione frequenti: 10 volte/mese → ~$0.10 - $0.50

**Conclusione:** ✅ **Costi ACCETTABILI** - ~$0.50 - $1.50 per cliente completo

---

## 🏗️ ARCHITETTURA: Query Dirette vs API Routes

### Operazioni READ (Query Dirette)

**Quando:**
- Lista giocatori (titolari/riserve)
- Dettagli giocatore singolo
- Filtri e ordinamenti

**Implementazione:**
```javascript
// Frontend - Query Diretta Supabase
const { data: titolari } = await supabase
  .from('players')
  .select('*')
  .gte('slot_index', 0)
  .lte('slot_index', 10)
  .order('slot_index', { ascending: true })
```

**Vantaggi:**
- ✅ Scalabile (RLS filtra automaticamente)
- ✅ Veloce (no server intermedio)
- ✅ Basso costo (no API routes)

**Sicurezza:**
- ✅ RLS protegge dati (`WHERE user_id = auth.uid()`)
- ✅ Frontend usa `anonKey` (pubblico ma sicuro con RLS)

---

### Operazioni WRITE con Logica Business (API Routes)

**Quando:**
- Salvataggio giocatore (lookup `playing_style_id`)
- Estrazione formazione (chiamata OpenAI)
- Swap formazione (validazione business logic)

**Implementazione:**
```javascript
// API Route - /api/supabase/save-player
// Usa serviceKey per lookup playing_style_id
```

**Vantaggi:**
- ✅ Logica business centralizzata
- ✅ Validazione server-side
- ✅ Accesso a `serviceKey` per lookup esterni

**Svantaggi:**
- ⚠️ Aggiunge latenza (round-trip server)
- ⚠️ Costo server (meno significativo)

---

### Operazioni UPDATE Semplici (Query Dirette o API?)

**Scenario: Swap Formazione**

**Opzione A: Query Diretta**
```javascript
// Frontend - Swap slot_index
const { data } = await supabase
  .from('players')
  .update({ slot_index: newIndex })
  .eq('id', playerId)
```

**Vantaggi:**
- ✅ Veloce (no server)
- ✅ Scalabile

**Svantaggi:**
- ⚠️ Logica swap nel frontend (2 update separati)
- ⚠️ Nessuna validazione server-side

**Opzione B: API Route**
```javascript
// API - /api/supabase/swap-formation
// Swap atomico (2 update in transazione)
```

**Vantaggi:**
- ✅ Logica centralizzata
- ✅ Validazione (max 11 titolari, ecc.)
- ✅ Atomico (transazione DB)

**Svantaggi:**
- ⚠️ Latenza aggiuntiva

**Raccomandazione:** ✅ **Opzione B (API Route)** - Per validazione e atomicità

---

## 🤖 QUANDO INTERVIENE L'IA?

### 1. **Estrazione Formazione (PRIMA FOTO)**

**Quando:**
- Cliente carica foto formazione completa
- **Intervento IA:** `POST /api/extract-formation`

**Cosa fa:**
- Analizza foto formazione
- Estrae 11 giocatori con `slot_index` (0-10)
- Estrae dati base (nome, posizione, rating, team)

**Frequenza:**
- 1 volta all'inizio
- Poi quando cliente fa cambi formazione (carica nuova foto formazione)

---

### 2. **Profilazione Card Singole (DOPO FORMAZIONE)**

**Quando:**
- Cliente clicca su card titolare/riserva
- Carica foto dettagliate (statistiche, abilità, booster)
- **Intervento IA:** `POST /api/extract-player` (già esistente)

**Cosa fa:**
- Analizza foto card singola
- Estrae dati specifici (statistiche, abilità, booster)
- Aggiorna record esistente

**Frequenza:**
- N volte (una per ogni foto dettagliata caricata)
- Es. 11 titolari × 3 foto = 33 chiamate
- Es. 12 riserve × 1 foto = 12 chiamate

---

### 3. **Consigli IA (FUTURO)**

**Quando:**
- Cliente chiede consigli sulla formazione
- **Intervento IA:** `POST /api/ai-coach` (da implementare)

**Cosa fa:**
- Analizza formazione corrente (titolari con `slot_index: 0-10`)
- Analizza statistiche giocatori
- Fornisce consigli strategici

**Input:**
- Titolari: `WHERE slot_index >= 0 AND slot_index <= 10`
- Riserve: `WHERE slot_index IS NULL`
- Statistiche giocatori

**Frequenza:**
- Su richiesta cliente (on-demand)

---

## 📊 RIEPILOGO ARCHITETTURA

### Query Dirette (Frontend)

```javascript
// ✅ READ - Lista giocatori
const { data: titolari } = await supabase
  .from('players')
  .select('*')
  .gte('slot_index', 0)
  .lte('slot_index', 10)

// ✅ READ - Riserve
const { data: riserve } = await supabase
  .from('players')
  .select('*')
  .is('slot_index', null)

// ✅ READ - Dettagli giocatore
const { data: player } = await supabase
  .from('players')
  .select('*')
  .eq('id', playerId)
  .single()
```

---

### API Routes (Backend)

```javascript
// ✅ WRITE - Salva giocatore (lookup playing_style_id)
POST /api/supabase/save-player

// ✅ WRITE - Estrazione formazione (chiamata OpenAI)
POST /api/extract-formation  // NUOVA

// ✅ WRITE - Estrazione card singola (chiamata OpenAI)
POST /api/extract-player  // ESISTENTE

// ✅ UPDATE - Swap formazione (validazione + atomicità)
PATCH /api/supabase/swap-formation  // NUOVA
```

---

## ✅ RACCOMANDAZIONI FINALI

### Costi:
- ✅ **Accettabili:** ~$0.50 - $1.50 per cliente completo
- ✅ **Scalabile:** Cliente paga solo per foto che carica
- ⚠️ **Monitora:** Usa rate limiting per prevenire abusi

### Architettura:
- ✅ **READ:** Query dirette Supabase con RLS (scalabile, veloce)
- ✅ **WRITE con Logica:** API Routes (validazione, business logic)
- ✅ **UPDATE Formazione:** API Route per atomicità e validazione

### Intervento IA:
1. **Estrazione Formazione:** 1 chiamata (quando carica foto formazione)
2. **Profilazione Card:** N chiamate (una per foto dettagliata)
3. **Consigli IA:** On-demand (futuro)

---

**Status:** ✅ **ARCHITETTURA OTTIMALE** - Costi accettabili, query dirette per READ, API routes per WRITE
