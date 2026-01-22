# 🎮 Architettura Match e Analisi - eFootball AI Coach

**Data**: Gennaio 2025  
**Versione**: 1.0 (Work in Progress)  
**Focus**: Decision Support System, non archivio dati

---

## 🎯 OBIETTIVO

Trasformare dati grezzi di fine partita in:
1. **Riassunto testuale chiaro** (executive summary)
2. **Insight tattici rilevanti** (2-3 punti chiave)
3. **Raccomandazioni operative concrete** (cosa cambiare)

**NON** stiamo costruendo:
- Dashboard complesse
- Archivio statistiche
- Sito di data analytics
- Sistema di ricerca avanzata statistiche

**SÌ** stiamo costruendo:
- Decision support system
- Riassunti testuali chiari
- Raccomandazioni operative concrete
- Storico partite con anteprima riassunto (non statistiche)
- **Pay-per-use model** (credits solo per ciò che viene usato)
- **Dati parziali supportati** (più dati = migliore aiuto, ma funziona anche con meno)
- **Real-time opzionale** (suggerimenti tradizionali sempre disponibili)
- **⭐ BARRA CONOSCENZA IA** (incentiva a caricare più dati: più carichi, più ti aiuto)
- **Gamification** (cliente vede progresso conoscenza in tempo reale)

---

## 📊 DATI INPUT DAL CLIENTE

### 0. Formazione Avversaria (Screenshot - PRE-PARTITA)
**Quando**: Prima della partita (fase di caricamento)
**Cosa contiene**:
- Formazione avversaria (es. 4-3-3)
- 11 giocatori avversari con posizioni
- Stile di gioco avversario (se visibile)
- Forza complessiva avversaria (se visibile)

**Obiettivo**:
- Incrociare con formazione propria (salvata in rosa)
- Generare **contromisure tattiche** immediate
- Suggerimenti per la partita imminente

**Output Atteso**:
- Contromisure operative concrete (es. "Rinforza centrocampo, avversario gioca 4-3-3")
- Suggerimenti posizionamento (es. "Sposta mediano più indietro")
- Istruzioni individuali suggerite (es. "Marcatura uomo su giocatore X")

**NON** stiamo facendo:
- Analisi complessa avversario (solo contromisure immediate)
- Archivio formazioni avversarie (solo per questa partita)

### 1. Formazione in Campo (Screenshot - POST-PARTITA)
**Cosa contiene**:
- Formazione reale giocata (es. 4-2-1-3)
- 11 giocatori titolari con posizioni
- Stile di gioco attivo (es. "Contrattacco")
- Forza complessiva squadra

**Problema da gestire**:
- Formazione salvata ≠ Formazione giocata
- Esempio: De Jong in gestione, ma Cafu in partita
- **Soluzione**: Salvare formazione reale e confrontarla con quella salvata

### 2. Pagelle Giocatori (Screenshot)
**Cosa contiene**:
- Voti numerici per ogni giocatore (es. 8.5, 6.0, 5.5)
- Numero maglia + nome giocatore
- Stellina per performance eccezionale

**Matching**:
- Collegamento per **nome** (non per ID)
- Gestire varianti nome (es. "Eto'o" vs "Samuel Eto'o")

### 3. Statistiche Squadra (Screenshot)
**Cosa contiene** (TUTTE le statistiche visibili):
- **Possesso di palla** (49% vs 51%)
- **Tiri totali** (16 vs 8)
- **Tiri in porta** (10 vs 4)
- **Falli** (0 vs 0)
- **Fuorigioco** (0 vs 0)
- **Calci d'angolo** (2 vs 1)
- **Punizioni** (0 vs 0)
- **Passaggi** (110 vs 137)
- **Passaggi riusciti** (81 vs 100)
- **Cross** (0 vs 0)
- **Passaggi intercettati** (29 vs 20)
- **Contrasti** (4 vs 5)
- **Parate** (4 vs 3)
- **Gol segnati / subiti** (calcolati dal risultato o da grafico rete)

### 3b. Grafico Rete / Eventi Gol (Screenshot - Opzionale ma importante)
**Cosa contiene**:
- Minuto di ogni gol
- Marcatore (nome giocatore)
- Assist (se presente)
- Tipo gol (normale, rigore, autogol)
- Squadra (propria o avversaria)

### 4. Aree di Attacco (Screenshot)
**Cosa contiene**:
- Percentuali per zona: sinistra, centro, destra
- Per entrambe le squadre

### 5. Aree di Recupero Palla (Screenshot)
**Cosa contiene**:
- Mappa di campo con punti verdi
- Distribuzione spaziale recuperi
- Direzione d'attacco

---

## 🗄️ DATABASE SCHEMA

### Tabella `opponent_formations` (Formazioni Avversarie - PRE-PARTITA) ⭐ PRIMA COSA

```sql
CREATE TABLE opponent_formations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE, -- NULL se pre-partita
  
  -- Dati base
  opponent_name TEXT,
  match_date TIMESTAMPTZ DEFAULT NOW(),
  is_pre_match BOOLEAN DEFAULT true, -- true = pre-partita, false = post-partita
  
  -- FORMAZIONE AVVERSARIA (da screenshot)
  formation TEXT NOT NULL, -- "4-3-3"
  playing_style TEXT, -- "Possesso palla", "Contrattacco", etc.
  team_strength INTEGER, -- Forza complessiva avversaria
  
  -- GIOCATORI AVVERSARI (da screenshot)
  opponent_players JSONB NOT NULL, -- [
  --   {
  --     "name": "Cristiano Ronaldo",
  --     "position": "P",
  --     "slot_index": 9,
  --     "overall_rating": 105
  --   }
  -- ]
  
  -- DATI ESTRATTI (RAW - per backup)
  extracted_data JSONB,
  
  -- CONTROMISURE GENERATE (da AI)
  countermeasures JSONB, -- [
  --   {
  --     "type": "formation_adjustment",
  --     "priority": "high",
  --     "title": "Rinforza centrocampo",
  --     "description": "Avversario gioca 4-3-3, considera cambio a 4-3-3 o 4-4-2",
  --     "suggested_formation": "4-3-3",
  --     "reason": "Bilanciare centrocampo contro 3 centrocampisti avversari"
  --   },
  --   {
  --     "type": "player_instruction",
  --     "priority": "medium",
  --     "player_name": "Patrick Vieira",
  --     "current_instruction": null,
  --     "suggested_instruction": "Marcatura uomo",
  --     "target_opponent": "Cristiano Ronaldo",
  --     "reason": "Limitare spazio al loro attaccante principale"
  --   }
  -- ]
  
  -- SUGGERIMENTI TATTICI (da AI)
  tactical_suggestions JSONB, -- [
  --   {
  --     "category": "attacking",
  --     "suggestion": "Sfrutta le fasce, avversario ha 3 centrocampisti centrali",
  --     "priority": "high"
  --   }
  -- ]
  
  -- ANALISI COERENZA (confronto con formazione propria)
  coherence_analysis JSONB, -- {
  --   "formation_match": "good" | "neutral" | "weak",
  --   "strengths": ["Centrocampo bilanciato"],
  --   "weaknesses": ["Fasce esposte"],
  --   "recommendations": ["Cambia formazione"]
  -- }
  
  -- Metadata
  analysis_status TEXT DEFAULT 'pending', -- pending, analyzing, completed, failed
  analysis_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici
CREATE INDEX idx_opponent_formations_user_match 
ON opponent_formations(user_id, match_id);

CREATE INDEX idx_opponent_formations_pre_match 
ON opponent_formations(user_id, is_pre_match, match_date DESC) 
WHERE is_pre_match = true;
```

### Tabella `matches`

```sql
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dati base partita
  match_date TIMESTAMPTZ DEFAULT NOW(),
  opponent_name TEXT,
  result TEXT, -- "6-1"
  is_home BOOLEAN DEFAULT true,
  opponent_formation_id UUID REFERENCES opponent_formations(id), -- Collegamento a contromisure pre-partita
  
  -- FORMAZIONE REALE GIOCATA (da screenshot)
  formation_played TEXT, -- "4-2-1-3"
  playing_style_played TEXT, -- "Contrattacco"
  team_strength INTEGER, -- 3245
  
  -- GIOCATORI IN CAMPO (da screenshot formazione)
  players_in_match JSONB NOT NULL, -- [
    --   {
    --     "name": "Samuel Eto'o",
    --     "position": "SP",
    --     "slot_index": 8,
    --     "overall_rating": 104,
    --     "matched_player_id": UUID | null, -- Se trovato nella rosa
    --     "match_status": "matched" | "not_found" | "different"
    --   }
    -- ]
  
  -- DATI ESTRATTI (RAW - per backup)
  extracted_data JSONB, -- Tutti i dati grezzi dalle foto
  
  -- DATI STRUTTURATI per analisi
  player_ratings JSONB, -- {
    --   "Samuel Eto'o": { 
    --     "rating": 8.5, 
    --     "jersey": 9, 
    --     "star": true,
    --     "goals": 2,
    --     "assists": 1,
    --     "minutes_played": 90
    --   },
    --   "Gianluigi Buffon": { 
    --     "rating": 6.5, 
    --     "jersey": 1,
    --     "goals": 0,
    --     "assists": 0,
    --     "minutes_played": 90
    --   }
    -- }
  
  team_stats JSONB, -- {
    --   "possession": 49, -- Possesso di palla (%)
    --   "shots": 16, -- Tiri totali
    --   "shots_on_target": 10, -- Tiri in porta
    --   "fouls": 0, -- Falli
    --   "offsides": 0, -- Fuorigioco
    --   "corners": 2, -- Calci d'angolo
    --   "free_kicks": 0, -- Punizioni
    --   "passes": 110, -- Passaggi
    --   "successful_passes": 81, -- Passaggi riusciti
    --   "pass_accuracy": 73.6, -- Calcolato: successful_passes / passes * 100
    --   "crosses": 0, -- Cross
    --   "interceptions": 29, -- Passaggi intercettati
    --   "tackles": 4, -- Contrasti
    --   "saves": 4, -- Parate
    --   "goals_scored": 6, -- Gol segnati (da risultato o grafico rete)
    --   "goals_conceded": 1 -- Gol subiti (da risultato o grafico rete)
    -- }
  
  -- GOL E EVENTI (da "Grafico rete")
  goals_events JSONB, -- [
    --   {
    --     "minute": 15,
    --     "scorer": "Alessandro Del Piero",
    --     "assist": "Eden Hazard",
    --     "type": "goal", -- "goal" | "own_goal" | "penalty"
    --     "team": "own" | "opponent"
    --   },
    --   {
    --     "minute": 32,
    --     "scorer": "Cristiano Ronaldo",
    --     "assist": null,
    --     "type": "goal",
    --     "team": "own"
    --   }
    -- ]
  
  attack_areas JSONB, -- {
    --   "left": 46,
    --   "center": 45,
    --   "right": 9
    -- }
  
  ball_recovery_zones JSONB, -- {
    --   "zones": [
    --     { "x": 50, "y": 30, "intensity": 0.8 },
    --     { "x": 60, "y": 40, "intensity": 0.6 }
    --   ],
    --   "direction": "up"
    -- }
  
  -- OUTPUT AI (riassunto testuale)
  ai_summary TEXT, -- "Hai perso il controllo del centrocampo dal minuto X perché..."
  ai_insights JSONB, -- [
    --   {
    --     "type": "tactical_coherence",
    --     "severity": "high",
    --     "title": "Centrocampo debole",
    --     "message": "Il tuo mediano ha giocato troppo alto rispetto al profilo impostato",
    --     "minute": 25,
    --     "affected_players": ["Patrick Vieira"]
    --   }
    -- ]
  
  ai_recommendations JSONB, -- [
    --   {
    --     "action": "change_formation",
    --     "reason": "La formazione 4-2-1-3 non ha funzionato contro questo avversario",
    --     "suggested_formation": "4-3-3",
    --     "priority": "high"
    --   },
    --   {
    --     "action": "adjust_instruction",
    --     "player_name": "Patrick Vieira",
    --     "current_instruction": "Attacca",
    --     "suggested_instruction": "Resta indietro",
    --     "reason": "Ha giocato troppo alto, esponendo la difesa",
    --     "priority": "medium"
    --   }
    -- ]
  
  -- DISCREPANZE FORMAZIONE
  formation_discrepancies JSONB, -- [
    --   {
    --     "slot_index": 2,
    --     "saved_player": "Frenkie de Jong",
    --     "played_player": "Cafu",
    --     "severity": "high",
    --     "impact": "Cambio giocatore non allineato con istruzioni tattiche"
    --   }
    -- ]
  
  -- Metadata
  photos_uploaded INTEGER DEFAULT 0, -- Quante foto ha caricato
  analysis_status TEXT DEFAULT 'pending', -- pending, analyzing, completed, failed
  analysis_error TEXT, -- Se analisi fallisce
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici
CREATE INDEX idx_matches_user_date 
ON matches(user_id, match_date DESC);

CREATE INDEX idx_matches_analysis_status 
ON matches(user_id, analysis_status) 
WHERE analysis_status = 'pending';
```

---

## 🔄 FLUSSO OPERATIVO

### Fase 1: Upload Dati Partita (POST-PARTITA)

**⚠️ PAY-PER-USE MODEL**:
- Credits spesi solo per foto effettivamente processate
- Se cliente carica 3 foto su 6, paga solo per 3
- Analisi AI funziona anche con dati parziali (meno precisa ma funzionale)

**Endpoint**: `/api/extract-match-data` (POST)

**Input**:
```json
{
  "formation_image": "data:image/...", // Screenshot formazione in campo (OPZIONALE)
  "ratings_image": "data:image/...", // Screenshot pagelle giocatori (OPZIONALE)
  "team_stats_image": "data:image/...", // Screenshot statistiche squadra (OPZIONALE)
  "attack_areas_image": "data:image/...", // Screenshot aree attacco (OPZIONALE)
  "recovery_zones_image": "data:image/...", // Screenshot recupero palla (OPZIONALE)
  "goals_chart_image": "data:image/..." // Screenshot grafico rete/gol (OPZIONALE)
}
```

**⚠️ IMPORTANTE - Gestione Foto Mancanti (FOCUS: INCENTIVARE A CARICARE)**:
- **Nessuna foto è obbligatoria** - Il sistema funziona anche con dati parziali
- **⭐ PIÙ DATI = MIGLIORE AIUTO** - Messaggio chiave: "Più la IA sa, più ti aiuta"
- **Messaggi carini per foto mancanti** - Suggerire con motivazione chiara
- **Barra conoscenza visibile** - Cliente vede subito impatto di caricare più foto
- **Feedback immediato** - Dopo ogni upload, barra aumenta

**Processo**:
1. **Verifica foto mancanti** e mostra messaggi rassicuranti e incentivanti:
   - Se manca `ratings_image`: "📊 Vuoi caricare anche i voti giocatori? Più la IA sa, più ti aiuta! (+5% conoscenza) 😊"
   - Se manca `team_stats_image`: "📈 Se vuoi, aggiungi anche le statistiche squadra per analisi ancora più precisa (+5% conoscenza)"
   - Se manca `formation_image`: "⚽ Hai la formazione in campo? Aggiungila se vuoi per conoscenza più completa (+3% conoscenza)"
   - Se mancano tutte: "💡 Va bene così! Se vuoi, puoi caricare più foto per aumentare la conoscenza della IA. Più la IA sa, più ti aiuta! Ogni foto conta 😊"
   - **Mostra barra conoscenza attuale**: "Conoscenza attuale: {knowledge_score}% - Man mano che carichi più dati, la IA ti aiuta sempre meglio!"
2. Estrai dati da ogni screenshot disponibile (GPT-4o Vision) - **solo per foto presenti**
   - **Formazione**: giocatori, posizioni, formazione, stile di gioco
   - **Pagelle**: voti, numero maglia, stella, **gol, assist, minuti giocati**
   - **Statistiche squadra**: possesso, tiri, passaggi, contrasti, intercettazioni, parate, etc.
   - **Aree attacco**: percentuali sinistra/centro/destra
   - **Zone recupero**: mappa con punti verdi, distribuzione spaziale
   - **Grafico rete**: **minuto gol, marcatore, assist, tipo gol**
3. **Gestisci foto mancanti**:
   - Se foto mancante: salva `null` nel campo corrispondente
   - Continua con analisi anche se dati parziali
4. Salva in `extracted_data` (raw backup) - solo per foto processate
5. Struttura dati in campi JSONB (solo per dati disponibili)
6. **Matching giocatori** (per nome) con rosa utente - solo se `ratings_image` presente
7. **Confronto formazione** (salvata vs giocata) - solo se `formation_image` presente
8. **Calcola metriche derivate** (es. precisione passaggi = successful_passes / passes * 100) - solo se dati disponibili
9. Salva in `matches` con `analysis_status = 'pending'`
10. **Calcola credits usati**: Solo per foto effettivamente processate
11. **Collega con contromisure pre-partita** (se presente `opponent_formation_id`)
12. **Trigger automatico**: Aggiorna aggregati dopo salvataggio

**Output**:
```json
{
  "match_id": "uuid",
  "formation_played": "4-2-1-3",
  "players_matched": 9,
  "players_not_found": 2,
  "formation_discrepancies": 1,
  "analysis_status": "pending",
  "credits_used": 3, // Pay-per-use: solo per foto processate (es. 3 foto = 3 credits)
  "photos_processed": 3, // Quante foto sono state processate
  "photos_missing": ["ratings_image", "team_stats_image"], // Foto mancanti
  "data_completeness": "partial" // "partial" o "complete"
}
```

### Fase 2: Matching Giocatori

**Logica Matching**:
```javascript
function matchPlayerToRoster(playerName, userRoster) {
  // Normalizza nome (lowercase, rimuovi accenti, spazi)
  const normalized = normalizeName(playerName);
  
  // Cerca match esatto
  let match = userRoster.find(p => 
    normalizeName(p.player_name) === normalized
  );
  
  // Se non trovato, cerca match parziale (es. "Eto'o" vs "Samuel Eto'o")
  if (!match) {
    match = userRoster.find(p => 
      normalizeName(p.player_name).includes(normalized) ||
      normalized.includes(normalizeName(p.player_name))
    );
  }
  
  // Se ancora non trovato, cerca per posizione + rating simile
  // (solo se rating disponibile)
  
  return {
    matched_player_id: match?.id || null,
    match_status: match ? "matched" : "not_found",
    confidence: match ? "high" : "low"
  };
}
```

**Gestione Discrepanze**:
```javascript
function compareFormations(savedFormation, playedFormation) {
  const discrepancies = [];
  
  // Confronta slot per slot
  for (let i = 0; i < 11; i++) {
    const savedPlayer = savedFormation.slots[i]?.player;
    const playedPlayer = playedFormation.players[i];
    
    if (savedPlayer && playedPlayer) {
      const savedName = normalizeName(savedPlayer.player_name);
      const playedName = normalizeName(playedPlayer.name);
      
      if (savedName !== playedName) {
        discrepancies.push({
          slot_index: i,
          saved_player: savedPlayer.player_name,
          played_player: playedPlayer.name,
          severity: "high", // Cambio giocatore
          impact: "Giocatore diverso da quello in formazione salvata"
        });
      }
    }
  }
  
  return discrepancies;
}
```

### Fase 3: Analisi AI

**⚠️ PAY-PER-USE**: Credits spesi solo per analisi effettivamente eseguita

**Endpoint**: `/api/ai/analyze-match` (POST)

**Input**:
```json
{
  "match_id": "uuid"
}
```

**Processo**:
1. **Carica dati completi per analisi contestuale**:
   - Dati match corrente
   - **Profilo utente** (nome, divisione, problemi comuni, preferenze IA) - **NUOVO**
   - Profilazione utente (rosa, formazione, istruzioni)
   - **Storico ultime 50 partite** (aggregati da `player_performance_aggregates` e `team_tactical_patterns`)
   - **Pattern ricorrenti** (problemi identificati nelle ultime partite)
2. **Identifica pattern storici**:
   - Problemi ricorrenti (es. % passaggi sempre basso)
   - Trend negativi (es. centrocampo sempre debole)
   - Gap specifici utente (es. sempre sotto media in possesso)
3. **Verifica dati disponibili**:
   - Se dati parziali: aggiungi nota nel prompt "Dati parziali disponibili, analisi basata su ciò che c'è"
   - Se dati completi: analisi completa
4. Chiama GPT-5.2 Thinking/Pro con prompt strutturato **incluso storico**
5. Genera:
   - `ai_summary` (testuale, 2-3 paragrafi) - **sempre generato, anche con dati parziali**
   - `ai_insights` (array di insight) - **sempre generato, basato su pattern storici**
   - `ai_recommendations` (array di azioni concrete) - **sempre generato, personalizzate per gap utente**
6. Salva in `matches`
7. Aggiorna `analysis_status = 'completed'`

**Messaggio finale all'utente**:
- Se dati completi: "Analisi completata! ✅ Conoscenza IA: 100% - Con tutti questi dati, posso darti suggerimenti precisi!"
- Se dati parziali: "Analisi completata! 💡 Conoscenza IA: {knowledge_score}% - Va bene così! Se vuoi, carica altre foto per aumentare la conoscenza e ricevere suggerimenti ancora più precisi. Più la IA sa, più ti aiuta! (+{missing_photos_count * 5}% se carichi tutto)"

**Prompt AI** (esempio - ENTERPRISE con storico):
```
Sei un coach AI che conosce TUTTO lo storico di questo utente. Analizza questa partita nel contesto del suo profilo completo.

STO storico utente (ultime 50 partite):
- Media % passaggi: {avg_pass_accuracy}% (problema ricorrente se < 75%)
- Media possesso: {avg_possession}% (problema ricorrente se < 45%)
- Problemi ricorrenti: {recurring_issues} (es. "centrocampo debole in 12 partite su 50")
- Pattern tattici: {tactical_patterns} (es. "attacco sempre concentrato al centro")
- Giocatori sotto media: {underperforming_players} (es. "Sceva: media 6.6 su 30 partite")
- Formazioni problematiche: {problematic_formations} (es. "4-2-1-3 esposta al centrocampo")

DATI PARTITA CORRENTE:
- Formazione giocata: {formation_played}
- Formazione salvata: {saved_formation}
- Discrepanze: {formation_discrepancies}
- Voti giocatori: {player_ratings}
- Statistiche squadra: {team_stats}
- Aree attacco: {attack_areas}
- Zone recupero: {ball_recovery_zones}

PROFILO UTENTE:
- Rosa disponibile: {user_roster}
- Formazione preferita: {saved_formation}
- Istruzioni individuali: {individual_instructions}
- Stile di gioco: {playing_style}

REGOLE PER ANALISI:
1. NON dare consigli generici (es. "migliora i passaggi")
2. Identifica GAP specifici basati su storico (es. "Hai % passaggi 60% vs tua media 65%, problema ricorrente")
3. Trova ALTERNATIVE concrete per colmare gap (es. "Usa più passaggi laterali invece di sempre in avanti")
4. Collega problemi attuali a pattern storici (es. "Questo è il 13° match su 50 con centrocampo debole")
5. Suggerisci cambiamenti basati su cosa ha funzionato in passato (es. "Quando hai giocato 4-3-3, media passaggi era 75%")

Genera:
1. RIASSUNTO TESTUALE (2-3 paragrafi): 
   - Cosa è successo in questa partita
   - Perché ha funzionato/non funzionato
   - Collegamento a pattern storici (es. "Come nelle ultime 12 partite, il centrocampo è stato debole")

2. INSIGHT TATTICI (max 3):
   - Problemi strutturali identificati
   - Coerenza con problemi ricorrenti storici
   - Performance individuali vs media storica

3. RACCOMANDAZIONI (concrete e personalizzate):
   - NON: "Migliora i passaggi"
   - SÌ: "Hai % passaggi 60% (media tua 65%, problema ricorrente). Prova a: 1) Usa più passaggi laterali per mantenere possesso, 2) Evita passaggi lunghi quando sotto pressione, 3) Considera istruzione 'Passaggi corti' per Vieira"
   - Basate su gap specifici utente
   - Alternative concrete per colmare gap
   - Riferimenti a cosa ha funzionato in passato
```

**Output**:
```json
{
  "match_id": "uuid",
  "ai_summary": "Hai perso il controllo del centrocampo dal minuto 25...",
  "ai_insights": [...],
  "ai_recommendations": [...],
  "analysis_status": "completed",
  "credits_used": 1, // Pay-per-use: 1 credit per analisi AI
  "data_completeness": "partial", // "partial" o "complete"
  "missing_photos": ["ratings_image", "team_stats_image"] // Se dati parziali, lista foto mancanti
}
```

---

## 🎨 UI PAGINA CONTROMISURE (PRE-PARTITA)

### Struttura

```
/app/contromisure/[id]/page.jsx  (Dettaglio contromisure)
/app/contromisure/page.jsx       (Lista contromisure pre-partita)
```

### Layout Pagina Contromisure

```
┌─────────────────────────────────────┐
│  [← Indietro]  Contromisure vs AC Milan│
│  Data: 15 Gen 2025  |  Pre-Partita    │
├─────────────────────────────────────┤
│                                     │
│  📋 FORMAZIONE AVVERSARIA           │
│  ────────────────────────────────  │
│  [Immagine formazione avversaria]   │
│  Formazione: 4-3-3                  │
│  Stile: Possesso palla              │
│                                     │
│  ⚠️ CONTROMISURE (3)                │
│  ────────────────────────────────  │
│  [Card con azioni]                  │
│  • Rinforza centrocampo → 4-3-3     │
│    [Applica Formazione]             │
│  • Sposta Vieira più indietro        │
│    [Applica Istruzione]              │
│  • Marcatura uomo su Ronaldo        │
│    [Applica Istruzione]              │
│                                     │
│  💡 SUGGERIMENTI TATTICI            │
│  ────────────────────────────────  │
│  [Card informative]                  │
│  • Attacco: Sfrutta le fasce        │
│  • Difesa: Marcatura stretta        │
│                                     │
│  📊 ANALISI COERENZA                │
│  ────────────────────────────────  │
│  [Card con valutazione]              │
│  • Formazione: Buona (match)        │
│  • Punti di forza: Centrocampo      │
│  • Debolezze: Fasce esposte          │
└─────────────────────────────────────┘
```

**Focus UX**:
- ✅ **PRIMA**: Formazione avversaria (sempre visibile)
- ✅ **POI**: Contromisure operative (con bottoni "Applica")
- ✅ **INFINE**: Suggerimenti e analisi coerenza

### Componenti Pre-Partita

**1. `OpponentFormationDisplay.jsx`**
- Mostra screenshot formazione avversaria
- Formazione, stile di gioco, forza squadra

**2. `CountermeasuresPanel.jsx`**
- Lista contromisure ordinate per priorità
- Card con azioni concrete
- Bottone "Applica" per ogni contromisure (cambia formazione/istruzioni)

**3. `TacticalSuggestionsPanel.jsx`**
- Suggerimenti tattici (attacco/difesa)
- Card informative (non azionabili direttamente)

**4. `CoherenceAnalysisPanel.jsx`**
- Analisi coerenza formazione propria vs avversaria
- Punti di forza/debolezze
- Raccomandazioni immediate

---

## 🎨 UI PAGINA MATCH

### Struttura

```
/app/partita/[id]/page.jsx  (Dettaglio singola partita)
/app/partite/page.jsx       (Storico partite)
```

### Layout Pagina Singola Partita

```
┌─────────────────────────────────────┐
│  [← Indietro]  Partita vs AC Milan   │
│  Data: 15 Gen 2025  |  Risultato: 6-1│
│  🎯 Contromisure pre-partita applicate│
├─────────────────────────────────────┤
│                                     │
│  📝 RIASSUNTO                        │
│  ────────────────────────────────  │
│  [Testo grande, leggibile]          │
│  "Hai perso il controllo del        │
│   centrocampo dal minuto 25..."     │
│                                     │
│  ⚠️ INSIGHT TATTICI (3)              │
│  ────────────────────────────────  │
│  [Card espandibili]                  │
│  • Centrocampo debole (HIGH)        │
│  • Difesa esposta (MEDIUM)           │
│  • Attacco efficace (LOW)            │
│                                     │
│  ✅ RACCOMANDAZIONI                  │
│  ────────────────────────────────  │
│  [Card con azioni]                   │
│  • Cambia formazione → 4-3-3         │
│  • Aggiusta istruzione Vieira        │
│                                     │
│  📊 DETTAGLI [Espandi ▼]             │
│  ────────────────────────────────  │
│  [Collassabile - NASCOSTO di default]│
│  • Statistiche squadra              │
│  • Voti giocatori                   │
│  • Aree attacco                     │
│  • Zone recupero                    │
│  • Discrepanze formazione           │
│  • Eventi gol (minuti, marcatori)   │
└─────────────────────────────────────┘
```

**Focus UX**:
- ✅ **PRIMA**: Riassunto testuale (sempre visibile, prima cosa)
- ✅ **POI**: Insight e raccomandazioni (sempre visibili)
- ⚠️ **INFINE**: Dettagli statistiche (collassabili, nascosti di default)

### Layout Storico Partite

```
/app/partite/page.jsx

┌─────────────────────────────────────┐
│  📋 STORICO PARTITE                  │
│  ────────────────────────────────  │
│                                     │
│  [Filtri: Ultimi 7/30/90 giorni]   │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ 15 Gen 2025  |  vs AC Milan   │ │
│  │ Risultato: 6-1  |  [Vedi →]   │ │
│  │ 🎯 Contromisure applicate      │ │
│  │                               │ │
│  │ 📝 "Hai perso il controllo... │ │
│  │     [Anteprima riassunto]     │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ 14 Gen 2025  |  vs Juventus   │ │
│  │ Risultato: 2-3  |  [Vedi →]   │ │
│  │                               │ │
│  │ 📝 "La difesa è stata esposta..│ │
│  │     [Anteprima riassunto]     │ │
│  └───────────────────────────────┘ │
│                                     │
│  [Carica altre...]                  │
└─────────────────────────────────────┘
```

**Focus UX Storico**:
- ✅ **Lista compatta**: Data, avversario, risultato
- ✅ **Anteprima riassunto**: Prima frase del riassunto testuale (max 100 caratteri)
- ✅ **Contromisure pre-partita**: Se presente, mostra icona/indicatore "Contromisure applicate"
- ✅ **Clic su partita**: Apre pagina dettaglio con riassunto completo
- ❌ **NON mostrare**: Statistiche grezze nella lista (solo nel dettaglio)

### Componenti

**1. `MatchSummary.jsx`**
- Mostra `ai_summary` in grande
- Stile: testo leggibile, font grande

**2. `MatchInsights.jsx`**
- Lista `ai_insights` ordinata per severità
- Card espandibili
- Colori: HIGH (rosso), MEDIUM (giallo), LOW (verde)

**3. `MatchRecommendations.jsx`**
- Lista `ai_recommendations`
- Card con azioni concrete
- Bottone "Applica" per ogni raccomandazione

**4. `MatchDetails.jsx`** (Collassabile - Nascosto di default)
- Statistiche squadra (tabella)
- Voti giocatori (lista)
- Aree attacco (grafico semplice)
- Zone recupero (mappa campo)
- Discrepanze formazione (alert)
- Eventi gol (timeline con minuti)

**5. `MatchHistory.jsx`** (Pagina storico)
- Lista partite ordinate per data (più recenti prima)
- Card compatta per ogni partita:
  - Data, avversario, risultato
  - **Anteprima riassunto** (prima frase, max 100 caratteri) - **NON statistiche**
  - Link "Vedi dettagli" → `/app/partita/[id]`
- Filtri: Ultimi 7/30/90 giorni, Tutte
- Paginazione: 10 partite per pagina

---

## 🔍 CASI EDGE DA GESTIRE

### 1. Giocatore Non Trovato nella Rosa
**Scenario**: Giocatore in partita non è nella rosa salvata

**Soluzione**:
- `matched_player_id = null`
- `match_status = "not_found"`
- In analisi AI: menzionare che giocatore non è in rosa
- Suggerire di aggiungere giocatore alla rosa

### 2. Formazione Diversa da Salvata
**Scenario**: De Jong in gestione, Cafu in partita

**Soluzione**:
- Salvare in `formation_discrepancies`
- In analisi AI: evidenziare impatto tattico
- Suggerire di aggiornare formazione salvata

### 3. Nome Giocatore Variante
**Scenario**: "Eto'o" vs "Samuel Eto'o"

**Soluzione**:
- Normalizzazione nome (lowercase, rimuovi accenti)
- Match parziale se match esatto fallisce
- Mostrare match con confidence level

### 4. Partita Senza Tutte le Foto
**Scenario**: Cliente carica solo pagelle, non statistiche

**Soluzione**:
- Analisi AI con dati disponibili
- Evidenziare dati mancanti
- Suggerire di caricare foto mancanti per analisi più precisa

---

## 📋 TODO IMPLEMENTAZIONE

### Fase 1: Database e Estrazione
- [ ] Creare tabella `matches`
- [ ] Endpoint `/api/extract-match-data`
- [ ] Logica matching giocatori (per nome)
- [ ] Confronto formazione (salvata vs giocata)

### Fase 2: Analisi AI
- [ ] Endpoint `/api/ai/analyze-match`
- [ ] Prompt GPT-5.2 strutturato
- [ ] Generazione riassunto testuale
- [ ] Generazione insight e raccomandazioni

### Fase 3: UI
- [ ] Pagina `/app/partita/[id]/page.jsx`
- [ ] Componente `MatchSummary`
- [ ] Componente `MatchInsights`
- [ ] Componente `MatchRecommendations`
- [ ] Componente `MatchDetails` (collassabile)

### Fase 4: Integrazione
- [ ] Collegamento con profilazione utente
- [ ] Aggiornamento `user_ai_knowledge`
- [ ] Sistema credits (pay-per-use)

---

## 📊 ANALISI AGGREGATE E TREND

### Obiettivo
Non archivio dati, ma **pattern recognition** per:
- Identificare problemi ricorrenti
- Generare task automatici (es. "Sceva ha media 6.6, considera sostituzione")
- Capire evoluzione performance nel tempo
- Suggerire cambiamenti basati su trend

### Strategia: Ultime 50 Partite
- Mantenere **ultime 50 partite** per utente
- Calcolare aggregazioni **per giocatore** (non per partita)
- Ogni giocatore può aver giocato < 50 partite
- Aggiornare aggregazioni dopo ogni nuova partita

---

## 🗄️ SCHEMA DATABASE AGGREGATO

### Tabella `player_performance_aggregates`

```sql
CREATE TABLE player_performance_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE, -- NULL se giocatore non in rosa
  player_name TEXT NOT NULL, -- Nome come appare nelle partite (per matching)
  
  -- Statistiche Aggregazione (ultime 50 partite)
  matches_played INTEGER DEFAULT 0, -- Quante partite ha giocato (max 50)
  average_rating DECIMAL(3,1), -- Media voti (es. 6.6)
  min_rating DECIMAL(3,1), -- Voto minimo
  max_rating DECIMAL(3,1), -- Voto massimo
  rating_trend TEXT, -- "improving" | "declining" | "stable"
  
  -- Posizioni Giocate
  positions_played JSONB, -- { "SP": 15, "P": 10, "CC": 5 } - quante volte in ogni posizione
  
  -- Performance per Posizione
  position_performance JSONB, -- {
  --   "SP": { "avg_rating": 7.2, "matches": 15 },
  --   "P": { "avg_rating": 6.0, "matches": 10 }
  -- }
  
  -- Statistiche Aggregazione (ultime 50 partite)
  total_goals INTEGER DEFAULT 0, -- Gol totali segnati
  total_assists INTEGER DEFAULT 0, -- Assist totali
  goals_per_match DECIMAL(3,1), -- Media gol per partita
  assists_per_match DECIMAL(3,1), -- Media assist per partita
  
  -- Performance Temporale (quando segna/assiste)
  goals_by_minute_range JSONB, -- {
  --   "0-15": 2,
  --   "15-30": 5,
  --   "30-45": 3,
  --   "45-60": 4,
  --   "60-75": 6,
  --   "75-90": 2
  -- }
  
  -- Pattern di Gioco Aggregati
  attack_areas_avg JSONB, -- Media aree attacco (ultime 50) {
  --   "left": 35.5,
  --   "center": 45.2,
  --   "right": 19.3
  -- }
  
  recovery_zones_avg JSONB, -- Media zone recupero (ultime 50) {
  --   "defensive_third": 0.6,
  --   "midfield": 0.3,
  --   "attacking_third": 0.1
  -- }
  
  -- Heatmap Aggregata (zone più frequentate)
  heatmap_aggregate JSONB, -- {
  --   "zones": [
  --     { "x": 50, "y": 30, "intensity": 0.8, "frequency": 25 },
  --     { "x": 60, "y": 40, "intensity": 0.6, "frequency": 18 }
  --   ]
  -- }
  
  -- Minuti Giocati
  total_minutes_played INTEGER DEFAULT 0, -- Minuti totali giocati
  average_minutes_per_match DECIMAL(4,1), -- Media minuti per partita
  substitution_pattern TEXT, -- "starter" | "substitute" | "mixed"
  
  -- Flags per Task Generazione
  needs_attention BOOLEAN DEFAULT false, -- Media < 6.0 o trend declining
  underperforming_positions TEXT[], -- Posizioni dove media < 6.0
  optimal_position TEXT, -- Posizione con media più alta
  
  -- Metadata
  last_match_date TIMESTAMPTZ, -- Data ultima partita giocata
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_user_player_aggregate UNIQUE (user_id, player_name)
);

-- Indici
CREATE INDEX idx_player_performance_user 
ON player_performance_aggregates(user_id);

CREATE INDEX idx_player_performance_needs_attention 
ON player_performance_aggregates(user_id, needs_attention) 
WHERE needs_attention = true;
```

### Tabella `team_tactical_patterns`

```sql
CREATE TABLE team_tactical_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Pattern Aggregati (ultime 50 partite)
  matches_analyzed INTEGER DEFAULT 0, -- Quante partite incluse (max 50)
  
  -- Statistiche Aggregazione Squadra
  total_goals_scored INTEGER DEFAULT 0, -- Gol totali segnati
  total_goals_conceded INTEGER DEFAULT 0, -- Gol totali subiti
  avg_goals_scored_per_match DECIMAL(3,1), -- Media gol segnati per partita
  avg_goals_conceded_per_match DECIMAL(3,1), -- Media gol subiti per partita
  clean_sheets INTEGER DEFAULT 0, -- Partite senza gol subiti
  
  -- Pattern Temporale Gol
  goals_scored_by_minute_range JSONB, -- Quando segna di più {
  --   "0-15": 5,
  --   "15-30": 8,
  --   "30-45": 6,
  --   "45-60": 10,
  --   "60-75": 12,
  --   "75-90": 7
  -- }
  goals_conceded_by_minute_range JSONB, -- Quando subisce di più {
  --   "0-15": 2,
  --   "15-30": 5,
  --   "30-45": 3,
  --   "45-60": 4,
  --   "60-75": 6,
  --   "75-90": 3
  -- }
  
  -- Aree Attacco Aggregate
  attack_areas_avg JSONB, -- {
  --   "left": 38.5,
  --   "center": 42.3,
  --   "right": 19.2
  -- }
  attack_areas_consistency DECIMAL(3,1), -- Quanto è consistente (0-100)
  
  -- Zone Recupero Aggregate
  recovery_zones_avg JSONB, -- {
  --   "defensive_third": 0.55,
  --   "midfield": 0.35,
  --   "attacking_third": 0.10
  -- }
  
  -- Statistiche Squadra Aggregate
  avg_possession DECIMAL(4,1), -- Media possesso palla
  avg_shots DECIMAL(4,1), -- Media tiri per partita
  avg_shots_on_target DECIMAL(4,1), -- Media tiri in porta
  avg_pass_accuracy DECIMAL(4,1), -- Media precisione passaggi
  avg_interceptions DECIMAL(4,1), -- Media intercettazioni
  avg_tackles DECIMAL(4,1), -- Media contrasti
  
  -- Formazioni Più Usate
  formations_used JSONB, -- {
  --   "4-2-1-3": 15,
  --   "4-3-3": 12,
  --   "4-4-2": 8
  -- }
  
  -- Stili di Gioco Più Usati
  playing_styles_used JSONB, -- {
  --   "Contrattacco": 20,
  --   "Possesso palla": 10,
  --   "Contropiede veloce": 5
  -- }
  
  -- Performance per Formazione
  formation_performance JSONB, -- {
  --   "4-2-1-3": {
  --     "matches": 15,
  --     "avg_goals_scored": 2.3,
  --     "avg_goals_conceded": 1.1,
  --     "win_rate": 0.67
  --   }
  -- }
  
  -- Problemi Ricorrenti Identificati
  recurring_issues JSONB, -- [
  --   {
  --     "type": "weak_midfield",
  --     "frequency": 12, -- Quante volte in 50 partite
  --     "severity": "high",
  --     "affected_formations": ["4-2-1-3", "4-3-3"]
  --   }
  -- ]
  
  -- Metadata
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_user_tactical_patterns UNIQUE (user_id)
);
```

### Tabella `ai_tasks` (Task Generati Automaticamente)

```sql
CREATE TABLE ai_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Task Info
  task_type TEXT NOT NULL, -- "player_substitution" | "formation_change" | "instruction_adjust" | "position_change"
  priority TEXT NOT NULL, -- "high" | "medium" | "low"
  status TEXT DEFAULT 'pending', -- "pending" | "in_progress" | "completed" | "dismissed" | "auto_completed"
  
  -- Contesto
  title TEXT NOT NULL, -- "Sceva: media 6.6 su 30 partite, considera sostituzione"
  description TEXT NOT NULL, -- Dettagli del task
  reason TEXT, -- Perché è stato generato
  
  -- Dati Riferimento
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  player_name TEXT, -- Se giocatore non in rosa
  match_ids UUID[], -- Partite che hanno triggerato il task
  aggregate_data JSONB, -- Dati aggregati che hanno generato il task
  
  -- Azione Suggerita
  suggested_action JSONB, -- {
  --   "action": "substitute_player",
  --   "current_player": "Sceva",
  --   "suggested_player": "Del Piero",
  --   "reason": "Del Piero ha media 7.2 nella stessa posizione"
  -- }
  
  -- TRACKING COMPLETAMENTO E MIGLIORAMENTI
  completion_method TEXT, -- "manual" | "auto_detected" | "user_confirmed"
  completed_by_action JSONB, -- {
  --   "action_type": "formation_changed",
  --   "action_id": "uuid",
  --   "detected_at": "timestamp",
  --   "confidence": 0.95
  -- }
  
  -- PERFORMANCE PRIMA/DOPO (per misurare miglioramenti)
  performance_before JSONB, -- {
  --   "avg_rating": 6.6,
  --   "matches": 30,
  --   "goals_per_match": 0.1,
  --   "pass_accuracy": 65,
  --   "captured_at": "timestamp"
  -- }
  
  performance_after JSONB, -- {
  --   "avg_rating": 7.2,
  --   "matches": 10, -- Partite dopo completamento task
  --   "goals_per_match": 0.5,
  --   "pass_accuracy": 75,
  --   "captured_at": "timestamp",
  --   "improvement_detected": true,
  --   "improvement_percentage": 9.1 -- (7.2 - 6.6) / 6.6 * 100
  -- }
  
  -- VALIDAZIONE EFFICACIA
  effectiveness_score DECIMAL(5,2), -- 0-100, calcolato dopo N partite
  effectiveness_status TEXT, -- "pending" | "improved" | "no_change" | "worsened"
  effectiveness_analysis JSONB, -- {
  --   "matches_analyzed": 10,
  --   "improvement_detected": true,
  --   "metrics_improved": ["avg_rating", "goals_per_match"],
  --   "metrics_worsened": [],
  --   "overall_impact": "positive"
  -- }
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  effectiveness_calculated_at TIMESTAMPTZ
);

-- Indici
CREATE INDEX idx_ai_tasks_user_status 
ON ai_tasks(user_id, status);

CREATE INDEX idx_ai_tasks_priority 
ON ai_tasks(user_id, priority, status) 
WHERE status = 'pending';

CREATE INDEX idx_ai_tasks_effectiveness 
ON ai_tasks(user_id, effectiveness_status, effectiveness_calculated_at DESC)
WHERE effectiveness_status IS NOT NULL;

CREATE INDEX idx_ai_tasks_completion_method 
ON ai_tasks(user_id, completion_method, completed_at DESC)
WHERE completed_at IS NOT NULL;
```

**⚠️ AGGIORNAMENTO SCHEMA - Campi Aggiunti per Tracking**:
```sql
-- Aggiungi campi per auto-completamento e tracking
ALTER TABLE ai_tasks
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'dismissed', 'auto_completed')),
ADD COLUMN IF NOT EXISTS completion_method TEXT CHECK (completion_method IN ('manual', 'auto_detected', 'user_confirmed')),
ADD COLUMN IF NOT EXISTS completed_by_action JSONB,
ADD COLUMN IF NOT EXISTS performance_before JSONB,
ADD COLUMN IF NOT EXISTS performance_after JSONB,
ADD COLUMN IF NOT EXISTS effectiveness_score DECIMAL(5,2) CHECK (effectiveness_score >= 0 AND effectiveness_score <= 100),
ADD COLUMN IF NOT EXISTS effectiveness_status TEXT CHECK (effectiveness_status IN ('pending', 'improved', 'no_change', 'worsened')),
ADD COLUMN IF NOT EXISTS effectiveness_analysis JSONB,
ADD COLUMN IF NOT EXISTS effectiveness_calculated_at TIMESTAMPTZ;
```

---

## 🔄 SISTEMA TASK: AUTO-COMPLETAMENTO E TRACKING MIGLIORAMENTI

### ⚠️ ENTERPRISE - Architettura Completa

**Obiettivo**: Sistema intelligente che:
1. **Auto-rileva** quando utente completa un task
2. **Misura miglioramenti** performance prima/dopo
3. **Valida efficacia** dei suggerimenti
4. **Impara** quali task funzionano meglio

---

### 1. AUTO-COMPLETAMENTO TASK

#### 1.1 Rilevamento Automatico

**Trigger**: Dopo ogni azione utente (cambio formazione, sostituzione giocatore, etc.)

**Endpoint**: `/api/tasks/check-completion` (POST)
- Chiamato dopo ogni azione utente
- Verifica se task pending sono stati completati
- Auto-completa con `status = 'auto_completed'`

**Logica**:
```javascript
// Dopo che utente cambia formazione
async function detectTaskCompletion(userId, action) {
  const pendingTasks = await getPendingTasks(userId);
  
  for (const task of pendingTasks) {
    // Task: "Cambia formazione a 4-3-3"
    if (task.task_type === 'formation_change' && 
        action.type === 'formation_changed' &&
        action.new_formation === task.suggested_action.formation) {
      
      // AUTO-COMPLETAMENTO
      await completeTask(task.id, {
        method: 'auto_detected',
        action: action,
        confidence: 0.95
      });
      
      // Snapshot performance "prima" (se non già fatto)
      if (!task.performance_before) {
        await capturePerformanceBefore(task);
      }
    }
    
    // Task: "Sostituisci Sceva con Del Piero"
    if (task.task_type === 'player_substitution' &&
        action.type === 'player_substituted' &&
        action.removed_player === task.suggested_action.current_player &&
        action.added_player === task.suggested_action.suggested_player) {
      
      await completeTask(task.id, {
        method: 'auto_detected',
        action: action,
        confidence: 0.98
      });
      
      if (!task.performance_before) {
        await capturePerformanceBefore(task);
      }
    }
    
    // Task: "Aggiusta istruzione per Vieira"
    if (task.task_type === 'instruction_adjust' &&
        action.type === 'instruction_changed' &&
        action.player_id === task.player_id &&
        action.new_instruction === task.suggested_action.suggested_instruction) {
      
      await completeTask(task.id, {
        method: 'auto_detected',
        action: action,
        confidence: 0.92
      });
      
      if (!task.performance_before) {
        await capturePerformanceBefore(task);
      }
    }
  }
}
```

#### 1.2 Snapshot Performance "Prima"

**Quando**: Al momento della creazione del task (o al completamento se non fatto)

**Cosa cattura**:
```javascript
async function capturePerformanceBefore(task) {
  const performance = {
    // Per task giocatore
    avg_rating: task.aggregate_data.average_rating,
    matches: task.aggregate_data.matches_played,
    goals_per_match: task.aggregate_data.goals_per_match,
    assists_per_match: task.aggregate_data.assists_per_match,
    
    // Per task squadra
    avg_pass_accuracy: teamAggregates.avg_pass_accuracy,
    avg_possession: teamAggregates.avg_possession,
    avg_goals_scored: teamAggregates.avg_goals_scored,
    avg_goals_conceded: teamAggregates.avg_goals_conceded,
    
    captured_at: new Date()
  };
  
  await updateTask(task.id, { performance_before: performance });
}
```

#### 1.3 Snapshot Performance "Dopo"

**Quando**: Dopo N partite (es. 10 partite) dal completamento task

**Endpoint**: `/api/tasks/capture-performance-after` (POST) - Batch job notturno

**Cosa cattura**:
```javascript
async function capturePerformanceAfter(task) {
  // Aspetta almeno 10 partite dopo completamento
  const matchesAfter = await getMatchesAfter(task.completed_at, 10);
  
  if (matchesAfter.length < 10) {
    return; // Non abbastanza dati
  }
  
  // Calcola performance dopo
  const performance = {
    avg_rating: calculateAvgRating(matchesAfter),
    matches: matchesAfter.length,
    goals_per_match: calculateGoalsPerMatch(matchesAfter),
    assists_per_match: calculateAssistsPerMatch(matchesAfter),
    pass_accuracy: calculateAvgPassAccuracy(matchesAfter),
    possession: calculateAvgPossession(matchesAfter),
    
    captured_at: new Date(),
    improvement_detected: false,
    improvement_percentage: 0
  };
  
  // Confronta con "prima"
  if (task.performance_before) {
    const improvement = calculateImprovement(
      task.performance_before,
      performance
    );
    
    performance.improvement_detected = improvement.has_improvement;
    performance.improvement_percentage = improvement.percentage;
  }
  
  await updateTask(task.id, { performance_after: performance });
}
```

---

### 2. MISURAZIONE MIGLIORAMENTI

#### 2.1 Calcolo Efficacia Task

**Quando**: Dopo 10 partite dal completamento (batch job notturno)

**Endpoint**: `/api/tasks/calculate-effectiveness` (POST)

**Logica**:
```javascript
async function calculateTaskEffectiveness(task) {
  if (!task.performance_before || !task.performance_after) {
    return; // Non abbastanza dati
  }
  
  const before = task.performance_before;
  const after = task.performance_after;
  
  // Calcola miglioramenti per ogni metrica
  const improvements = {
    avg_rating: (after.avg_rating - before.avg_rating) / before.avg_rating * 100,
    goals_per_match: (after.goals_per_match - before.goals_per_match) / before.goals_per_match * 100,
    pass_accuracy: (after.pass_accuracy - before.pass_accuracy) / before.pass_accuracy * 100,
    possession: (after.possession - before.possession) / before.possession * 100
  };
  
  // Score complessivo (0-100)
  const effectivenessScore = calculateOverallScore(improvements);
  
  // Status
  let effectivenessStatus;
  if (effectivenessScore > 5) {
    effectivenessStatus = 'improved';
  } else if (effectivenessScore < -5) {
    effectivenessStatus = 'worsened';
  } else {
    effectivenessStatus = 'no_change';
  }
  
  // Analisi dettagliata
  const analysis = {
    matches_analyzed: after.matches,
    improvement_detected: effectivenessScore > 5,
    metrics_improved: Object.keys(improvements).filter(k => improvements[k] > 0),
    metrics_worsened: Object.keys(improvements).filter(k => improvements[k] < 0),
    overall_impact: effectivenessStatus,
    improvements: improvements
  };
  
  await updateTask(task.id, {
    effectiveness_score: effectivenessScore,
    effectiveness_status: effectivenessStatus,
    effectiveness_analysis: analysis,
    effectiveness_calculated_at: new Date()
  });
}
```

#### 2.2 Esempi Calcolo

**Task: "Sostituisci Sceva con Del Piero"**
```
Prima:
- avg_rating: 6.6
- goals_per_match: 0.1
- matches: 30

Dopo (10 partite):
- avg_rating: 7.2 (+9.1%)
- goals_per_match: 0.5 (+400%)
- matches: 10

Effectiveness Score: 85/100
Status: "improved"
```

**Task: "Cambia formazione a 4-3-3"**
```
Prima:
- avg_pass_accuracy: 65%
- avg_goals_scored: 1.5
- centrocampo_debole: 12/50 partite

Dopo (10 partite):
- avg_pass_accuracy: 72% (+10.8%)
- avg_goals_scored: 1.8 (+20%)
- centrocampo_debole: 1/10 partite (-83%)

Effectiveness Score: 78/100
Status: "improved"
```

---

### 3. FEEDBACK LOOP E APPRENDIMENTO

#### 3.1 Analytics Aggregati (Enterprise)

**Tabella `task_effectiveness_analytics`**:
```sql
CREATE TABLE task_effectiveness_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Aggregati per tipo task
  task_type TEXT NOT NULL,
  total_tasks INTEGER DEFAULT 0,
  completed_tasks INTEGER DEFAULT 0,
  auto_completed_tasks INTEGER DEFAULT 0,
  
  -- Efficacia media
  avg_effectiveness_score DECIMAL(5,2),
  improved_count INTEGER DEFAULT 0,
  no_change_count INTEGER DEFAULT 0,
  worsened_count INTEGER DEFAULT 0,
  
  -- Pattern identificati
  most_effective_conditions JSONB, -- {
  --   "when_avg_rating_below": 6.5,
  --   "when_matches_above": 20,
  --   "effectiveness": 0.85
  -- }
  
  -- Metadata
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_task_type_analytics UNIQUE (task_type)
);
```

**Query Analytics**:
```sql
-- Quali task funzionano meglio?
SELECT 
  task_type,
  AVG(effectiveness_score) as avg_effectiveness,
  COUNT(*) FILTER (WHERE effectiveness_status = 'improved') as improved_count,
  COUNT(*) FILTER (WHERE effectiveness_status = 'worsened') as worsened_count,
  COUNT(*) FILTER (WHERE completion_method = 'auto_detected') * 100.0 / COUNT(*) as auto_completion_rate
FROM ai_tasks
WHERE effectiveness_status IS NOT NULL
GROUP BY task_type
ORDER BY avg_effectiveness DESC;
```

#### 3.2 Miglioramento Suggerimenti

**Logica**:
```javascript
// Quando genero nuovo task, uso analytics per migliorare
async function generateImprovedTask(userId, issue) {
  // Carica analytics per questo tipo di task
  const analytics = await getTaskAnalytics(issue.task_type);
  
  // Se questo tipo di task ha bassa efficacia, aggiusta
  if (analytics.avg_effectiveness_score < 50) {
    // Task non funzionano bene, suggerisci alternative
    issue.alternative_approaches = analytics.most_effective_conditions;
    issue.warning = "Questo tipo di suggerimento ha efficacia media del " + analytics.avg_effectiveness_score + "%. Considera alternative.";
  }
  
  // Genera task con suggerimenti migliorati
  return await createTask(userId, issue);
}
```

---

### 4. UI E NOTIFICHE

#### 4.1 Dashboard Task

```
┌─────────────────────────────────────┐
│  📋 TASK ATTIVI (3)                  │
│  ────────────────────────────────  │
│                                     │
│  ✅ [Auto-completato]                │
│  "Cambia formazione a 4-3-3"        │
│  Completato: 2 giorni fa            │
│  📊 Efficacia: In calcolo...         │
│                                     │
│  ⏳ [In attesa]                      │
│  "Sostituisci Sceva con Del Piero"  │
│  [Applica] [Ignora]                 │
│                                     │
│  📈 [Completato - Migliorato]        │
│  "Aggiusta istruzione Vieira"       │
│  Completato: 15 giorni fa            │
│  📊 Efficacia: 85/100 (+9.1% rating)│
│  ✅ Miglioramento confermato!        │
└─────────────────────────────────────┘
```

#### 4.2 Notifiche

- **Task auto-completato**: "Hai applicato il suggerimento! Monitoriamo i risultati..."
- **Miglioramento rilevato**: "Ottimo! Il suggerimento ha funzionato: +9.1% rating medio"
- **Nessun miglioramento**: "Il suggerimento non ha prodotto miglioramenti. Proviamo un approccio diverso?"

---

### 5. SCALABILITÀ ENTERPRISE

#### 5.1 Performance

**Ottimizzazioni**:
- **Batch processing**: Calcolo efficacia in batch notturno (non real-time)
- **Caching**: Analytics aggregati in Redis (TTL 1 ora)
- **Indici**: Query ottimizzate su `user_id`, `status`, `effectiveness_status`
- **Limitazione**: Max 50 task pending per utente (archivia vecchi)

#### 5.2 Monitoring

**Metriche da tracciare**:
- Task auto-completati vs manuali (%)
- Efficacia media per tipo task
- Tempo medio per completamento
- Tasso di miglioramento (% task che migliorano)

**Alert**:
- Se efficacia media < 40% per tipo task → Review suggerimenti
- Se auto-completamento < 60% → Migliora rilevamento

---

### 6. FLUSSO COMPLETO

```
1. Task generato
   ↓
2. Snapshot performance "prima"
   ↓
3. Task mostrato a utente
   ↓
4. Utente agisce (o no)
   ↓
5. Sistema auto-rileva completamento
   ↓
6. Task auto-completato
   ↓
7. Dopo 10 partite: Snapshot performance "dopo"
   ↓
8. Calcolo efficacia
   ↓
9. Analytics aggregati
   ↓
10. Miglioramento suggerimenti futuri
```

---

**⚠️ ENTERPRISE - Considerazioni Finali**:
- ✅ **Auto-completamento**: Riduce friction, migliora UX
- ✅ **Tracking miglioramenti**: Valida efficacia, costruisce fiducia
- ✅ **Feedback loop**: Sistema che impara e migliora
- ✅ **Scalabilità**: Batch processing, caching, ottimizzazioni
- ✅ **Analytics**: Capire cosa funziona per migliorare prodotto

---

## 🔄 LOGICA AGGREGAZIONE

### Quando si Aggiorna
**Trigger**: Dopo che cliente carica nuove foto e match viene analizzato
- Upload foto → Estrazione dati → Salvataggio match → **Aggiornamento aggregati**
- Aggiornamento in **tempo reale** dopo ogni nuova partita analizzata
- Mantiene sempre ultime 50 partite (rimuove la più vecchia se > 50)

### Trigger: Aggiorna Aggregati dopo Match

```sql
-- Funzione per aggiornare aggregati dopo nuova partita
CREATE OR REPLACE FUNCTION update_performance_aggregates()
RETURNS TRIGGER AS $$
DECLARE
  player_record RECORD;
  match_count INTEGER;
  player_rating_data JSONB;
  player_goals INTEGER;
  player_assists INTEGER;
  player_minutes INTEGER;
  avg_rating DECIMAL(3,1);
  total_goals INTEGER;
  total_assists INTEGER;
  total_minutes INTEGER;
BEGIN
  -- Per ogni giocatore nella partita
  FOR player_record IN 
    SELECT * FROM jsonb_array_elements(NEW.players_in_match)
  LOOP
    -- Ottieni dati rating per questo giocatore
    player_rating_data := NEW.player_ratings->player_record->>'name';
    player_goals := COALESCE((player_rating_data->>'goals')::INTEGER, 0);
    player_assists := COALESCE((player_rating_data->>'assists')::INTEGER, 0);
    player_minutes := COALESCE((player_rating_data->>'minutes_played')::INTEGER, 0);
    
    -- Conta partite esistenti per questo giocatore (ultime 50)
    SELECT COUNT(*) INTO match_count
    FROM matches m
    WHERE m.user_id = NEW.user_id
      AND m.match_date <= NEW.match_date
      AND m.player_ratings ? player_record->>'name'
      AND m.analysis_status = 'completed'
    ORDER BY m.match_date DESC
    LIMIT 50;
    
    -- Calcola aggregati dalle ultime 50 partite
    WITH recent_matches AS (
      SELECT m.player_ratings->player_record->>'name' AS rating_data
      FROM matches m
      WHERE m.user_id = NEW.user_id
        AND m.match_date <= NEW.match_date
        AND m.player_ratings ? player_record->>'name'
        AND m.analysis_status = 'completed'
      ORDER BY m.match_date DESC
      LIMIT 50
    )
    SELECT 
      AVG((rating_data->>'rating')::DECIMAL) AS avg_rating,
      SUM(COALESCE((rating_data->>'goals')::INTEGER, 0)) AS total_goals,
      SUM(COALESCE((rating_data->>'assists')::INTEGER, 0)) AS total_assists,
      SUM(COALESCE((rating_data->>'minutes_played')::INTEGER, 0)) AS total_minutes
    INTO avg_rating, total_goals, total_assists, total_minutes
    FROM recent_matches;
    
    -- Calcola gol per minuto range (se disponibili eventi gol)
    -- (Logica più complessa, da implementare con loop su goals_events)
    
    -- Inserisci o aggiorna aggregato
    INSERT INTO player_performance_aggregates (
      user_id,
      player_id,
      player_name,
      matches_played,
      average_rating,
      total_goals,
      total_assists,
      goals_per_match,
      assists_per_match,
      total_minutes_played,
      average_minutes_per_match,
      last_match_date,
      last_updated_at
    )
    VALUES (
      NEW.user_id,
      (SELECT id FROM players WHERE user_id = NEW.user_id AND player_name = player_record->>'name' LIMIT 1),
      player_record->>'name',
      match_count,
      avg_rating,
      total_goals,
      total_assists,
      CASE WHEN match_count > 0 THEN total_goals::DECIMAL / match_count ELSE 0 END,
      CASE WHEN match_count > 0 THEN total_assists::DECIMAL / match_count ELSE 0 END,
      total_minutes,
      CASE WHEN match_count > 0 THEN total_minutes::DECIMAL / match_count ELSE 0 END,
      NEW.match_date,
      NOW()
    )
    ON CONFLICT (user_id, player_name)
    DO UPDATE SET
      matches_played = EXCLUDED.matches_played,
      average_rating = EXCLUDED.average_rating,
      total_goals = EXCLUDED.total_goals,
      total_assists = EXCLUDED.total_assists,
      goals_per_match = EXCLUDED.goals_per_match,
      assists_per_match = EXCLUDED.assists_per_match,
      total_minutes_played = EXCLUDED.total_minutes_played,
      average_minutes_per_match = EXCLUDED.average_minutes_per_match,
      last_match_date = EXCLUDED.last_match_date,
      last_updated_at = NOW();
  END LOOP;
  
  -- Aggiorna anche aggregati squadra
  PERFORM update_team_tactical_patterns(NEW.user_id, NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Funzione per aggiornare pattern tattici squadra
CREATE OR REPLACE FUNCTION update_team_tactical_patterns(p_user_id UUID, p_match_id UUID)
RETURNS VOID AS $$
DECLARE
  match_count INTEGER;
  total_goals_scored INTEGER;
  total_goals_conceded INTEGER;
  avg_possession DECIMAL;
  avg_shots DECIMAL;
  avg_shots_on_target DECIMAL;
  avg_pass_accuracy DECIMAL;
  avg_interceptions DECIMAL;
  avg_tackles DECIMAL;
  avg_saves DECIMAL;
  avg_corners DECIMAL;
  avg_fouls DECIMAL;
  avg_offsides DECIMAL;
  avg_crosses DECIMAL;
BEGIN
  -- Conta ultime 50 partite
  SELECT COUNT(*) INTO match_count
  FROM matches
  WHERE user_id = p_user_id
    AND analysis_status = 'completed'
  ORDER BY match_date DESC
  LIMIT 50;
  
  -- Calcola aggregati squadra
  WITH recent_matches AS (
    SELECT 
      team_stats,
      goals_events,
      formation_played,
      playing_style_played
    FROM matches
    WHERE user_id = p_user_id
      AND analysis_status = 'completed'
    ORDER BY match_date DESC
    LIMIT 50
  )
    SELECT 
      SUM(COALESCE((team_stats->>'goals_scored')::INTEGER, 0)),
      SUM(COALESCE((team_stats->>'goals_conceded')::INTEGER, 0)),
      AVG(COALESCE((team_stats->>'possession')::DECIMAL, 0)),
      AVG(COALESCE((team_stats->>'shots')::DECIMAL, 0)),
      AVG(COALESCE((team_stats->>'shots_on_target')::DECIMAL, 0)),
      AVG(COALESCE((team_stats->>'pass_accuracy')::DECIMAL, 0)),
      AVG(COALESCE((team_stats->>'interceptions')::DECIMAL, 0)),
      AVG(COALESCE((team_stats->>'tackles')::DECIMAL, 0)),
      AVG(COALESCE((team_stats->>'saves')::DECIMAL, 0)),
      AVG(COALESCE((team_stats->>'corners')::DECIMAL, 0)),
      AVG(COALESCE((team_stats->>'fouls')::DECIMAL, 0)),
      AVG(COALESCE((team_stats->>'offsides')::DECIMAL, 0)),
      AVG(COALESCE((team_stats->>'crosses')::DECIMAL, 0))
    INTO total_goals_scored, total_goals_conceded, avg_possession,
         avg_shots, avg_shots_on_target, avg_pass_accuracy,
         avg_interceptions, avg_tackles, avg_saves, avg_corners,
         avg_fouls, avg_offsides, avg_crosses
    FROM recent_matches;
  
  -- Inserisci o aggiorna pattern squadra
  INSERT INTO team_tactical_patterns (
    user_id,
    matches_analyzed,
    total_goals_scored,
    total_goals_conceded,
    avg_goals_scored_per_match,
    avg_goals_conceded_per_match,
    avg_possession,
    avg_shots,
    avg_shots_on_target,
    avg_pass_accuracy,
    avg_interceptions,
    avg_tackles,
    avg_saves,
    avg_corners,
    avg_fouls,
    avg_offsides,
    avg_crosses,
    last_updated_at
  )
  VALUES (
    p_user_id,
    match_count,
    total_goals_scored,
    total_goals_conceded,
    CASE WHEN match_count > 0 THEN total_goals_scored::DECIMAL / match_count ELSE 0 END,
    CASE WHEN match_count > 0 THEN total_goals_conceded::DECIMAL / match_count ELSE 0 END,
    avg_possession,
    avg_shots,
    avg_shots_on_target,
    avg_pass_accuracy,
    avg_interceptions,
    avg_tackles,
    avg_saves,
    avg_corners,
    avg_fouls,
    avg_offsides,
    avg_crosses,
    NOW()
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    matches_analyzed = EXCLUDED.matches_analyzed,
    total_goals_scored = EXCLUDED.total_goals_scored,
    total_goals_conceded = EXCLUDED.total_goals_conceded,
    avg_goals_scored_per_match = EXCLUDED.avg_goals_scored_per_match,
    avg_goals_conceded_per_match = EXCLUDED.avg_goals_conceded_per_match,
    avg_possession = EXCLUDED.avg_possession,
    avg_shots = EXCLUDED.avg_shots,
    avg_shots_on_target = EXCLUDED.avg_shots_on_target,
    avg_pass_accuracy = EXCLUDED.avg_pass_accuracy,
    avg_interceptions = EXCLUDED.avg_interceptions,
    avg_tackles = EXCLUDED.avg_tackles,
    avg_saves = EXCLUDED.avg_saves,
    avg_corners = EXCLUDED.avg_corners,
    avg_fouls = EXCLUDED.avg_fouls,
    avg_offsides = EXCLUDED.avg_offsides,
    avg_crosses = EXCLUDED.avg_crosses,
    last_updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER trigger_update_aggregates
AFTER INSERT OR UPDATE ON matches
FOR EACH ROW
WHEN (NEW.analysis_status = 'completed')
EXECUTE FUNCTION update_performance_aggregates();
```

### Logica: Genera Task Automatici

```javascript
// Endpoint: /api/ai/generate-tasks
async function generateTasks(userId) {
  // 1. Trova giocatori che necessitano attenzione
  const underperformers = await supabase
    .from('player_performance_aggregates')
    .select('*')
    .eq('user_id', userId)
    .or('average_rating.lt.6.0,needs_attention.eq.true')
    .order('average_rating', { ascending: true });
  
  // 2. Per ogni giocatore, genera task
  for (const player of underperformers.data) {
    // Task: Sostituzione giocatore
    if (player.average_rating < 6.0 && player.matches_played >= 10) {
      await createTask({
        type: 'player_substitution',
        priority: 'high',
        title: `${player.player_name}: media ${player.average_rating} su ${player.matches_played} partite`,
        description: `Considera sostituzione: performance sotto la media`,
        reason: `Media voti ${player.average_rating} su ${player.matches_played} partite`,
        player_name: player.player_name,
        aggregate_data: player
      });
    }
    
    // Task: Cambio posizione
    if (player.optimal_position && player.positions_played[player.optimal_position]) {
      const currentPos = Object.keys(player.positions_played)[0]; // Posizione più usata
      if (currentPos !== player.optimal_position) {
        await createTask({
          type: 'position_change',
          priority: 'medium',
          title: `${player.player_name}: migliore come ${player.optimal_position}`,
          description: `Media ${player.position_performance[player.optimal_position].avg_rating} come ${player.optimal_position} vs ${player.average_rating} come ${currentPos}`,
          player_name: player.player_name,
          suggested_action: {
            action: 'change_position',
            from: currentPos,
            to: player.optimal_position
          }
        });
      }
    }
  }
  
  // 3. Trova pattern tattici problematici
  const patterns = await supabase
    .from('team_tactical_patterns')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  // Task: Cambio formazione
  if (patterns.data.recurring_issues) {
    for (const issue of patterns.data.recurring_issues) {
      if (issue.frequency >= 10) { // Problema in almeno 10 partite su 50
        await createTask({
          type: 'formation_change',
          priority: issue.severity,
          title: `Problema ricorrente: ${issue.type}`,
          description: `Identificato in ${issue.frequency} partite su 50`,
          reason: `Pattern identificato: ${issue.type} in formazioni ${issue.affected_formations.join(', ')}`
        });
      }
    }
  }
}
```

---

## 📋 COSA SALVARE PER ANALISI

### Per Giocatore (Ultime 50 Partite)
✅ **Media voti** (es. Sceva: 6.6 su 30 partite)
✅ **Trend voti** (miglioramento/peggioramento/stabile)
✅ **Posizioni giocate** (quante volte in ogni posizione)
✅ **Performance per posizione** (media voti per posizione)
✅ **Aree attacco aggregate** (pattern di attacco del giocatore)
✅ **Zone recupero aggregate** (dove recupera più spesso)
✅ **Heatmap aggregata** (zone campo più frequentate)

### Per Squadra (Ultime 50 Partite)
✅ **Gol segnati/subiti** (totali e media per partita)
✅ **Clean sheets** (partite senza gol subiti)
✅ **Pattern temporale gol** (quando segna/subisce di più)
✅ **Aree attacco aggregate** (sinistra/centro/destra)
✅ **Zone recupero aggregate** (terzo difensivo/centrocampo/attacco)
✅ **Statistiche squadra aggregate** (possesso medio, tiri, passaggi, precisione)
✅ **Formazioni più usate** (con performance: gol segnati/subiti, win rate)
✅ **Stili di gioco più usate** (con performance)
✅ **Problemi ricorrenti** (es. centrocampo debole in 12 partite su 50)

### Per Task Generazione
✅ **Giocatori sotto media** (< 6.0 con almeno 10 partite)
✅ **Posizioni subottimali** (giocatore migliore in altra posizione)
✅ **Formazioni problematiche** (problemi ricorrenti)
✅ **Pattern tattici inefficaci** (aree attacco sbilanciate, zone recupero sbagliate)

---

## 🎯 ESEMPI TASK GENERATI

### Task 1: Sostituzione Giocatore
```
Tipo: player_substitution
Priorità: HIGH
Titolo: "Sceva: media 6.6 su 30 partite, considera sostituzione"
Descrizione: "Performance sotto la media. Media voti 6.6 su 30 partite, 0.1 gol/partita."
Azione: Sostituisci con [Del Piero] (media 7.2, 0.5 gol/partita nella stessa posizione)
```

### Task 1b: Giocatore Sottoutilizzato
```
Tipo: player_substitution
Priorità: MEDIUM
Titolo: "Eto'o: solo 45 minuti/partita in media"
Descrizione: "Gioca solo 45 minuti per partita in media. Considera se è la scelta giusta."
Azione: Valuta se mantenerlo titolare o spostarlo in riserve
```

### Task 1c: Giocatore Produttivo ma Sottoutilizzato
```
Tipo: position_change
Priorità: MEDIUM
Titolo: "Del Piero: 0.5 gol/partita ma solo 60 minuti/partita"
Descrizione: "Media 0.5 gol/partita ma gioca solo 60 minuti. Potrebbe fare di più se titolare fisso."
Azione: Considera di farlo partire sempre titolare
```

### Task 2: Cambio Posizione
```
Tipo: position_change
Priorità: MEDIUM
Titolo: "Eto'o: migliore come SP che come P"
Descrizione: "Media 7.2 come SP (15 partite) vs 6.0 come P (10 partite)"
Azione: Sposta da P a SP
```

### Task 3: Cambio Formazione
```
Tipo: formation_change
Priorità: HIGH
Titolo: "Problema ricorrente: centrocampo debole in 4-2-1-3"
Descrizione: "Identificato in 12 partite su 50. Formazione 4-2-1-3 esposta al centrocampo."
Azione: Considera cambio a 4-3-3 per rinforzare centrocampo
```

### Task 4: Aggiusta Istruzioni
```
Tipo: instruction_adjust
Priorità: MEDIUM
Titolo: "Vieira: recupera troppo in avanti"
Descrizione: "Zone recupero aggregate mostrano attività eccessiva in terzo offensivo"
Azione: Cambia istruzione da "Attacca" a "Resta indietro"
```

### Task 5: Pattern Temporale Problema
```
Tipo: tactical_adjustment
Priorità: HIGH
Titolo: "Subisci troppi gol tra 60-75 minuti"
Descrizione: "12 gol subiti tra 60-75 minuti su 50 partite. Probabile problema di resistenza o sostituzioni."
Azione: Valuta sostituzioni più precoci o istruzioni per preservare energie
```

### Task 6: Attacco Sbilanciato
```
Tipo: tactical_adjustment
Priorità: MEDIUM
Titolo: "Attacco troppo concentrato al centro (64%)"
Descrizione: "Aree attacco aggregate: centro 64%, sinistra 19%, destra 17%. Troppo prevedibile."
Azione: Considera di bilanciare meglio l'attacco utilizzando anche le fasce
```

---

## ❓ DOMANDE APERTE

1. **Upload Foto**: Una sola chiamata con tutte le foto o step-by-step?
2. **Matching Giocatori**: Cosa fare se match confidence è bassa?
3. **Discrepanze Formazione**: Come gestire se cliente cambia spesso formazione?
4. **Analisi AI**: Quando triggerare? Automatico dopo upload o manuale?
5. **Credits**: Quanti credits per analisi match completa?
6. **Aggiornamento Aggregati**: In tempo reale o batch notturno?
7. **Task Dismissal**: Come gestire task ignorati dall'utente?
8. **Limite Partite**: 50 è sufficiente o variabile per utente?
9. **Formazione Avversaria**: Salvare storico formazioni avversarie o solo per partita corrente?
10. **Foto Mancanti**: Quanto insistere con messaggi carini? (suggerito: 1 volta, poi procedere)
11. **Real-time Adoption**: Come incentivare uso real-time senza forzare? (suggerito: mostrare valore, lasciare scelta)

---

## 🚀 FUTURO: REAL-TIME COACH END-TO-END (OPZIONALE)

### Visione Enterprise

**⚠️ IMPORTANTE - Pay-per-use e Opzionalità**:
- **Real-time è OPZIONALE** - Cliente può scegliere se usarlo o no
- **Suggerimenti tradizionali sempre disponibili** - Anche senza real-time
- **Credits**: Real-time costa di più (3-5 credits), suggerimenti tradizionali meno (1-2 credits)
- **Cliente decide**: Vuole real-time o preferisce analisi post-partita?

**Obiettivo**: Coach AI in diretta durante la partita (se cliente lo vuole)
- Analisi real-time durante il gioco
- Suggerimenti tattici in tempo reale
- Contromisure immediate basate su eventi partita

### Architettura Proposta

**Stack Tecnologico**:
- **GPT-4o Realtime API**: Streaming conversation end-to-end
- **WebSocket**: Comunicazione bidirezionale client-server
- **Event-Driven**: Trigger su eventi partita (gol, sostituzioni, etc.)

**Flusso**:
```
Cliente in partita
  ↓
Eventi partita (gol, sostituzioni, etc.)
  ↓
WebSocket → Server
  ↓
GPT-4o Realtime (streaming)
  ↓
Suggerimenti real-time → Cliente
```

### Dati Input Real-Time

**Eventi Partita**:
- Gol segnati/subiti (minuto, marcatore)
- Sostituzioni (minuto, giocatore entrato/uscito)
- Cambi formazione (minuto, nuova formazione)
- Eventi chiave (cartellini, calci d'angolo, etc.)

**Dati Profilo**:
- Formazione attuale
- Istruzioni individuali
- Rosa disponibile
- Stile di gioco

**Dati Avversario** (se disponibili):
- Formazione avversaria (da pre-partita)
- Sostituzioni avversarie
- Eventi avversari

### Output Real-Time

**Suggerimenti Tattici** (streaming):
- "Hai subito gol al 25', considera cambio formazione"
- "Avversario ha sostituito attaccante, aggiusta marcatura"
- "Hai 2-0, considera istruzione 'Resta indietro' per preservare risultato"

**Contromisure Immediate**:
- Cambio formazione suggerito
- Istruzioni individuali da modificare
- Sostituzioni suggerite

### Implementazione Fasi

**Fase 1: MVP Real-Time** (Settimana 1-2)
- WebSocket base
- Eventi partita manuali (cliente inserisce eventi)
- GPT-4o Realtime per suggerimenti
- UI semplice con suggerimenti in streaming

**Fase 2: Integrazione Automatica** (Settimana 3-4)
- Estrazione automatica eventi da screenshot (se possibile)
- Trigger automatici su eventi
- Suggerimenti più contestuali

**Fase 3: Ottimizzazione Enterprise** (Settimana 5-6)
- Rate limiting intelligente
- Caching suggerimenti simili
- Personalizzazione basata su storico utente
- Analytics utilizzo real-time

### Costi e Scalabilità

**⚠️ PAY-PER-USE MODEL**:
- **Real-time (opzionale)**: 3-5 credits per partita (90 minuti)
- **Suggerimenti tradizionali (sempre disponibili)**: 1-2 credits per analisi post-partita
- **Cliente sceglie**: Real-time o tradizionale?
- **Costi GPT-4o Realtime**: ~$0.01-0.03 per minuto di conversazione
- **Partita media real-time**: 90 minuti = $0.90-2.70 per partita

**Scalabilità**:
- WebSocket connection pooling
- Rate limiting per utente (max 1 partita real-time alla volta)
- Queue system per gestire picchi

### UI Real-Time

```
┌─────────────────────────────────────┐
│  🎮 COACH REAL-TIME                  │
│  ────────────────────────────────  │
│                                     │
│  [Eventi Partita]                   │
│  • 25' - Gol subito                 │
│  • 30' - Sostituzione avversaria    │
│                                     │
│  💬 SUGGERIMENTI (Live)             │
│  ────────────────────────────────  │
│  [Streaming text]                    │
│  "Hai subito gol al 25'...          │
│   Considera cambio formazione..."   │
│                                     │
│  [Applica Suggerimento]             │
└─────────────────────────────────────┘
```

**Focus UX Real-Time**:
- ✅ Suggerimenti chiari e immediati
- ✅ Azioni rapide (1 click per applicare)
- ✅ Non sovraccaricare utente (max 1-2 suggerimenti alla volta)

### Schema Database Real-Time (Futuro)

```sql
CREATE TABLE realtime_coach_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id),
  opponent_formation_id UUID REFERENCES opponent_formations(id),
  
  -- Stato sessione
  status TEXT DEFAULT 'active', -- active, paused, completed
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  
  -- Eventi partita (real-time)
  match_events JSONB DEFAULT '[]'::jsonb, -- [
  --   {
  --     "minute": 25,
  --     "type": "goal_conceded",
  --     "description": "Gol subito"
  --   }
  -- ]
  
  -- Suggerimenti generati
  suggestions JSONB DEFAULT '[]'::jsonb, -- [
  --   {
  --     "minute": 25,
  --     "suggestion": "Considera cambio formazione",
  --     "applied": false,
  --     "applied_at": null
  --   }
  -- ]
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔍 ANALISI CRITICA INVERSA: PROBLEMATICHE E RISULTATO ATTESO

### ⚠️ METODO: Partire dal Risultato Atteso e Verificare Architettura

**Risultato Atteso**: Coach AI che:
1. Conosce tutto lo storico utente
2. Dà consigli personalizzati (non generici)
3. Auto-rileva completamento task
4. Misura miglioramenti
5. Impara e migliora suggerimenti
6. Funziona con molti utenti (enterprise)

**Verifica**: L'architettura proposta raggiunge questo risultato?

---

### 1. PROBLEMA: Storico per AI - Performance e Costi

**Risultato Atteso**: AI conosce storico utente per consigli personalizzati

**Problema Identificato**:
- ❌ Caricare storico (50 partite) per ogni analisi = **lento e costoso**
- ❌ Prompt con 50 partite = **troppi token** (costi elevati)
- ❌ Con 1000 utenti simultanei = **database overload**

**Soluzione Proposta**:
- ✅ **Aggregati già calcolati** (non tutte le partite)
- ✅ **Solo pattern rilevanti** nel prompt (non tutte le 50 partite)
- ✅ **Caching Redis** per aggregati (TTL 1 ora)

**Gap Rimanente**:
- ⚠️ **Caching non implementato** - Serve Redis
- ⚠️ **Query aggregati** - Deve essere ottimizzata
- ⚠️ **Limitazione prompt** - Logica non definita (quali pattern includere?)

**Raccomandazione**:
```javascript
// Invece di caricare 50 partite, carica solo:
const historicalContext = {
  recurring_issues: teamPatterns.recurring_issues.slice(0, 3), // Top 3
  avg_metrics: {
    pass_accuracy: teamPatterns.avg_pass_accuracy,
    possession: teamPatterns.avg_possession
  },
  gap_analysis: {
    pass_accuracy_gap: teamPatterns.avg_pass_accuracy - 75, // vs media generale
    frequency: "35/50 partite con pass_accuracy < 70%"
  }
};
// Totale: ~500 token invece di 5000+
```

---

### 2. PROBLEMA: Auto-completamento Task - Rilevamento Impreciso

**Risultato Atteso**: Sistema auto-rileva quando utente completa task

**Problema Identificato**:
- ❌ **False positives**: Utente cambia formazione per altro motivo, sistema pensa sia per task
- ❌ **False negatives**: Utente completa task ma sistema non lo rileva
- ❌ **Confidence score**: Come calcolare? Quando è abbastanza alto?

**Esempio Problema**:
```
Task: "Cambia formazione a 4-3-3"
Utente cambia a 4-3-3 ma per altro motivo (non per task)
Sistema: "Task completato!" ❌ FALSO
```

**Soluzione Proposta**:
- ✅ **Confidence threshold**: Solo auto-completa se confidence > 0.90
- ✅ **User confirmation**: Chiedi conferma se confidence < 0.90
- ✅ **Time window**: Auto-completa solo se azione entro 7 giorni da task

**Gap Rimanente**:
- ⚠️ **Logica confidence** - Non definita precisamente
- ⚠️ **User confirmation flow** - Non implementato
- ⚠️ **Edge cases** - Cosa fare se utente fa azione simile ma non identica?

**Raccomandazione**:
```javascript
// Auto-completamento solo se:
1. Action matches task exactly (formation === suggested_formation)
2. Action within 7 days of task creation
3. Confidence > 0.90
4. No other similar task completed recently

// Altrimenti: chiedi conferma utente
if (confidence < 0.90) {
  await askUserConfirmation(task, action);
}
```

---

### 3. PROBLEMA: Misurazione Miglioramenti - Causalità vs Correlazione

**Risultato Atteso**: Misurare se task ha migliorato performance

**Problema Identificato**:
- ❌ **Causalità**: Performance migliorata = task funzionato? O altri fattori?
- ❌ **Confounding variables**: Utente ha fatto altre modifiche contemporaneamente
- ❌ **Sample size**: 10 partite sono sufficienti? Variabilità statistica?

**Esempio Problema**:
```
Task: "Sostituisci Sceva con Del Piero"
Performance migliorata: +9.1% rating
Ma: Utente ha anche cambiato formazione, istruzioni, coach
Causa reale: Task o altre modifiche? ❓
```

**Soluzione Proposta**:
- ✅ **Controllo variabili**: Traccia tutte le modifiche contemporanee
- ✅ **Sample size**: Minimo 10 partite (statisticamente significativo)
- ✅ **Confidence interval**: Calcola intervallo di confidenza per miglioramento

**Gap Rimanente**:
- ⚠️ **Tracking modifiche** - Non implementato (solo task, non altre modifiche)
- ⚠️ **Analisi statistica** - Non definita (come distinguere causalità?)
- ⚠️ **Baseline comparison** - Confronto con cosa? (media generale o utente stesso?)

**Raccomandazione**:
```javascript
// Traccia TUTTE le modifiche durante periodo analisi
const modifications = await getModificationsDuringPeriod(
  task.completed_at,
  task.performance_after.captured_at
);

// Se altre modifiche significative, riduci confidence
if (modifications.length > 2) {
  effectivenessScore *= 0.7; // Riduci score se altre modifiche
  effectiveness_analysis.notes = "Altre modifiche durante periodo analisi";
}
```

---

### 4. PROBLEMA: Feedback Loop - Apprendimento Lento

**Risultato Atteso**: Sistema impara e migliora suggerimenti

**Problema Identificato**:
- ❌ **Cold start**: Primi utenti non hanno dati storici
- ❌ **Apprendimento lento**: Serve tempo per accumulare analytics
- ❌ **Bias**: Se task non funzionano, utente li ignora → meno dati

**Esempio Problema**:
```
Task type "formation_change" ha efficacia 30%
Ma: Solo 5 task completati (sample piccolo)
Sistema: "Non suggerire più formation_change" ❌ Prematuro
```

**Soluzione Proposta**:
- ✅ **Minimum sample**: Non cambiare suggerimenti se < 20 task completati
- ✅ **A/B testing**: Testa nuovi suggerimenti in parallelo
- ✅ **Fallback**: Se efficacia bassa, prova approcci alternativi

**Gap Rimanente**:
- ⚠️ **A/B testing** - Non implementato
- ⚠️ **Minimum sample logic** - Non definita
- ⚠️ **Alternative approaches** - Come generare alternative?

**Raccomandazione**:
```javascript
// Non modificare suggerimenti se:
if (analytics.completed_tasks < 20) {
  return; // Non abbastanza dati
}

// Se efficacia bassa, prova alternative
if (analytics.avg_effectiveness_score < 40 && analytics.completed_tasks >= 20) {
  // Genera task con approccio alternativo
  task.alternative_approach = true;
  task.warning = "Approccio alternativo basato su analytics";
}
```

---

### 5. PROBLEMA: Scalabilità Enterprise - Database e API

**Risultato Atteso**: Funziona con molti utenti simultanei

**Problema Identificato**:
- ❌ **Database queries**: Caricare aggregati per ogni analisi = N+1 queries
- ❌ **API rate limiting**: Non implementato
- ❌ **Batch processing**: Calcolo efficacia task = può essere lento
- ❌ **Concurrent users**: 1000 utenti simultanei = database overload?

**Soluzione Proposta**:
- ✅ **Caching Redis**: Aggregati in cache (TTL 1 ora)
- ✅ **Rate limiting**: Max 10 analisi/ora per utente
- ✅ **Batch jobs**: Calcolo efficacia in background (notte)
- ✅ **Connection pooling**: Database connection pool

**Gap Rimanente**:
- ⚠️ **Redis** - Non implementato
- ⚠️ **Rate limiting** - Non implementato
- ⚠️ **Background jobs** - Non implementato (cron jobs)
- ⚠️ **Connection pooling** - Configurazione Supabase

**Raccomandazione**:
```javascript
// Implementare:
1. Redis per caching aggregati
2. Rate limiting middleware (es. express-rate-limit)
3. Background jobs (es. node-cron o Bull queue)
4. Database connection pooling (Supabase client pooling)
```

---

### 6. PROBLEMA: Dati Parziali - Qualità Analisi

**Risultato Atteso**: Funziona anche con dati parziali

**Problema Identificato**:
- ❌ **Qualità analisi**: Con dati parziali, analisi meno precisa
- ❌ **False insights**: AI può generare insight errati con dati incompleti
- ❌ **User trust**: Se analisi sbagliate, utente perde fiducia

**Esempio Problema**:
```
Utente carica solo formazione, non voti giocatori
AI: "Centrocampo debole" (basato solo su formazione)
Ma: In realtà centrocampo ha giocato bene (voti alti)
Risultato: Suggerimento sbagliato ❌
```

**Soluzione Proposta**:
- ✅ **Confidence score**: Indica confidenza analisi basata su dati disponibili
- ✅ **Warning messages**: Avvisa utente se dati parziali
- ✅ **Conservative insights**: Con dati parziali, essere più conservativi

**Gap Rimanente**:
- ⚠️ **Confidence score** - Non implementato nell'output AI
- ⚠️ **Warning logic** - Non definita precisamente
- ⚠️ **Conservative mode** - Non implementato nel prompt AI

**Raccomandazione**:
```javascript
// Aggiungi confidence score all'output
const analysisConfidence = calculateConfidence(availableData);

if (analysisConfidence < 0.7) {
  ai_summary += "\n\n⚠️ Nota: Analisi basata su dati parziali. Carica più foto per suggerimenti più precisi.";
  ai_insights.forEach(insight => {
    insight.confidence = analysisConfidence;
  });
}
```

---

### 7. PROBLEMA: Real-time Coach - Costi e Complessità

**Risultato Atteso**: Coach real-time durante partita

**Problema Identificato**:
- ❌ **Costi**: GPT-4o Realtime = $0.90-2.70 per partita (90 minuti)
- ❌ **WebSocket scaling**: 1000 utenti simultanei = 1000 WebSocket connections
- ❌ **Event detection**: Come rilevare eventi partita automaticamente?

**Soluzione Proposta**:
- ✅ **Opzionale**: Cliente sceglie se usare (pay-per-use)
- ✅ **WebSocket pooling**: Connection pooling per scalabilità
- ✅ **Manual events**: Cliente inserisce eventi manualmente (MVP)

**Gap Rimanente**:
- ⚠️ **WebSocket infrastructure** - Non implementato
- ⚠️ **Event detection** - Solo manuale (non automatico)
- ⚠️ **Cost management** - Come limitare costi se utente abusa?

**Raccomandazione**:
```javascript
// Implementare:
1. WebSocket server (es. Socket.io con Redis adapter)
2. Rate limiting per real-time (max 1 partita/utente)
3. Cost alerts (avvisa utente se costi elevati)
4. Manual event input (MVP, poi automatico con screenshot)
```

---

### 8. CHECKLIST FINALE: Cosa Manca per Enterprise

**✅ Implementato**:
- Schema database completo
- Logica aggregati
- Auto-completamento task (logica)
- Tracking miglioramenti (logica)

**❌ Mancante**:
- [ ] Redis per caching
- [ ] Rate limiting API
- [ ] Background jobs (cron)
- [ ] WebSocket infrastructure (real-time)
- [ ] Monitoring e alerting
- [ ] A/B testing framework
- [ ] Confidence scoring per analisi
- [ ] Connection pooling database
- [ ] CDN per assets statici
- [ ] Load balancing (se scale orizzontale)

**⚠️ Da Verificare**:
- [ ] Query performance con 1000+ utenti
- [ ] Costi AI con volume elevato
- [ ] False positive/negative rate auto-completamento
- [ ] Statistical significance miglioramenti
- [ ] User trust con dati parziali

---

**CONCLUSIONE**: Architettura solida ma serve implementazione infrastruttura enterprise (Redis, rate limiting, background jobs) e validazione empirica (test con utenti reali).

---

## ⭐ SISTEMA CONOSCENZA IA: BARRA PROGRESSIVA E GAMIFICATION

### 🎯 OBIETTIVO PRINCIPALE

**Focus**: Far caricare più dati possibile al cliente
- Cliente deve capire: **Più la IA sa, più ti aiuta**
- Feedback visivo immediato: **Barra conoscenza** che aumenta/diminuisce
- Gamification: Cliente vede progresso in tempo reale

---

### 1. BARRA CONOSCENZA IA

#### 1.1 Schema Database

```sql
CREATE TABLE user_ai_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Profilazione Base (0% → 50%)
  roster_complete BOOLEAN DEFAULT false, -- 21 giocatori caricati (+20%)
  formation_saved BOOLEAN DEFAULT false, -- Formazione salvata (+10%)
  coach_active BOOLEAN DEFAULT false, -- Coach attivo (+10%)
  instructions_set BOOLEAN DEFAULT false, -- Istruzioni individuali (+10%)
  
  -- Profilazione Avanzata (50% → 80%)
  matches_analyzed INTEGER DEFAULT 0, -- +15% se >= 5 partite, +10% se >= 20
  heatmaps_uploaded INTEGER DEFAULT 0, -- +10% se >= 3 mappe
  opponent_formations_analyzed INTEGER DEFAULT 0, -- +5% se >= 3 formazioni
  
  -- Profilazione Completa (80% → 100%)
  matches_complete_data INTEGER DEFAULT 0, -- Partite con TUTTE le foto (+10% se >= 20)
  heatmaps_multiple_per_player INTEGER DEFAULT 0, -- Mappe multiple per giocatore (+5%)
  pattern_identified BOOLEAN DEFAULT false, -- Pattern identificati (+5%)
  
  -- Calcolo Progressivo
  knowledge_score DECIMAL(5,2) DEFAULT 0.00 CHECK (knowledge_score >= 0 AND knowledge_score <= 100),
  knowledge_level TEXT DEFAULT 'beginner' CHECK (knowledge_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  
  -- Metadata
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_user_knowledge UNIQUE (user_id)
);

-- Trigger per calcolo automatico knowledge_score
CREATE OR REPLACE FUNCTION calculate_ai_knowledge_score()
RETURNS TRIGGER AS $$
DECLARE
  score DECIMAL(5,2) := 0;
  level TEXT;
BEGIN
  -- Profilazione Base (0-50%)
  IF NEW.roster_complete THEN score := score + 20; END IF;
  IF NEW.formation_saved THEN score := score + 10; END IF;
  IF NEW.coach_active THEN score := score + 10; END IF;
  IF NEW.instructions_set THEN score := score + 10; END IF;
  
  -- Profilazione Avanzata (50-80%)
  IF NEW.matches_analyzed >= 20 THEN
    score := score + 10;
  ELSIF NEW.matches_analyzed >= 5 THEN
    score := score + 15;
  END IF;
  
  IF NEW.heatmaps_uploaded >= 3 THEN score := score + 10; END IF;
  IF NEW.opponent_formations_analyzed >= 3 THEN score := score + 5; END IF;
  
  -- Profilazione Completa (80-100%)
  IF NEW.matches_complete_data >= 20 THEN score := score + 10; END IF;
  IF NEW.heatmaps_multiple_per_player >= 5 THEN score := score + 5; END IF;
  IF NEW.pattern_identified THEN score := score + 5; END IF;
  
  -- Limita a 100
  IF score > 100 THEN score := 100; END IF;
  
  -- Calcola livello
  IF score >= 80 THEN
    level := 'expert';
  ELSIF score >= 60 THEN
    level := 'advanced';
  ELSIF score >= 30 THEN
    level := 'intermediate';
  ELSE
    level := 'beginner';
  END IF;
  
  NEW.knowledge_score := score;
  NEW.knowledge_level := level;
  NEW.last_calculated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_knowledge_score
BEFORE INSERT OR UPDATE ON user_ai_knowledge
FOR EACH ROW
EXECUTE FUNCTION calculate_ai_knowledge_score();
```

#### 1.2 Calcolo Conoscenza per Partita

**Quando**: Dopo ogni upload foto partita

**Endpoint**: `/api/knowledge/update-after-match` (POST)

**Logica**:
```javascript
async function updateKnowledgeAfterMatch(userId, matchData) {
  const knowledge = await getUserKnowledge(userId);
  const oldScore = knowledge.knowledge_score;
  
  // Incrementa partite analizzate
  knowledge.matches_analyzed += 1;
  
  // Se partita ha TUTTE le foto (6 foto), incrementa complete_data
  const photosCount = countPhotos(matchData);
  if (photosCount >= 6) { // Tutte le foto
    knowledge.matches_complete_data += 1;
  }
  
  // Ricalcola score (trigger automatico)
  await updateKnowledge(knowledge);
  
  // Notifica utente con aumento conoscenza
  const newScore = knowledge.knowledge_score;
  const increase = newScore - oldScore;
  
  if (increase > 0) {
    showNotification(`🎉 Conoscenza IA aumentata! ${oldScore}% → ${newScore}% (+${increase}%)`);
    
    // Se raggiunto milestone
    if (newScore >= 80 && oldScore < 80) {
      showNotification(`🏆 Livello Expert raggiunto! Analisi ora più precise!`);
    }
  }
  
  return {
    knowledge_score: newScore,
    knowledge_level: knowledge.knowledge_level,
    increase: increase
  };
}
```

#### 1.3 UI Barra Conoscenza

**Posizione**: Header/Navbar (sempre visibile)

```
┌─────────────────────────────────────┐
│  🎮 eFootball AI Coach              │
│  ────────────────────────────────  │
│                                     │
│  📊 CONOSCENZA IA                   │
│  ┌─────────────────────────────┐  │
│  │ ████████░░░░░░░░░░ 45%        │  │
│  └─────────────────────────────┘  │
│  Intermedio - Carica più dati!     │
│                                     │
│  💡 Più la IA sa, più ti aiuta!    │
│                                     │
│  [Vedi come aumentare →]            │
└─────────────────────────────────────┘
```

**Colori Barra**:
- 🔴 Rosso: 0-30% (Beginner)
- 🟠 Arancione: 30-60% (Intermediate)
- 🟡 Giallo: 60-80% (Advanced)
- 🟢 Verde: 80-100% (Expert)

**Tooltip/Modal "Come aumentare"**:
```
┌─────────────────────────────────────┐
│  📈 COME AUMENTARE LA CONOSCENZA    │
│  ────────────────────────────────  │
│                                     │
│  ✅ Rosa completa (21 giocatori)    │
│     +20% conoscenza                 │
│                                     │
│  ✅ Formazione salvata               │
│     +10% conoscenza                 │
│                                     │
│  ✅ Coach attivo                     │
│     +10% conoscenza                 │
│                                     │
│  ✅ 5+ partite analizzate           │
│     +15% conoscenza                 │
│                                     │
│  ✅ 20+ partite analizzate           │
│     +10% conoscenza (totale 25%)   │
│                                     │
│  ✅ Partite con TUTTE le foto        │
│     +10% conoscenza (se 20+)        │
│                                     │
│  💡 Carica tutte le foto ogni        │
│     partita per massimizzare!       │
└─────────────────────────────────────┘
```

---

### 2. INCENTIVI PER CARICARE PIÙ DATI

#### 2.1 Messaggi Motivazionali (TONO RASSICURANTE)

**Durante Upload**:
- "Se vuoi, puoi caricare altre foto per aumentare la conoscenza della IA! 📊"
- "Conoscenza attuale: 45% - Man mano che carichi più dati, la IA ti aiuta sempre meglio!"
- "Più la IA sa, più ti aiuta! Ogni foto conta, ma va bene anche così 📈"

**Dopo Upload Parziale**:
- "Ottimo! Hai caricato 3/6 foto (+15% conoscenza). Se vuoi, carica anche le altre per analisi ancora più precisa!"
- "Conoscenza: 60% → 75% (+15%) - Ottimo progresso! Se vuoi, carica le foto mancanti per conoscenza completa"

**Dopo Upload Completo**:
- "🎉 Perfetto! Hai caricato tutte le foto (+30% conoscenza)"
- "Conoscenza: 70% → 100% - Con tutti questi dati, posso darti suggerimenti precisi!"

#### 2.2 Badge e Achievements

**Badge Sistema**:
- 🏆 "Profilazione Completa" - Rosa + Formazione + Coach + Istruzioni
- 📊 "Analista Dedicato" - 20+ partite analizzate
- 📸 "Fotografo Perfetto" - 10+ partite con tutte le foto
- 🎯 "Conoscenza Massima" - 100% conoscenza IA

---

### 3. IMPATTO CONOSCENZA SULL'ANALISI

**Conoscenza < 30%**: Analisi base, consigli generici
**Conoscenza 30-60%**: Analisi con pattern base
**Conoscenza 60-80%**: Analisi con pattern storici
**Conoscenza 80-100%**: Analisi completa, consigli altamente personalizzati

**Prompt AI modificato**:
- Se conoscenza < 50%: "Conoscenza limitata, suggerisci di caricare più dati"
- Se conoscenza >= 80%: "Usa TUTTO lo storico per analisi dettagliata"

---

**⚠️ ENTERPRISE**: Calcolo automatico con trigger, caching Redis, UI reattiva, gamification per engagement

---

---

## 🎥 REAL-TIME COACHING (IMPLEMENTAZIONE FUTURA) - SERVIZIO D'ÉLITE PREMIUM

### 🎯 CONCETTO ✅ **CHIARITO: Conversazionale, Non Screenshot-Based**

**Coaching in diretta durante la partita - La Versione Migliore, Servizio Premium d'Élite**:
- ✅ **CONVERSAZIONALE**: Cliente parla, AI risponde con consigli (non screenshot-based)
- ✅ Cliente attiva "Coach" durante partita
- ✅ Cliente parla: "Sto perdendo il centrocampo, cosa faccio?"
- ✅ AI risponde (voce): "Rinforza il centrocampo, sposta il mediano più indietro..."
- ✅ Conversazione bidirezionale in tempo reale via **GPT-4o Realtime** (la versione migliore)
- ✅ **Valore Premium**: Esperienza unica, coaching professionale in tempo reale
- ✅ **Responsive mobile-first**: Ottimizzato per uso su telefono durante partita

**⭐ FILOSOFIA**: Vogliamo la versione migliore, anche se costosa. I costi verranno monitorati e gestiti, ma la qualità dell'esperienza è prioritaria.

**⚠️ IMPLEMENTAZIONE FUTURA**: Questa feature sarà implementata in una fase successiva, dopo il completamento del sistema base di analisi post-partita. È un servizio d'élite che richiede infrastruttura dedicata e va valorizzato come premium.

**✅ COMPATIBILE**: Real-time coaching conversazionale è compatibile con sistema attuale (non richiede screenshot in tempo reale)

---

### 1. FATTIBILITÀ TECNICA

#### 1.1 Stack Tecnologico

**✅ POSSIBILE** con:
- **GPT-4o Realtime API**: Streaming bidirezionale audio + video
- **Vision in tempo reale**: Telecamera telefono → frame analysis ogni 2-3 secondi
- **WebSocket**: Comunicazione bidirezionale client-server
- **MediaStream API**: Accesso telecamera telefono

**Architettura**:
```
Telefono Cliente → WebSocket → Server Next.js → GPT-4o Realtime API
     ↓                                                      ↓
Frame Video (ogni 2-3s)                            Analisi + Audio Response
     ↓                                                      ↓
     └─────────────────────────────────────────────────────┘
                    Streaming Audio → Telefono
```

#### 1.2 Limitazioni e Requisiti

**Requisiti Cliente**:
- Connessione stabile: **2-5 Mbps upload** richiesto
- Telefono con telecamera funzionante
- Browser supporta MediaStream API (Chrome, Safari, Firefox moderni)

**Limitazioni**:
- **Latency**: 1-3 secondi (accettabile per coaching, non per azioni istantanee)
- **Qualità video**: Dipende da connessione cliente
- **Analisi frame**: Non perfetta come screenshot post-partita (ma sufficiente per suggerimenti)
- **Batteria**: Consumo elevato (streaming video + audio)

**⚠️ REGOLA FONDAMENTALE**:
- **L'IA NON DEVE MAI INVENTARE NULLA**
- **Solo ambito eFootball**: Analisi basata su ciò che vede realmente
- **Suggerimenti basati su**: Formazione visibile, posizionamento giocatori, pattern di gioco riconosciuti

**⭐ VALORIZZAZIONE SERVIZIO D'ÉLITE**:
- **GPT-4o Realtime è un servizio premium** - Va presentato come valore aggiunto esclusivo
- **Pricing premium**: Costo più alto rispetto ad analisi tradizionali (giustificato da valore unico)
- **UX end-to-end**: Esperienza fluida e professionale, senza interruzioni
- **Responsive mobile-first**: Ottimizzato per uso su telefono durante partita
- **Marketing**: "Coaching professionale in diretta", "IA che ti guida in tempo reale"

---

### 2. COSTI STIMATI

#### 2.1 Costi per 10 Minuti di Session

**GPT-4o Realtime API**:
- Streaming audio bidirezionale: ~$0.01-0.02 per minuto
- Processing: ~$0.01 per minuto
- **Totale audio**: ~$0.10-0.20 per 10 minuti

**Vision API** (frame analysis):
- Frame ogni 2-3 secondi: ~200-300 frame in 10 minuti
- Costo per frame: ~$0.0002-0.0003
- **Totale vision**: ~$0.05-0.10 per 10 minuti

**TOTALE STIMATO**: **~$0.15-0.30 per 10 minuti**

**⭐ VERSIONE MIGLIORE - COSTI ACCETTABILI**:
- Usiamo GPT-4o Realtime (la versione migliore) anche se costosa
- Qualità dell'esperienza è prioritaria
- Costi verranno monitorati e gestiti in tempo reale
- Pay-per-use: Fatturare per minuto effettivo di sessione
- Cliente può interrompere in qualsiasi momento
- Credits consumati solo per tempo effettivo

**Monitoraggio Costi**:
- Dashboard real-time costi per utente
- Alert quando costi superano soglia
- Analytics dettagliati per ottimizzazione futura

#### 2.2 Costi Mensili (Stima)

**Scenario**: 100 utenti, 2 sessioni/settimana, 10 minuti/sessione
- Sessioni totali: 100 × 2 × 4 = 800 sessioni/mese
- Minuti totali: 800 × 10 = 8,000 minuti/mese
- Costo: 8,000 × $0.02 = **~$160/mese**

**Margine** (se vendi a $0.50-1.00 per 10 minuti - servizio premium):
- Ricavi: 800 × $0.75 = $600/mese (prezzo premium giustificato)
- Costi: $160/mese
- **Margine**: ~73%

**⭐ STRATEGIA PREZZO PREMIUM**:
- Prezzo più alto giustificato da valore unico (coaching professionale in diretta)
- Cliente paga per esperienza d'élite, non per costi
- Monitoraggio costi per ottimizzazione continua

---

### 3. FUNZIONALITÀ REAL-TIME COACHING

#### 3.1 Cosa Può Fare l'IA

**Analisi in Tempo Reale**:
- Riconosce formazione avversaria visibile
- Identifica pattern di gioco (es. "Stanno attaccando sempre a sinistra")
- Suggerisce contromisure immediate (es. "Rinforza la fascia sinistra")
- Avvisa problemi tattici (es. "Il tuo mediano è troppo alto")

**Limitazioni**:
- ❌ Non può vedere statistiche (solo visivo)
- ❌ Non può vedere voti giocatori (solo posizionamento)
- ✅ Può vedere formazione e movimento giocatori
- ✅ Può suggerire cambi tattici basati su pattern visibili

#### 3.2 Esempi Suggerimenti Real-Time

**Durante Partita**:
- "Vedo che stanno attaccando sempre a sinistra. Sposta il tuo terzino sinistro più indietro"
- "Il tuo centrocampo è troppo largo. Stringi la formazione"
- "Stanno giocando molto in verticale. Usa più passaggi laterali per mantenere possesso"

**⚠️ TONO RASSICURANTE**:
- "Tranquillo, vedo che stanno pressando forte. Adottiamo contromisure..."
- "Capisco la frustrazione - il gameplay è così in questo momento. Proviamo a..."

---

### 4. ARCHITETTURA TECNICA (FUTURA)

#### 4.1 Database Schema

```sql
CREATE TABLE realtime_coach_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dati Sessione
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  
  -- Match Correlato (opzionale)
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  
  -- Dati Analisi
  frames_analyzed INTEGER DEFAULT 0,
  suggestions_given INTEGER DEFAULT 0,
  formation_detected TEXT, -- Formazione avversaria rilevata
  
  -- Costi
  credits_used DECIMAL(10,2) DEFAULT 0,
  cost_usd DECIMAL(10,4) DEFAULT 0,
  
  -- Metadata
  connection_quality TEXT, -- "good", "medium", "poor"
  audio_quality TEXT, -- "good", "medium", "poor"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 4.2 Endpoint API (Futuri) - Versione Migliore

**1. `/api/realtime/start-session`** (POST):
- Inizia sessione real-time
- Verifica credits disponibili
- Crea sessione in database
- Ritorna WebSocket URL
- **Monitoraggio costi**: Inizia tracking costi in tempo reale

**2. WebSocket `/api/realtime/stream`**:
- Riceve frame video dal telefono
- Invia a **GPT-4o Realtime** (versione migliore, nessun compromesso)
- Riceve suggerimenti audio
- Stream audio al telefono
- **Monitoraggio costi**: Aggiorna costi in tempo reale durante sessione
- **UX end-to-end**: Esperienza fluida, responsive mobile-first

**3. `/api/realtime/end-session`** (POST):
- Termina sessione
- Calcola costi finali
- Consuma credits
- Salva dati sessione
- **Analytics**: Salva dati per analisi costi e ottimizzazione

**4. `/api/realtime/cost-dashboard`** (GET):
- Dashboard costi real-time per utente
- Costi per sessione, per giorno, per mese
- Alert se costi superano soglia
- Analytics dettagliati per ottimizzazione

---

### 5. UI REAL-TIME COACHING (FUTURA)

**Pagina**: `/app/realtime-coach/page.jsx`

```
┌─────────────────────────────────────┐
│  [← Indietro]  Real-Time Coach     │
│  ────────────────────────────────  │
│                                     │
│  📹 STREAMING ATTIVO                │
│  ┌─────────────────────────────┐  │
│  │  [Preview Telecamera]        │  │
│  │  Puntando verso schermo...  │  │
│  └─────────────────────────────┘  │
│                                     │
│  🎤 COACH IA                        │
│  ────────────────────────────────  │
│  [Icona Audio Animata]              │
│  "Tranquillo, vedo che stanno       │
│   attaccando sempre a sinistra..."  │
│                                     │
│  💡 SUGGERIMENTI                    │
│  ────────────────────────────────  │
│  • Sposta terzino sinistro          │
│  • Rinforza centrocampo             │
│                                     │
│  ⏱️ TEMPO: 3:45 / 10:00            │
│  💰 COSTO: $0.08                    │
│                                     │
│  [⏹️ Termina Sessione]              │
└─────────────────────────────────────┘
```

---

### 6. ROADMAP IMPLEMENTAZIONE

**Fase 1 (Attuale)**: ✅ Sistema base analisi post-partita
**Fase 2 (Prossima)**: ✅ Contromisure pre-partita
**Fase 3 (Futura)**: ⏳ Real-time coaching

**Prerequisiti Real-Time**:
- ✅ Sistema base funzionante
- ✅ Pay-per-use implementato
- ✅ Conoscenza IA stabile
- ⏳ GPT-4o Realtime API disponibile
- ⏳ Testing con utenti beta

**Timeline Stimata**: 3-6 mesi dopo completamento Fase 2

---

**⚠️ NOTA**: Questa feature sarà implementata solo dopo validazione del sistema base e feedback utenti sulla necessità di coaching real-time. Quando implementata, useremo la versione migliore (GPT-4o Realtime) e monitoreremo i costi per ottimizzazione continua.

**⭐ FILOSOFIA IMPLEMENTAZIONE**:
- **Versione migliore**: GPT-4o Realtime (top tecnologia), anche se costosa
- **Qualità prima di tutto**: Esperienza premium, nessun compromesso
- **Monitoraggio costi**: Dashboard real-time per gestione e ottimizzazione
- **UX end-to-end**: Responsive mobile-first, streaming fluido, feedback immediato
- **Responsive**: Ottimizzato per uso su telefono durante partita

---

**Documento in evoluzione - Modificare insieme durante sviluppo**
