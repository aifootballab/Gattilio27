# Intrecci IA: Cosa incrocia, cosa manca, come migliorare

**Data**: 2 Febbraio 2026  
**Prospettiva**: Project Manager – focus end-to-end piattaforma eFootball AI Coach.

---

## 1. FOCUS PIATTAFORMA

**Obiettivo**: Coach AI pre/post partita che dà **consigli tattici personalizzati** usando rosa, partite, allenatore, formazione avversaria.

**Non fa**: consigli durante la partita, trading, acquisto giocatori, ricerca mercato.

**Valore differenziante**: l’IA incrocia più fonti e dà suggerimenti concreti con nomi reali, non consigli generici.

---

## 2. GLI INTRECCI OGGI – Per flusso

### 2.1 CHAT (consigli generali, formazione, sostituzioni)

L’IA riceve: rosa (nome, posizione, stile, overall, competenze, profilazione, card_type), partite (risultato, formazione, stile usato), tattica (stile squadra, N istruzioni), allenatore (nome, competenze stili).

| Intreccio | Dati usati | Esempio output | Stato |
|-----------|------------|----------------|--------|
| **Rosa + Stile (RAG §2)** | playing_style_id→nome, RAG "quando serve" | "Messi Opportunista → va bene per contropiede" | OK se stile presente (45% rosa senza) |
| **Rosa + Partite** | formation_played, playing_style_played, result | "4 sconfitte col Possesso → cambia stile" | Limitato: solo riepilogo, nessuna metrica |
| **Rosa + Allenatore** | playing_style_competence | "Contrattacco 85 → usa Contrattacco" | OK |
| **Rosa + Tattica** | team_playing_style | "Stile Contropiede + ali veloci → coerenza" | OK |
| **Rosa + Competenze** | original_positions vs position | "X è CC dalla card ma schierato DC → correggi" | OK |
| **Rosa + Modulo (RAG §3)** | formation, RAG limiti | "4-3-3 max 2 P rispettato" | OK |
| **Rosa + Card type** | card_type | "Messi Trending → non può ricevere abilità" | OK |

**NON possibili in Chat (dati assenti)**:
- Rosa + Skills → consigli "aggiungi abilità X" mirati (skills non passate)
- Rosa + base_stats → verifiche "ali veloci" (solo profilazione completa/parziale)
- Partite + Pattern → "la tua formazione migliore è 4-3-3" (formation_usage non passato)
- Partite + Problemi → "centrocampo debole" (recurring_issues non passato)

---

### 2.2 CONTROMISURE (pre-partita vs formazione avversaria)

L’IA riceve: formazione avversaria, rosa (con skills), allenatore (connection, focal_point, key_man), match history, team_tactical_patterns, RAG completo.

| Intreccio | Dati usati | Esempio output | Stato |
|-----------|------------|----------------|--------|
| **Avversario + Rosa** | opponent formation/style, titolari/riserve | "Contro 4-3-3 pressing → abbassa linea" | OK |
| **Avversario + Stili critici** | Collante, Giocatore chiave in rosa | "Hai Collante → bilancia centrocampo" | OK |
| **Connection + Rosa** | focal_point/key_man (position o style) | "Focal Point Collante: hai X compatibile" | OK |
| **Storico + Formazioni simili** | similarFormationMatches | "Match vs formazioni simili: X vittorie, Y sconfitte" | OK |
| **Performance vs simili** | playerPerformanceAgainstSimilar | "X rating 5.5 vs formazioni simili → considera sostituzione" | OK |
| **Pattern tattici** | formation_usage, recurring_issues | "4-3-3 win rate 65% → coerenza" | OK (se popolati) |

Contromisure è il flusso più ricco: intreccia avversario, storico, pattern e performance per singolo giocatore.

---

### 2.3 ANALYZE-MATCH (post-partita)

L’IA riceve: player_ratings, team_stats, attack_areas, goals_events, formation_discrepancies, rosa, allenatore.

| Intreccio | Dati usati | Esempio output | Stato |
|-----------|------------|----------------|--------|
| **Partita + Rosa** | player_ratings per nome | "X voto 5.5 → prova Y in panchina" | OK |
| **Partita + Zone** | attack_areas, ball_recovery | "Attacco concentrato sinistra" | OK |
| **Partita + Discrepanze** | formation_discrepancies | "Formazione pianificata ≠ usata" | OK |

Il flusso è solido perché usa dati analitici reali della partita.

---

## 3. GAP – Cosa l’IA non può fare (o fa male)

| Gap | Impatto | Dati mancanti |
|-----|---------|----------------|
| **Chat senza formation_usage** | Non può dire "la tua formazione migliore è X" in base alle partite | team_tactical_patterns.formation_usage |
| **Chat senza recurring_issues** | Non può dare priorità a problemi ricorrenti ("centrocampo debole") | team_tactical_patterns.recurring_issues |
| **Chat senza skills** | Non può consigliare "aggiungi Passaggio filtrante a X" sapendo cosa ha già | players.skills, com_skills |
| **Chat con partite solo riepilogo** | Inferisce pattern da "vinto/perso", non da metriche | player_ratings, team_stats, attack_areas per partita |
| **45% giocatori senza stile** | Non può usare stile per consigli su quasi metà rosa | playing_style_id NULL |

---

## 4. MIGLIORAMENTI PROPOSTI (priorità PM)

### 4.1 Alta priorità – Dati già presenti, nessuna modifica DB

**A. Inserire team_tactical_patterns in buildPersonalContext (Chat)**

- Aggiungere 2–3 righe di sintesi quando `formation_usage` o `recurring_issues` sono popolati.
- Esempio: `Pattern partite: 4-3-3 usato 15 volte (60% vittorie). Problemi ricorrenti: centrocampo debole.`
- Effetto: intreccio Partite + Pattern anche in Chat, consigli più mirati.

**B. Prompt: sequenza esplicita per gli intrecci**

- Nel prompt, definire un ordine chiaro: "1) Leggi rosa e pattern; 2) Se formation_usage presente, usalo per suggerire formazione; 3) Se recurring_issues presente, priorizza quei problemi; 4) Incrocia con allenatore e RAG."
- Effetto: l’IA sfrutta meglio i dati che ha.

### 4.2 Media priorità – Dati esistenti, logica da adattare

**C. Skills in Chat (sintesi breve)**

- Per domande su abilità/consigli ruoli, includere skills dei titolari (es. max 5 per giocatore, formato compatto).
- Rispettare `MAX_PERSONAL_CONTEXT_CHARS`.
- Effetto: consigli "aggiungi X" non generici ma basati su cosa ha già il giocatore.

**D. Espansione PERSONAL_CONTEXT_TERMS**

- Verificare che "mi consigli", "cosa fare", "consigli" (senza "formazione") attivino il contesto personale.
- Effetto: meno risposte generiche quando l’utente chiede consiglio.

### 4.3 Bassa priorità – Fix dati e pipeline

**E. Popolamento opponent_formation_id nelle partite**

- Nel wizard "Aggiungi Partita", collegare la formazione avversaria analizzata al match.
- Effetto: Analyze-match può incrociare "in questa partita avevi analizzato formazione avversaria X".

**F. Migliorare extract/save per playing_style**

- Ridurre il 45% di giocatori senza stile: mapping più robusto, fallback su metadata.
- Effetto: più intrecci Rosa + Stile possibili.

---

## 5. RIEPILOGO INTRECCI ATTUALI

```
CHAT:
  Rosa ↔ Stile (RAG)     → "X Opportunista va bene per contropiede"
  Rosa ↔ Partite         → "4 sconfitte col Possesso"
  Rosa ↔ Allenatore      → "competenza Contrattacco 85"
  Rosa ↔ Competenze      → "X CC ma schierato DC"
  Rosa ↔ Modulo          → limiti formazione
  ❌ Rosa ↔ Pattern       → formation_usage, recurring_issues NON passati
  ❌ Rosa ↔ Skills        → NON passati

CONTROMISURE:
  Avversario ↔ Rosa
  Connection ↔ Rosa (focal_point, key_man)
  Storico ↔ Formazioni simili
  Performance giocatori vs formazioni simili
  Pattern (formation_usage, recurring_issues)

ANALYZE-MATCH:
  Partita (ratings, stats, zone) ↔ Rosa
```

---

## 6. AZIONI IMPLEMENTATE (2 feb 2026)

1. ✅ `team_tactical_patterns` aggiunto in `buildPersonalContext`: sintesi "Pattern partite: 4-3-3 X partite (Y% vittorie); Problemi ricorrenti: ..."
2. ✅ Prompt rinforzato: nuova sezione **4b. SE HAI PATTERN PARTITE** con istruzioni per formation_usage e recurring_issues
3. ✅ `"mi consigli"` già presente in `PERSONAL_CONTEXT_TERMS`
4. ✅ **Bilingue (IT/EN)**: `CONTEXT_LABELS` in route.js – tutte le label contesto tradotte. `buildPersonalContext(userId, lang)` riceve lingua dal body.
5. ✅ **Skills in Chat**: sintesi "SKILLS TITOLARI: Nome: skill1, skill2" per consigli abilità mirati.
6. ✅ **PERSONAL_CONTEXT_TERMS** espansi: recommend, suggestions, which formation, who should i play, best lineup.
7. ⏸️ **opponent_formation_id**: non implementato – richiede modifica UX wizard match.

---

*Fine documento. Vedi AUDIT_DATI_IA_E_SUPABASE.md per dettaglio dati DB.*
