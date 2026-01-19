# PROPOSTA: Sistema Slot Foto per Completare Giocatori

**Data:** 2026-01-19  
**Obiettivo:** Sistema per completare progressivamente i profili giocatori con 3 foto specifiche

---

## 🎯 WORKFLOW PROPOSTO

### Step 1: Upload Foto Card (Pagina `/upload`)

**Cosa fa l'utente:**
- Carica foto card/face giocatore (immagine visibile nella formazione)

**Cosa fa il sistema:**
- Estrae `player_name` (minimo necessario)
- Crea record giocatore base in `players`:
  ```json
  {
    "id": "uuid",
    "user_id": "uuid",
    "player_name": "Ronaldinho Gaúcho",
    "photo_slots": {
      "card": true,      // ✅ Foto card caricata
      "statistiche": false,  // ❌ Mancante
      "abilita": false,      // ❌ Mancante
      "booster": false       // ❌ Mancante
    }
  }
  ```
- Giocatore appare in `/lista-giocatori` come **card cliccabile**

---

### Step 2: Clic su Giocatore → Pagina Dettaglio (`/giocatore/[id]`)

**Cosa vede l'utente:**
```
┌─────────────────────────────────────┐
│  [← Indietro]  Ronaldinho Gaúcho   │
├─────────────────────────────────────┤
│                                     │
│  [Foto Card - Immagine principale]  │
│                                     │
│  Completezza: ●○○  (1/3)            │
│                                     │
│  ┌─────────────┐ ┌─────────────┐   │
│  │ Statistiche │ │   Abilità   │   │
│  │   [📤 Upload]│ │   [📤 Upload]│   │
│  │   ❌ Mancante│ │   ❌ Mancante│   │
│  └─────────────┘ └─────────────┘   │
│                                     │
│  ┌─────────────┐                    │
│  │   Booster   │                    │
│  │   [📤 Upload]│                    │
│  │   ❌ Mancante│                    │
│  └─────────────┘                    │
└─────────────────────────────────────┘
```

---

### Step 3: Upload Foto per Slot

**Workflow per ogni slot:**
1. Clic "Upload" su slot (es. "Statistiche")
2. Seleziona foto
3. Sistema analizza foto → estrae dati specifici
4. Mostra preview dati estratti
5. Conferma → **aggiorna** record giocatore esistente

**Esempio: Upload foto Statistiche**
- Foto analizzata → estrae `base_stats`, `overall_rating`, ecc.
- Preview: "Trovate 27 statistiche. Confermi?"
- Conferma → `UPDATE players SET base_stats = {...}, photo_slots.statistiche = true WHERE id = ...`

---

## 📊 STRUTTURA DATI

### Campo `photo_slots` in `players` table (JSONB)

```json
{
  "card": true,           // Foto card/face caricata
  "statistiche": true,    // Foto statistiche caricata
  "abilita": true,        // Foto abilità caricata
  "booster": true         // Foto booster caricata
}
```

### Dati estratti per slot

**Card Foto:**
- `player_name` (obbligatorio)
- `position`, `overall_rating`, `team`, `card_type` (se visibili)

**Statistiche Foto:**
- `base_stats` (attacking, defending, athleticism)
- `overall_rating`, `height`, `weight`, `age`

**Abilità Foto:**
- `skills` (array)
- `com_skills` (array)
- `ai_playstyles` (array)

**Booster Foto:**
- `boosters` (array)
- `active_booster_name`

---

## 🔧 IMPLEMENTAZIONE TECNICA

### 1. Modificare `app/upload/page.jsx`

**Nuovo comportamento:**
- Upload foto card → estrae `player_name`
- Salva giocatore base con `photo_slots.card = true`
- Redirect a `/giocatore/[id]` per completare

### 2. Creare `app/giocatore/[id]/page.jsx`

**Funzionalità:**
- Mostra info giocatore corrente
- 3 slot upload (statistiche, abilità, booster)
- Preview dati estratti prima di confermare
- Aggiorna record esistente (non crea nuovo)

### 3. Creare API Route `PATCH /api/supabase/update-player/[id]`

**Funzionalità:**
- Aggiorna campo specifico giocatore esistente
- Verifica `user_id` (sicurezza)
- Aggiorna `photo_slots`

### 4. Modificare `app/lista-giocatori/page.jsx`

**Aggiunte:**
- Badge completezza (●○○ = 1/3)
- Card cliccabile → `/giocatore/[id]`
- Colore card basato su completezza

---

## ✅ VANTAGGI

1. **Progressivo:** L'utente può creare giocatore velocemente e completare dopo
2. **Intuitivo:** Slot chiari e visibili per cosa serve ogni foto
3. **Flessibile:** Può completare slot in qualsiasi ordine
4. **Sicuro:** Ogni upload verifica `user_id` (solo proprietario può aggiornare)

---

## 🎨 UI/UX SUGGESTIONS

**Lista Giocatori:**
```
[Ronaldinho] ●○○  (1/3)  [Clicca per completare]
[Cristiano]  ●●○  (2/3)  [Manca: Booster]
```

**Pagina Dettaglio:**
- Progress bar: `████░░░░░░ 33% completo`
- Slot con icona ✓ se completato, ⏳ se mancante
- Pulsante "Completa" che evidenzia slot mancanti

---

## ❓ DECISIONI DA PRENDERE

1. **Aggiornamento dati:** Se carico 2 foto Statistiche, sostituisco o unisco?
   - **Proposta:** Sostituisco (ultima foto vince)

2. **Ordinamento lista:** Ordinare per completezza o data?
   - **Proposta:** Prima completi (●●●), poi parziali (●●○), poi base (●○○)

3. **Foto card obbligatoria?** Devo avere foto card prima di aprire dettaglio?
   - **Proposta:** Sì, foto card crea il giocatore

---

**Status:** ✅ **PROPOSTA APPROVATA** - Pronto per implementazione
