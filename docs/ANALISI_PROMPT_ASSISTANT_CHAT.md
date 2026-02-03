# Analisi Prompt Assistant Chat

**Data**: 3 Febbraio 2026  
**Obiettivo**: Analizzare struttura, coerenze e margini di miglioramento del prompt chat.

---

## 1. Struttura attuale

| Blocco | Dove | Contenuto |
|--------|------|-----------|
| **System** | route.js ~856-895 | SCOPE, BILINGUE, FONTI DATI, CERCARE OBBLIGATORIO, TERMINOLOGIA, TONO, VIETATO, POSIZIONI, STILI SQUADRA, ISTRUZIONI, ABILITÀ, SUGGERIMENTI |
| **User prompt** | buildPersonalizedPrompt | CONTESTO, ROSA E DATI, COME CERCARE E RAGIONARE, MECCANICHE (se RAG), DA DOVE PRENDI I DATI, FUNZIONALITÀ APP, TONO, ESEMPI, VIETATO, FORMATO RISPOSTA |
| **RAG** | getRelevantSections | Sezioni info_rag per keyword (include §10) |
| **Contesto personale** | buildPersonalContext | Rosa, partite, tattica, allenatore, skills, pattern |

---

## 2. Problemi individuati

### 2.1 Contraddizione tono
- **User prompt** (linee 592-594): "Evita toni informali ("Proviamo così", "Ottima domanda"); evita lunghe spiegazioni"
- **System** (linee 868-869): "Puoi usare un breve incoraggiamento ("Ottima domanda", "Proviamo così:") se naturale"
→ **Conflitto**: l'uno vieta, l'altro permette.

### 2.2 Ala prolifica (creare vs ricevere)
- Audit recente: l'IA ha detto "creare passaggi filtranti" per Ala prolifica.
- **info_rag** corretto con "ricevere".
- **Prompt**: nessun richiamo esplicito. Rischio che l'IA non applichi la regola.
→ **Azione**: aggiungere in TERMINOLOGIA o paletti stili.

### 2.3 Confidence % sui suggerimenti
- Richiesta utente: "con accuratezza e metti la % quando sono suggerimenti".
- **Prompt attuale**: "In sintesi: [azione]" senza %.
→ **Azione**: rendere opzionale "In sintesi: [azione] (~X%)" quando appropriato.

### 2.4 appState incompleto
- **stateContext** controlla `uploadingPlayer`, `completingMatch`.
- **allowedAppStateKeys**: `completingMatch` ok, `uploadingPlayer` **manca**.
→ **Azione**: aggiungere `uploadingPlayer` a allowedAppStateKeys.

### 2.5 Ridondanze (già segnalate in AUDIT_ENTERPRISE)
- VIETATO in system + user.
- Stili/comportamento ripetuto più volte.
→ **Valutazione**: ridondanza utile per enforcement; mantenere ma evitare contraddizioni.

---

## 3. Miglioramenti proposti

| # | Miglioramento | Priorità | Impatto |
|---|---------------|----------|---------|
| 1 | Allineare tono (system vs user): unificare "amichevole e professionale" | Alta | Coerenza |
| 2 | Aggiungere Ala prolifica: "RICEVERE passaggi (non creare)" in paletti/terminologia | Alta | Qualità risposta |
| 3 | Opzionale %: "In sintesi: [azione] (~X%)" quando suggerimento tattico | Media | UX |
| 4 | Aggiungere uploadingPlayer a allowedAppStateKeys | Bassa | Completezza |
| 5 | Paletti tabella: riga Stili giocatore con "Ala prolifica: ricevere" | Alta | Qualità |

---

## 4. Ordine applicazione

1. Unificare tono (rimuovere contraddizione)
2. Aggiungere regola Ala prolifica in system TERMINOLOGIA
3. Aggiungere Ala prolifica in tabella paletti (riga Stili giocatore)
4. Rendere opzionale % in "In sintesi"
5. Aggiungere uploadingPlayer ad allowedAppStateKeys
