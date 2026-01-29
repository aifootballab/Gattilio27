# Test Chat Assistant (RAG + Doppia lingua)

**Data**: 29 Gennaio 2026  
**Cosa testare**: classificazione domanda (piattaforma vs eFootball), RAG, risposta in IT/EN, fallback.

---

## 1. Avvio

- Da cartella progetto: `npm run dev`
- Apri: http://localhost:3000
- Fai login (Supabase)
- Apri la chat: pulsante cervello in basso a destra

---

## 2. Test Piattaforma (nessun RAG)

L’assistente deve rispondere solo su funzionalità app, senza usare `info_rag`.

| # | Lingua | Domanda | Atteso |
|---|--------|---------|--------|
| 1 | IT | Come carico una partita? | Guida ai 5 step (Aggiungi Partita, screenshot, ecc.) |
| 2 | IT | Dove trovo la gestione formazione? | Riferimento a "Gestisci Formazione" / dashboard |
| 3 | EN | How do I add a match? | Stessa guida, risposta in inglese |
| 4 | EN | Where is the formation? | Risposta in inglese su Gestione Formazione |

**Verifica**: nessun contenuto su “opportunista”, “match-up”, “corner” (quelli sono eFootball).

---

## 3. Test eFootball (con RAG)

L’assistente deve usare il knowledge da `info_rag.md` e rispondere senza inventare.

| # | Lingua | Domanda | Atteso |
|---|--------|---------|--------|
| 5 | IT | Cos’è un opportunista? | Definizione da info_rag (contatto ultimo difensore, rapace d’area, finalizzare) |
| 6 | IT | Come difendo con il match-up? | Concetti da sezione MECCANICHE DIFENSIVE (manual defending, pressure, posizionamento) |
| 7 | IT | Consigli sui corner | Da CALCI PIAZZATI (strategie attacco/difesa corner) |
| 8 | EN | What is match-up? | Stessa meccanica, risposta in inglese |
| 9 | EN | How do I press better? | Da MECCANICHE DIFENSIVE / Pressing, in inglese |

**Verifica**: risposta coerente con il documento, niente nomi di funzioni in-game inventati.

---

## 4. Test Doppia lingua (saluto e fallback)

- **Saluto**: con lingua EN attiva, al primo accesso il saluto deve essere in inglese (“Hi …! I’m your Coach AI…”).
- **Fallback**: se l’API restituisce risposta vuota, il messaggio deve essere in inglese quando la lingua è EN (“Sorry, I didn’t receive a valid response.”).

*(Il fallback si vede solo in caso di errore; opzionale simulare staccando la rete o usando un token scaduto.)*

---

## 5. Cose da non fare

- Non inventare funzionalità della piattaforma (es. “vai su X” con X inesistente).
- Per eFootball: non inventare meccaniche non presenti in info_rag; se non c’è, dire “non ho dati sufficienti”.

---

## 6. Dove guardare in console

- Nel terminale del server: `[assistant-chat] RAG eFootball: loaded sections` quando la domanda è classificata come eFootball e vengono caricate sezioni.
- Errori RAG: `[assistant-chat] RAG error (non-blocking): ...` (la chat risponde comunque, senza blocco).

---

## Riepilogo

| Flusso | Classificazione | RAG | Lingua risposta |
|--------|-----------------|-----|------------------|
| “Come carico una partita?” (IT) | platform | No | Italiano |
| “How do I add a match?” (EN) | platform | No | English |
| “Cos’è un opportunista?” (IT) | eFootball | Sì | Italiano |
| “What is match-up?” (EN) | eFootball | Sì | English |

Se tutti i casi sopra si comportano così, il test è superato.
