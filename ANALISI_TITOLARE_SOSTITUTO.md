# ANALISI: Gestione Titolare/Sostituto e Cambi Formazione

**Data:** 2026-01-19  
**Obiettivo:** Sistema per distinguere titolare/sostituto e gestire cambi formazione nel tempo

---

## 🎯 PROBLEMA CENTRALE

### Scenario Reale:

**Oggi:**
- Ronaldinho è **TITOLARE** (slot 0-10)
- Kaká è **SOSTITUTO** (slot 11-20)

**Domani (dopo cambi):**
- Ronaldinho diventa **SOSTITUTO** (slot 11-20)
- Kaká diventa **TITOLARE** (slot 0-10)

**Requisiti:**
- ❌ **NON posso avere stesso giocatore come titolare E sostituto** (un record unico)
- ✅ **Sistema deve sapere stato corrente** (titolare/sostituto) per consigli IA
- ✅ **Deve gestire cambi nel tempo** (oggi titolare, domani sostituto)

---

## 🤔 DIFFERENZE: AI Estrazione vs `slot_index`

### Opzione A: AI Estrae dalla Foto

**Come funziona:**
- Foto analizzata → AI riconosce se giocatore è in campo (titolare) o panchina (sostituto)
- Estrae `is_starter: true/false` dalla foto

**Vantaggi:**
- ✅ Automatico (no input manuale)
- ✅ Basato su foto (accurate)

**Svantaggi:**
- ⚠️ **Problema:** Foto card non mostra formazione completa
- ⚠️ Foto singola giocatore → AI non sa se è titolare o sostituto
- ⚠️ Serve foto formazione completa per capire

---

### Opzione B: `slot_index` (0-10 = Titolare, 11-20 = Sostituto)

**Come funziona:**
- `slot_index: 3` (0-10) → Titolare
- `slot_index: 15` (11-20) → Sostituto
- `slot_index: null` → Non in rosa

**Vantaggi:**
- ✅ Campo già esistente (backward compatible)
- ✅ Logica chiara (0-10 vs 11-20)
- ✅ Implicito (deriva da `slot_index`)

**Svantaggi:**
- ⚠️ **Problema:** Come estrai `slot_index` dalla foto card singola?
- ⚠️ Foto card non mostra `slot_index` (non vedi posizione in formazione)
- ⚠️ Serve foto formazione completa per sapere `slot_index`

---

## 💡 SOLUZIONE PROPOSTA

### Un Giocatore = Un Record Unico (con `is_starter` corrente)

**Struttura:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "player_name": "Ronaldinho Gaúcho",
  "is_starter": true,  // true = titolare OGGI, false = sostituto OGGI
  "slot_index": 3,     // Posizione in formazione (0-10 se titolare, 11-20 se sostituto)
  "last_formation_update": "2026-01-19T12:00:00Z",  // Quando è cambiato
  "photo_slots": {
    "card": true,
    "statistiche": true,
    "abilita": true,
    "booster": false
  }
}
```

**Workflow Cambi:**
1. **Oggi:** Ronaldinho `is_starter: true`, `slot_index: 3` (titolare)
2. **Domani:** Cliente fa cambio → Upload nuova foto formazione
3. **Sistema:** Analizza foto → Vede Ronaldinho `slot_index: 15` (11-20)
4. **Aggiorna:** `is_starter: false`, `slot_index: 15`, `last_formation_update: NOW()`

---

## 🔍 DOMANDE CRITICHE

### 1. **Come riconosci titolare/sostituto dalla foto?**

**Opzione A: Foto Formazione Completa**
- Cliente carica foto formazione completa (11 titolari + sostituti)
- Sistema analizza → Estrae tutti giocatori con `slot_index`
- `slot_index: 0-10` → `is_starter: true`
- `slot_index: 11-20` → `is_starter: false`

**Opzione B: Foto Card Singola + Selezione Manuale**
- Cliente carica foto card singola
- Sistema analizza → Estrae `player_name`
- Cliente seleziona manualmente: "Titolare" o "Sostituto" → `is_starter`
- Sistema deriva `slot_index` (es. primo titolare = 0, primo sostituto = 11)

**Opzione C: Campo `slot_index` dall'AI**
- AI estrae `slot_index` dalla foto (se foto formazione completa)
- Sistema deriva `is_starter` da `slot_index` (0-10 = true, 11-20 = false)

**Domanda:** ✅ **Quale opzione preferisci?**

---

### 2. **Tracking Storico vs Stato Corrente**

**Scenario:**
- Oggi: Ronaldinho titolare
- Domani: Ronaldinho sostituto (cambio)

**Opzione A: Solo Stato Corrente**
- Record aggiornato: `is_starter: false`, `slot_index: 15`
- **Nessuno storico** - solo stato corrente
- IA sa solo stato attuale per consigli

**Opzione B: Stato Corrente + Timestamp**
- Record aggiornato: `is_starter: false`, `slot_index: 15`, `last_formation_update: NOW()`
- **Timestamp ultimo cambio** - sa quando è cambiato
- IA sa stato attuale + quando è cambiato

**Opzione C: Storico Completo**
- Tabella separata `formation_history` con storico cambi
- Record `players` ha solo stato corrente
- **Storico completo** - sa tutti i cambi nel tempo

**Domanda:** ✅ **Quanto storico serve per consigli IA?**

---

### 3. **Come Gestire Cambi Formazione**

**Scenario:** Cliente fa cambio → Ronaldinho diventa sostituto

**Opzione A: Update Record Esistente**
- Trova record "Ronaldinho" per `user_id`
- UPDATE: `is_starter: false`, `slot_index: 15`
- **Un record unico** - sempre lo stesso giocatore

**Opzione B: Campo `current_formation_status`**
- UPDATE: `current_formation_status: { is_starter: false, slot_index: 15, updated_at: NOW() }`
- JSONB con stato corrente
- **Flessibile** - può aggiungere info future

**Domanda:** ✅ **Preferisci update record esistente o campo separato?**

---

## 🎯 PROPOSTA FINALE (PENDING RISPOSTE)

### Struttura Proposta:

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "player_name": "Ronaldinho Gaúcho",
  
  // Stato formazione corrente
  "is_starter": true,           // true = titolare OGGI, false = sostituto OGGI
  "slot_index": 3,              // 0-10 = titolare, 11-20 = sostituto, null = non in rosa
  "last_formation_update": "2026-01-19T12:00:00Z",  // Quando è cambiato
  
  // Dati giocatore
  "position": "ESA",
  "overall_rating": 99,
  "base_stats": {...},
  "skills": [...],
  "photo_slots": {
    "card": true,
    "statistiche": true,
    "abilita": true,
    "booster": false
  },
  
  // ... altri campi esistenti
}
```

### Workflow Cambi:

1. **Cliente carica foto formazione completa** (11 titolari + sostituti)
2. **Sistema analizza** → Estrae tutti giocatori con `slot_index`
3. **Per ogni giocatore:**
   - Se esiste → UPDATE: `is_starter`, `slot_index`, `last_formation_update`
   - Se non esiste → CREATE con `is_starter`, `slot_index`
4. **IA usa `is_starter` per consigli** (es. "Ronaldinho è titolare, usa in attacco")

---

## ❓ DOMANDE FINALI

1. **Come riconosci `slot_index` dalla foto?**
   - A) Foto formazione completa → AI estrae tutti `slot_index`
   - B) Foto card singola + selezione manuale titolare/sostituto
   - C) Altro?

2. **Quanto storico serve?**
   - A) Solo stato corrente (sufficiente per IA)
   - B) Stato + timestamp ultimo cambio
   - C) Storico completo cambi

3. **Quando aggiorni `is_starter`?**
   - A) Solo quando carichi foto formazione completa
   - B) Ogni volta che carichi foto card (con selezione manuale)
   - C) Altro?

---

**Status:** ⏳ **IN ATTESA RISPOSTE** - Serve chiarire come estrarre `slot_index`/`is_starter` dalla foto
