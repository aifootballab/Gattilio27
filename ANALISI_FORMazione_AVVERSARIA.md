# Analisi Formazione Avversaria - Struttura per Contromisure IA

## Panoramica

La sezione **Formazione Avversaria** permette all'utente di caricare screenshot della formazione dell'avversario per analisi e generazione di contromisure tattiche tramite IA.

## Flusso Dati

### 1. Estrazione da Screenshot
- **Endpoint**: `/api/extract-formation`
- **Input**: Screenshot formazione (immagine)
- **Output**: JSON con:
  - `formation`: Formazione numerica (es: "4-2-1-3")
  - `overall_strength`: Forza complessiva squadra (es: 3245)
  - `tactical_style`: Stile tattico (es: "Contrattacco")
  - `team_name`: Nome squadra
  - `manager_name`: Nome manager/coach
  - `players`: Array di 11 giocatori titolari con:
    - `name`: Nome completo
    - `position`: Posizione abbreviata (P, SP, TRQ, MED, CC, TS, DC, PT)
    - `rating`: Rating complessivo
    - `field_position`: Posizione nel campo (goalkeeper, left_back, center_forward, etc.)
    - `team_logo`: Squadra del giocatore (opzionale)
    - `nationality_flag`: Nazionalità (opzionale)
  - `substitutes`: Array sostituti (opzionale)
  - `reserves`: Array riserve (opzionale)

### 2. Salvataggio in Database
- **Endpoint**: `/api/supabase/save-opponent-formation`
- **Tabella**: `squad_formations`
- **Campi chiave**:
  - `is_opponent: true` (flag per distinguere formazioni avversarie)
  - `user_id`: ID utente anonimo
  - `formation`: Formazione numerica
  - `players`: JSONB array con tutti i giocatori
  - `overall_strength`: Forza complessiva
  - `tactical_style`: Stile tattico
  - `metadata`: Dati aggiuntivi (sostituti, riserve, etc.)

### 3. Recupero Formazioni Salvate
- **Endpoint**: `/api/supabase/get-opponent-formations`
- **Output**: Array di tutte le formazioni avversarie salvate dall'utente

## Struttura Dati per Analisi IA

### Input per Generazione Contromisure

Per generare contromisure tattiche, l'IA avrà bisogno di:

```json
{
  "user_rosa": {
    "formation": "4-3-3",
    "overall_strength": 3200,
    "tactical_style": "Possesso palla",
    "players": [
      {
        "player_base_id": "uuid",
        "name": "Nome Giocatore",
        "position": "P",
        "rating": 105,
        "field_position": "left_forward",
        "base_stats": { /* statistiche base */ },
        "final_stats": { /* statistiche finali con build */ },
        "skills": ["skill1", "skill2"],
        "com_skills": ["com_skill1"],
        "active_booster": { /* booster attivo */ }
      },
      // ... altri 10 giocatori
    ]
  },
  "opponent_formation": {
    "formation": "4-2-1-3",
    "overall_strength": 3245,
    "tactical_style": "Contrattacco",
    "players": [
      {
        "name": "Vinícius Júnior",
        "position": "P",
        "rating": 105,
        "field_position": "left_forward",
        "team_logo": "Real Madrid",
        "nationality_flag": "Brasile"
      },
      // ... altri 10 giocatori
    ]
  }
}
```

### Output Atteso da IA

L'IA dovrebbe generare:

```json
{
  "countermeasures": {
    "formation_suggestions": [
      {
        "formation": "4-4-2",
        "reason": "Chiude gli spazi centrali contro il 4-2-1-3",
        "confidence": 0.85
      }
    ],
    "tactical_adjustments": [
      {
        "type": "defensive_line",
        "suggestion": "Linea difensiva più alta per pressare il centrocampo avversario",
        "priority": "high"
      },
      {
        "type": "pressing",
        "suggestion": "Pressing intenso sui centrocampisti centrali per limitare il gioco",
        "priority": "medium"
      }
    ],
    "player_matchups": [
      {
        "opponent_player": "Vinícius Júnior",
        "opponent_position": "left_forward",
        "suggested_marker": "player_base_id",
        "reason": "Alta velocità e capacità difensiva per contrastare l'ala veloce",
        "confidence": 0.9
      }
    ],
    "weak_points": [
      {
        "area": "centrocampo",
        "description": "Solo 2 centrocampisti centrali, vulnerabile a pressione",
        "exploit_strategy": "Sfruttare superiorità numerica con 3 centrocampisti"
      }
    ],
    "strengths_to_watch": [
      {
        "area": "attacco",
        "description": "Tripletta d'attacco molto veloce e tecnica",
        "defensive_strategy": "Doppio marcatura sugli attaccanti esterni"
      }
    ]
  }
}
```

## Intersezione Rosa Utente + Formazione Avversaria

### Punti Chiave per Analisi

1. **Confronto Formazioni**
   - Formazione utente vs formazione avversaria
   - Identificazione zone di superiorità/inferiorità numerica
   - Suggestioni per adattamento formazione

2. **Confronto Forza Complessiva**
   - `user_rosa.overall_strength` vs `opponent_formation.overall_strength`
   - Strategia: attacco se superiore, difesa se inferiore

3. **Confronto Stili Tattici**
   - `user_rosa.tactical_style` vs `opponent_formation.tactical_style`
   - Identificazione compatibilità/incompatibilità
   - Suggestioni per cambio stile se necessario

4. **Matchup Giocatori**
   - Per ogni giocatore avversario, identificare:
     - Giocatore utente migliore per marcatura
     - Punti di forza da sfruttare
     - Punti deboli da proteggere

5. **Analisi Build Giocatori**
   - Se disponibile, confrontare:
     - Statistiche finali (con build) dei giocatori utente
     - Rating e posizioni dei giocatori avversari
   - Identificare vantaggi/svantaggi tattici

6. **Zone di Gioco**
   - Identificare zone del campo dove:
     - L'utente ha superiorità numerica
     - L'avversario ha superiorità numerica
   - Suggestioni per sfruttare/proteggere queste zone

## Endpoint Futuro per Analisi IA

### `/api/analyze-opponent-matchup`

**Input**:
```json
{
  "user_rosa_id": "uuid",
  "opponent_formation_id": "uuid"
}
```

**Output**:
```json
{
  "analysis": {
    "formation_comparison": { /* confronto formazioni */ },
    "strength_comparison": { /* confronto forza */ },
    "tactical_style_comparison": { /* confronto stili */ },
    "countermeasures": { /* contromisure suggerite */ },
    "player_matchups": [ /* matchup giocatori */ ],
    "weak_points": [ /* punti deboli avversario */ ],
    "strengths_to_watch": [ /* punti di forza avversario */ ]
  }
}
```

## Note Implementative

1. **Rosa Utente**: Recuperata da `user_rosa` con join su `player_builds` e `players_base`
2. **Formazione Avversaria**: Recuperata da `squad_formations` con `is_opponent = true`
3. **Build Giocatori**: I build dell'utente contengono le statistiche finali (con boosters, sviluppo punti, etc.)
4. **Matching Giocatori**: Se i nomi dei giocatori avversari corrispondono a giocatori in `players_base`, si può fare un matching più preciso
5. **Storico**: Le formazioni avversarie salvate permettono di analizzare pattern e strategie ricorrenti

## Prossimi Passi

1. ✅ Estrazione formazione da screenshot
2. ✅ Salvataggio in database
3. ✅ Visualizzazione formazione
4. ⏳ Endpoint analisi matchup (da implementare)
5. ⏳ Integrazione con GPT per generazione contromisure
6. ⏳ Visualizzazione contromisure nella UI
