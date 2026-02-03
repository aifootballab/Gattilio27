# Audit: Come l'IA ragiona, prende ed elabora i dati

**Data**: 2 Febbraio 2026  
**Obiettivo**: Verificare che Supabase contenga tutti i dati necessari per permettere all'IA di incrociare, ragionare e dare suggerimenti corretti.

---

## 1. FLUSSO DATI ALL'IA

### 1.1 CHAT (assistant-chat)

```
messaggio utente
    ↓
needsPersonalContext(message)? → PERSONAL_CONTEXT_TERMS (rosa, partite, formazione, mi consigli, ecc.)
    ↓ (se true)
buildPersonalContext(userId)
    ↓
getRelevantSections(message) → SECTION_KEYWORDS → sezioni info_rag
    ↓
Prompt: systemContent + contesto + ROSA E DATI + MECCANICHE eFootball + messaggio
```

**Dati passati all'IA in CHAT**:
| Fonte Supabase | Campi usati | Contenuto nel prompt |
|----------------|-------------|----------------------|
| user_profiles | first_name, team_name, ai_name, how_to_remember, common_problems | Nome, team, contesto |
| formation_layout | formation, slot_positions | Formazione attuale |
| players | player_name, position, overall_rating, playing_style_id→name, slot_index, photo_slots, original_positions, card_type | Titolari + Riserve (nome, pos, stile, overall, profilazione, competenze) |
| playing_styles | id, name | Lookup nome stile |
| matches | opponent_name, result, formation_played, playing_style_played, match_date | Ultime 10 partite |
| team_tactical_settings | team_playing_style, individual_instructions | Stile squadra, N istruzioni |
| coaches | coach_name, playing_style_competence (is_active) | Allenatore attivo + competenze stili |

**NON passati alla CHAT**:
- players.skills, players.com_skills → l'IA non sa quali abilità ha ogni giocatore
- players.base_stats (dettaglio) → solo "profilazione completa/parziale"
- team_tactical_patterns → formation_usage, playing_style_usage, recurring_issues
- matches.player_ratings, team_stats, attack_areas → dati analitici partita
- player_performance_aggregates → 0 righe, mai popolato

### 1.2 CONTROMISURE (generate-countermeasures)

```
formazione avversaria (opponent_formations) + rosa + allenatore + history + tacticalPatterns
    ↓
getRelevantSectionsForContext('countermeasures') → sezioni 1-10 fisse
    ↓
countermeasuresHelper.buildPrompt()
```

**Dati passati**:
- opponent_formations (selezione utente)
- players (titolari+riserve) con skills, com_skills, playing_style_id
- formation_layout, team_tactical_settings, coaches
- matches (history)
- team_tactical_patterns (formation_usage, playing_style_usage, recurring_issues)
- stylesLookup

### 1.3 ANALYZE-MATCH

```
match_id + rosa + formazione + allenatore + opponent_formation
    ↓
getRelevantSectionsForContext('analyze-match')
    ↓
Dati partita: player_ratings, team_stats, attack_areas, goals_events, formation_discrepancies
```

---

## 2. VERIFICA SUPABASE (query eseguite)

### 2.1 playing_styles
| Metrica | Valore |
|---------|--------|
| Totale righe | 21 |
| Stili presenti | Ala prolifica, Classico n°10, Collante, Frontale extra, Fulcro di gioco, Giocatore chiave, Incontrista, Onnipresente, Opportunista, Portiere difensivo/offensivo, Rapace d'area, Regista creativo, Senza palla, Specialista di cross, Sviluppo, Taglio al centro, Terzino difensivo/mattatore/offensivo, Tra le linee |
| **Mancanti** | ~~Punta avanzata, Punta arretrata, Box-to-Box~~ ✅ **AGGIUNTI (2 feb 2026)** |

I 3 stili mancanti sono stati inseriti in Supabase. Totale playing_styles: 24.

### 2.2 players
| Metrica | Valore | % |
|---------|--------|---|
| Totale | 119 | 100% |
| Con playing_style_id | 65 | 55% |
| Con skills (non vuoto) | 101 | 85% |
| Con base_stats | 99 | 83% |
| Con original_positions | 99 | 83% |

⚠️ **54 giocatori (45%) senza stile** → l'IA non può suggerire per stile (es. "Messi Opportunista va bene per contropiede").

⚠️ **2 giocatori** con position errata (valore = "Opportunista", "Tra le linee" invece di posizione reale) → possibile bug estrazione.

### 2.3 formation_layout
| Metrica | Valore |
|---------|--------|
| Utenti con formazione | 13 |
| Totale righe | 13 |

### 2.4 matches
| Metrica | Valore |
|---------|--------|
| Totale partite | 34 |
| Utenti con partite | 6 |
| Con opponent_formation_id | 0 |

⚠️ Nessuna partita collegata a opponent_formations. Il flusso "carica partita" non popola opponent_formation_id quando l'utente ha analizzato la formazione avversaria.

### 2.5 coaches
| Metrica | Valore |
|---------|--------|
| Totale | 7 |
| Con is_active | 5 |
| Con playing_style_competence | 7 |

### 2.6 team_tactical_settings
| Metrica | Valore |
|---------|--------|
| Totale | 5 |
| Con team_playing_style | 4 |

### 2.7 team_tactical_patterns
| Metrica | Valore |
|---------|--------|
| Totale | 6 |
| Con formation_usage | 5 |
| Con recurring_issues | 0 |

⚠️ recurring_issues sempre vuoto → pattern problemi non sfruttati per suggerimenti.

### 2.8 user_profiles
| Metrica | Valore |
|---------|--------|
| Totale | 8 |
| Con first_name | 8 |
| Con ai_name | 7 |
| Con how_to_remember | 6 |

### 2.9 player_performance_aggregates
| Metrica | Valore |
|---------|--------|
| Totale | 0 |

⚠️ Tabella vuota. Non usata per consigli personalizzati su performance giocatore.

---

## 3. INCROCIO DATI – Cosa serve per suggerimenti corretti

| Obiettivo IA | Dati necessari | Disponibili in CHAT? | Stato DB |
|--------------|----------------|----------------------|----------|
| "Metti X al posto di Y per stile" | playing_style per ogni giocatore | ✅ Sì | ⚠️ 45% senza stile |
| "X va bene per contropiede (Opportunista)" | RAG §2 + stile giocatore | ✅ Sì | OK se stile presente |
| "Aggiungi abilità Z a X" | skills attuali di X | ❌ No | ✅ skills in DB |
| "Le tue partite mostrano problema Y" | team_tactical_patterns.recurring_issues | ❌ No | ❌ Sempre vuoto |
| "Formazione 4-3-3 ha win rate X" | formation_usage | ❌ No | ✅ In DB, usato solo Contromisure |
| "Allenatore competente in Contrattacco" | coaches.playing_style_competence | ✅ Sì | OK |
| "Stile squadra + competenza allenatore" | team_tactical_settings + coaches | ✅ Sì | OK |
| "Contro formazione avversaria X" | opponent_formations | Solo Contromisure | ✅ 81 righe |

---

## 4. GAP E RACCOMANDAZIONI

### 4.1 Priorità alta

1. ~~**playing_styles mancanti**~~ ✅ FATTO
   - Punta avanzata, Punta arretrata, Box-to-Box inseriti in Supabase.

2. **CHAT: skills non passate**
   - buildPersonalContext non include skills/com_skills nel testo rosa
   - L'IA non può consigliare "aggiungi Passaggio filtrante a X" perché non sa cosa ha già
   - Opzione: aggiungere sintesi abilità per titolari (max 3-5 per giocatore) nel contesto, rispettando MAX_PERSONAL_CONTEXT_CHARS

3. **54 giocatori senza playing_style_id**
   - Migliorare extract-player per riconoscere stile anche con nomi EN/IT varianti
   - Verificare save-player: mappare "Box-to-Box", "Quick Counter" (stile squadra) vs "Box-to-Box" (stile giocatore)
   - Valutare fallback: se Vision estrae nome stile come stringa, salvare in metadata e usare per lookup fuzzy

### 4.2 Priorità media

4. **team_tactical_patterns in CHAT**
   - formation_usage, recurring_issues utili per "nelle tue partite perdi a centrocampo"
   - Aggiungere a buildPersonalContext: 1-2 righe sintesi pattern (es. "Formazione più usata: 4-3-3 (15 partite, 60% vittorie). Problemi ricorrenti: centrocampo debole.")

5. **matches.opponent_formation_id = 0**
   - Nel wizard "Aggiungi Partita", se l'utente ha selezionato/analizzato una formazione avversaria, collegarla al match
   - Permette a analyze-match di avere contesto formazione avversaria

6. **Position errata (Opportunista, Tra le linee)**
   - 2 giocatori con position = nome stile. Correggere manualmente o con script:
   - `UPDATE players SET position = 'CF' WHERE position = 'Opportunista'` (solo se confermato)

### 4.3 Priorità bassa

7. **player_performance_aggregates**
   - Tabella vuota: i trigger di aggregazione potrebbero non essere attivi o i match non hanno player_ratings popolati
   - Utile per "X performa meglio come CC che come MED"

8. **PERSONAL_CONTEXT_TERMS**
   - Verificare che "mi consigli", "consigli" senza "formazione" attivino needsPersonalContext

---

## 5. QUERY DI VERIFICA PERIODICA

Eseguire in Supabase SQL Editor per monitoraggio:

```sql
-- Giocatori senza stile
SELECT COUNT(*) FROM players WHERE playing_style_id IS NULL;

-- Stili non mappati (da extract se si logga)
-- (richiede log o tabella staging)

-- Partite senza opponent_formation
SELECT COUNT(*) FROM matches WHERE opponent_formation_id IS NULL;

-- Pattern con recurring_issues vuoto
SELECT COUNT(*) FROM team_tactical_patterns 
WHERE recurring_issues = '[]'::jsonb OR recurring_issues IS NULL;
```

---

*Fine audit.*
