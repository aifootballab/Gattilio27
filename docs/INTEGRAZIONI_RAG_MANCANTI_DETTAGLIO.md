# Integrazioni RAG mancanti – Dettaglio concetti e azioni

**Data**: 2 Febbraio 2026  
**Riferimento**: PIANO_INTEGRAZIONE_RAG_E_PROMPT.md, COERENZA_FOCUS_BILINGUE_E_RISPOSTA_IA.md, countermeasuresHelper.js  
**Obiettivo**: Documentare cosa manca in info_rag.md e quali concetti integrare, **in coerenza con il perimetro della piattaforma**.

---

## 0. CONTESTO PIATTAFORMA (FONDAMENTALE)

**eFootball AI Coach** non è calcio reale né un assistente live durante la partita. È una web app che fa:

| Cosa fa la piattaforma | Cosa NON fa |
|------------------------|-------------|
| **PRE-PARTITA**: formazione, tattica, roster, istruzioni, contromisure | Decisioni **durante** la partita (sostituzioni in corso, azioni live) |
| **POST-PARTITA**: analisi da screenshot caricati (pagelle, statistiche, formazione avversario) | Consigli su “cosa fare adesso” mentre si gioca |
| **Conoscenza eFootball**: RAG su meccaniche, stili, moduli, abilità | Supporto real-time mentre il cliente gioca |

**Regola chiave** (da countermeasuresHelper.js, analyze-match, route.js):
> *NON suggerire azioni durante la partita (dribbling, passaggi, sostituzioni, ecc.) – sono decisioni del cliente durante il gioco.*

**Conseguenza per le integrazioni RAG**:
- ✅ Integrare: conoscenza tattica, meccaniche, parametri (Forza base, cause tiri, quando pressare, rigori) che il cliente può usare **prima** o **dopo** la partita
- ❌ **Non integrare**: consigli su decisioni “in partita” che il cliente non potrebbe nemmeno chiedere tramite la nostra chat (es. “il giocatore segnala problema a una gamba – sostituiscilo”)

---

## 1. Stato attuale

| Componente | Stato |
|------------|-------|
| **route.js** (assistant-chat) | ✅ Completato: BILINGUE, GIOCATORI solo rosa, FONTI DATI |
| **info_rag.md §10** | ⚠️ Parziale: "Giocatori solo rosa" presente; mancano 4 integrazioni coerenti |
| **info_rag.md §9** | ❌ Mancano: Forza base/complessiva, Squadra Autentica vs Squadra dei Sogni |

---

## 2. Integrazioni DA FARE (coerenti con la piattaforma)

### 2.1 Forza base vs Forza complessiva

**Concetto**:
- **Forza base**: valutazione pura delle statistiche del giocatore (Overall, Velocità, Tiro, ecc.)
- **Forza complessiva**: parametro più rappresentativo; tiene conto di forza base, alchimia di squadra, competenza posizione, compatibilità stile con allenatore

**Perché serve**: L’IA deve distinguere tra “quanto vale la card” e “quanto performa in squadra” per dare consigli corretti su formazione e sostituzioni (pre-partita).

**Dove**: info_rag.md §9 – **nuova sottosezione 9.4** dopo 9.3 Valore Giocatore.

**Testo da inserire**:
```markdown
### 9.4 Forza base e Forza complessiva

- **Forza base**: valutazione pura delle statistiche del giocatore (Overall, velocità, tiro, ecc.).
- **Forza complessiva**: tiene conto di forza base, alchimia di squadra, competenza nella posizione, stile di gioco (compatibilità con allenatore). È il parametro più rappresentativo della prestazione effettiva in campo.
```

---

### 2.2 Tiri mancati – cause possibili

**Concetto**:
Cause tecniche per cui un tiro va fuori/contro il portiere: meccaniche di gioco, non “sfortuna” o “allenamento”.

**Cause da citare**:
1. Calciare durante dribbling veloce (palla non sotto controllo)
2. Orientamento corpo errato rispetto alla porta
3. Piede debole (Precisione piede debole bassa)
4. Pressione del difensore (contrasto, vicinanza)

**Perché serve**: Domande tipo “perché sbaglio i tiri?” richiedono risposte basate su meccaniche del videogioco, non su calcio reale o invenzioni.

**Dove**: info_rag.md §10 NOTE CRITICHE – sotto ERRORI COMUNI, punto 10.

**Testo da inserire**:
```markdown
10. **Tiri mancati** – cause possibili (meccaniche eFootball): calciare durante dribbling veloce, orientamento corpo errato rispetto alla porta, piede debole, pressione del difensore. Non inventare altre cause.
```

---

### 2.3 Pressing – quando sì/no

**Concetto**:
Tattica: quando ha senso pressare e quando no (conoscenza pre-partita che il cliente applica in partita).

**Perché serve**: Domande “quando devo pressare?” o “perché quando premo prendo goal?” – risposta basata su regole tattiche del gioco.

**Dove**: info_rag.md §10 NOTE CRITICHE – punto 11.

**Testo da inserire**:
```markdown
11. **Pressing**: Usarlo solo quando vicini al portatore e in sicurezza. Da lontano lascia spazi. Momento migliore: avversario con poche opzioni di passaggio (es. vicino alla linea laterale).
```

---

### 2.4 Rigori – portiere

**Concetto**:
Posizionamento del portiere sui rigori: equilibrio, evitare spazi scoperti, non uscire troppo presto.

**Perché serve**: Domande “come paro i rigori?” – risposta su meccaniche del videogioco.

**Dove**: info_rag.md §10 NOTE CRITICHE – punto 12.

**Testo da inserire**:
```markdown
12. **Rigori (portiere)**: Equilibrio fondamentale; non lasciare troppo spazio scoperto. Evitare di uscire troppo presto.
```

---

## 3. Integrazioni DA NON FARE (fuori perimetro)

### 3.1 Rischio infortunio – “sostituire se segnala problema a una gamba”

| Motivo | Descrizione |
|--------|-------------|
| **Fuori perimetro** | Decisione **durante** la partita. Il cliente sta giocando, vede un’indicazione in-game, deve sostituire. Non usa la nostra chat in quel momento. |
| **Impossibile nella nostra UX** | Non abbiamo dati live; il cliente non può chiedere “cosa faccio ora che X zoppica?” tramite la nostra app. |
| **Coerenza con countermeasuresHelper** | “NON suggerire azioni durante la partita” – sostituire un giocatore per infortunio è un’azione in-match. |
| **Resistenza infortuni** | La statistica “Resistenza infortuni” (card) è già in info_rag §1.5. Quella resta: è una caratteristica della card, non un consiglio live. |

**Azione**: NON aggiungere “Rischio infortunio” in info_rag. Se i documenti precedenti (PIANO_INTEGRAZIONE, INCOERENZE, MEMORIA_ATTILA) lo indicavano, ignorarlo per coerenza piattaforma.

---

## 4. Cosa non integrare (regole generali)

| Non integrare | Motivo |
|---------------|--------|
| Liste "top 3" con nomi reali | Solo rosa cliente; no Ronaldo, Maldini, ecc. |
| Build / training / progression statistiche | Statistiche FISSE; no "allenare", "potenziare" |
| Captaincy | Usare solo **Leader** (terminologia info_rag) |
| Stamina | Usare **Resistenza** (terminologia italiana) |
| Termini inglesi abilità | Solo italiano: Tiro al volo, Passaggio filtrante, ecc. |
| **Consigli durante partita** | Sostituzioni live, azioni in corso, “cosa fare adesso” |

---

## 5. Posizionamento in info_rag.md

### Sezione 9
- Dopo 9.3 Valore Giocatore: aggiungere **9.4 Forza base e Forza complessiva**
- Dopo 9.1: aggiungere paragrafo **Squadra Autentica vs Squadra dei Sogni** (o 9.1b)

### Sezione 10
- Aggiungere punti **10, 11, 12** (Tiri mancati, Pressing, Rigori) dopo il punto 9, prima di "### ESEMPI RISPOSTE CORRETTE"
- **Non** aggiungere punto “Rischio infortunio”

---

## 6. Checklist esecutiva

- [ ] **info_rag.md §9**: Aggiungere 9.4 Forza base e Forza complessiva
- [ ] **info_rag.md §10**: Aggiungere punto 10 – Tiri mancati (cause possibili)
- [ ] **info_rag.md §10**: Aggiungere punto 11 – Pressing (quando sì/no)
- [ ] **info_rag.md §10**: Aggiungere punto 12 – Rigori (portiere)
- [ ] **ragHelper.js** (opzionale): Verificare SECTION_KEYWORDS per §10
- [ ] **Versione info_rag**: Aggiornare footer (es. 7.1.0, data)

---

## 7. Fonti

| Fonte | Ruolo |
|-------|-------|
| COERENZA_FOCUS_BILINGUE_E_RISPOSTA_IA.md | Cosa vendiamo, focus prodotto |
| lib/countermeasuresHelper.js | Regola “NON suggerire azioni durante la partita” |
| app/api/analyze-match/route.js | Stesse regole (solo dati caricati, no azioni in-match) |
| PIANO_INTEGRAZIONE_RAG_E_PROMPT.md | Integrazioni originarie (da filtrare per perimetro) |
| INCOERENZE_E_INTEGRAZIONI_CONTENUTI_INTERNET.md | Sintesi integrazioni (idem) |

---

*Fine documento. Rischio infortunio rimosso per coerenza con il perimetro della piattaforma.*
