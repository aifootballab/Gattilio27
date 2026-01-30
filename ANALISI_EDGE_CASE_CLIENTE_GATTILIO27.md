# Analisi Edge Case - Prospettiva Cliente Gattilio27

**Data:** 2026-01-30  
**Scopo:** Identificare scenari problematici che impattano l'esperienza utente

---

## 🚨 RIEPILOGO PERICOLOSITÀ

| Categoria | Problemi Trovati | Pericolo Cliente |
|-----------|------------------|------------------|
| **Dati Mancanti/Parziali** | 8 edge case | 🔴 ALTO |
| **Operazioni Concorrenti** | 5 edge case | 🟡 MEDIO |
| **Errore Rete/Sessione** | 7 edge case | 🔴 ALTO |
| **Annullamento Operazioni** | 5 edge case | 🟡 MEDIO |
| **Stati Inconsistenti DB** | 6 edge case | 🔴 ALTO |

---

## 1️⃣ DATI MANCANTI O PARZIALI

### 1.1 Giocatore senza nome (player_name vuoto)
**Scenario Cliente:** L'utente carica una foto di un giocatore ma l'AI non riesce a estrarre il nome

**File/Riga:** 
- `app/api/extract-player/route.js:318-322` - Validazione blocca salvataggio
- `app/gestione-formazione/page.jsx:705-746` - checkMissingData() verifica dati mancanti

**Comportamento Attuale:** 
- L'estrazione fallisce con errore: "Player name is required"
- Viene mostrato il `MissingDataModal` per inserimento manuale

**Probabilità:** Media (20%) - L'AI potrebbe non leggere nomi in lingue straniere

**Impatto Cliente:** 🔴 ALTO
- L'utente deve reinserire manualmente il nome
- Non può procedere senza completare i dati obbligatori
- Frustrazione se accade frequentemente

**Suggerimento:** Aggiungere fallback con nome placeholder tipo "Giocatore_Unknown_[timestamp]" che l'utente può modificare dopo

---

### 1.2 Overall rating = 0 o mancante
**Scenario Cliente:** L'AI non estrae correttamente l'overall rating dalla card

**File/Riga:**
- `app/gestione-formazione/page.jsx:712-714` - overall_rating === 0 triggera missing.required
- `app/api/extract-player/route.js:20-22` - toInt() converte a null se invalido

**Comportamento Attuale:**
- Viene considerato campo obbligatorio mancante
- Blocca il salvataggio finché l'utente non inserisce manualmente

**Probabilità:** Media (15%) - L'AI potrebbe confondersi con card particolari

**Impatto Cliente:** 🔴 ALTO
- L'utente deve conoscere l'overall rating del giocatore
- Se non lo sa, deve cercarlo manualmente

**Suggerimento:** Permettere salvataggio con rating placeholder (es. 80) con warning visivo

---

### 1.3 Formazione vuota (nessun giocatore)
**Scenario Cliente:** Utente accede a "Gestione Formazione" senza aver mai caricato giocatori

**File/Riga:**
- `app/gestione-formazione/page.jsx:1733-1741` - noLayoutContent gestisce layout mancante
- `app/gestione-formazione/page.jsx:156-162` - titolari/riserve filtrati

**Comportamento Attuale:**
- Mostra stato vuoto con messaggio "Nessuna formazione impostata"
- Permette upload formazione e giocatori

**Probabilità:** Alta (80%) - Per tutti i nuovi utenti

**Impatto Cliente:** 🟢 BASSO
- È il flusso normale per nuovi utenti
- L'interfaccia guida l'utente a caricare i dati

---

### 1.4 Meno di 11 giocatori in formazione
**Scenario Cliente:** Utente ha caricato alcuni giocatori ma non completa la formazione

**File/Riga:**
- `app/gestione-formazione/page.jsx:157-158` - titolariArray filtra slot 0-10
- `app/api/generate-countermeasures/route.js:126-130` - analisi presuppone titolari

**Comportamento Attuale:**
- La formazione è visibile con slot vuoti
- Le analisi AI potrebbero essere incomplete

**Probabilità:** Alta (60%) - Gli utenti caricano giocatori gradualmente

**Impatto Cliente:** 🟡 MEDIO
- Le contromisure e analisi potrebbero essere meno accurate
- Nessun blocco esplicito, ma esperienza degradata

---

### 1.5 Dati parziali match (sezioni saltate)
**Scenario Cliente:** Utente salta alcuni step nel wizard caricamento partita

**File/Riga:**
- `app/match/new/page.jsx:197-214` - handleSkip() permette saltare step
- `app/api/analyze-match/route.js:40-58` - calculateConfidence() valuta completezza

**Comportamento Attuale:**
- I dati vengono salvati come `null` per sezioni saltate
- L'analisi AI entra in "modalità conservativa" (confidence < 0.7)

**Probabilità:** Alta (70%) - Gli utenti saltano step che non hanno screenshot

**Impatto Cliente:** 🟡 MEDIO
- Analisi meno dettagliata ma funzionante
- L'utente viene avvisato della completezza dati

---

### 1.6 Immagine troppo grande (>10MB)
**Scenario Cliente:** Utente carica screenshot ad alta risoluzione

**File/Riga:**
- `app/api/extract-player/route.js:126-140` - Validazione dimensione immagine
- `app/match/new/page.jsx:100-105` - Controllo client-side

**Comportamento Attuale:**
- Errore esplicito: "Image size exceeds maximum allowed size (10MB)"
- L'utente deve comprimere l'immagine manualmente

**Probabilità:** Bassa (5%) - La maggior parte degli screenshot è <5MB

**Impatto Cliente:** 🟡 MEDIO
- L'utente potrebbe non sapere come comprimere l'immagine
- Blocco immediato senza opzioni alternative

---

### 1.7 Estrazione AI fallita (no content)
**Scenario Cliente:** L'AI OpenAI non riesce a estrarre dati dall'immagine

**File/Riga:**
- `lib/openaiHelper.js:111-125` - parseOpenAIResponse gestisce errori parsing
- `app/api/extract-player/route.js:265-292` - Errori specifici per tipo

**Comportamento Attuale:**
- Messaggi di errore specifici per tipo (rate_limit, timeout, quota)
- Retry automatico per alcuni errori

**Probabilità:** Bassa (10%) - Con retry è raro

**Impatto Cliente:** 🟡 MEDIO
- L'utente deve riprovare con immagine diversa
- Messaggi di errore chiari aiutano a capire il problema

---

### 1.8 Dati incompleti nel wizard (localStorage pieno/corrotto)
**Scenario Cliente:** Il localStorage è pieno o i dati salvati sono corrotti

**File/Riga:**
- `app/match/new/page.jsx:39-62` - Caricamento progresso da localStorage
- `app/match/new/page.jsx:65-77` - Salvataggio progresso

**Comportamento Attuale:**
- try-catch impedisce crash, ma il progresso viene perso
- L'utente deve ricominciare il wizard

**Probabilità:** Molto bassa (1%) - localStorage è affidabile

**Impatto Cliente:** 🔴 ALTO (se accade)
- Perdita del lavoro fatto nel wizard
- Frustrazione massima

---

## 2️⃣ OPERAZIONI CONCORRENTI

### 2.1 Due tab della stessa pagina aperte
**Scenario Cliente:** Utente ha aperto Gestione Formazione in due tab

**File/Riga:**
- `app/gestione-formazione/page.jsx:72-193` - fetchData() carica stato dal DB
- `app/gestione-formazione/page.jsx:519-603` - handleRemoveFromSlot() modifica DB

**Comportamento Attuale:**
- Nessuna sincronizzazione real-time tra tab
- L'ultima operazione vince (last write wins)

**Probabilità:** Media (30%) - Gli utenti aprono più tab

**Impatto Cliente:** 🟡 MEDIO
- Potenziale perdita di modifiche se si lavora su entrambe le tab
- Dati inconsistenti visibili temporaneamente

**Suggerimento:** Aggiungere BroadcastChannel per sincronizzazione tra tab

---

### 2.2 Modifica giocatore mentre AI sta analizzando
**Scenario Cliente:** Utente modifica la rosa mentre l'AI analizza una partita

**File/Riga:**
- `app/api/analyze-match/route.js:972-981` - Recupera rosa durante analisi
- `app/gestione-formazione/page.jsx:344-517` - handleAssignFromReserve() modifica rosa

**Comportamento Attuale:**
- L'analisi usa i dati disponibili al momento della chiamata
- Non c'è locking o versionamento

**Probabilità:** Bassa (15%) - Le analisi durano pochi secondi

**Impatto Cliente:** 🟢 BASSO
- L'analisi potrebbe usare dati leggermente vecchi
- Non causa errori, solo potenziale inconsistenza nei suggerimenti

---

### 2.3 Upload simultaneo di più immagini
**Scenario Cliente:** Utente carica rapidamente più foto di giocatori

**File/Riga:**
- `app/gestione-formazione/page.jsx:748-926` - handleUploadPlayerToSlot() gestisce upload
- `lib/rateLimiter.js:112-115` - Rate limit per extract-player: 15 req/min

**Comportamento Attuale:**
- Rate limiter blocca richieste oltre il limite (429)
- L'utente vede errore "Rate limit reached"

**Probabilità:** Media (25%) - Utenti impazienti cliccano multiplo

**Impatto Cliente:** 🟡 MEDIO
- Deve aspettare 1 minuto per riprovare
- Nessuna coda o retry automatico mostrato all'utente

---

### 2.4 Assegnazione giocatore mentre un altro è in corso
**Scenario Cliente:** Doppio click su "Assegna" o lag di rete

**File/Riga:**
- `app/gestione-formazione/page.jsx:344-517` - setAssigning() previene doppio submit
- `app/api/supabase/assign-player-to-slot/route.js:18-49` - Validazione slot_index

**Comportamento Attuale:**
- Flag `assigning` disabilita il bottone durante operazione
- Il server valida e gestisce race condition

**Probabilità:** Bassa (10%) - UI blocca interazioni

**Impatto Cliente:** 🟢 BASSO
- Protezione sufficiente contro doppio submit

---

### 2.5 Salvataggio match mentre si modifica la rosa
**Scenario Cliente:** Due operazioni simultanee su tabelle correlate

**File/Riga:**
- `app/api/supabase/save-match/route.js` - Salva match
- `app/api/supabase/save-player/route.js` - Salva giocatore

**Comportamento Attuale:**
- Supabase gestisce concorrenza a livello DB
- Nessun deadlock rilevato nel codice

**Probabilità:** Molto bassa (5%)

**Impatto Cliente:** 🟢 BASSO
- Transaction isolation di Supabase protegge

---

## 3️⃣ ERRORE DI RETE/SESSIONE

### 3.1 Sessione scaduta durante caricamento
**Scenario Cliente:** L'utente è inattivo, la sessione JWT scade, poi prova a salvare

**File/Riga:**
- `app/gestione-formazione/page.jsx:82-88` - Check sessione in fetchData
- `lib/authHelper.js` - validateToken() verifica token
- `app/api/*/route.js` - Multiple API controllano autenticazione

**Comportamento Attuale:**
- Redirect automatico a `/login` con messaggio "Sessione scaduta"
- I dati non salvati vengono persi

**Probabilità:** Media (30%) - Sessioni scadono dopo tempo di inattività

**Impatto Cliente:** 🔴 ALTO
- Perdita di dati inseriti (form incompleti, upload parziali)
- Frustrazione per dover ricominciare

**Suggerimento:** Salvare dati form in localStorage prima di redirect; refresh token automatico

---

### 3.2 Errore 429 (Rate Limit)
**Scenario Cliente:** L'utente supera il limite di richieste API

**File/Riga:**
- `lib/rateLimiter.js:18-67` - checkRateLimit() implementazione
- `app/api/analyze-match/route.js:885-908` - Risposta 429 con header informativi
- `app/api/generate-countermeasures/route.js:34-58` - Rate limit per contromisure

**Comportamento Attuale:**
- HTTP 429 con header `X-RateLimit-Reset`
- Messaggio: "Rate limit exceeded. Please try again later."

**Probabilità:** Media (25%) - Utenti attivi possono raggiungere limiti

**Impatto Cliente:** 🟡 MEDIO
- L'utente sa quando può riprovare (header resetAt)
- Ma non c'è countdown visivo nell'UI
- Non sa cosa fare nel frattempo

**Suggerimento:** Aggiungere countdown nell'UI; suggerire attività alternative

---

### 3.3 Errore 500 (Server Error)
**Scenario Cliente:** Il server crasha o c'è un bug imprevisto

**File/Riga:**
- `app/api/*/route.js` - try-catch in ogni route API
- `lib/openaiHelper.js:62-71` - Retry per errori server 500-503

**Comportamento Attuale:**
- Retry automatico (2 tentativi) per errori 500
- Se persistono: messaggio generico "Service temporarily unavailable"

**Probabilità:** Bassa (5%) - Retry risolve molti problemi temporanei

**Impatto Cliente:** 🔴 ALTO (se persistente)
- L'utente non sa se i dati sono stati salvati o meno
- Nessuna indicazione su cosa fare

**Suggerimento:** Aggiungere modalità "offline" con salvataggio locale e sync quando possibile

---

### 3.4 Quota OpenAI esaurita
**Scenario Cliente:** Il billing OpenAI è esaurito o superato

**File/Riga:**
- `lib/openaiHelper.js:51-60` - Rate limit detection
- `app/gestione-formazione/page.jsx:848-855` - Messaggio specifico quota

**Comportamento Attuale:**
- Messaggio chiaro: "Quota OpenAI esaurita. Controlla il tuo piano..."
- Link a billing OpenAI

**Probabilità:** Molto bassa (1%) - Solo per admin/owner

**Impatto Cliente:** 🔴 ALTO
- L'intera funzionalità AI non funziona
- L'utente non può fare nulla (non è lui il problema)

---

### 3.5 Timeout di rete
**Scenario Cliente:** Connessione lenta o instabile

**File/Riga:**
- `lib/openaiHelper.js:5` - OPENAI_TIMEOUT_MS = 60000 (60 secondi)
- `lib/openaiHelper.js:79-87` - Gestione AbortError/timeout

**Comportamento Attuale:**
- Retry automatico dopo 10 secondi
- Se fallisce: "Request took too long..."

**Probabilità:** Media (20%) - Dipende dalla connessione utente

**Impatto Cliente:** 🟡 MEDIO
- L'utente deve riprovare
- Perdita di tempo ma non di dati

---

### 3.6 Supabase non disponibile
**Scenario Cliente:** Problemi di connessione a Supabase

**File/Riga:**
- `lib/supabaseClient.js:6-15` - supabase potrebbe essere null
- `app/login/page.jsx:33-37` - Check supabase availability

**Comportamento Attuale:**
- Se Supabase non è configurato: errore "Supabase not available"
- Redirect a login

**Probabilità:** Molto bassa (1%) - Problema infrastrutturale

**Impatto Cliente:** 🔴 ALTO
- Applicazione completamente non funzionante

---

### 3.7 Token JWT invalido/manipolato
**Scenario Cliente:** Tentativo di accesso con token scaduto o manipolato

**File/Riga:**
- `lib/authHelper.js` - validateToken() controlla firma e scadenza
- `app/api/*/route.js` - 401 per token invalidi

**Comportamento Attuale:**
- 401 Unauthorized
- Redirect a login

**Probabilità:** Bassa (5%) - Solo tentativi malevoli o sessioni molto vecchie

**Impatto Cliente:** 🟢 BASSO
- Comportamento corretto di sicurezza

---

## 4️⃣ ANNULLAMENTO OPERAZIONI

### 4.1 Chiusura browser durante upload
**Scenario Cliente:** Utente chiude la tab mentre carica un giocatore

**File/Riga:**
- `app/gestione-formazione/page.jsx:748-926` - Upload multi-step
- Nessun salvataggio intermedio nel DB

**Comportamento Attuale:**
- I dati estratti vanno persi
- Nessun recovery possibile

**Probabilità:** Media (20%) - Utenti impazienti o distrazioni

**Impatto Cliente:** 🔴 ALTO
- Perdita del lavoro di estrazione
- Deve ricaricare le foto

**Suggerimento:** Salvataggio intermedio in localStorage dei dati estratti

---

### 4.2 Click "indietro" nel wizard partita
**Scenario Cliente:** Nel wizard match, l'utente clicca back del browser

**File/Riga:**
- `app/match/new/page.jsx:12` - STORAGE_KEY per persistenza
- `app/match/new/page.jsx:39-62` - Recupero da localStorage

**Comportamento Attuale:**
- I dati sono salvati in localStorage
- Tornando indietro, i dati sono ancora disponibili

**Probabilità:** Alta (50%) - Navigazione naturale

**Impatto Cliente:** 🟢 BASSO
- I dati persistono grazie a localStorage

---

### 4.3 Annullamento dopo aver caricato foto
**Scenario Cliente:** Utente carica foto, poi clicca "Annulla"

**File/Riga:**
- `app/gestione-formazione/page.jsx:1135-1142` - handleRetryUpload() resetta stato
- `components/MissingDataModal.jsx:195-213` - Bottone Annulla

**Comportamento Attuale:**
- I dati estratti vengono scartati
- Le immagini rimangono in stato locale (uploadImages)

**Probabilità:** Media (30%)

**Impatto Cliente:** 🟡 MEDIO
- Deve ricaricare le foto se vuole riprovare
- Le immagini erano già state processate dall'AI (spreco di token)

---

### 4.4 Chiusura modal conferma duplicato
**Scenario Cliente:** Utente apre modal conferma duplicato poi chiude

**File/Riga:**
- `app/gestione-formazione/page.jsx:969-1059` - DuplicatePlayerConfirmModal
- `components/ConfirmModal.jsx:76-80` - Click fuori chiude modal

**Comportamento Attuale:**
- setDuplicateConfirmModal(null) annulla operazione
- Il giocatore non viene salvato

**Probabilità:** Bassa (15%)

**Impatto Cliente:** 🟡 MEDIO
- L'utente deve ricominciare il processo di upload

---

### 4.5 Refresh pagina durante operazione
**Scenario Cliente:** Utente refresha mentre sta assegnando un giocatore

**File/Riga:**
- `app/gestione-formazione/page.jsx:480-517` - handleAssignFromReserve
- Nessun meccanismo di recovery

**Comportamento Attuale:**
- Se il DB update era in corso, potrebbe essere completato parzialmente
- Al refresh, i dati potrebbero essere inconsistenti

**Probabilità:** Bassa (10%)

**Impatto Cliente:** 🔴 ALTO (se accade)
- Potenziale stato inconsistente (giocatore sia in campo che riserve)

---

## 5️⃣ STATI INCONSISTENTI DB

### 5.1 Giocatore con slot_index ma senza position
**Scenario Cliente:** Bug o importazione dati crea record inconsistente

**File/Riga:**
- `app/gestione-formazione/page.jsx:156` - titolariArray filtra p con position
- `app/api/supabase/assign-player-to-slot/route.js:200-210` - Position opzionale in update

**Comportamento Attuale:**
- Il giocatore con slot_index=null o position=null viene filtrato
- Potrebbe "sparire" dalla UI senza errore chiaro

**Probabilità:** Molto bassa (2%) - Solo in caso di bug

**Impatto Cliente:** 🔴 ALTO
- Giocatore "perso" nell'interfaccia
- L'utente non capisce dove è finito

**Suggerimento:** Aggiungere pagina "Lista Giocatori" che mostra TUTTI i giocatori con stati

---

### 5.2 Partita con dati parziali/null
**Scenario Cliente:** Utente salva partita con solo alcune sezioni

**File/Riga:**
- `app/api/supabase/save-match/route.js` - Salva anche dati null
- `app/api/analyze-match/route.js:14-35` - hasSectionData() gestisce null

**Comportamento Attuale:**
- I campi null vengono salvati
- L'analisi entra in modalità conservativa

**Probabilità:** Alta (70%) - Flusso normale

**Impatto Cliente:** 🟢 BASSO
- Comportamento previsto e gestito correttamente

---

### 5.3 Formazione salvata senza giocatori
**Scenario Cliente:** Utente imposta formazione 4-3-3 ma non ha giocatori

**File/Riga:**
- `app/gestione-formazione/page.jsx:1201-1267` - handleSelectManualFormation
- `app/api/supabase/save-formation-layout/route.js` - Salva solo layout

**Comportamento Attuale:**
- La formazione viene salvata
- I campi sono vuoti (null)

**Probabilità:** Alta (60%) - Flusso normale per nuovi utenti

**Impatto Cliente:** 🟢 BASSO
- Comportamento previsto

---

### 5.4 Duplicati giocatori (stesso nome+età)
**Scenario Cliente:** Bug o upload multiplo crea duplicati

**File/Riga:**
- `app/api/supabase/save-player/route.js:181-364` - CONTROLLI INCROCIATI estesi
- `app/api/supabase/assign-player-to-slot/route.js:134-198` - Verifica duplicati

**Comportamento Attuale:**
- I controlli incrociati dovrebbero prevenire duplicati
- In alcuni casi, eliminazione automatica del duplicato riserva

**Probabilità:** Bassa (10%) - I controlli sono robusti

**Impatto Cliente:** 🟡 MEDIO (se il controllo fallisce)
- Rosa con giocatori duplicati
- Confusione nell'assegnazione

---

### 5.5 Giocatore con slot_index invalido (>10)
**Scenario Cliente:** Bug o manipolazione dati manuali

**File/Riga:**
- `app/api/supabase/assign-player-to-slot/route.js:43-49` - Validazione slot_index 0-10
- `app/api/supabase/save-player/route.js:167-169` - Constrain slot_index

**Comportamento Attuale:**
- Validazione API blocca valori invalidi
- Math.max/min normalizza valori

**Probabilità:** Molto bassa (1%)

**Impatto Cliente:** 🟢 BASSO
- Protezione sufficiente

---

### 5.6 Allenatore attivo eliminato
**Scenario Cliente:** L'allenatore marcato come attivo viene eliminato

**File/Riga:**
- `app/gestione-formazione/page.jsx:167-176` - Carica activeCoach
- `app/api/analyze-match/route.js:1000-1048` - Usa activeCoach nei prompt

**Comportamento Attuale:**
- maybeSingle() gestisce null
- L'analisi procede senza contesto allenatore

**Probabilità:** Molto bassa (1%)

**Impatto Cliente:** 🟡 MEDIO
- I suggerimenti potrebbero essere meno personalizzati
- Nessun errore visibile

---

## 📋 RACCOMANDAZIONI PRIORITARIE

### 🔴 CRITICO (Implementare subito)
1. **Salvataggio intermedio wizard match** - Evita perdita dati su chiusura browser
2. **Recupero sessione scaduta** - Salvare form in localStorage prima del redirect
3. **Sincronizzazione tab** - BroadcastChannel per coerenza tra tab

### 🟡 MEDIO (Implementare prossimamente)
4. **Countdown rate limit** - UI che mostra quando si può riprovare
5. **Pagina lista giocatori completa** - Visualizza anche giocatori in stati anomali
6. **Fallback offline** - Salvataggio locale quando il server non risponde

### 🟢 BASSO (Valutare)
7. **Compressione immagini client-side** - Ridurre dimensioni prima dell'upload
8. **Autosave form** - Salvataggio automatico dei dati inseriti

---

## 📊 MATRICE IMPATTO x PROBABILITÀ

```
                    Probabilità
              Bassa   Media   Alta
           ┌────────┬────────┬────────┐
     Alto  │Quota   │Sessione│Dati    │
           │OpenAI  │Scaduta │Mancanti│
           │        │        │        │
     Medio │Server  │Rate    │Form    │
Impatto    │Error   │Limit   │Vuota   │
           │        │        │        │
     Basso │Token   │Duplicat│Skip    │
           │Invalid │i       │Step    │
           └────────┴────────┴────────┘
```

---

**Fine Report**
