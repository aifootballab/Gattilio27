# 🔍 AUDIT ENTERPRISE: Dati IA e Configurazione Output
**Data**: 24 Gennaio 2026  
**Problema**: IA inventa gol (es. "Messi ha fatto un gol" quando non ha segnato)

---

## 🚨 PROBLEMA CRITICO IDENTIFICATO

### **Causa Root: Dati Non Inclusi nel Prompt**

**File**: `app/api/analyze-match/route.js` (righe 289-330)

**Problema**:
```javascript
// ❌ SBAGLIATO: Solo conteggio, NON dati effettivi
if (matchData.player_ratings) {
  const ratingsCount = matchData.player_ratings.cliente 
    ? Object.keys(matchData.player_ratings.cliente).length 
    : Object.keys(matchData.player_ratings).length
  availableDataText += `- Pagelle Giocatori: ${ratingsCount} giocatori con voti\n`
  // ❌ MANCANO I DATI EFFETTIVI!
}
```

**Risultato**:
- L'IA vede solo: `"Pagelle Giocatori: 11 giocatori con voti"`
- L'IA NON vede: nomi giocatori, voti, goals, assists
- L'IA inventa dettagli basandosi su:
  - Nome giocatore nella rosa (se presente)
  - Conoscenza generale (es. "Messi segna spesso")
  - Pattern tipici (rating alto → probabilmente ha segnato)

---

## 📊 SEZIONE 1: ESTRAZIONE DATI PARTITA (`/api/extract-match-data`)

### 1.1 Dati Estratti

**File**: `app/api/extract-match-data/route.js`

#### **Step 1: Pagelle Giocatori** (`player_ratings`)

**Prompt AI** (righe 197-227):
```javascript
- Questa schermata mostra SOLO i VOTI (ratings) dei giocatori
- NON ci sono goals, assists o minuti giocati
- NON inventare dati che non vedi (goals, assists, minutes_played non sono visibili)
```

**Dati Estratti**:
```json
{
  "result": "6-1",
  "ratings": {
    "Messi": {
      "rating": 8.5,
      "team": "cliente"
    }
  }
}
```

**✅ Status**: 
- Prompt corretto: dice esplicitamente "NON inventare goals/assists"
- Estrazione corretta: solo `rating` e `team`
- Normalizzazione corretta: `normalizePlayerRatings()` estrae solo rating

**⚠️ Problema**: 
- I dati vengono estratti correttamente
- MA non vengono passati all'IA nel prompt di analisi!

---

#### **Step 2: Statistiche Squadra** (`team_stats`)

**Prompt AI** (righe 229-256):
```javascript
- Estrai: goals_scored, goals_conceded, possession, shots, etc.
```

**Dati Estratti**:
```json
{
  "result": "6-1",
  "goals_scored": 6,
  "goals_conceded": 1,
  "possession": 49,
  "shots": 16
}
```

**✅ Status**: 
- Estrazione corretta
- Include `goals_scored` e `goals_conceded` (gol squadra, NON per giocatore)

**⚠️ Problema**: 
- `goals_scored` è gol totali squadra
- L'IA potrebbe inferire "chi ha segnato" basandosi su rating alto

---

#### **Step 3-5: Altri Dati**

- `attack_areas`: Percentuali per zona
- `ball_recovery_zones`: Coordinate recuperi
- `formation_style`: Formazione, stile, forza

**✅ Status**: Estrazione corretta

---

### 1.2 Struttura Database Supabase

**Tabella `matches`**:
```sql
- player_ratings (JSONB): { cliente: { "Messi": { rating: 8.5 }, ... }, avversario: {...} }
- team_stats (JSONB): { goals_scored: 6, goals_conceded: 1, ... }
- goals_events (JSONB): NULL o array eventi gol (se presente)
- attack_areas (JSONB): { team1: { left: 46, center: 45, right: 9 } }
- ball_recovery_zones (JSONB): [{ x: 0.3, y: 0.5, team: "team1" }]
```

**✅ Status**: 
- Struttura corretta
- `goals_events` esiste ma potrebbe essere NULL/vuoto

**⚠️ Problema**: 
- `goals_events` non viene estratto automaticamente
- Non c'è step dedicato per eventi gol (chi ha segnato, quando, assist)

---

## 📊 SEZIONE 2: ANALISI AI PARTITA (`/api/analyze-match`)

### 2.1 Dati Recuperati da Supabase

**File**: `app/api/analyze-match/route.js` (righe 616-698)

**Dati Recuperati**:
1. ✅ `matchData` (da request body): `player_ratings`, `team_stats`, `attack_areas`, etc.
2. ✅ `userProfile`: nome, squadra, preferenze
3. ✅ `players` (rosa): max 50 giocatori con `player_name`, `position`, `overall_rating`, `skills`
4. ✅ `opponentFormation`: formazione avversaria
5. ✅ `playersInMatch`: disposizione reale giocatori in campo
6. ✅ `matchHistory`: ultimi 30 match
7. ✅ `tacticalPatterns`: pattern ricorrenti

**✅ Status**: Recupero dati corretto

---

### 2.2 Costruzione Prompt

**File**: `app/api/analyze-match/route.js` (riga 276: `generateAnalysisPrompt`)

#### **2.2.1 Sezione "DATI MATCH DISPONIBILI"** ❌ PROBLEMA CRITICO

**Codice Attuale** (righe 289-330):
```javascript
let availableDataText = ''

if (matchData.player_ratings) {
  const ratingsCount = Object.keys(matchData.player_ratings.cliente || matchData.player_ratings).length
  availableDataText += `- Pagelle Giocatori: ${ratingsCount} giocatori con voti\n`
  // ❌ NON include i dati effettivi!
}

if (matchData.team_stats) {
  const statsKeys = Object.keys(matchData.team_stats).filter(k => k !== 'result')
  availableDataText += `- Statistiche Squadra: ${statsKeys.length} statistiche disponibili\n`
  // ❌ NON include i valori effettivi!
}
```

**Risultato nel Prompt**:
```
DATI MATCH DISPONIBILI:
- Pagelle Giocatori: 11 giocatori con voti
- Statistiche Squadra: 15 statistiche disponibili
- Aree di Attacco: Disponibili
- Zone Recupero: 8 zone
- Formazione: 4-3-3
```

**❌ PROBLEMA CRITICO**: 
- L'IA vede solo **conteggi** e **nomi sezioni**
- L'IA NON vede i **dati effettivi**:
  - ❌ Non vede nomi giocatori
  - ❌ Non vede voti (ratings)
  - ❌ Non vede goals/assists (che comunque non esistono)
  - ❌ Non vede statistiche squadra (valori)
  - ❌ Non vede aree di attacco (percentuali)

**Perché l'IA inventa**:
1. L'IA vede "11 giocatori con voti" ma non sa chi sono
2. L'IA vede "Messi" nella rosa disponibile
3. L'IA vede "goals_scored: 6" (gol totali squadra)
4. L'IA inferisce: "Messi probabilmente ha segnato" (bias conoscenza generale)
5. L'IA inventa: "Messi ha fatto un gol"

---

#### **2.2.2 Sezione "ROSA DISPONIBILE"** ✅ CORRETTO

**Codice** (righe 367-382):
```javascript
if (players && players.length > 0) {
  rosterText = `\nROSA DISPONIBILE (${players.length} giocatori):\n`
  players.slice(0, 30).forEach((player, idx) => {
    rosterText += `${idx + 1}. ${player.player_name} - ${player.position} - Overall: ${player.overall_rating}\n`
  })
}
```

**✅ Status**: 
- Include nomi giocatori, posizioni, overall
- Include skills (prime 2-3)

**⚠️ Problema**: 
- Include giocatori dalla rosa generale
- NON include giocatori che hanno giocato la partita (se non sono nella rosa)
- NON include voti della partita per questi giocatori

---

#### **2.2.3 Sezione "DISPOSIZIONE REALE GIOCATORI"** ✅ PARZIALE

**Codice** (righe 384-400):
```javascript
if (playersInMatch && playersInMatch.length > 0) {
  playersInMatchText = `\nDISPOSIZIONE REALE GIOCATORI IN CAMPO (${playersInMatch.length}):\n`
  playersInMatch.forEach((player, idx) => {
    playersInMatchText += `${idx + 1}. ${player.name} - ${player.position} - Overall: ${player.overall_rating}\n`
  })
}
```

**✅ Status**: 
- Include nomi, posizioni, overall
- Include `slot_index` (posizione reale)

**⚠️ Problema**: 
- NON include voti (ratings) della partita
- NON include goals/assists (che non esistono comunque)

---

### 2.3 Istruzioni Prompt

**Prompt** (righe 475-545):
```javascript
ISTRUZIONI PER L'ANALISI:
1. Identifica chiaramente quale squadra è quella del cliente
2. DISPOSIZIONE REALE GIOCATORI: Usa players_in_match per analisi precisa
3. STORICO ANDAMENTO: Analizza pattern
4. Rispondi a queste domande:
   a) Come è andato il match?
   b) Quali giocatori hanno performato bene/male? (confronta pagelle con disposizione reale)
   c) Cosa ha funzionato?
   d) Cosa cambiare?
   e) Quali giocatori della rosa potrebbero essere utili?
```

**❌ PROBLEMA**: 
- Istruzione (b) dice "confronta pagelle"
- MA le pagelle NON sono incluse nel prompt!
- L'IA deve "inventare" o "inferire" le pagelle

---

## 📊 SEZIONE 3: CONTROMISURE (`/api/generate-countermeasures`)

### 3.1 Dati Recuperati

**File**: `app/api/generate-countermeasures/route.js`

**Dati Inclusi**:
1. ✅ Formazione avversaria completa
2. ✅ Rosa cliente (titolari + riserve)
3. ✅ Formazione cliente
4. ✅ Impostazioni tattiche
5. ✅ Allenatore attivo
6. ✅ Storico match (ultimi 50)
7. ✅ Performance giocatori contro formazioni simili

**✅ Status**: Dati completi

---

### 3.2 Prompt Contromisure

**File**: `lib/countermeasuresHelper.js` (riga 56: `generateCountermeasuresPrompt`)

**Dati Inclusi nel Prompt**:
- ✅ Formazione avversaria (nome, stile, forza)
- ✅ Titolari con nomi, posizioni, overall, skills
- ✅ Riserve con nomi, posizioni, overall, skills
- ✅ Storico match con risultati
- ✅ Performance giocatori contro formazioni simili (rating medio)

**✅ Status**: 
- Prompt completo
- Include dati effettivi (non solo conteggi)

**⚠️ Nota**: 
- Non include dati partita specifica (è per contromisure pre-partita)
- Include storico per analisi pattern

---

## 📊 SEZIONE 4: ESTRAZIONE GIOCATORE (`/api/extract-player`)

### 4.1 Dati Estratti

**File**: `app/api/extract-player/route.js`

**Prompt AI** (righe 143-225):
```javascript
- Estrai: goals, assists, matches_played
- Se vedi il volto del giocatore, indicane descrizione
```

**Dati Estratti**:
```json
{
  "player_name": "Messi",
  "position": "CF",
  "goals": 86,
  "assists": 37,
  "matches_played": 204
}
```

**✅ Status**: 
- Estrazione corretta
- Include goals/assists dalla card giocatore (statistiche carriera, NON partita specifica)

**⚠️ Nota**: 
- Questi sono dati **carriera** del giocatore
- NON sono dati della partita specifica
- Vengono salvati in `players.goals`, `players.assists` (statistiche carriera)

---

## 🚨 PROBLEMA ROOT CAUSE ANALYSIS

### **Perché l'IA Inventa "Messi ha fatto un gol"**

1. **Dati Non Inclusi**:
   - Prompt dice: "Pagelle Giocatori: 11 giocatori con voti"
   - Prompt NON include: nomi giocatori, voti, goals, assists

2. **Dati Disponibili ma Non Usati**:
   - `matchData.player_ratings` contiene: `{ "Messi": { rating: 8.5, team: "cliente" } }`
   - Questi dati NON vengono serializzati nel prompt

3. **Inferenza IA**:
   - L'IA vede "Messi" nella rosa disponibile
   - L'IA vede "goals_scored: 6" (gol totali squadra)
   - L'IA vede rating alto (se presente in rosa)
   - L'IA inferisce: "Messi probabilmente ha segnato" (bias conoscenza)
   - L'IA inventa: "Messi ha fatto un gol"

4. **Mancanza Istruzioni Esplicite**:
   - Prompt NON dice: "NON menzionare goals/assists specifici per giocatore"
   - Prompt NON dice: "Usa solo dati forniti, non inferire"

---

## ✅ SOLUZIONI PROPOSTE

### **Soluzione 1: Includere Dati Effettivi nel Prompt** (RACCOMANDATO)

**Modifica**: `app/api/analyze-match/route.js` (righe 289-330)

**Prima** (❌ SBAGLIATO):
```javascript
if (matchData.player_ratings) {
  const ratingsCount = Object.keys(matchData.player_ratings.cliente || matchData.player_ratings).length
  availableDataText += `- Pagelle Giocatori: ${ratingsCount} giocatori con voti\n`
}
```

**Dopo** (✅ CORRETTO):
```javascript
if (matchData.player_ratings) {
  const clienteRatings = matchData.player_ratings.cliente || {}
  const avversarioRatings = matchData.player_ratings.avversario || {}
  
  availableDataText += `\nPAGELLE GIOCATORI CLIENTE:\n`
  Object.entries(clienteRatings).forEach(([name, data]) => {
    availableDataText += `- ${name}: Rating ${data.rating || 'N/A'}\n`
  })
  
  if (Object.keys(avversarioRatings).length > 0) {
    availableDataText += `\nPAGELLE GIOCATORI AVVERSARIO:\n`
    Object.entries(avversarioRatings).forEach(([name, data]) => {
      availableDataText += `- ${name}: Rating ${data.rating || 'N/A'}\n`
    })
  }
  
  availableDataText += `\n⚠️ IMPORTANTE: Questi sono SOLO i VOTI (ratings). NON ci sono dati su goals, assists o minuti giocati per singolo giocatore.\n`
  availableDataText += `- NON inventare goals/assists per giocatori specifici\n`
  availableDataText += `- Usa solo i dati forniti sopra\n`
}
```

**Per `team_stats`**:
```javascript
if (matchData.team_stats) {
  availableDataText += `\nSTATISTICHE SQUADRA CLIENTE:\n`
  Object.entries(matchData.team_stats).forEach(([key, value]) => {
    if (key !== 'result') {
      availableDataText += `- ${key}: ${value}\n`
    }
  })
}
```

---

### **Soluzione 2: Istruzioni Esplicite Anti-Invenzione**

**Aggiungere al prompt** (riga 483):
```javascript
⚠️ REGOLE CRITICHE - NON INVENTARE DATI:
1. NON menzionare goals/assists per giocatori specifici a meno che non siano esplicitamente forniti
2. Se vedi "goals_scored: 6", questo è il totale squadra, NON per giocatore
3. Se vedi rating alto (es. 8.5), questo indica buona performance, NON necessariamente gol
4. Usa solo dati forniti esplicitamente sopra
5. Se non vedi dati su goals/assists per giocatore, NON inferirli o inventarli
6. Se non sei sicuro, usa frasi generiche: "ha performato bene" invece di "ha segnato un gol"
```

---

### **Soluzione 3: Estrazione Eventi Gol** (OPZIONALE - FUTURO)

**Aggiungere Step 6**: "Eventi Gol"
- Estrai screenshot con eventi gol (chi ha segnato, quando, assist)
- Salva in `matches.goals_events`
- Include nel prompt se disponibile

---

## 📋 AUDIT PER SEZIONE

### **SEZIONE A: Estrazione Dati Partita** (`/api/extract-match-data`)

| Dato | Estratto? | Incluso in Prompt Analisi? | Problema |
|------|-----------|---------------------------|----------|
| `player_ratings` (nomi + voti) | ✅ SÌ | ❌ NO (solo conteggio) | **CRITICO**: IA non vede dati |
| `team_stats` (valori) | ✅ SÌ | ❌ NO (solo conteggio) | **CRITICO**: IA non vede valori |
| `attack_areas` (percentuali) | ✅ SÌ | ❌ NO (solo "Disponibili") | **CRITICO**: IA non vede percentuali |
| `ball_recovery_zones` (coordinate) | ✅ SÌ | ❌ NO (solo conteggio) | **CRITICO**: IA non vede coordinate |
| `formation_style` | ✅ SÌ | ✅ SÌ (nome formazione) | ✅ OK |
| `result` | ✅ SÌ | ✅ SÌ | ✅ OK |
| `goals_events` | ❌ NO | ❌ NO | ⚠️ Non estratto |

**Verdetto**: ❌ **PROBLEMA CRITICO** - Dati estratti ma non inclusi nel prompt

---

### **SEZIONE B: Analisi AI Partita** (`/api/analyze-match`)

| Dato | Recuperato? | Incluso in Prompt? | Problema |
|------|-------------|-------------------|----------|
| `player_ratings` (dati effettivi) | ✅ SÌ | ❌ NO | **CRITICO**: Solo conteggio |
| `team_stats` (valori) | ✅ SÌ | ❌ NO | **CRITICO**: Solo conteggio |
| `attack_areas` | ✅ SÌ | ❌ NO | **CRITICO**: Solo "Disponibili" |
| `ball_recovery_zones` | ✅ SÌ | ❌ NO | **CRITICO**: Solo conteggio |
| `players` (rosa) | ✅ SÌ | ✅ SÌ (nomi, posizioni, overall) | ✅ OK |
| `playersInMatch` (disposizione) | ✅ SÌ | ✅ SÌ (nomi, posizioni, slot) | ✅ OK |
| `opponentFormation` | ✅ SÌ | ✅ SÌ (nome, stile, forza) | ✅ OK |
| `matchHistory` | ✅ SÌ | ✅ SÌ (risultati, formazioni) | ✅ OK |
| `userProfile` | ✅ SÌ | ✅ SÌ (nome, squadra) | ✅ OK |

**Verdetto**: ❌ **PROBLEMA CRITICO** - Dati match non inclusi, solo metadati

---

### **SEZIONE C: Contromisure** (`/api/generate-countermeasures`)

| Dato | Recuperato? | Incluso in Prompt? | Problema |
|------|-------------|-------------------|----------|
| `opponentFormation` | ✅ SÌ | ✅ SÌ (completo) | ✅ OK |
| `titolari` | ✅ SÌ | ✅ SÌ (nomi, posizioni, overall, skills) | ✅ OK |
| `riserve` | ✅ SÌ | ✅ SÌ (nomi, posizioni, overall, skills) | ✅ OK |
| `matchHistory` | ✅ SÌ | ✅ SÌ (risultati, formazioni) | ✅ OK |
| `playerPerformance` | ✅ SÌ | ✅ SÌ (rating medio per giocatore) | ✅ OK |

**Verdetto**: ✅ **OK** - Dati completi inclusi

---

### **SEZIONE D: Estrazione Giocatore** (`/api/extract-player`)

| Dato | Estratto? | Salvato? | Problema |
|------|-----------|----------|----------|
| `goals` (carriera) | ✅ SÌ | ✅ SÌ | ✅ OK (statistiche carriera) |
| `assists` (carriera) | ✅ SÌ | ✅ SÌ | ✅ OK (statistiche carriera) |
| `matches_played` | ✅ SÌ | ✅ SÌ | ✅ OK |

**Verdetto**: ✅ **OK** - Dati carriera corretti (non partita specifica)

---

## 🎯 RACCOMANDAZIONI IMMEDIATE

### **PRIORITÀ ALTA** 🔴

1. **Includere Dati Effettivi nel Prompt Analisi**:
   - Serializzare `player_ratings` completo (nomi + voti)
   - Serializzare `team_stats` completo (valori)
   - Serializzare `attack_areas` completo (percentuali)
   - Serializzare `ball_recovery_zones` completo (coordinate)

2. **Aggiungere Istruzioni Anti-Invenzione**:
   - "NON inventare goals/assists per giocatori specifici"
   - "Usa solo dati forniti esplicitamente"
   - "Se non vedi dati, usa frasi generiche"

3. **Validazione Output**:
   - Verificare che output non contenga affermazioni su goals/assists specifici
   - Se presente, filtrare o avvisare

---

### **PRIORITÀ MEDIA** 🟡

4. **Estrazione Eventi Gol** (futuro):
   - Aggiungere step per screenshot eventi gol
   - Estrarre chi ha segnato, quando, assist
   - Salvare in `matches.goals_events`

5. **Migliorare Prompt Estrazione**:
   - Rafforzare istruzioni "NON inventare" in `extract-match-data`

---

## 📊 CONFIGURAZIONE OUTPUT

### **Output Attuale**

**Formato JSON** (righe 516-541):
```json
{
  "player_performance": {
    "top_performers": [{
      "player_name": "...",
      "rating": 8.5,
      "reason": { "it": "...", "en": "..." }
    }]
  }
}
```

**✅ Status**: 
- Formato corretto
- Include `rating` (voto)
- NON include `goals` o `assists` (corretto)

**⚠️ Problema**: 
- L'IA può comunque menzionare goals/assists nel testo `reason`
- Non c'è validazione che filtri queste menzioni

---

## 🔧 IMPLEMENTAZIONE FIX

### **Fix 1: Includere Dati Effettivi**

**File**: `app/api/analyze-match/route.js`

**Modifica funzione `generateAnalysisPrompt`** (righe 289-330):

```javascript
// Prepara dati disponibili per il prompt
let availableDataText = ''

// ✅ FIX: Includi dati effettivi player_ratings
if (matchData.player_ratings) {
  const clienteRatings = matchData.player_ratings.cliente || {}
  const avversarioRatings = matchData.player_ratings.avversario || {}
  const allRatings = Object.keys(clienteRatings).length > 0 || Object.keys(avversarioRatings).length > 0
    ? null
    : matchData.player_ratings
  
  availableDataText += `\nPAGELLE GIOCATORI CLIENTE:\n`
  if (Object.keys(clienteRatings).length > 0) {
    Object.entries(clienteRatings).forEach(([name, data]) => {
      const rating = data.rating || data.rating_value || 'N/A'
      availableDataText += `- ${name}: Rating ${rating}\n`
    })
  } else if (allRatings) {
    Object.entries(allRatings).forEach(([name, data]) => {
      const rating = data.rating || data.rating_value || 'N/A'
      const team = data.team === 'cliente' ? ' (Cliente)' : data.team === 'avversario' ? ' (Avversario)' : ''
      availableDataText += `- ${name}: Rating ${rating}${team}\n`
    })
  } else {
    availableDataText += `- Nessun dato disponibile\n`
  }
  
  if (Object.keys(avversarioRatings).length > 0) {
    availableDataText += `\nPAGELLE GIOCATORI AVVERSARIO:\n`
    Object.entries(avversarioRatings).forEach(([name, data]) => {
      const rating = data.rating || data.rating_value || 'N/A'
      availableDataText += `- ${name}: Rating ${rating}\n`
    })
  }
  
  availableDataText += `\n⚠️ IMPORTANTE: Questi sono SOLO i VOTI (ratings) dei giocatori.\n`
  availableDataText += `- NON ci sono dati su goals, assists o minuti giocati per singolo giocatore.\n`
  availableDataText += `- NON inventare o inferire goals/assists per giocatori specifici.\n`
  availableDataText += `- Se vedi "goals_scored: 6", questo è il totale squadra, NON per giocatore.\n`
  availableDataText += `- Usa solo i dati forniti sopra. Se non vedi dati su goals/assists, NON menzionarli.\n`
} else {
  availableDataText += '- Pagelle Giocatori: Non disponibile\n'
}

// ✅ FIX: Includi dati effettivi team_stats
if (matchData.team_stats) {
  availableDataText += `\nSTATISTICHE SQUADRA CLIENTE:\n`
  Object.entries(matchData.team_stats).forEach(([key, value]) => {
    if (key !== 'result' && value != null) {
      availableDataText += `- ${key}: ${value}\n`
    }
  })
  
  availableDataText += `\n⚠️ IMPORTANTE: "goals_scored" e "goals_conceded" sono totali squadra, NON per giocatore.\n`
} else {
  availableDataText += '- Statistiche Squadra: Non disponibile\n'
}

// ✅ FIX: Includi dati effettivi attack_areas
if (matchData.attack_areas) {
  availableDataText += `\nAREE DI ATTACCO:\n`
  if (matchData.attack_areas.team1) {
    availableDataText += `Squadra Cliente:\n`
    availableDataText += `- Sinistra: ${matchData.attack_areas.team1.left || 0}%\n`
    availableDataText += `- Centro: ${matchData.attack_areas.team1.center || 0}%\n`
    availableDataText += `- Destra: ${matchData.attack_areas.team1.right || 0}%\n`
  }
  if (matchData.attack_areas.team2) {
    availableDataText += `Avversario:\n`
    availableDataText += `- Sinistra: ${matchData.attack_areas.team2.left || 0}%\n`
    availableDataText += `- Centro: ${matchData.attack_areas.team2.center || 0}%\n`
    availableDataText += `- Destra: ${matchData.attack_areas.team2.right || 0}%\n`
  }
} else {
  availableDataText += '- Aree di Attacco: Non disponibile\n'
}

// ✅ FIX: Includi dati effettivi ball_recovery_zones
if (matchData.ball_recovery_zones && Array.isArray(matchData.ball_recovery_zones) && matchData.ball_recovery_zones.length > 0) {
  availableDataText += `\nZONE RECUPERO PALLA (${matchData.ball_recovery_zones.length} zone):\n`
  matchData.ball_recovery_zones.slice(0, 10).forEach((zone, idx) => {
    const team = zone.team === 'team1' || zone.team === 'cliente' ? 'Cliente' : 'Avversario'
    availableDataText += `- Zona ${idx + 1}: ${team} (x: ${zone.x?.toFixed(2) || 'N/A'}, y: ${zone.y?.toFixed(2) || 'N/A'})\n`
  })
  if (matchData.ball_recovery_zones.length > 10) {
    availableDataText += `... e altre ${matchData.ball_recovery_zones.length - 10} zone\n`
  }
} else {
  availableDataText += '- Zone Recupero: Non disponibile\n'
}
```

---

### **Fix 2: Istruzioni Esplicite Anti-Invenzione**

**Aggiungere al prompt** (dopo riga 482):

```javascript
⚠️ REGOLE CRITICHE - NON INVENTARE DATI:
1. NON menzionare goals/assists per giocatori specifici a meno che non siano esplicitamente forniti nei dati sopra
2. Se vedi "goals_scored: 6" nelle statistiche squadra, questo è il TOTALE squadra, NON per giocatore
3. Se vedi rating alto (es. 8.5), questo indica buona performance generale, NON necessariamente gol
4. Usa SOLO i dati forniti esplicitamente sopra. NON inferire o inventare dettagli
5. Se non vedi dati su goals/assists per giocatore, usa frasi generiche:
   - ✅ CORRETTO: "Messi ha performato molto bene (rating 8.5)"
   - ❌ SBAGLIATO: "Messi ha fatto un gol"
6. Se non sei sicuro, usa descrizioni generiche di performance invece di dettagli specifici
```

---

## 📋 CHECKLIST FIX

### **Immediato** 🔴
- [ ] Modificare `generateAnalysisPrompt` per includere dati effettivi `player_ratings`
- [ ] Modificare `generateAnalysisPrompt` per includere dati effettivi `team_stats`
- [ ] Modificare `generateAnalysisPrompt` per includere dati effettivi `attack_areas`
- [ ] Modificare `generateAnalysisPrompt` per includere dati effettivi `ball_recovery_zones`
- [ ] Aggiungere istruzioni esplicite anti-invenzione nel prompt
- [ ] Testare che l'IA non inventi più goals/assists

### **Futuro** 🟡
- [ ] Aggiungere step estrazione eventi gol (chi ha segnato, quando, assist)
- [ ] Validazione output per filtrare menzioni di goals/assists non supportati
- [ ] Logging quando l'IA menziona dati non forniti

---

**Data Audit**: 24 Gennaio 2026  
**Versione**: 1.0  
**Status**: 🚨 **PROBLEMA CRITICO IDENTIFICATO - FIX RICHIESTO**
