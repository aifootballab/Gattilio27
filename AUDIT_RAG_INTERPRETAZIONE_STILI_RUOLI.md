# Audit: interpretazione RAG – stili di gioco e ruoli (Collante vs punte)

**Data**: 28 Gennaio 2026  
**Scope**: Read-only. Come il codice fa sì che l’AI riceva e usi il knowledge su stili/ruoli; perché può citare “Collante” in contesto “punte”.

---

## 1. Flusso riepilogativo

1. **assistant-chat** (`app/api/assistant-chat/route.js`): se `classifyQuestion(message) === 'efootball'` → chiama `getRelevantSections(message, 18000)` e inietta il risultato in `buildPersonalizedPrompt` come blocco “KNOWLEDGE eFootball”.
2. **ragHelper** (`lib/ragHelper.js`): `getRelevantSections` fa matching per **keyword su titoli di sezione** (`##`), ordina per score, concatena le **sezioni intere** fino a `maxChars`.
3. **info_rag.md**: la sezione `## STILI DI GIOCO DEI GIOCATORI` contiene in un unico blocco: `### Attaccanti`, `### Centrocampisti`, `### Difensori`. Il parsing **non** spezza per `###`, quindi l’AI riceve sempre l’intera sezione (attaccanti + centrocampisti + difensori).

Conseguenza: per una domanda sulle “punte” (o sugli attaccanti) viene spesso iniettata l’intera sezione stili, che include anche **Collante (MED)**. Il prompt non obbliga a “usare solo gli stili del ruolo richiesto”, quindi l’AI può citare Collante in contesto punte.

---

## 2. Dettaglio codice

### 2.1 Classificazione e recupero (assistant-chat)

- **File**: `app/api/assistant-chat/route.js`
- **Righe**: 386–394

```js
if (classifyQuestion(message) === 'efootball') {
  try {
    efootballKnowledge = getRelevantSections(message, 18000)
    ...
  }
}
```

- `classifyQuestion`: se nel messaggio c’è un termine in `EFOOTBALL_TERMS` (es. “stili gioco”, “ruoli”, “ala prolifica”) → `'efootball'`. Quindi domande tipo “stili per le punte” / “ruoli attaccanti” attivano il RAG.
- `getRelevantSections(message, 18000)`: restituisce un unico blocco di testo (sezioni concatenate), non distingue per ruolo (ATT/MED/DEF).

### 2.2 Matching a livello di sezione (ragHelper)

- **File**: `lib/ragHelper.js`
- **Parsing**: `parseSections()` usa solo il regex `^## (.+)$/gm` (righe 152–176). Le intestazioni `###` non creano sezioni separate; sono solo testo dentro il `content` di una sezione `##`.
- **SECTION_KEYWORDS** (righe 34–124): per `'STILI DI GIOCO DEI GIOCATORI'` le keyword includono tra l’altro: `stili gioco`, `stile giocatore`, `opportunista`, `istinto di attacante`, `ala prolifica`, `collante`, `box-to-box`, `ruoli`, ecc.
- **Score**: `scoreSection(sectionTitle, messageNorm)` conta quante keyword della sezione compaiono nel messaggio (righe 200–207). Una sola keyword match è sufficiente per includere la sezione.
- **Selezione** (righe 226–241): si prendono sezioni con `score > 0` (o fino a 2 sezioni con score 0 come fallback), fino a `maxChars`. Si aggiunge **sempre la sezione per intero**, mai una sottosezione (es. solo “Attaccanti”).

Quindi: domande come “che stili per le punte?” o “ruoli attaccanti” fanno spesso match con “stili gioco” / “ruoli” → viene inclusa l’intera `## STILI DI GIOCO DEI GIOCATORI`, che contiene anche Collante (MED) e tutti gli stili centrocampo/difesa.

### 2.3 Istruzioni nel prompt (assistant-chat)

- **File**: `app/api/assistant-chat/route.js`
- **buildPersonalizedPrompt** (circa righe 316–324): quando c’è `efootballKnowledge` viene aggiunto:
  - “Per domande su eFootball: rispondi basandoti SOLO sul blocco sopra.”
  - “Non inventare meccaniche o nomi non presenti nel knowledge.”
  - “⚠️ STILI DI GIOCO FISSI: … NON suggerire MAI potenziare …”

**Cosa manca**: non c’è alcuna istruzione del tipo:
- “Per domande su attaccanti/punte usa solo gli stili sotto ‘Attaccanti’; non applicare stili da Centrocampisti (es. Collante) o Difensori.”
- “Rispetta la categoria di ruolo indicata nel knowledge (es. Collante è MED): non citarlo per ruoli ATT/P).”

Quindi il modello è vincolato al “blocco” e al “non inventare”, ma non al **filtro per ruolo** (ATT vs MED vs DEF).

### 2.4 System message (assistant-chat)

- **Righe**: 396–406  
- Ripete: stili fissi, non potenziare, usare solo il blocco “KNOWLEDGE eFootball” se presente, non inventare.  
- **Nessuna** menzione di “applicare gli stili solo al ruolo corretto” o “Collante solo centrocampisti”.

---

## 3. Contenuto RAG (info_rag.md)

- **Collante** è esplicitamente sotto `### Centrocampisti` e con etichetta **(MED)** (righe 107–110 di info_rag.md).
- **Punte/attaccanti**: stili descritti sotto `### Attaccanti` (Istinto di attacante, Opportunista, Rapace d’area, Fulcro, Classico 10, Regista creativo, Ala prolifica, Specialista cross, Senza palla).
- Il file è coerente: il “misuse” non nasce dal contenuto, ma dal fatto che (1) si invia tutto il blocco unico e (2) il prompt non impone il filtro per ruolo.

---

## 4. Conclusioni dell’audit

| Punto | Stato |
|-------|--------|
| RAG (info_rag.md) definisce ruoli in modo esplicito (Collante MED, stili attaccanti sotto ### Attaccanti) | ✅ OK |
| Parsing `lib/ragHelper.js` spezza solo per `##`; `###` non creano sezioni separate | ⚠️ Sezione “STILI” è un unico blob |
| `getRelevantSections` include **sezioni intere** in base a keyword; nessun filtraggio per sottosezione/ruolo | ⚠️ Domanda “punte” può portare a includere anche Collante |
| Prompt (user + system) dice “usa solo il blocco” e “non inventare”, ma **non** “applica stili solo al ruolo richiesto” | ❌ Mancanza critica per evitare Collante in contesto punte |

**Causa probabile del comportamento segnalato**: l’AI riceve l’intera sezione stili (con Collante incluso) e, in assenza di un’istruzione esplicita a rispettare la categoria di ruolo, può citare Collante anche quando l’utente chiede delle punte.

---

## 5. Raccomandazioni (solo analisi, non implementate)

1. **Prompt**: aggiungere nel blocco “KNOWLEDGE eFootball” (e/o nel system) un’istruzione esplicita:  
   - “Per domande su attaccanti/punte usa solo gli stili elencati sotto ‘Attaccanti’. Non citare stili da Centrocampisti (es. Collante) o Difensori per ruoli d’attacco. Rispetta sempre la categoria di ruolo (ATT/MED/DEF) indicata nel testo.”
2. **RAG**: valutare (in una fase successiva) di:
   - parsare anche `###` e esporre sottosezioni (es. “STILI – Attaccanti”, “STILI – Centrocampisti”, “STILI – Difensori”), oppure
   - aggiungere keyword per ruolo (es. “punte”, “attaccanti”) e logica che, quando matchano, includa solo il blocco “Attaccanti” della sezione stili (richiederebbe estensione di `getRelevantSections` o una funzione dedicata).

Questo audit è read-only: nessuna modifica al codice è stata applicata.
