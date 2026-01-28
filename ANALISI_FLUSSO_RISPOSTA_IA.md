# Analisi Completa - Flusso Elaborazione Risposta IA Contromisure

**Data:** 2026-01-28  
**Scope:** Dettaglio completo di ogni passaggio: acquisizione dati → prompt → chiamata IA → parsing → validazione → output

---

## 📋 INDICE

1. [Acquisizione Dati da Supabase](#1-acquisizione-dati-da-supabase)
2. [Costruzione Prompt](#2-costruzione-prompt)
3. [Chiamata OpenAI](#3-chiamata-openai)
4. [Parsing Risposta](#4-parsing-risposta)
5. [Validazione Output](#5-validazione-output)
6. [Formattazione Finale](#6-formattazione-finale)
7. [Frontend Display](#7-frontend-display)

---

## 1. ACQUISIZIONE DATI DA SUPABASE

**File:** `/app/api/generate-countermeasures/route.js` (righe 77-271)

### 1.1 Formazione Avversaria
```javascript
const { data: opponentFormation } = await admin
  .from('opponent_formations')
  .select('*')  // Tutti i campi incluso extracted_data
  .eq('id', opponent_formation_id)
  .eq('user_id', userId)
  .single()
```

**Dati Recuperati:**
- `formation_name` (es. "4-3-3")
- `playing_style` (es. "Contropiede veloce")
- `tactical_style` (opzionale)
- `overall_strength` (opzionale, es. 3245)
- `players` (jsonb array, opzionale)
- `extracted_data` (jsonb) - contiene anche `coach` se presente

**Fallback:**
- Se campi separati mancanti, legge da `extracted_data`

---

### 1.2 Rosa Cliente
```javascript
const { data: clientRoster } = await admin
  .from('players')
  .select('id, player_name, position, overall_rating, base_stats, skills, com_skills, playing_style_id, slot_index')
  .eq('user_id', userId)
  .order('overall_rating', { ascending: false })
  .limit(100)
```

**Dati Recuperati per Giocatore:**
- `id` (UUID) - **CRITICO** per player_suggestions
- `player_name` (es. "Messi")
- `position` (es. "LWF")
- `overall_rating` (es. 99)
- `base_stats` (jsonb) - stats attacco/difesa/forza
- `skills` (text[]) - array abilità
- `com_skills` (text[]) - array abilità comuni
- `playing_style_id` (UUID, opzionale)
- `slot_index` (0-10 per titolari, null per riserve)

**Separazione Titolari/Riserve:**
```javascript
const titolari = roster
  .filter(p => p.slot_index != null && p.slot_index >= 0 && p.slot_index <= 10)
  .sort((a, b) => (Number(a.slot_index) || 0) - (Number(b.slot_index) || 0))

const riserve = roster.filter(p => p.slot_index == null)
```

**Logica:**
- **Titolari:** `slot_index` 0-10 (11 giocatori in campo)
- **Riserve:** `slot_index` null (panchina)

---

### 1.3 Formazione Cliente
```javascript
const { data: clientFormation } = await admin
  .from('formation_layout')
  .select('formation, slot_positions')
  .eq('user_id', userId)
  .maybeSingle()
```

**Dati Recuperati:**
- `formation` (es. "4-2-1-3")
- `slot_positions` (jsonb) - mappa slot → posizioni

---

### 1.4 Impostazioni Tattiche
```javascript
const { data: tacticalSettings } = await admin
  .from('team_tactical_settings')
  .select('team_playing_style, individual_instructions')
  .eq('user_id', userId)
  .maybeSingle()
```

**Dati Recuperati:**
- `team_playing_style` (es. "possesso_palla")
- `individual_instructions` (jsonb) - istruzioni per slot

---

### 1.5 Allenatore Cliente
```javascript
const { data: activeCoach } = await admin
  .from('coaches')
  .select('playing_style_competence, stat_boosters, connection')
  .eq('user_id', userId)
  .eq('is_active', true)
  .maybeSingle()
```

**Dati Recuperati:**
- `playing_style_competence` (jsonb) - competenze 0-100 per stile
- `stat_boosters` (jsonb array) - boosters statistiche
- `connection` (jsonb) - connection tattica se presente

---

### 1.6 Storico Match (Ultimi 50)
```javascript
const { data: matchHistory } = await admin
  .from('matches')
  .select('id, opponent_name, result, formation_played, playing_style_played, opponent_formation_id, player_ratings, team_stats, match_date')
  .eq('user_id', userId)
  .order('match_date', { ascending: false })
  .limit(50)
```

**Dati Recuperati per Match:**
- `opponent_name` (es. "Juventus")
- `result` (es. "3-1", "W", "L")
- `formation_played` (es. "4-3-3")
- `playing_style_played` (es. "Contropiede veloce")
- `opponent_formation_id` (UUID, se match ha formazione avversaria salvata)
- `player_ratings` (jsonb) - voti giocatori
- `team_stats` (jsonb) - statistiche squadra
- `match_date` (timestamp)

---

### 1.7 Analisi Match Simili

**Algoritmo:**
```javascript
// 1. Match con stessa opponent_formation_id (match esatto)
if (matchOpponentFormationId === opponent_formation_id) {
  similarFormationMatches.push(match)
}

// 2. Match con formazione/stile simile (fuzzy match)
const isSimilar = 
  matchFormation.includes(opponentFormationName) || 
  opponentFormationName.includes(matchFormation) ||
  matchPlayingStyle.includes(opponentPlayingStyle)
```

**Risultato:**
- Array `similarFormationMatches` con match contro formazioni simili

---

### 1.8 Performance Giocatori vs Formazioni Simili

**Algoritmo:**
```javascript
// Per ogni match simile
similarFormationMatches.forEach(match => {
  // Estrai player_ratings
  const source = match.player_ratings.cliente || match.player_ratings
  
  // Per ogni giocatore con rating
  Object.entries(source).forEach(([key, rating]) => {
    // Risolvi player_id (per UUID o nome)
    const playerId = resolveToPlayerId(key, roster)
    
    // Accumula statistiche
    playerPerformanceAgainstSimilar[playerId] = {
      matches: count,
      totalRating: sum,
      ratings: [8.5, 7.0, ...],
      playerName: "..."
    }
  })
})
```

**Risultato:**
- Oggetto `playerPerformanceAgainstSimilar` con:
  - `playerId` → `{ matches, totalRating, ratings[], playerName }`

---

### 1.9 Abitudini Tattiche Cliente

**Algoritmo:**
```javascript
matchHistory.forEach(match => {
  // Conta formazioni preferite
  tacticalHabits.preferredFormations[formation]++
  
  // Conta stili preferiti
  tacticalHabits.preferredStyles[style]++
  
  // Analizza win/loss rate per formazione
  if (result.includes('W')) {
    tacticalHabits.winRateByFormation[formation].wins++
  } else if (result.includes('L')) {
    tacticalHabits.winRateByFormation[formation].losses++
  }
})
```

**Risultato:**
- `tacticalHabits` con:
  - `preferredFormations` (conteggio)
  - `preferredStyles` (conteggio)
  - `winRateByFormation` (wins/losses/draws per formazione)

---

### 1.10 Pattern Tattici
```javascript
const { data: tacticalPatterns } = await admin
  .from('team_tactical_patterns')
  .select('formation_usage, playing_style_usage, recurring_issues')
  .eq('user_id', userId)
  .maybeSingle()
```

**Dati Recuperati:**
- `formation_usage` (jsonb) - uso formazioni con win rate
- `playing_style_usage` (jsonb) - uso stili
- `recurring_issues` (jsonb array) - problemi ricorrenti

---

## 2. COSTRUZIONE PROMPT

**File:** `/lib/countermeasuresHelper.js` - `generateCountermeasuresPrompt()`

### 2.1 Struttura Prompt

Il prompt è costruito concatenando sezioni:

```
1. Istruzioni Ruolo IA
2. Formazione Avversaria (+ Coach se presente)
3. Rosa Cliente (Titolari/Riserve)
4. Formazione Cliente
5. Impostazioni Tattiche Cliente
6. Allenatore Cliente
7. Storico Match
8. Analisi Match Simili
9. Performance Giocatori vs Simili
10. Abitudini Tattiche Cliente
11. Pattern Tattici
12. Contromisure Meta (se formazione meta)
13. Formato Output JSON
14. Regole Critiche
```

---

### 2.2 Sezione Formazione Avversaria

**Codice:**
```javascript
let opponentText = `FORMazione AVVERSARIA:\n`
opponentText += `- Formazione: ${opponentFormation.formation_name || 'N/A'}\n`
opponentText += `- Stile: ${opponentFormation.playing_style || 'N/A'}\n`
if (tacticalStyle) {
  opponentText += `- Stile Tattico: ${tacticalStyle}\n`
}
if (overallStrength) {
  opponentText += `- Forza: ${overallStrength}\n`
}
if (Array.isArray(players) && players.length > 0) {
  opponentText += `- Giocatori: ${players.length} giocatori rilevati\n`
}
```

**Se Coach Presente:**
```javascript
if (opponentCoach && opponentCoach.coach_name) {
  opponentText += `\nALLENATORE AVVERSARIO:\n`
  opponentText += `- Nome: ${opponentCoach.coach_name}\n`
  opponentText += `- Età: ${opponentCoach.age}\n`
  opponentText += `- Competenze Stili di Gioco:\n`
  // ... lista competenze
  opponentText += `⚠️ NOTA: Considera le competenze dell'allenatore avversario per prevedere le sue scelte tattiche.\n`
}
```

**Output Esempio:**
```
FORMazione AVVERSARIA:
- Formazione: 4-3-3
- Stile: Contropiede veloce
- Forza: 3245
- Giocatori: 11 giocatori rilevati

ALLENATORE AVVERSARIO:
- Nome: Guardiola
- Età: 52
- Competenze Stili di Gioco:
  * Possesso Palla: 89
  * Contropiede Veloce: 45
⚠️ NOTA: Considera le competenze dell'allenatore avversario per prevedere le sue scelte tattiche.
```

---

### 2.3 Sezione Rosa Cliente

**Se Titolari/Riserve Disponibili:**
```javascript
rosterText = `\nTITOLARI (in campo, ${titolari.length}):\n`
titolari.forEach((p, idx) => {
  const currentPosition = p.position
  const originalPositions = p.original_positions || []
  const isOriginalPosition = isPositionOriginal(currentPosition, originalPositions)
  const isVerified = p.photo_slots?.card === true
  const hasOriginalPositions = originalPositions.length > 0
  const verifiedMarker = isVerified && hasOriginalPositions ? ' ✅' : (isVerified ? ' ⚠️' : ' ❌')
  
  rosterText += `- [${p.id}] ${p.player_name} - ${currentPosition} - Overall ${p.overall_rating}${skillsPart}${slot}${verifiedMarker}\n`
  
  // Warning se NON verificato
  if (!isVerified || !hasOriginalPositions) {
    rosterText += `  (⚠️ Dati posizione/overall non verificati - NON menzionare posizione specifica o overall al cliente)\n`
  }
})
```

**Output Esempio:**
```
TITOLARI (in campo, 11):
- [uuid-123] Messi - LWF - Overall 99 (Dribbling, Finishing) slot 9 ✅
- [uuid-456] Ronaldo - RWF - Overall 98 (Shooting) slot 10 ⚠️
  (⚠️ Dati posizione/overall non verificati - NON menzionare posizione specifica o overall al cliente)

RISERVE (panchina, 15):
- [uuid-789] Neymar - LWF - Overall 95
- [uuid-012] Mbappé - CF - Overall 94
```

**Marker Significato:**
- ✅ = Dati verificati (foto card caricata + posizioni originali)
- ⚠️ = Parzialmente verificato (foto card ma no posizioni originali)
- ❌ = Non verificato (no foto card)

---

### 2.4 Sezione Allenatore Cliente

**Codice:**
```javascript
let coachText = `\nALLENATORE CLIENTE:\n`
if (activeCoach) {
  coachText += `- Nome: ${activeCoach.coach_name}\n`
  
  // Competenze stili (0-100)
  Object.entries(activeCoach.playing_style_competence).forEach(([style, value]) => {
    const level = value >= 80 ? '🔴 ALTA' : value >= 60 ? '🟡 MEDIA' : '⚪ BASSA'
    coachText += `  * ${styleName}: ${value} ${level}\n`
  })
  
  // Regole critiche
  const highCompetences = competences.filter(c => c.value >= 70)
  const lowCompetences = competences.filter(c => c.value < 50)
  
  coachText += `\n⚠️ REGOLE CRITICHE ALLENATORE:\n`
  coachText += `- Stili con competenza ALTA (>= 70): ${highCompetences.join(', ')}\n`
  coachText += `  → SUGGERISCI questi stili, sono quelli in cui l'allenatore è più competente\n`
  coachText += `- Stili con competenza BASSA (< 50): ${lowCompetences.join(', ')}\n`
  coachText += `  → NON SUGGERIRE questi stili, l'allenatore non è competente\n`
  coachText += `- Se suggerisci un cambio stile, usa SOLO stili con competenza >= 70\n`
}
```

**Output Esempio:**
```
ALLENATORE CLIENTE:
- Nome: Ancelotti
- Competenze Stili di Gioco (valori 0-100, più alto = più competente):
  * Possesso Palla: 46 ⚪ BASSA
  * Contropiede Veloce: 57 🟡 MEDIA
  * Contrattacco: 89 🔴 ALTA
  * Vie Laterali: 64 🟡 MEDIA
  * Passaggio Lungo: 89 🔴 ALTA

⚠️ REGOLE CRITICHE ALLENATORE:
- Stili con competenza ALTA (>= 70): Contrattacco, Passaggio Lungo
  → SUGGERISCI questi stili, sono quelli in cui l'allenatore è più competente
- Stili con competenza BASSA (< 50): Possesso Palla
  → NON SUGGERIRE questi stili, l'allenatore non è competente
- Se suggerisci un cambio stile, usa SOLO stili con competenza >= 70
```

---

### 2.5 Sezione Storico Match

**Codice:**
```javascript
let historyText = `\nSTORICO MATCH (ultimi ${matchHistory.length}):\n`
matchHistory.slice(0, 20).forEach((match, idx) => {
  historyText += `${idx + 1}. vs ${match.opponent_name || 'N/A'}: ${match.result || 'N/A'}`
  historyText += ` - Formazione: ${match.formation_played || 'N/A'}`
  historyText += ` - Stile: ${match.playing_style_played || 'N/A'}\n`
})
```

**Se Match Simili Presenti:**
```javascript
if (similarFormationMatches.length > 0) {
  similarFormationAnalysis += `\n⚠️ MATCH SIMILI IDENTIFICATI (${similarFormationMatches.length}):\n`
  similarFormationMatches.forEach(match => {
    similarFormationAnalysis += `- vs ${match.opponent_name}: ${match.result}\n`
  })
  similarFormationAnalysis += `- È CRITICO suggerire contromisure specifiche e alternative tattiche\n`
}
```

---

### 2.6 Sezione Performance Giocatori

**Codice:**
```javascript
if (Object.keys(playerPerformanceAgainstSimilar).length > 0) {
  playerPerformanceAnalysis += `\nPERFORMANCE GIOCATORI vs FORMAZIONI SIMILI:\n`
  Object.entries(playerPerformanceAgainstSimilar).forEach(([playerId, perf]) => {
    const avgRating = perf.totalRating / perf.matches
    playerPerformanceAnalysis += `- [${playerId}] ${perf.playerName}:`
    playerPerformanceAnalysis += ` ${perf.matches} match, media rating ${avgRating.toFixed(1)}\n`
  })
}
```

**Output Esempio:**
```
PERFORMANCE GIOCATORI vs FORMAZIONI SIMILI:
- [uuid-123] Messi: 3 match, media rating 8.5
- [uuid-456] Ronaldo: 2 match, media rating 7.0
```

---

### 2.7 Sezione Formato Output

**Codice:**
```javascript
return `... (tutto il prompt) ...

Formato JSON richiesto:
{
  "analysis": {
    "opponent_formation_analysis": "...",
    "is_meta_formation": true/false,
    "meta_type": "...",
    "strengths": ["...", "..."],
    "weaknesses": ["...", "..."],
    "why_weaknesses": "..."
  },
  "countermeasures": {
    "formation_adjustments": [...],
    "tactical_adjustments": [...],
    "player_suggestions": [...],
    "individual_instructions": [...]
  },
  "confidence": 85,
  "data_quality": "high",
  "warnings": ["...", "..."]
}
```

---

### 2.8 Regole Critiche nel Prompt

**Incluse nel Prompt:**
1. ✅ NON inferire cause (competenze ≠ cause dirette)
2. ✅ NON inventare azioni specifiche (dribbling, passaggi, ecc.)
3. ✅ NON analizzare video (abbiamo solo rating, non dettagli)
4. ✅ NON confondere caratteristiche con performance
5. ✅ Usa SOLO player_id dagli elenchi TITOLARI/RISERVE
6. ✅ `add_to_starting_xi` solo per riserve
7. ✅ `remove_from_starting_xi` solo per titolari
8. ✅ Campo `reason` breve (1-2 righe), diretto
9. ✅ Priorità: "high", "medium", "low"

---

## 3. CHIAMATA OPENAI

**File:** `/app/api/generate-countermeasures/route.js` (righe 331-405)

### 3.1 Configurazione Request

**Modelli Tentati (in ordine):**
```javascript
const models = ['gpt-5.2', 'gpt-5', 'gpt-4o', 'gpt-4-turbo', 'gpt-4']
```

**Nota:** Prova prima i modelli più recenti (GPT-5.2, GPT-5) per avere le migliori performance, poi fallback automatico ai modelli precedenti se non disponibili.

**Request Body:**
```javascript
const requestBody = {
  model: model,  // Prova in ordine
  messages: [
    {
      role: 'user',
      content: prompt  // Prompt completo costruito
    }
  ],
  response_format: { type: 'json_object' },  // ← CRITICO: forza JSON
  temperature: 0.7,  // Creatività media
  max_tokens: 2000  // Max token risposta
}
```

**Logica Fallback:**
- Prova `gpt-4o` → se fallisce, prova `gpt-4-turbo` → se fallisce, prova `gpt-4`
- Se errore `model_not_found`, passa al modello successivo
- Se errore diverso (400, 500), non retry, ritorna errore

---

### 3.2 Helper OpenAI (`callOpenAIWithRetry`)

**File:** `/lib/openaiHelper.js`

**Parametri:**
- `OPENAI_TIMEOUT_MS = 60000` (60 secondi)
- `MAX_RETRIES = 2` (max 3 tentativi totali)
- `RETRY_DELAY_MS`:
  - Rate limit: 5000ms
  - Timeout: 10000ms
  - Server error: 5000ms

**Flusso:**
```javascript
for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
  try {
    // 1. Crea AbortController per timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS)
    
    // 2. Chiama API OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal  // ← Timeout automatico
    })
    
    clearTimeout(timeoutId)
    
    // 3. Se OK, ritorna
    if (response.ok) {
      return response
    }
    
    // 4. Gestisci errori specifici
    const errorData = await response.json()
    
    // Rate limit (429): retry dopo 5s
    if (statusCode === 429) {
      await sleep(5000)
      continue
    }
    
    // Server error (500-503): retry dopo 5s
    if (statusCode >= 500 && statusCode < 504) {
      await sleep(5000)
      continue
    }
    
    // Altri errori: non retry
    break
  } catch (err) {
    // Timeout: retry dopo 10s
    if (err.name === 'AbortError') {
      await sleep(10000)
      continue
    }
    
    // Network error: retry dopo 5s
    await sleep(5000)
    continue
  }
}
```

**Risultato:**
- ✅ Risposta OK → ritorna `Response`
- ❌ Tutti retry falliti → lancia errore con `type` e `message`

---

## 4. PARSING RISPOSTA

**File:** `/app/api/generate-countermeasures/route.js` (righe 421-441)

### 4.1 Estrazione Content

```javascript
const data = await response.json()
const content = data.choices?.[0]?.message?.content
```

**Struttura Risposta OpenAI:**
```json
{
  "id": "chatcmpl-...",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "gpt-4o",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "{\"analysis\": {...}, \"countermeasures\": {...}}"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 5000,
    "completion_tokens": 1500,
    "total_tokens": 6500
  }
}
```

**Nota:** `content` è una **stringa JSON**, non un oggetto (perché `response_format: { type: 'json_object' }`)

---

### 4.2 Parsing JSON

```javascript
let countermeasures
try {
  countermeasures = JSON.parse(content)  // ← Parse stringa JSON
} catch (parseErr) {
  console.error('[generate-countermeasures] JSON parse error:', parseErr)
  return NextResponse.json(
    { error: 'Invalid response format from AI' },
    { status: 500 }
  )
}
```

**Risultato:**
- ✅ JSON valido → oggetto `countermeasures`
- ❌ JSON invalido → errore 500

**Possibili Errori:**
- JSON malformato (virgole mancanti, parentesi non chiuse)
- JSON troncato (max_tokens raggiunto)
- JSON con markdown/codice (nonostante `json_object`)

---

## 5. VALIDAZIONE OUTPUT

**File:** `/lib/countermeasuresHelper.js` - `validateCountermeasuresOutput()`

### 5.1 Validazione Struttura

```javascript
// 1. Verifica output è oggetto
if (!output || typeof output !== 'object') {
  return { valid: false, error: 'Output must be an object' }
}

// 2. Verifica campo analysis
if (!output.analysis || typeof output.analysis !== 'object') {
  return { valid: false, error: 'Missing or invalid analysis field' }
}

// 3. Verifica campo countermeasures
if (!output.countermeasures || typeof output.countermeasures !== 'object') {
  return { valid: false, error: 'Missing or invalid countermeasures field' }
}
```

---

### 5.2 Validazione Priorità

```javascript
const validPriorities = ['high', 'medium', 'low']
const allSuggestions = [
  ...(output.countermeasures.formation_adjustments || []),
  ...(output.countermeasures.tactical_adjustments || []),
  ...(output.countermeasures.player_suggestions || [])
]

for (const suggestion of allSuggestions) {
  if (suggestion.priority && !validPriorities.includes(suggestion.priority)) {
    return { valid: false, error: `Invalid priority: ${suggestion.priority}` }
  }
}
```

**Priorità Valide:**
- ✅ `"high"` - Contromisure essenziali
- ✅ `"medium"` - Contromisure utili
- ✅ `"low"` - Contromisure opzionali
- ❌ Altro → errore validazione

---

### 5.3 Validazione Reason

```javascript
for (const suggestion of allSuggestions) {
  if (!suggestion.reason || typeof suggestion.reason !== 'string') {
    return { valid: false, error: 'All suggestions must have a reason' }
  }
}
```

**Requisiti:**
- ✅ Campo `reason` obbligatorio
- ✅ Deve essere stringa (non null, non undefined)
- ❌ Mancante → errore validazione

---

### 5.4 Risultato Validazione

```javascript
return { valid: true }  // Se tutto OK
// oppure
return { valid: false, error: '...' }  // Se errore
```

**Uso:**
```javascript
const validation = validateCountermeasuresOutput(countermeasures)
if (!validation.valid) {
  return NextResponse.json(
    { error: `Invalid countermeasures format: ${validation.error}` },
    { status: 500 }
  )
}
```

---

## 6. FORMATTAZIONE FINALE

**File:** `/app/api/generate-countermeasures/route.js` (righe 453-458)

### 6.1 Response JSON

```javascript
return NextResponse.json({
  success: true,
  countermeasures,  // ← Oggetto validato
  model_used: data.model || 'unknown'  // ← Modello usato (gpt-4o, ecc.)
})
```

**Struttura Output:**
```json
{
  "success": true,
  "countermeasures": {
    "analysis": {
      "opponent_formation_analysis": "...",
      "is_meta_formation": true,
      "meta_type": "4-3-3",
      "strengths": ["...", "..."],
      "weaknesses": ["...", "..."],
      "why_weaknesses": "..."
    },
    "countermeasures": {
      "formation_adjustments": [
        {
          "type": "formation_change",
          "suggestion": "Cambia da 4-3-3 a 3-5-2",
          "reason": "Motivazione breve...",
          "priority": "high"
        }
      ],
      "tactical_adjustments": [
        {
          "type": "defensive_line",
          "suggestion": "bassa",
          "reason": "Motivazione...",
          "priority": "high"
        }
      ],
      "player_suggestions": [
        {
          "player_id": "uuid-123",
          "player_name": "Messi",
          "action": "add_to_starting_xi",
          "position": "LWF",
          "reason": "Motivazione...",
          "priority": "high"
        }
      ],
      "individual_instructions": [
        {
          "slot": "attacco_1",
          "player_id": "uuid-123",
          "instruction": "offensivo",
          "reason": "Motivazione..."
        }
      ]
    },
    "confidence": 85,
    "data_quality": "high",
    "warnings": ["...", "..."]
  },
  "model_used": "gpt-4o"
}
```

---

## 7. FRONTEND DISPLAY

**File:** `/app/contromisure-live/page.jsx`

### 7.1 Ricezione Risposta

```javascript
const generateRes = await fetch('/api/generate-countermeasures', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    opponent_formation_id: extractedFormation.id
  })
})

const generateData = await safeJsonResponse(generateRes, t('errorGeneratingCountermeasures'))

if (generateData.success && generateData.countermeasures) {
  setCountermeasures(generateData.countermeasures)
}
```

---

### 7.2 Display Analisi

```javascript
{expandedSections.analysis && (
  <div>
    {/* Meta Formation Badge */}
    {countermeasures.analysis.is_meta_formation && (
      <div style={{...}}>
        <strong>Formazione Meta:</strong> {countermeasures.analysis.meta_type}
      </div>
    )}
    
    {/* Analisi Testo */}
    <div>{countermeasures.analysis.opponent_formation_analysis}</div>
    
    {/* Strengths */}
    {countermeasures.analysis.strengths?.map((strength, idx) => (
      <li key={idx}>{strength}</li>
    ))}
    
    {/* Weaknesses */}
    {countermeasures.analysis.weaknesses?.map((weakness, idx) => (
      <li key={idx}>{weakness}</li>
    ))}
  </div>
)}
```

---

### 7.3 Display Contromisure Tattiche

```javascript
{countermeasures.countermeasures.formation_adjustments?.map((adj, idx) => {
  const suggestionId = `formation_${idx}`
  return (
    <div 
      key={idx}
      style={{
        background: selectedSuggestions.has(suggestionId) ? 'rgba(255, 165, 0, 0.2)' : 'rgba(255, 165, 0, 0.1)',
        border: `1px solid ${getPriorityColor(adj.priority)}`,
        ...
      }}
      onClick={() => toggleSuggestion(suggestionId)}
    >
      <input type="checkbox" checked={selectedSuggestions.has(suggestionId)} />
      <span>{getPriorityLabel(adj.priority)}</span>
      <div>{adj.type === 'formation_change' ? 'Cambia Formazione' : 'Cambia Stile'}: {adj.suggestion}</div>
      <div>{adj.reason}</div>
    </div>
  )
})}
```

**Colori Priorità:**
- `high` → `var(--neon-orange)` (#ff6b00)
- `medium` → `var(--neon-blue)` (#00d4ff)
- `low` → `#888` (grigio)

---

### 7.4 Display Suggerimenti Giocatori

```javascript
{countermeasures.countermeasures.player_suggestions?.map((suggestion, idx) => {
  const suggestionId = `player_${idx}`
  return (
    <div key={idx}>
      <div>
        {suggestion.action === 'add_to_starting_xi' ? 'Aggiungi a Titolari' : 'Rimuovi da Titolari'}: 
        {suggestion.player_name} ({suggestion.position})
      </div>
      <div>{suggestion.reason}</div>
    </div>
  )
})}
```

---

### 7.5 Display Confidence & Warnings

```javascript
<div>
  <strong>Affidabilità:</strong> {countermeasures.confidence}%
  <strong>Qualità Dati:</strong> {countermeasures.data_quality || 'N/A'}
</div>

{countermeasures.warnings && countermeasures.warnings.length > 0 && (
  <div>
    <strong>Avvertimenti:</strong>
    <ul>
      {countermeasures.warnings.map((warning, idx) => (
        <li key={idx}>{warning}</li>
      ))}
    </ul>
  </div>
)}
```

---

## 8. DIAGRAMMA FLUSSO COMPLETO

```
┌─────────────────────────────────────────────────────────────┐
│ 1. FRONTEND: handleGenerateCountermeasures()                │
│    - Chiama /api/generate-countermeasures                   │
│    - Passa: opponent_formation_id                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. API: generate-countermeasures/route.js                   │
│    ├─ Autenticazione (validateToken)                       │
│    ├─ Rate Limiting (checkRateLimit)                       │
│    └─ Recupera Dati Supabase:                              │
│       ├─ opponentFormation (con coach se presente)         │
│       ├─ clientRoster (titolari/riserve)                    │
│       ├─ clientFormation                                    │
│       ├─ tacticalSettings                                   │
│       ├─ activeCoach                                        │
│       ├─ matchHistory (50 match)                            │
│       ├─ similarFormationMatches (analisi)                 │
│       ├─ playerPerformanceAgainstSimilar (analisi)         │
│       ├─ tacticalHabits (analisi)                          │
│       └─ tacticalPatterns                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. HELPER: generateCountermeasuresPrompt()                 │
│    - Costruisce prompt concatenando sezioni:                │
│      ├─ Formazione Avversaria (+ Coach)                    │
│      ├─ Rosa Cliente (Titolari/Riserve)                    │
│      ├─ Formazione Cliente                                 │
│      ├─ Impostazioni Tattiche                              │
│      ├─ Allenatore Cliente                                 │
│      ├─ Storico Match                                      │
│      ├─ Match Simili                                       │
│      ├─ Performance Giocatori                              │
│      ├─ Abitudini Tattiche                                 │
│      ├─ Pattern Tattici                                    │
│      └─ Formato Output + Regole                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. VALIDAZIONE PROMPT                                       │
│    - Verifica dimensione < 50KB                            │
│    - Se troppo grande → errore 413                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. CHIAMATA OPENAI: callOpenAIWithRetry()                  │
│    - Prova modelli: gpt-4o → gpt-4-turbo → gpt-4           │
│    - Request:                                               │
│      ├─ model: 'gpt-4o'                                    │
│      ├─ messages: [{ role: 'user', content: prompt }]      │
│      ├─ response_format: { type: 'json_object' }            │
│      ├─ temperature: 0.7                                   │
│      └─ max_tokens: 2000                                   │
│    - Retry Logic:                                           │
│      ├─ Rate limit (429) → retry dopo 5s (max 3 tentativi) │
│      ├─ Server error (500-503) → retry dopo 5s              │
│      ├─ Timeout (60s) → retry dopo 10s                     │
│      └─ Network error → retry dopo 5s                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. RISPOSTA OPENAI                                          │
│    {                                                         │
│      "choices": [{                                          │
│        "message": {                                         │
│          "content": "{\"analysis\": {...}, ...}"          │
│        }                                                    │
│      }],                                                    │
│      "model": "gpt-5.2" (o modello usato)                  │
│    }                                                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. PARSING JSON                                             │
│    - Estrae: data.choices[0].message.content               │
│    - Parse: JSON.parse(content)                            │
│    - Risultato: oggetto countermeasures                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. VALIDAZIONE OUTPUT: validateCountermeasuresOutput()      │
│    - Verifica struttura (analysis, countermeasures)        │
│    - Verifica priorità (high/medium/low)                   │
│    - Verifica reason (obbligatorio, stringa)               │
│    - Se valido → continua                                   │
│    - Se invalido → errore 500                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 9. RESPONSE API                                             │
│    {                                                         │
│      "success": true,                                       │
│      "countermeasures": { ... },                           │
│      "model_used": "gpt-4o"                                │
│    }                                                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 10. FRONTEND: Display                                       │
│     - Analisi Formazione Avversaria                        │
│     - Contromisure Tattiche (formation/tactical)           │
│     - Suggerimenti Giocatori                               │
│     - Istruzioni Individuali                               │
│     - Confidence & Warnings                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. PUNTI CRITICI E DECISIONI

**Spiegazione semplice per non programmatori**

Questa sezione spiega le 4 decisioni più importanti che abbiamo preso quando abbiamo configurato l'IA. Sono scelte tecniche che influenzano come l'IA risponde. Te le spiego in modo semplice.

---

### 9.1 Perché chiediamo all'IA di rispondere SOLO in formato JSON?

**Cosa significa:**
Immagina di chiedere a un assistente di scriverti una lista della spesa. Puoi chiedergli di scrivertela in due modi:
- **Modo 1 (libero):** "Scrivimi la lista" → potrebbe scrivertela come vuole (a mano, con disegni, in ordine sparso)
- **Modo 2 (formato specifico):** "Scrivimi la lista in formato tabella Excel" → deve seguire un formato preciso

Noi usiamo il **Modo 2**: chiediamo all'IA di rispondere SOLO in formato JSON (un formato di dati strutturato, tipo una tabella Excel).

**Perché lo facciamo:**
1. **Consistenza:** L'IA risponde sempre nello stesso formato, come una tabella con colonne fisse
2. **Meno errori:** Se l'IA rispondesse liberamente (tipo un messaggio WhatsApp), potremmo avere problemi a leggere i dati
3. **Facilità di lettura:** Il computer può leggere subito i dati senza dover interpretare testo libero

**Esempio pratico:**
- ❌ **Senza formato JSON:** L'IA potrebbe rispondere: "Ti consiglio di usare 4-3-3 perché è forte. Poi metti Messi in campo. Fai attenzione alle ali."
- ✅ **Con formato JSON:** L'IA risponde sempre così:
  ```
  {
    "formation": "4-3-3",
    "player": "Messi",
    "warning": "Attenzione alle ali"
  }
  ```

**Svantaggio:**
Se la risposta è molto lunga, potrebbe essere tagliata a metà (come un messaggio WhatsApp troppo lungo). Ma abbiamo un controllo che verifica se la risposta è completa.

---

### 9.2 Perché usiamo "Temperature 0.7"?

**Cosa significa:**
La "temperature" è come un "livello di creatività" dell'IA. Funziona così:
- **Temperature 0.0** = L'IA è molto conservativa, risponde sempre quasi uguale (come un robot)
- **Temperature 1.0** = L'IA è molto creativa, risponde in modo sempre diverso (come un artista)

**Perché abbiamo scelto 0.7:**
Abbiamo scelto un valore medio (0.7 su una scala da 0 a 1), che significa:
- ✅ L'IA è abbastanza creativa da dare suggerimenti vari e interessanti
- ✅ Ma non è così creativa da inventare cose strane o irrealistiche

**Esempio pratico:**
Se chiedi all'IA "Come battere il 4-3-3?":
- **Con temperature 0.0:** Risponde sempre: "Usa 3-5-2" (sempre la stessa risposta, noiosa)
- **Con temperature 1.0:** Potrebbe rispondere: "Usa 11 portieri" (troppo creativa, risposta assurda)
- **Con temperature 0.7:** Risponde: "Usa 3-5-2" oppure "Usa 4-2-3-1" (varia, ma sempre sensato)

**Svantaggio:**
Se chiedi la stessa cosa due volte, potresti ricevere risposte leggermente diverse. Ma per le contromisure va bene così: ogni partita è diversa, quindi avere varianti è utile.

---

### 9.3 Perché limitiamo la risposta a 2000 "token"?

**Cosa significa:**
Un "token" è come una parola (più o meno). 2000 token = circa 1500 parole = circa 3 pagine di testo.

**Perché abbiamo scelto 2000:**
1. **Bilanciamento costo/qualità:** Più token = più costoso. 2000 token sono sufficienti per risposte dettagliate senza spendere troppo
2. **Completezza:** 2000 token bastano per dare contromisure complete (formazione, tattiche, giocatori, istruzioni)
3. **Velocità:** Risposte più brevi arrivano più velocemente

**Esempio pratico:**
- **Con 500 token:** L'IA risponde: "Usa 4-3-3. Metti Messi. Vincerai." (troppo breve, poco utile)
- **Con 2000 token:** L'IA risponde: "Usa 4-3-3 perché... [spiegazione dettagliata]. Metti Messi in LWF perché... [motivazione]. Attenzione a... [avvertimenti]." (completo e utile)
- **Con 5000 token:** L'IA risponde con un romanzo (troppo lungo, costoso, lento)

**Svantaggio:**
Se l'IA ha tantissime cose da dire, potrebbe tagliare la risposta a metà. Ma abbiamo un controllo che verifica se tutti i campi obbligatori sono presenti.

---

### 9.4 Perché proviamo più modelli di IA (gpt-5.2, gpt-5, gpt-4o, gpt-4-turbo, gpt-4)?

**Cosa significa:**
OpenAI ha diversi "modelli" di IA (come diverse versioni di un'app):
- **gpt-5.2** = versione più recente e potente (2026)
- **gpt-5** = versione base GPT-5 (2026)
- **gpt-4o** = versione precedente ma stabile
- **gpt-4-turbo** = versione veloce GPT-4
- **gpt-4** = versione base GPT-4

**Perché proviamo in ordine:**
Immagina di voler chiamare un amico e hai 5 numeri di telefono:
1. Provi il primo numero (gpt-5.2) → se risponde, usi quello (migliore qualità)
2. Se non risponde, provi il secondo (gpt-5) → se risponde, usi quello
3. Se non risponde, provi il terzo (gpt-4o) → se risponde, usi quello (fallback stabile)
4. Se non risponde, provi il quarto (gpt-4-turbo) → se risponde, usi quello
5. Se non risponde, provi il quinto (gpt-4) → se risponde, usi quello

**Perché lo facciamo:**
1. **Disponibilità:** A volte un modello potrebbe essere temporaneamente non disponibile (come un telefono spento)
2. **Nessun errore per l'utente:** Se il primo modello non funziona, proviamo automaticamente gli altri senza far vedere errori all'utente
3. **Affidabilità:** Se un modello ha problemi, l'app continua a funzionare con un altro

**Esempio pratico:**
- **Senza fallback:** Se gpt-4o non è disponibile → errore all'utente: "Servizio non disponibile"
- **Con fallback:** Se gpt-4o non è disponibile → proviamo gpt-4-turbo → se funziona, l'utente non vede errori

**Svantaggio:**
Potremmo usare un modello leggermente meno potente (gpt-4 invece di gpt-4o), ma tutti i modelli funzionano bene per le contromisure, quindi va bene così.

---

## RIASSUNTO PUNTO 9 (in parole semplici)

Abbiamo fatto 4 scelte importanti:

1. **Formato JSON:** Chiediamo all'IA di rispondere sempre nello stesso formato (come una tabella), così è più facile da leggere
2. **Creatività media (0.7):** L'IA è abbastanza creativa da variare le risposte, ma non così tanto da dire cose strane
3. **Limite 2000 token:** Limitiamo la lunghezza della risposta per bilanciare qualità, costo e velocità
4. **Fallback modelli:** Prova prima i modelli più recenti (GPT-5.2, GPT-5) per qualità superiore, poi fallback automatico ai modelli precedenti (GPT-4o, GPT-4-turbo, GPT-4) se non disponibili, senza far vedere errori all'utente

Queste scelte rendono il sistema più affidabile, veloce e facile da usare.

---

## 10. ERRORI POSSIBILI E GESTIONE

### 10.1 Errore Parsing JSON

**Causa:**
- JSON malformato da OpenAI
- JSON troncato (max_tokens)
- Markdown nel JSON (nonostante `json_object`)

**Gestione:**
```javascript
try {
  countermeasures = JSON.parse(content)
} catch (parseErr) {
  return NextResponse.json(
    { error: 'Invalid response format from AI' },
    { status: 500 }
  )
}
```

---

### 10.2 Errore Validazione

**Causa:**
- Campi mancanti (analysis, countermeasures)
- Priorità invalida
- Reason mancante

**Gestione:**
```javascript
const validation = validateCountermeasuresOutput(countermeasures)
if (!validation.valid) {
  return NextResponse.json(
    { error: `Invalid countermeasures format: ${validation.error}` },
    { status: 500 }
  )
}
```

---

### 10.3 Errore Timeout

**Causa:**
- Prompt troppo grande (>50KB)
- OpenAI lento
- Network lento

**Gestione:**
- Timeout 60s in `callOpenAIWithRetry`
- Retry automatico (max 3 tentativi)
- Se fallisce → errore 408

---

### 10.4 Errore Rate Limit

**Causa:**
- Troppe richieste OpenAI
- Quota superata

**Gestione:**
- Retry dopo 5s (max 3 tentativi)
- Se fallisce → errore 429

---

## 11. METRICHE E LOGGING

### 11.1 Log Dati Acquisiti

```javascript
console.log('[generate-countermeasures] Data summary:', {
  opponentFormation: opponentFormation.formation_name,
  rosterSize: roster.length,
  titolariCount: titolari.length,
  riserveCount: riserve.length,
  hasClientFormation: !!clientFormation,
  hasTacticalSettings: !!tacticalSettings,
  hasActiveCoach: !!activeCoach,
  matchHistorySize: matchHistory?.length || 0,
  similarFormationMatches: similarFormationMatches.length,
  playerPerformanceCount: Object.keys(playerPerformanceAgainstSimilar).length
})
```

---

### 11.2 Log Chiamata OpenAI

```javascript
console.log(`[generate-countermeasures] Trying model: ${model}, prompt size: ${prompt.length} chars`)
console.log(`[generate-countermeasures] Success with model: ${model}`)
```

---

### 11.3 Log Errori

```javascript
console.error('[generate-countermeasures] Error generating prompt:', promptErr)
console.error('[generate-countermeasures] JSON parse error:', parseErr)
console.error('[generate-countermeasures] Validation error:', validation.error)
console.error('[generate-countermeasures] All models failed. Last error:', lastErrorDetails)
```

---

## 12. CONCLUSIONE

### ✅ Flusso Completo Documentato

**Punti di forza:**
1. ✅ Acquisizione dati completa e strutturata
2. ✅ Prompt dettagliato con tutte le informazioni
3. ✅ Retry logic robusta (timeout, rate limit, server error)
4. ✅ Validazione output completa
5. ✅ Gestione errori granulare
6. ✅ Logging dettagliato per debug

**Aree di miglioramento potenziale:**
- 💡 Cache prompt per formazioni simili (performance)
- 💡 Streaming response per UX migliore (progress indicator)
- 💡 Fallback a prompt semplificato se dati insufficienti
- 💡 Metriche usage (token usati, tempo risposta)

---

**Documento completato:** ✅  
**Data:** 2026-01-28  
**Versione:** 1.0
