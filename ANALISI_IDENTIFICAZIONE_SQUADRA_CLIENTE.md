# 🔍 Analisi: Identificazione Squadra Cliente nel Match Post-Partita

**Data**: 26 Gennaio 2026  
**Obiettivo**: Capire come il sistema identifica quale squadra è quella del cliente durante l'inserimento match  
**Status**: 📋 **ANALISI COMPLETATA** - Problemi identificati

---

## 📊 FLUSSO ATTUALE

### **1. Wizard Inserimento Match (`/match/new`)**

**Cosa fa l'utente**:
- Inserisce solo `opponent_name` (nome avversario) - campo opzionale
- Carica 5 screenshot (player_ratings, team_stats, attack_areas, ball_recovery_zones, formation_style)
- **NON specifica esplicitamente quale squadra è la sua**

**Cosa viene salvato**:
```javascript
// app/match/new/page.jsx (riga 264-282)
const matchData = {
  result: matchResult,
  opponent_name: opponentName.trim() || null,  // Solo nome avversario
  player_ratings: stepData.player_ratings || null,
  team_stats: stepData.team_stats || null,
  // ... altri dati
}
```

**Problema**: Non c'è campo per `client_team_name` nel wizard.

---

### **2. Estrazione Dati (`/api/extract-match-data`)**

**Come identifica la squadra cliente**:

```javascript
// app/api/extract-match-data/route.js (riga 347-363)

// 1. Recupera team_name da user_profiles
const { data: profile } = await admin
  .from('user_profiles')
  .select('team_name, favorite_team, first_name, last_name')
  .eq('user_id', userId)
  .maybeSingle()

const userTeamInfo = {
  team_name: profile.team_name,  // ← Usa questo per identificare
  favorite_team: profile.favorite_team,
  name: profile.first_name
}

// 2. Passa hint all'IA per identificare squadra cliente
const teamHint = `
IDENTIFICAZIONE SQUADRA CLIENTE:
- Nome squadra cliente: "${userTeamInfo.team_name}"
- La squadra del cliente potrebbe corrispondere a uno di questi nomi o essere simile.
- L'altra squadra è l'avversario.
`

// 3. L'IA distingue nei player_ratings
// app/api/extract-match-data/route.js (riga 46-54)
const team = String(playerData.team || '').toLowerCase()
if (team.includes('cliente') || team === 'cliente' || team === 'team1') {
  clienteRatings[playerName] = playerRating
} else if (team.includes('avversario') || team === 'avversario' || team === 'opponent' || team === 'team2') {
  avversarioRatings[playerName] = playerRating
}
```

**Funziona se**:
- ✅ `user_profiles.team_name` è impostato
- ✅ L'IA riesce a identificare la squadra nei dati estratti

**Non funziona se**:
- ❌ `user_profiles.team_name` è NULL/vuoto
- ❌ Il nome squadra nei dati non corrisponde a `team_name`
- ❌ L'IA non riesce a distinguere tra le due squadre

---

### **3. Salvataggio Match (`/api/supabase/save-match`)**

**Come recupera il nome squadra cliente**:

```javascript
// app/api/supabase/save-match/route.js (riga 260-284)

// 1. Prova a recuperare da user_profiles
let clientTeamName = null
try {
  const { data: userProfile } = await admin
    .from('user_profiles')
    .select('team_name')
    .eq('user_id', userId)
    .maybeSingle()
  
  clientTeamName = userProfile?.team_name
  
  // 2. Fallback: prova da coaches.team
  if (!clientTeamName) {
    const { data: activeCoach } = await admin
      .from('coaches')
      .select('team')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle()
    clientTeamName = activeCoach?.team
  }
} catch (err) {
  console.warn('[save-match] Error retrieving team_name:', err)
  // Non blocca salvataggio se errore
}

// 3. Salva in matches.client_team_name
const insertData = {
  // ...
  client_team_name: toText(clientTeamName) || toText(matchData.client_team_name) || null,
  // ...
}
```

**Problema**: Se `user_profiles.team_name` è NULL e `coaches.team` è NULL, `client_team_name` sarà NULL.

---

### **4. Analisi Match (`/api/analyze-match`)**

**Come usa il nome squadra cliente**:

```javascript
// app/api/analyze-match/route.js (riga 627-631)

// Identifica squadra cliente e avversario
const clientTeamName = userProfile?.team_name || matchData.client_team_name || null
const clientTeamText = clientTeamName 
  ? `\nSQUADRA CLIENTE: ${clientTeamName}\n` 
  : `\nSQUADRA CLIENTE: Identifica quale squadra è quella del cliente confrontando i nomi squadra nei dati match.\n`

const opponentName = matchData.opponent_name && typeof matchData.opponent_name === 'string' 
  ? String(matchData.opponent_name).trim() 
  : null
const opponentNameText = opponentName ? `\nAVVERSARIO: ${opponentName}\n` : ''
```

**Nel prompt IA** (riga 727):
```
1. Identifica chiaramente quale squadra è quella del cliente${clientTeamName ? ` (${clientTeamName})` : ''} 
   e analizza le sue performance (non quelle dell'avversario)
```

**Problema**: Se `clientTeamName` è NULL, l'IA deve "indovinare" quale squadra è quella del cliente.

---

## ❌ PROBLEMI IDENTIFICATI

### **Problema 1: Dipendenza da `user_profiles.team_name`**

**Situazione**:
- Il sistema dipende completamente da `user_profiles.team_name` per identificare la squadra cliente
- Se questo campo è NULL/vuoto, il sistema non sa quale squadra è quella del cliente

**Impatto**:
- ❌ L'IA potrebbe confondere cliente e avversario
- ❌ Analisi match potrebbero essere errate
- ❌ Statistiche potrebbero essere attribuite alla squadra sbagliata

---

### **Problema 2: Nessun Campo Esplicito nel Wizard**

**Situazione**:
- Nel wizard match (`/match/new`), l'utente inserisce solo `opponent_name`
- Non c'è campo per specificare esplicitamente quale squadra è la sua

**Impatto**:
- ❌ L'utente non può correggere se il sistema identifica male
- ❌ Se `team_name` è sbagliato nel profilo, tutti i match saranno errati

---

### **Problema 3: Identificazione Automatica Non Affidabile**

**Situazione**:
- L'IA deve "indovinare" quale squadra è quella del cliente confrontando nomi
- Se i nomi non corrispondono esattamente, può sbagliare

**Esempio**:
- `user_profiles.team_name` = "Natural Born Game"
- Dati estratti: "Natural Born Game FC" o "NBG" o "Natural Born"
- L'IA potrebbe non riconoscerli come la stessa squadra

---

### **Problema 4: Fallback Insufficiente**

**Situazione**:
- Fallback: `coaches.team` se `user_profiles.team_name` è NULL
- Ma se anche `coaches.team` è NULL, `client_team_name` rimane NULL

**Impatto**:
- ❌ Match salvati senza identificazione squadra cliente
- ❌ Analisi match potrebbero essere errate

---

## ✅ SOLUZIONE PROPOSTA: Casa/Fuori Casa

### **Approccio: Chiedere Solo "Casa" o "Fuori Casa"**

**Perché questa soluzione**:
- ✅ **Non chiediamo informazioni che dovremmo già sapere** (nome squadra cliente)
- ✅ **Domanda naturale e semplice** per il cliente
- ✅ **Deduzione automatica**: se è casa → team1 è cliente, se è fuori → team2 è cliente
- ✅ **Esempio**: "attila vs gio" → se attila è casa, attila è cliente; se attila è fuori, gio è cliente

**Come funziona**:
1. Cliente seleziona "Casa" o "Fuori Casa" nel wizard
2. Sistema salva `is_home` (true/false)
3. Durante estrazione: se `is_home = true` → team1/cliente = prima squadra nei dati
4. Durante estrazione: se `is_home = false` → team2/cliente = seconda squadra nei dati

---

### **Implementazione**

#### **1. Aggiungere Campo "Casa/Fuori Casa" nel Wizard**

```jsx
// app/match/new/page.jsx

// Aggiungere stato
const [isHome, setIsHome] = React.useState(true) // Default: casa

// Aggiungere nel form (vicino a opponent_name)
<div style={{ marginBottom: '16px' }}>
  <label style={{
    display: 'block',
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--neon-blue)',
    marginBottom: '8px'
  }}>
    {t('matchVenueLabel')} <span style={{ opacity: 0.6, fontWeight: 400 }}>({t('required')})</span>
  </label>
  <div style={{ display: 'flex', gap: '12px' }}>
    <button
      type="button"
      onClick={() => setIsHome(true)}
      style={{
        flex: 1,
        padding: '12px',
        background: isHome ? 'rgba(0, 212, 255, 0.2)' : 'rgba(0, 212, 255, 0.1)',
        border: `2px solid ${isHome ? 'rgba(0, 212, 255, 0.6)' : 'rgba(0, 212, 255, 0.3)'}`,
        borderRadius: '8px',
        color: '#00d4ff',
        fontSize: '14px',
        fontWeight: isHome ? 600 : 400,
        cursor: 'pointer',
        transition: 'all 0.2s ease'
      }}
    >
      🏠 {t('home')}
    </button>
    <button
      type="button"
      onClick={() => setIsHome(false)}
      style={{
        flex: 1,
        padding: '12px',
        background: !isHome ? 'rgba(0, 212, 255, 0.2)' : 'rgba(0, 212, 255, 0.1)',
        border: `2px solid ${!isHome ? 'rgba(0, 212, 255, 0.6)' : 'rgba(0, 212, 255, 0.3)'}`,
        borderRadius: '8px',
        color: '#00d4ff',
        fontSize: '14px',
        fontWeight: !isHome ? 600 : 400,
        cursor: 'pointer',
        transition: 'all 0.2s ease'
      }}
    >
      ✈️ {t('away')}
    </button>
  </div>
  <div style={{
    fontSize: '12px',
    opacity: 0.7,
    marginTop: '4px',
    color: '#00d4ff'
  }}>
    {t('matchVenueHint')}
  </div>
</div>

// Includere in matchData quando salvi
const matchData = {
  result: matchResult,
  opponent_name: opponentName.trim() || null,
  is_home: isHome, // ← NUOVO: Casa o Fuori Casa
  // ... altri dati
}
```

**Traduzioni da aggiungere** (`lib/i18n.js`):
```javascript
it: {
  matchVenueLabel: 'Dove hai giocato?',
  home: 'Casa',
  away: 'Fuori Casa',
  matchVenueHint: 'Seleziona se hai giocato in casa o fuori casa. Questo aiuta a identificare quale squadra sei tu nei dati della partita.',
  required: 'obbligatorio'
},
en: {
  matchVenueLabel: 'Where did you play?',
  home: 'Home',
  away: 'Away',
  matchVenueHint: 'Select if you played at home or away. This helps identify which team is yours in the match data.',
  required: 'required'
}
```

---

#### **2. Aggiornare Estrazione Dati (`/api/extract-match-data`)**

**Passare `is_home` all'IA per identificare squadra cliente**:

```javascript
// app/api/extract-match-data/route.js

// Nel prompt per player_ratings (riga 197-209)
function getPromptForSection(section, userTeamInfo = null, isHome = true) {
  // Costruisci hint per identificare squadra cliente basato su is_home
  let teamHint = ''
  if (isHome !== null) {
    teamHint = `
IDENTIFICAZIONE SQUADRA CLIENTE:
- Il cliente ha giocato ${isHome ? 'IN CASA' : 'FUORI CASA'}
- ${isHome ? 'La PRIMA squadra (team1) nei dati è quella del CLIENTE' : 'La SECONDA squadra (team2) nei dati è quella del CLIENTE'}
- ${isHome ? 'La SECONDA squadra (team2) è l\'AVVERSARIO' : 'La PRIMA squadra (team1) è l\'AVVERSARIO'}
- Per ogni giocatore, identifica se appartiene a team1 o team2 e etichetta come "cliente" o "avversario" di conseguenza
`
  }
  
  // ... resto del prompt
}

// Aggiornare chiamata extract-match-data per passare is_home
// Nel wizard, quando chiami extract-match-data, passa is_home
const extractRes = await fetch('/api/extract-match-data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    section: section,
    image: imageDataUrl,
    is_home: isHome // ← NUOVO: passa is_home
  })
})
```

**Aggiornare normalizzazione player_ratings**:

```javascript
// app/api/extract-match-data/route.js (riga 14-70)

function normalizePlayerRatings(data, isHome = true) {
  // ... codice esistente ...
  
  // Identifica se è cliente o avversario basato su is_home
  const team = String(playerData.team || '').toLowerCase()
  
  // Se l'IA ha già etichettato come cliente/avversario, usa quello
  if (team.includes('cliente') || team === 'cliente') {
    clienteRatings[playerName] = playerRating
  } else if (team.includes('avversario') || team === 'avversario' || team === 'opponent') {
    avversarioRatings[playerName] = playerRating
  } 
  // Altrimenti, usa is_home per dedurre
  else if (team === 'team1' || team.includes('team1') || team.includes('first')) {
    // team1 = cliente se casa, avversario se fuori
    if (isHome) {
      clienteRatings[playerName] = playerRating
    } else {
      avversarioRatings[playerName] = playerRating
    }
  } else if (team === 'team2' || team.includes('team2') || team.includes('second')) {
    // team2 = cliente se fuori, avversario se casa
    if (isHome) {
      avversarioRatings[playerName] = playerRating
    } else {
      clienteRatings[playerName] = playerRating
    }
  } else {
    // Fallback: metti in ratings generale (compatibilità retroattiva)
    ratings[playerName] = playerRating
  }
}
```

---

#### **3. Aggiornare Salvataggio Match (`/api/supabase/save-match`)**

**Usare `is_home` per determinare `client_team_name`**:

```javascript
// app/api/supabase/save-match/route.js (riga 260-349)

// 1. Recupera is_home da matchData
const isHome = typeof matchData.is_home === 'boolean' ? matchData.is_home : true // Default: casa

// 2. Determina client_team_name dai dati estratti usando is_home
let clientTeamName = null

// Se player_ratings ha struttura cliente/avversario, estrai nome squadra
if (matchData.player_ratings) {
  if (matchData.player_ratings.cliente && Object.keys(matchData.player_ratings.cliente).length > 0) {
    // Cerca nome squadra nei dati estratti (se disponibile)
    // Potrebbe essere in extracted_data o dedotto da team_stats
    // Per ora, usa team_name da user_profiles come fallback
  }
}

// 3. Fallback: recupera da user_profiles (solo se non trovato nei dati)
if (!clientTeamName) {
  try {
    const { data: userProfile } = await admin
      .from('user_profiles')
      .select('team_name')
      .eq('user_id', userId)
      .maybeSingle()
    
    clientTeamName = userProfile?.team_name
    
    // Fallback: prova da coaches.team
    if (!clientTeamName) {
      const { data: activeCoach } = await admin
        .from('coaches')
        .select('team')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle()
      clientTeamName = activeCoach?.team
    }
  } catch (err) {
    console.warn('[save-match] Error retrieving team_name:', err)
  }
}

// 4. Salva is_home e client_team_name
const insertData = {
  // ...
  is_home: isHome, // ← NUOVO: salva casa/fuori
  client_team_name: toText(clientTeamName) || null,
  // ...
}
```

---

#### **4. Aggiornare Analisi Match (`/api/analyze-match`)**

**Usare `is_home` per identificare squadra cliente**:

```javascript
// app/api/analyze-match/route.js (riga 627-631)

// Identifica squadra cliente usando is_home
const isHome = matchData.is_home !== undefined ? matchData.is_home : true // Default: casa

// Se is_home = true → team1 è cliente, team2 è avversario
// Se is_home = false → team2 è cliente, team1 è avversario
const clientTeamText = isHome
  ? `\nSQUADRA CLIENTE: La PRIMA squadra (team1) nei dati è quella del CLIENTE (hai giocato in casa).\n`
  : `\nSQUADRA CLIENTE: La SECONDA squadra (team2) nei dati è quella del CLIENTE (hai giocato fuori casa).\n`

const opponentName = matchData.opponent_name && typeof matchData.opponent_name === 'string' 
  ? String(matchData.opponent_name).trim() 
  : null
const opponentNameText = opponentName ? `\nAVVERSARIO: ${opponentName}\n` : ''
```

**Nel prompt IA** (riga 727):
```
1. Identifica chiaramente quale squadra è quella del cliente${isHome ? ' (team1 - hai giocato in casa)' : ' (team2 - hai giocato fuori casa)'} 
   e analizza le sue performance (non quelle dell'avversario)
```

---

### **Vantaggi Soluzione "Casa/Fuori Casa"**

- ✅ **Non chiediamo informazioni che dovremmo già sapere** (nome squadra cliente)
- ✅ **Domanda naturale e semplice** per il cliente
- ✅ **Deduzione automatica**: sistema sa sempre quale squadra è quella del cliente
- ✅ **Funziona sempre**: non dipende da matching nomi o `user_profiles.team_name`
- ✅ **Esempio chiaro**: "attila vs gio" → se attila è casa, attila è cliente; se attila è fuori, gio è cliente

---

### **Soluzione 2: Migliorare Identificazione Automatica (Priorità Bassa)**

**Migliorare matching nomi**:
```javascript
// Funzione per matching fuzzy
function matchTeamName(extractedName, profileName) {
  // Normalizza nomi (rimuovi spazi, lowercase, abbreviazioni)
  const normalize = (name) => name.toLowerCase().replace(/\s+/g, '').replace(/fc|cf|ac|as/g, '')
  
  const extracted = normalize(extractedName)
  const profile = normalize(profileName)
  
  // Match esatto
  if (extracted === profile) return true
  
  // Match parziale (contiene)
  if (extracted.includes(profile) || profile.includes(extracted)) return true
  
  // Match abbreviazioni (es. "NBG" = "Natural Born Game")
  // ...
  
  return false
}
```

**Vantaggi**:
- ✅ Migliora identificazione automatica
- ✅ Riduce errori quando nomi non corrispondono esattamente

---

### **Soluzione 3: Validazione e Warning (Priorità Media)**

**Mostrare warning se identificazione incerta**:
```jsx
// Se client_team_name è NULL o non corrisponde ai dati
<Alert type="warning">
  ⚠️ Non sono riuscito a identificare la tua squadra automaticamente.
  Per favore, seleziona quale squadra è la tua:
  - [ ] Squadra A
  - [ ] Squadra B
</Alert>
```

**Vantaggi**:
- ✅ L'utente sa quando l'identificazione è incerta
- ✅ Può correggere prima di salvare

---

## 📋 CHECKLIST IMPLEMENTAZIONE

### **Priorità Alta**

- [ ] **Aggiungere campo "Casa/Fuori Casa" nel wizard match**
  - [ ] Aggiungere stato `isHome` nel componente (default: true)
  - [ ] Aggiungere toggle/button "Casa" / "Fuori Casa" nel form
  - [ ] Aggiungere traduzioni i18n (matchVenueLabel, home, away, matchVenueHint)
  - [ ] Passare `is_home` a `save-match` in matchData
  - [ ] Salvare `is_home` in localStorage per persistenza

- [ ] **Aggiornare estrazione dati (`/api/extract-match-data`)**
  - [ ] Accettare parametro `is_home` nella richiesta
  - [ ] Passare `is_home` al prompt IA per identificare squadra cliente
  - [ ] Aggiornare `normalizePlayerRatings()` per usare `is_home`
  - [ ] Se `is_home = true` → team1 = cliente, team2 = avversario
  - [ ] Se `is_home = false` → team2 = cliente, team1 = avversario

- [ ] **Aggiornare salvataggio match (`/api/supabase/save-match`)**
  - [ ] Leggere `is_home` da matchData
  - [ ] Salvare `is_home` in matches.is_home
  - [ ] Usare `is_home` per determinare `client_team_name` dai dati estratti

- [ ] **Aggiornare analisi match (`/api/analyze-match`)**
  - [ ] Leggere `is_home` da matchData
  - [ ] Usare `is_home` per identificare squadra cliente nel prompt IA
  - [ ] Aggiornare istruzioni IA: "team1 se casa, team2 se fuori"

### **Priorità Media**

- [ ] **Migliorare matching automatico** (se necessario)
  - [ ] Funzione matching fuzzy per nomi squadra (opzionale)
  - [ ] Supporto abbreviazioni (opzionale)
  - [ ] Log matching per debug

### **Priorità Bassa**

- [ ] **Aggiungere validazione e warning**
  - [ ] Alert se identificazione incerta
  - [ ] Permettere correzione manuale

---

## 💡 ESEMPI CONCRETI: Come Funziona "Casa/Fuori Casa"

### **Esempio 1: Attila vs Gio - Attila in Casa**

**Situazione**:
- Cliente: Attila
- Avversario: Gio
- Cliente seleziona: **"Casa"** (`is_home = true`)

**Dati Estratti**:
```json
{
  "player_ratings": {
    "team1": { "Messi": { "rating": 8.5 }, "Ronaldo": { "rating": 7.0 } },
    "team2": { "Neymar": { "rating": 8.0 }, "Mbappé": { "rating": 7.5 } }
  }
}
```

**Risultato**:
- ✅ `is_home = true` → team1 = cliente (Attila), team2 = avversario (Gio)
- ✅ `player_ratings.cliente` = team1 (Messi, Ronaldo)
- ✅ `player_ratings.avversario` = team2 (Neymar, Mbappé)
- ✅ Analisi match: analizza performance di Attila (team1)

---

### **Esempio 2: Attila vs Gio - Attila Fuori Casa**

**Situazione**:
- Cliente: Attila
- Avversario: Gio
- Cliente seleziona: **"Fuori Casa"** (`is_home = false`)

**Dati Estratti**:
```json
{
  "player_ratings": {
    "team1": { "Messi": { "rating": 8.5 }, "Ronaldo": { "rating": 7.0 } },
    "team2": { "Neymar": { "rating": 8.0 }, "Mbappé": { "rating": 7.5 } }
  }
}
```

**Risultato**:
- ✅ `is_home = false` → team2 = cliente (Attila), team1 = avversario (Gio)
- ✅ `player_ratings.cliente` = team2 (Neymar, Mbappé)
- ✅ `player_ratings.avversario` = team1 (Messi, Ronaldo)
- ✅ Analisi match: analizza performance di Attila (team2)

---

### **Esempio 3: Attack Areas con Casa/Fuori**

**Situazione**:
- Cliente seleziona: **"Casa"** (`is_home = true`)

**Dati Estratti**:
```json
{
  "attack_areas": {
    "team1": { "left": 46, "center": 45, "right": 9 },
    "team2": { "left": 30, "center": 50, "right": 20 }
  }
}
```

**Risultato**:
- ✅ `is_home = true` → team1 = cliente
- ✅ Analisi match: "La tua squadra ha attaccato 46% da sinistra, 45% dal centro, 9% da destra"
- ✅ Analisi match: "L'avversario ha attaccato 30% da sinistra, 50% dal centro, 20% da destra"

---

### **Esempio 4: Team Stats con Fuori Casa**

**Situazione**:
- Cliente seleziona: **"Fuori Casa"** (`is_home = false`)

**Dati Estratti**:
```json
{
  "team_stats": {
    "team1": { "possession": 60, "shots": 16, "goals_scored": 2 },
    "team2": { "possession": 40, "shots": 10, "goals_scored": 1 }
  }
}
```

**Risultato**:
- ✅ `is_home = false` → team2 = cliente
- ✅ Analisi match: "La tua squadra ha avuto 40% possesso, 10 tiri, 1 gol"
- ✅ Analisi match: "L'avversario ha avuto 60% possesso, 16 tiri, 2 gol"

---

## 🔍 ESEMPI CASI PROBLEMATICI

### **Caso 1: `team_name` NULL (RISOLTO con Casa/Fuori)**

**Situazione**:
- `user_profiles.team_name` = NULL
- `coaches.team` = NULL
- Dati estratti: "Natural Born Game" vs "Juventus"
- Cliente seleziona: **"Casa"** (`is_home = true`)

**Risultato**:
- ✅ `is_home = true` → team1 = cliente
- ✅ Sistema sa sempre quale squadra è quella del cliente
- ✅ Non serve `team_name` per identificare

**Soluzione**: ✅ **RISOLTO** con campo "Casa/Fuori Casa"

---

### **Caso 2: Nome Non Corrisponde (RISOLTO con Casa/Fuori)**

**Situazione**:
- `user_profiles.team_name` = "Natural Born Game"
- Dati estratti: "NBG" (team1) vs "Juventus" (team2)
- Cliente seleziona: **"Casa"** (`is_home = true`)

**Risultato**:
- ✅ `is_home = true` → team1 = cliente (anche se si chiama "NBG" invece di "Natural Born Game")
- ✅ Sistema non dipende da matching nomi
- ✅ Funziona sempre, indipendentemente dai nomi

**Soluzione**: ✅ **RISOLTO** con campo "Casa/Fuori Casa"

---

### **Caso 3: Due Squadre Simili (RISOLTO con Casa/Fuori)**

**Situazione**:
- Dati estratti: "Inter" (team1) vs "Inter Miami" (team2)
- Cliente seleziona: **"Casa"** (`is_home = true`)

**Risultato**:
- ✅ `is_home = true` → team1 = cliente (anche se si chiama "Inter" e l'altra "Inter Miami")
- ✅ Sistema non dipende da matching nomi
- ✅ Funziona sempre, anche con nomi simili

**Soluzione**: ✅ **RISOLTO** con campo "Casa/Fuori Casa"

---

## 📝 NOTE TECNICHE

### **Database Schema**

**Tabella `matches`**:
```sql
client_team_name TEXT  -- Nome squadra del cliente (per tracciabilità)
opponent_name TEXT     -- Nome avversario
```

**Tabella `user_profiles`**:
```sql
team_name TEXT  -- Nome squadra cliente (usato per identificazione)
```

**Tabella `coaches`**:
```sql
team TEXT  -- Nome squadra (fallback se user_profiles.team_name è NULL)
```

---

### **Priorità Identificazione Squadra Cliente**

1. **Prima priorità**: `matchData.client_team_name` (se passato dal wizard)
2. **Seconda priorità**: `user_profiles.team_name`
3. **Terza priorità**: `coaches.team` (se coach attivo)
4. **Fallback**: NULL (IA deve "indovinare")

---

## ✅ RACCOMANDAZIONI

### **Immediato (Questa Settimana)**

1. ✅ **Aggiungere campo "Casa/Fuori Casa" nel wizard**
   - Toggle/button "Casa" / "Fuori Casa" (obbligatorio)
   - Default: Casa (true)
   - Salvare `is_home` in matchData

2. ✅ **Aggiornare logica estrazione e analisi**
   - Usare `is_home` per identificare squadra cliente
   - Se casa → team1 = cliente, team2 = avversario
   - Se fuori → team2 = cliente, team1 = avversario

### **Breve Termine (Prossime 2 Settimane)**

3. ✅ **Mostrare squadre trovate nei dati**
   - Lista squadre estratte
   - Selezione esplicita

4. ✅ **Migliorare matching automatico**
   - Funzione matching fuzzy
   - Supporto abbreviazioni

### **Lungo Termine (Prossimo Mese)**

5. ✅ **Analisi pattern identificazione**
   - Log errori identificazione
   - Migliorare algoritmo basato su dati reali

---

---

## 📊 CONFRONTO: Prima vs Dopo

### **PRIMA (Con `team_name`)**

**Problemi**:
- ❌ Dipende da `user_profiles.team_name` (può essere NULL)
- ❌ Matching nomi non affidabile
- ❌ L'IA deve "indovinare" quale squadra è quella del cliente
- ❌ Errori quando nomi non corrispondono esattamente

**Esempio**:
```
user_profiles.team_name = "Natural Born Game"
Dati: "NBG" vs "Juventus"
→ Sistema potrebbe non riconoscere "NBG" = "Natural Born Game"
→ Errore identificazione
```

---

### **DOPO (Con "Casa/Fuori Casa")**

**Vantaggi**:
- ✅ Non dipende da `user_profiles.team_name`
- ✅ Funziona sempre, indipendentemente dai nomi
- ✅ Sistema sa sempre quale squadra è quella del cliente
- ✅ Domanda naturale e semplice per il cliente

**Esempio**:
```
Cliente seleziona: "Casa"
Dati: "NBG" (team1) vs "Juventus" (team2)
→ is_home = true → team1 = cliente
→ Funziona sempre, anche se "NBG" non corrisponde a "Natural Born Game"
```

---

**Fine Documento Analisi**

**Prossimo Step**: Implementare campo "Casa/Fuori Casa" nel wizard match
