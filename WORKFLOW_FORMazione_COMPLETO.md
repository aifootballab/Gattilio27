# WORKFLOW FORMAZIONE: Da Foto Formazione a Riserve

**Data:** Gennaio 2025  
**Obiettivo:** Workflow completo da foto formazione iniziale a gestione riserve  
**Status**: Documento storico - Workflow implementato e funzionante

---

## 🎯 WORKFLOW DEFINITO DALL'UTENTE

### Step 1: Foto Formazione Completa (PRIMA FOTO)

**Cosa carica il cliente:**
- **Foto schermo formazione completa** (come nell'immagine)
- Mostra 11 giocatori sul campo (campo verde con formazione 4-2-1-3)

**Cosa fa il sistema:**
1. AI analizza foto formazione → Estrae tutti gli 11 giocatori
2. **Per ogni giocatore sul campo:**
   - Estrae `player_name`, `position`, `overall_rating`, `team`, ecc.
   - **Estrae `slot_index` dalla posizione sul campo** (0-10)
   - Crea record con `slot_index: 0-10` → **TITOLARI**

**Risultato:**
- 11 giocatori creati con `slot_index: 0-10` (titolari)
- Dati base estratti (nome, posizione, rating)

---

### Step 2: Profilazione Card Singole (CLIENTE CLICCA SU CARD)

**Cosa fa il cliente:**
- Clic su card titolare → Upload foto dettagliate
- Carica foto: **Statistiche**, **Abilità**, **Booster**
- Completa profilazione per quel giocatore

**Cosa fa il sistema:**
- Per ogni foto caricata → Estrae dati specifici
- Aggiorna record esistente con dati completi
- Aggiorna `photo_slots`: `{ statistiche: true, abilita: true, booster: true }`

**Risultato:**
- Titolari con profilazione completa (foto + dati)

---

### Step 3: Caricamento Riserve (SEZIONE SOTTO)

**Cosa fa il cliente:**
- Vede sezione "Riserve" (12 slot)
- Carica foto card singole di altri giocatori
- Questi **NON sono sul campo** → Sono riserve

**Cosa fa il sistema:**
- Crea record per ogni riserva caricata
- **`slot_index: null`** (non in formazione) → **RISERVA**
- Cliente può completare profilazione (foto statistiche, abilità, booster)

**Risultato:**
- Riserve con `slot_index: null` (non in formazione)
- Profilazione completa (come titolari)

---

### Step 4: Gestione Formazione (DRAG & DROP)

**Cosa fa il cliente:**
- Vede lista titolari (11) + riserve (tutte)
- Trascina riserva → Sostituisce titolare
- Sistema swap automatico

**Cosa fa il sistema:**
- **Swap `slot_index`:**
  - Vecchio Titolare: `slot_index: null` (diventa riserva)
  - Nuova Riserva: `slot_index: 0-10` (diventa titolare)

**Risultato:**
- Formazione aggiornata
- IA sa chi è titolare OGGI (`slot_index: 0-10`)

---

## 📊 STRUTTURA DATI DEFINITIVA

### Categorie Giocatori:

**1. Titolari (In Formazione)**
```json
{
  "player_name": "Samuel Eto'o",
  "slot_index": 3,  // 0-10 = titolare (dal campo)
  "position": "SP",
  "overall_rating": 104,
  "photo_slots": {
    "card": true,
    "statistiche": true,
    "abilita": true,
    "booster": false
  }
}
```

**2. Riserve (Fuori Formazione)**
```json
{
  "player_name": "Ronaldinho",
  "slot_index": null,  // null = riserva (non sul campo)
  "position": "ESA",
  "overall_rating": 99,
  "photo_slots": {
    "card": true,
    "statistiche": true,
    "abilita": false,
    "booster": false
  }
}
```

---

## 🎯 LOGICA CHIAVE

### Regola: "Tutto ciò che NON è sul campo = Riserva"

```javascript
// Titolare
slot_index: 0-10  → Giocatore sul campo (titolare)

// Riserva
slot_index: null  → Giocatore NON sul campo (riserva)

// Deriva is_starter
const is_starter = (slot_index !== null && slot_index >= 0 && slot_index <= 10)
```

---

## 🔧 IMPLEMENTAZIONE WORKFLOW

### 1. **API Estrazione Formazione (NUOVA)**

**Endpoint:** `POST /api/extract-formation`

**Input:**
```json
{
  "imageDataUrl": "data:image/jpeg;base64,..."  // Foto formazione completa
}
```

**Output:**
```json
{
  "formation": "4-2-1-3",
  "players": [
    {
      "player_name": "Samuel Eto'o",
      "slot_index": 3,  // Estrazione posizione campo
      "position": "SP",
      "overall_rating": 104,
      "team": "Inter Milan",
      // ... altri dati base
    },
    // ... altri 10 giocatori
  ]
}
```

**Logica:**
- AI analizza foto formazione
- Riconosce posizione ogni giocatore sul campo
- Assegna `slot_index: 0-10` basato su posizione (es. portiere = 0, attaccanti = 8-10)
- Estrae dati base (nome, posizione, rating)

---

### 2. **Pagina Upload Formazione (MODIFICA ESISTENTE)**

**File:** `app/upload/page.jsx` (o nuova `app/upload-formazione/page.jsx`)

**UI:**
```
┌─────────────────────────────────────┐
│  Carica Formazione                  │
├─────────────────────────────────────┤
│  [📤 Carica Foto Formazione]        │
│                                     │
│  Anteprima:                         │
│  [Foto formazione caricata]         │
│                                     │
│  [✓ Convalida]                      │
└─────────────────────────────────────┘
```

**Workflow:**
1. Cliente carica foto formazione
2. Sistema estrae 11 titolari con `slot_index`
3. Salva tutti in DB (CREATE o UPDATE se esiste già)

---

### 3. **Lista Giocatori (MODIFICA ESISTENTE)**

**File:** `app/lista-giocatori/page.jsx`

**UI:**
```
┌─────────────────────────────────────┐
│  I Miei Giocatori                   │
├─────────────────────────────────────┤
│  TITOLARI (11):                     │
│  [Card 1] [Card 2] ... [Card 11]   │ ← slot_index: 0-10
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  RISERVE (12):                      │
│  [Card 12] [Card 13] ... [+ Nuovo] │ ← slot_index: null
└─────────────────────────────────────┘
```

**Query:**
```javascript
// Titolari
const { data: titolari } = await supabase
  .from('players')
  .select('*')
  .gte('slot_index', 0)
  .lte('slot_index', 10)
  .order('slot_index', { ascending: true })

// Riserve
const { data: riserve } = await supabase
  .from('players')
  .select('*')
  .is('slot_index', null)
  .order('created_at', { ascending: false })
```

---

### 4. **Gestione Formazione (DRAG & DROP)**

**File:** `app/gestione-formazione/page.jsx` (NUOVA)

**UI:**
```
┌─────────────────────────────────────┐
│  Gestione Formazione                │
├─────────────────────────────────────┤
│  TITOLARI (11):                     │
│  [Card 1] [Card 2] ... [Card 11]   │
│  ─────────────────────────────────  │
│  RISERVE:                           │
│  [Card 12] [Card 13] ...            │
└─────────────────────────────────────┘
```

**Workflow Drag & Drop:**
1. Cliente trascina riserva → Sostituisce titolare
2. API swap `slot_index`:
   - Vecchio Titolare: `slot_index: null` (riserva)
   - Nuova Riserva: `slot_index: X` (titolare)

**API:** `PATCH /api/supabase/swap-formation`
```json
{
  "playerId1": "uuid-titolare",
  "playerId2": "uuid-riserva"
}
```

---

## ✅ VANTAGGI WORKFLOW DEFINITO

1. **Chiaro:** Foto formazione definisce titolari automaticamente
2. **Semplice:** Riserve = `slot_index: null` (tutto ciò che non è sul campo)
3. **Flessibile:** Drag & drop per cambi formazione
4. **Scalabile:** Cliente può avere N riserve (non limitato a 12)

---

## 🔧 PROSSIMI PASSI IMPLEMENTAZIONE

1. ✅ **Nuova API:** `POST /api/extract-formation` (estrazione da foto formazione)
2. ✅ **Modifica Upload:** Supporto foto formazione (11 giocatori)
3. ✅ **Modifica Lista:** Separazione titolari/riserve (`slot_index: 0-10` vs `null`)
4. ✅ **Nuova Pagina:** `app/gestione-formazione/page.jsx` (drag & drop)
5. ✅ **Nuova API:** `PATCH /api/supabase/swap-formation` (swap `slot_index`)

---

**Status:** ✅ **WORKFLOW DEFINITO** - Pronto per implementazione
