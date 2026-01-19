# DOMANDE CRITICHE: Gestione Titolare/Sostituto

**Data:** 2026-01-19  
**Obiettivo:** Capire come gestire titolare/sostituto e cambi formazione per consigli IA

---

## 🎯 PROBLEMA CENTRALE

**Scenario:**
- Un giocatore = un record unico (non duplicare)
- Cliente fa cambi formazione: oggi Ronaldinho titolare, domani Kaká titolare
- IA deve sapere stato corrente per consigli

---

## ❓ DOMANDE CRITICHE

### 1. **CHE TIPO DI FOTO CARICA IL CLIENTE?**

**Opzione A: Foto Card Singola (giocatore individuale)**
- Foto profilo singolo giocatore (es. Ronaldinho)
- Non mostra formazione completa
- ❌ **Problema:** Come sai se è titolare o sostituto?

**Opzione B: Foto Formazione Completa (11 titolari + sostituti)**
- Foto schermo formazione completa
- Mostra tutti 11 titolari (slot 0-10) + sostituti (slot 11-20)
- ✅ **Vantaggio:** AI può estrarre `slot_index` per tutti

**Domanda:** ✅ **Che foto carica il cliente? Card singola o formazione completa?**

---

### 2. **COME RICONOSCI TITOLARE/SOSTITUTO?**

**Se foto card singola:**
- A) Cliente seleziona manualmente: "Titolare" / "Sostituto" dopo upload?
- B) Sistema assume sempre "Titolare" (default)?
- C) Richiedi sempre foto formazione per sapere `slot_index`?

**Se foto formazione completa:**
- A) AI estrae `slot_index` per ogni giocatore (0-10 = titolare, 11-20 = sostituto)?
- B) Sistema calcola `is_starter` da `slot_index` (0-10 = true, 11-20 = false)?

**Domanda:** ✅ **Come distingui titolare da sostituto nella foto che carica?**

---

### 3. **QUANDO AGGIORNI `is_starter`?**

**Scenario Cambi:**
- Oggi: Ronaldinho `is_starter: true`, Kaká `is_starter: false`
- Domani: Cliente fa cambio → Ronaldinho sostituto, Kaká titolare

**Opzione A: Solo quando carichi foto formazione completa**
- Cliente carica foto formazione → Sistema vede tutti i cambi
- UPDATE: Ronaldinho `is_starter: false`, Kaká `is_starter: true`
- ✅ **Accurato** - sa tutti i cambi in una volta

**Opzione B: Ogni volta che carichi foto card**
- Cliente carica foto Ronaldinho → Seleziona manualmente "Sostituto"
- UPDATE: Ronaldinho `is_starter: false`
- ⚠️ **Parziale** - aggiorna solo quel giocatore

**Opzione C: Pagina separata "Cambi Formazione"**
- Cliente va in "Gestione Formazione" → Seleziona titolari/sostituti
- UPDATE tutti i giocatori in una volta
- ✅ **Esplicito** - cliente gestisce cambi manualmente

**Domanda:** ✅ **Quando aggiorni `is_starter`? Solo formazione completa o anche card singola?**

---

### 4. **SERVE STORICO CAMBI?**

**Per Consigli IA:**
- IA vuole sapere: "Ronaldinho è titolare OGGI" (stato corrente)
- Serve storico? "Ronaldinho era titolare ieri, oggi è sostituto"?

**Opzione A: Solo Stato Corrente**
```json
{
  "player_name": "Ronaldinho",
  "is_starter": false,  // Stato corrente (oggi è sostituto)
  "slot_index": 15
}
```
- ✅ **Semplice** - solo stato attuale
- ❌ **Nessuno storico** - IA non sa cambi nel tempo

**Opzione B: Stato Corrente + Timestamp Ultimo Cambio**
```json
{
  "player_name": "Ronaldinho",
  "is_starter": false,
  "slot_index": 15,
  "last_formation_update": "2026-01-19T12:00:00Z"  // Quando è cambiato
}
```
- ✅ **Stato + quando cambiato** - IA sa ultimo cambio
- ✅ **Sufficiente per consigli** - IA usa stato corrente

**Opzione C: Storico Completo (tabella separata)**
- Tabella `formation_history` con tutti i cambi nel tempo
- IA può analizzare pattern (es. "Ronaldinho spesso titolare")
- ✅ **Storico completo** - IA può fare analisi avanzate

**Domanda:** ✅ **Quanto storico serve per consigli IA? Solo stato corrente o anche storico cambi?**

---

### 5. **STRUTTURA DATI: Campo `is_starter` o Solo `slot_index`?**

**Opzione A: Campo `is_starter` Esplicito**
```json
{
  "player_name": "Ronaldinho",
  "is_starter": true,   // true = titolare, false = sostituto
  "slot_index": 3       // 0-10 = titolare, 11-20 = sostituto
}
```
- ✅ **Chiaro** - esplicito (titolare/sostituto)
- ✅ **Query semplici** - `WHERE is_starter = true`
- ✅ **IA facile** - `is_starter` diretto

**Opzione B: Solo `slot_index` (Deriva `is_starter`)**
```json
{
  "player_name": "Ronaldinho",
  "slot_index": 3  // 0-10 = titolare, 11-20 = sostituto, null = non in rosa
}
```
- ✅ **Backward compatible** - campo già esiste
- ⚠️ **Logica implicita** - `is_starter = (slot_index >= 0 && slot_index <= 10)`
- ⚠️ **IA deve calcolare** - `is_starter` non esplicito

**Domanda:** ✅ **Preferisci campo `is_starter` esplicito o deriva da `slot_index`?**

---

## 💡 PROPOSTA INIZIALE (BASATA SU IPOTESI)

### Struttura Proposta:

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "player_name": "Ronaldinho Gaúcho",
  
  // Stato formazione corrente (per IA consigli)
  "is_starter": true,           // true = titolare OGGI, false = sostituto OGGI
  "slot_index": 3,              // 0-10 = titolare, 11-20 = sostituto, null = non in rosa
  "last_formation_update": "2026-01-19T12:00:00Z",  // Quando è cambiato
  
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

**Scenario:** Cliente fa cambio formazione

1. **Cliente carica foto formazione completa** (11 titolari + sostituti visibili)
2. **Sistema analizza** → Estrae tutti giocatori con `slot_index`
3. **Per ogni giocatore:**
   - Se esiste → UPDATE: `is_starter = (slot_index <= 10)`, `slot_index`, `last_formation_update = NOW()`
   - Se non esiste → CREATE con `is_starter`, `slot_index`
4. **IA usa `is_starter` per consigli** (es. "Ronaldinho è titolare OGGI, usa in attacco")

---

## ❓ RISPOSTE NECESSARIE

1. ✅ **Che tipo di foto carica?** Card singola o formazione completa?
2. ✅ **Come riconosci titolare/sostituto?** AI estrae o selezione manuale?
3. ✅ **Quando aggiorni `is_starter`?** Solo formazione completa o anche card singola?
4. ✅ **Quanto storico serve?** Solo stato corrente o anche storico cambi?
5. ✅ **Campo `is_starter` esplicito o deriva da `slot_index`?**

---

**Status:** ⏳ **IN ATTESA RISPOSTE** - Serve chiarire workflow foto e cambi
