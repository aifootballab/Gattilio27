# Progetto: Riassunto AI Coerente - Aggiungi Partita e Ultime Partite

**Data:** 23 Gennaio 2026  
**Ruolo:** Project Manager Full Stack  
**Obiettivo:** Implementare riassunto AI coerente con contromisure live, usando rosa completa e statistiche partita

---

## 📊 ANALISI CODICE ESISTENTE

### 1. **Contromisure Live** (Riferimento di Coerenza)

**Endpoint:** `/api/generate-countermeasures`  
**File:** `app/api/generate-countermeasures/route.js`  
**Helper:** `lib/countermeasuresHelper.js`

**Output JSON Strutturato:**
```json
{
  "analysis": {
    "opponent_formation_analysis": "Analisi dettagliata...",
    "is_meta_formation": true/false,
    "meta_type": "4-3-3",
    "strengths": ["..."],
    "weaknesses": ["..."],
    "why_weaknesses": "..."
  },
  "countermeasures": {
    "formation_adjustments": [{ "type", "suggestion", "reason", "priority" }],
    "tactical_adjustments": [{ "type", "suggestion", "reason", "priority" }],
    "player_suggestions": [{ "player_name", "action", "position", "reason", "priority" }],
    "individual_instructions": [{ "slot", "instruction", "reason" }]
  },
  "confidence": 85,
  "data_quality": "high" | "medium" | "low",
  "warnings": ["..."]
}
```

**UI:** Sezioni espandibili, priorità colorate (high=orange, medium=blue, low=gray), checkbox per selezione

**Dati Usati:**
- Rosa cliente completa (`players`: nome, posizione, overall, skills, com_skills)
- Formazione cliente (`formation_layout`)
- Impostazioni tattiche (`team_tactical_settings`)
- Allenatore attivo (`coaches`)
- Storico match (`matches`)
- Pattern tattici (`team_tactical_patterns`)
- Performance giocatori (`player_performance_aggregates`)
- Formazione avversaria (`opponent_formations`)

---

### 2. **Riassunto Dettaglio Match** (Attuale - Funzionante)

**Endpoint:** `/api/analyze-match`  
**File:** `app/api/analyze-match/route.js`  
**UI:** `app/match/[id]/page.jsx`

**Output JSON Strutturato:**
```json
{
  "analysis": {
    "match_overview": "Riepilogo partita...",
    "result_analysis": "Analisi risultato...",
    "key_highlights": ["..."],
    "strengths": ["..."],
    "weaknesses": ["..."]
  },
  "player_performance": {
    "top_performers": [{ "player_name", "rating", "reason" }],
    "underperformers": [{ "player_name", "rating", "reason", "suggested_replacement" }],
    "suggestions": [{ "player_name", "suggestion", "reason", "priority" }]
  },
  "tactical_analysis": {
    "what_worked": "...",
    "what_didnt_work": "...",
    "formation_effectiveness": "...",
    "suggestions": [{ "suggestion", "reason", "priority" }]
  },
  "recommendations": [{ "title", "description", "reason", "priority" }],
  "confidence": 85,
  "data_quality": "high" | "medium" | "low",
  "warnings": ["..."]
}
```

**UI:** Sezioni espandibili, priorità colorate, struttura identica alle contromisure

**Dati Usati:**
- Rosa cliente (`players`)
- Profilo utente (`user_profiles`: first_name, team_name, how_to_remember, ai_name)
- Formazione avversaria (`opponent_formations` se `opponent_formation_id` presente)
- Dati match: `player_ratings`, `team_stats`, `attack_areas`, `ball_recovery_zones`, `formation_played`, `playing_style_played`, `team_strength`

---

## 🎯 PROGETTO: RIASSUNTO AI COERENTE

### **Principi di Coerenza**

1. **Stesso Formato Output:** JSON strutturato identico al riassunto dettaglio match
2. **Stesso Stile UI:** Sezioni espandibili, priorità colorate, layout coerente
3. **Stessi Dati:** Rosa completa, statistiche, formazione avversaria, profilo utente
4. **Stesso Approccio:** Decision Support System (cosa cambiare, non archivio)
5. **Stesso Tono:** Motivazionale ma costruttivo, personalizzato

---

## 📋 STRUTTURA OUTPUT PROPOSTA

**Endpoint:** `/api/analyze-match` (già esistente, funzionante)

**Output JSON (identico a riassunto dettaglio):**
```json
{
  "analysis": {
    "match_overview": "Riepilogo partita personalizzato rivolto all'utente...",
    "result_analysis": "Analisi risultato contestualizzata...",
    "key_highlights": ["Punto chiave 1", "Punto chiave 2"],
    "strengths": ["Punto di forza 1", "Punto di forza 2"],
    "weaknesses": ["Punto debole 1", "Punto debole 2"]
  },
  "player_performance": {
    "top_performers": [
      {
        "player_name": "Cristiano Ronaldo",
        "rating": 8.5,
        "reason": "Ha segnato 2 gol e creato 3 occasioni..."
      }
    ],
    "underperformers": [
      {
        "player_name": "Giocatore X",
        "rating": 5.5,
        "reason": "Ha perso 8 palloni in centrocampo...",
        "suggested_replacement": "Frenkie de Jong (Overall 94, Skills: Dribbling, Passaggio)"
      }
    ],
    "suggestions": [
      {
        "player_name": "Jude Bellingham",
        "suggestion": "Inserisci come trequartista",
        "reason": "Le sue skills di dribbling e controllo palla potrebbero migliorare il centrocampo...",
        "priority": "high"
      }
    ]
  },
  "tactical_analysis": {
    "what_worked": "Il contrattacco ha funzionato bene contro la formazione 4-3-3 avversaria...",
    "what_didnt_work": "Il centrocampo è stato sopraffatto nella fase di possesso...",
    "formation_effectiveness": "La formazione 4-2-1-3 ha funzionato in attacco ma ha lasciato spazi in difesa...",
    "suggestions": [
      {
        "suggestion": "Rinforza centrocampo con un mediano aggiuntivo",
        "reason": "Contro formazioni 4-3-3, serve più copertura centrale...",
        "priority": "high"
      }
    ]
  },
  "recommendations": [
    {
      "title": "Sostituisci Giocatore X con Frenkie de Jong",
      "description": "Frenkie de Jong (Overall 94) ha skills di passaggio e controllo palla che potrebbero migliorare il centrocampo",
      "reason": "Il centrocampo ha perso 12 palloni, serve più controllo",
      "priority": "high"
    },
    {
      "title": "Cambia formazione a 3-5-2",
      "description": "Contro formazioni 4-3-3, un centrocampo a 5 ti dà più controllo",
      "reason": "Nella partita hai perso il controllo del centrocampo dal minuto 25",
      "priority": "medium"
    }
  ],
  "confidence": 85,
  "data_quality": "high",
  "warnings": ["Analisi basata su dati parziali (60% completezza)..."]
}
```

---

## 🎨 UI PROPOSTA

### **Aggiungi Partita** (`app/match/new/page.jsx`)

**Posizione:** Nel modal riepilogo, dopo sezioni complete/mancanti

**Layout:**
```
┌─────────────────────────────────────────┐
│ 📋 Riepilogo Partita                     │
│                                         │
│ Risultato: 6-1                          │
│ Sezioni Complete: 3/5                   │
│                                         │
│ 🧠 Analisi AI                            │
│ [Genera Riassunto AI]                    │
│                                         │
│ (Dopo generazione)                       │
│ ┌─────────────────────────────────────┐ │
│ │ 📊 Riepilogo Partita (espandibile)  │ │
│ │ - match_overview                    │ │
│ │ - key_highlights                    │ │
│ │ - strengths/weaknesses             │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 👥 Performance Giocatori (espand.) │ │
│ │ - top_performers                    │ │
│ │ - underperformers                   │ │
│ │ - suggestions                       │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 🛡️ Analisi Tattica (espandibile)    │ │
│ │ - what_worked                       │ │
│ │ - what_didnt_work                   │ │
│ │ - suggestions                       │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 🎯 Raccomandazioni (espandibile)    │ │
│ │ - recommendations (con priorità)  │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Conferma e Salva] [Annulla]            │
└─────────────────────────────────────────┘
```

**Caratteristiche:**
- Sezioni espandibili (come contromisure)
- Priorità colorate (high=orange, medium=blue, low=gray)
- Badge confidence se < 100%
- Warnings se dati parziali
- Salvataggio `ai_summary` quando si salva il match

---

### **Ultime Partite** (`app/page.jsx` - Dashboard)

**Posizione:** In ogni card match, sotto risultato

**Layout:**
```
┌─────────────────────────────────────────┐
│ vs Avversario                            │
│ 23/01/2026 • 15:30                      │
│ Risultato: 6-1                           │
│                                         │
│ 🧠 Analisi AI                            │
│ [Genera Riassunto AI]                    │
│                                         │
│ (Dopo generazione)                       │
│ ┌─────────────────────────────────────┐ │
│ │ 📊 Preview Riassunto                │ │
│ │ match_overview (primi 120 caratteri)│ │
│ │ [Leggi tutto →]                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ (Click "Leggi tutto" → pagina dettaglio)│
└─────────────────────────────────────────┘
```

**Caratteristiche:**
- Preview breve (120 caratteri)
- Link "Leggi tutto" → pagina dettaglio match
- Badge "Riassunto Disponibile" se presente
- Salvataggio `ai_summary` nel match

---

## 🔧 IMPLEMENTAZIONE TECNICA

### **1. Endpoint `/api/analyze-match`**

**Status:** ✅ Già esistente e funzionante

**Dati Recuperati:**
- ✅ Profilo utente (`user_profiles`)
- ✅ Rosa cliente (`players` - max 50, ordinati per overall)
- ✅ Formazione avversaria (`opponent_formations` se `opponent_formation_id` presente)
- ✅ Dati match (da `matchData` passato)

**Output:** JSON strutturato (già implementato)

**Modifiche Necessarie:** NESSUNA (già funzionante)

---

### **2. Frontend - Aggiungi Partita** (`app/match/new/page.jsx`)

**Aggiunte:**
1. Stato: `analysisSummary`, `analysisConfidence`, `missingSections`, `generatingAnalysis`
2. Funzione: `handleGenerateAnalysis()` - chiama `/api/analyze-match` con `matchData` completo
3. UI: Sezione "Analisi AI" nel modal riepilogo (sezioni espandibili identiche a dettaglio match)
4. Salvataggio: Includere `ai_summary` in `matchData` quando si salva (come JSON string)

**Dati da Passare:**
```javascript
const matchData = {
  result: matchResult,
  player_ratings: stepData.player_ratings,
  team_stats: stepData.team_stats,
  attack_areas: stepData.attack_areas,
  ball_recovery_zones: stepData.ball_recovery_zones,
  formation_played: stepData.formation_style?.formation_played,
  playing_style_played: stepData.formation_style?.playing_style_played,
  team_strength: stepData.formation_style?.team_strength,
  opponent_formation_id: stepData.opponent_formation_id || null, // Se disponibile
  client_team_name: stepData.client_team_name || null // Se disponibile
}
```

---

### **3. Frontend - Ultime Partite** (`app/page.jsx`)

**Aggiunte:**
1. Stato: `generatingSummaryId`, `summaryError`
2. Funzione: `handleGenerateSummary(matchId)` - carica match completo, chiama `/api/analyze-match`, salva `ai_summary`
3. UI: Preview riassunto in card match (120 caratteri) + link "Leggi tutto"
4. Query: Includere `ai_summary` nella SELECT delle partite

**Dati da Passare:**
```javascript
// Carica match completo dal DB
const { data: fullMatch } = await supabase
  .from('matches')
  .select('*')
  .eq('id', matchId)
  .single()

const matchData = {
  result: fullMatch.result,
  player_ratings: fullMatch.player_ratings,
  team_stats: fullMatch.team_stats,
  attack_areas: fullMatch.attack_areas,
  ball_recovery_zones: fullMatch.ball_recovery_zones,
  formation_played: fullMatch.formation_played,
  playing_style_played: fullMatch.playing_style_played,
  team_strength: fullMatch.team_strength,
  opponent_formation_id: fullMatch.opponent_formation_id,
  client_team_name: fullMatch.client_team_name
}
```

---

## 🎯 COERENZA CON CONTROMISURE

### **Dati Condivisi:**
- ✅ **Rosa Cliente:** Stessa query, stesso formato
- ✅ **Formazione Avversaria:** Stesso recupero da `opponent_formations`
- ✅ **Profilo Utente:** Stesso recupero da `user_profiles`
- ✅ **Formazione Cliente:** Stesso recupero da `formation_layout` (se disponibile)

### **Output Coerente:**
- ✅ **Formato JSON:** Struttura identica (analysis, player_performance, tactical_analysis, recommendations)
- ✅ **Priorità:** Stesso sistema (high, medium, low)
- ✅ **Motivazioni:** Ogni suggerimento ha `reason` dettagliata
- ✅ **Confidence:** Stesso calcolo basato su dati disponibili
- ✅ **Warnings:** Stesso formato per dati parziali

### **UI Coerente:**
- ✅ **Sezioni Espandibili:** Stesso pattern delle contromisure
- ✅ **Priorità Colorate:** Stessi colori (high=orange, medium=blue, low=gray)
- ✅ **Layout:** Stesso stile card, padding, spacing
- ✅ **Icone:** Stesse icone (Trophy, Users, Shield, Target)

---

## 📊 DATI DISPONIBILI

### **Rosa Cliente** (`players`)
- `player_name`, `position`, `overall_rating`
- `skills` (array), `com_skills` (array)
- `base_stats` (JSONB)
- Max 50 giocatori (ordinati per overall desc)

### **Statistiche Partita** (`matchData`)
- `player_ratings`: Voti giocatori (cliente/avversario)
- `team_stats`: Possesso, tiri, passaggi, gol, ecc.
- `attack_areas`: Percentuali sinistra/centro/destra
- `ball_recovery_zones`: Array zone recupero
- `formation_played`, `playing_style_played`, `team_strength`
- `result`: Risultato partita

### **Formazione Avversaria** (`opponent_formations`)
- `formation_name`, `playing_style`
- `overall_strength`, `tactical_style`
- `players` (array giocatori)

### **Profilo Utente** (`user_profiles`)
- `first_name`, `team_name`
- `how_to_remember`, `ai_name`

---

## 🎨 PROMPT AI (Coerente con Contromisure)

**Stesso Approccio:**
1. **Contesto:** Coach motivazionale eFootball
2. **Dati Match:** Tutte le statistiche disponibili
3. **Rosa Cliente:** Giocatori con skills e overall
4. **Formazione Avversaria:** Se disponibile, analisi tattica
5. **Profilo Utente:** Personalizzazione (nome, squadra, preferenze)
6. **Focus:** Decision Support System (cosa cambiare)
7. **Tono:** Motivazionale ma costruttivo, rivolto direttamente all'utente

**Istruzioni Specifiche:**
- Identifica quale squadra è quella del cliente
- Analizza performance della squadra cliente (non avversaria)
- Confronta pagelle con rosa disponibile
- Suggerisci alternative dalla rosa se giocatori hanno performato male
- Analizza cosa ha funzionato contro formazione avversaria (se disponibile)
- Suggerimenti concreti basati su skills e overall giocatori
- Priorità: high (cambiamenti critici), medium (miglioramenti), low (ottimizzazioni)

---

## ✅ VANTAGGI APPROCCIO

1. **Coerenza Totale:** Stesso formato, stesso stile, stessi dati
2. **Riutilizzo Codice:** Endpoint già funzionante, UI riutilizzabile
3. **Esperienza Utente:** Interfaccia familiare (stesso pattern contromisure)
4. **Decision Support:** Focus su cosa cambiare, non archivio
5. **Personalizzazione:** Usa profilo utente per tono e contesto
6. **Dati Completi:** Usa rosa completa con skills per suggerimenti precisi

---

## 📝 PROSSIMI PASSI

1. ✅ Analisi completata
2. ⏳ Implementazione UI in `match/new/page.jsx`
3. ⏳ Implementazione UI in `page.jsx` (dashboard)
4. ⏳ Test end-to-end
5. ⏳ Aggiornamento documentazione

---

## ⚠️ NOTE IMPORTANTI

- **Endpoint `/api/analyze-match`:** Già funzionante, non modificare
- **Formato Output:** Identico a riassunto dettaglio match (già strutturato)
- **UI:** Replicare pattern contromisure (sezioni espandibili, priorità)
- **Dati:** Passare sempre `opponent_formation_id` e `client_team_name` se disponibili
- **Salvataggio:** `ai_summary` come JSON string nel DB (come già fatto in dettaglio)

---

**Pronto per implementazione dopo approvazione.**
