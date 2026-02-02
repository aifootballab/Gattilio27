# Chiarezza: quali giocatori conosce l’IA e chi legge cosa

**Scopo**: Una sola spiegazione chiara su (1) quali giocatori conosce l’IA e (2) chi legge quali file (API, RAG, Cursor, brainstorm).

---

## 1. Regola sui giocatori (la più importante)

**L’IA conosce e cita SOLO i giocatori che il cliente carica nella sua rosa.**

- **Fonte**: I nomi e i dati (position, competenze, stile, overall, ecc.) arrivano dal **CONTESTO PERSONALE** che l’API costruisce quando il cliente ha caricato formazione e riserve (Supabase → `buildPersonalContext`).
- **In risposta**: L’IA deve usare **solo** i nomi presenti in quel blocco (Titolari + Riserve). Mai inventare giocatori. Mai suggerire “Ronaldo”, “Maldini”, “Bellingham” o altri nomi presi da guide, internet o liste “migliori giocatori”.
- **Se la rosa è vuota**: L’IA non ha nessun giocatore da citare. Deve dire che non ha ancora rosa/partite e indicare il percorso (Gestione Formazione → carica formazione e riserve; Aggiungi Partita → wizard 5 step).

**Dove è scritto in codice/prompt:**

- `route.js`: intestazione CONTESTO PERSONALE → *"USA QUESTI DATI - NON INVENTARE GIOCATORI - COACH CORREGGE"*.
- `route.js`: *"LE RISERVE sono in panchina: usale per sostituzioni. Consiglia **solo giocatori di questo elenco** e solo per ruoli compatibili con la loro position."*
- `route.js` (REGOLE ORO): *"Usa **SOLO** nomi dalla lista. NON inventare mai."*
- `route.js` (VIETATO ASSOLUTO): *"Inventare nomi giocatori non nella rosa"*.
- `info_rag.md` §10 NOTE CRITICHE: *"Usa SOLO i giocatori elencati nel CONTESTO PERSONALE (rosa fornita)."*
- `INCOERENZE_E_INTEGRAZIONI_CONTENUTI_INTERNET.md`: *"L’IA deve usare **solo** i nomi della rosa dell’utente (CONTESTO PERSONALE). Non aggiungere in info_rag liste di ‘top 3 opportunisti’ con nomi reali."*

Quindi: **non ti interessa sapere i giocatori oltre quelli che il cliente carica** — è esattamente così per design. L’IA non deve conoscere né suggerire altri nomi.

---

## 2. Chi legge cosa (documentazione e brainstorm)

| File / fonte | Chi lo legge | Quando | Cosa ci fa |
|--------------|--------------|--------|------------|
| **info_rag.md** | **API** (ragHelper + route.js) | Quando la domanda è classificata come “efootball” | RAG: sezioni rilevanti + §10 NOTE CRITICHE. Contiene regole di gioco, stili, moduli, abilità, istruzioni, **nessun elenco di giocatori reali**. |
| **CONTESTO PERSONALE** (rosa, partite, tattica, allenatore) | **API** (route.js) | Quando la domanda richiede contesto personale (`needsPersonalContext`) | Viene costruito da Supabase (formazione, riserve, partite, tattica, allenatore) e iniettato nel prompt. **È l’unica fonte di nomi giocatori per l’IA.** |
| **MEMORIA_ATTILA_BRAINSTORM.md** | **Solo tu + Cursor** (assistente in IDE) | Quando fai brainstorming o chiedi consigli sul progetto | Riferimento per allineare regole di gioco (limitazioni, stili, Ancoraggio, ecc.). **L’API e l’app non lo leggono mai.** |
| **CONTENUTI_INTERNET_DA_INTEGRARE.md** | **Solo tu + Cursor** | Quando lavori su integrazioni (prompt, RAG, NOTE CRITICHE) | Estrarre regole/consigli in italiano, senza nomi giocatori, senza “build/training”; decidere cosa mettere in info_rag o nel prompt. **L’API e l’app non lo leggono mai.** |
| **INCOERENZE_E_INTEGRAZIONI_CONTENUTI_INTERNET.md** | **Solo tu + Cursor** | Quando allinei terminologia e integrazioni | Sintesi incoerenze (EN vs IT, Stamina vs Resistenza, **nomi giocatori solo dalla rosa**), cosa integrare e cosa no. |
| **PIANO_PROMPT_RAG_E_ALLINEAMENTO_ATTILA.md** | **Solo tu + Cursor** | Quando progetti prompt vs RAG vs Memoria Attila | Matrice “dove vive ogni informazione”, allineamento Memoria Attila ↔ info_rag ↔ prompt. |
| **PIANO_DI_AZIONE_RAG_E_FLUSSI.md** | **Solo tu + Cursor** | Quando correggi/verifichi flussi RAG | Da dove il RAG prende le info (solo info_rag.md), flussi classifyQuestion / needsPersonalContext. |

In sintesi:

- **L’API** legge solo **info_rag.md** (RAG) e i **dati utente** (rosa/partite/tattica/allenatore) costruiti dal backend. Non legge Memoria Attila né Contenuti Internet.
- **Tu e Cursor** leggete Memoria Attila e Contenuti Internet per progettare, allineare e blindare l’IA; le regole che ne derivano (es. “solo rosa cliente”) vanno messe in **info_rag.md** §10 e nel **prompt** in route.js.

---

## 3. Cosa non deve mai comparire in RAG o nelle risposte

- **Nomi di giocatori reali** presi da guide, internet o liste (es. Ronaldo, Maldini, Bellingham, Rummenigge, Eto’o, Pelé, Gullit, Nedvěd, ecc.). In RAG e in risposta: **solo nomi dalla rosa del cliente**.
- Liste tipo “top 3 opportunisti”, “migliori mediani”, “build Maldini” con nomi reali. In info_rag si possono descrivere **ruoli e caratteristiche** (es. “opportunista: velocità, finalizzazione, inserimenti”) **senza** nomi.
- Suggerimenti di “cercare” o “comprare” un giocatore fuori dalla rosa. L’IA può solo consigliare **tra i giocatori già presenti** in CONTESTO PERSONALE (sostituzioni, schieramento, istruzioni).

---

## 4. Riepilogo in una frase

**I giocatori di cui l’IA parla sono solo quelli che il cliente carica (formazione + riserve). Nessun altro nome deve essere conosciuto né suggerito dall’IA.**

Questa regola è già applicata nel prompt (route.js) e nelle NOTE CRITICHE (info_rag.md); i file di brainstorm (Memoria Attila, Contenuti Internet, Incoerenze, Piani) servono a te e a Cursor per tenerla coerente e non introdurre eccezioni.
