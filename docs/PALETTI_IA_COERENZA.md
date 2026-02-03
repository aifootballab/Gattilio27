# Paletti IA – Coerenza tra Chat, Analyze-Match e Contromisure

**Data**: 3 Febbraio 2026  
**Obiettivo**: Verificare che i vincoli dell’IA siano coerenti nelle 3 situazioni (Chat, Post-partita, Contromisure pre-partita).

---

## 1. Dove vivono i paletti

| Situazione | File | Momento |
|------------|------|---------|
| **Chat** | `app/api/assistant-chat/route.js` | Qualsiasi (system + user prompt) |
| **Post-partita** | `app/api/analyze-match/route.js` | Analisi partita giocata |
| **Contromisure** | `lib/countermeasuresHelper.js` | Pre-partita (suggerimenti tattici) |
| **RAG (condiviso)** | `info_rag.md` §10 NOTE CRITICHE | Caricato in Chat quando domanda eFootball |

---

## 2. Paletti comuni (tutte e 3 le situazioni)

| Paletto | Chat | Analyze | Contromisure |
|---------|------|---------|--------------|
| **Card digitali** – no esperienza/carriera/maturità | ✅ | ✅ | ✅ |
| **Statistiche FISSE** – no allenare/potenziare/migliorare | ✅ | ✅ | ✅ |
| **Solo nomi dalla rosa** – no inventare giocatori | ✅ | ✅ | ✅ |
| **Competenze allenatore** – stili con competenza >= 70, mai < 50 | ✅ | ✅ | ✅ |
| **Caratteristiche ≠ Performance** – skills/stats ≠ azioni nel match | ✅ | ✅ | ✅ |
| **Non inferire cause** – win rate, competenze, pattern ≠ causa | ✅ | ✅ | ✅ |
| **NON inventare** – solo dati forniti | ✅ | ✅ | ✅ |

---

## 3. Paletti specifici per contesto

### 3.1 Chat (assistant-chat)

| Paletto | Dove |
|---------|------|
| **COERENZA PERIMETRO** – pre/post partita; NON azioni durante partita | system |
| **Bilingue** – termini IT/EN nella lingua risposta | system |
| **FONTI DATI** – rosa da ROSA E DATI, regole da MECCANICHE eFootball | system + user |
| **Sinergia** – suggerisci tu, MAI "carica partita per vedere sinergia" | REGOLE ORO |
| **Istruzioni** – solo sez. 5 (Offensivo, Difensivo, Ancoraggio max 2, Marcatura, Contropiede, Linea bassa) | user + system |
| **Abilità** – solo sez. 8; Trending no Programmi | user + system |
| **NON inventare** passaggi corti/cross come istruzioni | user |
| **NON suggerire** cerca/filtra/compra giocatori | system + user VIETATO |
| **NON consigliare** azioni durante partita in corso | system + user VIETATO |
| **Tono** – max 3 frasi, "In sintesi", diretto | user |
| **Formato** – risposta + SUGGERIMENTI (3 domande coerenti col perimetro) | user |
| **VIETATO** – potenziare, migliorare, allena, inventare nomi, carica partita sinergia, cerca/filtra, azioni durante partita | user |
| **Posizioni** – solo ruoli coerenti con position/competenze | REGOLE ORO |
| **REGOLE SUGGERIMENTI** – solo domande che l'IA può rispondere coerentemente; mai fuori perimetro | user |

### 3.2 Analyze-Match (post-partita)

| Paletto | Dove |
|---------|------|
| **SOLO rating** – no goals/assists/azioni per giocatore | REGOLE CRITICHE |
| **NON inventare** dribbling, passaggi, tiri, contrasti, recuperi | REGOLE CRITICHE |
| **Statistiche squadra** = TOTALI (shots, passes) NON per giocatore | DISTINZIONI |
| **Attack/Recovery zones** = squadra, NON per giocatore | DISTINZIONI |
| **Posizioni** – non menzionare se photo_slots/original_positions non verificati | REGOLE POSIZIONI |
| **reason** – no "perché", no ragionamenti espliciti | ISTRUZIONI JSON |
| **Output** – bilingue IT/EN, max 300 parole per lingua | ISTRUZIONI |

### 3.3 Contromisure (pre-partita)

| Paletto | Dove |
|---------|------|
| **PRE-PARTITA** – solo modifiche configurabili PRIMA della partita | CONTESTO CRITICO |
| **NON suggerire azioni durante partita** (dribbling, passaggi, tiri, contrasti) | REGOLE CRITICHE |
| **Dire COSA fare, non PERCHÉ** | REGOLE CRITICHE |
| **NON dire** "perché l'avversario ha X quindi Y" | REGOLE CRITICHE |
| **NON dire** "Ho incrociato formazione, storico, rosa" | REGOLE CRITICHE |
| **Portiere** – se no riserve PT: mai remove_from_starting_xi, mai add | REGOLA CRITICA |
| **Riserve vuote** – mai add_to_starting_xi | REGOLA CRITICA |
| **Solo modifiche che l'utente può impostare** nel menu eFootball | ISTRUZIONI 5 |

---

## 4. Info_rag §10 NOTE CRITICHE (usato da Chat via RAG)

Paletti che la Chat riceve quando `classifyQuestion === 'efootball'`:

- NON dire potenziare/allenare/migliorare
- Nomi ufficiali stili (Opportunista, Rapace d'area, Classico n°10, ecc.)
- Poacher/Build/Stamina → Opportunista/Statistiche/Resistenza
- Stili FISSI vs Stile squadra CONFIGURABILE
- Abilità native vs aggiuntive (Programmi, max 6, NON Trending)
- Statistiche vs Abilità (Passaggio filtrante = abilità, Passaggio rasoterra = statistica)
- Solo giocatori CONTESTO PERSONALE, mai cerca/filtra
- Solo istruzioni sez. 5, solo abilità sez. 8
- Ancoraggio max 2
- Resistenza = statistica fissa, non recuperabile

---

## 5. Verifica coerenza

### ✅ Allineati

| Tema | Chat | Analyze | Contromisure |
|------|------|---------|--------------|
| Card digitali, no crescita | ✅ | ✅ | ✅ |
| Solo dati forniti | ✅ | ✅ | ✅ |
| Competenze allenatore vincolanti | ✅ | ✅ | ✅ |
| Caratteristiche ≠ Performance | ✅ | ✅ | ✅ |
| Non inferire cause | ✅ | ✅ | ✅ |
| Solo rosa cliente | ✅ | ✅ | ✅ |

### ⚠️ Da tenere d'occhio

| Tema | Nota |
|------|------|
| **Azioni durante partita** | Contromisure lo vieta esplicitamente; Chat e Analyze sono pre/post quindi non applicabile, ma potrebbe essere utile un richiamo esplicito in Chat se l’utente chiede “cosa fare durante la partita” |
| **Tono** | Chat: max 3 frasi; Analyze/Contromisure: output strutturato (JSON) – OK per contesto diverso |
| **Bilingue** | Chat: lingua risposta; Analyze: sempre IT+EN; Contromisure: JSON bilingue – coerente |

### ❌ Gap potenziali

| Gap | Situazione | Dettaglio |
|-----|------------|-----------|
| **§10 NOTE CRITICHE** | Contromisure | `getRelevantSectionsForContext('countermeasures')` carica sezioni 1-9 ma **non §10**. Contromisure riceve sez. 5 (con Ancoraggio max 2) ma **non** "NON inventare passaggi corti/cross come istruzioni". Rischio: suggerire istruzioni inventate. **Azione**: aggiungere §10 a COUNTERMEASURES_SECTION_TITLES in ragHelper.js, oppure vincolo esplicito in countermeasuresHelper (istruzioni solo sez. 5, no passaggi corti/cross). |
| **"carica partita per sinergia"** | Solo Chat | Analyze e Contromisure non hanno sinergia da dati – OK |

---

## 6. Checklist manutenzione

Quando si modificano i paletti:

- [ ] **Chat** (assistant-chat): system + user + REGOLE ORO + VIETATO
- [ ] **Analyze-match**: REGOLE CRITICHE + DISTINZIONI + NON INFERIRE
- [ ] **CountermeasuresHelper**: CONTESTO CRITICO + REGOLE CRITICHE + ISTRUZIONI
- [ ] **info_rag.md §10**: NOTE CRITICHE (usate da Chat quando RAG eFootball)
- [ ] Verificare coerenza trasversale (tabella §2)

---

*Fine documento.*
