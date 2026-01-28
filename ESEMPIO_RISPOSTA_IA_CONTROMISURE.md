# Esempio Risposta IA - Contromisure Pre-Partita

**Scenario:** Zingaro carica formazione avversaria 4-2-1-3 con giocatori molto forti (OVR 101-109)

**Formazione Avversaria (da immagine):**
- Formazione: **4-2-1-3**
- Portiere: Buffon (OVR 106)
- Difesa: Bergomi (TS, 102), Maldini (DC, 105), Desailly (DC, 106), Cafu (TD, 104)
- Centrocampo: Vieira (MED, 105), Rodri (CC, 101), Nedvěd (TRQ, 104)
- Attacco: Mbappé (P, 105), Ibrahimović (P, 108), Messi (SP, 109)
- Forza Squadra: ~3200+ (stima basata su OVR)

---

## Esempio Risposta IA (JSON)

```json
{
  "analysis": {
    "opponent_formation_analysis": "Formazione 4-2-1-3 con centrocampo compatto (Vieira + Rodri) e attacco a tre punte molto forte. Nedvěd come trequartista crea collegamento tra centrocampo e attacco. Difesa solida con giocatori leggendari.",
    "is_meta_formation": false,
    "meta_type": null,
    "strengths": [
      "Centrocampo compatto con due mediani (Vieira, Rodri) che proteggono la difesa",
      "Attacco a tre punte con giocatori molto forti (Ibrahimović 108, Messi 109, Mbappé 105)",
      "Trequartista Nedvěd che crea collegamento tra centrocampo e attacco",
      "Difesa solida con giocatori leggendari (Maldini, Desailly, Cafu, Bergomi)"
    ],
    "weaknesses": [
      "Ali potenzialmente isolate se i terzini avanzano",
      "Attaccanti molto forti ma possibile sovraccarico offensivo",
      "Centrocampo compatto ma può essere superato numericamente"
    ],
    "why_weaknesses": "La formazione 4-2-1-3 concentra le forze in attacco e centrocampo centrale. Le ali possono essere vulnerabili se i terzini avanzano troppo."
  },
  "countermeasures": {
    "formation_adjustments": [
      {
        "type": "formation_change",
        "suggestion": "Considera 3-5-2 o 4-4-2 per dominare centrocampo",
        "reason": "Superiorità numerica in centrocampo contro i due mediani avversari",
        "priority": "high"
      }
    ],
    "tactical_adjustments": [
      {
        "type": "defensive_line",
        "suggestion": "media",
        "reason": "Bilanciamento tra copertura e pressing",
        "priority": "high"
      },
      {
        "type": "pressing",
        "suggestion": "contenimento",
        "reason": "Evita spazi per i tre attaccanti avversari",
        "priority": "high"
      },
      {
        "type": "possession_strategy",
        "suggestion": "controllo",
        "reason": "Possesso paziente per limitare occasioni avversarie",
        "priority": "medium"
      }
    ],
    "player_suggestions": [
      {
        "player_id": "uuid-giocatore-1",
        "player_name": "Nome Giocatore Difensivo",
        "action": "add_to_starting_xi",
        "position": "DC",
        "reason": "Rafforza difesa centrale contro attacco a tre punte",
        "priority": "high"
      }
    ],
    "individual_instructions": [
      {
        "slot": "centrocampo_1",
        "player_id": "uuid-mediano",
        "instruction": "difensivo",
        "reason": "Proteggi difesa contro Nedvěd e attaccanti"
      }
    ]
  },
  "confidence": 75,
  "data_quality": "high",
  "warnings": []
}
```

---

## Esempio Risposta IA (Versione Completa Realistica)

**Nota:** Questo è un esempio basato su:
- Formazione avversaria: 4-2-1-3 (da immagine)
- Giocatori molto forti (OVR 101-109)
- Contesto pre-partita (modifiche configurabili)

```json
{
  "analysis": {
    "opponent_formation_analysis": "Formazione 4-2-1-3 con centrocampo compatto e attacco a tre punte molto forte. Il trequartista Nedvěd crea collegamento tra centrocampo e attacco. Difesa solida con giocatori leggendari. Squadra molto forte complessivamente.",
    "is_meta_formation": false,
    "meta_type": null,
    "strengths": [
      "Centrocampo compatto con due mediani (Vieira, Rodri) che proteggono la difesa",
      "Attacco a tre punte con giocatori molto forti (Ibrahimović 108, Messi 109, Mbappé 105)",
      "Trequartista Nedvěd che crea collegamento tra centrocampo e attacco",
      "Difesa solida con giocatori leggendari (Maldini, Desailly, Cafu, Bergomi)",
      "Portiere Buffon (OVR 106) molto affidabile"
    ],
    "weaknesses": [
      "Ali potenzialmente isolate se i terzini avanzano troppo",
      "Possibile sovraccarico offensivo con tre attaccanti",
      "Centrocampo compatto ma può essere superato numericamente con formazione a 5 centrocampisti"
    ],
    "why_weaknesses": "La formazione concentra le forze in attacco e centrocampo centrale. Le ali possono essere vulnerabili se i terzini avanzano."
  },
  "countermeasures": {
    "formation_adjustments": [
      {
        "type": "formation_change",
        "suggestion": "Considera 3-5-2 per superiorità numerica in centrocampo",
        "reason": "Cinque centrocampisti contro i tre avversari (Vieira, Rodri, Nedvěd) danno controllo possesso",
        "priority": "high"
      },
      {
        "type": "formation_change",
        "suggestion": "Alternativa: 4-4-2 per equilibrio e copertura ali",
        "reason": "Quattro centrocampisti bilanciano il centrocampo avversario, due attaccanti contro tre difensori",
        "priority": "medium"
      }
    ],
    "tactical_adjustments": [
      {
        "type": "defensive_line",
        "suggestion": "media",
        "reason": "Bilanciamento tra copertura e pressing contro attacco a tre punte",
        "priority": "high"
      },
      {
        "type": "pressing",
        "suggestion": "contenimento",
        "reason": "Evita spazi per i tre attaccanti avversari molto forti",
        "priority": "high"
      },
      {
        "type": "possession_strategy",
        "suggestion": "controllo",
        "reason": "Possesso paziente per limitare occasioni avversarie",
        "priority": "medium"
      }
    ],
    "player_suggestions": [
      {
        "player_id": "uuid-mediano-1",
        "player_name": "Nome Mediano Difensivo",
        "action": "add_to_starting_xi",
        "position": "MED",
        "reason": "Rafforza centrocampo contro Vieira e Rodri",
        "priority": "high"
      },
      {
        "player_id": "uuid-difensore-1",
        "player_name": "Nome Difensore Centrale",
        "action": "add_to_starting_xi",
        "position": "DC",
        "reason": "Rafforza difesa centrale contro attacco a tre punte",
        "priority": "high"
      }
    ],
    "individual_instructions": [
      {
        "slot": "centrocampo_1",
        "player_id": "uuid-mediano-titolare",
        "instruction": "difensivo",
        "reason": "Proteggi difesa contro Nedvěd e attaccanti"
      },
      {
        "slot": "attacco_1",
        "player_id": "uuid-attaccante-titolare",
        "instruction": "offensivo",
        "reason": "Sfrutta spazi lasciati dai terzini avversari"
      }
    ]
  },
  "confidence": 80,
  "data_quality": "high",
  "warnings": [
    "Formazione avversaria molto forte (OVR 101-109). Contromisure essenziali."
  ]
}
```

---

## Note per Esempio Realistico

### Cosa l'IA DOVREBBE fare:
1. ✅ Analizzare formazione avversaria 4-2-1-3
2. ✅ Identificare punti di forza (centrocampo compatto, attacco forte)
3. ✅ Identificare punti deboli (ali isolate, centrocampo superabile)
4. ✅ Suggerire formazioni alternative (3-5-2, 4-4-2)
5. ✅ Suggerire adeguamenti tattici (linea difensiva, pressing, possesso)
6. ✅ Suggerire giocatori specifici (se ci sono riserve disponibili)
7. ✅ Suggerire istruzioni individuali configurabili

### Cosa l'IA NON DOVREBBE fare:
1. ❌ Dire "perderai perché l'avversario è forte"
2. ❌ Inventare azioni specifiche ("Messi farà dribbling")
3. ❌ Spiegare ragionamenti complessi ("perché l'avversario ha X quindi Y")
4. ❌ Suggerire azioni durante la partita (dribbling, passaggi, ecc.)
5. ❌ Menzionare sinergie/compatibilità se non è sicura

### Regole Applicate:
- ✅ Contesto PRE-PARTITA: tutti i suggerimenti sono modifiche configurabili
- ✅ Enterprise: decisioni chiare, non speculazioni
- ✅ Meglio generico che sbagliato: se non sicura, essere generica
- ✅ Comunicare solo decisioni: "Usa 3-5-2" non "Usa 3-5-2 perché..."

---

## Esempio Risposta IA Completa (Realistico per Zingaro)

**Scenario Realistico:**
- **Formazione Avversaria:** 4-2-1-3 (da immagine caricata)
- **Giocatori Avversari:** Molto forti (OVR 101-109)
- **Contesto:** Preparazione PRE-PARTITA

**Esempio Risposta IA (JSON completo e realistico):**

```json
{
  "analysis": {
    "opponent_formation_analysis": "Formazione 4-2-1-3 con centrocampo compatto e attacco a tre punte molto forte. Il trequartista Nedvěd crea collegamento tra centrocampo e attacco. Difesa solida con giocatori leggendari. Squadra molto forte complessivamente (forza stimata 3200+).",
    "is_meta_formation": false,
    "meta_type": null,
    "strengths": [
      "Centrocampo compatto con due mediani (Vieira OVR 105, Rodri OVR 101) che proteggono la difesa",
      "Attacco a tre punte con giocatori molto forti (Ibrahimović OVR 108, Messi OVR 109, Mbappé OVR 105)",
      "Trequartista Nedvěd (OVR 104) che crea collegamento tra centrocampo e attacco",
      "Difesa solida con giocatori leggendari (Maldini OVR 105, Desailly OVR 106, Cafu OVR 104, Bergomi OVR 102)",
      "Portiere Buffon (OVR 106) molto affidabile"
    ],
    "weaknesses": [
      "Ali potenzialmente isolate se i terzini avanzano troppo",
      "Possibile sovraccarico offensivo con tre attaccanti",
      "Centrocampo compatto ma può essere superato numericamente con formazione a 5 centrocampisti",
      "Difesa a 4 può essere vulnerabile se i terzini avanzano"
    ],
    "why_weaknesses": "La formazione concentra le forze in attacco e centrocampo centrale. Le ali possono essere vulnerabili se i terzini avanzano."
  },
  "countermeasures": {
    "formation_adjustments": [
      {
        "type": "formation_change",
        "suggestion": "Considera 3-5-2 per superiorità numerica in centrocampo",
        "reason": "Cinque centrocampisti contro i tre avversari danno controllo possesso",
        "priority": "high"
      },
      {
        "type": "formation_change",
        "suggestion": "Alternativa: 4-4-2 per equilibrio e copertura ali",
        "reason": "Quattro centrocampisti bilanciano il centrocampo, due attaccanti contro tre difensori",
        "priority": "medium"
      }
    ],
    "tactical_adjustments": [
      {
        "type": "defensive_line",
        "suggestion": "media",
        "reason": "Bilanciamento tra copertura e pressing contro attacco a tre punte",
        "priority": "high"
      },
      {
        "type": "pressing",
        "suggestion": "contenimento",
        "reason": "Evita spazi per i tre attaccanti avversari molto forti",
        "priority": "high"
      },
      {
        "type": "possession_strategy",
        "suggestion": "controllo",
        "reason": "Possesso paziente per limitare occasioni avversarie",
        "priority": "medium"
      }
    ],
    "player_suggestions": [
      {
        "player_id": "uuid-mediano-riserva",
        "player_name": "Nome Mediano Difensivo",
        "action": "add_to_starting_xi",
        "position": "MED",
        "reason": "Rafforza centrocampo contro Vieira e Rodri",
        "priority": "high"
      },
      {
        "player_id": "uuid-difensore-riserva",
        "player_name": "Nome Difensore Centrale",
        "action": "add_to_starting_xi",
        "position": "DC",
        "reason": "Rafforza difesa centrale contro attacco a tre punte",
        "priority": "high"
      }
    ],
    "individual_instructions": [
      {
        "slot": "centrocampo_1",
        "player_id": "uuid-mediano-titolare",
        "instruction": "difensivo",
        "reason": "Proteggi difesa contro Nedvěd e attaccanti"
      },
      {
        "slot": "attacco_1",
        "player_id": "uuid-attaccante-titolare",
        "instruction": "offensivo",
        "reason": "Sfrutta spazi lasciati dai terzini avversari"
      }
    ]
  },
  "confidence": 80,
  "data_quality": "high",
  "warnings": [
    "Formazione avversaria molto forte (OVR 101-109). Contromisure essenziali."
  ]
}
```

---

## Come Appare nel Frontend (Visualizzazione)

### 1. Analisi Formazione Avversaria
- **Badge Meta:** Non mostrato (non è meta)
- **Analisi Testo:** "Formazione 4-2-1-3 con centrocampo compatto..."
- **Punti di Forza:** 5 punti elencati
- **Punti Deboli:** 4 punti elencati
- **Motivazione:** "La formazione concentra le forze..."

### 2. Contromisure Tattiche
- **Formazione:** 
  - "Considera 3-5-2 per superiorità numerica" (HIGH - arancione)
  - "Alternativa: 4-4-2 per equilibrio" (MEDIUM - blu)
- **Tattiche:**
  - "Linea difensiva: media" (HIGH)
  - "Pressing: contenimento" (HIGH)
  - "Possesso: controllo" (MEDIUM)

### 3. Suggerimenti Giocatori
- "Aggiungi a Titolari: Nome Mediano Difensivo (MED)" (HIGH)
- "Aggiungi a Titolari: Nome Difensore Centrale (DC)" (HIGH)

### 4. Istruzioni Individuali
- "Centrocampo 1: difensivo" - Proteggi difesa contro Nedvěd
- "Attacco 1: offensivo" - Sfrutta spazi terzini

---

## Note Implementazione

**Per generare esempio con dati REALI di zingaro:**
1. Recuperare formazione attuale da `formation_layout` (user_id di zingaro)
2. Recuperare rosa da `players` (titolari/riserve)
3. Recuperare stile da `team_tactical_settings`
4. Recuperare allenatore da `coaches` (is_active = true)
5. Recuperare storico match da `matches` (ultimi 50)
6. Generare prompt con `generateCountermeasuresPrompt()`
7. Chiamare OpenAI con prompt
8. Restituire JSON come sopra

**Workflow Completo:**
1. Zingaro carica foto formazione avversaria → `/api/extract-formation`
2. Salvataggio in `opponent_formations` → `/api/supabase/save-opponent-formation`
3. Zingaro clicca "Genera Contromisure" → `/api/generate-countermeasures`
4. API recupera tutti i dati sopra
5. API genera prompt con `generateCountermeasuresPrompt()`
6. API chiama OpenAI (GPT-5.2/GPT-5)
7. API valida e filtra risposta
8. Frontend mostra suggerimenti pre-partita
9. Zingaro applica suggerimenti PRIMA di giocare

---

**Versione:** 1.0  
**Data:** 2026-01-28
