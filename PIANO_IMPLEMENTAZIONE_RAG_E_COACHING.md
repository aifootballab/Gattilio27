# Piano implementazione RAG + Chat supporto / Coaching conversazionale

**Ruolo**: Project Manager Full-Stack  
**Data**: 28 Gennaio 2026  
**Obiettivo**: Decidere dove e come implementare `info_rag.md`, migliorare la chat di supporto in guida/coaching conversazionale, e valutare risposta a ~200 domande (simulazione) con analisi rischi.

---

## 1. Stato attuale

### 1.1 Dove sta il RAG oggi

| Componente | Uso RAG / Knowledge | Note |
|------------|---------------------|------|
| **analyze-match** | `loadAttilaMemory(attilaContext)` → moduli `memoria_attila/*.md` | Contesto: post-partita, voti, stile squadra. Moduli selettivi (es. 08_consigli_strategie, 01_statistiche_giocatori). |
| **generate-countermeasures** | `loadAttilaMemory(attilaContext)` → stessa memoria modulare | Contesto: pre-partita, formazione avversario, istruzioni. |
| **assistant-chat** (Guida Interattiva) | **Nessun RAG** | Solo prompt fisso: 6 funzionalità piattaforma + profilo utente + pagina corrente. Non usa `memoria_attila` né `info_rag`. |
| **info_rag.md** | **Non collegato** | File ~1000 righe, pulito e coerente; non referenziato da nessuna API. |

### 1.2 Chat di supporto (Guida Interattiva)

- **Frontend**: `components/AssistantChat.jsx` (widget, quick actions, contesto pagina).
- **Backend**: `app/api/assistant-chat/route.js`.
- **Contenuto**: Solo “come si usa la piattaforma” (dashboard, formazione, partite, profilo). Niente meccaniche eFootball né tattica.
- **Limite**: Se l’utente chiede “come difendo con match-up?” o “cos’è un opportunista?”, la chat non ha knowledge e può inventare o rispondere genericamente.

---

## 2. Dove implementare `info_rag` e come usarlo

### 2.1 Scelta consigliata: **un solo punto di ingresso (assistant-chat)**

- **Dove**: integrare RAG nella **stessa** API della chat di supporto (`assistant-chat`).
- **Perché**:
  - Una sola chat per l’utente: “supporto piattaforma” + “guida/coaching eFootball”.
  - Riuso di autenticazione, rate limit, contesto utente e pagina.
  - Niente duplicazione di UI o di flussi (evita confusione “due chat”).

**Alternativa scartata**: seconda chat “solo coaching”. Aumenta complessità UX e manutenzione senza vantaggio chiaro rispetto a una chat unica con RAG.

### 2.2 Ruolo di `info_rag.md`

- **Scopo**: knowledge per **domande su eFootball** (meccaniche, ruoli, stili, build, tattica, calci piazzati, ecc.).
- **Non sostituisce**:
  - Le 6 funzionalità piattaforma (restano nel prompt come oggi).
  - La memoria Attila usata da analyze-match e countermeasures (quella resta per analisi partita/contromisure).

Quindi: **assistant-chat** = prompt piattaforma (come oggi) **+** RAG su `info_rag` quando la domanda è “eFootball”.

---

## 3. Come implementare il RAG (scelte tecniche)

### 3.1 Problema: dimensione di `info_rag`

- `info_rag.md` ≈ 1000 righe, ordine di grandezza ~60–80K caratteri → troppi token per metterlo intero in ogni richiesta.
- **Necessario**: recuperare solo le parti rilevanti (retrieval) o caricare sezioni per tema.

### 3.2 Opzioni

| Opzione | Descrizione | Pro | Contro |
|--------|-------------|-----|--------|
| **A. Keyword / sezioni** | Spezzare `info_rag` per `##` (titoli). Da messaggio utente estrarre parole chiave (es. “match-up”, “opportunista”, “corner”) e caricare solo le sezioni pertinenti. | Nessun DB, nessun embedding, veloce da mettere in produzione. | Meno preciso, dipende da euristiche/parole chiave. |
| **B. Embedding + vector DB** | Chunk per sezione, embed (OpenAI), salvare in Supabase (pgvector) o altro; query = embed messaggio, recuperare top-k chunk. | Retrieval semantico, scala bene. | Setup DB, costo embedding, gestione chunk/aggiornamenti. |
| **C. Ibrido (MVP poi B)** | **Fase 1**: come A (sezioni + keyword). **Fase 2**: introdurre embedding + DB quando serve qualità/scale. | MVP rapido, strada chiara per miglioramento. | Due fasi da progettare. |

**Raccomandazione**: **C (ibrido)**.  
- **Fase 1 (MVP)**:
  - Parsing di `info_rag.md` per `##` (e eventualmente `###`).
  - Mappa “parole chiave / frasi” → “sezioni” (es. “match-up”, “manual defending” → sezione meccaniche difensive).
  - Classificazione semplice in API: “la domanda riguarda la piattaforma (funzionalità app) o eFootball (meccaniche/tattica/ruoli)?”.  
    - Se **piattaforma**: nessun RAG, prompt come oggi.  
    - Se **eFootball**: si caricano 1–3 sezioni rilevanti (max ~15–20K caratteri) e si appendono al system/user prompt.
  - Nessun nuovo DB, nessun embedding.
- **Fase 2 (opzionale)**: chunk + embedding + pgvector quando vogliamo copertura migliore e risposta a “200 domande” più variegate.

### 3.3 Dove nel codice

- **Nuovo modulo**: `lib/ragHelper.js` (o `lib/infoRagHelper.js`):
  - `getRelevantSections(userMessage, infoRagContent)` → restituisce stringa (sottoset di sezioni).
  - Lettura `info_rag.md` da filesystem (come per `memoria_attila`) con cache in memoria.
- **assistant-chat**:
  - Dopo aver costruito il contesto utente e prima di chiamare OpenAI:
    - Decidere se la domanda è “piattaforma” o “eFootball” (euristica o chiamata LLM leggera).
    - Se eFootball: chiamare `getRelevantSections(message, content)` e aggiungere al prompt una sezione tipo “Knowledge eFootball (solo per contesto): …”.
  - Prompt: mantenere regola “NON inventare funzionalità della piattaforma”; aggiungere “per domande su eFootball usa SOLO il knowledge fornito sotto”.

---

## 4. Guida conversazionale vs coaching conversazionale

- **Guida conversazionale**: “Come faccio X nell’app?” → già coperta dalla chat (lista 6 funzionalità).
- **Coaching conversazionale**: “Come difendo meglio?”, “Cosa mi conviene con un opportunista?”, “Dammi un consiglio su corner” → richiede knowledge eFootball, cioè **info_rag**.

Quindi:
- **Migliorare la chat** = aggiungere il RAG su `info_rag` e regole di utilizzo (solo knowledge fornito, niente invenzioni).
- **Un solo flusso**: la stessa chat fa sia guida (piattaforma) sia coaching (eFootball), in base alla domanda.

Non serve un “secondo tipo di chat”; serve **un solo assistant che sappia quando usare la piattaforma e quando il knowledge eFootball**.

---

## 5. Simulazione “200 domande” e capacità di risposta

### 5.1 File “simulazione” (200 domande)

- Non è presente in repo un MD dedicato “simulazione 200 domande”.
- **Proposta**: creare `SIMULAZIONE_200_DOMANDE.md` (o simile) con:
  - ~200 domande rappresentative in italiano (e opzionalmente EN):
    - ~50 su **uso piattaforma** (caricare partita, formazione, profilo, ecc.).
    - ~150 su **eFootball** (meccaniche, ruoli, stili, build, difesa, attacco, calci piazzati, mentalità, ecc.).
  - Struttura: una domanda per riga (o lista numerata), eventualmente raggruppate per categoria.
- Questo file serve da **benchmark**: dopo l’implementazione RAG, si può (manualmente o con script) inviare le 200 domande all’API e valutare:
  - Risposta pertinente / non pertinente.
  - Risposta entro knowledge (no invenzioni) / fuori knowledge.
  - Copertura: quante domande sono “risposte soddisfacenti”.

### 5.2 Possibilità di “rispondere alle 200 domande”

- **Domande piattaforma (~50)**: già oggi la chat, con prompt fisso, può rispondere bene; con regole chiare e test si può puntare a **alta % di risposte corrette**.
- **Domande eFootball (~150)**:
  - **Senza RAG**: la chat non ha knowledge → molte risposte generiche o inventate → **non possiamo garantire** di “rispondere bene” alle 200.
  - **Con RAG (Fase 1, keyword/sezioni)**:
    - Se le 200 domande toccano temi presenti in `info_rag` e le keyword mappano bene alle sezioni, è ragionevole aspettarsi una **buona percentuale** di risposte basate sul documento (es. 70–85% “accettabili” in un test manuale).
    - Limiti: domande molto specifiche o formulate in modo inusuale potrebbero non trovare la sezione giusta.
  - **Con RAG (Fase 2, embedding + vector)**:
    - Migliore recall e risposta a domande variegate → obiettivo **>85–90%** di risposte soddisfacenti sulle 200, con test e iterazioni.

**Conclusione**: **sì, possiamo puntare a “rispondere alle 200 domande”**, a patto di:
1. Introdurre il RAG (almeno Fase 1) nella chat.
2. Creare e mantenere il file di simulazione (200 domande).
3. Eseguire cicli di test e aggiustamento (keyword, sezioni, eventuale Fase 2).

---

## 6. Rischi e mitigazioni

| Rischio | Descrizione | Mitigazione |
|--------|-------------|-------------|
| **Token / costo** | Aggiungere blocchi lunghi da `info_rag` aumenta token per richiesta. | Fase 1: max 1–3 sezioni, tetto caratteri (es. 15–20K). Monitorare costo per utente e per mese. |
| **Latenza** | Lettura file + scelta sezioni può aggiungere 50–200 ms. | Cache in memoria del contenuto e delle sezioni; parsing una tantum. |
| **Hallucination** | Il modello potrebbe mescolare “funzionalità app” e “eFootball” o inventare. | Prompt esplicito: “Per la piattaforma usa SOLO le 6 funzionalità elencate. Per eFootball usa SOLO il blocco Knowledge fornito. Se non c’è, dì che non hai informazioni.” |
| **Lingua** | `info_rag` è in italiano; chat bilingue IT/EN. | Istruire il modello: “Rispondi nella lingua della domanda (IT/EN). Il knowledge è in italiano; se la domanda è in inglese, traducine l’uso nella risposta.” |
| **Manutenzione** | `info_rag` e mappa keyword devono restare allineati. | Documentare in README o in questo piano: dove si aggiorna il RAG e dove la mappa keyword/sezioni. Aggiornare la simulazione 200 domande quando si aggiungono nuove sezioni. |
| **Qualità retrieval (Fase 1)** | Keyword sbagliate o assenti → sezione sbagliata o nessuna. | Avviare con un set piccolo di keyword per sezione; estendere dopo test su 200 domande. Pianificare Fase 2 (embedding) se la copertura non basta. |
| **Rate limit / abuso** | Più valore nella chat può aumentare uso. | Rate limit già presente (30/min); tenere sotto controllo e, se necessario, differenziare limiti per “chat supporto” vs “coaching” (opzionale). |

---

## 7. Passi operativi suggeriti

1. **Creare `SIMULAZIONE_200_DOMANDE.md`**  
   - 50 domande piattaforma + 150 eFootball, categorizzate.

2. **Implementare `lib/ragHelper.js` (o `infoRagHelper.js`)**  
   - Parsing `info_rag.md` per `##` (e `###` se utile).  
   - Mappa keyword → nomi sezioni.  
   - Funzione `getRelevantSections(userMessage, maxChars)`.

3. **Integrare in `assistant-chat`**  
   - Classificazione domanda: piattaforma vs eFootball.  
   - Se eFootball: chiamare RAG, appendere sezioni al prompt.  
   - Aggiornare system/user prompt con regole “solo knowledge fornito / non inventare”.

4. **Test su campione**  
   - Estrarre 20–30 domande dalla simulazione (piattaforma + eFootball) e testare a mano.  
   - Correggere keyword e lunghezza sezioni se necessario.

5. **Eseguire simulazione 200 domande**  
   - Invio automatico o semi-automatico delle 200 domande; raccolta risposte e valutazione (almeno campionaria).  
   - Documentare % “risposta ok” e casi critici.

6. **(Opzionale) Fase 2**  
   - Chunk, embedding, pgvector e retrieval semantico se la qualità sulle 200 domande non è sufficiente.

---

## 8. Riepilogo

- **Dove**: RAG su `info_rag` integrato nella **chat di supporto** (`assistant-chat`), un solo punto di ingresso per guida + coaching.
- **Come**: Fase 1 = sezioni + keyword + classificazione “piattaforma vs eFootball”; Fase 2 (opzionale) = embedding + vector DB.
- **200 domande**: Sì, possiamo puntare a rispondere bene alla simulazione, creando il file MD delle 200 domande e usando il RAG + test iterativi.
- **Rischi**: controllati con limite token, cache, prompt chiari, manutenzione documentata e possibile upgrade a retrieval semantico.

Se vuoi, il passo successivo può essere: (1) bozza di `SIMULAZIONE_200_DOMANDE.md` con 50+150 domande esempio, oppure (2) bozza di `lib/ragHelper.js` e patch per `assistant-chat` (pseudo-codice o diff mirato).
