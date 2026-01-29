# Cosa fare per far funzionare la chat come guida (compagno di viaggio)

**Riferimento:** DOCUMENTAZIONE_GUIDA_INTERATTIVA.md + PIANO_IMPLEMENTAZIONE_RAG_E_COACHING.md  
**Obiettivo:** Chat che guida il cliente (passo-passo, conversazionale), risponde su piattaforma + eFootball (RAG), senza inventare.

---

## 1. Storia conversazione (come ChatGPT)

**Problema:** Oggi la chat invia solo l’ultimo messaggio. L’AI non vede “e questo?”, “spiegami meglio”, “e il secondo step?”.

**Cosa fare:**
- **Frontend** (`components/AssistantChat.jsx`): In `handleSend`, oltre a `message`, inviare all’API gli **ultimi N messaggi** (es. ultimi 5 turni = 10 messaggi user+assistant). Formato: `messages: [{ role: 'user'|'assistant', content: '...' }, ...]`.
- **Backend** (`app/api/assistant-chat/route.js`): Accettare `messages` (array) nel body. Se presente, costruire la lista `messages` per OpenAI con: 1) system (come ora), 2) messaggi di storia (ultimi N, rispettando limite token), 3) ultimo user message (o prompt personalizzato che include contesto + ultimo messaggio). Chiamare OpenAI con quella lista invece di solo system + un solo user.

**Risultato:** L’assistente può rispondere a “e questo?”, “non ho capito il passo 2”, “e per la formazione?” mantenendo il filo.

---

## 2. Classificazione domanda (RAG deve partire)

**Problema:** `classifyQuestion` in `lib/ragHelper.js` restituisce `'platform'` se nel messaggio c’è **una sola** delle molte `platformTerms`. Frasi come “come faccio a capire cosa fa il collante?” o “guida mi sui corner” possono contenere “guida”/“come faccio” e finire in platform → niente RAG.

**Cosa fare:**
- **Opzione A (rapida):** Restringere o rimuovere termini troppo generici da `platformTerms` (es. “come faccio” da solo, “guida”, “app ”) e/o dare priorità a **termini eFootball** espliciti: se nel messaggio c’è “collante”, “opportunista”, “match-up”, “corner”, “stile”, “modulo”, “pressing”, “ruolo”, ecc. → forzare `'efootball'` prima di controllare platform.
- **Opzione B (più robusta):** Prima controllare se il messaggio contiene parole tipiche eFootball (stili, ruoli, meccaniche, moduli, calci piazzati). Se sì → `'efootball'`. Altrimenti controllare `platformTerms` per “piattaforma”. Così “cosa fa il collante?” non viene mai classificato come platform.

**Risultato:** Domande su eFootball (collante, match-up, corner, ecc.) attivano sempre il RAG.

---

## 3. Keyword RAG (sezioni giuste)

**Problema:** In `lib/ragHelper.js` la mappa `SECTION_KEYWORDS` deve contenere le parole che l’utente usa. Se “collante” non è tra le keyword della sezione “STILI DI GIOCO DEI GIOCATORI”, quella sezione potrebbe non essere recuperata.

**Cosa fare:**
- In `SECTION_KEYWORDS`, per la sezione **STILI DI GIOCO DEI GIOCATORI**, aggiungere esplicitamente: `'collante'`, `'orchestrator'`, `'opportunista'`, `'cacciatore gol'`, `'rapace area'`, `'fulcro'`, `'box-to-box'`, `'tra le linee'`, `'sviluppo'`, `'incontrista'`, `'onnipresente'`, `'giocatore chiave'`, `'difensore distruttore'`, `'frontale extra'`, e gli altri stili presenti in info_rag.
- Verificare che le altre sezioni (MECCANICHE DIFENSIVE, CALCI PIAZZATI, MODULI TATTICI, ecc.) abbiano keyword sufficienti per le 200 domande in SIMULAZIONE_200_DOMANDE.md.
- (Opzionale) Se `getRelevantSections` restituisce vuoto per eFootball, fare un fallback: caricare almeno 1–2 sezioni “generiche” (es. STILI DI GIOCO + BEST PRACTICES) per non lasciare il modello senza knowledge.

**Risultato:** Per “cosa fa il collante?” viene caricata la sezione giusta e la risposta è corretta.

---

## 4. Prompt: guida passo-passo e lunghezza

**Problema:** Il prompt dice “massimo 3-4 frasi” e non enfatizza abbastanza “guida passo-passo” e “se hai dubbi dimmelo”.

**Cosa fare:**
- In `buildPersonalizedPrompt` (e nel system message in `route.js`), aggiungere istruzioni esplicite: “Quando il cliente chiede come fare qualcosa (app o eFootball), **guida passo-passo**. Alla fine invita a chiedere: «Se hai dubbi, dimmelo!» o «Vuoi che ti spieghi il passo successivo?».”
- Nel system: “Sei un **compagno di viaggio** che guida e motiva, non solo risponde. Puoi usare 4–6 frasi quando serve per spiegare un procedimento passo-passo.”
- Aumentare leggermente `max_tokens` (es. da 300 a 400–500) per permettere risposte di guida complete senza tagli.

**Risultato:** Il tono e il comportamento sono quelli della DOCUMENTAZIONE_GUIDA_INTERATTIVA (guida, passo-passo, “se hai dubbi dimmelo”).

---

## 5. RAG sempre considerato (ibrido)

**Problema:** Se la domanda è classificata solo “platform”, l’AI non ha mai il blocco eFootball. Domande ibride (“prima mi dici come carico la partita e poi come difendo con il match-up”) potrebbero non avere RAG.

**Cosa fare:**
- (Opzionale) Per messaggi brevi o ambigui, considerare di caricare **sempre** un blocco RAG “leggero” (es. 1–2 sezioni più generiche, o solo se il messaggio supera una certa lunghezza) oltre al contesto piattaforma, così il modello ha sia funzionalità app sia knowledge eFootball. Oppure: se `classifyQuestion` restituisce platform ma nel messaggio ci sono parole eFootball, usare **entrambi** (contesto piattaforma + RAG eFootball).

**Risultato:** Meno casi in cui il cliente chiede qualcosa su eFootball ma non riceve RAG.

---

## 6. Test con le 200 domande

**Cosa fare:**
- Usare `SIMULAZIONE_200_DOMANDE.md`: inviare un campione (es. 20–30) alla chat e verificare: (1) domande eFootball classificano come efootball e la risposta usa il knowledge; (2) domande piattaforma non inventano funzionalità; (3) “Cosa fa il collante?” restituisce la definizione corretta da info_rag.
- In console/server verificare il log `[assistant-chat] RAG eFootball: loaded sections` per le domande eFootball.
- Correggere classificazione e keyword in base ai casi che falliscono.

**Risultato:** Evidenza che la chat risponde bene su piattaforma e su eFootball come da documento.

---

## Riepilogo ordine operativo

| # | Cosa fare | Dove | Priorità |
|---|-----------|------|----------|
| 1 | Inviare storia messaggi (ultimi N turni) e usarla in API per OpenAI | AssistantChat.jsx, route.js | Alta |
| 2 | Classificazione: priorità eFootball se nel messaggio ci sono termini eFootball; ridurre falsi “platform” | lib/ragHelper.js `classifyQuestion` | Alta |
| 3 | Aggiungere keyword stili (collante, opportunista, ecc.) in SECTION_KEYWORDS; fallback sezioni se vuoto | lib/ragHelper.js | Alta |
| 4 | Prompt: guida passo-passo, “se hai dubbi dimmelo”, max_tokens 400–500 | route.js buildPersonalizedPrompt + system + requestBody | Media |
| 5 | (Opzionale) RAG ibrido per domande ibride | route.js | Bassa |
| 6 | Test con SIMULAZIONE_200_DOMANDE e correzioni | - | Dopo 1–4 |

Dopo 1–4 la chat dovrebbe già “funzionare” come guida (compagno di viaggio) con RAG; 5 e 6 affinano e validano.
