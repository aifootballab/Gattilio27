# Piano enterprise: coerenza RAG e allenatore

**Data**: 28 Gennaio 2026  
**Obiettivo**: Filtrare e allineare tutto il flusso conoscenza (RAG, contesto personale, allenatore) per evitare risposte incoerenti: stili per ruolo (Collante ≠ punte), competenze allenatore vincolanti, domande solo-allenatore non sovraccaricate di RAG.

---

## 1. Domini e fonti di verità

| Dominio | Fonte di verità | Dove si usa | Rischio incoerenza |
|--------|------------------|-------------|---------------------|
| **Stili di gioco giocatori** (per ruolo) | info_rag.md § STILI DI GIOCO DEI GIOCATORI (### Attaccanti / Centrocampisti / Difensori) | Chat, analyze-match, countermeasures | Collante citato per punte; stili ATT citati per difensori |
| **Stili di gioco squadra** | info_rag.md § STILI DI GIOCO SQUADRA + DB team_tactical_settings | Chat, analyze-match, countermeasures | Mix con stili giocatori |
| **Allenatore (competenze, connection)** | DB coaches (playing_style_competence, connection, stat_boosters) | Chat (buildPersonalContext), analyze-match, countermeasures | Suggerire stili con competenza < 50; ignorare competenze >= 70 |
| **Formazione / moduli** | info_rag.md § MODULI TATTICI + DB formation_layout | Chat, analyze-match, countermeasures | Formazioni inventate |
| **Rosa / partite / tattica** | DB (players, matches, team_tactical_settings) | Chat (buildPersonalContext) | Inventare dati |
| **Calci piazzati, meccaniche, istruzioni** | info_rag.md (sezioni dedicate) | Chat, analyze-match, countermeasures | Inventare meccaniche |

**Regola generale**: RAG = solo meccaniche/ruoli/concetti eFootball. DB = solo dati utente (rosa, partite, allenatore, formazione). Le competenze allenatore (DB) sono **vincolanti** per suggerimenti su stile squadra; gli stili giocatori vanno applicati **solo al ruolo corretto** (ATT/MED/DEF).

---

## 2. Regole di coerenza per dominio

### 2.1 Stili di gioco giocatori (per ruolo)

- **Regola**: Per domande su **attaccanti/punte** usare solo gli stili sotto "Attaccanti" (Istinto di attacante, Opportunista, Rapace d'area, Fulcro, Classico 10, Regista creativo, Ala prolifica, Specialista cross, Senza palla). **Non** citare Collante, Box-to-Box, Difensore distruttore per attaccanti.
- **Regola**: Per domande su **centrocampisti** usare solo "Centrocampisti" (Box-to-Box, Tra le linee, Sviluppo, Incontrista, Onnipresente, Collante, Giocatore chiave). **Non** citare Istinto di attacante, Rapace d'area per centrocampisti puri.
- **Regola**: Per domande su **difensori** usare solo "Difensori" (Difensore distruttore, Frontale extra). **Non** citare Collante, Ala prolifica per difensori.
- **Implementazione**: (1) Istruzioni esplicite nel prompt chat + (2) filtraggio RAG: quando la domanda è chiaramente su un solo ruolo (punte / attaccanti / centrocampo / difensori), iniettare solo il sotto-blocco corrispondente della sezione STILI DI GIOCO DEI GIOCATORI (parsing ###).

### 2.2 Allenatore

- **Regola**: Le **competenze** (playing_style_competence) sono vincolanti: **non suggerire mai** uno stile di gioco squadra con competenza < 50; **preferire** stili con competenza >= 70.
- **Regola**: Per domande **solo** su "chi è il mio allenatore" / "allenatore attivo" usare **solo** CONTESTO PERSONALE (DB). Non iniettare RAG pieno (stili giocatori) a meno che la domanda non riguardi anche meccaniche (es. "che stile squadra con il mio allenatore?").
- **Implementazione**: (1) Prompt chat: "Per suggerimenti su stile squadra usa SOLO le competenze dell'allenatore dal CONTESTO PERSONALE (>= 70 suggerisci, < 50 non suggerire mai)." (2) analyze-match e countermeasures: già presenti REGOLE CRITICHE ALLENATORE; rinforzo una riga in chiusura prompt: "Le competenze allenatore sono vincolanti: non suggerire mai uno stile con competenza < 50."

### 2.3 Formazione, rosa, partite

- Già gestiti: contesto personale (buildPersonalContext) per chat; analyze-match/countermeasures usano dati passati. Nessun cambiamento strutturale; coerenza = non inventare (già in prompt).

---

## 3. Modifiche tecniche (scope implementazione)

| Componente | Modifica | Invariante |
|-------------|----------|------------|
| **lib/ragHelper.js** | Parsing ### nella sezione "STILI DI GIOCO DEI GIOCATORI"; funzione `getStiliContentFilteredByRole(message, fullContent)` che restituisce solo blocco Attaccanti / Centrocampisti / Difensori (o tutto) in base a keyword messaggio. In `getRelevantSections`, quando si include STILI DI GIOCO DEI GIOCATORI, sostituire `content` con output filtrato. | API pubbliche getRelevantSections(userMessage, maxChars) e getRelevantSectionsForContext(type, maxChars) invarianti (stesso contratto). |
| **app/api/assistant-chat/route.js** | (1) Nel blocco KNOWLEDGE eFootball del prompt: aggiungere istruzioni ruolo (usa solo stili del ruolo richiesto; non citare Collante per attaccanti, ecc.) e allenatore (usa competenze CONTESTO PERSONALE; >= 70 suggerisci, < 50 non suggerire). (2) Opzionale: se `classifyQuestion === 'efootball'` ma messaggio contiene solo termini allenatore (e nessun altro termine eFootball), non caricare RAG o caricare solo STILI DI GIOCO SQUADRA. Per ora: solo (1) per ridurre rischio. | Output API e struttura messaggi invariata. |
| **app/api/analyze-match/route.js** | Aggiungere una riga nel prompt (dopo REGOLE CRITICHE ALLENATORE): "Le competenze allenatore sono vincolanti: non suggerire mai uno stile con competenza < 50; preferisci stili con competenza >= 70." | Output (summary) e form invariati. |
| **lib/countermeasuresHelper.js** | Stessa riga nel prompt contromisure (dopo REGOLE CRITICHE ALLENATORE). | Output (countermeasures) e form invariati. |

---

## 4. Rollback

- Backup in `rollback/` con timestamp (es. `ragHelper-backup-20260128-coerenza.js`, `assistant-chat-route-backup-20260128-coerenza.js`).
- Ripristino: sostituire i file modificati con i backup e riavviare/build.
- Nessuna modifica a Supabase, nessuna modifica a schema DB o a form UI.

---

## 5. Test e validazione

- **Chat**: (1) "Che stili per le punte?" → risposta deve citare solo stili da Attaccanti (Istinto di attacante, Opportunista, Ala prolifica, ecc.), mai Collante. (2) "Chi è il mio allenatore?" → risposta da CONTESTO PERSONALE, senza inventare. (3) "Che stile squadra mi consigli?" (con allenatore con competenza 85 Possesso, 40 Contropiede) → non deve suggerire Contropiede.
- **Analyze-match**: Partita con allenatore competenza 90 Contropiede, 45 Possesso → suggerimenti non devono raccomandare Possesso.
- **Countermeasures**: Stesso criterio: suggerimenti stile squadra allineati a competenze >= 70.

---

## 6. Riepilogo

- **Stili per ruolo**: Filtro RAG (sotto-blocchi ###) + istruzioni prompt.
- **Allenatore**: Competenze vincolanti in tutti i flussi (chat, analyze-match, countermeasures); domande solo-allenatore non sovraccaricate di RAG (opzionale fase 2).
- **Single source of truth**: RAG = meccaniche; DB = dati utente; prompt = regole di applicazione (ruolo, competenze).

---

## 7. Implementato (28 Gen 2026)

| File | Modifica |
|------|----------|
| **lib/ragHelper.js** | Aggiunti `ROLE_ATTACCANTI_KEYWORDS`, `ROLE_CENTROCAMPISTI_KEYWORDS`, `ROLE_DIFENSORI_KEYWORDS` e `getStiliContentFilteredByRole(userMessage, fullContent)`. In `getRelevantSections`, per la sezione "STILI DI GIOCO DEI GIOCATORI" viene iniettato solo il sotto-blocco ### Attaccanti / Centrocampisti / Difensori se il messaggio è univocamente su un solo ruolo. |
| **app/api/assistant-chat/route.js** | Nel blocco KNOWLEDGE eFootball: istruzioni "STILI PER RUOLO (OBBLIGATORIO)" e "ALLENATORE". Nel system message: righe "STILI PER RUOLO" e "ALLENATORE" (competenza >= 70, mai < 50). |
| **app/api/analyze-match/route.js** | Aggiunta riga: "Le competenze allenatore sono VINCOLANTI: non suggerire mai uno stile con competenza < 50; preferisci stili con competenza >= 70." |
| **lib/countermeasuresHelper.js** | Stessa riga vincolante competenze allenatore nel blocco REGOLE CRITICHE ALLENATORE. |

**Rollback**: in caso di problemi, ripristinare i file da backup (creare copie in `rollback/` con suffisso `-coerenza-20260128` prima di ulteriori modifiche).
