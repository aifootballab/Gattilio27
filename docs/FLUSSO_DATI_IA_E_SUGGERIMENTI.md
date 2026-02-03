# Flusso dati IA e gestione suggerimenti

**Data**: 2 Febbraio 2026  
**Obiettivo**: Documentare come l'IA riceve i dati e come possiamo migliorare la qualità dei suggerimenti.

---

## 1. COME L'IA PRENDE I DATI

### 1.1 CHAT (assistant-chat)

```
messaggio utente
    ↓
classifyQuestion(message)  →  'efootball' | 'platform'
    ↓ (se efootball)
getRelevantSections(message, 18000)
    ↓
scoreSection(sezione, messaggio)  →  conta keyword della sezione presenti nel messaggio
    ↓
sezioni ordinate per score (alte → basse)
    ↓
seleziona fino a maxChars (18000), score>0 o almeno 2 sezioni
    ↓
sempre aggiunta §10 NOTE CRITICHE se non presente
    ↓
per §2 STILI GIOCATORE: getStiliContentFilteredByRole(message, content)
    → se messaggio chiaramente su attaccanti/centrocampisti/difensori → solo quel blocco
    → altrimenti → contenuto completo
    ↓
concatenazione: ## TITOLO\n\nCONTENUTO\n\n---\n\n
    ↓
iniettato nel user prompt come "📚 MECCANICHE eFootball"
```

**Contesto personale (rosa, partite)**:
```
needsPersonalContext(message)  →  true se contiene termini tipo "rosa", "formazione", "mi consigli"
    ↓
buildPersonalContext(userId)  →  titolari, riserve, formazione, allenatore, partite, card_type
    ↓
iniettato come "📊 ROSA E DATI"
```

**Prompt finale inviato all'IA**:
- `systemContent`: regole, SCOPE, paletti, terminologia, formato
- `history`: ultimi messaggi
- `user`: contesto + ROSA (se caricata) + MECCANICHE eFootball (se efootball) + PALETTI + messaggio cliente

---

### 1.2 CONTROMISURE

```
formazione avversaria + rosa cliente + allenatore + history
    ↓
getRelevantSectionsForContext('countermeasures', 12000)
    ↓
sezioni FISSE (1-10) in ordine, fino a maxChars
    ↓
nessun filtro keyword: TUTTE le sezioni info_rag
    ↓
iniettato come "MEMORIA ATTILA - eFootball" nel prompt
```

L'IA riceve sempre l'intero RAG (fino a 12k caratteri) + formazione avversaria + rosa cliente.

---

### 1.3 ANALYZE-MATCH

Come Contromisure: `getRelevantSectionsForContext('analyze-match', 12000)` → sezioni 1-10 fisse + dati partita caricata.

---

## 2. PUNTI CRITICI PER I SUGGERIMENTI

### 2.1 CHAT: selezione per keyword

| Problema | Conseguenza |
|----------|-------------|
| Se l'utente chiede "che formazione mi consigli?" | keyword "formazione" → §3 MODULI. Potrebbe NON caricare §2 (stili giocatore) o §4 (stili squadra). L'IA suggerisce modulo senza sapere "Opportunista va bene per contropiede". |
| Se l'utente chiede "chi metto al posto di X?" | "metto", "posto" → forse nessuna keyword §2/§4. Fallback: prime 4 sezioni. Non garantito §2. |
| Domanda generica "cosa fare per migliorare?" | keyword vaghe. Potrebbe caricare sezioni sbagliate. |

**Soluzione**: Espandere `SECTION_KEYWORDS` e `PERSONAL_CONTEXT_TERMS` per domande di consiglio:
- "mi consigli", "cosa fare", "come migliorare", "che formazione", "chi metto" → caricare §2, §3, §4, §10
- "quando serve", "perché" → non sono keyword attuali; le descrizioni ricche nel RAG contengono "quando serve" ma la sezione va comunque caricata

### 2.2 CHAT: filtro per ruolo (§2 Stili)

Se messaggio contiene "punta" o "attaccante" → solo blocco **Attaccanti** di §2.  
L'IA NON vede Collante, Box-to-Box in quella risposta. Corretto: evita di citare Collante per punte.

Se messaggio è "che stile mi serve per contropiede?" → nessun ruolo chiaro → **contenuto completo** §2. OK.

### 2.3 Contromisure / Analyze-match: RAG completo

Ricevono tutte le sezioni. Il problema qui non è il caricamento ma:
- **Qualità del contenuto**: le descrizioni "quando serve", "perché" devono essere nel RAG
- **Ordine e lunghezza**: "lost in the middle" – sezioni centrali potrebbero essere meno considerate. Struttura chiara con ## aiuta.

### 2.4 Rosa vs RAG: incrocio dati

L'IA riceve:
- **Rosa**: `Messi | CF | 94 | Opportunista | card: Trending | ...`
- **RAG §2**: "Opportunista: efficace per gioco veloce e contropiede, quando serve passaggi filtranti"

Per suggerire "Metti Messi in punta, va bene per contropiede" l'IA deve:
1. Leggere dalla rosa: Messi ha stile Opportunista
2. Leggere dal RAG: Opportunista efficace per contropiede
3. Incrociare: Messi + Opportunista + stile squadra Contropiede → consiglio coerente

**Se il RAG non ha "quando serve" / "perché"** → l'IA non sa collegare Opportunista a Contropiede → suggerimento generico o errato.

---

## 3. COSA SERVE PER SUGGERIMENTI CORRETTI

| Livello | Cosa serve | Dove |
|---------|------------|------|
| **Contenuto RAG** | Descrizioni ricche: posizionamento, movimento, **quando serve**, **perché** | info_rag.md §2, §4, §8 |
| **Keyword Chat** | Termini che caricano le sezioni giuste quando l'utente chiede consigli | ragHelper SECTION_KEYWORDS |
| **Contesto personale** | Caricare rosa quando la domanda implica consiglio su formazione/sostituzioni | ragHelper PERSONAL_CONTEXT_TERMS |
| **Prompt** | Istruzioni chiare: "cerca in MECCANICHE, incrocia con ROSA" | route.js buildPersonalizedPrompt |

---

## 4. AZIONI CONSIGLIATE

### 4.1 Info_rag: descrizioni ricche

Integrare in ogni stile giocatore / stile squadra / abilità:
- **Quando serve**
- **Perché** (vantaggio)
- **Con quali** (stile squadra, ruolo, modulo)

Vedi `ANALISI_BRAINSTORM_RIGA_PER_RIGA.md` – Regola descrizioni ricche.

### 4.2 SECTION_KEYWORDS: espansione per consigli

Aggiungere a §2, §4, §8 (e §10) keyword che attivano il caricamento quando l'utente chiede consigli generici:

- "consigli", "suggerimenti", "mi consigli", "cosa fare", "come migliorare"
- "che formazione", "che modulo", "chi metto", "chi schiero"
- "quale stile", "che punta", "che mediano"

Così una domanda tipo "cosa mi consigli?" carica le sezioni giuste.

### 4.3 PERSONAL_CONTEXT_TERMS

Verificare che termini come "mi consigli", "cosa fare", "formazione", "sostituzioni" attivino `needsPersonalContext` → caricamento rosa. Senza rosa, l'IA non può personalizzare.

### 4.4 Paletti e istruzioni

Il prompt dice già "CERCARE OBBLIGATORIO: Prima di consigliare, cerca nei blocchi (ROSA, MECCANICHE), incrocia dati".

Rinforzare: "Per suggerire uno stile o un modulo, usa le descrizioni 'quando serve' e 'perché' dalle sezioni MECCANICHE."

---

## 5. RIEPILOGO FLUSSO

```
CHAT:
  messaggio → classifyQuestion → [efootball] getRelevantSections(keyword) → sezioni RAG
  messaggio → needsPersonalContext → [sì] buildPersonalContext → rosa
  prompt = system + history + (ROSA + MECCANICHE + PALETTI) + messaggio
  IA risponde usando SOLO dati da ROSA e MECCANICHE

CONTROMISURE:
  formazione avversaria + rosa → getRelevantSectionsForContext(countermeasures) → RAG completo
  prompt = system + (avversario + rosa + RAG) + istruzioni
  IA suggerisce contromisure

ANALYZE-MATCH:
  dati partita → getRelevantSectionsForContext(analyze-match) → RAG completo
  prompt = system + (partita + RAG) + istruzioni
  IA analizza e suggerisce
```

---

*Fine documento. Per integrazioni RAG vedi ANALISI_BRAINSTORM_RIGA_PER_RIGA.md.*
