# Riassunto (diagnostic) e nuove informazioni: come vengono gestite e come migliorano la chat

**Scopo**: descrivere da dove arrivano le nuove informazioni (Informazioni IA, Statistiche di gioco), come entrano nel riassunto e come la chat le usa per risposte più adeguate al cliente.

---

## 1. Da dove arrivano le nuove informazioni

| Fonte | Dove si salvano | Quando si aggiornano |
|-------|------------------|----------------------|
| **Informazioni IA** | `user_profiles`: `connection_quality`, `slow_opponent_connection_issues`, `input_delay`, `pass_level`, `smart_assist`, `platform`, `favourite_player_name`, `ai_weak_point`, `ai_learn_goals`, `ai_notes` + già presenti `first_name`, `ai_name`, `current_division`, `hours_per_week` | L’utente compila il form "Informazioni IA" (modale in dashboard) → `POST /api/supabase/save-ai-info` |
| **Statistiche di gioco** | `user_game_analysis`: `stats` (jsonb con goal_types, shot_usage, passing, dribbling, defense, special_commands), `captured_at` | L’utente carica 1–2 screenshot della schermata Analisi eFootball → `POST /api/extract-game-analysis` (vision estrae i dati; un solo record per utente, nuovo upload **sovrascrive**) |

Queste colonne/tabelle **non** fanno aumentare la barra Conoscenza AI; servono solo per arricchire il **riassunto** e quindi la chat.

---

## 2. Come entrano nel riassunto (diagnostic)

1. **Refresh del riassunto**  
   L’utente clicca "Aggiorna analisi" in dashboard, oppure (dopo upload Statistiche di gioco) il frontend chiama automaticamente `POST /api/refresh-diagnostic`.

2. **Lettura dati**  
   La route `refresh-diagnostic` legge da Supabase:
   - `user_profiles` (inclusi tutti i campi Informazioni IA)
   - `user_game_analysis` (stats, captured_at)
   - formazione, rosa, partite, tattica, allenatore, pattern (come già fatto)

3. **Costruzione del testo**  
   `lib/diagnosticBuilder.js` → `buildDiagnostic(lang, data)` aggiunge, in ordine:
   - **1. Profilo**: nome, squadra, problemi dichiarati
   - **1b. Informazioni per l’IA**: solo campi valorizzati (nome, come chiamare l’IA, divisione, ore, connessione, avversari lenti, ritardo input, PA, smart assist, piattaforma, giocatore preferito, punto debole, cosa vuole imparare, note). Etichette leggibili in IT/EN.
   - **1c. Statistiche di gioco**: se esiste `user_game_analysis.stats`, una riga tipo “Statistiche di gioco (Analisi eFootball, ultime 10 partite): Tipo gol: …, Tiro: …, Passaggio: …, Dribbling: …, Difesa: …, Comandi speciali: …” (solo chiavi con valore).
   - Poi: Rosa, Tattica, Andamento, Difficoltà, Allenatore, Build, Abilità, Sinergie, Leve (come già implementato).

4. **Salvataggio in cache**  
   Il testo completo viene scritto in `user_diagnostic_cache` (campo `content`, per `user_id` e `lang`). Se il riassunto supera ~6200 caratteri, la chat lo tronca comunque a quella lunghezza quando lo legge.

In sintesi: **le nuove informazioni sono due sezioni in più nel riassunto** (1b e 1c), costruite a partire da `user_profiles` e `user_game_analysis`, e il riassunto aggiornato è quello che la chat userà come contesto.

---

## 3. Come la chat usa il riassunto (e quindi le nuove informazioni)

1. **Lettura contesto**  
   Per ogni messaggio, `POST /api/assistant-chat`:
   - Legge `user_diagnostic_cache.content` per quell’utente.
   - Se esiste e non è vuoto, usa quel testo come **contesto personale** con etichetta **"RIASSUNTO ANALISI"** (altrimenti fallback: buildPersonalContext → "ROSA E DATI").

2. **Inserimento nel prompt**  
   Il contesto viene iniettato nel prompt utente come:
   ```text
   📊 RIASSUNTO ANALISI:
   <testo completo del diagnostic, incluso 1b e 1c>
   ```
   L’IA vede quindi **tutto** ciò che è nel riassunto: profilo, Informazioni per l’IA, Statistiche di gioco, rosa, partite, tattica, allenatore, difficoltà, sinergie, leve.

3. **Istruzioni di utilizzo (system prompt)**  
   Nel system prompt è scritto esplicitamente:
   - Usare **solo** dati dal blocco contesto (ROSA E DATI o RIASSUNTO ANALISI); non inventare.
   - **Se** nel RIASSUNTO ANALISI è presente la sezione **"Statistiche di gioco (Analisi eFootball, ultime 10 partite)"**, usarla per **consigli mirati**: ad es. diversificare tipi di tiro, aumentare uso pressing/comandi, lavorare su passaggio o difesa in base alle **percentuali reali** (tipo gol, tiro, passaggio, dribbling, difesa, comandi speciali).

Quindi:
- **Informazioni IA** (connessione, PA, punto debole, cosa vuole imparare, note, nome, come chiamare l’IA, ecc.) sono **già nel testo** che il modello legge; le usa per tono (nome, nome IA), per evitare consigli inadatti (es. connessione instabile → meno focus su tempismo perfetto), e per orientare i consigli (punto debole, obiettivi di apprendimento).
- **Statistiche di gioco** sono **anch’esse nel testo**; il system prompt dice all’IA di usarle per consigli mirati (es. “83% tiri normali” → suggerire tiro calibrato/pallonetto; “Cambio cursore 219 vs Chiama pressing 1” → suggerire più pressing).

Il **ragionamento** e l’**adeguamento al cliente** avvengono **in risposta**: il modello non ha un blocco “ragionamento” pre-scritto nel riassunto; legge i fatti (inclusi 1b e 1c) e adatta la risposta e i suggerimenti in base a quelli.

---

## 4. Riepilogo: gestione e miglioramento chat

| Cosa | Dove | Effetto sulla chat |
|------|------|--------------------|
| **Informazioni IA** | Form → `user_profiles` → sezione **"Informazioni per l’IA"** nel riassunto | Nome/nome IA, connessione, PA, punto debole, obiettivi, note entrano nel contesto; l’IA adatta tono e tipo di consiglio (es. meno tempismo se lag, più focus su ciò che vuole imparare). |
| **Statistiche di gioco** | Upload screenshot → `user_game_analysis` → sezione **"Statistiche di gioco (Analisi eFootball, ultime 10 partite)"** nel riassunto | Percentuali e conteggi reali (tipo gol, tiro, passaggio, dribbling, difesa, comandi) entrano nel contesto; il system prompt chiede esplicitamente di usarle per consigli mirati (diversificare tiro, pressing, passaggio, difesa). |
| **Riassunto aggiornato** | `refresh-diagnostic` scrive in `user_diagnostic_cache` | La chat usa sempre l’ultima versione del riassunto (con 1b e 1c se presenti), così le nuove informazioni sono subito utilizzate per migliorare le risposte. |

In questo modo le nuove informazioni **vengono gestite** come parti fisse del riassunto (sezioni 1b e 1c) e **vengono utilizzate per migliorare la chat** perché: (1) sono incluse nel blocco RIASSUNTO ANALISI inviato al modello, e (2) il system prompt istruisce l’IA a sfruttare in particolare le Statistiche di gioco per consigli mirati, mentre le Informazioni IA sono già contesto generale (nome, connessione, obiettivi) su cui il modello si adatta da sempre.

---

## 5. RAG eFootball vs riassunto (diagnostic)

| Fonte | Contenuto | Quando viene usato |
|-------|-----------|--------------------|
| **RAG (getRelevantSections)** | Blocco "📚 MECCANICHE eFootball (RAG)": estratti dalla knowledge base (regole, movimenti, limiti moduli, §5 istruzioni, ecc.) in base alla domanda. | Sempre quando la domanda è classificata come rilevante per eFootball; arricchisce il prompt con regole di gioco, **non** con i dati del cliente. |
| **Riassunto (RIASSUNTO ANALISI)** | Blocco "📊 RIASSUNTO ANALISI": profilo, Informazioni per l’IA, Statistiche di gioco (se caricate), rosa, partite, tattica, allenatore, difficoltà, sinergie, leve. | Sempre (o fallback ROSA E DATI). Contiene **solo** dati del cliente. |

Il RAG non sostituisce il riassunto: il RAG fornisce **conoscenza generale** sul gioco; il riassunto fornisce **contesto personale**. Per consigli davvero mirati servono entrambi (e, per le percentuali di gioco, le Statistiche di gioco dentro il riassunto).

---

## 6. Se il cliente non carica (Statistiche di gioco / Informazioni IA)

- **Statistiche di gioco non caricate**  
  La sezione "Statistiche di gioco (Analisi eFootball, ultime 10 partite)" **non** compare nel riassunto. L’IA non ha percentuali reali (tipo gol, tiro, passaggio, ecc.). Nel system prompt è scritto: se il cliente chiede consigli sulle "sue statistiche" o "difficoltà nelle statistiche" e quella sezione non è presente, **non inventare** percentuali; rispondere che può caricare gli screenshot dalla dashboard (card Statistiche di gioco) per ricevere consigli basati sui dati.

- **Informazioni IA non compilate**  
  I campi (connessione, PA, punto debole, obiettivi, note) restano vuoti; nel riassunto la sezione "Informazioni per l’IA" può essere assente o molto corta. L’IA risponde solo con rosa/partite/tattica/allenatore. Se il cliente menziona **nel messaggio** connessione debole/lag/ritardo, il system prompt chiede comunque di adattare i consigli (meno pressing reattivo, più posizionamento e struttura).

---

## 7. Partite inserite manualmente vs Statistiche di gioco (screenshot): niente conflitto

Ci sono **due fonti** di dati partite, entrambe usate nel riassunto e in chat:

| Fonte | Contenuto | Dove nel riassunto |
|-------|-----------|--------------------|
| **Partite inserite manualmente** | Partite salvate nell'app (con upload screenshot o inserimento): risultato, formazione, **zone di attacco** (attack_areas), **voti giocatori** (player_ratings), **team_stats**, zone recupero palla. Aggregati in `team_tactical_patterns`: formation_usage, recurring_issues, eventualmente attack_areas_avg, recovery_zones_avg. | **Andamento (ultime partite)** + **Dati dalle partite inserite (zone attacco, voti, recupero)**: media zone attacco, "voti presenti per N partite", eventuali aggregate da pattern. |
| **Statistiche di gioco** | Un solo snapshot dalla schermata **Analisi eFootball** del videogioco (upload 1–2 screenshot): tipo gol, tiro, passaggio, dribbling, difesa, comandi speciali (ultime 10 partite *nel gioco*). | **Statistiche di gioco (Analisi eFootball, ultime 10 partite)**: percentuali/conteggi estratti dallo screenshot. |

**Perché non vanno in conflitto**

- **Origine diversa**: le partite inserite sono quelle che l'utente salva nell'app (con dettaglio per partita: zone attacco, voti, ecc.); le "Statistiche di gioco" sono ciò che il gioco mostra nella sua schermata Analisi (aggregato interno eFootball).
- **Uso in chat**: nel system prompt è scritto che le due fonti sono **complementari** (stesso giocatore, angolazioni o periodi diversi). L'IA usa: (1) "Dati dalle partite inserite" per zone attacco, voti, recupero dalle partite app; (2) "Statistiche di gioco" per tipo gol, tiro, passaggio, difesa, comandi dall'Analisi eFootball. Non si fondono in un solo numero: restano due blocchi distinti nel riassunto.
- **Se i numeri differiscono** (es. zone attacco dalle partite app vs tipo gol dallo screenshot): è normale (periodi o definizioni diverse); l'IA può usare entrambi per consigli più ricchi.
