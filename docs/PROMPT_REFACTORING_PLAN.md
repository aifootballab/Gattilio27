# Prompt Chat – Piano Refactoring Enterprise

**Versione:** 0.1 (draft)  
**Stato:** In discussione – da validare prima di implementare  
**File target:** `app/api/assistant-chat/route.js`  
**Data:** 2025-02-08

---

## 1. Obiettivo

Ridurre ridondanze, eliminare incoerenze e sostituire elenchi "non dire X" con **regole strutturate positive**, mantenendo comportamento del coach invariato.

---

## 2. Cosa togliere

### 2.1 Ridondanze da eliminare

| Cosa | Dove (approssimativo) | Motivo |
|------|------------------------|--------|
| Ripetizione "non dare istruzioni uso app" | SCOPE CHAT, DA DOVE PRENDI, VIETATO ASSOLUTO, REGOLE ORO, ERRORI DA EVITARE | Sostituire con 1 sola regola: **REGOLA APP** |
| Ripetizione "solo nomi dalla rosa" | PALETTI, REGOLE ORO, GIOCATORI, VIETATO ASSOLUTO, NOMI | Sostituire con 1 sola regola: **REGOLA NOMI** |
| Ripetizione "no ragionamento, solo consiglio" | buildPersonalizedPrompt §4, systemContent OUTPUT COACH | Sostituire con 1 sola regola: **REGOLA OUTPUT** |
| Ripetizione "competenza >= 70 per stile" | PALETTI, STILI ALLENATORE, Stili squadra RAG | Tenere 1 sola menzione |
| Ripetizione "contrattacco ≠ contropiede_veloce" | GIOCATORI, STILI ALLENATORE, Paletti RAG | Tenere 1 sola menzione |
| Ripetizione "In sintesi: [azione]" | OUTPUT COACH, TONO, FORMATO, esempi | Tenere 1 sola definizione |

### 2.2 Refusi da correggere

| Cosa | Nota |
|------|------|
| `non c\'è` → `non c'è` | Escape apostrofo superfluo |
| `l\'errore` → `l'errore` | Idem |

### 2.3 Parole / frasi da spostare (non cancellare)

| Cosa | Da | A |
|------|-----|---|
| "buildato", "slot" | LINGUAGGIO COACH (come esempi) | Sezione "termini da evitare" con motivazione |
| Esempi con "Pedri", "Bellingham" | Se usati come nomi fissi | Placeholder `[Nome]` o nomi dalla rosa di esempio |

---

## 3. Cosa mettere

### 3.1 Nuove regole strutturate (positive)

| Regola | Contenuto |
|--------|-----------|
| **REGOLA OUTPUT** | Rispondi con imperativo (Metti, Cambia, Usa). Max 3 frasi. Chiusura: "In sintesi: [azione]". Nessun preambolo analitico. |
| **REGOLA APP** | Per domande su caricamento, wizard, menu → risposta fissa: "Sono qui solo per consigli tattici. Esplora il menu." |
| **REGOLA NOMI** | Usa solo nomi presenti in TITOLARI/RISERVE forniti. Mai inventare giocatori. |
| **REGOLA DATI** | Statistiche e stili sono fissi. Puoi solo suggerire chi usare, dove, che istruzioni. Mai "potenziare/allenare". |
| **REGOLA SINERGIA** | La sinergia si deduce da ruoli/stili. Suggerisci sostituzioni concrete: "Metti [X] al posto di [Y] per sinergia." |
| **REGOLA GAMEPLAY** | Descrivi azioni tattiche (es. "segui l'avversario a passetti"). Mai tasti, pulsanti, controller. |
| **REGOLA TEMPO** | Consigli generali ok. Vietati consigli "al minuto X" o durante partita in corso. |

### 3.2 Struttura proposta del prompt

```
1. SCOPE          – Cosa fa la chat (consulenza tattica eFootball)
2. FONTI          – Da dove prendere i dati (ROSA E DATI, MECCANICHE)
3. REGOLA OUTPUT  – Formato risposta (imperativo, max 3 frasi, "In sintesi:", no ragionamento)
4. REGOLA NOMI    – Solo giocatori dalla rosa
5. REGOLA STILI   – Terminologia ufficiale, contrattacco vs contropiede, Resistenza/Stamina IT/EN
6. REGOLA APP     – Redirect per domande su uso app
7. VIETI          – Elenco breve e non ridondante
8. FORMATO SUGGERIMENTI – 3 domande (verticale, gameplay, meta)
```

---

## 4. Cosa sostituire

### 4.1 "Non dire X" → regole positive

| "Non dire" attuale | Sostituzione |
|--------------------|--------------|
| NON "Analizzando...", "Potresti considerare...", "Dato che hai..." | **REGOLA OUTPUT**: imperativo, no preamboli |
| NON istruzioni uso app | **REGOLA APP** |
| NON "potenziare/migliorare/allenare" | **REGOLA DATI** |
| NON inventare nomi | **REGOLA NOMI** |
| NON "carica partita per sinergia" | **REGOLA SINERGIA** |
| NON "cerca/filtra giocatori" | **REGOLA APP** / **REGOLA NOMI** |
| NON tasti/pulsanti | **REGOLA GAMEPLAY** |
| NON "cosa fare adesso" live | **REGOLA TEMPO** |

### 4.2 Chiarimenti incoerenze

| Problema | Sostituzione |
|----------|--------------|
| "Resistenza (non Stamina)" vs BILINGUE "Stamina" per EN | Chiarire: IT = Resistenza, EN = Stamina (stesso concetto) |
| "NON Pressing Alto come stile" vs pressing gameplay | Distinguere: stile squadra "Pressing Alto" no; pressing tattico ok |
| "Collante per attaccanti" | Collante è MED: riformulare per chiarezza (es. "stili MED non vanno su attaccanti") |
| "domanda approfondimento" vs "domanda verticale" | Unificare termine in **FORMATO SUGGERIMENTI** |

---

## 5. Cosa mantenere invariato

- Contenuto RAG (`info_rag.md`, `ragHelper.js`)
- Logica `buildPersonalContext`, `buildPersonalizedPrompt`
- Esempi corretti/errati (struttura), eventualmente con placeholder nomi
- Regole suggerimenti community (abilità obbligatorie, passaggi, avvertimenti)
- Scope: solo eFootball, output coach, no calcio reale

---

## 6. Decisioni da prendere

1. **Dove mettere le regole?**  
   System vs User prompt? Una sezione unica o distribuita?

2. **Esempi con nomi reali o placeholder?**  
   `[Nome]` vs "Pedri" quando Pedri non è in rosa di esempio?

3. **Lunghezza target**  
   Obiettivo: ridurre token mantenendo chiarezza. Taglio % stimato?

4. **Priorità ordine interventi**  
   Fare prima correzioni refusi + ridondanze, poi regole strutturate? O tutto in un unico pass?

---

## 7. Prossimi passi (dopo validazione)

1. [ ] Validare questo piano con il team / utente
2. [ ] Decidere ordine interventi
3. [ ] Implementare modifiche in `route.js`
4. [ ] Test conversazioni campione
5. [ ] Aggiornare versione prompt se necessario
