# Impostazioni IA e riassunto perfetto (lato nostro)

**Scopo**: cosa ci serve **a noi** per settare bene l’IA e ottenere un riassunto (diagnostic) perfetto. **Per ora nessuna scelta al cliente**: niente bottone "Imposta IA", niente preferenza tecnico/semplice in UI. Tutto è deciso da dati e da configurazione lato backend/prompt.

---

## 1. Cosa abbiamo già (e va usato bene)

| Fonte | Cosa usiamo per il riassunto | Note |
|-------|------------------------------|------|
| **user_profiles** | first_name, team_name, common_problems, ai_name, how_to_remember | Problemi dichiarati = difficoltà esplicite; memo per contesto |
| **players + playing_styles** | rosa, posizioni, stili (playing_style_id + role), overall | Connection match e build dipendono da qui |
| **formation_layout** | formation (modulo salvato) | Solo nome formazione; non confondere con stile squadra |
| **team_tactical_settings** | team_playing_style, individual_instructions | Stile squadra (5 valori) + istruzioni §5 |
| **matches** | ultime N, result, formation_played, playing_style_played, opponent, opponent_formation_id | Andamento e pattern |
| **team_tactical_patterns** | formation_usage, playing_style_usage, recurring_issues | Win rate per modulo/stile; difficoltà ricorrenti (spesso vuoto) |
| **coaches** | attivo: nome, playing_style_competence, connection, stat_boosters | Focal/Key Man, beneficiari booster, stili consigliabili |

Per un riassunto perfetto serve che **questi dati siano completi e coerenti** (rosa con stili, partite salvate, stile squadra impostato se usato, allenatore con connection). Non inventiamo nulla: dove manca, il diagnostic dice "non impostato" / "nessun dato".

---

## 2. Cosa ci serve per "settare bene" l’IA (solo noi)

### 2.1 Tono e lunghezza (fissi, nessuna scelta utente)

- **Tono**: unico, da **allenatore**: imperativo, breve, operativo. Lo fissiamo in `diagnosticBuilder` (label, frasi tipo) e nel **system prompt** della chat (max 3 frasi, "In sintesi: …", niente ragionamento esposto).
- **Lingua**: da `Accept-Language` o da parametro alla generazione del diagnostic (`lang` in refresh-diagnostic). Nessuna preferenza salvata in profilo per ora.
- **Lunghezza riassunto**: già limitata da `MAX_PERSONAL_CONTEXT_CHARS` (6200) in chat; il builder non ha un tetto per sezione ma possiamo introdurre **max caratteri per sezione** o **max righe** se il riassunto diventasse troppo lungo. Valore tipico: 400–1000 parole totali come guida.

**Config suggerita (costanti in codice o env)**:
- `DIAGNOSTIC_TONE`: sempre "coach" (operativo, breve).
- `DIAGNOSTIC_MAX_CHARS_PER_SECTION`: opzionale, es. 400 per sezione per evitare una sola sezione che domina.

### 2.2 Struttura del riassunto (template fisso)

L’ordine e il contenuto delle sezioni li decidiamo noi; il builder già lo fa. Per un riassunto "perfetto" basta **non cambiare a caso** l’ordine e **scrivere sempre**:

1. Profilo (nome, squadra, problemi dichiarati)
2. Rosa (formazione salvata, titolari, riserve con posizione/stile/rating)
3. Tattica (stile squadra + numero istruzioni individuali)
4. Andamento (ultime partite + pattern formazione/stile con win rate)
5. Difficoltà (problemi dichiarati + recurring_issues)
6. Allenatore (nome, competenze, connection, match con rosa, booster e beneficiari, stili consigliabili/sconsigliabili)
7. Build (sintesi tipo rosa e stili per linea)
8. Abilità rilevanti (skills/com_skills in rosa)
9. Sinergie (allineamento coach–stile, disallineamento formazione usata vs salvata, conflitti)
10. Leve possibili (sintomo → leva, da problemi e pattern)

Questo è già il flusso in `diagnosticBuilder.js`. Per "perfetto" serve solo **coerenza** (stessi nomi di sezione, stesso stile di frase) e **non inventare** dove i dati mancano.

### 2.3 Qualità dati in ingresso

- **Sanitizzazione**: già `sanitizeForPrompt` su tutti i testi (no newline, troncamento). Mantenere su ogni campo che finisce in diagnostic o in prompt.
- **Completeness**: possiamo esporre al builder (o al prompt) un piccolo **flag** derivato, es. `dataCompleteness: { hasRosa: true, hasMatches: true, hasCoach: true, hasTeamStyle: false }`. Il diagnostic può includere una riga tipo "Dati: rosa e partite presenti; stile squadra non impostato." così l’IA non overclaim. Opzionale ma utile.
- **Recurring issues**: oggi spesso vuoto. Per un riassunto più ricco potremmo (in futuro) derivarli da pattern (es. "sconfitte quando giochi 4-2-4" da formation_usage) o da analisi post-partita. Per ora il diagnostic dice "nessuna difficoltà ricorrente registrata" se l’array è vuoto.

### 2.4 Prompt chat (allineato al riassunto)

- **System prompt**: già vincoli (solo nomi rosa, 5 stili, istruzioni §5, NO Tattica su difensori, NO Tornante su MED Collante, regola oro). Per "settare bene" basta che **non** ci siano istruzioni in conflitto con il diagnostic (es. "inventa stile squadra se non c’è").
- **Contesto**: se c’è diagnostic in cache, la chat vede il riassunto; altrimenti buildPersonalContext. Il riassunto è già il nostro "setting" principale: più è chiaro e strutturato, meglio l’IA risponde.
- **Suggerimenti**: già generali e da allenatore; non formazione-first. Nessuna scelta utente: le 3 domande le generiamo noi (default) o le genera il modello seguendo le regole che gli diamo.

### 2.5 Cosa evitare (per un riassunto “perfetto”)

- **Non inventare**: se `team_playing_style` è null → "non impostato", non la formazione.
- **Non mescolare**: formazione (modulo) ≠ stile squadra (Possesso, Contropiede, ecc.).
- **Non gonfiare**: niente frasi generiche tipo "il cliente vuole migliorare"; solo dati reali (problemi dichiarati, pattern, connection match).
- **Lessico coerente**: stessi termini nel diagnostic e nel RAG (es. stili squadra, nomi istruzioni §5) così l’IA non si confonde.

---

## 3. Riepilogo: cosa ci serve per settare bene l’IA

| Cosa | Chi lo decide | Dove |
|------|----------------|------|
| Tono (allenatore, breve) | Noi | diagnosticBuilder label + system prompt chat |
| Lingua | Noi (Accept-Language / param) | refresh-diagnostic, buildDiagnostic(lang) |
| Struttura e ordine sezioni | Noi | diagnosticBuilder (già fissato) |
| Lunghezza (max caratteri) | Noi | MAX_PERSONAL_CONTEXT_CHARS; opz. max per sezione |
| Qualità dati (sanitize, “non impostato”) | Noi | diagnosticBuilder + sanitizeForPrompt |
| Flag completeness (opz.) | Noi | logica in refresh-diagnostic → builder |
| Vincoli e regole chat | Noi | system prompt + suggRules |
| Suggerimenti (generali, da allenatore) | Noi | getDefaultSuggestions + suggRules |

**Nessuna scelta al cliente** per ora: niente "Imposta IA" in UI, niente preferenza tecnico/semplice. Il riassunto perfetto si ottiene con **dati puliti**, **template fisso**, **tono unico** e **prompt allineati**. Se in futuro vorremo dare all’utente preferenze (es. lingua o tono), si potrà aggiungere senza stravolgere questo schema.
