# Piano Prompt / RAG e Allineamento con Memoria Attila

**Ruolo**: Project Manager + Full‑stack Engineer  
**Scopo**: Definire cosa va in prompt vs RAG, e come tenere allineati Memoria Attila ↔ info_rag.md ↔ assistant-chat (prompt).

---

## 1. Matrice: dove vive ogni tipo di informazione

| Tipo di informazione | Dove vive | Chi la legge | Note |
|---------------------|-----------|--------------|------|
| **Regole di comportamento AI** (tono, formato, vietati) | **Prompt** (route.js: system + buildPersonalizedPrompt) | Sempre in ogni richiesta | Brevi, invariate. Es.: "Max 3 frasi", "In sintesi", "Non inventare nomi". |
| **Regole di gioco eFootball** (statistiche, stili, moduli, istruzioni, abilità, limiti) | **RAG** (info_rag.md) | Solo se `classifyQuestion(message) === 'efootball'` | Fonte di verità. Caricata a blocchi via `getRelevantSections(message)`. |
| **Regole critiche per l’IA** (errori da evitare, terminologia, esempi) | **RAG** – sezione "10. NOTE CRITICHE PER L'IA" | Inclusa quando si carica RAG (se c’è spazio) | Sempre inclusa dal ragHelper se almeno una sezione RAG è caricata. |
| **Contesto utente** (rosa, partite, tattica, allenatore) | **Prompt** – blocco “CONTESTO PERSONALE” | Solo se `needsPersonalContext(message)` | buildPersonalContext(userId). |
| **Memoria Attila** (ripulita) | **MEMORIA_ATTILA_BRAINSTORM.md** | Solo Cursor/te per brainstorming | **Non** letta da API/RAG. Serve per allineare e verificare. |

---

## 2. Cosa va in PROMPT (sempre o condizionato)

### 2.1 System message (sempre)

- Ruolo: Coach AI, lingua.
- Tono: diretto, breve, operativo; max 3 frasi + "In sintesi: ...".
- Vietati: "potenziare", "migliorare", "allena"; inventare nomi.
- Posizioni: non suggerire ruoli incoerenti con la card (usare competenze/position).
- Istruzioni: solo le 7 valide; **Ancoraggio max 2 giocatori**.
- Abilità: native = card; aggiuntive = Programmi (solo se NON Trending).
- Suggerimenti: 2 stesso tema + 1 altro tema.

### 2.2 Prompt utente – blocchi fissi (sempre)

- Contesto (pagina, domanda breve).
- Funzionalità app (Dashboard, Gestione Formazione, Aggiungi Partita, ecc.).
- Contesto videogioco (card digitali, statistiche fisse).
- Tono e formato risposta (esempi corretti/errore, blocco SUGGERIMENTI).

### 2.3 Prompt utente – blocchi condizionali

- **Contesto personale** (rosa, partite, tattica, allenatore): solo se `needsPersonalContext(message)`.
- **Regole oro** (posizione ideale vs assegnata, sinergia, rosa vuota, stili fissi, moduli, allenatore): solo se c’è contesto personale.
- **Blocco RAG** ("MECCANICHE eFootball" + testo da info_rag): solo se `classifyQuestion(message) === 'efootball'`.

Regola pratica: **nel prompt non duplicare elenchi lunghi** (statistiche, stili, moduli, abilità). Quelli stanno in info_rag; nel prompt restano solo **sintesi e vincoli** (es. "Solo istruzioni sezione 5", "Ancoraggio max 2", "Abilità native/aggiuntive").

---

## 3. Cosa va in RAG (info_rag.md)

- **Fonte di verità** per tutto ciò che è “contenuto eFootball”:
  - Contesto videogioco (card, fisso vs modificabile).
  - Statistiche giocatori (nomi ufficiali, categorie).
  - Stili di gioco (con posizioni compatibili) + Stili IA.
  - Moduli tattici.
  - Stili tattici di squadra (+ allenatore).
  - Istruzioni individuali (elenco + **Ancoraggio max 2**).
  - Calci piazzati.
  - Meccaniche di gioco avanzate (comandi, finte, ecc.).
  - Abilità giocatori (native/aggiuntive, Programmi, Trending, max 6).
  - Competenze e sviluppo (tipologie, VG, competenza posizione, max 2 slot).
  - **Sezione 10 – NOTE CRITICHE PER L'IA**: errori comuni, terminologia, esempi corretti.

Il ragHelper:
- Seleziona le sezioni in base alle **keyword** del messaggio (`SECTION_KEYWORDS`).
- Inserisce **sempre** la sezione "10. NOTE CRITICHE PER L'IA" quando viene caricato almeno un blocco RAG (se c’è spazio).

---

## 4. Allineamento Memoria Attila ↔ info_rag ↔ Prompt

Usare **MEMORIA_ATTILA_BRAINSTORM.md** come riferimento per coerenza con le regole di gioco. Controllare che non ci siano contraddizioni.

### 4.1 Statistiche giocatori

| Memoria Attila | info_rag | Prompt |
|----------------|----------|--------|
| Elenco offensive/difensive/portieri/speciali | §1 Statistiche (dettaglio) | Non ripetere elenco; “statistiche fisse” e “non migliorabili” |
| **Allineato** | **Allineato** | **Allineato** |

### 4.2 Stili di gioco (senza palla) + Stili IA

| Memoria Attila | info_rag | Prompt |
|----------------|----------|--------|
| Nomi + posizioni compatibili (P, MED, CC, TD/TS, DC, PT) | §2 Stili + Stili IA | “Stili fissi, non modificabili”; “stili per ruolo” (non mescolare attaccanti/difensori) |
| **Allineato** | **Allineato** | **Allineato** |

### 4.3 Modifica posizione – limiti di gioco

| Memoria Attila | info_rag | Prompt |
|----------------|----------|--------|
| A: 1–5 (max 2 P, 1 EDA/ESA); C: 1–6 (max 1 CLD/CLS); D: 2–5 (max 3 DC, 1 TD/TS); PT non modificabile | Non presente come sezione dedicata in info_rag | Usato implicitamente: “non suggerire ruolo fuori dalle competenze” |
| **Azione** | Aggiungere in info_rag (es. in §3 o nuova sottosezione) una riga: **Limiti formazione**: Attacco 1–5 (max 2 P, 1 EDA/ESA), Centrocampo 1–6 (max 1 CLD/CLS), Difesa 2–5 (max 3 DC, 1 TD/TS), Portiere non modificabile. | Opzionale: una frase in “Regole meccaniche” se serve richiamo esplicito. |

### 4.4 Forza base / Forza complessiva

| Memoria Attila | info_rag | Prompt |
|----------------|----------|--------|
| Forza base = somma abilità; Forza complessiva = + alchimia, competenza posizione, stile | Non presente in info_rag | Non necessario nel prompt chat |
| **Azione** | Opzionale: aggiungere 2 righe in §9 o in “Contesto videogioco” se vuoi che l’AI possa spiegare la differenza. | — |

### 4.5 Stile di gioco di squadra e allenatore

| Memoria Attila | info_rag | Prompt |
|----------------|----------|--------|
| 5 stili base + estesi (offensivi/difensivi/costruzione/speciali); allenatore influenza competenza | §4 Stili tattici squadra | “Competenza >= 70 consigliabile”; “se rosa/allenatore incoerenti → cambio stile o allenatore” |
| **Allineato** | **Allineato** | **Allineato** |

### 4.6 Valore giocatore (VG) e tipologie

| Memoria Attila | info_rag | Prompt |
|----------------|----------|--------|
| VG fino a 5★; Trending = statistiche iniziali; altri = statistiche + potenziale | §9 Competenze e sviluppo | “Trending non possono ricevere abilità aggiuntive” (ripetuto in system + RAG) |
| **Allineato** | **Allineato** | **Allineato** |

### 4.7 Competenze posizione

| Memoria Attila | info_rag | Prompt |
|----------------|----------|--------|
| Basso/Intermedio/Alto; max 2 slot; Programmi Aggiunta Posizione; Trending no; sovrascrittura | §9 Competenza posizione | Contesto personale include “competenze” (original_positions); regola “posizione ideale vs assegnata” |
| **Allineato** | **Allineato** | **Allineato** |

### 4.8 Moduli tattici

| Memoria Attila | info_rag | Prompt |
|----------------|----------|--------|
| 4 difensori: 4-3-3, 4-2-3-1, …; 3 difensori: 3-5-2, …; 5 difensori: 5-3-2, … | §3 Moduli tattici | “Proponi solo se hai giocatori compatibili” |
| **Allineato** | **Allineato** | **Allineato** |

### 4.9 Calci piazzati

| Memoria Attila | info_rag | Prompt |
|----------------|----------|--------|
| Punizioni, corner, difesa (elenchi) | §6 Calci piazzati | Non necessario nel prompt |
| **Allineato** | **Allineato** | — |

### 4.10 Istruzioni individuali + Ancoraggio

| Memoria Attila | info_rag | Prompt |
|----------------|----------|--------|
| Non dettagliato in Memoria; in gioco **Ancoraggio max 2** | §5 Istruzioni + nota Ancoraggio max 2 | System: “Ancoraggio (max 2 giocatori)”; Regole meccaniche: “Ancoraggio massimo 2 giocatori…” |
| **Allineato** | **Allineato** | **Allineato** |

### 4.11 Abilità (native vs aggiuntive, Programmi, Trending)

| Memoria Attila | info_rag | Prompt |
|----------------|----------|--------|
| Passaggio di prima, Leader, Doppio tocco speciale; Programmi Aggiunta Abilità; Trending no | §8 Abilità + §10 NOTE CRITICHE | “Native=card; aggiuntive=tramite Programmi (solo se NON Trending)” |
| **Allineato** | **Allineato** | **Allineato** |

### 4.12 Comandi / meccaniche (tiro sensazionale, pressing, uno-due, ecc.)

| Memoria Attila | info_rag | Prompt |
|----------------|----------|--------|
| Sintesi comandi (R2, L1+X, ⚪, R1, protezione, dribbling precisione) | §7 Meccaniche di gioco avanzate | Non necessario nel prompt (RAG basta) |
| **Allineato** | **Allineato** | — |

---

## 5. Azioni consigliate (PM + Engineer)

1. **info_rag.md**  
   - Aggiungere **limiti formazione** (Attacco/Centrocampo/Difesa/Portiere) in §3 MODULI TATTICI o in una sottosezione “Limiti di schieramento”, allineata alla Memoria Attila.

2. **info_rag.md** (opzionale)  
   - Aggiungere 1–2 righe su **Forza base** e **Forza complessiva** se vuoi che l’AI possa spiegarle quando chiesto.

3. **Prompt (route.js)**  
   - Nessun cambiamento strutturale necessario. System e “Regole meccaniche” sono già allineati a Memoria Attila e info_rag (Ancoraggio max 2, abilità native/aggiuntive, posizione ideale vs assegnata).

4. **ragHelper.js**  
   - Verificare che in `SECTION_KEYWORDS` ci siano keyword per “limiti formazione” / “modifica posizione” se aggiungi quella parte in info_rag (es. sotto §3).

5. **Memoria Attila**  
   - Tenere **MEMORIA_ATTILA_BRAINSTORM.md** come riferimento per future espansioni (es. nuove istruzioni, nuovi stili). Ogni modifica a regole di gioco: aggiornare prima Memoria Attila, poi info_rag e prompt se necessario.

---

## 6. Flusso dati (riferimento rapido)

```
[Utente] messaggio
    → classifyQuestion(message)  →  'efootball' | 'app' | 'other'
    → needsPersonalContext(message)  →  true | false

Se 'efootball':
    → getRelevantSections(message, 18000)  →  sezioni da info_rag.md (inclusa §10 NOTE CRITICHE se c’è spazio)
    → efootballKnowledge iniettato in buildPersonalizedPrompt(…, efootballKnowledge, …)

Se needsPersonalContext:
    → buildPersonalContext(userId)  →  formazione, rosa (position + competenze), partite, tattica, allenatore
    → personalContextSummary iniettato in buildPersonalizedPrompt(…, personalContextSummary, …)

buildPersonalizedPrompt costruisce il prompt utente (contesto, regole oro se c’è contesto personale, blocco RAG se presente, funzionalità app, tono, formato, SUGGERIMENTI).

System message: sintesi fissa (tono, vietati, posizioni, istruzioni, Ancoraggio max 2, abilità, suggerimenti).
```

---

**Versione**: 1.0  
**Data**: 30 Gennaio 2026  
**Principio**: Una fonte di verità per le regole di gioco (info_rag); prompt snello con regole di comportamento; Memoria Attila per allineamento e brainstorming, non letta dal sistema.
