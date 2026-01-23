# Implementazione Riassunto AI Enterprise - Aggiungi Partita e Ultime Partite

**Data:** 23 Gennaio 2026  
**Versione:** Enterprise (Doppia Lingua, Sicurezza, Storico)  
**Obiettivo:** Riassunto AI post-partita con disposizione reale giocatori, storico andamento, doppia lingua

---

## 🎯 REQUISITI ENTERPRISE

### **1. Suggerimenti Basati su Disposizione Reale**
- ✅ Usare `players_in_match` (JSONB) per disposizione reale giocatori in campo
- ✅ Considerare posizioni reali (`slot_index`, `position`) per suggerimenti precisi
- ✅ Confrontare formazione reale vs formazione salvata (se disponibile)

### **2. Storico Andamento Cliente**
- ✅ Recuperare ultimi 20-30 match per analisi pattern
- ✅ Identificare formazioni che il cliente soffre di più
- ✅ Analizzare win/loss rate per formazione avversaria
- ✅ Pattern ricorrenti (problemi che si ripetono)

### **3. Doppia Lingua (IT/EN)**
- ✅ Output bilingue: italiano e inglese
- ✅ Prompt in italiano, output strutturato con campi IT/EN
- ✅ UI supporta entrambe le lingue

### **4. Sicurezza**
- ✅ Autenticazione Bearer token obbligatoria
- ✅ Rate limiting (già implementato)
- ✅ Sanitizzazione input (già implementato)
- ✅ Validazione dati Supabase (RLS)

### **5. Dati Parziali**
- ✅ Specificare chiaramente quando dati sono parziali
- ✅ Warnings per sezioni mancanti
- ✅ Confidence score basato su completezza dati

---

## 📊 STRUTTURA DATI

### **1. `players_in_match` (JSONB)**
```json
[
  {
    "name": "Samuel Eto'o",
    "position": "SP",
    "slot_index": 8,
    "overall_rating": 104,
    "matched_player_id": "uuid" | null,
    "match_status": "matched" | "not_found" | "different"
  }
]
```

**Uso:**
- Disposizione reale giocatori in campo
- Posizioni reali (`slot_index` 0-10)
- Confronto con rosa disponibile

### **2. Storico Match (ultimi 20-30)**
```javascript
const matchHistory = await admin
  .from('matches')
  .select('id, opponent_name, result, formation_played, playing_style_played, opponent_formation_id, match_date')
  .eq('user_id', userId)
  .order('match_date', { ascending: false })
  .limit(30)
```

**Analisi:**
- Formazioni avversarie più frequenti
- Win/loss rate per formazione avversaria
- Pattern ricorrenti (problemi che si ripetono)

---

## 🔧 MODIFICHE ENDPOINT `/api/analyze-match`

### **1. Recupero Dati Aggiuntivi**

```javascript
// 1. Recupera players_in_match dal match (se presente)
let playersInMatch = []
if (matchData.players_in_match && Array.isArray(matchData.players_in_match)) {
  playersInMatch = matchData.players_in_match
}

// 2. Recupera storico match (ultimi 30)
let matchHistory = []
let tacticalPatterns = null
if (serviceKey) {
  try {
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
    
    // Storico match
    const { data: history, error: historyError } = await admin
      .from('matches')
      .select('id, opponent_name, result, formation_played, playing_style_played, opponent_formation_id, match_date, ai_summary')
      .eq('user_id', userId)
      .order('match_date', { ascending: false })
      .limit(30)
    
    if (!historyError && history) {
      matchHistory = history
    }
    
    // Pattern tattici (se disponibili)
    const { data: patterns, error: patternsError } = await admin
      .from('team_tactical_patterns')
      .select('formation_usage, playing_style_usage, recurring_issues')
      .eq('user_id', userId)
      .maybeSingle()
    
    if (!patternsError && patterns) {
      tacticalPatterns = patterns
    }
  } catch (err) {
    console.warn('[analyze-match] Error retrieving history:', err)
  }
}
```

### **2. Analisi Storico**

```javascript
function analyzeMatchHistory(matchHistory, currentOpponentFormationId) {
  const analysis = {
    totalMatches: matchHistory.length,
    formationsStruggled: {}, // Formazioni avversarie contro cui ha perso più spesso
    winRateByOpponentFormation: {},
    recurringIssues: [],
    recentTrend: 'stable' // 'improving' | 'declining' | 'stable'
  }
  
  if (matchHistory.length === 0) {
    return analysis
  }
  
  // Analizza formazioni avversarie
  const opponentFormationStats = {}
  matchHistory.forEach(match => {
    if (match.opponent_formation_id) {
      const formationId = match.opponent_formation_id
      if (!opponentFormationStats[formationId]) {
        opponentFormationStats[formationId] = { wins: 0, losses: 0, draws: 0, total: 0 }
      }
      opponentFormationStats[formationId].total++
      
      const result = match.result || ''
      if (result.includes('W') || result.includes('Vittoria') || result.includes('Win')) {
        opponentFormationStats[formationId].wins++
      } else if (result.includes('L') || result.includes('Sconfitta') || result.includes('Loss')) {
        opponentFormationStats[formationId].losses++
      } else {
        opponentFormationStats[formationId].draws++
      }
    }
  })
  
  // Identifica formazioni che soffre (loss rate > 50%)
  Object.entries(opponentFormationStats).forEach(([formationId, stats]) => {
    const lossRate = stats.total > 0 ? (stats.losses / stats.total) * 100 : 0
    if (lossRate > 50 && stats.total >= 2) {
      analysis.formationsStruggled[formationId] = {
        lossRate: lossRate.toFixed(0),
        matches: stats.total,
        wins: stats.wins,
        losses: stats.losses
      }
    }
    
    // Win rate per formazione
    const winRate = stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(0) : 0
    analysis.winRateByOpponentFormation[formationId] = {
      winRate: parseInt(winRate),
      matches: stats.total
    }
  })
  
  // Analizza trend recente (ultimi 10 match)
  const recentMatches = matchHistory.slice(0, 10)
  const recentWins = recentMatches.filter(m => {
    const result = m.result || ''
    return result.includes('W') || result.includes('Vittoria') || result.includes('Win')
  }).length
  const recentWinRate = (recentWins / recentMatches.length) * 100
  
  const olderMatches = matchHistory.slice(10, 20)
  if (olderMatches.length > 0) {
    const olderWins = olderMatches.filter(m => {
      const result = m.result || ''
      return result.includes('W') || result.includes('Vittoria') || result.includes('Win')
    }).length
    const olderWinRate = (olderWins / olderMatches.length) * 100
    
    if (recentWinRate > olderWinRate + 10) {
      analysis.recentTrend = 'improving'
    } else if (recentWinRate < olderWinRate - 10) {
      analysis.recentTrend = 'declining'
    }
  }
  
  return analysis
}
```

---

## 🎨 PROMPT AGGIORNATO (Enterprise)

### **Sezione Disposizione Reale**

```javascript
// Costruisci sezione DISPOSIZIONE REALE GIOCATORI
let playersInMatchText = ''
if (playersInMatch && playersInMatch.length > 0) {
  playersInMatchText = `\nDISPOSIZIONE REALE GIOCATORI IN CAMPO (${playersInMatch.length} giocatori):\n`
  playersInMatch.forEach((player, idx) => {
    const slotInfo = player.slot_index !== undefined ? `Slot ${player.slot_index}` : ''
    const matchStatus = player.match_status === 'matched' ? '✓' : player.match_status === 'not_found' ? '⚠️' : '⚠️'
    playersInMatchText += `${idx + 1}. ${matchStatus} ${player.name || 'N/A'} - ${player.position || 'N/A'} ${slotInfo} - Overall: ${player.overall_rating || 'N/A'}\n`
  })
  playersInMatchText += `\n⚠️ IMPORTANTE: I suggerimenti devono essere basati sulla DISPOSIZIONE REALE in campo, non sulla formazione salvata.\n`
  playersInMatchText += `- Analizza performance dei giocatori nella loro posizione reale\n`
  playersInMatchText += `- Suggerisci cambiamenti basati su posizioni reali (slot_index)\n`
  playersInMatchText += `- Considera se giocatori sono stati usati fuori posizione\n`
} else {
  playersInMatchText = `\nDISPOSIZIONE REALE GIOCATORI: Non disponibile (formazione non caricata)\n`
  playersInMatchText += `⚠️ I suggerimenti saranno basati solo su pagelle e statistiche, non su disposizione reale.\n`
}
```

### **Sezione Storico Andamento**

```javascript
// Costruisci sezione STORICO ANDAMENTO
let historyAnalysisText = ''
if (historyAnalysis && historyAnalysis.totalMatches > 0) {
  historyAnalysisText = `\nSTORICO ANDAMENTO CLIENTE (${historyAnalysis.totalMatches} partite analizzate):\n`
  
  // Formazioni che soffre
  const strugglingFormations = Object.keys(historyAnalysis.formationsStruggled)
  if (strugglingFormations.length > 0) {
    historyAnalysisText += `\n🚨 FORMAZIONI CHE SOFFRE DI PIÙ:\n`
    strugglingFormations.forEach(formationId => {
      const stats = historyAnalysis.formationsStruggled[formationId]
      historyAnalysisText += `- Formazione ID ${formationId}: Loss rate ${stats.lossRate}% (${stats.losses} sconfitte su ${stats.matches} match)\n`
    })
    historyAnalysisText += `\n⚠️ IMPORTANTE: Se la formazione avversaria di questa partita è simile a quelle che soffre, suggerisci contromisure specifiche.\n`
  }
  
  // Trend recente
  if (historyAnalysis.recentTrend === 'declining') {
    historyAnalysisText += `\n📉 TREND RECENTE: In calo (ultimi 10 match peggiori dei precedenti)\n`
    historyAnalysisText += `- Identifica problemi ricorrenti e suggerisci cambiamenti significativi\n`
  } else if (historyAnalysis.recentTrend === 'improving') {
    historyAnalysisText += `\n📈 TREND RECENTE: In miglioramento (ultimi 10 match migliori dei precedenti)\n`
    historyAnalysisText += `- Mantieni focus su cosa ha funzionato recentemente\n`
  }
  
  // Pattern ricorrenti (da tactical_patterns se disponibile)
  if (tacticalPatterns && tacticalPatterns.recurring_issues && Array.isArray(tacticalPatterns.recurring_issues)) {
    if (tacticalPatterns.recurring_issues.length > 0) {
      historyAnalysisText += `\n⚠️ PROBLEMI RICORRENTI IDENTIFICATI:\n`
      tacticalPatterns.recurring_issues.slice(0, 5).forEach(issue => {
        historyAnalysisText += `- ${issue.issue || issue}: Frequenza ${issue.frequency || 'alta'}, Severità ${issue.severity || 'media'}\n`
      })
      historyAnalysisText += `\n⚠️ IMPORTANTE: Considera questi problemi ricorrenti nei suggerimenti.\n`
    }
  }
} else {
  historyAnalysisText = `\nSTORICO ANDAMENTO: Non disponibile (meno di 2 partite caricate)\n`
  historyAnalysisText += `⚠️ Più partite carichi, migliore sarà l'analisi del tuo andamento.\n`
}
```

### **Istruzioni Prompt (Aggiornate)**

```javascript
ISTRUZIONI PER L'ANALISI (COACH MOTIVAZIONALE - ENTERPRISE):
1. Identifica chiaramente quale squadra è quella del cliente${clientTeamName ? ` (${clientTeamName})` : ''} e analizza le sue performance (non quelle dell'avversario)

2. DISPOSIZIONE REALE GIOCATORI:
   a) Usa la DISPOSIZIONE REALE in campo (players_in_match) per analisi precisa
   b) Analizza performance dei giocatori nella loro posizione reale (slot_index)
   c) Identifica se giocatori sono stati usati fuori posizione e impatto sulle performance
   d) Suggerisci cambiamenti basati su posizioni reali, non su formazione salvata

3. STORICO ANDAMENTO:
   a) Se il cliente soffre contro formazioni simili a quella avversaria, evidenzia il problema
   b) Suggerisci contromisure specifiche basate su storico (se disponibile)
   c) Considera trend recente (miglioramento/declino) per suggerimenti contestuali
   d) Se ci sono problemi ricorrenti, suggerisci soluzioni concrete

4. Rispondi a queste domande intrinseche:
   a) Come è andato il match? (risultato, performance generale della squadra cliente)
   b) Quali giocatori hanno performato bene/male nella loro posizione reale? (confronta pagelle con disposizione reale e rosa disponibile)
   c) Cosa ha funzionato contro questa formazione avversaria? (analisi tattica basata su formazione avversaria e storico)
   d) Cosa cambiare per migliorare? (suggerimenti concreti basati su dati, rosa, disposizione reale, storico)
   e) Quali giocatori della rosa potrebbero essere utili? (suggerimenti specifici basati su skills, overall, e posizioni reali)

5. Sii un coach motivazionale: incoraggiante ma costruttivo, focalizzato sul supporto decisionale

6. Incrocia i dati: usa rosa disponibile, formazione avversaria, disposizione reale, statistiche, storico per analisi coerente e contestuale

7. ${confidence < 0.5 ? '⚠️ ATTENZIONE: Dati molto limitati. Sottolinea chiaramente che l\'analisi è basata su informazioni parziali e che per suggerimenti più precisi servono più dati.' : ''}

8. ${missingSections.length > 0 ? `Alla fine, aggiungi una nota: "⚠️ Nota: Analisi basata su dati parziali (${Math.round(confidence * 100)}% completezza). Per suggerimenti più precisi, carica anche: ${missingSections.join(', ')}."` : ''}

9. Genera un riassunto in DOPPIA LINGUA (italiano e inglese) - max 300 parole per lingua, breve ma completo

10. Focus su: Decision Support System - cosa cambiare, non archivio dati

11. Formato OUTPUT JSON (bilingue):
{
  "analysis": {
    "match_overview": {
      "it": "Riepilogo partita in italiano...",
      "en": "Match summary in English..."
    },
    "result_analysis": {
      "it": "Analisi risultato in italiano...",
      "en": "Result analysis in English..."
    },
    "key_highlights": {
      "it": ["Punto chiave 1", "Punto chiave 2"],
      "en": ["Key highlight 1", "Key highlight 2"]
    },
    "strengths": {
      "it": ["Punto di forza 1", "Punto di forza 2"],
      "en": ["Strength 1", "Strength 2"]
    },
    "weaknesses": {
      "it": ["Punto debole 1", "Punto debole 2"],
      "en": ["Weakness 1", "Weakness 2"]
    }
  },
  "player_performance": {
    "top_performers": [
      {
        "player_name": "Cristiano Ronaldo",
        "rating": 8.5,
        "reason": {
          "it": "Ha segnato 2 gol e creato 3 occasioni...",
          "en": "Scored 2 goals and created 3 chances..."
        },
        "real_position": "SP", // Posizione reale in campo
        "slot_index": 8
      }
    ],
    "underperformers": [
      {
        "player_name": "Giocatore X",
        "rating": 5.5,
        "reason": {
          "it": "Ha perso 8 palloni in centrocampo...",
          "en": "Lost 8 balls in midfield..."
        },
        "real_position": "CMF",
        "slot_index": 5,
        "suggested_replacement": {
          "it": "Frenkie de Jong (Overall 94, Skills: Dribbling, Passaggio)",
          "en": "Frenkie de Jong (Overall 94, Skills: Dribbling, Passing)"
        }
      }
    ],
    "suggestions": [
      {
        "player_name": "Jude Bellingham",
        "suggestion": {
          "it": "Inserisci come trequartista",
          "en": "Insert as attacking midfielder"
        },
        "reason": {
          "it": "Le sue skills di dribbling e controllo palla potrebbero migliorare il centrocampo...",
          "en": "His dribbling and ball control skills could improve midfield..."
        },
        "priority": "high",
        "real_position": "AMF",
        "slot_index": 6
      }
    ]
  },
  "tactical_analysis": {
    "what_worked": {
      "it": "Il contrattacco ha funzionato bene contro la formazione 4-3-3 avversaria...",
      "en": "Counter-attack worked well against opponent's 4-3-3 formation..."
    },
    "what_didnt_work": {
      "it": "Il centrocampo è stato sopraffatto nella fase di possesso...",
      "en": "Midfield was overwhelmed in possession phase..."
    },
    "formation_effectiveness": {
      "it": "La formazione 4-2-1-3 ha funzionato in attacco ma ha lasciato spazi in difesa...",
      "en": "The 4-2-1-3 formation worked in attack but left spaces in defense..."
    },
    "suggestions": [
      {
        "suggestion": {
          "it": "Rinforza centrocampo con un mediano aggiuntivo",
          "en": "Strengthen midfield with an additional defensive midfielder"
        },
        "reason": {
          "it": "Contro formazioni 4-3-3, serve più copertura centrale...",
          "en": "Against 4-3-3 formations, more central coverage is needed..."
        },
        "priority": "high"
      }
    ]
  },
  "recommendations": [
    {
      "title": {
        "it": "Sostituisci Giocatore X con Frenkie de Jong",
        "en": "Replace Player X with Frenkie de Jong"
      },
      "description": {
        "it": "Frenkie de Jong (Overall 94) ha skills di passaggio e controllo palla che potrebbero migliorare il centrocampo",
        "en": "Frenkie de Jong (Overall 94) has passing and ball control skills that could improve midfield"
      },
      "reason": {
        "it": "Il centrocampo ha perso 12 palloni, serve più controllo",
        "en": "Midfield lost 12 balls, more control is needed"
      },
      "priority": "high"
    }
  ],
  "historical_insights": {
    "it": "Storico: Hai perso 3 volte su 4 contro formazioni 4-3-3. Considera cambiamenti tattici specifici.",
    "en": "History: You lost 3 out of 4 times against 4-3-3 formations. Consider specific tactical changes."
  },
  "confidence": 85,
  "data_quality": "high",
  "warnings": {
    "it": ["Analisi basata su dati parziali (60% completezza)..."],
    "en": ["Analysis based on partial data (60% completeness)..."]
  }
}

12. Formato: Testo continuo, naturale, in DOPPIA LINGUA, motivazionale ma costruttivo, rivolto direttamente${userName ? ` a ${userName}` : ' all\'utente'} (usa "tu", "la tua squadra", "tuo" in italiano, "you", "your team", "your" in inglese)

13. ${conservativeMode ? 'SII CONSERVATIVO: Evita conclusioni categoriche con dati limitati. Indica quando le analisi sono basate su dati parziali.' : 'Puoi essere più specifico, hai dati completi.'}
```

---

## 🔒 SICUREZZA (Verificata)

### **1. Autenticazione**
- ✅ Bearer token obbligatorio (`extractBearerToken`, `validateToken`)
- ✅ Validazione user_id per ogni query Supabase

### **2. Rate Limiting**
- ✅ Configurato in `RATE_LIMIT_CONFIG['/api/analyze-match']`
- ✅ Headers rate limit restituiti

### **3. Sanitizzazione Input**
- ✅ Limite lunghezza stringhe (result: 50, formation: 100)
- ✅ Validazione tipo dati (JSONB, array, object)
- ✅ Max prompt size: 50KB

### **4. RLS Supabase**
- ✅ Tutte le query filtrano per `user_id`
- ✅ Service role key solo per operazioni server-side

---

## 📝 PROSSIMI PASSI

1. ✅ Analisi completata
2. ⏳ Modificare `generateAnalysisPrompt()` per includere:
   - Disposizione reale giocatori
   - Storico andamento
   - Doppia lingua
3. ⏳ Modificare recupero dati in `/api/analyze-match`:
   - Recuperare `players_in_match` da matchData
   - Recuperare storico match (ultimi 30)
   - Recuperare pattern tattici
4. ⏳ Aggiornare parsing output JSON (supporto bilingue)
5. ⏳ Test end-to-end
6. ⏳ Aggiornamento documentazione

---

## ⚠️ NOTE IMPORTANTI

- **`players_in_match`:** Deve essere passato in `matchData` quando si chiama `/api/analyze-match`
- **Storico:** Recuperato automaticamente dal DB (ultimi 30 match)
- **Doppia Lingua:** Output JSON con campi `it` e `en` per ogni testo
- **UI:** Frontend deve supportare selezione lingua (IT/EN) e mostrare testo appropriato
- **Retrocompatibilità:** Se `players_in_match` non presente, funziona comunque (con warning)

---

**Pronto per implementazione.**
