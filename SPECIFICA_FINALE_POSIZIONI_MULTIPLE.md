# 🎯 Specifica Finale: Posizioni Multiple Originali

**Data**: 24 Gennaio 2026  
**Stato**: ✅ **SPECIFICA DEFINITIVA**

---

## 💡 COMPORTAMENTO FINALE

### 1. **Adattamento Automatico Posizione**

**Quando**: Cliente sposta giocatore in slot (drag & drop o click)

**Cosa Succede**:
- `position` si adatta **automaticamente** alla posizione richiesta dallo slot
- Esempio: Slot richiede "DC" → `position = "DC"` (automatico)

**Nessuna Conferma**: Se posizione slot è tra quelle originali

---

### 2. **Conferma Solo se NON Originale**

**Quando**: Cliente sposta giocatore in posizione NON originale

**Cosa Succede**:
1. Sistema verifica se posizione slot è tra `original_positions`
2. Se NON è originale → Mostra alert/confirm
3. Alert mostra:
   - Posizioni originali del giocatore
   - Posizione slot richiesta
   - **Competenza** in quella posizione (Alta/Intermedia/Bassa/Nessuna)
   - Statistiche non ottimali (se rilevanti)
4. Cliente conferma → `position = slotPosition` (cliente si prende responsabilità)
5. Cliente annulla → Giocatore non viene spostato

---

### 3. **Card in Alto a Destra - Mini Campo**

**Riferimento**: Immagine card Ronaldinho mostra mini-campo diviso in zone

**Come Funziona**:
- Mini-campo mostra posizioni originali evidenziate in verde
- Zone verdi = Alta competenza
- Zone verdi sfumate = Intermedia competenza
- Zone grigie = Bassa competenza o nessuna

**Estrazione**:
- L'IA Vision deve estrarre tutte le zone evidenziate
- Mappare zone a posizioni (AMF, LWF, RWF, etc.)
- Determinare competenza basandosi su colore/intensità verde

---

### 4. **Responsabilità Cliente**

**Se Cliente Conferma**:
- Cliente si prende responsabilità
- Sistema accetta scelta (IA non critica)
- `position` viene adattata automaticamente
- IA usa posizione assegnata senza warning nel prompt

**Se Cliente Annulla**:
- Giocatore non viene spostato
- `position` rimane invariata

---

## 📊 ESEMPIO COMPLETO

### Scenario: Maldini (DC originale) → Slot P (Punta)

#### 1. **Cliente Sposta Maldini**

**Card Salvata**:
```javascript
{
  player_name: "Paolo Maldini",
  position: "DC",  // Posizione principale
  original_positions: [
    { position: "DC", competence: "Alta" },
    { position: "TS", competence: "Alta" }
  ]
}
```

**Slot Richiesto**: P (Punta)

---

#### 2. **Sistema Verifica**

```javascript
// Verifica se P è tra original_positions
const isOriginalPosition = originalPositions.some(
  op => op.position === "P"
)
// Risultato: false (P NON è originale)
```

---

#### 3. **Alert Conferma**

```
⚠️ Conferma Posizione

Paolo Maldini è DC, TS originale, ma lo stai spostando in slot P.

P NON è una posizione originale.
Competenza in P: Nessuna

Statistiche non ottimali per P:
- Finalizzazione: 45 (richiesto: 85+)
- Comportamento offensivo: 50 (richiesto: 85+)

Vuoi comunque usarlo come P? (Performance ridotta)

Se confermi, ti prendi la responsabilità e il sistema accetta la scelta.

[OK] [Annulla]
```

---

#### 4. **Se Cliente Conferma**

**Backend**:
```javascript
// assign-player-to-slot
{
  slot_index: 9,
  position: "P",  // Adattato automaticamente
  original_positions: [  // Mantiene originali
    { position: "DC", competence: "Alta" },
    { position: "TS", competence: "Alta" }
  ]
}
```

**Prompt IA**:
```
- [id] Paolo Maldini - Overall 102
  Posizione: P (in slot 9)
  (Posizioni originali: DC, TS)
```

**IMPORTANTE**: IA NON dice "ATTENZIONE" o "ERRORE" - accetta scelta cliente

---

#### 5. **Se Cliente Annulla**

**Risultato**:
- Giocatore non viene spostato
- `position` rimane "DC"
- `slot_index` rimane NULL

---

## 🆕 NUOVE FUNZIONALITÀ (24 Gennaio 2026)

### 1. **Sigla Ruolo Dinamica**
- ✅ Sigla ruolo (es. "CF", "SP", "ESA") appare sopra il nome durante drag
- ✅ Aggiornamento in tempo reale mentre si trascina il giocatore
- ✅ Feedback visivo immediato per il cliente

### 2. **Calcolo Dinamico Ruolo da Coordinate**
- ✅ Ruolo calcolato automaticamente da coordinate x,y sul campo
- ✅ Logica relativa per P vs SP: se ci sono più giocatori in attacco, il più avanzato (y minore) diventa "P", il secondo "SP"
- ✅ Fallback assoluto se < 2 giocatori in attacco

### 3. **Verifica Original Positions al Salvataggio Drag & Drop**
- ✅ Al salvataggio posizioni personalizzate, sistema verifica ogni giocatore spostato
- ✅ Se ruolo NON è tra `original_positions` → Alert bilingue (IT/EN)
- ✅ Alert: "Non mi risulta posso fare questo ruolo, aggiungi competenza?"
- ✅ Se cliente conferma → Aggiunge `{ position: newRole, competence: "Intermedia" }` a `original_positions`
- ✅ Aggiorna `player.position` in database

### 4. **Alert Bilingue Completi**
- ✅ Tutti gli alert tradotti in IT/EN
- ✅ Alert duplicati giocatori
- ✅ Alert posizione non originale
- ✅ Alert giocatori fuori ruolo
- ✅ Alert sostituzione riserve

---

## 🔧 IMPLEMENTAZIONE

### 1. Estrazione Mini-Campo Card

**File**: `app/api/extract-player/route.js`

**Prompt Modificato**:
```javascript
const prompt = `Analizza questo screenshot di eFootball e estrai TUTTI i dati visibili del giocatore.

IMPORTANTE:
- Estrai SOLO ciò che vedi nell'immagine (null se non visibile)
- Estrai TUTTI questi dati: nome giocatore, posizione, overall rating, team, card_type, base_stats, skills, com_skills, boosters, height, weight, age, nationality, level, form, role, playing_style, ai_playstyles, matches_played, goals, assists, weak_foot_frequency, weak_foot_accuracy, injury_resistance

POSIZIONI ORIGINALI (NUOVO - Guarda Mini-Campo in Alto a Destra):
- Guarda la sezione in alto a destra della card dove c'è un MINI-CAMPO diviso in zone
- Il mini-campo mostra le posizioni originali del giocatore evidenziate in VERDE
- Estrai TUTTE le zone evidenziate e mappale a posizioni:
  * Zone verdi brillanti = Alta competenza
  * Zone verdi sfumate = Intermedia competenza
  * Zone grigie = Bassa competenza o nessuna
- Mappa zone a posizioni standard:
  * Zona centrale difesa = DC
  * Zona sinistra difesa = TS
  * Zona destra difesa = TD
  * Zona centrale centrocampo = CC/CMF
  * Zona sinistra centrocampo = ESA
  * Zona destra centrocampo = EDE
  * Zona centrale attacco = AMF/TRQ
  * Zona sinistra attacco = LWF/CLS
  * Zona destra attacco = RWF/CLD
  * Zona centrale punta = CF/P
  * Zona laterale punta = SP

Formato JSON richiesto:
{
  "player_name": "Nome Completo",
  "position": "AMF",  // Posizione principale (quella più grande/centrale)
  "original_positions": [  // NUOVO: Array di posizioni originali dal mini-campo
    {
      "position": "AMF",
      "competence": "Alta"  // Alta, Intermedia, Bassa (basato su colore verde)
    },
    {
      "position": "LWF",
      "competence": "Alta"
    },
    {
      "position": "RWF",
      "competence": "Alta"
    }
  ],
  "overall_rating": 85,
  // ... resto dati ...
}

Restituisci SOLO JSON valido, senza altro testo.`
```

---

### 2. Frontend - Calcolo Ruolo Dinamico e Sigla

**File**: `app/gestione-formazione/page.jsx`

**Funzione `calculatePositionFromCoordinates`**:
```javascript
const calculatePositionFromCoordinates = (x, y, attackSlots = null) => {
  // y: 0-100 (0 = porta avversaria, 100 = nostra porta)
  // x: 0-100 (0 = sinistra, 100 = destra)
  
  // Portiere: y > 80
  if (y > 80) return 'PT'
  
  // Difesa: y 60-80
  if (y >= 60 && y <= 80) {
    if (x < 30) return 'TD'
    if (x > 70) return 'TS'
    return 'DC'
  }
  
  // Centrocampo: y 40-60
  if (y >= 40 && y <= 60) {
    if (x < 30) return 'EDE'
    if (x > 70) return 'ESA'
    if (y < 50) return 'AMF'
    return 'MED'
  }
  
  // Attacco: y < 40
  if (y < 40) {
    if (x < 30) return 'CLD'
    if (x > 70) return 'CLS'
    
    // Logica relativa P vs SP se ci sono più giocatori in attacco
    if (attackSlots && attackSlots.length > 1) {
      const sorted = [...attackSlots].sort((a, b) => a.y - b.y)
      const currentIndex = sorted.findIndex(s => Math.abs(s.x - x) < 5 && Math.abs(s.y - y) < 5)
      
      if (currentIndex === 0) return 'P'   // Più avanzato
      else if (currentIndex === 1) return 'SP'  // Secondo
      else return 'SP'  // Altri
    }
    
    // Fallback assoluto
    if (y < 25) return 'P'
    if (y < 35) return 'CF'
    return 'SP'
  }
  
  return 'MED'
}
```

**Visualizzazione Sigla Ruolo in `SlotCard`**:
```javascript
{/* Sigla ruolo sopra il nome */}
<div style={{ fontSize: 'clamp(8px, 0.9vw, 10px)', ... }}>
  {displayPosition}  // Es: "CF", "SP", "ESA"
</div>
{/* Nome giocatore */}
<div style={{ fontSize: 'clamp(10px, 1.1vw, 13px)', ... }}>
  {getDisplayName(player.player_name)}
</div>
```

**Funzione `handlePositionChange`**:
```javascript
const handlePositionChange = (slotIndex, newPosition) => {
  // Raccoglie tutti gli slot in attacco per logica relativa P vs SP
  const allSlotsInAttack = []
  // ... raccolta slot in attacco ...
  
  // Calcola nuovo ruolo con logica relativa
  const newRole = calculatePositionFromCoordinates(
    newPosition.x, 
    newPosition.y,
    allSlotsInAttack.length > 1 ? allSlotsInAttack : null
  )
  
  // Aggiorna customPositions con nuovo ruolo
  setCustomPositions(prev => ({
    ...prev,
    [slotIndex]: {
      ...newPosition,
      position: newRole
    }
  }))
}
```

**Funzione `handleSaveCustomPositions` - Verifica Original Positions**:
```javascript
const handleSaveCustomPositions = async () => {
  // ... merge posizioni ...
  
  // Verifica original_positions per ogni giocatore spostato
  for (const [slotIndex, customPos] of Object.entries(customPositions)) {
    const playerInSlot = titolari.find(p => p.slot_index === slotIdx)
    const newRole = newSlotPos.position
    
    const originalPositions = Array.isArray(playerInSlot.original_positions) 
      ? playerInSlot.original_positions
      : (playerInSlot.position ? [{ position: playerInSlot.position, competence: "Alta" }] : [])
    
    const isOriginalRole = originalPositions.some(
      op => op.position && op.position.toUpperCase() === newRole.toUpperCase()
    )
    
    if (!isOriginalRole && originalPositions.length > 0) {
      // Aggiunge a playersOutOfRole
    }
  }
  
  // Se ci sono giocatori fuori ruolo, mostra alert bilingue
  if (playersOutOfRole.length > 0) {
    const alertMessage = t('playersOutOfRoleAlert') + ...
    const confirmed = window.confirm(alertMessage)
    
    if (confirmed) {
      // Aggiunge competenza a original_positions
      await supabase
        .from('players')
        .update({ original_positions: updatedOriginalPositions })
        .eq('id', playerId)
    }
  }
  
  // Aggiorna position dei giocatori
  // ...
}
```

### 3. Frontend - Conferma con Competenza

**File**: `app/gestione-formazione/page.jsx`

**Modifica `handleAssignFromReserve`**:
```javascript
const handleAssignFromReserve = async (playerId) => {
  if (!selectedSlot || !supabase) return

  const playerToAssign = riserve.find(p => p.id === playerId)
  if (!playerToAssign) return

  // Recupera original_positions
  const originalPositions = Array.isArray(playerToAssign.original_positions) 
    ? playerToAssign.original_positions 
    : (playerToAssign.position ? [{ position: playerToAssign.position, competence: "Alta" }] : [])

  // Calcola posizione richiesta dallo slot
  const slotPosition = selectedSlot.position // "P"

  // Verifica se posizione slot è originale
  const isOriginalPosition = originalPositions.some(
    op => op.position && op.position.toUpperCase() === slotPosition.toUpperCase()
  )

  // Se NON è originale, chiedi conferma con competenza
  if (!isOriginalPosition && originalPositions.length > 0) {
    const originalPosList = originalPositions.map(op => op.position).join(', ')
    const stats = playerToAssign.base_stats || {}
    
    // Cerca competenza per posizione slot (se presente in original_positions ma non match esatto)
    // Se non trovata, competenza = "Nessuna"
    const competenceInfo = originalPositions.find(
      op => op.position && op.position.toUpperCase() === slotPosition.toUpperCase()
    )
    const competence = competenceInfo?.competence || "Nessuna"
    
    // Costruisci messaggio con statistiche rilevanti
    let statsWarning = ''
    if (slotPosition === 'DC' && stats.difesa) {
      statsWarning = `\nStatistiche non ottimali per ${slotPosition}:\n- Difesa: ${stats.difesa} (richiesto: 80+)\n`
    } else if (slotPosition === 'P' && stats.finalizzazione) {
      statsWarning = `\nStatistiche non ottimali per ${slotPosition}:\n- Finalizzazione: ${stats.finalizzazione} (richiesto: 85+)\n`
    }
    
    // Alert con warning e competenza
    const confirmMessage = `${playerToAssign.player_name} è ${originalPosList} originale, ma lo stai spostando in slot ${slotPosition}.\n\n` +
      `${slotPosition} NON è una posizione originale.\n` +
      `Competenza in ${slotPosition}: ${competence}\n` +
      statsWarning +
      `Vuoi comunque usarlo come ${slotPosition}? (Performance ridotta)\n\n` +
      `Se confermi, ti prendi la responsabilità e il sistema accetta la scelta.`
    
    const confirmed = window.confirm(confirmMessage)
    if (!confirmed) {
      // Annulla, non spostare giocatore
      return
    }
    // Se conferma, cliente si prende responsabilità → procedi
  }

  // Procedi con assegnazione (automatica se originale, confermata se non originale)
  setAssigning(true)
  setError(null)

  try {
    // ... resto codice assegnazione ...
  } catch (err) {
    // ... gestione errori ...
  }
}
```

---

### 3. Backend - Adatta Posizione Automaticamente

**File**: `app/api/supabase/assign-player-to-slot/route.js`

**Logica**:
- Adatta sempre `position` automaticamente allo slot
- Non serve ulteriore conferma (frontend ha già gestito)

---

### 4. Prompt IA - Accetta Scelta Cliente

**File**: `lib/countermeasuresHelper.js`

**Logica**:
- Se cliente ha confermato, IA accetta scelta
- NON dice "ATTENZIONE" o "ERRORE"
- Mostra solo info discreta: `(Posizioni originali: DC, TS)`

---

## ✅ CHECKLIST IMPLEMENTAZIONE

### Database
- [ ] Creare migrazione SQL per colonna `original_positions`
- [ ] Eseguire migrazione in Supabase Dashboard
- [ ] Verificare che colonna sia creata

### Estrazione
- [ ] Modificare prompt `extract-player` per estrarre mini-campo
- [ ] Mappare zone verdi a posizioni
- [ ] Determinare competenza (Alta/Intermedia/Bassa)
- [ ] Testare estrazione con card reale

### Salvataggio
- [ ] Modificare `save-player` per salvare `original_positions`
- [ ] Testare salvataggio

### Frontend Conferma
- [ ] Modificare `handleAssignFromReserve` per verificare posizioni
- [ ] Mostrare competenza nella conferma
- [ ] Gestire conferma/annulla
- [ ] Testare con posizione originale (nessuna conferma)
- [ ] Testare con posizione non originale (conferma)

### Backend Adattamento
- [ ] Modificare `assign-player-to-slot` per adattare `position`
- [ ] Testare adattamento automatico

### Prompt IA
- [ ] Modificare `countermeasuresHelper.js` per accettare scelta cliente
- [ ] NON dire "ATTENZIONE" se cliente ha confermato
- [ ] Testare generazione contromisure

---

## 🎯 CONCLUSIONE

**Comportamento Finale**:
1. ✅ Adattamento automatico `position` allo slot
2. ✅ Conferma solo se posizione NON originale
3. ✅ Mostra competenza nella conferma
4. ✅ Cliente si prende responsabilità se conferma
5. ✅ IA accetta scelta cliente (non critica)

**Risultato**: 
- Semplice per cliente (automatico per posizioni originali)
- Controllo quando necessario (conferma per posizioni non originali)
- Trasparente (cliente sa competenza prima di confermare)
- Responsabilità cliente (IA accetta scelta)

---

**Ultimo Aggiornamento**: 24 Gennaio 2026  
**Stato**: ✅ **SPECIFICA DEFINITIVA - IMPLEMENTATA E TESTATA**

---

## 📋 FUNZIONALITÀ IMPLEMENTATE

### ✅ Completate
1. ✅ Estrazione `original_positions` da mini-campo card
2. ✅ Salvataggio `original_positions` in database
3. ✅ Verifica posizioni originali durante assegnazione
4. ✅ Alert conferma per posizioni non originali
5. ✅ Adattamento automatico `position` allo slot
6. ✅ Reset `position` a originale quando rimuovi
7. ✅ **Sigla ruolo dinamica sopra nome durante drag**
8. ✅ **Calcolo dinamico ruolo da coordinate x,y**
9. ✅ **Logica relativa P vs SP per giocatori in attacco**
10. ✅ **Verifica original_positions al salvataggio drag & drop**
11. ✅ **Alert bilingue (IT/EN) per giocatori fuori ruolo**
12. ✅ **Aggiunta competenza automatica se confermato**
13. ✅ **Traduzioni complete per tutti gli alert**

### 🔄 In Evoluzione
- Nessuna funzionalità in evoluzione

---

## 🎯 ESEMPI COMPLETI

### Esempio 1: Drag & Drop con Sigla Ruolo

**Scenario**: Cliente trascina terzino (TD) da `{x: 25, y: 75}` a `{x: 50, y: 20}`

1. **Durante Drag**:
   - Sistema calcola: `y = 20` (< 40) → zona attacco
   - `x = 50` (centro) → posizione centrale
   - Se è il più avanzato → `position = "P"` (Punta)
   - **Sigla "P" appare sopra nome in tempo reale**

2. **Al Salvataggio**:
   - Sistema verifica: `original_positions = [{TD}, {TS}]`
   - `"P"` NON è tra originali → Alert bilingue
   - Cliente conferma → Aggiunge `{ position: "P", competence: "Intermedia" }`
   - Aggiorna `player.position = "P"` in database

### Esempio 2: Logica Relativa P vs SP

**Scenario**: Cliente vuole giocare con P, SP e ESA. Trascina terzino alto a metà campo.

1. **Giocatori in Attacco**:
   - Giocatore A: `{x: 50, y: 15}` → **P** (più avanzato)
   - Giocatore B: `{x: 50, y: 25}` → **SP** (secondo)
   - Terzino: `{x: 30, y: 45}` → **ESA** (centrocampo sinistro)

2. **Sistema Calcola**:
   - Raccoglie tutti gli slot con `y < 40`
   - Ordina per `y` (dal più avanzato)
   - Assegna ruoli relativi: P al primo, SP al secondo

---

**Ultimo Aggiornamento**: 24 Gennaio 2026  
**Stato**: ✅ **SPECIFICA DEFINITIVA - IMPLEMENTATA E TESTATA**
