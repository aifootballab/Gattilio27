# 🔍 Analisi Completa: Flussi Inserimento Rosa e Gestione IA

**Data Analisi**: 26 Gennaio 2026  
**Obiettivo**: Analizzare in dettaglio i flussi di inserimento rosa (formazione e giocatori) e come l'IA gestisce l'estrazione dati

---

## 📋 SOMMARIO ESECUTIVO

**Flussi Identificati**:
1. ✅ **Upload Giocatore a Slot** - Estrae dati da 1-3 immagini e assegna a slot (0-10)
2. ✅ **Upload Riserva** - Estrae dati da 1-3 immagini e salva come riserva (slot_index = NULL)
3. ✅ **Assegnazione da Riserve** - Sposta giocatore da riserve a slot titolare
4. ✅ **Rimozione da Slot** - Sposta giocatore da titolare a riserve
5. ✅ **Selezione Formazione Manuale** - Selezione tra 14 formazioni ufficiali eFootball
6. ✅ **Personalizzazione Posizioni** - Drag & drop per personalizzare posizioni giocatori

**Nota**: Il flusso "Upload Formazione Completa" è stato rimosso (26 Gennaio 2026). 
Le formazioni vengono gestite manualmente tramite selezione formazione o personalizzazione posizioni.

**Gestione IA**:
- ✅ Prompt engineering specifici per ogni tipo di estrazione
- ✅ Validazione e normalizzazione dati estratti
- ✅ Gestione duplicati intelligente
- ✅ Merge dati da multiple immagini
- ✅ Estrazione posizioni originali dal mini-campo

---

## ⚠️ NOTA IMPORTANTE

**Aggiornamento 26 Gennaio 2026**: Il flusso "Upload Formazione Completa" è stato **rimosso**. 
Le formazioni vengono ora gestite tramite:
- **Selezione Formazione Manuale**: 14 formazioni ufficiali eFootball predefinite
- **Personalizzazione Posizioni**: Drag & drop per personalizzare posizioni giocatori

L'endpoint `/api/extract-formation` è ancora utilizzato ma **solo per formazioni avversarie** in:
- `/app/contromisure-live` - Estrae formazione avversaria
- `/app/match/new` - Estrae formazione avversaria (step formation_style)

---

## 🔄 FLUSSO 1: UPLOAD GIOCATORE A SLOT (TITOLARE)

### Scopo
Estrae dati completi da 1-3 screenshot di card giocatore e assegna a uno slot titolare (0-10).

### Flusso Utente

```
1. Cliente clicca su slot vuoto o occupato (0-10)
2. Si apre modal "Upload Giocatore"
3. Cliente carica 1-3 immagini:
   - Card giocatore (obbligatoria)
   - Statistiche (opzionale)
   - Skills/Booster (opzionale)
4. Click "Estrai Dati"
5. Sistema estrae dati da tutte le immagini
6. Sistema mostra modal "Selezione Posizioni Originali"
7. Cliente conferma posizioni
8. Sistema salva giocatore con slot_index assegnato
```

### Flusso Tecnico

#### Frontend (`app/gestione-formazione/page.jsx`)

**Handler**: `handleUploadPlayerToSlot()`

```javascript
1. Valida: selectedSlot e uploadImages.length > 0
2. setUploadingPlayer(true)
3. Ottiene token Bearer
4. Loop su tutte le immagini (1-3):
   a. Chiama POST /api/extract-player con { imageDataUrl: img.dataUrl }
   b. Merge dati estratti (prima immagine = base)
   c. Validazione: nome+età devono corrispondere tra immagini
   d. Traccia photo_slots (card, statistiche, abilita, booster)
5. Se tutte le immagini falliscono → errore
6. Mostra modal "PositionSelectionModal" con:
   - extractedPlayerData (dati estratti)
   - selectedOriginalPositions (posizioni dal mini-campo)
7. Cliente conferma → handleSavePlayerWithPositions()
```

**Handler Salvataggio**: `handleSavePlayerWithPositions()`

```javascript
1. Prepara playerData con:
   - Dati estratti
   - slot_index da selectedSlot
   - original_positions da modal
   - photo_slots tracciati
2. Chiama POST /api/supabase/save-player con playerData
3. Se successo → fetchData() (ricarica senza reload)
4. Chiude modali e resetta stati
```

#### Backend (`app/api/extract-player/route.js`)

**Endpoint**: `POST /api/extract-player`

**Input**:
```json
{
  "imageDataUrl": "data:image/png;base64,..."
}
```

**Processo IA**:
1. **Autenticazione**: Valida Bearer token
2. **Validazione Immagine**: Max 10MB
3. **Prompt OpenAI Vision** (molto dettagliato):
   ```
   Analizza screenshot card giocatore e estrai TUTTI i dati visibili.
   
   DATI DA ESTRARRE:
   - Nome, posizione, overall_rating, team, card_type
   - base_stats (attacking, defending, athleticism) - usa TABELLA, non radar
   - skills, com_skills, boosters
   - height, weight, age, nationality
   - level_current, level_cap, form, role
   - playing_style, ai_playstyles
   - matches_played, goals, assists
   - weak_foot_frequency, weak_foot_accuracy, injury_resistance
   
   POSIZIONI ORIGINALI (NUOVO):
   - Guarda MINI-CAMPO in alto a destra della card
   - Zone VERDE brillante = Alta competenza
   - Zone VERDE sfumata = Intermedia competenza
   - Zone GRIGIA = Bassa competenza
   - Mappa zone a posizioni standard (DC, TS, TD, CC, ESA, EDE, AMF, LWF, RWF, CF, SP)
   
   DESCRIZIONE VOLTO:
   - Colore pelle, capelli, lunghezza capelli
   - Caratteristiche distintive (barba, baffi, occhiali, ecc.)
   - Età apparente, nazionalità/etnia
   ```
4. **Chiama OpenAI**: GPT-4o Vision con `response_format: { type: 'json_object' }`
5. **Normalizzazione**:
   - Converte valori a numeri (toInt)
   - Normalizza base_stats (attacking, defending, athleticism)
   - Limita array (skills max 40, com_skills max 20, boosters max 10)
   - Valida original_positions (array di { position, competence })
6. **Validazione**:
   - Nome giocatore obbligatorio
   - Se original_positions vuoto, usa position principale
7. **Return**: `{ player: normalizedPlayer }`

**Output**:
```json
{
  "player": {
    "player_name": "Nome Completo",
    "position": "AMF",
    "original_positions": [
      { "position": "AMF", "competence": "Alta" },
      { "position": "LWF", "competence": "Alta" },
      { "position": "RWF", "competence": "Intermedia" }
    ],
    "overall_rating": 85,
    "base_stats": { "attacking": {...}, "defending": {...}, "athleticism": {...} },
    "skills": ["Skill 1", "Skill 2"],
    "com_skills": ["Com Skill 1"],
    "boosters": [{ "name": "...", "effect": "..." }],
    "height_cm": 180,
    "weight_kg": 75,
    "age": 25,
    "nationality": "Country",
    "player_face_description": "..."
  }
}
```

#### Backend (`app/api/supabase/save-player/route.js`)

**Endpoint**: `POST /api/supabase/save-player`

**Input**:
```json
{
  "player": {
    "player_name": "...",
    "slot_index": 5,  // 0-10 per titolare, null per riserva
    "position": "AMF",
    "original_positions": [...],
    "photo_slots": { "card": true, "statistiche": true },
    // ... altri dati
  }
}
```

**Processo**:
1. **Autenticazione**: Valida Bearer token
2. **Lookup Playing Style**: Cerca `playing_style_id` da nome
3. **Validazione Campi**: Max 255 caratteri per campi testo
4. **Controlli Duplicati**:
   - **Se slot già occupato** → UPDATE invece di INSERT (merge dati)
   - **Verifica duplicati in campo** (nome+età, escludendo slot corrente)
   - **Verifica duplicati in riserve** (nome+età)
5. **Merge Dati** (se UPDATE):
   - photo_slots: merge (non sovrascrive)
   - base_stats: merge (preferisce nuovi)
   - skills/com_skills: unisce array, rimuove duplicati
   - boosters: preferisce nuovi
   - extracted_data: merge
   - metadata: merge
   - **NON sovrascrive original_positions** (mantiene originali)
6. **INSERT/UPDATE**: Salva in Supabase
7. **Return**: `{ success: true, player_id, is_new: true/false, action: 'created'/'updated' }`

### Gestione IA - Prompt Engineering

**Caratteristiche Prompt**:
- ✅ **Completo**: Estrae TUTTI i dati visibili (30+ campi)
- ✅ **Priorità**: Usa TABELLA statistiche, non radar chart
- ✅ **Posizioni Originali**: Istruzioni dettagliate per mini-campo
- ✅ **Descrizione Volto**: Dettagli per matching futuro
- ✅ **Validazione**: "Estrai SOLO ciò che vedi" (non inventare)

**Merge Dati Multi-Immagine**:
- ✅ Prima immagine = dati base
- ✅ Immagini successive = merge (preferisce nuovi dati)
- ✅ Validazione: nome+età devono corrispondere tra immagini
- ✅ Traccia photo_slots per sapere quali foto sono state caricate

**Normalizzazione**:
- ✅ Converte stringhe numeriche a numeri
- ✅ Limita array (skills, com_skills, boosters)
- ✅ Valida original_positions (array di oggetti)
- ✅ Fallback: se original_positions vuoto, usa position principale

---

## 🔄 FLUSSO 2: UPLOAD RISERVA

### Scopo
Estrae dati da 1-3 screenshot e salva come riserva (slot_index = NULL).

### Flusso Utente

```
1. Cliente click "Aggiungi Riserva" (sezione riserve)
2. Si apre modal "Upload Riserva"
3. Cliente carica 1-3 immagini (stesso processo di titolare)
4. Click "Estrai Dati"
5. Sistema estrae dati
6. Sistema mostra modal "Selezione Posizioni Originali"
7. Cliente conferma
8. Sistema salva come RISERVA (slot_index = NULL)
```

### Flusso Tecnico

**Handler**: `handleUploadReserve()`

**Identico a `handleUploadPlayerToSlot()` ma**:
- `slot_index = null` (riserva)
- Nessun controllo slot occupato
- Controllo duplicati solo in riserve

**Backend**: Stesso endpoint `/api/supabase/save-player` con `slot_index: null`

---

## 🔄 FLUSSO 3: ASSEGNAZIONE DA RISERVE A SLOT

### Scopo
Sposta giocatore esistente da riserve a slot titolare.

### Flusso Utente

```
1. Cliente clicca su slot vuoto o occupato
2. Si apre modal "Assegna Giocatore"
3. Cliente seleziona giocatore dalle riserve
4. Click "Assegna"
5. Sistema sposta giocatore a slot
6. Sistema adatta position automaticamente allo slot (se disponibile)
```

### Flusso Tecnico

#### Frontend

**Handler**: `handleAssignFromReserve(playerId, slotIndex)`

```javascript
1. Chiama PATCH /api/supabase/assign-player-to-slot con:
   {
     "player_id": playerId,
     "slot_index": slotIndex
   }
2. Se successo → fetchData()
```

#### Backend (`app/api/supabase/assign-player-to-slot/route.js`)

**Endpoint**: `PATCH /api/supabase/assign-player-to-slot`

**Input**:
```json
{
  "player_id": "uuid",
  "slot_index": 5  // 0-10
}
```

**Processo**:
1. **Autenticazione**: Valida Bearer token
2. **Validazione**: slot_index 0-10
3. **Recupera Formation Layout**: Per calcolare `slotPosition` richiesto
4. **Libera Slot Occupato** (se presente):
   - Trova giocatore esistente nello slot
   - Verifica duplicati riserve prima di liberare
   - Elimina duplicati riserve automaticamente
   - Sposta vecchio giocatore a riserve (slot_index = null)
5. **Controlli Duplicati**:
   - Verifica duplicati in campo (nome+età, escludendo slot corrente)
   - Verifica duplicati in riserve (nome+età)
   - Elimina duplicati riserve automaticamente
6. **Adatta Position**:
   - Recupera `slotPosition` da formation_layout
   - Se disponibile, adatta `position` automaticamente
   - Mantiene `original_positions` (non sovrascrive)
7. **UPDATE**: Assegna slot e adatta position
8. **Return**: `{ success: true, player_id, slot_index, action: 'assigned_existing' }`

**Logica Adattamento Position**:
```javascript
// Recupera posizione richiesta dallo slot
const slotPosition = formationLayout?.slot_positions?.[slot_index]?.position || null

// Adatta position automaticamente
updateData = {
  slot_index: slot_index,
  position: slotPosition || player.position,  // Adatta se disponibile
  // Mantiene original_positions (non sovrascrive)
}
```

---

## 🔄 FLUSSO 5: RIMOZIONE DA SLOT A RISERVE

### Scopo
Sposta giocatore da titolare a riserve.

### Flusso Utente

```
1. Cliente clicca su giocatore titolare
2. Click "Rimuovi da Slot" o icona rimozione
3. Sistema sposta giocatore a riserve (slot_index = null)
```

### Flusso Tecnico

**Handler**: `handleRemoveFromSlot(playerId)`

```javascript
1. Chiama PATCH /api/supabase/remove-player-from-slot con:
   {
     "player_id": playerId
   }
2. Se duplicato riserve → elimina automaticamente
3. Se successo → fetchData()
```

**Backend**: `PATCH /api/supabase/remove-player-from-slot`

**Processo**:
1. Verifica duplicati riserve
2. Se duplicato → elimina automaticamente
3. UPDATE: `slot_index = null`
4. Return success

---

## 🤖 GESTIONE IA - DETTAGLI TECNICI

### Prompt Engineering

#### 1. Estrazione Formazione (`extract-formation`)

**Modello**: GPT-4o Vision  
**Temperature**: 0 (deterministico)  
**Max Tokens**: 4000 (per 11 giocatori)  
**Response Format**: JSON object

**Caratteristiche Prompt**:
- ✅ Richiede ESATTAMENTE 11 giocatori
- ✅ Mapping chiaro slot_index (0-10)
- ✅ Estrae formazione (es. "4-3-3")
- ✅ Estrae descrizione volto per matching

**Validazioni Post-IA**:
- ✅ Numero giocatori = 11
- ✅ Slot_index univoci (0-10)
- ✅ Formato formazione valido
- ✅ Rating valido (40-100)
- ✅ Nome valido (2-100 caratteri)

#### 2. Estrazione Giocatore (`extract-player`)

**Modello**: GPT-4o Vision  
**Temperature**: 0 (deterministico)  
**Max Tokens**: 2500  
**Response Format**: JSON object

**Caratteristiche Prompt**:
- ✅ Estrae 30+ campi dati
- ✅ Priorità: TABELLA statistiche (non radar)
- ✅ **Posizioni Originali**: Istruzioni dettagliate per mini-campo
- ✅ Descrizione volto dettagliata
- ✅ "Estrai SOLO ciò che vedi" (non inventare)

**Validazioni Post-IA**:
- ✅ Nome giocatore obbligatorio
- ✅ Normalizza original_positions (array)
- ✅ Converte valori a numeri
- ✅ Limita array (skills, com_skills, boosters)

### Normalizzazione Dati

#### Funzione `normalizePlayer()` (`extract-player/route.js`)

**Processo**:
1. **Overall Rating**: Converte a number (toInt)
2. **Base Stats**: Normalizza attacking, defending, athleticism (tutti a number)
3. **Skills**: Limita a 40 elementi
4. **Com Skills**: Limita a 20 elementi
5. **AI Playstyles**: Limita a 10 elementi
6. **Boosters**: Limita a 10 elementi
7. **Original Positions**: Valida array, fallback a position principale

### Gestione Duplicati

#### Logica Duplicati (`save-player/route.js`)

**Criteri Matching**:
- **Nome**: Case-insensitive, trimmed
- **Età**: Se disponibile, deve corrispondere esattamente
- **Slot**: Controlla sia in campo che in riserve

**Controlli**:
1. **Se slot già occupato** → UPDATE (merge dati, non sovrascrive original_positions)
2. **Duplicati in Campo**: Verifica nome+età in titolari (escludendo slot corrente)
3. **Duplicati in Riserve**: Verifica nome+età in riserve

**Comportamento**:
- ✅ UPDATE se stesso slot → merge intelligente
- ❌ ERRORE se duplicato in altro slot campo
- ❌ ERRORE se duplicato in riserve (per nuovo inserimento)
- ✅ Elimina automaticamente duplicati riserve (per assegnazione)

### Gestione Posizioni Originali

#### Estrazione (`extract-player`)

**Prompt IA**:
```
POSIZIONI ORIGINALI (NUOVO - Guarda Mini-Campo in Alto a Destra):
- Guarda la sezione in alto a destra della card dove c'è un MINI-CAMPO diviso in zone
- Il mini-campo mostra le posizioni originali del giocatore evidenziate in VERDE
- Estrai TUTTE le zone evidenziate e mappale a posizioni:
  * Zone verdi brillanti = Alta competenza
  * Zone verdi sfumate = Intermedia competenza
  * Zone grigie = Bassa competenza o nessuna
- Mappa zone a posizioni standard (DC, TS, TD, CC, ESA, EDE, AMF, LWF, RWF, CF, SP)
```

**Output**:
```json
{
  "original_positions": [
    { "position": "AMF", "competence": "Alta" },
    { "position": "LWF", "competence": "Alta" },
    { "position": "RWF", "competence": "Intermedia" }
  ]
}
```

**Salvataggio**:
- ✅ Salva in campo `original_positions` (JSONB array)
- ✅ NON sovrascrive in UPDATE (mantiene originali)
- ✅ Fallback: se vuoto, usa position principale

**Utilizzo**:
- ✅ Mostrato in modal selezione posizioni
- ✅ Cliente può confermare/modificare
- ✅ Salvato con giocatore per analisi future

---

## 📊 FLUSSI COMPLETI - DIAGRAMMA

### Flusso Upload Giocatore a Slot

```
[Cliente] → [Frontend]
  ↓
[Click Slot → Modal Upload]
  ↓
[Carica 1-3 Immagini]
  ↓
[Loop: POST /api/extract-player per ogni immagine]
  ↓
[OpenAI GPT-4o Vision]
  ↓
[Estrazione Dati + Posizioni Originali]
  ↓
[Merge Dati Multi-Immagine]
  ↓
[Modal Selezione Posizioni Originali]
  ↓
[Cliente Conferma]
  ↓
[POST /api/supabase/save-player]
  ↓
[Controlli Duplicati]
  ↓
[INSERT/UPDATE in Supabase]
  ↓
[fetchData() - Ricarica senza reload]
  ↓
[Visualizzazione Giocatore nello Slot]
```

### Flusso Assegnazione da Riserve

```
[Cliente] → [Frontend]
  ↓
[Click Slot → Modal Assegna]
  ↓
[Seleziona Giocatore da Riserve]
  ↓
[PATCH /api/supabase/assign-player-to-slot]
  ↓
[Libera Slot Occupato (se presente)]
  ↓
[Controlli Duplicati]
  ↓
[Adatta Position Automaticamente]
  ↓
[UPDATE slot_index + position]
  ↓
[fetchData() - Ricarica senza reload]
  ↓
[Visualizzazione Giocatore nello Slot]
```

---

## 🎯 CARATTERISTICHE CHIAVE GESTIONE IA

### 1. Prompt Engineering Avanzato

**Formazione**:
- ✅ Mapping esplicito slot_index (0-10)
- ✅ Richiesta ESATTAMENTE 11 giocatori
- ✅ Estrazione formazione e descrizione volto

**Giocatore**:
- ✅ 30+ campi dati estratti
- ✅ Priorità: TABELLA statistiche
- ✅ **Posizioni Originali**: Istruzioni dettagliate mini-campo
- ✅ Descrizione volto per matching

### 2. Validazione Robusta

**Post-Estrazione**:
- ✅ Numero giocatori (11 per formazione)
- ✅ Slot_index univoci (0-10)
- ✅ Formato dati (rating, nome, formazione)
- ✅ Nome+età corrispondono tra immagini multiple

### 3. Merge Intelligente

**Multi-Immagine**:
- ✅ Prima immagine = dati base
- ✅ Immagini successive = merge (preferisce nuovi)
- ✅ Validazione: nome+età devono corrispondere
- ✅ Traccia photo_slots per sapere cosa è stato caricato

**Update Esistente**:
- ✅ Merge photo_slots (non sovrascrive)
- ✅ Merge base_stats (preferisce nuovi)
- ✅ Unisce skills/com_skills (rimuove duplicati)
- ✅ **NON sovrascrive original_positions** (mantiene originali)

### 4. Gestione Duplicati Intelligente

**Criteri**:
- ✅ Nome (case-insensitive) + Età (se disponibile)
- ✅ Controlla sia campo che riserve
- ✅ UPDATE se stesso slot
- ✅ ERRORE se duplicato in altro slot
- ✅ Elimina automaticamente duplicati riserve (per assegnazione)

### 5. Adattamento Position Automatico

**Logica**:
- ✅ Recupera `slotPosition` da `formation_layout`
- ✅ Se disponibile, adatta `position` automaticamente allo slot
- ✅ Mantiene `original_positions` (non sovrascrive)
- ✅ Fallback: usa position originale se slotPosition non disponibile

---

## ⚠️ PROBLEMI POTENZIALI IDENTIFICATI

### 1. Validazione Rating Rimossa

**Problema**: Commento nel codice indica che validazione rigida rating è stata rimossa:
```javascript
// Rimossa validazione rigida che bloccava dati validi (es. rating > 100 con boosters, stats > 99)
// Il sistema funzionava perfettamente il 21 gennaio senza queste validazioni
```

**Impatto**: Rating > 100 o stats > 99 potrebbero essere accettati (potrebbe essere corretto con boosters)

**Stato**: ⚠️ Intenzionale (commento indica che funzionava senza validazione)

---

### 2. Merge Dati Multi-Immagine

**Logica Attuale**:
- Prima immagine = base
- Immagini successive = merge (preferisce nuovi)

**Potenziale Problema**: Se prima immagine ha dati incompleti e seconda ha dati migliori, alcuni campi potrebbero essere persi.

**Stato**: ✅ Funzionante (merge preferisce nuovi dati)

---

### 3. Original Positions - Fallback

**Logica Attuale**:
```javascript
if (!normalizedPlayer.original_positions || normalizedPlayer.original_positions.length === 0) {
  if (normalizedPlayer.position) {
    normalizedPlayer.original_positions = [{ position: normalizedPlayer.position, competence: "Alta" }]
  }
}
```

**Potenziale Problema**: Se IA non estrae original_positions e position è NULL, original_positions sarà array vuoto.

**Stato**: ✅ Gestito (fallback a position principale)

---

### 4. Adattamento Position - Slot Position

**Logica Attuale**:
```javascript
position: slotPosition || player.position  // Adatta automaticamente
```

**Potenziale Problema**: Se `formation_layout` non è salvato, `slotPosition` sarà null e usa position originale.

**Stato**: ✅ Gestito (fallback a position originale)

---

## ✅ PUNTI DI FORZA

1. **Prompt Engineering Dettagliato**: Istruzioni chiare per IA
2. **Validazione Robusta**: Post-estrazione e pre-salvataggio
3. **Merge Intelligente**: Gestione multi-immagine e update
4. **Gestione Duplicati**: Controlli incrociati campo/riserve
5. **Adattamento Automatico**: Position adattata allo slot
6. **Posizioni Originali**: Estrazione dal mini-campo
7. **Descrizione Volto**: Per matching futuro
8. **Photo Slots Tracking**: Traccia quali foto sono state caricate

---

## 📝 RACCOMANDAZIONI

### Priorità Media

1. **Validazione Rating**: Verificare se rating > 100 è accettabile (con boosters potrebbe essere corretto)
2. **Merge Dati**: Considerare merge più intelligente (confronta completezza dati, non solo preferisci nuovi)
3. **Original Positions**: Verificare che IA estragga correttamente dal mini-campo (testare con screenshot reali)

### Priorità Bassa

4. **Caching**: Considerare cache dati estratti per evitare re-estrazione
5. **Batch Upload**: Considerare upload batch di più giocatori contemporaneamente

---

**Analisi completata**: 26 Gennaio 2026
