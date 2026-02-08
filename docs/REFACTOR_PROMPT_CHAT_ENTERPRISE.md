# Prompt Engine Enterprise - Documentazione Operativa

Stato: Attivo (prompt capsule v2 in produzione)  
Data: 2026-02-08  
Scope: Chat coach eFootball (solo consigli operativi).  
File: `app/api/assistant-chat/route.js`, `info_rag.md`, `lib/ragHelper.js`.

---

## 1. Obiettivo operativo

Prompt corto, coerente, enterprise: dati -> incroci -> decisione -> output finale.  
Niente spiegazioni al cliente: solo risultato operativo.

---

## 2. Fonti dati reali (oggi)

- ROSA: `player_name`, `position`, `original_positions` (competenze), `playing_style`,
  `overall_rating`, `base_stats` (vel/acc/res/fin/pas/tac), `skills`, `com_skills`,
  `form`, `height`, `weight`, `card_type`.
- PARTITE: `formation_played`, `playing_style_played`, `opponent_formation`, `result`,
  `attack_areas`, `player_ratings.cliente`.
- COACH/TATTICA: `playing_style_competence`, `team_playing_style`, `individual_instructions`.
- PATTERN: `formation_usage`, `recurring_issues`.
- RAG: `info_rag.md` (meccaniche, stili, istruzioni, abilita, community).

Regola: se manca un dato, non inventare e salta l incrocio.

---

## 3. Motore decisionale (capsule v2)

### 3.1 Micro-score (concetti usati dal modello)

- FIT: `position` in `competenze` (se no -> correzione prioritaria).
- COACH_OK: competenza stile >= 70; contrattacco != contropiede_veloce.
- SPD: vel+acc (+ Scatto se presente).
- PASS: pas (+ Passaggio filtrante/di prima/dosato se presente).
- WIN: tac (+ Intercettazione/Marcatura/Contrasto/Blocco se presente).
- AIR_DEF: h/w + Dominio palle alte (+ Superiorita aerea).
- AIR_ATK: h/w + Colpo di testa (+ Tiro al volo).
- SUB: Riserva di lusso (alias: Super riserva).

### 3.2 Vincoli hard

- Solo nomi in ROSA.
- Team style configurabile solo 5: Possesso palla, Contropiede veloce, Contrattacco,
  Passaggio lungo, Vie laterali.
- Istruzioni individuali solo sezione 5 del RAG.
- Limiti moduli sezione 3.4 del RAG.
- NO Tattica (astuzia) sui difensori.
- NO Tornante su MED Collante.
- Dominio palle alte != Colpo di testa.

### 3.3 Decisione (1 leva principale + max 2 secondarie)

1) Fix FIT  
2) Fix mismatch coach/team style  
3) Aggancia top recurring_issue  
4) 1-2 cambi titolari/riserve usando forma + voti cliente + micro-score  
5) 1 istruzione (sezione 5 RAG)  
6) Gameplay solo cosa fare da sezione 7 (azioni, senza tasti)

### 3.4 Ragionamento inverso (sintomo -> causa -> leva)

- Fasce scoperte -> esterni senza WIN -> copertura/istruzioni/modulo con esterni.  
- Attacco sterile -> PASS basso o stile incoerente -> inserire regista/cambio stile/modulo.  
- Palle alte -> AIR_DEF basso -> DC/MED piu forti + piazzati.  
- Overall alto ma inutili -> priorita a FIT + micro-score (overall solo tie-breaker).  
- Rosa tutti alti e legnosi -> evita setup che richiede dribbling/pressing continuo;
  massimizza AIR + PASS semplice.

---

## 4. Output contract (obbligatorio)

- Max 3 frasi operative, imperativo.
- Chiusura: "In sintesi: ...".
- Nessun ragionamento esposto.

Server-side: `sanitizeCoachOutput()` rimuove spiegazioni (perche, dato che, ecc).

---

## 5. Coerenza suggerimenti

I 3 suggerimenti devono essere derivati dalla leva scelta:
1) verticale sullo stesso problema  
2) gameplay collegato  
3) meta/info collegato  

---

## 6. Stato implementazione (reale)

- Prompt capsule v2 attivo in `app/api/assistant-chat/route.js`.
- `sanitizeCoachOutput()` attivo per output finale senza ragionamenti.
- RAG pulito da riferimenti a tasti e input.
- `ragHelper` include keyword per "riserva di lusso".
- Micro-score non calcolati server-side: sono concetti nel prompt, non feature reali.

---

## 7. Next step opzionale

Se vogliamo micro-score reali:
- Implementare feature extractor in `buildPersonalContext` con tag/score per giocatore e team.
- Inviare i micro-score nel contesto per ridurre variabilita del modello.
# Prompt Chat – Specifica Enterprise (Motore Decisionale + Refactoring)

**Stato**: Da discutere (non implementato)  
**Data**: 2026-02-08  
**Obiettivo**: Trasformare il prompt da “lista regole” a **specifica coerente del motore decisionale** del servizio (segnali → incroci → diagnosi → leva → output), riducendo ridondanze e allineando **suggerimenti** + **dati** + **RAG** + **paletti community**.  
**File coinvolti**: `app/api/assistant-chat/route.js` (systemContent + buildPersonalizedPrompt)  

---

## 1. Perché serve una specifica (non “altre regole”)

Il servizio non deve “vietare frasi”: deve **produrre consigli utili e consistenti** usando dati reali.

Quindi il prompt deve insegnare al modello:
- **Che segnali esistono** (rosa, partite, coach, tattica, RAG, community)
- **Come incrociarli** (variabili e micro-variabili)
- **Come diagnosticare** (anche per via inversa: da sintomo → cause)
- **Come scegliere le leve configurabili** (modulo/stile/istruzioni/sostituzioni/gameplay)
- **Come mantenere coerenza** tra risposta e blocco SUGGERIMENTI

---

## 2. Fonti di verità (ordine e conflitti)

**F1 – ROSA & DATI (Supabase)**: nomi giocatori, position/competenze, stili card, stats, abilità, forma, h/w.  
**F2 – PARTITE (Supabase)**: risultati, modulo/stile usati, avversario, `player_ratings.cliente`, zone attacco (`attack_areas`), avversario (formation/style).  
**F3 – COACH & TATTICA (Supabase)**: competenze stili allenatore, stile squadra attuale, istruzioni attive.  
**F4 – PATTERN (Supabase)**: `formation_usage`, `recurring_issues` (priorità problemi).  
**F5 – RAG (info_rag.md)**: definizioni ufficiali (stili/istruzioni/abilità), **movimenti** (§7.5), **situazioni** (§7.6), **matrice** (§7.7), note critiche (§10), community skills (§8.10).  

**Regola conflitti**:
- Se F1/F2 dicono A e l’utente dice B (in contrasto) → si segue F1/F2 e si corregge (coach).  
- Se un comportamento è vietato da F5 (limiti §3.4, istruzioni §5, abilità §8, note §10) → F5 prevale sempre.  
- Se mancano dati F1/F2 → niente nomi e niente dettagli che dipendono da quei dati.

---

## 3. Dizionario variabili (input) → micro-variabili (derivate)

### 3.0 Glossario terminologia (prodotto vs RAG vs dati estratti)

Nel servizio, la terminologia mostrata all’utente deve essere **coerente** e stabile.  
Se nei dati/RAG esiste un’etichetta diversa da quella “prodotto”, va gestita come alias.

| Concetto | Etichetta in output IT (prodotto) | Etichetta/alias nei dati o RAG | Note |
|---------|-----------------------------------|--------------------------------|------|
| Super-sub | **Riserva di lusso** | `Super riserva` | Abilità: può essere nativa o aggiungibile (Programmi, se non Trending). In IT vogliamo dire “Riserva di lusso”. |
| Stamina/Endurance | **Resistenza** | `Stamina` (EN) | Stessa statistica; output IT = Resistenza, output EN = Stamina. |
| Astuzia/Tactical fouls | **Tattica (astuzia)** | `Tattica` | Warning community: evitare sui difensori (falli a sfavore). |

### 3.1 Variabili base disponibili

- **Giocatore**: `playing_style` (stile card), stats (`vel`, `acc`, `res`, `fin`, `pas`, `tac`), `abilities[]`, `form` (frecce), `height/weight`, `overall_rating`, `position`, `competenze`.
- **Team**: `team_playing_style`, `individual_instructions[]`.
- **Allenatore**: `playing_style_competence{style -> value}`.
- **Match**: `formation_played`, `playing_style_played`, `opponent_formation`, `result`, `attack_areas`, `player_ratings.cliente`.
- **Pattern**: `formation_usage`, `recurring_issues`.
- **Aggregati (futuro)**: `average_rating`, `rating_trend` (per giocatore).

### 3.2 Micro-variabili (derivate) che il prompt deve “insegnare”

Le micro-variabili sono il nucleo enterprise: rendono il consiglio ripetibile e coerente.

- **RoleFitScore(player, slot)**: compatibilità tra `competenze` e `position` (se mismatch → correzione prioritaria).
- **StyleRoleCompat(player, roleFamily)**: stile card coerente con famiglia ruolo (ATT/CC/MED/DIF), usando definizioni RAG §2.
- **ThreatSpeed(player)**: funzione di `vel`+`acc`+abilità `Scatto` (RAG §8.6) + stile (es. Ala prolifica/Opportunista).
- **AerialDefenseValue(player)**: `height/weight` + abilità `Dominio palle alte` + `Superiorità aerea` (+ `Salto` se presente nei dati).
- **AerialAttackValue(player)**: `height/weight` + abilità `Colpo di testa` (+ `Tiro al volo` per seconde palle).
- **BuildUpPassValue(player)**: `pas` + abilità `Passaggio filtrante` / `Passaggio di prima` / `Passaggio dosato`.
- **BallWinValue(player)**: `tac` + abilità `Intercettazione` / `Marcatura` / `Contrasto aggressivo` / `Blocco`.
- **FatigueResilience(player)**: `res` + abilità `Resistenza superiore` + `Spirito combattivo` (nota: Resistenza/Stamina = stessa statistica in lingue diverse).
- **ImpactSubValue(player)**: abilità **Riserva di lusso** (alias dati/RAG: `Super riserva`) + ruolo (d’impatto) + trend voti (se aggregati).
- **CoachStyleFeasibility(teamStyle)**: `playing_style_competence[teamStyle]` >= 70 (e separazione chiavi: contrattacco ≠ contropiede_veloce).

---

## 4. Incroci enterprise (forward reasoning): dati → decisione

Questa è la parte che oggi manca: **non “non dire X”**, ma “incrocia A con B per ottenere C”.

### 4.1 Modulo / Formazione (leva: `formation`)

**Incrocia**:
- F1 (stili+competenze+micro-variabili)  
 F4 (formation_usage + recurring_issues)  
 F2 (risultati recenti con formation_played)  
 F5 (limiti §3.4)

**Heuristics**:
- Se `formation_usage` indica 1 modulo con win_rate alto → **default**: mantenerlo e ottimizzare ruoli.
- Se recurring_issues puntano a problema strutturale (es. fasce, centro, profondità) → cambiare modulo **solo** se F1 supporta (RoleFit + micro-variabili).

### 4.2 Stile squadra (leva: `team_playing_style`)

**Incrocia**:
- CoachStyleFeasibility (competenza >= 70)  
 F1: composizione rosa (ThreatSpeed/BuildUpPass/BallWin)  
 F2: problemi ricorrenti vs stile usato (playing_style_played)  
 F5: solo 5 stili configurabili

**Regola chiave**: “meta” non esiste senza dati; se coachPossesso 85 e coachContropiede 55 → consigli Possesso, anche se community parla di contropiede.

### 4.3 Istruzioni individuali (leva: `individual_instructions`)

**Incrocia**:
- slot/ruolo del giocatore + micro-variabili (BallWin/BuildUp/Fatigue)  
 F5 §5 (vincoli: Ancoraggio max 2; Linea bassa non ai difensori; Contropiede difesa solo CC/ATT)

### 4.4 Sostituzioni / titolari (leva: lineup)

**Incrocia**:
- forma (↑/↓) + voti `player_ratings.cliente` + ImpactSubValue + RoleFitScore  
 F5 (skills obbligatorie per ruolo §8.10, warning Tattica/Tornante)

### 4.5 Calci piazzati (leva: set pieces + scelta uomini)

**Incrocia**:
- AerialDefenseValue vs AerialAttackValue (distinzione Dominio palle alte ≠ Colpo di testa)  
 F5 §6 (schemi)  
 F2 (se concedi su corner/palle alte)

### 4.6 Gameplay “solo cosa fare” (leva: comportamento in match)

**Incrocia**:
- Situazione (§7.6) + movimenti (§7.5) + note critiche pressing/tiri (§10)  
 match pattern (attack_areas, opponent_formation)  
 senza mai citare tasti/pulsanti

---

## 5. Ragionamento inverso (enterprise): sintomo → cause → leve

Qui il modello deve ragionare “diagnostico”.

### 5.1 Sintomi da match/pattern

**S1 – Perdi sulle fasce / concedi da laterale**  
Evidenze: `attack_areas` avversarie su wide + recurring_issues “fasce” + opponent_formation con ali alte  
Cause candidate:
- terzini troppo offensivi / mancano BallWinValue sugli esterni  
- modulo senza copertura laterale (es. 3 difensori senza esterni adatti)  
Leve:
- istruzioni (Difensivo sui terzini se consentito)  
- scelta giocatori con Rientro difensivo / Intercettazione  
- modulo con esterni (4-3-3/4-2-3-1) se rosa supporta

**S2 – Attacco sterile / poche occasioni**  
Evidenze: perdi ma senza segnare, recurring_issues “attacco sterile”  
Cause candidate:
- basso BuildUpPassValue nei creatori  
- mismatch stile squadra vs rosa (Possesso senza passatori / Contropiede senza ThreatSpeed)  
Leve:
- inserire regista con Passaggio filtrante / Passaggio di prima  
- cambiare stile squadra coerente con coach competence  
- modulo che avvicina punte (4-2-2-2, 4-2-3-1) se limiti ok

**S3 – Prendi gol su palle alte/corner**  
Evidenze: issue + match note + (se presente) voti bassi DC  
Cause candidate:
- basso AerialDefenseValue (manca Dominio palle alte / Superiorità aerea)  
Leve:
- schierare DC con Dominio palle alte (difesa) + h/w alto  
- in attacco, usare Colpo di testa per finalizzare (se serve segnare su corner)

**S4 – Centrocampo perde duelli / second balls**  
Evidenze: recurring_issues “centrocampo debole” + perdi spesso  
Cause candidate:
- basso BallWinValue (tac + skill difensive)  
- warning community: Tornante su Collante “rompe” la mediana  
Leve:
- MED Collante con set difensivo (Intercettazione, Marcatura, Spirito combattivo)  
- evitare Tattica (astuzia) sui difensori; usare su CC/ATT se utile

---

## 6. Paletti community e note critiche (non come “vieti”, ma come vincoli di ottimo)

### 6.1 Abilità obbligatorie per ruolo (RAG §8.10)

Il prompt deve trattarle come **vincoli di qualità**: se un ruolo chiave manca di skill fondamentali, la soluzione preferita è:
1) schierare una card della rosa che le ha native, oppure  
2) se card non Trending: suggerire Programmi Aggiunta Abilità coerenti col ruolo.

### 6.2 Warning ad alta priorità (hard constraints)

- **EVITARE Tattica (astuzia) su difensori** (effetto controproducente, falli a sfavore).  
- **EVITARE Tornante su mediano centrale, soprattutto se Collante** (lo snatura).  
- **Distinguere** Dominio palle alte (duello aereo difensivo) vs Colpo di testa (finalizzazione).  
- **Stile squadra**: solo 5 configurabili; Pressing Alto/Gegenpressing non sono selezionabili come team_playing_style.

---

## 7. Coerenza tra risposta e SUGGERIMENTI (punto critico del servizio)

I suggerimenti non devono essere “random”: devono essere derivati dallo stesso grafo decisionale.

**Regola**: ogni suggerimento deve puntare a una delle leve adiacenti alla risposta, senza contraddirla.

Esempio: se risposta = “Mantieni 4-3-3 e cambia MED” allora:
- Suggerimento verticale: “Vuoi che ottimizzi i 3 di centrocampo nel 4-3-3 con i tuoi nomi?”  
- Gameplay: “Come applicare pressing/compattezza col 4-3-3 contro il tuo avversario?”  
- Meta/Info: “Quale stile squadra rende più forte il 4-3-3 con la tua competenza coach?”

---

## 7B. Prompt capsule (token-budget) – motore decisionale COMPRESSO

Obiettivo: mantenere **prompt corto**, ma “enterprise” tramite **pochi incroci ad alta copertura**.  
Regola: se un dato non è presente nei blocchi (ROSA/MATCH/COACH/PATTERN), **non inventare**: salta quell’incrocio.

### 7B.1 Input (se manca → SKIP)

- **ROSA**: name, position, competenze, playing_style (stile card), overall, stats (vel/acc/res/fin/pas/tac), abilities, form(↑/↓), height/weight, (eventuale piede/build booster se presente nei dati estratti)
- **MATCH/PATTERN**: result, formation_played, playing_style_played, opponent_formation, attack_areas, player_ratings.cliente, formation_usage, recurring_issues
- **COACH/TATTICA**: playing_style_competence, team_playing_style, individual_instructions
- **RAG**: vincoli (§3.4, §5, §8), movimenti/situazioni (7.5–7.7), note critiche (10), community (8.10)

### 7B.2 Micro-score (calcoli rapidi)

- **Fit(role)**: 1 se position ∈ competenze; 0 altrimenti (se 0 → correzione prioritaria)
- **CoachOK(style)**: 1 se competence(style) ≥ 70 (chiavi distinte: contrattacco ≠ contropiede_veloce)
- **SpeedThreat**: vel+acc alti + abilità `Scatto`/`Velocità` + stile ATT compatibile
- **PassEngine**: pas alto + abilità `Passaggio filtrante`/`Passaggio di prima`/`Passaggio dosato` + stile regista compatibile
- **BallWin**: tac+res alti + abilità `Intercettazione`/`Marcatura`/`Contrasto aggressivo`/`Blocco` + stile MED/DIF compatibile
- **AerialDef**: height/weight + `Dominio palle alte` (+ `Superiorità aerea`)  [difesa]
- **AerialAtk**: height/weight + `Colpo di testa` (+ `Tiro al volo`)            [attacco]
- **ImpactSub**: **Riserva di lusso** (alias RAG/dati: `Super riserva`) + trend voti/forma

### 7B.3 Vincoli hard (sempre)

- Solo nomi in ROSA. Solo istruzioni §5. Solo 5 stili squadra configurabili. Limiti moduli §3.4.
- Community: **NO Tattica (astuzia) sui difensori**; **NO Tornante su MED centrale, soprattutto se Collante**.
- Distinguere: `Dominio palle alte` ≠ `Colpo di testa`.

### 7B.4 Decision engine (1 leva principale + max 2 secondarie)

1) **Fix Fit**: se Fit(role)=0 su un titolare chiave → correggi ruolo o sostituisci con nome compatibile.
2) **Fix Coach mismatch**: se team_playing_style non è CoachOK → cambia stile squadra al migliore ≥70 coerente con rosa.
3) **Aggancia issue**: se recurring_issues presente → ogni consiglio deve risolvere la top-issue.
4) **Optimize lineup**: usa forma(↑/↓) + voti cliente + micro-score (BallWin/PassEngine/SpeedThreat) per 1–2 cambi.
5) **Optimize instructions**: 1 istruzione ad alto impatto coerente con §5 (ancoraggio max 2).
6) **Gameplay**: se domanda gameplay o issue pressing/difesa → usa situazioni/movimenti (7.5–7.7) + note §10, solo “cosa fare”.

### 7B.5 Ragionamento inverso (sintomo → cause → leva)

- **Concedi fasce** (attack_areas wide / issue fasce): causa = esterni senza BallWin/Rientro difensivo; leva = esterni più difensivi + istruzioni/modulo con copertura.
- **Attacco sterile**: causa = PassEngine basso o stile incoerente con coach/rosa; leva = inserire regista/filtrante + modulo che avvicina punte o cambio stile.
- **Gol su palle alte**: causa = AerialDef basso; leva = DC con Dominio palle alte + set pieces §6.
- **Perdi seconde palle**: causa = BallWin basso a centro; leva = MED Collante difensivo (ma **NO Tornante**).
- **Overall altissimo ma inutile**: priorità a Fit + micro-score; overall è solo tie-breaker.
- **Rosa “tutti 2m e poco agili”**: se weight/height alti ma vel/acc bassi → evitare setup che richiede dribbling/pressing continuo; massimizza AerialDef/AerialAtk + PassEngine semplice (senza inventare “agilità” se non c’è).

### 7B.6 Output & suggerimenti (coerenti)

- Output: imperativo, max 3 frasi, 1 leva principale + max 2 secondarie, chiudi con “In sintesi: …”.
- Suggerimenti: 1 verticale sullo stesso problema, 1 gameplay legato alla leva scelta, 1 meta/info coerente (no app, no tasti).

## 8. Refactoring del prompt (cosa togliere/sostituire/aggiungere) – aggiornato al modello decisionale

### 8.1 Cosa togliere (ridondanze che rompono il segnale)

- Ripetizioni di “solo nomi dalla rosa”, “no uso app”, “output coach”, “no tasti” in più sezioni: creano rumore e competizione tra istruzioni.
- Esempi con nomi celebri: spostare a placeholder `[Nome]` o usare nomi solo se presenti in ROSA.

### 8.2 Cosa sostituire (da “negativo” a “operativo”)

- “Stats fisse” non deve essere solo “non dire allenare”: deve diventare **mappa di incrocio** (vedi §4).
- “Non dire X” → “Se l’utente chiede X, quale leva configurabile proponi e quale evidenza usi”.

### 8.3 Cosa aggiungere (mancante oggi)

- Sezione **micro-variabili** (RoleFitScore, ThreatSpeed, BallWinValue, …) come linguaggio interno del prompt.
- Sezione **ragionamento inverso** (sintomo → cause → leve) basata su recurring_issues/attack_areas/opponent_formation.
- Regola di **coerenza SUGGERIMENTI** derivati dalla risposta (non “template fisso”).

---

## 9. Decisioni aperte (da discutere)

1) Quanto spostare in system vs user prompt (system = vincoli/ordine; user = modello decisionale).  
2) Esempi: solo placeholder `[Nome]` o “nomi reali ma solo se presenti in ROSA”.  
3) Micro-variabili: quanto formalizzarle (liste) vs descriverle (testo).  
4) Token budget: quanto comprimere mantenendo l’engine (senza perdere robustezza).

---

## 10. Checklist pre-partenza (prima di toccare `route.js`)

- [ ] Confermare che il prompt deve spiegare **incroci** (forward + inverse), non “vieti”.  
- [ ] Confermare che **SUGGERIMENTI** devono essere generati coerenti con la risposta (grafo decisionale).  
- [ ] Confermare priorità vincoli community (Tattica NO difensori, Tornante NO Collante) come hard constraints.  
- [ ] Definire 6-10 micro-variabili minime da imporre sempre (MVP enterprise).  

---

## 11. Riferimenti

- `info_rag.md` – RAG eFootball (sezioni ## 1–10; in particolare §7.5/7.6/7.7 e §8.10 e §10)  
- `docs/AUDIT_CHAT_COACH.md` – audit precedente (contrattacco/sostituzioni, tasti)  
- `lib/ragHelper.js` – keyword/section selection (il RAG deve riportare proprio le sezioni che alimentano l’engine)  
