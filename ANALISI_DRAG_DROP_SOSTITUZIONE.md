# ANALISI: Drag & Drop Sostituzione Formazione

**Data:** 2026-01-19  
**Obiettivo:** Valutare fattibilità workflow drag & drop per cambi formazione

---

## 🎯 PROPOSTA UTENTE

### Workflow Proposto:

1. **Caricamento Iniziale:**
   - Cliente carica giocatori (tutti con profilo completo)
   - **I primi caricati = TITOLARI** (implicito - no campo esplicito)
   - **Gli altri = SOSTITUTI** (tutti con card profilazione completa)

2. **Gestione Formazione:**
   - Lista mostra tutti i giocatori (titolari + sostituti)
   - Cliente fa **drag & drop** o click **"Sostituisci"**
   - Sistema aggiorna `slot_index` automaticamente
   - `is_starter` deriva da `slot_index` (0-10 = titolare, 11-20 = sostituto)

3. **Profilazione:**
   - Tutti i giocatori (titolari e sostituti) hanno card complete
   - Tutti possono avere foto: card, statistiche, abilità, booster

---

## ✅ VANTAGGI

1. **Semplicità UI:**
   - Non serve distinguere titolare/sostituto al caricamento
   - Cliente carica semplicemente giocatori → sistema assume titolari

2. **Flessibilità:**
   - Drag & drop intuitivo per cambi formazione
   - Cliente gestisce formazione in modo visuale

3. **Profilazione Completa:**
   - Tutti i giocatori (titolari e sostituti) hanno dati completi
   - IA può analizzare tutti per consigli

4. **Backward Compatible:**
   - Usa `slot_index` esistente (0-10 = titolare, 11-20 = sostituto)
   - Non serve nuovo campo `is_starter` (deriva da `slot_index`)

---

## ❓ DOMANDE TECNICHE

### 1. **Come Assegni `slot_index` al Caricamento Iniziale?**

**Opzione A: Ordine di Caricamento (Automatico)**
- Primo giocatore caricato → `slot_index: 0` (titolare)
- Secondo giocatore caricato → `slot_index: 1` (titolare)
- ... fino a `slot_index: 10` (11 titolari)
- Poi `slot_index: 11+` (sostituti)
- ✅ **Semplice** - automatico
- ⚠️ **Problema:** Cliente potrebbe caricare in ordine sbagliato

**Opzione B: Foto Formazione Completa (Prima)**
- Cliente carica foto formazione → Sistema estrae tutti i giocatori con `slot_index`
- Poi cliente completa profilazione (foto statistiche, abilità, booster)
- ✅ **Accurato** - `slot_index` dalla foto formazione
- ⚠️ **Complesso** - richiede foto formazione iniziale

**Opzione C: Selezione Manuale Dopo Caricamento**
- Cliente carica tutti i giocatori (senza `slot_index`)
- Poi va in "Gestione Formazione" → Seleziona manualmente titolari
- Sistema assegna `slot_index: 0-10` ai titolari, `11+` ai sostituti
- ✅ **Flessibile** - cliente decide dopo
- ⚠️ **Due step** - caricamento + selezione

**Domanda:** ✅ **Quale opzione preferisci per `slot_index` iniziale?**

---

### 2. **Come Funziona Drag & Drop?**

**UI Proposta:**
```
┌─────────────────────────────────────┐
│  Gestione Formazione                │
├─────────────────────────────────────┤
│  TITOLARI (11):                     │
│  [Card 1] [Card 2] ... [Card 11]   │
│  ─────────────────────────────────  │
│  SOSTITUTI:                         │
│  [Card 12] [Card 13] ...            │
└─────────────────────────────────────┘
```

**Workflow Drag & Drop:**
1. Cliente trascina Card Sostituto → Sostituisce Card Titolare
2. Sistema aggiorna:
   - Vecchio Titolare: `slot_index: 11+` (diventa sostituto)
   - Nuovo Titolare: `slot_index: 0-10` (diventa titolare)
3. `is_starter` deriva automaticamente: `is_starter = (slot_index <= 10)`

**Implementazione:**
- **Libreria:** `react-beautiful-dnd` o `@dnd-kit/core` per drag & drop
- **API:** `PATCH /api/supabase/update-player/[id]` per aggiornare `slot_index`
- **Stato:** Frontend gestisce drag, poi chiama API per persistenza

**Domanda:** ✅ **Preferisci drag & drop o bottoni "Sostituisci"?**

---

### 3. **Come Derivi `is_starter` da `slot_index`?**

**Logica:**
```javascript
// Deriva is_starter da slot_index
const is_starter = (slot_index !== null && slot_index >= 0 && slot_index <= 10)
```

**Vantaggi:**
- ✅ Non serve campo separato `is_starter`
- ✅ Backward compatible con `slot_index` esistente
- ✅ Query semplici: `WHERE slot_index <= 10` per titolari

**Svantaggi:**
- ⚠️ Logica implicita (IA deve calcolare `is_starter` da `slot_index`)
- ⚠️ Se vuoi query diretta `WHERE is_starter = true`, serve campo esplicito

**Domanda:** ✅ **Preferisci campo `is_starter` esplicito o deriva da `slot_index`?**

---

### 4. **Gestione `slot_index` Vuoti/Null**

**Scenario:**
- Cliente carica 15 giocatori
- Solo 11 sono titolari (slot 0-10)
- Gli altri 4 sono sostituti (slot 11-14)
- Gli ultimi 6 slot (15-20) sono vuoti

**Gestione:**
- Giocatori senza `slot_index` (null) = "Riserve" (non in formazione)
- Solo giocatori con `slot_index: 0-20` sono in formazione

**Domanda:** ✅ **Vuoi gestire "Riserve" (slot_index null) o solo titolari/sostituti?**

---

## 💡 PROPOSTA IMPLEMENTAZIONE

### Struttura Dati:

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "player_name": "Ronaldinho Gaúcho",
  
  // Formazione (per drag & drop)
  "slot_index": 3,  // 0-10 = titolare, 11-20 = sostituto, null = riserva
  // is_starter deriva: is_starter = (slot_index !== null && slot_index <= 10)
  
  "last_formation_update": "2026-01-19T12:00:00Z",
  
  // Profilazione (tutti i giocatori)
  "photo_slots": {
    "card": true,
    "statistiche": true,
    "abilita": true,
    "booster": false
  },
  
  // ... altri campi esistenti
}
```

### Workflow Completo:

**Step 1: Caricamento Iniziale**
1. Cliente carica giocatori (foto card, statistiche, abilità, booster)
2. **Opzione A:** Sistema assegna `slot_index: 0-N` in ordine caricamento
3. **Opzione B:** Cliente seleziona titolari dopo caricamento
4. Sistema salva tutti con `slot_index`

**Step 2: Gestione Formazione (Drag & Drop)**
1. Cliente va in "Gestione Formazione" → Vede lista titolari + sostituti
2. Trascina Card Sostituto → Sostituisce Card Titolare
3. Sistema aggiorna `slot_index` per entrambi:
   - Vecchio Titolare: `slot_index: 11+` (sostituto)
   - Nuovo Titolare: `slot_index: 0-10` (titolare)
4. Frontend chiama API: `PATCH /api/supabase/update-player/[id]`

**Step 3: Query per IA**
- Titolari: `WHERE slot_index >= 0 AND slot_index <= 10`
- Sostituti: `WHERE slot_index >= 11 AND slot_index <= 20`
- IA usa `is_starter = (slot_index <= 10)` per consigli

---

## 🔧 IMPLEMENTAZIONE TECNICA

### Nuove Componenti:

1. **`app/gestione-formazione/page.jsx`** (nuova pagina)
   - Lista drag & drop titolari + sostituti
   - Usa `react-beautiful-dnd` o `@dnd-kit/core`
   - Chiama API per aggiornare `slot_index`

2. **`app/api/supabase/update-player/[id]/route.js`** (nuova API)
   - Aggiorna `slot_index` di un giocatore
   - Logica business: swap `slot_index` quando sostituisci

3. **`app/lista-giocatori/page.jsx`** (modifica esistente)
   - Mostra badge "Titolare" / "Sostituto" basato su `slot_index`
   - Link a "Gestione Formazione"

### Libreria Drag & Drop:

**Opzione A: `react-beautiful-dnd`**
- ✅ Popolare, ben documentato
- ⚠️ Richiede React 16.8+

**Opzione B: `@dnd-kit/core`**
- ✅ Moderna, accessibile
- ✅ Supporta mobile drag & drop

**Domanda:** ✅ **Quale libreria preferisci?**

---

## ⚠️ COMPLESSITÀ STIMA

### Semplice (MVP):
- ✅ Lista giocatori con badge Titolare/Sostituto
- ✅ Bottone "Sostituisci" → Modal con selezione giocatore
- ✅ API aggiorna `slot_index`
- **Tempo:** 2-3 ore

### Completo (Drag & Drop):
- ✅ Pagina "Gestione Formazione" con drag & drop
- ✅ Visualizzazione formazione campo
- ✅ Swap automatico `slot_index`
- **Tempo:** 4-6 ore

---

## ❓ RISPOSTE NECESSARIE

1. ✅ **Come assegni `slot_index` al caricamento?** Ordine caricamento, foto formazione, o selezione manuale?
2. ✅ **Preferisci drag & drop o bottoni "Sostituisci"?**
3. ✅ **Campo `is_starter` esplicito o deriva da `slot_index`?**
4. ✅ **Vuoi gestire "Riserve" (slot_index null) o solo titolari/sostituti?**

---

**Status:** ✅ **FATTIBILE** - Workflow proposto è realizzabile tecnicamente
