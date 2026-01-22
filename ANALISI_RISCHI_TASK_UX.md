# ⚠️ Analisi Rischi Task + UX + Cliente

**Data**: Gennaio 2025  
**Versione**: 1.1 (Aggiornato con Real-Time Coaching e Pricing)  
**Obiettivo**: Identificare rischi per ogni task, problematiche UX/cliente, e valutare necessità suggerimenti per GPT-5.2

**⚠️ CONSIDERAZIONI IMPORTANTI**:
- **Real-Time Coaching**: Conversazionale (parlare, chiedere, dare consigli), NON screenshot-based
- **Pricing**: Da decidere in base ai test (monitorare costi reali OpenAI durante beta)
- **Scalabilità**: Multiple API keys OpenAI già pianificato (quando > 10.000 utenti)

---

## 🎯 METODOLOGIA

**Regola**: Ogni task viene testato dall'utente e marcato "verde" solo dopo feedback positivo.

**Approccio**:
1. Analizzare ogni task per rischi di breaking changes
2. Identificare problematiche UX e cliente
3. Valutare se GPT-5.2 ha bisogno di suggerimenti o è autosufficiente
4. Proporre mitigazioni

---

## 📋 ANALISI RISCHI PER TASK

### 🔴 FASE 1: FONDAMENTA (Database + Sicurezza)

#### TASK 1.11: Database Schema - Tabella `user_profiles`

**Rischi**:
- ❌ **Breaking**: Nessuno (tabella nuova, non tocca codice esistente)
- ⚠️ **Dipendenza**: RLS deve funzionare correttamente
- ⚠️ **Trigger**: Se trigger fallisce, `profile_completion_score` non si aggiorna

**Problematiche Cliente**:
- Se trigger non funziona: barra profilazione mostra 0% anche se compilata
- Se RLS non funziona: utente non può salvare profilo

**UX**:
- Mostrare loading durante salvataggio
- Mostrare errore chiaro se salvataggio fallisce
- Aggiornare barra profilazione in tempo reale dopo salvataggio

**Mitigazioni**:
- Testare trigger con INSERT/UPDATE manuali
- Verificare RLS con utente diverso
- UI: Mostrare "Salvataggio..." durante save
- UI: Toast successo/errore dopo salvataggio

---

#### TASK 1.12: Database Schema - Tabella `user_hero_points`

**Rischi**:
- ❌ **Breaking**: Nessuno (tabella nuova)
- ⚠️ **Race Condition**: Se due operazioni simultanee sottraggono crediti, balance può andare negativo
- ⚠️ **Transazioni Atomiche**: Se operazione fallisce dopo sottrazione crediti, crediti persi

**Problematiche Cliente**:
- **CRITICO**: Se race condition, cliente può avere balance negativo
- **CRITICO**: Se operazione fallisce dopo sottrazione, cliente perde crediti senza risultato

**UX**:
- Mostrare balance in tempo reale
- Mostrare "Operazione in corso..." durante chiamata API
- Mostrare errore chiaro se crediti insufficienti
- Mostrare transazione in storico

**Mitigazioni**:
- **Transazioni Atomiche**: Usare `BEGIN/COMMIT/ROLLBACK` in PostgreSQL
- **Locking**: Usare `SELECT FOR UPDATE` per lock balance durante sottrazione
- **Verifica Pre-Operazione**: Verificare balance PRIMA di chiamare OpenAI
- **Rollback Automatico**: Se operazione fallisce, rollback sottrazione crediti
- UI: Mostrare "Verifica crediti..." → "Operazione in corso..." → "Completato" o "Errore"

---

#### TASK 1.13: Database Schema - Tabella `hero_points_transactions`

**Rischi**:
- ❌ **Breaking**: Nessuno (tabella nuova)
- ⚠️ **Performance**: Se storico transazioni cresce, query può essere lenta

**Problematiche Cliente**:
- Se query lenta, UI si blocca durante caricamento storico

**UX**:
- Paginazione storico transazioni (max 50 per pagina)
- Lazy loading: carica solo ultime 10 transazioni inizialmente
- Filtri: per tipo, data, operazione

**Mitigazioni**:
- Indice su `user_id, created_at DESC`
- Limit query a 50 risultati
- Paginazione frontend

---

#### TASK 1.14: Endpoint `/api/hero-points/balance` (GET)

**Rischi**:
- ⚠️ **Breaking**: Nessuno (endpoint nuovo)
- ⚠️ **Performance**: Se chiamato troppo spesso, può sovraccaricare DB

**Problematiche Cliente**:
- Se balance non si aggiorna, cliente non sa quanti crediti ha

**UX**:
- Mostrare balance in header (sempre visibile)
- Aggiornare balance dopo ogni operazione
- Cache balance in frontend (5 minuti) per evitare chiamate eccessive

**Mitigazioni**:
- Cache Redis (TTL 5 minuti) per balance
- Aggiornare balance solo dopo operazioni che consumano crediti
- Polling balance ogni 30 secondi se necessario

---

#### TASK 1.15: Endpoint `/api/hero-points/purchase` (POST) - Pagamento Reale

**Rischi**:
- ⚠️ **Breaking**: Nessuno (endpoint nuovo)
- ⚠️ **Sicurezza**: Se non validato, utente può aggiungere crediti senza pagare
- ⚠️ **Integrazione Pagamento**: Se Stripe/PayPal fallisce, crediti già aggiunti
- ⚠️ **Idempotenza**: Se chiamata duplicata, crediti aggiunti due volte

**Problematiche Cliente**:
- **CRITICO**: Se pagamento fallisce ma crediti aggiunti, cliente ha crediti gratis
- **CRITICO**: Se pagamento OK ma crediti non aggiunti, cliente paga senza crediti

**UX**:
- Mostrare "Elaborazione pagamento..." durante processo
- Mostrare conferma pagamento
- Mostrare nuovo balance dopo acquisto
- Email conferma acquisto (futuro)

**Mitigazioni**:
- **Transazione Atomica**: Solo se pagamento OK, aggiungi crediti
- **Webhook Stripe**: Verifica pagamento prima di aggiungere crediti (futuro)
- **Idempotenza**: Usare `payment_intent_id` per evitare doppi acquisti (futuro)
- **Validazione**: Verifica `amount_euros` è valido (min 20, max 1000)
- UI: Mostrare loading durante pagamento
- UI: Mostrare errore se pagamento fallisce

---

#### TASK 1.16: Endpoint `/api/hero-points/spend` (POST) - Interno

**Rischi**:
- ⚠️ **Breaking**: Nessuno (endpoint nuovo, solo interno)
- ⚠️ **Race Condition**: Due operazioni simultanee possono sottrarre crediti due volte
- ⚠️ **Atomicità**: Se operazione fallisce dopo sottrazione, crediti persi

**Problematiche Cliente**:
- **CRITICO**: Se race condition, cliente perde crediti doppi
- **CRITICO**: Se operazione fallisce dopo sottrazione, cliente perde crediti senza risultato

**UX**:
- Non mostrare direttamente (endpoint interno)
- Mostrare risultato operazione che ha consumato crediti

**Mitigazioni**:
- **Locking**: `SELECT FOR UPDATE` su balance
- **Transazione Atomica**: `BEGIN` → sottrai crediti → esegui operazione → `COMMIT` o `ROLLBACK`
- **Verifica Pre-Operazione**: Verifica balance PRIMA di chiamare OpenAI
- **Rollback Automatico**: Se operazione fallisce, rollback sottrazione

---

#### TASK 1.17: UI Impostazioni Profilo - Pagina

**Rischi**:
- ⚠️ **Breaking**: Nessuno (pagina nuova)
- ⚠️ **UX**: Se salvataggio lento, utente può cliccare più volte "Salva"
- ⚠️ **Validazione**: Se validazione frontend non allineata con backend, errori confusi

**Problematiche Cliente**:
- Se salvataggio fallisce silenziosamente, cliente pensa di aver salvato
- Se validazione frontend diversa da backend, cliente vede errori inaspettati

**UX**:
- Disabilitare "Salva" durante salvataggio
- Mostrare "Salvataggio..." durante save
- Toast successo/errore dopo salvataggio
- Validazione frontend + backend (doppia validazione)
- Skip opzionale per ogni sezione
- Barra profilazione sempre visibile

**Mitigazioni**:
- Disabilitare bottone durante salvataggio
- Loading state durante save
- Toast feedback immediato
- Validazione sincronizzata frontend/backend

---

#### TASK 1.18: Endpoint `/api/supabase/save-profile` (POST)

**Rischi**:
- ⚠️ **Breaking**: Nessuno (endpoint nuovo)
- ⚠️ **Validazione**: Se validazione mancante, dati invalidi salvati
- ⚠️ **Trigger**: Se trigger fallisce, `profile_completion_score` non aggiornato

**Problematiche Cliente**:
- Se validazione mancante, dati corrotti salvati
- Se trigger fallisce, barra profilazione non si aggiorna

**UX**:
- Validazione frontend + backend
- Mostrare errori di validazione chiari
- Aggiornare barra profilazione dopo salvataggio

**Mitigazioni**:
- Validazione completa (lunghezza, tipo, formato)
- Test trigger con dati vari
- UI: Mostrare errori validazione

---

#### TASK 1.19: Componente HeroPointsBalance - Countdown Numerico

**Rischi**:
- ⚠️ **Breaking**: Modifica `app/layout.tsx` - può rompere layout esistente
- ⚠️ **Performance**: Se chiamato troppo spesso, può sovraccaricare API

**Problematiche Cliente**:
- Se balance non si aggiorna, cliente non sa quanti crediti ha
- Se componente non visibile, cliente non sa quanti crediti ha

**UX**:
- Mostrare balance sempre visibile in header
- Aggiornare balance dopo ogni operazione
- Mostrare "Crediti insufficienti" se balance < costo operazione
- Mostrare alert se balance < 50 HP

**Mitigazioni**:
- **ATTENZIONE**: Modificare `app/layout.tsx` con cura - NON cancellare codice esistente
- Cache balance in frontend (5 minuti)
- Aggiornare balance solo dopo operazioni che consumano crediti
- Test layout su mobile e desktop

---

#### TASK 1.20: ~~Integrazione Crediti in Endpoint Esistenti~~ ❌ CANCELLATO

**✅ DECISIONE**: NON implementare consumo crediti sugli endpoint esistenti (rosa).

**Motivazione**:
- Costo troppo basso (estrazione rosa) → Non vale la pena rischiare di rompere codice esistente
- Endpoint rosa (`extract-player`, `extract-formation`, `extract-coach`) rimangono **GRATIS**
- Consumo crediti verrà implementato solo per analisi match (futuro, quando implementato)

**Rischi evitati**:
- ✅ Nessun rischio di breaking changes su endpoint esistenti
- ✅ Nessun rischio di regresso su funzionalità rosa
- ✅ Codice esistente rimane intatto

---

#### TASK 1.21: Integrazione Profilo in Analisi IA

**Rischi**:
- ⚠️ **Breaking**: Nessuno (endpoint non ancora creato)
- ⚠️ **Prompt**: Se prompt troppo lungo, costo aumenta
- ⚠️ **Performance**: Se profilo non caricato, analisi fallisce

**Problematiche Cliente**:
- Se profilo non caricato, analisi non personalizzata
- Se prompt troppo lungo, costo aumenta

**UX**:
- Mostrare "Caricamento profilo..." durante analisi
- Mostrare "Analisi personalizzata" se profilo completo

**Mitigazioni**:
- Caricare profilo in modo efficiente (solo campi necessari)
- Prompt ottimizzato (solo dati rilevanti)
- Fallback: Se profilo non disponibile, analisi generica

---

## 🤖 VALUTAZIONE GPT-5.2: Ha Bisogno di Suggerimenti?

### Analisi Capacità GPT-5.2

**GPT-5.2 Thinking/Pro**:
- ✅ **Capacità**: Molto avanzata, può analizzare dati complessi
- ✅ **Contesto**: Può gestire prompt lunghi con molti dati (fino a 128K token)
- ✅ **Personalizzazione**: Può adattare tono e consigli basati su contesto
- ✅ **Pattern Recognition**: Eccellente per identificare pattern in dati storici
- ✅ **Ragionamento**: Può fare inferenze complesse su dati strutturati

**Domanda**: I suggerimenti nella memoria servono o GPT-5.2 è autosufficiente?

### Suggerimenti Utili (da Memoria e Architettura)

**1. Tono Rassicurante** ⚠️ **NECESSARIO**:
- ✅ **UTILE**: GPT-5.2 può essere punitivo se non guidato
- ✅ **NECESSARIO**: Specificare "tono empatico, rassicurante, non punitivo"
- ✅ **MOTIVAZIONE**: Community eFootball frustrata (script, CPU, gameplay che cambia)
- ✅ **ESEMPIO**: "Tranquillo, vedo che stanno pressando forte. Adottiamo contromisure..." invece di "Hai sbagliato"

**2. Regole eFootball** ⚠️ **NECESSARIO**:
- ✅ **UTILE**: GPT-5.2 non conosce dettagli specifici eFootball
- ✅ **NECESSARIO**: Fornire contesto su:
  - Gameplay meccaniche (passaggi, possesso, formazioni)
  - Ruoli giocatori (PT, DC, MED, SP, etc.)
  - Istruzioni tattiche disponibili
  - Problemi comuni community (script, CPU, gameplay che cambia)

**3. Personalizzazione Basata su Storico** ✅ **UTILE MA NON CRITICO**:
- ✅ **UTILE**: GPT-5.2 può analizzare pattern se dati strutturati
- ✅ **NECESSARIO**: Fornire dati aggregati (non raw) per efficienza
- ⚠️ **NOTA**: GPT-5.2 può analizzare anche dati raw, ma aggregati sono più efficienti

**4. Non Inventare** ⚠️ **CRITICO**:
- ✅ **UTILE**: GPT-5.2 può inventare dati se non specificato
- ✅ **NECESSARIO**: Specificare "NON inventare nulla, solo ambito eFootball"
- ✅ **ESEMPIO**: Se non vede formazione avversaria, NON inventarla

**5. Formato Output** ⚠️ **NECESSARIO**:
- ✅ **UTILE**: GPT-5.2 può generare output vari
- ✅ **NECESSARIO**: Specificare formato JSON strutturato con campi esatti

**6. Focus Decision Support** ⚠️ **NECESSARIO**:
- ✅ **UTILE**: GPT-5.2 può generare analisi generiche
- ✅ **NECESSARIO**: Specificare "decision support system, non archivio dati"
- ✅ **ESEMPIO**: "Cosa devo cambiare nella prossima partita?" invece di "Ecco tutte le statistiche"

### Conclusione

**GPT-5.2 HA BISOGNO di suggerimenti per**:
1. **Tono** ⚠️ **CRITICO**: Specificare tono empatico/rassicurante (community frustrata)
2. **Contesto eFootball** ⚠️ **CRITICO**: Fornire regole e meccaniche specifiche
3. **Vincoli** ⚠️ **CRITICO**: Specificare "NON inventare, solo ambito eFootball"
4. **Formato Output** ⚠️ **NECESSARIO**: Specificare formato JSON strutturato
5. **Focus** ⚠️ **NECESSARIO**: Specificare "decision support, non archivio"

**GPT-5.2 NON HA BISOGNO di suggerimenti per**:
- ✅ Analisi dati (è molto capace)
- ✅ Pattern recognition (è molto capace)
- ✅ Generazione testo (è molto capace)
- ✅ Inferenze complesse (è molto capace)

**Strategia Prompt**:
```
1. CONTESTO eFootball (regole, meccaniche, ruoli, istruzioni)
2. TONO richiesto (empatico, rassicurante, non punitivo)
3. VINCOLI (NON inventare, solo ambito eFootball)
4. FOCUS (decision support, "cosa cambiare nella prossima partita")
5. DATI utente (profilo, storico aggregato, pattern)
6. FORMATO output (JSON strutturato con campi esatti)
```

**Raccomandazione**: 
- **Usare suggerimenti** per tono, contesto, vincoli, focus
- **Non sovraccaricare** con dettagli che GPT-5.2 può inferire
- **Bilanciare**: Dati sufficienti per personalizzazione, ma prompt non troppo lungo (costo)

---

## 🎨 PROBLEMATICHE UX E CLIENTE

### 1. Sistema Crediti

**Problema**: Cliente non sa quanti crediti ha o quando finiscono

**Soluzione**:
- Balance sempre visibile in header
- Alert se balance < 50 HP
- Mostrare costo operazione prima di eseguirla
- Mostrare "Crediti insufficienti" se balance < costo

### 2. Operazioni che Consumano Crediti

**Problema**: Cliente non sa quando consuma crediti

**Soluzione**:
- Mostrare costo prima di operazione
- Chiedere conferma se operazione costosa (> 5 HP)
- Mostrare "Operazione in corso..." durante chiamata
- Mostrare nuovo balance dopo operazione

### 3. Operazioni che NON Consumano Crediti

**Problema**: Cliente pensa che tutto consumi crediti

**Soluzione**:
- Mostrare chiaramente: "Visualizzazione: GRATIS"
- Mostrare chiaramente: "Estrazione da foto: 2 HP"
- Tooltip: "Questa operazione non consuma crediti"

### 4. Errori e Fallimenti

**Problema**: Se operazione fallisce, cliente non sa cosa fare

**Soluzione**:
- Mostrare errore chiaro e specifico
- Se crediti già sottratti, spiegare che verranno restituiti
- Mostrare "Riprova" se errore temporaneo
- Mostrare "Contatta supporto" se errore persistente

### 5. Profilazione

**Problema**: Cliente non sa cosa compilare o perché

**Soluzione**:
- Mostrare barra profilazione sempre visibile
- Mostrare "Più rispondi, più l'IA ti conosce"
- Skip opzionale per ogni sezione
- Esempi per ogni campo

### 6. Performance

**Problema**: Se operazioni lente, cliente pensa che app sia rotta

**Soluzione**:
- Mostrare loading durante operazioni
- Mostrare progress per operazioni lunghe
- Timeout: se operazione > 30s, mostrare "Operazione in corso, attendere..."

---

## 🔄 FLUSSO TEST E VALIDAZIONE

### Per Ogni Task

1. **Implementazione**:
   - Seguire task breakdown
   - Aggiungere logica senza rompere esistente
   - Test locale

2. **Test Utente**:
   - Utente testa funzionalità
   - Utente verifica che non rompe esistente
   - Utente dà feedback

3. **Marcatura Verde**:
   - Solo dopo feedback positivo utente
   - Task marcato "✅ COMPLETATO" in documentazione

4. **Se Problemi**:
   - Identificare problema
   - Fix immediato
   - Re-test

---

## 📊 CHECKLIST PRE-RELEASE

### Prima di Marcare Task "Verde"

- [ ] Funzionalità implementata e funzionante
- [ ] Test locale completato
- [ ] Non rompe codice esistente
- [ ] UX fluida e chiara
- [ ] Error handling implementato
- [ ] Loading states implementati
- [ ] Feedback utente chiaro
- [ ] Testato su mobile e desktop
- [ ] Testato con dati reali
- [ ] Utente ha testato e approvato

---

---

## 🎯 PRIORITÀ RISCHI PER TASK

### 🔴 RISCHI CRITICI (Possono Rompere Codice Esistente)

1. **TASK 1.19**: Componente HeroPointsBalance
   - **Rischio**: Modifica `app/layout.tsx`
   - **Mitigazione**: NON cancellare codice esistente, solo aggiungere

**✅ TASK 1.20 CANCELLATO**: Integrazione Crediti in Endpoint Esistenti
   - **Decisione**: NON implementare consumo crediti su endpoint rosa (costo troppo basso, non vale la pena rischiare)
   - **Risultato**: Nessun rischio di breaking changes su endpoint esistenti

### 🟡 RISCHI MEDI (Possono Causare Problemi UX)

1. **TASK 1.15**: Endpoint Purchase
   - **Rischio**: Se pagamento fallisce ma crediti aggiunti
   - **Mitigazione**: Transazione atomica, webhook Stripe

2. **TASK 1.16**: Endpoint Spend
   - **Rischio**: Race condition, crediti persi
   - **Mitigazione**: Locking, transazioni atomiche

3. **TASK 1.12**: Tabella Hero Points
   - **Rischio**: Race condition su balance
   - **Mitigazione**: Locking, transazioni atomiche

### 🟢 RISCHI BASSI (Problemi Minori)

1. **TASK 1.11-1.13**: Tabelle Database
   - **Rischio**: Trigger non funzionanti
   - **Mitigazione**: Test trigger manuali

2. **TASK 1.17-1.18**: UI Profilo
   - **Rischio**: UX confusa
   - **Mitigazione**: Test UX, feedback utente

---

## 💡 RACCOMANDAZIONI IMPLEMENTAZIONE

### Ordine di Implementazione (Sicurezza)

1. **Prima**: Tabelle database (1.11-1.13) - Non rompono nulla
2. **Poi**: Endpoint nuovi (1.14-1.18) - Non toccano esistente
3. **Poi**: UI nuove (1.17, 1.19) - Non toccano esistente
4. **Ultimo**: Integrazione endpoint esistenti (1.20) - **RISCHIO MASSIMO**

### Test Strategy

1. **Test Incrementale**: Testare ogni task dopo implementazione
2. **Test Regressione**: Verificare che esistente funzioni ancora
3. **Test Utente**: Utente testa e approva prima di procedere
4. **Rollback Plan**: Se qualcosa rompe, rollback immediato

---

**Documento in evoluzione - Aggiornare dopo ogni task completato**
