# Audit risposta Chat IA – Analisi problemi e punti di fallimento

**Data:** 6 Febbraio 2026  
**Scope:** Flusso completo della risposta della chat assistente (API + frontend), per individuare cause di risposte incoerenti, errate o fuori perimetro.

---

## 1. Flusso della risposta (end-to-end)

```
[Frontend] AssistantChat.jsx
    → POST /api/assistant-chat { message, currentPage, appState, language, history }
        ↓
[API] route.js
    1. Auth + rate limit
    2. classifyQuestion(message) → 'efootball' | 'platform'
    3. Se efootball → getRelevantSections(message) → RAG da info_rag.md (max ~18k char)
    4. needsPersonalContext(message) → true/false
    5. Se true → buildPersonalContext(userId, lang) → rosa, partite, tattica, allenatore (max ~3500 char)
    6. buildPersonalizedPrompt(...) → prompt user (contesto + RAG + paletti + domanda)
    7. systemContent (breve) + history (max 10 msg) + prompt → OpenAI gpt-4o
    8. Parse risposta: parseSuggestionsFromContent(rawContent) → cleanContent + suggestions[]
    9. return { response: cleanContent, suggestions }
        ↓
[Frontend] setMessages(..., data.response), setLastSuggestions(data.suggestions)
```

Qualsiasi problema in uno di questi passi può generare risposte sbagliate o confuse.

---

## 2. Punti di fallimento e cause probabili

### 2.1 Classificazione domanda (`classifyQuestion`)

| File | Rischio | Effetto |
|------|--------|--------|
| `lib/ragHelper.js` | Se la domanda non contiene termini in `EFOOTBALL_TERMS` né in `platformTerms`, default = `'efootball'`. | Domande ibride (es. "come carico i giocatori e che modulo mi consigli?") → priorità al primo match: se c’è un termine eFootball viene caricato il RAG; altrimenti potrebbe non esserlo. |
| | Se `classifyQuestion` restituisce `'platform'` per una domanda tattica. | Nessun RAG eFootball → l’IA risponde senza limiti da info_rag (stili, moduli, istruzioni) → rischio terminologia sbagliata o consigli fuori perimetro. |

**Raccomandazione:** Loggare in sviluppo `classifyQuestion(message)` e `needsPersonalContext(message)` per verificare che il tipo di domanda sia corretto. Valutare domande composte (più keyword) per evitare classificazione errata.

---

### 2.2 Contesto personale (`needsPersonalContext`)

| Rischio | Effetto |
|--------|--------|
| Domanda senza keyword in `PERSONAL_CONTEXT_TERMS` (es. "meglio 4-3-3 o 4-2-3-1?" senza "rosa"/"formazione"/"consigli"). | Non si carica la rosa/partite/allenatore → risposta generica, senza nomi reali o dati utente. |
| Domanda con sinonimi non in lista (es. "la mia lineup", "i miei 11"). | Stesso effetto: nessun contesto personale. |
| `buildPersonalContext` fallisce (DB, timeout). | `personalContextSummary` vuoto; il prompt dice "carica formazione e riserve" ma l’IA può comunque inventare nomi se non rispetta i paletti. |

**Raccomandazione:** Estendere `PERSONAL_CONTEXT_TERMS` con sinonimi comuni (lineup, 11, formazione migliore, chi schiero, ecc.). In caso di errore `buildPersonalContext`, loggare e opzionalmente iniettare nel prompt una riga esplicita: "Contesto personale non disponibile: non citare nomi di giocatori."

---

### 2.3 Contesto allenatore e stili (già parzialmente mitigato)

| Problema storico (audit 5 feb) | Stato nel codice |
|--------------------------------|------------------|
| Confusione contrattacco vs contropiede_veloce | ✅ Paletto in prompt user (REGOLE ORO) e in system: "contrattacco e contropiede_veloce sono STILI DIVERSI... consiglia uno stile solo se il suo valore allenatore >= 70". |
| Allucinazione nomi (Mbappé, Haaland non in rosa) | ✅ Vietato in system e in REGOLE ORO. |
| Competenza < 70 usata per consigliare stile | ✅ Formato contesto con "Consigliabili (>= 70)" e "Non consigliabili (< 70)" in `buildPersonalContext`; paletto in prompt. |

Rischio residuo: il modello può ancora occasionalmente ignorare i paletti. Valutare **temperature** più bassa (es. 0.5) o ripetere i paletti critici in coda al prompt.

---

### 2.4 RAG eFootball (`getRelevantSections`)

| Rischio | Effetto |
|--------|--------|
| Sezione rilevante non inclusa (keyword mancanti in `SECTION_KEYWORDS`). | Risposta senza riferimento a limiti ufficiali (es. moduli, istruzioni, abilità) → consigli fuori da info_rag. |
| Troncamento a ~18k caratteri. | Se le sezioni utili sono in coda, possono essere tagliate. |
| `info_rag.md` non trovato o vuoto (es. path su Vercel). | `efootballKnowledge` vuoto → nessun blocco "MECCANICHE eFootball" → risposta solo da conoscenza interna del modello (rischio terminologia e regole non allineate). |

**Raccomandazione:** Verificare in deploy che `getInfoRagPath()` risolva correttamente; loggare lunghezza di `efootballKnowledge` quando `classifyQuestion === 'efootball'`. Considerare priorità sezioni (es. §10 NOTE CRITICHE sempre incluse quando RAG è caricato).

---

### 2.5 Costruzione prompt (`buildPersonalizedPrompt`)

| Rischio | Effetto |
|--------|--------|
| Prompt molto lungo (contesto + RAG + paletti). | Token limitati → risposta troncata o modello che "dimentica" istruzioni in coda. |
| Lingua: `language` da body (frontend invia `lang`). | Se il client manda `language` sbagliato, risposta in lingua sbagliata. |
| Storia lunga (10 messaggi, max 2000 char per messaggio). | Contesto conversazione dominante → ultima domanda meno "peso" rispetto alle istruzioni. |

**Raccomandazione:** Monitorare lunghezza prompt (token stimati). Valutare di mettere i paletti critici (nomi solo dalla rosa, stili allenatore >= 70) sia in system che in coda al prompt user. Verificare che il frontend passi sempre `language: lang` coerente con l’UI.

---

### 2.6 System message e modello

| Parametro | Valore | Rischio |
|-----------|--------|--------|
| `temperature` | 0.7 | Maggiore variabilità → possibile minor rispetto dei paletti. |
| `max_tokens` | 450 | Risposta lunga (es. 4–6 frasi + SUGGERIMENTI) può essere troncata; le 3 domande potrebbero mancare o essere tagliate. |
| system | Testo breve (~1k char) | I paletti dettagliati sono nel prompt user; il modello può dare più peso al contesto conversazione che alle istruzioni. |

**Raccomandazione:** Testare con `temperature: 0.5` e `max_tokens: 550`; verificare che le risposte rispettino meglio i paletti e che il blocco SUGGERIMENTI sia completo.

---

### 2.7 Parsing risposta (`parseSuggestionsFromContent`)

| Rischio | Effetto |
|--------|--------|
| L’IA non scrive "SUGGERIMENTI:" o "---" nel formato atteso. | `suggestions` vuoto → frontend usa `getDefaultSuggestions(lang, currentPage)` (fallback per pagina). |
| L’IA mette "1. 2. 3." nella risposta principale invece che dopo "---". | Parser potrebbe estrarre come suggerimenti parti che sono corpo della risposta → testo duplicato o confuso. |
| Contenuto prima del marker SUGGERIMENTI troncato male (es. `head` che taglia a `\n\n` o `---`). | `cleanContent` potrebbe perdere l’ultima frase della risposta. |

**Raccomandazione:** Loggare in dev `rawContent` e `cleanContent` quando `suggestions.length === 0` per capire se il formato è rispettato. Valutare un parser più tollerante (es. accettare "Suggerimenti" senza "---") senza rompere il corpo della risposta.

---

### 2.8 Frontend (AssistantChat.jsx)

| Rischio | Effetto |
|--------|--------|
| `data.response` assente o non stringa. | Errore "Invalid response format"; messaggio generico di errore. |
| `lang` non sincronizzato con backend (es. switch lingua senza rifetch). | Risposta in una lingua e suggerimenti/UI in un’altra. |
| Storia `messages` inviata come `history`: se l’utente ha modificato un messaggio o c’è stato un refresh, la storia potrebbe non corrispondere a quella con cui l’IA ha risposto. | Comportamento atteso: history è readonly; rischio basso. |

**Raccomandazione:** Validare `data.response` (tipo e lunghezza) prima di mostrarlo. Mostrare in UI la lingua attiva (es. "Risposta in italiano") per evitare dubbi.

---

## 3. Riepilogo cause probabili dei "diversi problemi"

| Problema segnalato | Dove guardare | Azione suggerita |
|--------------------|----------------|-------------------|
| Risposta generica, senza nomi/rosa | `needsPersonalContext` non trigger, o `buildPersonalContext` fallisce | Log + estendere PERSONAL_CONTEXT_TERMS; messaggio esplicito se contesto assente. |
| Consiglio stile sbagliato (es. Contropiede con competenza 57) | Paletti già presenti; modello ignora | Rafforzare in coda prompt; abbassare temperature. |
| Nomi inventati (Mbappé, Haaland non in rosa) | Stesso | Ripetere divieto in system + inizio prompt; eventuale post-check sul testo (blacklist nomi comuni se non in rosa). |
| Risposta in lingua sbagliata | Frontend `language` / `lang` | Verificare che body contenga sempre la lingua scelta dall’utente. |
| Risposta troppo lunga / troncata | `max_tokens` 450, formato 3 frasi + SUGGERIMENTI | Aumentare a 550 e verificare output. |
| Suggerimenti assenti o sbagliati | Formato AI non rispettato o parser troppo rigido | Log rawContent quando suggestions vuoto; ammorbidire parser. |
| Terminologia non ufficiale (Poacher, Stamina, ecc.) | RAG non caricato o sezione §10 non inclusa | Verificare path info_rag e priorità sezione NOTE CRITICHE. |
| Consigli fuori perimetro (azioni durante partita, cerca giocatori) | Istruzioni rispettate solo parzialmente | Rafforzare in system i divieti; aggiungere 1–2 esempi "NON fare: ...". |

---

## 4. File coinvolti (riferimento rapido)

| File | Ruolo |
|------|--------|
| `app/api/assistant-chat/route.js` | Flusso completo: auth, classificazione, RAG, contesto, prompt, OpenAI, parse, risposta. |
| `lib/ragHelper.js` | `classifyQuestion`, `needsPersonalContext`, `getRelevantSections`, `getInfoRagPath`. |
| `lib/openaiHelper.js` | `callOpenAIWithRetry` (modello, retry). |
| `info_rag.md` | Contenuto RAG meccaniche eFootball. |
| `components/AssistantChat.jsx` | UI, invio messaggio, lingua, history, visualizzazione risposta e suggerimenti. |

---

## 5. Prossimi passi consigliati

1. **Logging diagnostico (dev):** per ogni richiesta loggare: `classifyQuestion`, `needsPersonalContext`, lunghezza `efootballKnowledge`, lunghezza `personalContextSummary`, lunghezza prompt (stimata in token). In caso di risposta errata, avere questi log permette di capire se il problema è classificazione, contesto o modello.
2. **Test ripetibili:** 5–10 domande "golden" (es. "meglio alla tua rosa?", "che modulo per la mia formazione?", "chi metto al posto di X?") con rosa/allenatore noti; confrontare risposta attesa vs effettiva dopo ogni modifica a prompt/system/parser.
3. **Rafforzare paletti:** ripetere in coda al prompt user (subito prima di "DOMANDA CLIENTE") le 2–3 regole critiche: solo nomi dalla rosa; stili allenatore solo se valore >= 70; contrattacco ≠ contropiede_veloce.
4. **Parametri modello:** test A/B con `temperature: 0.5` e `max_tokens: 550` e confronto qualità/completezza.

Se mi indichi 1–2 esempi concreti di risposta sbagliata (domanda utente + risposta ricevuta), posso suggerire modifiche puntuali ai file (righe e patch) per quei casi.
