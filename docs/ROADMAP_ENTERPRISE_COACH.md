# Roadmap: Prodotto enterprise e coach vero

**Obiettivo**: avere un **profilo reale del giocatore** e fare da **coach vero** (consigli coerenti, personalizzati, che tengono conto di dati, obiettivi e contesto).

**Requisiti trasversali**: **UX** e **layout responsivo** (mobile-first dove ha senso). Ogni nuova schermata o modale (dashboard, card Statistiche di gioco, Informazioni IA, onboarding) deve essere usabile e leggibile su mobile e desktop; testare su viewport ridotti e touch.

---

## Cosa abbiamo già (base solida)

| Area | Stato | Note |
|------|--------|------|
| **Profilo dati** | ✅ | Rosa, partite, formazione, allenatore, tattica, pattern, difficoltà, sinergie, leve nel diagnostic; **dati partite inserite** (zone attacco, voti giocatori) in sezione "Dati dalle partite inserite" |
| **Informazioni IA** | ✅ | Connessione, PA, piattaforma, punto debole, cosa vuole imparare, note → nel riassunto |
| **Statistiche di gioco** | ✅ | Upload screenshot → tipo gol, tiro, passaggio, dribbling, difesa, comandi → nel riassunto |
| **Chat contestualizzata** | ✅ | RIASSUNTO ANALISI (o ROSA E DATI) + RAG eFootball nel prompt; no invenzioni; adattamento connessione/lag |
| **Suggerimenti** | ✅ | Allineati (priorità, pressing/compattezza, niente meta / "perché ho perso") |
| **Refresh diagnostic** | ✅ | Aggiorna analisi → cache → chat usa sempre ultimo riassunto |

Per essere un **coach vero** servono: (1) che il modello **usiamo sempre** punto debole e obiettivi quando presenti; (2) qualità e freschezza dati; (3) (enterprise) memoria/focus e feedback.

---

## Cosa fare per il “coach vero” (priorità alta)

### 1. Priorità esplicita: punto debole e obiettivi di apprendimento

- **Problema**: Punto debole e “cosa vuole imparare” sono già nel riassunto (Informazioni per l’IA), ma il modello non ha un’istruzione esplicita per **darci priorità**.
- **Azione**: Nel system prompt aggiungere: *Se nel RIASSUNTO è presente "Punto debole" e/o "Cosa vuole imparare" (sezione Informazioni per l’IA), usali come priorità: orienta almeno un consiglio sul punto debole e sugli obiettivi di apprendimento quando rilevanti alla domanda.*
- **Stato**: da implementare in `buildSystemContentV2` (IT/EN).

### 2. Note per l’IA come “focus” fisso

- **Problema**: Le “Note per l’IA” sono già nel riassunto; potrebbero essere usate come “focus” che il coach tiene sempre a mente (es. “Concentrati sulla difesa a 3”).
- **Azione**: Nel system prompt: *Se nel RIASSUNTO ci sono "Note per l\'IA", trattale come focus/priorità da rispettare quando possibile.*
- **Stato**: opzionale; può essere incluso insieme al punto 1.

### 3. Freschezza del riassunto

- **Problema**: Se l’utente non aggiorna l’analisi per settimane, rosa/partite/statistiche possono essere obsolete.
- **Azione**: (a) In dashboard mostrare “Ultimo aggiornamento analisi: data”; (b) opzionale: se la cache ha più di N giorni (es. 30), mostrare un avviso “Aggiorna l’analisi per consigli più precisi” o simile quando apre la chat.
- **Stato**: UX/dashboard; non blocca il funzionamento.

### 4. Statistiche di gioco: incoraggiare aggiornamento

- **Problema**: Un solo snapshot (ultime 10 partite); dopo molte partite i dati non rappresentano più il “recente”.
- **Azione**: (a) In dashboard, sulla card Statistiche di gioco, mostrare “Fonte: [data]” (es. da `captured_at`); (b) messaggio tipo “Aggiorna gli screenshot per riflettere le ultime partite”.
- **Stato**: già abbiamo `captured_at`; serve solo esporlo in UI.

---

## Cosa fare per “enterprise” (priorità media)

### 5. Profilo completo e onboarding

- **Problema**: Se l’utente non compila Informazioni IA e non carica statistiche, il “profilo” è solo rosa + partite; il coach non può personalizzare davvero.
- **Azione**: (a) Tour/onboarding che invita a compilare “Informazioni IA” e (opzionale) caricare Statistiche di gioco; (b) in chat, primo messaggio o tooltip: “Compila Informazioni IA e carica le statistiche di gioco per consigli su misura”.
- **Stato**: UX/copy; nessun cambio backend.

### 6. Audit e tracciabilità (enterprise)

- **Problema**: Per supporto/compliance serve sapere che contesto è stato usato e cosa è stato suggerito.
- **Azione**: (a) Log (anonimizzato o con user_id) di: presenza diagnostic vs fallback, lunghezza contesto, eventuale troncamento; (b) opzionale: salvare ultimo “suggerimento” principale per user (es. “formazione 3-5-2, marcatura stretta”) in una tabella `coaching_suggestions` o simile per storico.
- **Stato**: backend + eventuale tabella; non obbligatorio per MVP coach.

### 7. Memoria conversazione / focus persistente

- **Problema**: Oggi la storia è solo le ultime N messaggi (es. 10); non c’è “memoria” a lungo termine (es. “l’utente ha adottato 3-5-2 la scorsa settimana”).
- **Azione**: (a) Breve termine: le “Note per l’IA” possono essere usate come focus (vedi punto 2); (b) medio termine: tabella opzionale “coaching_notes” (user_id, note, created_at) compilata dall’utente o da un “Aggiungi nota per il coach” in chat; (c) long term: riassunto periodico della conversazione salvato e iniettato come contesto (più complesso).
- **Stato**: (a)+(b) danno già un “focus” persistente senza cambiare troppo architettura.

### 8. Feedback e miglioramento (enterprise)

- **Problema**: Non sappiamo se i consigli sono stati utili o applicati.
- **Azione**: (a) Thumbs up/down sulla risposta; (b) opzionale: “Hai applicato questo consiglio?” con risposta sì/no; (c) analisi aggregata (quante risposte positive, quali tipi di domande) per migliorare prompt/RAG.
- **Stato**: frontend (pulsanti) + backend (salvataggio evento); analisi in seguito.

---

## Riepilogo azioni concrete (ordine suggerito)

| # | Azione | Impatto | Efforto |
|---|--------|---------|--------|
| 1 | System prompt: priorità esplicita a **Punto debole** e **Cosa vuole imparare** (e opz. Note per l’IA) | Coach che orienta davvero i consigli sul profilo | Basso |
| 2 | Dashboard: “Ultimo aggiornamento analisi: data” + opz. avviso se troppo vecchio (responsivo) | Dati più freschi → consigli più credibili | Basso |
| 3 | Card Statistiche di gioco: mostrare data fonte (`captured_at`) + invito ad aggiornare (responsivo) | Utente consapevole della freschezza statistiche | Basso |
| 4 | Onboarding/tooltip: invito a compilare Informazioni IA e caricare statistiche (UX + mobile) | Profilo più completo → coach più “vero” | Basso |
| 5 | Feedback (thumbs up/down) su risposta chat | Dati per migliorare prodotto e prompt | Medio |
| 6 | Audit log contesto (diagnostic sì/no, troncamento) | Enterprise / debug | Medio |
| 7 | Memoria “focus” (Note per l’IA già nel prompt; opz. “coaching_notes”) | Coach che ricorda priorità/focus | Medio |
| 8 | Storico suggerimenti o riassunto conversazione (opzionale) | Esperienza “coach che segue nel tempo” | Alto |

---

## Conclusione

- **Profilo del giocatore**: già presente (diagnostic + Informazioni IA + Statistiche di gioco). Per “averlo davvero” servono **onboarding** e **freschezza** (aggiornamento analisi + data visibile).
- **Coach vero**: già possibile con il riassunto e il prompt attuale. Per renderlo **sistematico** servono **priorità esplicite** (punto debole, obiettivi, note) nel system prompt e, a medio termine, **feedback** e **focus persistente**.
- **Enterprise**: audit, tracciabilità, (opzionale) memoria/note e feedback sono i passi naturali dopo aver consolidato priorità e freschezza dati.

Implementando almeno i punti 1–4 si ha un prodotto già “coach vero” con profilo chiaro; 5–8 portano verso enterprise e miglioramento continuo.
