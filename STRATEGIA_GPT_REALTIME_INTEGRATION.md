# 🚀 Strategia Integrazione GPT-Realtime - eFootball Platform

**Data**: 2025-01-12  
**Status**: 📋 Piano Strategico Completo  
**Focus**: Sfruttare GPT-Realtime per foto, statistiche, heat maps, contromisure

---

## 🎯 OBIETTIVO

Trasformare GPT-Realtime nel **cervello centrale** della piattaforma per:
1. **Analisi Screenshot** (giocatori, formazioni, statistiche)
2. **Generazione Heat Maps** da dati partite
3. **Contromisure Tattiche** basate su formazioni avversarie
4. **Coaching in Tempo Reale** durante partite
5. **Analisi Statistiche** avanzate

---

## 📊 ANALISI STATO ATTUALE

### **Cosa c'è OGGI**:

#### 1. Screenshot Processing
- ✅ `process-screenshot` Edge Function (usa Google Vision API)
- ✅ Estrazione dati giocatori da screenshot
- ❌ **NON usa GPT-Realtime** (usa Google Vision OCR)

#### 2. Statistiche
- ✅ Componenti: `MatchHistory`, `PerformanceCharts`, `StatsComparison`
- ✅ `PostMatchStats` component
- ❌ **NON integrati con AI** (solo visualizzazione)

#### 3. Heat Maps
- ❌ **NON esistenti** (solo menzionate in documentazione)

#### 4. Contromisure Avversarie
- ✅ Componenti: `CounterMeasures`, `OpponentAnalysis`, `OpponentFormation2D`
- ❌ **Sono placeholder** (nessuna logica reale)

#### 5. Voice Input
- ✅ `RosaVoiceInput` component
- ❌ **Mock implementation** (non usa GPT-Realtime)

---

## 🧠 ARCHITETTURA GPT-REALTIME

### **Flusso Generale**:

```
Input (Foto/Voce/Testo)
  ↓
GPT-Realtime API
  ↓
Analisi + Estrazione Dati
  ↓
Structured Output (JSON)
  ↓
Frontend Display / Database
```

### **Casi d'Uso Specifici**:

---

## 1. 📸 ANALISI SCREENSHOT CON GPT-REALTIME

### **Caso d'Uso 1.1: Screenshot Profilo Giocatore**

**Input**: Screenshot profilo giocatore eFootball (come nelle immagini: profilo completo con card, statistiche, skills, booster)

**GPT-Realtime Prompt**:
```
Analizza questo screenshot di un profilo giocatore eFootball e estrai TUTTI i dati visibili:

**SEZIONE 1: Player Card (Left Panel)**
- Overall rating e tipo carta (es. "99 ESA", "Epico")
- Nome giocatore completo
- Team/Club e stagione (es. "FC Barcelona 05-06")
- Tipo di carta (Epico, Leggendario, etc.)
- Partite giocate, Gol, Assist
- Nazionalità/Regione
- Stelle/rarità (numero stelle visibili)

**SEZIONE 2: Dati Base (Top Section)**
- Nome giocatore
- Ruolo/Stile (es. "Ala prolifica")
- Altezza (cm)
- Peso (kg)
- Età
- Valutazione (A, B, C, etc.)
- Piede preferito (Destro/Sinistro)
- Livello attuale / Livello massimo
- Punti progresso

**SEZIONE 3: Statistiche Complete (Central Panel)**
- **Attacco**: Comportamento offensivo, Controllo palla, Dribbling, Possesso stretto, Passaggio rasoterra, Passaggio alto, Finalizzazione, Colpo di testa, Calci da fermo, Tiro a giro
- **Difesa**: Comportamento difensivo, Contrasto, Aggressività, Coinvolgimento difensivo, tutte le stat PT (portiere)
- **Forza**: Velocità, Accelerazione, Potenza di tiro, Salto, Contatto fisico, Controllo corpo, Resistenza
- **Caratteristiche**: Frequenza piede debole, Precisione piede debole, Forma, Resistenza infortuni
- **Indicatori boost**: Identifica quali stat hanno il punto verde (boost attivo)

**SEZIONE 4: Skills e Abilità**
- **Abilità giocatore**: Lista completa (es. Finta doppio passo, Doppio tocco, Elastico, etc.)
- **Abilità aggiuntive**: Lista completa (es. Colpo di testa, Passaggio a scavalcare, etc.)
- **Competenza posizione aggiuntiva**: Posizioni alternative (es. CLD, EDA)

**SEZIONE 5: Booster Attivi**
- **Booster 1**: Nome, Effetto (+1, +2, etc.), Descrizione completa, Condizione di attivazione
- **Booster 2**: (se presente) Nome, Effetto, Descrizione, Condizione
- Identifica quali statistiche sono boostate da ogni booster

**SEZIONE 6: Visualizzazioni**
- **Radar Chart**: Estrai i 6 valori (TIR, DRI, PAS, FRZ, VEL, DIF) se visibile
- **Position Map**: Identifica le posizioni evidenziate sul campo (zone verdi)

**SEZIONE 7: Stili di Gioco IA**
- Lista completa stili IA (es. Funambolo, Serpentina, etc.)

Per ogni campo, indica:
- value: valore estratto (o null se non visibile)
- status: "certain" | "uncertain" | "missing"
- confidence: 0.0-1.0

Rispondi in JSON strutturato completo.
```

**Output Esempio (basato su screenshot Ronaldinho)**:
```json
{
  "player_card": {
    "overall_rating": { "value": "99 ESA", "status": "certain", "confidence": 0.98 },
    "player_name": { "value": "Ronaldinho Gaúcho", "status": "certain", "confidence": 0.99 },
    "team_season": { "value": "FC Barcelona 05-06", "status": "certain", "confidence": 0.95 },
    "card_type": { "value": "Epico", "status": "certain", "confidence": 0.95 },
    "matches_played": { "value": 204, "status": "certain", "confidence": 0.90 },
    "goals": { "value": 86, "status": "certain", "confidence": 0.90 },
    "assists": { "value": 37, "status": "certain", "confidence": 0.90 },
    "rarity_stars": { "value": 5, "status": "certain", "confidence": 0.95 }
  },
  "basic_info": {
    "role": { "value": "Ala prolifica", "status": "certain", "confidence": 0.95 },
    "height": { "value": 182, "status": "certain", "confidence": 0.95 },
    "weight": { "value": 80, "status": "certain", "confidence": 0.95 },
    "age": { "value": 26, "status": "certain", "confidence": 0.95 },
    "evaluation": { "value": "B", "status": "certain", "confidence": 0.90 },
    "preferred_foot": { "value": "Destro", "status": "certain", "confidence": 0.95 },
    "current_level": { "value": 31, "status": "certain", "confidence": 0.95 },
    "max_level": { "value": 31, "status": "certain", "confidence": 0.95 },
    "progress_points": { "value": 0, "status": "certain", "confidence": 0.95 }
  },
  "stats": {
    "attacking": {
      "offensive_awareness": { "value": 74, "status": "certain", "confidence": 0.95 },
      "ball_control": { "value": 93, "status": "certain", "confidence": 0.95, "boosted": true },
      "dribbling": { "value": 94, "status": "certain", "confidence": 0.95, "boosted": true },
      "tight_possession": { "value": 94, "status": "certain", "confidence": 0.95, "boosted": true },
      "low_pass": { "value": 87, "status": "certain", "confidence": 0.95 },
      "lofted_pass": { "value": 80, "status": "certain", "confidence": 0.95 },
      "finishing": { "value": 82, "status": "certain", "confidence": 0.95, "boosted": true },
      "heading": { "value": 61, "status": "certain", "confidence": 0.90 },
      "set_piece_taking": { "value": 76, "status": "certain", "confidence": 0.90 },
      "curl": { "value": 82, "status": "certain", "confidence": 0.90 }
    },
    "defending": {
      "defensive_awareness": { "value": 42, "status": "certain", "confidence": 0.95 },
      "tackling": { "value": 44, "status": "certain", "confidence": 0.95 },
      "aggression": { "value": 45, "status": "certain", "confidence": 0.95 },
      "defensive_engagement": { "value": 44, "status": "certain", "confidence": 0.95 }
    },
    "athleticism": {
      "speed": { "value": 90, "status": "certain", "confidence": 0.95, "boosted": true },
      "acceleration": { "value": 88, "status": "certain", "confidence": 0.95 },
      "kicking_power": { "value": 87, "status": "certain", "confidence": 0.95 },
      "jump": { "value": 61, "status": "certain", "confidence": 0.90 },
      "physical_contact": { "value": 80, "status": "certain", "confidence": 0.95 },
      "body_control": { "value": 86, "status": "certain", "confidence": 0.95, "boosted": true },
      "stamina": { "value": 85, "status": "certain", "confidence": 0.95 }
    },
    "characteristics": {
      "weak_foot_frequency": { "value": "Raramente", "status": "certain", "confidence": 0.90 },
      "weak_foot_accuracy": { "value": "Alta", "status": "certain", "confidence": 0.90 },
      "form": { "value": "Incrollabile", "status": "certain", "confidence": 0.90 },
      "injury_resistance": { "value": "Media", "status": "certain", "confidence": 0.90 }
    }
  },
  "skills": {
    "player_skills": {
      "value": [
        "Finta doppio passo",
        "Doppio tocco",
        "Elastico",
        "Sombrero",
        "Controllo di suola",
        "Dribbling fulminei",
        "A giro da distante",
        "Passaggio di prima",
        "Esterno a giro",
        "No-look"
      ],
      "status": "certain",
      "confidence": 0.90
    },
    "additional_skills": {
      "value": [
        "Colpo di testa",
        "Passaggio a scavalcare",
        "Tiro di prima",
        "Dominio palle alte",
        "Pallonetto mirato"
      ],
      "status": "certain",
      "confidence": 0.90
    },
    "additional_positions": {
      "value": ["CLD", "EDA"],
      "status": "certain",
      "confidence": 0.85
    }
  },
  "boosters": [
    {
      "name": { "value": "Fantasista", "status": "certain", "confidence": 0.95 },
      "effect": { "value": "+2", "status": "certain", "confidence": 0.95 },
      "description": { "value": "+2 alle Statistiche giocatore Controllo palla, Dribbling, Finalizzazione e Controllo corpo", "status": "certain", "confidence": 0.90 },
      "activation_condition": { "value": "Questo Booster è sempre attivo", "status": "certain", "confidence": 0.95 },
      "affected_stats": { "value": ["ball_control", "dribbling", "finishing", "body_control"], "status": "certain", "confidence": 0.90 }
    },
    {
      "name": { "value": "Gestione del pallone", "status": "certain", "confidence": 0.95 },
      "effect": { "value": "+1", "status": "certain", "confidence": 0.95 },
      "description": { "value": "+1 alle Statistiche giocatore Dribbling, Possesso stretto, Velocità e Controllo corpo", "status": "certain", "confidence": 0.90 },
      "activation_condition": { "value": "Questo Booster è sempre attivo", "status": "certain", "confidence": 0.95 },
      "affected_stats": { "value": ["dribbling", "tight_possession", "speed", "body_control"], "status": "certain", "confidence": 0.90 }
    }
  ],
  "visualizations": {
    "radar_chart": {
      "TIR": { "value": 85, "status": "certain", "confidence": 0.85 },
      "DRI": { "value": 94, "status": "certain", "confidence": 0.85 },
      "PAS": { "value": 87, "status": "certain", "confidence": 0.85 },
      "FRZ": { "value": 75, "status": "certain", "confidence": 0.85 },
      "VEL": { "value": 90, "status": "certain", "confidence": 0.85 },
      "DIF": { "value": 42, "status": "certain", "confidence": 0.85 }
    },
    "position_map": {
      "preferred_positions": { "value": ["LWF", "AMF", "CF"], "status": "certain", "confidence": 0.80 }
    }
  },
  "ai_playstyles": {
    "value": ["Funambolo", "Serpentina"],
    "status": "certain",
    "confidence": 0.90
  }
}
```

**Implementazione**:
- **Edge Function**: `supabase/functions/process-screenshot-gpt/index.ts`
- **Frontend**: Modificare `ScreenshotUpload.jsx` per usare nuova function
- **Vantaggio**: GPT-Realtime capisce contesto meglio di OCR puro

---

### **Caso d'Uso 1.2: Screenshot Formazione Avversaria**

**Input**: Screenshot formazione avversaria durante partita

**GPT-Realtime Prompt**:
```
Analizza questa formazione avversaria e identifica:
- Formazione (es. 4-3-3, 4-4-2, etc.)
- Giocatori in campo (nomi e posizioni)
- Stile di gioco visibile (Pressing, Possession, Counter Attack, etc.)
- Punti di forza della formazione
- Vulnerabilità tattiche

Genera anche suggerimenti per contromisure.
```

**Output**:
```json
{
  "formation": { "value": "4-3-3", "status": "certain", "confidence": 0.95 },
  "players": [
    { "name": "Messi", "position": "RWF", "rating": 97 },
    { "name": "Ronaldo", "position": "CF", "rating": 95 }
  ],
  "tactical_style": { "value": "Possession Game", "status": "certain", "confidence": 0.88 },
  "strengths": ["Attacco potente", "Velocità sulle fasce"],
  "weaknesses": ["Difesa centrale debole", "Poca copertura centrocampo"],
  "countermeasures": [
    "Usa contropiede veloce",
    "Sfrutta le fasce laterali",
    "Pressing alto sul centrocampo avversario"
  ]
}
```

**Implementazione**:
- **Edge Function**: `supabase/functions/analyze-opponent-formation-gpt/index.ts`
- **Frontend**: Integrare in `OpponentFormation2D.jsx`
- **Database**: Salvare in `opponent_formations` table

---

### **Caso d'Uso 1.3: Screenshot Statistiche Partita**

**Input**: Screenshot statistiche post-partita

**GPT-Realtime Prompt**:
```
Analizza queste statistiche partita e estrai:
- Possesso palla (%)
- Tiri totali e in porta
- Passaggi completati
- Contrasti vinti
- Falli commessi
- Eventi chiave (gol, assist, cartellini)

Genera anche un'analisi delle performance e suggerimenti di miglioramento.
```

**Output**:
```json
{
  "possession": { "value": 45, "status": "certain", "confidence": 0.95 },
  "shots": { "total": 8, "on_target": 5, "status": "certain", "confidence": 0.92 },
  "passes": { "completed": 234, "total": 280, "status": "certain", "confidence": 0.90 },
  "analysis": {
    "strengths": ["Buona precisione tiri", "Passaggi efficaci"],
    "weaknesses": ["Poco possesso palla", "Difesa passiva"],
    "suggestions": [
      "Migliora costruzione dal basso",
      "Aumenta pressing in fase difensiva"
    ]
  }
}
```

**Implementazione**:
- **Edge Function**: `supabase/functions/analyze-match-stats-gpt/index.ts`
- **Frontend**: Integrare in `PostMatchStats.jsx`
- **Database**: Salvare in `match_statistics` table

---

### **Caso d'Uso 1.3b: Screenshot Heat Maps Partita (Aree di Recupero/Attacco)**

**Input**: Screenshot heat maps post-partita (es. "Aree di recupero palla", "Aree di attacco")

**GPT-Realtime Prompt**:
```
Analizza questo screenshot di heat maps post-partita e estrai:

**SEZIONE 1: Titolo e Contesto**
- Tipo heat map (es. "Aree di recupero palla", "Aree di attacco", "Aree di difesa")
- Nome squadra 1 e logo
- Nome squadra 2 e logo
- Risultato partita (score, es. "6-1")
- Tempo partita (es. "Tempi regolamentari")

**SEZIONE 2: Heat Map Squadra 1 (Sinistra)**
- Tipo diagramma campo (mezzo campo, campo completo, zona specifica)
- Distribuzione punti/zone:
  - Se "Aree di recupero palla": Posizioni punti verdi (coordinate x,y per ogni punto)
  - Se "Aree di attacco": Percentuali per zone (sinistra, centro, destra)
  - Intensità per zona (densità punti o percentuale)
- Pattern visibili (zone più dense, zone vuote)

**SEZIONE 3: Heat Map Squadra 2 (Destra)**
- Stesso formato squadra 1
- Confronto con squadra 1

**SEZIONE 4: Analisi Tattica**
- Direzione d'attacco (freccia o indicazione)
- Zone dominanti per ogni squadra
- Pattern tattici identificabili

Per ogni dato, indica:
- value: valore estratto
- status: "certain" | "uncertain" | "missing"
- confidence: 0.0-1.0

Rispondi in JSON strutturato.
```

**Output Esempio (Aree di Attacco)**:
```json
{
  "match_info": {
    "team_1": { "name": "GONDİKLENDİNİZZZ", "logo": "Orange County SC", "status": "certain", "confidence": 0.95 },
    "team_2": { "name": "Naturalborngamers.it", "logo": "AC Milan", "status": "certain", "confidence": 0.95 },
    "score": { "value": "6-1", "status": "certain", "confidence": 0.98 },
    "time": { "value": "Tempi regolamentari", "status": "certain", "confidence": 0.95 }
  },
  "heatmap_type": { "value": "Aree di attacco", "status": "certain", "confidence": 0.95 },
  "team_1_heatmap": {
    "zones": [
      { "zone": "sinistra", "percentage": 46, "highlighted": true, "status": "certain", "confidence": 0.95 },
      { "zone": "centro", "percentage": 45, "highlighted": false, "status": "certain", "confidence": 0.95 },
      { "zone": "destra", "percentage": 9, "highlighted": false, "status": "certain", "confidence": 0.95 }
    ],
    "attack_direction": { "value": "upward", "status": "certain", "confidence": 0.90 }
  },
  "team_2_heatmap": {
    "zones": [
      { "zone": "sinistra", "percentage": 19, "highlighted": false, "status": "certain", "confidence": 0.95 },
      { "zone": "centro", "percentage": 64, "highlighted": true, "status": "certain", "confidence": 0.95 },
      { "zone": "destra", "percentage": 17, "highlighted": false, "status": "certain", "confidence": 0.95 }
    ],
    "attack_direction": { "value": "upward", "status": "certain", "confidence": 0.90 }
  },
  "tactical_analysis": {
    "team_1_pattern": { "value": "Attacco prevalentemente da sinistra (46%)", "status": "certain", "confidence": 0.90 },
    "team_2_pattern": { "value": "Attacco centralizzato (64% centro)", "status": "certain", "confidence": 0.90 },
    "insights": [
      "Squadra 1 attacca principalmente da sinistra",
      "Squadra 2 preferisce costruzione centrale",
      "Squadra 1 ha distribuzione più bilanciata"
    ]
  }
}
```

**Output Esempio (Aree di Recupero Palla)**:
```json
{
  "heatmap_type": { "value": "Aree di recupero palla", "status": "certain", "confidence": 0.95 },
  "team_1_heatmap": {
    "recovery_points": [
      { "x": 25, "y": 40, "intensity": "high", "status": "certain", "confidence": 0.85 },
      { "x": 30, "y": 45, "intensity": "medium", "status": "certain", "confidence": 0.85 },
      { "x": 35, "y": 50, "intensity": "high", "status": "certain", "confidence": 0.85 }
    ],
    "density_zones": [
      { "zone": "centrocampo", "density": "high", "recovery_count": 45, "status": "certain", "confidence": 0.85 },
      { "zone": "difesa", "density": "medium", "recovery_count": 32, "status": "certain", "confidence": 0.85 }
    ]
  },
  "team_2_heatmap": {
    "recovery_points": [
      { "x": 70, "y": 40, "intensity": "medium", "status": "certain", "confidence": 0.85 },
      { "x": 75, "y": 45, "intensity": "high", "status": "certain", "confidence": 0.85 }
    ],
    "density_zones": [
      { "zone": "centrocampo", "density": "medium", "recovery_count": 38, "status": "certain", "confidence": 0.85 },
      { "zone": "attacco", "density": "low", "recovery_count": 15, "status": "certain", "confidence": 0.85 }
    ]
  }
}
```

**Implementazione**:
- **Edge Function**: `supabase/functions/analyze-heatmap-screenshot-gpt/index.ts`
- **Frontend**: Nuovo componente `HeatMapScreenshotUpload.jsx`
- **Database**: Salvare in `heat_maps` table (aggiungere campo `heatmap_type`)

---

### **Caso d'Uso 1.6: Screenshot Grafici/Statistiche Già Esistenti**

**Input**: Screenshot di grafici/statistiche già visualizzati nel gioco (es. grafici performance, heat maps, statistiche avanzate)

**GPT-Realtime Prompt**:
```
Analizza questo screenshot di un grafico/statistica da eFootball e estrai tutti i dati visibili:

Se è un grafico:
- Tipo di grafico (bar chart, line chart, radar chart, heat map, etc.)
- Assi e valori (asse X, asse Y, scale)
- Dati numerici per ogni elemento del grafico
- Legende e etichette
- Colori e pattern (se significativi)

Se è una tabella statistiche:
- Intestazioni colonne
- Righe dati con tutti i valori
- Totali/somme se presenti
- Percentuali se presenti

Se è una heat map:
- Zone del campo
- Intensità per ogni zona
- Legenda colori
- Pattern visibili

Per ogni dato estratto, indica:
- value: valore estratto
- status: "certain" | "uncertain" | "missing"
- confidence: 0.0-1.0

Rispondi in JSON strutturato con struttura dati che riflette il tipo di grafico.
```

**Output Esempio (Grafico Performance)**:
```json
{
  "chart_type": { "value": "bar_chart", "status": "certain", "confidence": 0.95 },
  "title": { "value": "Performance Giocatori", "status": "certain", "confidence": 0.90 },
  "axis_x": { "value": "Giocatori", "status": "certain", "confidence": 0.95 },
  "axis_y": { "value": "Rating", "status": "certain", "confidence": 0.95 },
  "data_points": [
    { "player": "Mbappé", "value": 98, "status": "certain", "confidence": 0.95 },
    { "player": "Messi", "value": 97, "status": "certain", "confidence": 0.95 },
    { "player": "Ronaldo", "value": 95, "status": "uncertain", "confidence": 0.75 }
  ],
  "scale": { "min": 0, "max": 100, "status": "certain", "confidence": 0.90 }
}
```

**Output Esempio (Heat Map)**:
```json
{
  "chart_type": { "value": "heat_map", "status": "certain", "confidence": 0.95 },
  "title": { "value": "Heat Map Campo", "status": "certain", "confidence": 0.90 },
  "field_zones": [
    { "x": 5, "y": 10, "intensity": 85, "color": "red", "status": "certain", "confidence": 0.90 },
    { "x": 8, "y": 12, "intensity": 60, "color": "yellow", "status": "certain", "confidence": 0.88 },
    { "x": 15, "y": 8, "intensity": 30, "color": "blue", "status": "uncertain", "confidence": 0.70 }
  ],
  "legend": {
    "red": { "meaning": "Alta intensità", "range": "80-100" },
    "yellow": { "meaning": "Media intensità", "range": "50-79" },
    "blue": { "meaning": "Bassa intensità", "range": "0-49" }
  }
}
```

**Implementazione**:
- **Edge Function**: `supabase/functions/analyze-chart-screenshot-gpt/index.ts`
- **Frontend**: Nuovo componente `ChartScreenshotUpload.jsx`
- **Database**: Salvare in `chart_data` table (da creare)
- **Use Case**: Utente carica screenshot di grafici esistenti nel gioco per importarli automaticamente

---

### **Caso d'Uso 1.4: Screenshot Formazione Squadra**

**Input**: Screenshot formazione squadra completa con player cards

**GPT-Realtime Prompt**:
```
Analizza questo screenshot di formazione squadra e estrai:

**SEZIONE 1: Informazioni Squadra**
- Nome squadra
- Formazione tattica (es. "4-2-1-3", "4-3-3", etc.)
- Forza complessiva (numero totale, es. 3245)
- Stile di gioco (es. "Contrattacco", "Possession Game", etc.)

**SEZIONE 2: Giocatori in Campo (11 giocatori)**
Per ogni giocatore visibile:
- Numero maglia
- Nome completo
- Rating overall (numero grande sulla card)
- Posizione principale (abbreviazione, es. P, SP, TRQ, CC, MED, TS, DC, PT)
- Posizione sul campo (coordinate x,y o posizione relativa nella formazione)
- Nazionalità (bandiera se visibile)
- Club (logo se visibile)
- Tipo carta (Epico, Leggendario, etc. se visibile)

**SEZIONE 3: Dettagli Giocatore Selezionato (se presente)**
- Nome completo
- Rating e tipo carta (es. "97 CLD")
- Stelle/rarità
- Altri dettagli visibili nel panel destro

**SEZIONE 4: Panel Sinistra (se visibile)**
- Opzioni menu (es. "Tattiche", "Squadra", "Sostituti", "Riserve")

Per ogni dato, indica:
- value: valore estratto
- status: "certain" | "uncertain" | "missing"
- confidence: 0.0-1.0

Rispondi in JSON strutturato.
```

**Output Esempio**:
```json
{
  "team_info": {
    "name": { "value": "CORINTHIANS S.C. PAULISTA", "status": "certain", "confidence": 0.95 },
    "formation": { "value": "4-2-1-3", "status": "certain", "confidence": 0.90 },
    "overall_strength": { "value": 3245, "status": "certain", "confidence": 0.95 },
    "tactical_style": { "value": "Contrattacco", "status": "certain", "confidence": 0.90 }
  },
  "players": [
    {
      "jersey_number": { "value": null, "status": "missing", "confidence": 0.0 },
      "name": { "value": "Vinícius Júnior", "status": "certain", "confidence": 0.95 },
      "rating": { "value": 105, "status": "certain", "confidence": 0.95 },
      "position": { "value": "P", "status": "certain", "confidence": 0.90 },
      "field_position": { "x": 85, "y": 30, "role": "attacker_left", "status": "certain", "confidence": 0.85 },
      "nationality": { "value": "Brazil", "status": "certain", "confidence": 0.90 },
      "club": { "value": "Real Madrid", "status": "certain", "confidence": 0.90 }
    },
    {
      "jersey_number": { "value": null, "status": "missing", "confidence": 0.0 },
      "name": { "value": "Samuel Eto'o", "status": "certain", "confidence": 0.95 },
      "rating": { "value": 104, "status": "certain", "confidence": 0.95 },
      "position": { "value": "SP", "status": "certain", "confidence": 0.90 },
      "field_position": { "x": 85, "y": 50, "role": "attacker_center", "status": "certain", "confidence": 0.85 },
      "club": { "value": "Inter Milan", "status": "certain", "confidence": 0.90 },
      "selected": { "value": true, "status": "certain", "confidence": 0.95 }
    },
    {
      "jersey_number": { "value": null, "status": "missing", "confidence": 0.0 },
      "name": { "value": "Gianluigi Buffon", "status": "certain", "confidence": 0.95 },
      "rating": { "value": 105, "status": "certain", "confidence": 0.95 },
      "position": { "value": "PT", "status": "certain", "confidence": 0.90 },
      "field_position": { "x": 50, "y": 90, "role": "goalkeeper", "status": "certain", "confidence": 0.85 },
      "club": { "value": "Juventus", "status": "certain", "confidence": 0.90 }
    }
  ],
  "selected_player": {
    "name": { "value": "Samuel Eto'o", "status": "certain", "confidence": 0.95 },
    "rating_card": { "value": "97 CLD", "status": "certain", "confidence": 0.90 },
    "rarity_stars": { "value": 5, "status": "certain", "confidence": 0.90 }
  },
  "sidebar_options": {
    "visible": { "value": true, "status": "certain", "confidence": 0.95 },
    "options": [
      { "value": "Tattiche", "status": "certain", "confidence": 0.95 },
      { "value": "Squadra", "status": "certain", "confidence": 0.95 },
      { "value": "Sostituti", "status": "certain", "confidence": 0.95 },
      { "value": "Riserve", "status": "certain", "confidence": 0.95 }
    ]
  }
}
```

**Implementazione**:
- **Edge Function**: `supabase/functions/analyze-squad-formation-gpt/index.ts`
- **Frontend**: Nuovo componente `SquadFormationScreenshotUpload.jsx`
- **Database**: Salvare in `user_rosa` table (aggiungere campo `screenshot_formation`)

---

### **Caso d'Uso 1.5: Screenshot Voti/Rating Giocatori (Pagelle Post-Partita)**

**Input**: Screenshot con voti/rating dei giocatori post-partita (es. "Pagelle giocatori" con lista completa)

**GPT-Realtime Prompt**:
```
Analizza questo screenshot "Pagelle giocatori" post-partita e estrai:

**SEZIONE 1: Informazioni Partita**
- Nome squadra 1 e logo
- Nome squadra 2 e logo
- Risultato partita (score, es. "6-1")
- Tempo partita (es. "Tempi regolamentari")

**SEZIONE 2: Voti Squadra 1 (Colonna Sinistra)**
Per ogni giocatore visibile:
- Numero maglia
- Nome completo
- Voto/Rating (numero, es. 6.5, 8.5, 7.0)
- Indicatori speciali (es. stella per top performer, icone)
- Posizione in campo (se inferibile dal numero o nome)

**SEZIONE 3: Voti Squadra 2 (Colonna Destra)**
Stesso formato squadra 1

**SEZIONE 4: Analisi Voti**
- Top performer (giocatore con voto più alto e stella)
- Media voti per squadra
- Distribuzione voti (quanti giocatori per fascia di voto)
- Pattern (es. difesa peggio, attacco meglio)

**SEZIONE 5: Controlli Visibili**
- Bottone "Grafico rete" (se presente)
- Paginazione (se presente)

Per ogni dato, indica:
- value: valore estratto
- status: "certain" | "uncertain" | "missing"
- confidence: 0.0-1.0

Rispondi in JSON strutturato.
```

**Output Esempio (basato su screenshot)**:
```json
{
  "match_info": {
    "team_1": { "name": "GONDİKLENDİNİZZZ", "logo": "Orange County SC", "status": "certain", "confidence": 0.95 },
    "team_2": { "name": "Naturalborngamers.it", "logo": "AC Milan", "status": "certain", "confidence": 0.95 },
    "score": { "value": "6-1", "status": "certain", "confidence": 0.98 },
    "time": { "value": "Tempi regolamentari", "status": "certain", "confidence": 0.95 }
  },
  "team_1_ratings": [
    {
      "jersey_number": { "value": 12, "status": "certain", "confidence": 0.95 },
      "player_name": { "value": "Petr Čech", "status": "certain", "confidence": 0.95 },
      "rating": { "value": 6.5, "status": "certain", "confidence": 0.95 },
      "is_top_performer": { "value": false, "status": "certain", "confidence": 0.95 },
      "position": { "value": "GK", "status": "inferred", "confidence": 0.70 }
    },
    {
      "jersey_number": { "value": 8, "status": "certain", "confidence": 0.95 },
      "player_name": { "value": "Alessandro Del Piero", "status": "certain", "confidence": 0.95 },
      "rating": { "value": 8.5, "status": "certain", "confidence": 0.95 },
      "is_top_performer": { "value": true, "status": "certain", "confidence": 0.95 },
      "position": { "value": "AMF", "status": "inferred", "confidence": 0.70 }
    },
    {
      "jersey_number": { "value": 20, "status": "certain", "confidence": 0.95 },
      "player_name": { "value": "Cristiano Ronaldo", "status": "certain", "confidence": 0.95 },
      "rating": { "value": 7.0, "status": "certain", "confidence": 0.95 },
      "is_top_performer": { "value": false, "status": "certain", "confidence": 0.95 },
      "position": { "value": "LWF", "status": "inferred", "confidence": 0.70 }
    }
  ],
  "team_2_ratings": [
    {
      "jersey_number": { "value": 99, "status": "certain", "confidence": 0.95 },
      "player_name": { "value": "Gianluigi Donnarumma", "status": "certain", "confidence": 0.95 },
      "rating": { "value": 5.5, "status": "certain", "confidence": 0.95 },
      "is_top_performer": { "value": false, "status": "certain", "confidence": 0.95 },
      "position": { "value": "GK", "status": "inferred", "confidence": 0.70 }
    },
    {
      "jersey_number": { "value": 9, "status": "certain", "confidence": 0.95 },
      "player_name": { "value": "Ronaldinho Gaúcho", "status": "certain", "confidence": 0.95 },
      "rating": { "value": 5.0, "status": "certain", "confidence": 0.95 },
      "is_top_performer": { "value": false, "status": "certain", "confidence": 0.95 },
      "position": { "value": "AMF", "status": "inferred", "confidence": 0.70 }
    }
  ],
  "rating_analysis": {
    "team_1_average": { "value": 6.5, "status": "calculated", "confidence": 0.90 },
    "team_2_average": { "value": 5.8, "status": "calculated", "confidence": 0.90 },
    "top_performer": {
      "player": { "value": "Alessandro Del Piero", "status": "certain", "confidence": 0.95 },
      "rating": { "value": 8.5, "status": "certain", "confidence": 0.95 },
      "team": { "value": "GONDİKLENDİNİZZZ", "status": "certain", "confidence": 0.95 }
    },
    "rating_distribution": {
      "team_1": {
        "8.0-9.0": { "count": 1, "status": "certain", "confidence": 0.90 },
        "7.0-7.9": { "count": 1, "status": "certain", "confidence": 0.90 },
        "6.0-6.9": { "count": 8, "status": "certain", "confidence": 0.90 },
        "5.0-5.9": { "count": 1, "status": "certain", "confidence": 0.90 }
      }
    },
    "insights": [
      "Squadra 1 ha media voti superiore (6.5 vs 5.8)",
      "Alessandro Del Piero top performer con 8.5",
      "Squadra 2 ha più giocatori sotto 6.0"
    ]
  },
  "controls": {
    "graph_rete_button": { "visible": true, "status": "certain", "confidence": 0.95 },
    "pagination": { "visible": true, "current_page": 1, "total_pages": 5, "status": "certain", "confidence": 0.85 }
  }
}
```

**Implementazione**:
- **Edge Function**: `supabase/functions/analyze-player-ratings-gpt/index.ts`
- **Frontend**: Nuovo componente `PlayerRatingsUpload.jsx` o integrare in `PostMatchStats.jsx`
- **Database**: Salvare in `player_match_ratings` table (da creare)
- **Use Case**: Utente carica screenshot "Pagelle giocatori" post-partita per salvare automaticamente tutti i voti

---

## 📊 RIEPILOGO CASI D'USO SCREENSHOT CON GPT-REALTIME

### **Casi d'Uso Implementati**:

1. **Caso 1.1**: Screenshot Profilo Giocatore
   - **Input**: Screenshot completo profilo (card, stats, skills, booster, radar, position map)
   - **Output**: Dati completi con confidence per ogni campo
   - **Use Case**: Estrazione dati giocatore da profilo completo

2. **Caso 1.2**: Screenshot Formazione Avversaria
   - **Input**: Screenshot formazione avversaria durante partita
   - **Output**: Formazione, giocatori, stile, contromisure
   - **Use Case**: Analisi tattica avversario + generazione contromisure

3. **Caso 1.3**: Screenshot Statistiche Partita
   - **Input**: Screenshot statistiche post-partita
   - **Output**: Possesso, tiri, passaggi, analisi performance
   - **Use Case**: Estrazione dati statistici partita

4. **Caso 1.3b**: Screenshot Heat Maps Partita
   - **Input**: Screenshot "Aree di recupero palla" / "Aree di attacco"
   - **Output**: Coordinate punti, percentuali zone, pattern tattici
   - **Use Case**: Analisi tattica basata su heat maps visuali

5. **Caso 1.4**: Screenshot Formazione Squadra
   - **Input**: Screenshot formazione completa con 11 player cards
   - **Output**: Squadra completa, formazione, forza complessiva, giocatori
   - **Use Case**: Import rapido formazione squadra completa

6. **Caso 1.5**: Screenshot Voti/Rating Giocatori
   - **Input**: Screenshot "Pagelle giocatori" post-partita
   - **Output**: Lista completa voti per squadra, top performer, analisi
   - **Use Case**: Salvataggio automatico voti post-partita

7. **Caso 1.6**: Screenshot Grafici/Statistiche Esistenti
   - **Input**: Screenshot grafici/statistiche già visualizzati nel gioco
   - **Output**: Dati numerici estratti da grafici/tabelle
   - **Use Case**: Import automatico dati da grafici esistenti

### **Coverage Completo**:
✅ **Profili Giocatori**: Completo (card, stats, skills, booster, visualizzazioni)
✅ **Formazioni**: Completo (avversarie e proprie)
✅ **Statistiche**: Completo (partita, voti, grafici)
✅ **Heat Maps**: Completo (recupero, attacco, pattern)
✅ **Analisi Tattica**: Completo (contromisure, pattern)

---

## 2. 📊 GENERAZIONE HEAT MAPS CON GPT-REALTIME

### **Caso d'Uso 2.1: Heat Map da Dati Partita**

**Input**: Dati partita (posizioni giocatori, eventi, zone campo)

**GPT-Realtime Prompt**:
```
Genera una heat map del campo da calcio basata su questi dati partita:
- Posizioni medie giocatori durante partita
- Zone dove si sono verificati più eventi (tiri, passaggi, contrasti)
- Zone di pressione
- Zone di costruzione gioco

Genera coordinate per visualizzazione SVG/Canvas:
- Per ogni zona (grid 20x20), indica intensità (0-100)
- Colori: rosso (alta intensità), giallo (media), blu (bassa)
```

**Output**:
```json
{
  "heatmap_data": {
    "type": "player_positions",
    "grid_size": 20,
    "zones": [
      { "x": 5, "y": 10, "intensity": 85, "color": "red" },
      { "x": 8, "y": 12, "intensity": 60, "color": "yellow" },
      { "x": 15, "y": 8, "intensity": 30, "color": "blue" }
    ]
  },
  "insights": [
    "Gioco concentrato in zona centrale",
    "Poca copertura laterale destra",
    "Alta pressione in area avversaria"
  ]
}
```

**Implementazione**:
- **Componente**: `components/analisi/HeatMapVisualization.jsx` (NUOVO)
- **Edge Function**: `supabase/functions/generate-heatmap-gpt/index.ts`
- **Libreria**: Usare `react-heatmap-grid` o SVG custom
- **Data Source**: `match_positions` table (da creare)

---

### **Caso d'Uso 2.2: Heat Map Tattica (Zone di Gioco)**

**Input**: Formazione + statistiche partita

**GPT-Realtime Prompt**:
```
Analizza questa formazione e statistiche per generare heat map tattica:
- Zone dove la squadra costruisce gioco
- Zone di pressing
- Zone di vulnerabilità difensiva
- Zone di attacco preferite

Genera anche suggerimenti tattici basati sulla heat map.
```

**Output**:
```json
{
  "tactical_heatmap": {
    "build_up_zones": [{ "x": 2, "y": 10, "intensity": 90 }],
    "pressing_zones": [{ "x": 12, "y": 8, "intensity": 75 }],
    "weak_zones": [{ "x": 6, "y": 15, "intensity": 40 }],
    "attack_zones": [{ "x": 18, "y": 10, "intensity": 85 }]
  },
  "tactical_insights": [
    "Costruzione troppo centralizzata",
    "Pressing efficace in zona alta",
    "Vulnerabilità sulle fasce laterali"
  ]
}
```

**Implementazione**:
- **Componente**: `components/analisi/TacticalHeatMap.jsx` (NUOVO)
- Integrare in `DashboardPage` o `StatistichePage`

---

## 3. ⚔️ CONTROMISURE AVVERSARIE CON GPT-REALTIME

### **Caso d'Uso 3.1: Analisi Formazione Avversaria + Contromisure**

**Input**: Formazione avversaria (screenshot o manuale) + Rosa utente

**GPT-Realtime Prompt**:
```
Analizza questa formazione avversaria e la mia rosa, poi genera contromisure tattiche:

Formazione Avversaria: 4-3-3
Giocatori Chiave: Messi (RWF 97), Ronaldo (CF 95), Neymar (LWF 96)
Stile: Possession Game, High Pressing

La Mia Rosa:
- Attacco: Mbappé (CF 98), Vinicius (LWF 97)
- Centrocampo: Modric (CMF 95), Kroos (CMF 94)
- Difesa: Van Dijk (CB 96), Ramos (CB 95)

Genera:
1. Punti deboli da sfruttare
2. Contromisure tattiche specifiche
3. Suggerimenti formazione
4. Giocatori chiave da usare
5. Stile di gioco consigliato
```

**Output**:
```json
{
  "opponent_weaknesses": [
    "Difesa centrale lenta",
    "Poca copertura laterale",
    "Centrocampo non fisico"
  ],
  "countermeasures": [
    {
      "tactic": "Contropiede Veloce",
      "reason": "Sfrutta la lentezza difensiva avversaria",
      "priority": "high",
      "formation_suggestion": "4-2-3-1",
      "key_players": ["Mbappé", "Vinicius"],
      "instructions": "Usa passaggi lunghi per sfruttare velocità attaccanti"
    },
    {
      "tactic": "Pressing Alto",
      "reason": "Centrocampo avversario debole",
      "priority": "medium",
      "formation_suggestion": "4-3-3",
      "key_players": ["Modric", "Kroos"],
      "instructions": "Pressione aggressiva sul centrocampo per recuperare palla alta"
    }
  ],
  "recommended_formation": "4-2-3-1",
  "recommended_playstyle": "Counter Attack",
  "confidence": 0.85
}
```

**Implementazione**:
- **Edge Function**: `supabase/functions/generate-countermeasures-gpt/index.ts`
- **Frontend**: Integrare in `CounterMeasures.jsx` (sostituire placeholder)
- **Database**: Salvare in `coaching_suggestions` table

---

### **Caso d'Uso 3.2: Contromisure Dinamiche Durante Partita**

**Input**: Statistiche live partita + Formazione avversaria

**GPT-Realtime Prompt**:
```
Durante la partita, analizza queste statistiche live:
- Possesso: 40% vs 60%
- Tiri: 3 vs 8
- Passaggi completati: 120 vs 180

Formazione avversaria: 4-3-3 (Possession Game)

Genera contromisure immediate da applicare:
1. Aggiustamenti tattici urgenti
2. Cambi formazione consigliati
3. Sostituzioni suggerite
4. Istruzioni specifiche per giocatori
```

**Output**:
```json
{
  "urgent_adjustments": [
    {
      "action": "Aumenta pressing",
      "reason": "Stai perdendo possesso palla",
      "priority": "critical"
    },
    {
      "action": "Rinforza centrocampo",
      "reason": "Centrocampo avversario domina",
      "priority": "high"
    }
  ],
  "formation_change": {
    "from": "4-3-3",
    "to": "4-2-3-1",
    "reason": "Migliore copertura centrocampo"
  },
  "substitutions": [
    {
      "out": "Giocatore A (CMF)",
      "in": "Giocatore B (DMF)",
      "reason": "Serve più fisicità in centrocampo"
    }
  ],
  "player_instructions": [
    {
      "player": "Modric",
      "instruction": "Resta più basso, aiuta in fase difensiva"
    }
  ]
}
```

**Implementazione**:
- **Edge Function**: `supabase/functions/live-countermeasures-gpt/index.ts`
- **Frontend**: Integrare in `MatchCenterPanel.jsx`
- **Real-time**: WebSocket o polling ogni 30 secondi durante partita

---

## 4. 🎤 COACHING VOCALE IN TEMPO REALE

### **Caso d'Uso 4.1: Voice Coaching Durante Partita**

**Input**: Audio utente + Contesto partita (statistiche, formazione, rosa)

**GPT-Realtime Prompt**:
```
L'utente sta giocando una partita e dice (trascrizione audio):
"Sto soffrendo sulle fasce, cosa posso fare?"

Contesto:
- Formazione: 4-3-3
- Possesso: 45% vs 55%
- Avversario: 4-3-3, stile Possession Game
- Rosa utente: [lista giocatori]

Genera risposta vocale coaching:
1. Analisi problema immediata
2. Soluzione tattica specifica
3. Istruzioni chiare e concise
4. Adatta tono al livello utente (beginner/intermedio/avanzato)
```

**Output**:
```json
{
  "coaching_response": {
    "text": "OK, vedo che stai soffrendo sulle fasce. L'avversario sta sfruttando la larghezza del campo. Ti consiglio di: 1) Stringere la formazione, 2) Far scendere i tuoi esterni per aiutare in difesa, 3) Usare un centrocampo più compatto. Vuoi che ti spieghi come modificare la formazione?",
    "tone": "supportive",
    "urgency": "medium",
    "actions": [
      "Modifica formazione: 4-2-3-1 (più compatto)",
      "Istruzioni: Ali devono aiutare in fase difensiva",
      "Cambio suggerito: Sostituisci ala offensiva con ala più difensiva"
    ]
  }
}
```

**Implementazione**:
- **Edge Function**: `supabase/functions/voice-coaching-gpt/index.ts`
- **Frontend**: Integrare in `MatchCenterPanel.jsx` (pulsante "Start Voice Coaching")
- **Real-time**: WebSocket per streaming risposta

---

## 5. 📈 ANALISI STATISTICHE AVANZATE

### **Caso d'Uso 5.1: Analisi Pattern Statistiche**

**Input**: Storico partite (ultime 10 partite)

**GPT-Realtime Prompt**:
```
Analizza queste statistiche delle ultime 10 partite e identifica:
- Pattern ricorrenti (es. sempre perdi possesso, tiri sempre fuori)
- Trend di miglioramento/peggioramento
- Correlazioni (es. quando hai più possesso, vinci di più)
- Punti di forza da sfruttare
- Debolezze da correggere

Genera anche suggerimenti personalizzati basati sui pattern.
```

**Output**:
```json
{
  "patterns": [
    {
      "pattern": "Possesso basso",
      "frequency": "8/10 partite",
      "impact": "negative",
      "correlation": "Perdi quando hai < 45% possesso"
    },
    {
      "pattern": "Tiri precisi",
      "frequency": "7/10 partite",
      "impact": "positive",
      "correlation": "Vinci quando precisione tiri > 60%"
    }
  ],
  "trends": {
    "possession": { "direction": "improving", "change": "+5% ultime 3 partite" },
    "shots_accuracy": { "direction": "stable", "change": "0%" }
  },
  "insights": [
    "Migliora costruzione gioco: hai buona precisione tiri ma crei poche occasioni",
    "Sfrutta più contropiede: quando hai poco possesso, sei efficace in contropiede"
  ],
  "recommendations": [
    {
      "priority": "high",
      "action": "Lavora su costruzione dal basso",
      "reason": "Possesso basso ti limita",
      "specific_tips": ["Usa più passaggi corti", "Mantieni possesso in fase difensiva"]
    }
  ]
}
```

**Implementazione**:
- **Edge Function**: `supabase/functions/analyze-stats-patterns-gpt/index.ts`
- **Frontend**: Integrare in `PerformanceCharts.jsx`
- **Database**: Query `match_history` table

---

## 🏗️ ARCHITETTURA IMPLEMENTAZIONE

### **Backend (Supabase Edge Functions)**

```
supabase/functions/
├── process-screenshot-gpt/
│   └── index.ts              [NUOVO] - Screenshot profilo giocatore con GPT-Realtime
├── analyze-opponent-formation-gpt/
│   └── index.ts              [NUOVO] - Analisi formazione avversaria
├── analyze-match-stats-gpt/
│   └── index.ts              [NUOVO] - Analisi statistiche partita
├── analyze-chart-screenshot-gpt/
│   └── index.ts              [NUOVO] - Analisi screenshot grafici/statistiche
├── analyze-player-ratings-gpt/
│   └── index.ts              [NUOVO] - Estrazione voti/rating da screenshot
├── generate-heatmap-gpt/
│   └── index.ts              [NUOVO] - Generazione heat maps
├── generate-countermeasures-gpt/
│   └── index.ts              [NUOVO] - Contromisure tattiche
├── live-countermeasures-gpt/
│   └── index.ts              [NUOVO] - Contromisure live
└── voice-coaching-gpt/
    └── index.ts              [NUOVO] - Coaching vocale
```

### **Frontend Components**

```
components/
├── analisi/
│   ├── HeatMapVisualization.jsx    [NUOVO] - Heat map generica
│   └── TacticalHeatMap.jsx         [NUOVO] - Heat map tattica
├── avversario/
│   ├── CounterMeasures.jsx          [MODIFICARE] - Integrare GPT
│   └── OpponentAnalysis.jsx        [MODIFICARE] - Integrare GPT
├── match-center/
│   └── VoiceCoachingPanel.jsx      [NUOVO] - Panel coaching vocale
├── statistiche/
│   ├── StatsPatternAnalysis.jsx    [NUOVO] - Analisi pattern
│   ├── ChartScreenshotUpload.jsx    [NUOVO] - Upload screenshot grafici
│   └── PlayerRatingsUpload.jsx     [NUOVO] - Upload screenshot voti
└── rosa/
    └── ScreenshotUpload.jsx        [MODIFICARE] - Supporto voti/rating
```

### **Database Schema (Aggiunte)**

```sql
-- Heat maps
CREATE TABLE heat_maps (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  match_id UUID REFERENCES matches(id),
  heatmap_type TEXT, -- 'player_positions', 'tactical', 'events'
  heatmap_data JSONB,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chart data (da screenshot grafici)
CREATE TABLE chart_data (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  match_id UUID REFERENCES matches(id),
  chart_type TEXT, -- 'bar_chart', 'line_chart', 'radar_chart', 'heat_map', 'table'
  chart_data JSONB,
  screenshot_url TEXT,
  extracted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player match ratings (da screenshot voti)
CREATE TABLE player_match_ratings (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  match_id UUID REFERENCES matches(id),
  player_name TEXT,
  player_id UUID REFERENCES players_base(id),
  rating DECIMAL(3,1), -- Voto (es. 7.5, 8.0)
  rating_type TEXT, -- 'post_match', 'overall', 'performance'
  category_ratings JSONB, -- { "attacking": 9.0, "defending": 5.0 }
  notes TEXT,
  screenshot_url TEXT,
  extracted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contromisure
CREATE TABLE countermeasures (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  opponent_formation TEXT,
  countermeasures JSONB,
  confidence DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Voice coaching sessions
CREATE TABLE voice_coaching_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  match_id UUID REFERENCES matches(id),
  transcription TEXT,
  coaching_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🚀 ROADMAP IMPLEMENTAZIONE

### **Sprint 1: Screenshot Analysis (1 settimana)**
1. ✅ Creare `process-screenshot-gpt` Edge Function
2. ✅ Integrare GPT-Realtime per analisi screenshot giocatori
3. ✅ Creare `analyze-chart-screenshot-gpt` Edge Function (grafici)
4. ✅ Creare `analyze-player-ratings-gpt` Edge Function (voti)
5. ✅ Modificare `ScreenshotUpload.jsx` per usare nuove functions
6. ✅ Creare `ChartScreenshotUpload.jsx` component
7. ✅ Creare `PlayerRatingsUpload.jsx` component
8. ✅ Test con screenshot reali (giocatori, grafici, voti)

### **Sprint 2: Contromisure Avversarie (1 settimana)**
1. ✅ Creare `generate-countermeasures-gpt` Edge Function
2. ✅ Implementare `CounterMeasures.jsx` con logica reale
3. ✅ Integrare analisi formazione avversaria
4. ✅ Test con formazioni diverse

### **Sprint 3: Heat Maps (1 settimana)**
1. ✅ Creare `generate-heatmap-gpt` Edge Function
2. ✅ Creare `HeatMapVisualization.jsx` component
3. ✅ Integrare in dashboard/statistiche
4. ✅ Test con dati mock

### **Sprint 4: Voice Coaching (1 settimana)**
1. ✅ Creare `voice-coaching-gpt` Edge Function
2. ✅ Implementare `VoiceCoachingPanel.jsx`
3. ✅ Integrare WebSocket per real-time
4. ✅ Test end-to-end

### **Sprint 5: Statistiche Avanzate (1 settimana)**
1. ✅ Creare `analyze-stats-patterns-gpt` Edge Function
2. ✅ Implementare `StatsPatternAnalysis.jsx`
3. ✅ Integrare in `PerformanceCharts.jsx`
4. ✅ Test con storico partite

---

## 💡 VANTAGGI GPT-REALTIME vs APPROCCI ATTUALE

### **Screenshot Analysis**:
- ✅ **GPT-Realtime**: Capisce contesto, estrae dati strutturati con confidence
- ❌ **Google Vision**: Solo OCR, nessuna comprensione contesto

### **Contromisure**:
- ✅ **GPT-Realtime**: Genera contromisure personalizzate basate su rosa utente
- ❌ **Attuale**: Placeholder, nessuna logica

### **Heat Maps**:
- ✅ **GPT-Realtime**: Genera heat maps intelligenti da dati partita
- ❌ **Attuale**: Non esistono

### **Voice Coaching**:
- ✅ **GPT-Realtime**: Coaching contestuale, adattato a livello utente
- ❌ **Attuale**: Mock, nessuna integrazione

---

## 🔑 DECISIONI TECNICHE

### **GPT-Realtime API**:
- Usare OpenAI GPT-4o Realtime API
- Streaming per risposte vocali
- Vision capability per screenshot

### **Caching**:
- Cache risultati analisi (stesso screenshot = stesso risultato)
- Cache contromisure (stessa formazione = stesse contromisure)

### **Cost Optimization**:
- Batch processing quando possibile
- Rate limiting per utente
- Caching aggressivo

---

**Status**: 🟡 **READY TO IMPLEMENT** - Piano completo, può iniziare Sprint 1
