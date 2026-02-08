# Tutorial / Completamento cliente

**Obiettivo**: portare il cliente a completare tutto ciò che serve per avere consigli IA efficaci (barra Conoscenza alta, riassunto analisi pieno, chat utile).

---

## 1. Ordine consigliato (onboarding ideale)

| Step | Cosa | Dove | Impatto barra Conoscenza |
|------|------|-----|---------------------------|
| 1 | **Profilo** (nome, squadra, divisione, preferenze IA, punto debole, cosa vuole imparare) | Impostazioni profilo | Profilo fino a 20% |
| 2 | **Rosa** (11 titolari + riserve, dati completi da screenshot) | Gestione formazione | Rosa fino a 25% |
| 3 | **Allenatore** (caricamento allenatore attivo) | Allenatori | Allenatore 10% |
| 4 | **Partite** (inserire almeno 1–10 partite complete) | Aggiungi partita / Match | Partite fino a 30% |
| 5 | **Statistiche di gioco** (2 schermate Analisi eFootball: Tipo gol/Tiro/Comandi + Passaggio/Dribbling/Difesa) | Dashboard → card Statistiche di gioco | Non pesano sulla barra; arricchiscono il **riassunto** e la chat |
| 6 | **Obiettivi settimanali** (completare task) | Dashboard → Obiettivi | Successi fino a 5% (su 15% della fetta Successi) |

**Pattern tattici** (fino a 15%): si popolano in backend quando ci sono abbastanza partite/ dati; **Utilizzo** (fino a 10%): stima da partite/giocatori/obiettivi (i messaggi chat non sono tracciati in DB).

---

## 2. Perché la barra “non si completava”

- **Cache 5 min**: la barra legge lo score da `user_profiles`; se calcolato da meno di 5 minuti restituiva il valore in cache.
- **Nessun refresh dopo profilo/rosa**: lo score veniva ricalcolato solo in backend dopo **save-profile** o **save-match**; la **UI** non riceveva un segnale per rifare la richiesta subito dopo salvataggio profilo o dopo aver aggiunto giocatori. Quindi la barra sembrava “ferma” fino al prossimo polling (60 s) o fino a un salvataggio partita.
- **Fix (2026-02)**: evento **`knowledge-should-refresh`** emesso dopo salvataggio profilo (impostazioni-profilo) e dopo ogni ricaricamento dati in gestione-formazione (fetchData). La barra ascolta l’evento e chiama GET `/api/ai-knowledge?refresh=1` per forzare ricalcolo e aggiornare subito la percentuale.

---

## 3. Utilizzo reale vs “Utilizzo” nella barra

La voce **Utilizzo** (max 10%) nel breakdown **non** usa un conteggio reale di messaggi chat o click. È una **stima**:

- `interactions` = partite + giocatori + obiettivi completati
- `chat_messages` = floor(partite / 3)

Quindi “quanto uso la chat” non fa salire la barra in modo diretto; fa salire indirettamente tramite partite/obiettivi. Se in futuro si vuole riflettere l’uso reale (es. messaggi chat, analisi, contromisure), serve un event log o contatori dedicati in DB.

---

## 4. Quanto sono importanti statistiche e intrecci

Le **Statistiche di gioco** (2 schermate Analisi eFootball) e gli **intrecci** con rosa e riassunto sono centrali:

- Entrano nel **riassunto analisi** (diagnostic) e la chat li usa per consigli su **tiro, passaggio, difesa, uso comandi** e per l’**incrocio con le abilità in rosa** (es. “usi tanto il passaggio filtrante ma in rosa pochi hanno l’abilità”).
- Senza statistiche caricate, l’IA non inventa percentuali: può solo suggerire di caricare gli screenshot. Con statistiche + rosa i consigli sono concreti e personalizzati.

Quindi ha senso **ricordare** al cliente di caricare l’allenatore, aggiornare le statistiche e completare il setup, con messaggi tipo: *“Più la barra Conoscenza è completa, più i consigli saranno precisi”*, *“Non hai caricato l’allenatore”*, *“Ricordati di aggiornare le statistiche di gioco”*.

---

## 5. Promemoria in dashboard: opzioni e scelta

### 5.1 Opzioni a confronto

| Opzione | Descrizione | Pro | Contro |
|--------|-------------|-----|--------|
| **Alert / modale** | Popup o modale “Completa il setup” al primo accesso o periodicamente | Molto visibile | Invasivo, facile da chiudere e dimenticare |
| **Messaggi fissi in dashboard** | Blocco sempre visibile in cima (es. “Manca: allenatore, statistiche. Più la barra è piena, più sarò preciso.”) con link | Chiaro, contestuale, responsive (si adatta al layout) | Occupa spazio; va reso dismissibile o compatto |
| **Messaggi a scorrimento (ticker)** | Una striscia con frasi che ruotano (es. “Ricordati di aggiornare le statistiche” / “Carica l’allenatore” / “Più la barra è completa…”) | Poco spazio verticale, più messaggi in sequenza | Motion può dare fastidio; accessibilità; rischio che venga ignorato |
| **Notifiche (browser push)** | “Non aggiorni le statistiche da 7 giorni” fuori dall’app | Raggiungono l’utente anche quando non è in app | Richiedono permesso, implementazione più complessa, rischio spam |

### 5.2 Raccomandazione

- **Principale: banner/block compatto in dashboard** (non modale, non obbligatorio). Una riga o due sopra/sotto la barra Conoscenza: mostra solo se **manca qualcosa** (es. allenatore non caricato, statistiche di gioco mai caricate o datate). Testo tipo: *“Più la barra Conoscenza è completa, più i consigli saranno precisi. Manca: [Allenatore] [Statistiche di gioco].”* con link diretti. **Dismissibile** (es. per sessione in `sessionStorage`) per non essere insistente. **Responsive**: stesso messaggio, su mobile va a capo o si compatta.
- **Opzionale: ticker leggero**. Se si vogliono messaggi a scorrimento, usare un ticker **sotto** la barra (o in fondo alla dashboard) con 2–3 frasi che ruotano (es. ogni 5–6 secondi invece di scroll continuo), e **disattivabile** (preferenza utente o nascondi su mobile). Alternativa: una sola frase statica che ruota ogni X secondi (es. “Ricordati di aggiornare le statistiche” / “Carica l’allenatore per consigli su stile squadra”) per evitare marquee infinito.
- **No push notification** nella prima versione; si può valutare in seguito per promemoria tipo “Statistiche non aggiornate da 7 giorni”.

### 5.3 Contenuti messaggi (suggeriti)

- Generico: *“Più la barra Conoscenza IA è completa, più i consigli saranno precisi.”*
- Allenatore: *“Non hai caricato l’allenatore: i consigli su stile squadra e competenze saranno più generici.”* + link Allenatori.
- Statistiche: *“Ricordati di aggiornare le statistiche di gioco (2 schermate Analisi): servono per consigli su tiro, passaggio e difesa.”* + link/azione alla card Statistiche.
- Rosa: *“Completa la rosa (11 titolari) per sbloccare tutti i consigli personalizzati.”* (se titolari &lt; 11).

Implementazione minima consigliata: **solo il banner compatto** in dashboard, con logica “manca allenatore? mancano statistiche? titolari &lt; 11?” e messaggio + link; niente ticker né notifiche nella v1.

---

## 6. Riferimenti

- **Barra e score**: `docs/AUDIT_BARRA_CONOSCENZA_AI.md`, `lib/aiKnowledgeHelper.js`, `components/AIKnowledgeBar.jsx`
- **Task e barra**: `docs/TASK_E_KNOWLEDGE_ESPERIENZA_CLIENTE.md`
- **Riassunto e chat**: `docs/RIASSUNTO_E_NUOVE_INFORMAZIONI_CHAT.md`
- **Statistiche di gioco (2 slot)**: modal “Statistiche di gioco” in dashboard; 2 schermate Analisi (Tipo gol/Tiro/Comandi + Passaggio/Dribbling/Difesa)
