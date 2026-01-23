# Documentazione: Contromisure Live

**Data Implementazione:** 23 Gennaio 2026  
**Versione:** 1.0  
**Modello AI:** GPT-5.2 (fallback: GPT-5, GPT-4o)

---

## 📋 OVERVIEW

La sezione **Contromisure Live** permette al cliente di caricare la formazione avversaria (screenshot) e ricevere suggerimenti tattici contestuali e coerenti per contrastarla efficacemente.

### Funzionalità Principali

1. **Upload Formazione Avversaria:** Carica screenshot formazione avversaria
2. **Estrazione Dati:** Estrae automaticamente formazione, stile, giocatori
3. **Analisi AI:** Genera analisi completa formazione avversaria (punti forza/debolezza)
4. **Contromisure Tattiche:** Suggerimenti specifici per contrastare formazione
5. **Suggerimenti Giocatori:** Giocatori ideali dalla rosa cliente
6. **Istruzioni Individuali:** Istruzioni specifiche per ogni ruolo
7. **Applicazione Selettiva:** Cliente seleziona quali suggerimenti applicare

---

## 🏗️ ARCHITETTURA

### Backend

#### 1. Endpoint `/api/generate-countermeasures`

**File:** `app/api/generate-countermeasures/route.js`

**Funzionalità:**
- Autenticazione (Bearer token)
- Rate limiting (5 req/minuto)
- Recupero dati contestuali:
  - Formazione avversaria (`opponent_formations`)
  - Rosa cliente (`players`)
  - Formazione cliente (`formation_layout`)
  - Impostazioni tattiche (`team_tactical_settings`)
  - Allenatore attivo (`coaches`)
  - Storico match (`matches`)
  - Pattern tattici (`team_tactical_patterns`)
- Generazione prompt contestuale con focus community
- Chiamata GPT-5.2 (fallback: GPT-5, GPT-4o)
- Validazione e parsing output JSON

**Sicurezza:**
- Autenticazione obbligatoria
- Rate limiting (5 req/minuto)
- Validazione UUID `opponent_formation_id`
- Sanitizzazione output
- RLS policies (dati utente)

**Rate Limiting:**
```javascript
'/api/generate-countermeasures': {
  maxRequests: 5,
  windowMs: 60000 // 1 minuto
}
```

#### 2. Endpoint `/api/supabase/save-opponent-formation`

**File:** `app/api/supabase/save-opponent-formation/route.js`

**Funzionalità:**
- Salva formazione avversaria estratta in Supabase
- Campi salvati:
  - `formation_name`
  - `playing_style`
  - `extracted_data` (JSONB)
  - `is_pre_match` (boolean)
  - `formation_image` (opzionale)

**Sicurezza:**
- Autenticazione obbligatoria
- Validazione input
- RLS policies

#### 3. Helper `lib/countermeasuresHelper.js`

**Funzioni:**
- `identifyMetaFormation()`: Identifica se formazione è meta
- `generateCountermeasuresPrompt()`: Genera prompt contestuale
- `validateCountermeasuresOutput()`: Valida output JSON

**Focus Community:**
- Identifica formazioni meta (4-3-3, 4-2-3-1, 5-2-3, 3-5-2)
- Contromisure specifiche basate su best practices community
- Spiegazioni tattiche dettagliate per ogni suggerimento

### Frontend

#### Pagina `/contromisure-live`

**File:** `app/contromisure-live/page.jsx`

**Flusso Utente:**
1. Upload screenshot formazione avversaria
2. Estrazione dati (chiama `/api/extract-formation`)
3. Salvataggio formazione (chiama `/api/supabase/save-opponent-formation`)
4. Generazione contromisure (chiama `/api/generate-countermeasures`)
5. Visualizzazione suggerimenti (sezioni espandibili)
6. Selezione suggerimenti (checkbox)
7. Applicazione selezionati (TODO: implementare logica applicazione)

**Componenti UI:**
- Upload area (drag & drop o click)
- Preview immagine
- Formazione estratta (preview)
- Analisi formazione avversaria (espandibile)
- Contromisure tattiche (espandibile, checkbox)
- Suggerimenti giocatori (espandibile, checkbox)
- Istruzioni individuali (espandibile, checkbox)
- Warnings e confidence score
- Pulsante "Applica Selezionati"

**Responsività:**
- Layout mobile-first
- `clamp()` per dimensioni responsive
- Flexbox e grid responsive
- Sezioni espandibili per mobile

---

## 🗄️ DATABASE

### Tabella `opponent_formations`

**Campi Aggiunti (Migration):**
- `tactical_style` (TEXT, opzionale)
- `overall_strength` (INTEGER, opzionale)
- `players` (JSONB, default `[]`)

**Campi Esistenti:**
- `id` (UUID, PK)
- `user_id` (UUID, FK)
- `formation_name` (TEXT)
- `playing_style` (TEXT)
- `extracted_data` (JSONB)
- `is_pre_match` (BOOLEAN)
- `formation_image` (TEXT)
- `match_date` (TIMESTAMP)
- `created_at`, `updated_at` (TIMESTAMP)

**RLS Policies:**
- Utente può leggere/scrivere solo le proprie formazioni avversarie

---

## 🌐 INTERNAZIONALIZZAZIONE (i18n)

**File:** `lib/i18n.js`

**Nuove Chiavi Aggiunte (IT/EN):**
- `countermeasuresLive`
- `uploadOpponentFormation`
- `extractFormation`
- `generateCountermeasures`
- `opponentFormationAnalysis`
- `tacticalCountermeasures`
- `playerSuggestions`
- `individualInstructions`
- `applySelected`
- `metaFormation`
- `formationStrengths`
- `formationWeaknesses`
- `defensiveLine`
- `pressing`
- `possessionStrategy`
- `priority`
- `reason`
- `addToStartingXI`
- `removeFromStartingXI`
- `changeFormation`
- `changePlayingStyle`
- `adjustDefensiveLine`
- `adjustPressing`
- `adjustPossession`
- `warnings`
- `confidence`
- `dataQuality`
- `generatingCountermeasures`
- `errorGeneratingCountermeasures`
- `noFormationUploaded`
- `selectSuggestionsToApply`
- `suggestionsApplied`
- `errorApplyingSuggestions`
- `applying`
- `formationExtracted`
- `overallStrength`
- `playingStyle`
- `errorExtractingFormation`
- `uploadPhotoDescription`

---

## 🤖 MODELLO AI

### GPT-5.2 (Fallback: GPT-5, GPT-4o)

**Configurazione:**
- `temperature`: 0.7
- `max_tokens`: 2000
- `response_format`: JSON object

**Prompt Structure:**
1. **Contesto:** Esperto tattico eFootball con conoscenza community
2. **Dati Formazione Avversaria:** Formazione, stile, forza, giocatori
3. **Dati Cliente:** Rosa, formazione, impostazioni, allenatore, storico
4. **Focus Community:** Contromisure specifiche per formazioni meta
5. **Istruzioni:** Analisi punti forza/debolezza, suggerimenti coerenti, motivazioni tattiche
6. **Output:** JSON strutturato con analisi e contromisure

**Output JSON:**
```json
{
  "analysis": {
    "opponent_formation_analysis": "...",
    "is_meta_formation": true/false,
    "meta_type": "4-3-3",
    "strengths": ["..."],
    "weaknesses": ["..."],
    "why_weaknesses": "..."
  },
  "countermeasures": {
    "formation_adjustments": [...],
    "tactical_adjustments": [...],
    "player_suggestions": [...],
    "individual_instructions": [...]
  },
  "confidence": 85,
  "data_quality": "high",
  "warnings": ["..."]
}
```

---

## 🔒 SICUREZZA

### Autenticazione
- Bearer token obbligatorio per tutti gli endpoint
- Validazione token via Supabase Auth

### Rate Limiting
- `/api/generate-countermeasures`: 5 req/minuto
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

### Validazione Input
- UUID validation per `opponent_formation_id`
- Validazione dimensione prompt (max 50KB)
- Validazione output JSON

### RLS Policies
- Utente può accedere solo alle proprie formazioni avversarie
- Service Role Key usato solo server-side

---

## 📱 RESPONSIVITÀ

### Design Mobile-First
- `clamp()` per dimensioni responsive
- Layout flexbox/grid responsive
- Sezioni espandibili per mobile
- Touch-friendly (checkbox, pulsanti)

### Breakpoints Impliciti
- Mobile: < 600px
- Tablet: 600px - 1024px
- Desktop: > 1024px

---

## 🚀 INTEGRAZIONE

### Dashboard Link

**File:** `app/page.jsx`

Aggiunto pulsante "Contromisure Live" nella sezione "Quick Links" con:
- Icona Shield
- Stile neon-orange
- Link a `/contromisure-live`

---

## 📝 TODO / FUTURE IMPROVEMENTS

1. **Applicazione Suggerimenti:**
   - Implementare logica applicazione suggerimenti selezionati
   - Aggiornare formazione/impostazioni tattiche automaticamente
   - Salvare storico applicazioni

2. **Storico Contromisure:**
   - Salvare contromisure generate per riferimento futuro
   - Confronto contromisure per formazioni simili

3. **Analisi Pre-Partita:**
   - Integrare con match creation flow
   - Suggerimenti automatici prima della partita

4. **Community Feedback:**
   - Sistema di rating contromisure
   - Condivisione contromisure efficaci

5. **Ottimizzazioni:**
   - Caching contromisure per formazioni comuni
   - Pre-generazione contromisure per formazioni meta

---

## 🐛 KNOWN ISSUES

Nessun issue noto al momento.

---

## 🔗 INTEGRAZIONE CON RIASSUNTO ANALISI MATCH

Il **Riassunto Analisi Match** (`/api/analyze-match`) è **allineato** con le contromisure live per garantire coerenza tattica:

### Dati Condivisi
- ✅ **Rosa Cliente** (`players`): Stessa rosa usata per suggerimenti giocatori
- ✅ **Formazione Avversaria** (`opponent_formations`): Stessa formazione analizzata
- ✅ **Formazione Cliente**: Stessa formazione di riferimento
- ✅ **Profilo Utente**: Stesso contesto personalizzato

### Coerenza Tattica
- ✅ **Analisi Post-Partita**: Il riassunto analisi match include analisi di cosa ha funzionato contro la formazione avversaria
- ✅ **Suggerimenti Contestuali**: Suggerimenti basati su formazione avversaria, rosa e statistiche match
- ✅ **Prompt Allineato**: Stessa logica di incrocio dati per analisi coerente

**Esempio**: Se in contromisure live suggerisci "Usa 3-5-2 contro 4-3-3", il riassunto analisi match analizzerà se quella formazione ha funzionato nella partita effettiva.

---

## 📚 RIFERIMENTI

- `PROPOSTA_CONTROMISURE_LIVE.md`: Proposta iniziale feature
- `PIANO_IMPLEMENTAZIONE_CONTROMISURE_LIVE.md`: Piano implementazione dettagliato
- `ARCHITETTURA_MATCH_ANALISI.md`: Architettura match e analisi (allineata)
- `lib/countermeasuresHelper.js`: Helper functions
- `app/api/generate-countermeasures/route.js`: Endpoint principale
- `app/api/analyze-match/route.js`: Endpoint riassunto analisi match (allineato)
- `app/contromisure-live/page.jsx`: Frontend page

---

**Ultimo Aggiornamento:** 23 Gennaio 2026
