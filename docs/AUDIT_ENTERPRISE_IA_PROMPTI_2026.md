# Audit Enterprise – Documenti e Prompt IA (Febbraio 2026)

**Oggetto**: Verifica riga per riga di tutto ciò che serve all'IA: documenti RAG, prompt chat, contromisure, analyze-match. Coerenza, ridondanze, terminologia, meccaniche.

---

## 1. INCOERENZE E ERRORI TROVATI

### 1.1 info_rag.md
| Riga | Problema | Azione |
|------|----------|--------|
| 15 | **FIASSE** → typo | Correggere in **FISSE** |
| 466 | "Oppure **cerca** una card che le abbia già native" | Contraddice regola "NON suggerire MAI di cercare/filtrare". Correggere: "Oppure schiera una card che le abbia già native (dalla rosa)." |

### 1.2 assistant-chat route.js – System message
| Riga | Problema | Azione |
|------|----------|--------|
| 758 | BILINGUE: "Se inglese usa ... Poacher, Stamina" | In conflitto con TERMINOLOGIA "Opportunista (non Poacher), Resistenza (non Stamina)". Per IT: Opportunista, Resistenza. Per EN: usare termini ufficiali eFootball EN se diversi. Verificare: in eFootball EN il gioco usa "Poacher" e "Stamina" – quindi BILINGUE è coerente per risposta EN. |

### 1.3 countermeasuresHelper.js
| Riga | Problema | Azione |
|------|----------|--------|
| 82, 224 | **FORMazione** (typo) | Correggere in **Formazione** |
| - | COUNTERMEASURES_SECTION_TITLES **non include §10 NOTE CRITICHE** | Contromisure non riceve regole "no passaggi corti/cross come istruzioni", terminologia ufficiale. Aggiungere §10. |

### 1.4 ragHelper.js – EFOOTBALL_TERMS
| Riga | Problema | Azione |
|------|----------|--------|
| 393 | 'difensore distruttore' in EFOOTBALL_TERMS | Utente ha detto che non esiste. Mantenere per match query utente che usa quel termine → risposta con Incontrista. Opzionale: rimuovere se si preferisce non matcherlo. |

---

## 2. RIDONDANZE IDENTIFICATE

### 2.1 assistant-chat – Duplicazioni
- **VIETATO ASSOLUTO**: presente in system E in user prompt (righe 434-436 e 523-531). → Consolidare: tenere solo in system (più corto) e nel user prompt un richiamo "Vedi VIETATO ASSOLUTO in system".
- **Stili = comportamento**: ripetuto in STEP 2 RAGIONARE, RAGIONA SEMPRE, PALETTI tabella, REGOLE MECCANICHE. → Ridurre a 2 occorrenze max (protocollo + paletti).
- **Terminologia ufficiale** (Opportunista, Resistenza, ecc.): in system TERMINOLOGIA, in STEP 3 PALETTI, in REGOLE ORO, in NOTE CRITICHE RAG. → Una sola definizione chiara, altri riferimenti brevi.
- **COME CERCARE E RAGIONARE** vs **CERCARE OBBLIGATORIO** (system): sovrapposizione. → Unificare in un unico blocco.

### 2.2 countermeasuresHelper vs chat
- Regole "NON suggerire azioni durante partita", "card digitali", "NON allenare" sono in entrambi. → OK, contesti diversi (pre-partita vs chat), coerenza necessaria.
- Istruzioni individuali: chat ha paletto "NO passaggi corti/cross"; countermeasures non riceve §10 quindi potrebbe inventarle. → Aggiungere §10 a countermeasures RAG.

---

## 3. TERMINOLOGIA – Verifica incrociata

| Termine | info_rag | Chat system | Chat user | countermeasures |
|---------|----------|-------------|-----------|-----------------|
| Opportunista | ✓ §2, §10 | ✓ | ✓ | - |
| Poacher | §10 "non usare" | BILINGUE EN | - | - |
| Resistenza | ✓ §1 "NON Stamina" | ✓ | ✓ | - |
| Rapace d'area | ✓ con apostrofo | ✓ | ✓ | - |
| Box-to-Box / Onnipresente | ✓ distinti | ✓ | ✓ | - |
| Incontrista | ✓ | ✓ (stili MED) | ✓ | - |
| Costruttore / Difensore distruttore | §10 "NON usare" | - | - | - |
| Istruzioni sez. 5 | ✓ §5, §10 | ✓ | ✓ | Implicito (RAG sez. 5) |
| No passaggi corti/cross | ✓ §10 | ✓ | ✓ | **Manca** (no §10) |

---

## 4. MECCANICHE – Coerenza RAG ↔ Prompt

### 4.1 Sezioni RAG
- **Chat** (classifyQuestion=efootball): getRelevantSections(message) → sezioni per keyword, include §10.
- **Contromisure**: getRelevantSectionsForContext('countermeasures') → sezioni 1-9, **esclude §10**.
- **Analyze-match**: getRelevantSectionsForContext('analyze-match') → sezioni 1-10, include §10.

**Gap**: Contromisure non riceve §10 → possibile incoerenza su istruzioni inventate, terminologia.

### 4.2 Flusso dati
- Chat: message → classifyQuestion → [efootball] getRelevantSections; [personal] buildPersonalContext.
- Contromisure: opponent formation + roster + coach + history → generateCountermeasuresPrompt; RAG da getRelevantSectionsForContext('countermeasures').
- Analyze-match: match data + RAG da getRelevantSectionsForContext('analyze-match').

---

## 5. AZIONI CORRETTIVE (priorità)

1. **info_rag**: Correggere FIASSE → FISSE; correggere "cerca una card" → "schiera una card dalla rosa".
2. **ragHelper**: Aggiungere §10 a COUNTERMEASURES_SECTION_TITLES.
3. **countermeasuresHelper**: Correggere FORMazione → Formazione.
4. **assistant-chat**: Opzionale – ridurre ridondanze consolidando VIETATO e RAGIONA in meno occorrenze (mantenere chiarezza).

---

## 6. CHECKLIST POST-AUDIT

- [x] info_rag: FIASSE → FISSE corretto
- [x] info_rag: "cerca una card" → "schiera una card dalla rosa" corretto
- [x] ragHelper: §10 aggiunto a COUNTERMEASURES_SECTION_TITLES
- [x] countermeasuresHelper: FORMazione → Formazione corretto
- [x] Ridondanza: rimosso blocco RAGIONA SEMPRE duplicato prima PALETTI
