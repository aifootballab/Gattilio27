# Piano Implementazione: Contromisure Live

**Data:** 23 Gennaio 2026  
**Modello AI:** GPT-5.2 (o GPT-5 se 5.2 non disponibile via API)  
**Focus:** Risolvere frustrazioni community eFootball

---

## 📋 FASE 1: PREPARAZIONE

### 1.1 Verifica GPT-5.2 Disponibilità API
- [ ] Verificare se `gpt-5.2` disponibile via OpenAI API
- [ ] Se non disponibile, usare `gpt-5` o `gpt-4o` come fallback
- [ ] Test chiamata API con modello selezionato

### 1.2 Database
- [ ] Verificare struttura `opponent_formations`
- [ ] Aggiungere campo `tactical_style` se necessario
- [ ] Verificare RLS policies
- [ ] Test inserimento/lettura formazione avversaria

### 1.3 Ricerca Community
- [x] Identificare frustrazioni principali ✅
- [x] Identificare contromisure efficaci ✅
- [x] Documentare best practices ✅

---

## 📋 FASE 2: BACKEND

### 2.1 Endpoint `/api/generate-countermeasures`

**File:** `app/api/generate-countermeasures/route.js`

**Implementazione:**
1. Autenticazione (token Bearer)
2. Rate limiting (5 req/minuto)
3. Validazione input (UUID `opponent_formation_id`)
4. Recupero dati contestuali:
   - Formazione avversaria (`opponent_formations`)
   - Rosa cliente completa (`players`)
   - Formazione cliente (`formation_layout`)
   - Impostazioni tattiche (`team_tactical_settings`)
   - Allenatore attivo (`coaches`)
   - Storico match (ultimi 10-20) (`matches`)
   - Pattern tattici (`team_tactical_patterns`) - opzionale
   - Performance giocatori (`player_performance_aggregates`) - opzionale
5. Generazione prompt contestuale (con focus community)
6. Chiamata GPT-5.2 (o fallback)
7. Parsing risposta JSON
8. Validazione output
9. Restituzione contromisure

**Sicurezza:**
- Autenticazione obbligatoria
- Rate limiting
- Validazione UUID
- Sanitizzazione output
- RLS policies (dati utente)

**Rate Limiting:**
```javascript
'/api/generate-countermeasures': { maxRequests: 5, windowMs: 60000 }
```

### 2.2 Helper Functions

**File:** `lib/countermeasuresHelper.js`

**Funzioni:**
- `generateCountermeasuresPrompt()`: Genera prompt contestuale
- `parseCountermeasuresResponse()`: Parsing risposta JSON
- `validateCountermeasuresOutput()`: Validazione output
- `identifyMetaFormation()`: Identifica se formazione è meta
- `calculateConfidence()`: Calcola confidence score

---

## 📋 FASE 3: FRONTEND

### 3.1 Pagina `/contromisure-live`

**File:** `app/contromisure-live/page.jsx`

**Componenti:**
1. **Upload Sezione:**
   - Upload screenshot formazione avversaria
   - Preview immagine
   - Pulsante "Estrai Formazione"

2. **Preview Formazione:**
   - Visualizzazione formazione estratta
   - Dati formazione (nome, stile, forza)
   - Pulsante "Genera Contromisure"

3. **Loading State:**
   - Indicatore caricamento durante generazione
   - Progress (opzionale)

4. **Visualizzazione Contromisure:**
   - **Analisi Formazione Avversaria:**
     - Punti di forza
     - Punti deboli
     - Identificazione meta (se applicabile)
   
   - **Contromisure Tattiche:**
     - Formazione suggerita
     - Adeguamenti (linea difensiva, pressing, possesso)
     - Priorità (HIGH/MEDIUM/LOW)
     - Motivazione per ogni suggerimento
   
   - **Suggerimenti Giocatori:**
     - Giocatori da aggiungere/rimuovere
     - Posizione suggerita
     - Motivazione
     - Checkbox per selezione
   
   - **Istruzioni Individuali:**
     - Istruzioni per ogni ruolo
     - Motivazione
     - Checkbox per selezione

5. **Applicazione Suggerimenti:**
   - Checkbox per ogni suggerimento
   - Pulsante "Applica Selezionati"
   - Conferma modal
   - Applicazione sequenziale

**Stati:**
- `idle`: Nessuna azione
- `uploading`: Upload screenshot
- `extracting`: Estrazione formazione
- `generating`: Generazione contromisure
- `success`: Contromisure visualizzate
- `error`: Gestione errori

### 3.2 Integrazione con Endpoint Esistenti

**Riutilizzo:**
- `extract-formation`: Estrazione formazione avversaria
- `save-formation-layout`: Applicazione formazione suggerita
- `save-tactical-settings`: Applicazione impostazioni tattiche
- `save-player`: Gestione giocatori (se necessario)

---

## 📋 FASE 4: i18n

### 4.1 Traduzioni Necessarie

**Italiano:**
- `countermeasuresLive`: "Contromisure Live"
- `uploadOpponentFormation`: "Carica Formazione Avversaria"
- `extractFormation`: "Estrai Formazione"
- `generateCountermeasures`: "Genera Contromisure"
- `opponentFormationAnalysis`: "Analisi Formazione Avversaria"
- `tacticalCountermeasures`: "Contromisure Tattiche"
- `playerSuggestions`: "Suggerimenti Giocatori"
- `individualInstructions`: "Istruzioni Individuali"
- `applySelected`: "Applica Selezionati"
- `metaFormation`: "Formazione Meta"
- `formationStrengths`: "Punti di Forza"
- `formationWeaknesses`: "Punti Deboli"
- `defensiveLine`: "Linea Difensiva"
- `pressing`: "Pressing"
- `possessionStrategy`: "Strategia Possesso"
- `priority`: "Priorità"
- `reason`: "Motivazione"
- `addToStartingXI`: "Aggiungi ai Titolari"
- `removeFromStartingXI`: "Rimuovi dai Titolari"
- `changeFormation`: "Cambia Formazione"
- `changePlayingStyle`: "Cambia Stile di Gioco"
- `adjustDefensiveLine`: "Adeguamento Linea Difensiva"
- `adjustPressing`: "Adeguamento Pressing"
- `adjustPossession`: "Adeguamento Possesso"
- `warnings`: "Avvertimenti"
- `confidence`: "Affidabilità"
- `dataQuality`: "Qualità Dati"

**Inglese:**
- Tutte le traduzioni corrispondenti

---

## 📋 FASE 5: INTEGRAZIONE

### 5.1 Dashboard
- [ ] Aggiungere link "Contromisure Live" in Quick Links
- [ ] Icona appropriata (es: Shield, Target)

### 5.2 Navigazione
- [ ] Aggiungere route `/contromisure-live`
- [ ] Test navigazione da dashboard

---

## 📋 FASE 6: TESTING

### 6.1 Test Backend
- [ ] Test autenticazione
- [ ] Test rate limiting
- [ ] Test recupero dati contestuali
- [ ] Test generazione prompt
- [ ] Test chiamata GPT-5.2
- [ ] Test parsing risposta
- [ ] Test validazione output
- [ ] Test error handling

### 6.2 Test Frontend
- [ ] Test upload screenshot
- [ ] Test estrazione formazione
- [ ] Test generazione contromisure
- [ ] Test visualizzazione contromisure
- [ ] Test applicazione suggerimenti
- [ ] Test responsive design
- [ ] Test i18n (IT/EN)

### 6.3 Test End-to-End
- [ ] Flusso completo: Upload → Estrazione → Generazione → Applicazione
- [ ] Test con formazioni meta (4-3-3, 4-2-3-1, ecc.)
- [ ] Test con rosa cliente completa/incompleta
- [ ] Test con storico match presente/assente

---

## 📋 FASE 7: DOCUMENTAZIONE

### 7.1 Documentazione Codice
- [ ] Commenti codice backend
- [ ] Commenti codice frontend
- [ ] README sezione contromisure

### 7.2 Documentazione Utente
- [ ] Guida utilizzo contromisure live
- [ ] Spiegazione suggerimenti
- [ ] FAQ

---

## 🎯 PRIORITÀ IMPLEMENTAZIONE

### 🔴 ALTA (Core Feature)
1. Endpoint `/api/generate-countermeasures`
2. Pagina `/contromisure-live` (upload + visualizzazione)
3. Integrazione GPT-5.2
4. Prompt con focus community

### 🟡 MEDIA (UX)
5. Applicazione suggerimenti selettiva
6. Visualizzazione contromisure dettagliata
7. i18n completo

### 🟢 BASSA (Nice to Have)
8. Progress indicator
9. Storico contromisure generate
10. Confronto contromisure multiple

---

## ✅ RISULTATO ATTESO

**Cliente può:**
1. Caricare formazione avversaria
2. Ricevere contromisure specifiche contro formazioni meta
3. Capire PERCHÉ ogni suggerimento funziona
4. Applicare suggerimenti selettivamente
5. Ottimizzare squadra per contrastare avversario

**Risolve:**
- ✅ Frustrazione "Non so come contrastare formazioni meta"
- ✅ Frustrazione "Formazioni meta troppo forti"
- ✅ Frustrazione "Non capisco perché una formazione funziona"
- ✅ Frustrazione "Non so quali giocatori usare"
- ✅ Frustrazione "Quick Counter impossibile da contrastare"

---

**Pronto per implementazione dopo conferma!** 🚀
