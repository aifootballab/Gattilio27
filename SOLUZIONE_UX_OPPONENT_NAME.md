# 🎯 Soluzione UX - Identificazione Avversario nelle Partite

**Data**: 23 Gennaio 2026  
**Problema**: `opponent_name` è NULL → tutte le partite mostrano "Avversario sconosciuto"

---

## 🔍 ANALISI SITUAZIONE

### **Dati Disponibili**:

1. **Nome Cliente** (`user_profiles.team_name`):
   - ✅ Salvato nel profilo (es: "natural born game", "Fantattila")
   - ✅ Recuperato automaticamente in `save-match` → salvato in `matches.client_team_name`

2. **Dati Partita**:
   - ✅ `player_ratings.cliente` - Giocatori del cliente
   - ✅ `player_ratings.avversario` - Giocatori dell'avversario
   - ⚠️ `opponent_name` - NULL (non estratto)

3. **Dalle Immagini** (screenshot partita):
   - ✅ Nome cliente visibile (es: "Naturalborngamers.it")
   - ✅ Nome avversario visibile (es: "GONDİKLENDİNİZZZ <^=^>")
   - ⚠️ **NON viene estratto attualmente**

---

## 💡 SOLUZIONE PROPOSTA

### **Strategia a 3 Livelli**:

1. **Livello 1: Estrarre Nome Avversario dalle Immagini** ⭐ (PRIORITARIO)
   - Modificare prompt per estrarre nomi team dalle immagini
   - Salvare in `opponent_name` quando disponibile

2. **Livello 2: Identificatore Intelligente** (Fallback)
   - Se `opponent_name` non disponibile, usare: Risultato + Formazione + Stile
   - Già proposto in `PROPOSTA_UX_IDENTIFICAZIONE_PARTITE.md`

3. **Livello 3: Mostrare Nome Cliente** (Contesto)
   - Mostrare anche nome cliente per contesto: "vs [Avversario]" o "[Cliente] vs [Avversario]"

---

## 🎯 IMPLEMENTAZIONE

### **1. Modificare Prompt per Estrarre Nome Team**

**File**: `app/api/extract-match-data/route.js`

**Modifiche ai Prompt**:

#### **Prompt `player_ratings`**:
Aggiungere estrazione nomi team:

```javascript
- Se vedi i NOMI DEI TEAM/SQUADRE nell'immagine (es. "Naturalborngamers.it", "GONDİKLENDİNİZZZ <^=^>", "Orange County SC", "AC Milan"), estraili nel campo "team_names":
  * "client_team": nome della squadra del cliente (se visibile)
  * "opponent_team": nome della squadra avversaria (se visibile)
- Questi nomi sono spesso visibili vicino ai loghi delle squadre o nei tag giocatori
```

**Formato JSON Aggiornato**:
```json
{
  "result": "6-1",
  "team_names": {
    "client_team": "Naturalborngamers.it",
    "opponent_team": "GONDİKLENDİNİZZZ <^=^>"
  },
  "ratings": {
    "Nome Giocatore Cliente": {
      "rating": 8.5,
      "team": "cliente"
    }
  }
}
```

#### **Prompt `team_stats`**:
Aggiungere estrazione nomi team (se visibili):

```javascript
- Se vedi i NOMI DEI TEAM/SQUADRE nell'immagine, estraili nel campo "team_names"
```

#### **Prompt `formation_style`**:
Aggiungere estrazione nomi team (se visibili):

```javascript
- Se vedi i NOMI DEI TEAM/SQUADRE nell'immagine, estraili nel campo "team_names"
```

---

### **2. Salvare `opponent_name` in `save-match`**

**File**: `app/api/supabase/save-match/route.js`

**Logica**:
```javascript
// Estrai opponent_name dai dati estratti
let opponentName = null

// Priorità 1: Da matchData.opponent_name (se passato esplicitamente)
if (matchData.opponent_name) {
  opponentName = toText(matchData.opponent_name)
}

// Priorità 2: Da team_names.opponent_team (se estratto dalle immagini)
if (!opponentName && matchData.team_names?.opponent_team) {
  opponentName = toText(matchData.team_names.opponent_team)
}

// Priorità 3: Da extracted_data.team_names (se presente)
if (!opponentName && matchData.extracted_data?.team_names?.opponent_team) {
  opponentName = toText(matchData.extracted_data.team_names.opponent_team)
}

// Salva opponent_name
opponent_name: opponentName || null
```

---

### **3. UI Lista Partite - Identificatore Intelligente**

**File**: `app/page.jsx`

**Helper Function**:
```javascript
function getMatchDisplayName(match, clientTeamName, index) {
  // Priorità 1: opponent_name (se disponibile)
  if (match.opponent_name) {
    return match.opponent_name
  }
  
  // Priorità 2: Identificatore intelligente
  const parts = []
  
  if (match.result && match.result !== 'N/A') {
    parts.push(match.result)
  }
  
  if (match.formation_played) {
    parts.push(match.formation_played)
  }
  
  if (match.playing_style_played) {
    parts.push(match.playing_style_played)
  }
  
  if (parts.length === 0) {
    parts.push(`${t('match')} #${index + 1}`)
  }
  
  return parts.join(' • ')
}
```

**UI**:
```jsx
<div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--neon-orange)', marginBottom: '4px' }}>
  {clientTeamName && match.opponent_name 
    ? `${clientTeamName} vs ${match.opponent_name}`  // "natural born game vs GONDİKLENDİNİZZZ"
    : match.opponent_name 
    ? match.opponent_name  // Solo avversario
    : getMatchDisplayName(match, clientTeamName, index)  // Identificatore intelligente
  }
</div>
```

---

## 📋 MODIFICHE DETTAGLIATE

### **1. `app/api/extract-match-data/route.js`**

**Aggiungere a tutti i prompt** (player_ratings, team_stats, formation_style):

```javascript
- Se vedi i NOMI DEI TEAM/SQUADRE nell'immagine (vicino ai loghi, nei tag giocatori, o in altre parti dello schermo), estraili nel campo "team_names":
  * "client_team": nome della squadra del cliente (se visibile)
  * "opponent_team": nome della squadra avversaria (se visibile)
- Questi nomi aiutano a identificare la partita
- Se non visibili, lascia "team_names" null
```

**Normalizzazione**:
```javascript
function normalizeTeamNames(data) {
  if (!data || typeof data !== 'object') return null
  
  const teamNames = {}
  
  if (data.team_names) {
    if (data.team_names.client_team) {
      teamNames.client_team = String(data.team_names.client_team).trim()
    }
    if (data.team_names.opponent_team) {
      teamNames.opponent_team = String(data.team_names.opponent_team).trim()
    }
  }
  
  return Object.keys(teamNames).length > 0 ? teamNames : null
}
```

**Includere in `extractedData`**:
```javascript
extractedData = {
  ...parsedData,
  team_names: normalizeTeamNames(parsedData)
}
```

---

### **2. `app/api/supabase/save-match/route.js`**

**Aggiungere logica estrazione `opponent_name`**:

```javascript
// Estrai opponent_name dai dati estratti
let opponentName = null

// Priorità 1: Da matchData.opponent_name (se passato esplicitamente)
if (matchData.opponent_name) {
  opponentName = toText(matchData.opponent_name)
}

// Priorità 2: Da team_names.opponent_team (se estratto dalle immagini)
if (!opponentName && matchData.team_names?.opponent_team) {
  opponentName = toText(matchData.team_names.opponent_team)
}

// Priorità 3: Da extracted_data.team_names (se presente in dati raw)
if (!opponentName && matchData.extracted_data?.team_names?.opponent_team) {
  opponentName = toText(matchData.extracted_data.team_names.opponent_team)
}

// Salva in database
opponent_name: opponentName || null
```

---

### **3. `app/page.jsx` - Dashboard**

**Aggiungere helper function**:
```javascript
function getMatchDisplayName(match, clientTeamName, index) {
  // Priorità 1: opponent_name (se disponibile)
  if (match.opponent_name) {
    if (clientTeamName) {
      return `${clientTeamName} vs ${match.opponent_name}`
    }
    return match.opponent_name
  }
  
  // Priorità 2: Identificatore intelligente
  const parts = []
  
  if (match.result && match.result !== 'N/A') {
    parts.push(match.result)
  }
  
  if (match.formation_played) {
    parts.push(match.formation_played)
  }
  
  if (match.playing_style_played) {
    parts.push(match.playing_style_played)
  }
  
  if (parts.length === 0) {
    parts.push(`${t('match')} #${index + 1}`)
  }
  
  return parts.join(' • ')
}
```

**Modificare query per includere `client_team_name`**:
```javascript
const { data: matches } = await supabase
  .from('matches')
  .select('id, match_date, opponent_name, result, photos_uploaded, missing_photos, data_completeness, formation_played, playing_style_played, client_team_name')
  .eq('user_id', userId)
  .order('match_date', { ascending: false })
  .limit(10)
```

**Modificare UI**:
```jsx
const matchDisplayName = getMatchDisplayName(match, match.client_team_name || stats.teamName, index)

<div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--neon-orange)', marginBottom: '4px' }}>
  {matchDisplayName}
</div>
```

---

## ✅ VANTAGGI SOLUZIONE

1. **Estrae Nome Avversario**: Dalle immagini quando disponibile
2. **Fallback Intelligente**: Se nome non disponibile, usa identificatore
3. **Contesto Cliente**: Mostra anche nome cliente per chiarezza
4. **Retrocompatibilità**: Funziona anche con partite vecchie (senza nome)
5. **Coerente**: Usa dati già disponibili, non richiede modifiche database

---

## 🎨 ESEMPI UI FINALE

### **Con Nome Avversario Estratto**:
```
┌─────────────────────────────────────────┐
│ natural born game vs GONDİKLENDİNİZZZ  │ ← Nome cliente + avversario
│ 22 Gen 2026 • 16:15                     │
│ Risultato: 6-1                          │
│ ✓ Completa                              │
└─────────────────────────────────────────┘
```

### **Senza Nome Avversario (Fallback)**:
```
┌─────────────────────────────────────────┐
│ 6-1 • 4-2-1-3 • Contrattacco           │ ← Identificatore intelligente
│ 22 Gen 2026 • 16:15                     │
│ Risultato: 6-1                          │
│ ✓ Completa                              │
└─────────────────────────────────────────┘
```

### **Solo Risultato Disponibile**:
```
┌─────────────────────────────────────────┐
│ 6-1                                     │ ← Solo risultato
│ 22 Gen 2026 • 16:15                     │
│ Risultato: 6-1                          │
│ 2/5                                     │
└─────────────────────────────────────────┘
```

---

## 🚀 PRIORITÀ IMPLEMENTAZIONE

1. **Alta**: Modificare prompt per estrarre `team_names`
2. **Alta**: Salvare `opponent_name` in `save-match`
3. **Media**: Helper function `getMatchDisplayName()` in dashboard
4. **Media**: Modificare UI lista partite

---

**Raccomandazione**: Implementare tutte e 3 le modifiche per soluzione completa e robusta.
