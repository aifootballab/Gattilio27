# PROPOSTA SEMPLIFICATA: Slot Foto con Workflow Diretto

**Data:** 2026-01-19  
**Obiettivo:** Sistema semplificato per completare giocatori con foto direttamente dalla lista

---

## 🎯 WORKFLOW SEMPLIFICATO

### Step 1: Lista Giocatori → Clic su Card (Esistente o Vuota)

**Cosa vede l'utente:**

```
┌─────────────────────────────────────┐
│  I Miei Giocatori                   │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────┐  ┌─────────┐  ┌─────┐ │
│  │[Foto]   │  │[Foto]   │  │ [+] │ │ ← Nuovo giocatore (placeholder)
│  │Ronaldinho│ │Cristiano│ │ Vuoto│ │
│  │●○○ (1/3)│ │●●○ (2/3)│ │  Clic │ │
│  └─────────┘  └─────────┘  └─────┘ │
│     ↑            ↑           ↑      │
│   Clicca      Clicca      Clicca   │
│   per         per         per      │
│   completare  completare  nuovo    │
└─────────────────────────────────────┘
```

---

### Step 2: Clic su Card → Upload Foto Diretto

**Cosa succede:**
- Clic su card esistente → Modal/Page con 3 slot
- Clic su card vuota `[+]` → Modal/Page per nuovo giocatore
- Upload foto direttamente nella card/modal
- Sistema analizza prima foto → identifica `player_name` → crea/aggiorna automaticamente

**UI proposta:**
```
┌─────────────────────────────────────┐
│  [←]  Ronaldinho Gaúcho             │
├─────────────────────────────────────┤
│                                     │
│  Completezza: ●○○  (1/3)            │
│                                     │
│  ┌─────────────┐ ┌─────────────┐   │
│  │ Statistiche │ │   Abilità   │   │
│  │   [📤 Clicca]│ │   [📤 Clicca]│   │
│  │   ❌ Mancante│ │   ❌ Mancante│   │
│  └─────────────┘ └─────────────┘   │
│                                     │
│  ┌─────────────┐                    │
│  │   Booster   │                    │
│  │   [📤 Clicca]│                    │
│  │   ❌ Mancante│                    │
│  └─────────────┘                    │
└─────────────────────────────────────┘
```

**Workflow:**
1. Clic su slot "Statistiche"
2. Seleziona foto
3. Sistema analizza → estrae `player_name`, `base_stats`
4. **Se giocatore non esiste:** Crea con `player_name` + dati estratti
5. **Se giocatore esiste:** Aggiorna `base_stats` + `photo_slots.statistiche = true`

---

## 🎯 VANTAGGI SEMPLIFICAZIONE

1. **Un solo passaggio:** Clic → Upload → Fatto (no redirect)
2. **Identificazione automatica:** Prima foto identifica giocatore (`player_name`)
3. **Creazione automatica:** Se non esiste, lo crea; se esiste, aggiorna
4. **Più intuitivo:** Tutto nella stessa pagina/modal

---

## ⚠️ PROBLEMA: DISTINZIONE TITOLARE/SOSTITUTO

### Scenario

Nella formazione eFootball:
- **Titolari:** 11 giocatori in campo (slot 0-10?)
- **Sostituti:** Giocatori in panchina (slot 11-20? o null?)

### Domande

1. **Come distingui titolare da sostituto nella foto?**
   - La foto card mostra la posizione in formazione?
   - C'è un indicatore visibile (es. "Titolare" / "Sostituto")?

2. **Vuoi campo separato nel DB?**
   - Aggiungere campo `is_starter` (boolean)?
   - O usare `slot_index` (0-10 = titolare, 11-20 = sostituto, null = non in rosa)?

3. **Gestione doppi:**
   - Posso avere stesso giocatore come titolare E sostituto?
   - O solo uno per volta?

---

## 📊 SOLUZIONI POSSIBILI

### Opzione A: Campo `is_starter` (Boolean)

```json
{
  "player_name": "Ronaldinho",
  "is_starter": true,  // true = titolare, false = sostituto
  "slot_index": 3,     // posizione in formazione (0-10 titolari, 11-20 sostituti)
  "photo_slots": {...}
}
```

**Vantaggi:**
- ✅ Chiaro (titolare/sostituto esplicito)
- ✅ Query semplici (`WHERE is_starter = true`)

**Svantaggi:**
- ⚠️ Come estrai `is_starter` dalla foto? (serve AI che riconosce?)

---

### Opzione B: Solo `slot_index`

```json
{
  "player_name": "Ronaldinho",
  "slot_index": 3,  // 0-10 = titolare, 11-20 = sostituto, null = non in rosa
  "photo_slots": {...}
}
```

**Vantaggi:**
- ✅ Campo già esistente (backward compatible)
- ✅ Un solo campo per gestire tutto

**Svantaggi:**
- ⚠️ Logica implicita (0-10 vs 11-20)
- ⚠️ Come estrai `slot_index` dalla foto? (serve AI che riconosce posizione?)

---

### Opzione C: Campo `role` esistente

```json
{
  "player_name": "Ronaldinho",
  "role": "starter",  // o "substitute" (dall'estrazione AI o manuale?)
  "slot_index": 3,
  "photo_slots": {...}
}
```

**Vantaggi:**
- ✅ Campo `role` già esiste in DB
- ✅ Flessibile (starter, substitute, reserve)

**Svantaggi:**
- ⚠️ `role` attualmente indica ruolo giocatore (es. "Ala prolifica"), non titolare/sostituto

---

## ❓ DOMANDE PER DECIDERE

1. **Come riconosci titolare/sostituto dalla foto?**
   - A) AI lo estrae automaticamente dalla foto?
   - B) L'utente lo seleziona manualmente dopo upload?
   - C) Deriva da `slot_index` (0-10 = titolare)?

2. **Serve campo separato `is_starter`?**
   - A) Sì, campo booleano esplicito
   - B) No, uso `slot_index` (0-10 = titolare)
   - C) Uso campo `role` esistente (ma potrebbe confondere)

3. **Posso avere stesso giocatore titolare E sostituto?**
   - A) Sì (record separati)
   - B) No (un record con flag `is_starter`)

---

## 🔧 IMPLEMENTAZIONE PROPOSTA (PENDING DECISIONI)

### Workflow Semplificato:

```
Lista Giocatori → Clic Card → Modal con 3 slot → Upload Foto → Analizza → Crea/Aggiorna
```

### API Logica:

**Nuova API:** `POST /api/supabase/save-or-update-player`
- Se `player_name` non esiste → CREATE
- Se `player_name` esiste → UPDATE (merge dati)
- Aggiorna `photo_slots` automaticamente

**Esempio:**
```javascript
// Upload prima foto (Statistiche)
const playerData = {
  player_name: "Ronaldinho",  // Estratto da foto
  base_stats: {...},          // Estratto da foto
  // is_starter: ???          // Da decidere come estrarlo
}

// API decide:
// - Se "Ronaldinho" non esiste → INSERT
// - Se esiste → UPDATE base_stats
```

---

**Status:** ⏳ **IN ATTESA DECISIONI** - Serve chiarire distinzione titolare/sostituto
