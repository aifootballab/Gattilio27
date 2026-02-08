# Formula perfetta: domande suggerite e positioning cliente

**Obiettivo**: Il cliente deve sentire che **gli diciamo cosa fare perché sappiamo tutto di lui**. La **barra Conoscenza AI** ci tutela quando non siamo al 100% e può guidare le domande suggerite.

---

## 1. Positioning (parte del cliente)

- **Messaggio implicito**: "Ti do consigli **per te**: formazione, modulo, sostituzioni, istruzioni, cosa fare in campo — perché ho la **tua** rosa, le **tue** partite, il **tuo** allenatore, i **tuoi** problemi ricorrenti."
- **Niente meta generico**: Non suggeriamo mai domande tipo "qual è il meta?" o "quale formazione è più forte?" — perché la risposta giusta è "dipende da te" e così il cliente capisce che contiamo i **suoi** dati.
- **Barra come tutela**: Se la conoscenza non è 100%, la barra lo mostra. Possiamo (in risposta o in una domanda suggerita) invitare a completare profilo/rosa/partite per consigli ancora più precisi. Così siamo onesti e la barra diventa parte del valore, non una scusa.

---

## 2. Ruolo della barra Conoscenza (0–100%)

- **Cosa fa**: Indica quanto l'IA "conosce" il cliente (profilo, rosa, partite, pattern, allenatore, utilizzo, successi). Breakdown: Profile 20, Roster 25, Matches 30, Patterns 15, Coach 10, Usage 10, Success 15.
- **Perché ci tutela**: Se il cliente ha poche partite o rosa incompleta, i consigli sono comunque basati su ciò che c’è; non promettiamo miracoli. La barra rende esplicito "più completo = consigli più mirati".
- **Uso nelle domande suggerite (opzionale)**:
  - Se in futuro passiamo al prompt lo **score** (o una bandiera tipo `knowledgeIncomplete`), una delle 3 domande può essere: "Completa rosa/partite per consigli ancora più precisi su [tema attuale]" quando score < 80.
  - Se per ora **non** passiamo lo score, le 3 domande restano comunque **sempre** legate a "cosa posso fare con i **miei** dati" (rosa, formazione, partite), così il cliente è portato a completare i dati per avere risposte migliori.

---

## 3. Formula delle 3 domande suggerite

Le tre domande devono essere:
1. **Utili** → portano a una **decisione** o un’**azione** (cosa schierare, che istruzione dare, cosa fare in campo).
2. **Legate al cliente** → rosa, formazione attuale, partite, allenatore, problemi ricorrenti — non domande generiche "in vacuo".
3. **Coerenti con la risposta appena data** → almeno una approfondisce la stessa leva (es. dopo "usa 4-3-3" → "Quali istruzioni con il 4-3-3 per la mia rosa?").
4. **Mai fuori paletto** → niente "qual è il meta?", "quale formazione è più forte?", "perché ho perso?" (causa unica), niente "migliorare un giocatore" (regola oro).

**Schema operativo (sostituisce verticale + gameplay + meta):**

| # | Tipo | Cosa deve fare | Esempi (IT) |
|---|------|----------------|-------------|
| 1 | **Approfondimento sulla stessa leva** | Una domanda che va più in profondità su ciò che hai appena consigliato (formazione, stile, istruzioni, sostituzioni). Legata ai **suoi** dati. | "Con questa formazione quali istruzioni mi consigli per i terzini?", "Chi in riserva ha il profilo giusto per sostituire [ruolo]?" |
| 2 | **Cosa fare in campo (gameplay)** | Una domanda su **azioni** in partita (pressing, compattezza, possesso, piazzati, transizioni), **legata** alla formazione/stile/risposta appena data. | "Con il 4-3-3 come organizzare pressing e copertura?", "Cosa fare sui calci piazzati con la rosa che ho?" |
| 3 | **Prossimo passo con i suoi dati** | Una domanda che usa esplicitamente rosa/partite/allenatore: cosa cambiare, cosa provare, cosa evitare **per lui**. Niente "meta" generico. | "Quale modulo abbinare al mio allenatore con la rosa attuale?", "Su cosa lavorare dopo le ultime partite?", "Quale formazione contro [formazione avversario] con i miei giocatori?" |

**Divieti espliciti per il modello (e per i default):**
- "Qual è il meta?", "Vuoi informazioni sul meta?", "Quali formazioni sono più forti?"
- "Perché ho perso?" (sostituire con "Cosa correggere dopo questa partita?" / "Su cosa lavorare dopo questa partita?")
- "Come migliorare [un giocatore]?" (regola oro: non potenziare/migliorare la card)
- Domande vaghe senza legame a rosa/partite/allenatore

---

## 4. Default (fallback quando il modello non emette 3 suggerimenti)

Stessi principi: **concrete**, **legate ai dati**, **actionable**, **niente meta**.

- **Page generica (`''`)**: es. "Quale modulo per la mia rosa?", "Quali istruzioni con la formazione che uso?", "Come organizzare pressing e compattezza con la mia rosa?"
- **gestione-formazione**: modulo per la rosa, istruzioni individuali, pressing/compattezza in partita (tutti "con i miei dati").
- **match/new**: formazione per la prossima partita, cosa fare in difesa/attacco con la rosa, cosa preparare (piazzati, transizioni).
- **match/[id]**: cosa correggere dopo questa partita, come gestire piazzati/transizioni con la rosa, quale modulo/stile provare dopo (non "perché ho perso").
- **contromisure**: formazione contro [X], come chiudere spazi con i miei difensori, quali istruzioni per contrastare [stile avversario].
- **allenatori**: quale stile abbinare al mio allenatore (con la rosa), linea alta/bassa con questo stile, quali istruzioni con questo allenatore.

In tutti i casi: **nessuna** terza domanda tipo "Quali stili sono più efficaci?" o "Vuoi informazioni sul meta?".

---

## 5. Sintesi formula

- **Cliente al centro**: "Ti dico cosa fare perché so (quanto possibile) di te — rosa, partite, allenatore."
- **Barra**: mostra quanto lo conosciamo; se non 100%, ci tutela e può guidare a completare; (opzionale) una domanda suggerita può invitare a completare.
- **3 domande**: (1) approfondimento stessa leva + suoi dati, (2) gameplay legato a formazione/stile/risposta, (3) prossimo passo con rosa/partite/allenatore. Mai meta generico, mai "perché ho perso?", mai "migliorare giocatore".
- **Default**: stessi principi; per pagina, domande concrete e actionable, zero "più forte/meta".

Questa è la formula da implementare in prompt (suggRules) e in `getDefaultSuggestions`.
