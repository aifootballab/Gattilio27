# Elenco: cosa abbiamo fatto (brainstorm) e stato del prompt

---

## 1. Cosa abbiamo fatto nei brainstorm (riepilogo)

- **Credit bar** e fix vari (cache, onAuthStateChange, refactor API).
- **buildPersonalizedPrompt**: posizione ideale (competenze) vs assegnata (position), coach corregge; tono coach; competenza stile allenatore (playing_style_competence).
- **assistant-chat**: validazione, errori bilingue IT/EN, sanitizzazione appState.
- **RAG**: fix needsPersonalContext, "passaggio filtrante", SECTION_KEYWORDS (modulo, meccaniche), filtro stili (titolo sezione corretto); §10 NOTE CRITICHE sempre inclusa; PERSONAL_CONTEXT_TERMS ampliati.
- **Suggerimenti**: 2 stesso tema + 1 altro; getDefaultSuggestions; CONTESTO ATTUALE; suggerimenti iniziali dopo saluto; barra collassabile in AssistantChat.
- **Persona coach**: risposta costruttiva anche con rosa/partite vuote; "first impression"; soluzioni e consigli, non solo spiegazioni.
- **Sinergia**: regola esplicita "suggerisci sinergia tu (Metti X al posto di Y), MAI dire carica partita per vedere sinergia".
- **Istruzioni individuali**: solo quelle sezione 5; non inventare "passaggi corti"/"cross".
- **Abilità**: solo sezione 8; native vs aggiuntive (Programmi); Trending non può ricevere abilità aggiuntive.
- **Posizione**: usare competenze (ideale) vs position (assegnato); se in conflitto il coach corregge.
- **Ancoraggio**: max 2 giocatori; solo per mediani davanti alla difesa.
- **Memoria Attila / Contenuti Internet**: INCOERENZE_E_INTEGRAZIONI, CHIAREZZA_GIOCATORI, COERENZA_FOCUS_BILINGUE, PIANO_INTEGRAZIONE; solo rosa cliente; niente build/training/nomi reali.
- **System message**: bilingue (lingua richiesta, termini IT vs EN), "solo nomi dalla rosa".

---

## 2. Cosa c’è nel prompt adesso (dove e cosa)

**System (route.js ~702-714)**  
- Coach AI, lingua richiesta (it/en).  
- BILINGUE: termini IT vs EN.  
- GIOCATORI: solo rosa fornita.  
- Tono, obbligo (Metti/Usa/Cambia o Use/Change/Set), vietati, posizioni, istruzioni, abilità, suggerimenti.

**User – buildPersonalizedPrompt (~361-529)**  
- CONTESTO: pagina + domanda (sempre in italiano: "Il cliente sta...", "Domanda: ...").  
- Profilo: nome, team, memo, problemi.  
- Se c’è rosa: blocco ROSA E DATI + MODO COACH (5 punti analisi/ragionamento) + REGOLE ORO (solo nomi, posizione ideale vs assegnata, sinergia, rosa vuota, max 3 cambi).  
- Se c’è RAG: MECCANICHE eFootball (testo da info_rag) + REGOLE MECCANICHE.  
- FUNZIONALITÀ APP: elenco 1-9 (sempre in italiano).  
- CONTESTO VIDEOGIOCO: card digitali, statistiche fisse.  
- TONO: max 3 frasi, "In sintesi", niente spiegoni.  
- ESEMPI CORRETTI: 4 domande/risposte (tutti in italiano; includono "Pedri", "Bellingham", "Beckenbauer", "Bale", "Cafu").  
- ERRORI DA EVITARE, VIETATO ASSOLUTO, LINGUAGGIO COACH (tutto in italiano).  
- FORMATO RISPOSTA + SUGGERIMENTI (1.2.3. dopo ---).  
- "Rispondi come [aiName] in italiano/inglese. Segui il formato sopra."

---

## 3. Cosa non è fatto bene (problemi del prompt)

1. **Prompt user tutto in italiano**  
   Se il cliente è in inglese, riceve comunque contesto, regole, esempi e vietati tutti in italiano. La risposta è in inglese (system lo impone) ma il “libretto di istruzioni” è in italiano → incoerenza bilingue e possibile confusione.

2. **Esempi con nomi reali (Pedri, Bellingham, Beckenbauer, Bale, Cafu)**  
   Abbiamo stabilito “solo nomi dalla rosa cliente”, ma negli ESEMPI CORRETTI compaiono nomi di calciatori. Messaggio contraddittorio per il modello. Meglio: placeholder tipo [Nome titolare], [Nome riserva] oppure esempi senza nomi (“Metti il MED in panchina, il CC al suo posto. In sintesi: più fisico a centrocampo.”).

3. **Contesto pagina e stato app sempre in italiano**  
   "Il cliente sta caricando una nuova partita", "Il cliente è nella dashboard principale", ecc. Per utente EN andrebbe “The user is loading a new match”, “The user is on the main dashboard”, ecc., altrimenti il prompt non è davvero bilingue.

4. **FUNZIONALITÀ APP e altri blocchi fissi solo in italiano**  
   Dashboard, Gestione Formazione, Aggiungi Partita, ecc. Per lingua EN andrebbero “Dashboard”, “Formation Management”, “Add Match”, ecc., o un blocco costruito in base a `language`.

5. **ESEMPI CORRETTI solo in italiano**  
   Per lang=en servirebbero esempi in inglese (stessa struttura: domanda breve → risposta breve + "In summary: ...") altrimenti l’IA ha solo esempi IT e deve “tradurre” da sola le regole.

6. **VIETATO ASSOLUTO e ERRORI DA EVITARE solo in italiano**  
   Per risposta in inglese sarebbe meglio avere le stesse regole in inglese (o duplicate: IT + EN) così il modello le applica nella lingua giusta.

7. **Blocco MODO COACH molto lungo (5 punti + esempi)**  
   Molto testo; rischio “lost in the middle” e che il modello dia più peso alle prime/ultime parti e meno alle regole centrali. Si potrebbe accorciare o mettere le regole critiche (solo rosa, max 3 frasi, sinergia) in punti brevi e in cima.

8. **Resistenza/Stamina nel user prompt**  
   Quando non c’è RAG, nel user non c’è una riga esplicita “Resistenza (IT) / Stamina (EN): statistica fissa, non recuperabile”. È in §10 (RAG) e in system solo come “termini IT/EN”. Per domande tipo “il mio centrocampista è stanco” senza RAG potrebbe mancare il richiamo.

9. **Duplicazione system vs user**  
   System e user ripetono: solo rosa, max 3 frasi, vietati. Utile per rinforzo, ma il user è già molto lungo; si potrebbe tenere in system le regole “dure” e nel user solo contesto + esempi + formato, per ridurre rumore.

10. **Nessuna versione EN del prompt**  
    Oggi non esiste un branch “se language === 'en' allora usa testo EN per contesto, funzionalità, esempi, vietati”. Per “bilingue fatto bene” servirebbe almeno: contesto pagina, elenco funzionalità, esempi e vietati nella lingua del cliente (o IT+EN).

---

## 4. Riepilogo: cosa sistemare per “fatto bene”

| # | Problema | Azione suggerita |
|---|----------|------------------|
| 1 | User prompt tutto in italiano | Costruire blocchi (contesto, funzionalità, esempi, vietati) in base a `language` (it/en) oppure fornire sia IT che EN. |
| 2 | Esempi con nomi reali | Sostituire con placeholder [Nome] o esempi senza nomi specifici. |
| 3 | Contesto pagina in italiano | Usare `language`: se en, testo EN ("The user is..."). |
| 4 | FUNZIONALITÀ APP in italiano | Stesso: se en, elenco in inglese. |
| 5 | ESEMPI solo in italiano | Per lang=en aggiungere stessi esempi in inglese. |
| 6 | VIETATO / ERRORI solo in italiano | Duplicare o tradurre per lang=en. |
| 7 | MODO COACH troppo lungo | Accorciare o spostare regole critiche in alto; meno punti ripetitivi. |
| 8 | Resistenza/Stamina senza RAG | Aggiungere una riga nel user (o in system) quando lang=it: "Resistenza = statistica fissa"; quando lang=en: "Stamina = fixed stat". |
| 9 | Duplicazione system/user | Valutare di tenere in system le regole inviolabili e nel user solo contesto + esempi + formato. |
| 10 | Nessun branch EN per il prompt | Introdurre `language` in buildPersonalizedPrompt e usare stringhe/costanti IT vs EN per i blocchi fissi. |

---

Fine elenco. Il prompt si trova in **`app/api/assistant-chat/route.js`** (system ~702-714, user in `buildPersonalizedPrompt` ~361-529). Per “fatto bene” servono: prompt user bilingue (IT/EN), esempi senza nomi reali o con placeholder, e opzionale accorciamento/riordino del blocco MODO COACH.
