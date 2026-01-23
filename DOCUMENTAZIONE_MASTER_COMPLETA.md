# 📚 Documentazione Master Completa - eFootball AI Coach

**Data Aggiornamento**: 23 Gennaio 2026  
**Versione**: 2.0.0  
**Status**: ✅ **PRODUZIONE** - Sistema Completo e Funzionante

---

## 🎯 INDICE

1. [Panoramica Generale](#panoramica-generale)
2. [Architettura e Stack Tecnologico](#architettura-e-stack-tecnologico)
3. [Struttura Progetto - Cartella per Cartella](#struttura-progetto)
4. [Database Schema](#database-schema)
5. [API Endpoints - Dettaglio Completo](#api-endpoints)
6. [Pagine Frontend - Funzionalità e Flussi](#pagine-frontend)
7. [Componenti React](#componenti-react)
8. [Librerie e Utilities](#librerie-e-utilities)
9. [Sicurezza e Autenticazione](#sicurezza-e-autenticazione)
10. [Internazionalizzazione (i18n)](#internazionalizzazione)
11. [Configurazione e Deploy](#configurazione-e-deploy)
12. [Flussi Principali](#flussi-principali)

---

## 🎯 PANORAMICA GENERALE

**eFootball AI Coach** è una piattaforma web enterprise per il coaching di eFootball che combina:
- **Gestione Rosa Giocatori** tramite campo 2D interattivo
- **Analisi Partite** con AI per generare riassunti e suggerimenti tattici
- **Guida Interattiva** con assistente AI personale 24/7
- **Contromisure Live** per suggerimenti tattici in tempo reale

### **Filosofia Prodotto**

La piattaforma è progettata come **Decision Support System**, non come archivio dati. L'obiettivo è trasformare dati grezzi in:
- **Riassunti testuali chiari** (executive summary)
- **Insight tattici rilevanti** (2-3 punti chiave)
- **Raccomandazioni operative concrete** (cosa cambiare)

### **Funzionalità Core (6 Pagine Principali)**

1. **Dashboard** (`/`) - Panoramica squadra, top players, ultime partite
2. **Gestione Formazione** (`/gestione-formazione`) - Campo 2D, 14 formazioni, upload giocatori
3. **Aggiungi Partita** (`/match/new`) - Wizard 5 step per caricare dati partita
4. **Dettaglio Partita** (`/match/[id]`) - Visualizza dati, genera riassunto AI bilingue
5. **Dettaglio Giocatore** (`/giocatore/[id]`) - Profilo completo, completamento dati
6. **Impostazioni Profilo** (`/impostazioni-profilo`) - Dati personali, preferenze AI

### **Funzionalità Avanzate**

- **Guida Completa** (`/guida`) - Documentazione interattiva con CTA per completare profilo
- **Assistant Chat** - Widget AI sempre disponibile (bottom-right) per guida personale
- **Contromisure Live** (`/contromisure-live`) - Suggerimenti tattici basati su formazione avversaria
- **Gestione Allenatori** (`/allenatori`) - Upload e gestione allenatori

---

## 🏗️ ARCHITETTURA E STACK TECNOLOGICO

### **Stack Tecnologico**

- **Frontend**: Next.js 14 (App Router), React 18, CSS-in-JS (inline styles)
- **Backend**: Next.js API Routes (Node.js serverless)
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **AI**: OpenAI GPT-4o (Vision per screenshot, Chat per analisi e guida)
- **Deploy**: Vercel (serverless functions)
- **Icons**: Lucide React
- **i18n**: Sistema custom con localStorage

### **Pattern Architetturali**

#### **1. Query Dirette vs API Routes**

**Query Dirette (Frontend)**:
- Lettura dati con Supabase Client (`supabase.from('table').select()`)
- RLS (Row Level Security) gestisce l'accesso automaticamente
- Gratis, scalabile, veloce
- Usato per: lettura giocatori, partite, profilo utente

**API Routes (Backend)**:
- Operazioni con logica business complessa
- Chiamate OpenAI (server-only, API key non esposta)
- Validazione token Bearer obbligatoria
- Rate limiting per protezione
- Usato per: estrazione dati da screenshot, analisi AI, scritture complesse

#### **2. Flusso Dati**

```
Frontend (React Component)
  ↓
Supabase Client (Query Dirette) → Lettura dati (RLS)
  ↓
API Routes (Next.js) → Operazioni scrittura/estrazione
  ↓
Supabase Admin (Service Role) → Scrittura database
  ↓
OpenAI API (server-only) → Estrazione/Analisi AI
```

---

## 📁 STRUTTURA PROGETTO

### **`/app` - Next.js App Router**

Cartella principale che contiene tutte le route e le API. Next.js 14 usa l'App Router dove ogni cartella rappresenta una route.

#### **`/app/page.jsx` - Dashboard Principale**

**Scopo**: Pagina home con panoramica completa della squadra.

**Funzionalità**:
- **Statistiche Squadra**: Titolari, riserve, totale giocatori
- **Top 3 Giocatori**: Per rating (query Supabase con ordinamento)
- **Ultime Partite**: Lista espandibile con click per dettaglio
- **Quick Links**: Navigazione rapida a funzionalità principali
  - "Aggiungi Partita" → `/match/new`
  - "Guida Completa" → `/guida` (nuovo)
  - "Impostazioni Profilo" → `/impostazioni-profilo`
- **AI Insights**: Placeholder per future funzionalità

**Componenti Utilizzati**:
- `LanguageSwitch` per cambio lingua
- Query dirette Supabase per giocatori e partite
- Gestione stato React per espansione sezioni

**Note Tecniche**:
- Usa `useTranslation()` per i18n
- `useRouter()` per navigazione
- Query Supabase con filtri RLS automatici (`user_id`)

---

#### **`/app/gestione-formazione/page.jsx` - Campo 2D Interattivo**

**Scopo**: Gestione completa della rosa tramite campo 2D realistico.

**Funzionalità**:
- **Campo 2D Realistico**: Pattern erba, linee campo, contrasto ottimizzato
- **14 Formazioni Ufficiali**: Selezione tra tutti i moduli eFootball (4-3-3, 4-2-3-1, 4-4-2, 3-5-2, ecc.)
- **Slot Interattivi**: 11 slot per titolari (0-10), click per assegnare giocatori
- **Sezione Riserve**: 12 slot per riserve (slot_index = NULL)
- **Upload Formazione**: Screenshot completo → estrazione automatica 11 giocatori
- **Upload Giocatori**: Fino a 3 immagini per giocatore (card, stats, skills/booster)
- **Cambio Formazione Intelligente**: Mantiene giocatori quando si cambia modulo
- **Modal Dettagli**: Click su card → mostra statistiche, abilità, booster

**Flusso Upload Formazione**:
1. Cliente carica screenshot formazione completa (11 giocatori visibili)
2. Click "Estrai Formazione" → chiama `/api/extract-formation`
3. AI estrae 11 giocatori con posizioni (slot 0-10)
4. Giocatori salvati automaticamente come TITOLARI

**Flusso Upload Giocatore**:
1. Cliente seleziona slot (titolare o riserva)
2. Carica 1-3 screenshot (card, stats, skills/booster)
3. Click "Estrai Dati" → chiama `/api/extract-player`
4. AI estrae dati completi (nome, ruolo, statistiche, abilità, booster)
5. Giocatore salvato con `slot_index` (0-10 = titolare, NULL = riserva)

**Note Tecniche**:
- Coordinate slot calcolate dinamicamente in base a formazione
- `photo_slots` (JSONB) traccia quali foto sono state caricate
- Matching giocatori: nome + squadra + ruolo per validazione
- Responsive: Mobile-first, touch-friendly

---

#### **`/app/match/new/page.jsx` - Wizard Aggiungi Partita**

**Scopo**: Wizard step-by-step per caricare tutti i dati di una partita.

**Funzionalità**:
- **5 Step Obbligatori**:
  1. **Pagelle Giocatori**: Screenshot con voti (rating per ogni giocatore)
  2. **Statistiche Squadra**: Possesso, tiri, passaggi, falli, ecc.
  3. **Aree di Attacco**: Percentuali per zona campo (sinistra, centro, destra)
  4. **Aree di Recupero Palla**: Punti verdi sul campo (zone dove si recupera)
  5. **Formazione Avversaria**: Formazione, stile di gioco, forza complessiva
- **Opzione Skip**: Per step opzionali (ma consigliato completare tutti)
- **Auto-avanzamento**: Dopo estrazione dati, passa automaticamente allo step successivo
- **Salvataggio Finale**: "Salva Partita" quando tutti gli step sono completati

**Flusso Completo**:
1. Cliente carica screenshot step 1 → "Estrai Dati" → `/api/extract-match-data`
2. Dati estratti mostrati in preview → click "Avanti"
3. Ripete per tutti i 5 step
4. Alla fine: click "Salva Partita" → `/api/supabase/save-match`
5. Redirect a `/match/[id]` per visualizzare partita salvata

**Note Tecniche**:
- Ogni step chiama `/api/extract-match-data` con `step_type` specifico
- Dati temporanei salvati in stato React fino al salvataggio finale
- Validazione: almeno step 1 e 2 obbligatori per salvare

---

#### **`/app/match/[id]/page.jsx` - Dettaglio Partita**

**Scopo**: Visualizza dati completi partita e genera riassunto AI bilingue.

**Funzionalità**:
- **Visualizzazione Dati**: Tutti i dati caricati (pagelle, statistiche, aree attacco/recupero, formazione avversaria)
- **Genera Riassunto AI**: Click button → chiama `/api/analyze-match` → mostra riassunto bilingue
- **Supporto Bilingue**: Riassunto in IT/EN con helper `getBilingualText()` e `getBilingualArray()`
- **Apertura Partite Incomplete**: Permette di aprire partite non complete per completarle

**Flusso Generazione Riassunto**:
1. Cliente click "Genera Riassunto AI"
2. Chiamata `/api/analyze-match` con `match_id`
3. Backend recupera:
   - Dati partita (`matchData`)
   - Profilo utente (`user_profiles`)
   - Rosa cliente (`players` - max 50)
   - Storico match (ultimi 30)
   - Pattern tattici (`team_tactical_patterns`)
   - Formazione avversaria (se presente)
4. AI genera riassunto completo bilingue (IT/EN)
5. Frontend mostra riassunto con selezione lingua

**Struttura Riassunto AI**:
```json
{
  "analysis": { "it": "...", "en": "..." },
  "player_performance": { ... },
  "tactical_analysis": { ... },
  "recommendations": [ ... ],
  "historical_insights": { "it": "...", "en": "..." }
}
```

**Note Tecniche**:
- Helper `getBilingualText()` per stringhe bilingue
- Helper `getBilingualArray()` per array bilingue
- Gestione partite incomplete: non blocca visualizzazione se dati parziali

---

#### **`/app/giocatore/[id]/page.jsx` - Dettaglio Giocatore**

**Scopo**: Visualizza profilo completo giocatore e permette completamento dati.

**Funzionalità**:
- **Visualizzazione Dati**: Statistiche, abilità, booster, foto caricate
- **Completa Profilo**: Upload foto aggiuntive (stats, skills, booster)
- **Tracciamento Foto**: Mostra quali foto sono già caricate (`photo_slots`)
- **Aggiornamento Dati**: Salvataggio modifiche tramite `/api/supabase/update-match`

**Note Tecniche**:
- Query Supabase per giocatore specifico con RLS
- Gestione `photo_slots` (JSONB) per tracciare foto caricate

---

#### **`/app/impostazioni-profilo/page.jsx` - Impostazioni Profilo**

**Scopo**: Gestione completa profilo utente e preferenze AI.

**Funzionalità**:
- **Dati Personali**: Nome, cognome
- **Dati Gioco**: Divisione, squadra preferita, nome team
- **Preferenze AI**: Nome AI personalizzato, "come ricordarti"
- **Esperienza Gioco**: Ore/settimana, problemi comuni (array)
- **Barra Profilazione**: Progress bar con livello completamento (0-100%)
- **Calcolo Completamento**: Basato su 8 campi principali

**Note Tecniche**:
- Salvataggio tramite `/api/supabase/save-profile`
- Calcolo dinamico `profile_completion_score` e `profile_completion_level`
- Validazione input lato client e server

---

#### **`/app/guida/page.jsx` - Guida Completa**

**Scopo**: Documentazione interattiva con CTA per completare profilo e usare Assistant Chat.

**Funzionalità**:
- **Sezione Completa Profilo**: Progress bar dinamica, CTA a `/impostazioni-profilo`
- **Sezione Usa il Cervello AI**: Spiegazione Assistant Chat, 3 feature cards
- **Guide per Pagina**: 6 card espandibili (una per ogni pagina principale)
  - Dashboard
  - Gestione Formazione
  - Aggiungi Partita
  - Dettaglio Partita
  - Dettaglio Giocatore
  - Impostazioni Profilo
- **Step-by-Step**: Ogni guida mostra passi dettagliati
- **Pulsante "Vai alla Pagina"**: Link diretto a ogni pagina

**Note Tecniche**:
- Calcolo `profileCompletion` basato su 8 campi profilo
- Design neon compatibile con resto piattaforma
- Animazioni pulse per elementi interattivi
- Supporto bilingue completo

---

#### **`/app/contromisure-live/page.jsx` - Contromisure Live**

**Scopo**: Suggerimenti tattici basati su formazione avversaria.

**Funzionalità**:
- **Carica Formazione Avversaria**: Screenshot → estrazione automatica
- **Genera Contromisure**: Analisi AI basata su:
  - Formazione propria (salvata in rosa)
  - Formazione avversaria (caricata)
  - Storico partite (formazioni che soffre)
- **Suggerimenti Operativi**: Cosa cambiare, posizionamento, istruzioni individuali

**Note Tecniche**:
- Chiama `/api/generate-countermeasures`
- Usa `countermeasuresHelper.js` per logica tattica

---

#### **`/app/allenatori/page.jsx` - Gestione Allenatori**

**Scopo**: Upload e gestione allenatori.

**Funzionalità**:
- **Upload Allenatore**: Screenshot → estrazione dati
- **Lista Allenatori**: Visualizza tutti gli allenatori caricati
- **Set Attivo**: Seleziona allenatore attivo per squadra

**Note Tecniche**:
- Chiama `/api/extract-coach` per estrazione
- Salvataggio tramite `/api/supabase/save-coach`

---

#### **`/app/login/page.jsx` - Autenticazione**

**Scopo**: Login utente con Supabase Auth.

**Funzionalità**:
- **Login Email/Password**: Autenticazione Supabase
- **Redirect**: Dopo login → dashboard (`/`)

**Note Tecniche**:
- Usa `supabase.auth.signInWithPassword()`
- Gestione errori e session

---

#### **`/app/layout.tsx` - Layout Globale**

**Scopo**: Layout root che wrappa tutte le pagine.

**Componenti Globali**:
- `LanguageProviderWrapper`: Wrapper i18n (context provider)
- `AssistantChat`: Widget chat AI sempre disponibile (bottom-right)
- `custom-background`: Sfondo personalizzabile

**Note Tecniche**:
- Metadata Next.js per SEO
- HTML lang="it" (default)

---

### **`/app/api` - API Routes (Backend)**

Tutte le API routes sono in `/app/api`. Ogni cartella rappresenta un endpoint.

#### **`/app/api/extract-formation/route.js` - Estrazione Formazione**

**Scopo**: Estrae 11 giocatori da screenshot formazione completa.

**Input**:
- `image`: Base64 screenshot formazione (11 giocatori visibili)
- `formation`: Formazione selezionata (es: "4-3-3")

**Output**:
- Array di 11 giocatori con:
  - `name`, `role`, `position`, `slot_index` (0-10)
  - Coordinate posizione sul campo

**Flusso**:
1. Valida input (immagine, formazione)
2. Chiama OpenAI Vision con prompt specifico per formazione
3. Parse risposta JSON
4. Valida 11 giocatori estratti
5. Return array giocatori

**Note Tecniche**:
- Usa `openaiHelper.js` per chiamate OpenAI
- Prompt engineering per estrazione precisa
- Validazione numero giocatori (deve essere 11)

---

#### **`/app/api/extract-player/route.js` - Estrazione Giocatore**

**Scopo**: Estrae dati completi da screenshot card giocatore.

**Input**:
- `images`: Array di 1-3 immagini base64 (card, stats, skills/booster)
- `slot_index`: Slot selezionato (0-10 = titolare, NULL = riserva)

**Output**:
- Oggetto giocatore con:
  - `name`, `role`, `position`, `rating`, `team`
  - `statistics` (attacco, difesa, passaggio, ecc.)
  - `skills` (array)
  - `boosters` (array)
  - `photo_slots` (quali foto sono state caricate)

**Flusso**:
1. Valida input (almeno 1 immagine)
2. Chiama OpenAI Vision per ogni immagine
3. Merge dati da tutte le immagini
4. Normalizza dati con `normalize.js`
5. Return oggetto giocatore completo

**Note Tecniche**:
- Supporta estrazione parziale (se manca stats, usa solo card)
- `photo_slots` traccia quali foto sono state caricate
- Normalizzazione dati per coerenza

---

#### **`/app/api/extract-match-data/route.js` - Estrazione Dati Partita**

**Scopo**: Estrae dati da screenshot per ogni step del wizard partita.

**Input**:
- `image`: Base64 screenshot
- `step_type`: Tipo step ("player_ratings", "team_stats", "attack_areas", "ball_recovery", "opponent_formation")
- `match_id`: ID partita (opzionale, per aggiornamento)

**Output**:
- Dati estratti specifici per step:
  - `player_ratings`: Array voti giocatori
  - `team_stats`: Statistiche squadra
  - `attack_areas`: Percentuali per zona
  - `ball_recovery`: Coordinate punti recupero
  - `opponent_formation`: Formazione, stile, forza

**Flusso**:
1. Valida input (immagine, step_type)
2. Chiama OpenAI Vision con prompt specifico per step
3. Parse risposta JSON
4. Valida dati estratti
5. Return dati strutturati

**Note Tecniche**:
- Prompt diversi per ogni step_type
- Validazione dati specifica per step
- Supporto aggiornamento partita esistente

---

#### **`/app/api/analyze-match/route.js` - Analisi AI Partita**

**Scopo**: Genera riassunto AI completo e bilingue (IT/EN) di una partita.

**Input**:
- `match_id`: ID partita da analizzare

**Output**:
- Riassunto bilingue con:
  - `analysis`: Overview partita (IT/EN)
  - `player_performance`: Top/underperformers con suggerimenti
  - `tactical_analysis`: Cosa ha funzionato/non funzionato
  - `recommendations`: Raccomandazioni prioritarie
  - `historical_insights`: Insight basati su storico (se disponibile)

**Flusso Completo**:
1. **Autenticazione**: Valida Bearer token
2. **Rate Limiting**: Verifica limite richieste (30/minuto)
3. **Recupero Dati**:
   - Dati partita (`matchData` da `matches`)
   - Profilo utente (`user_profiles`)
   - Rosa cliente (`players` - max 50)
   - Storico match (ultimi 30 da `matches`)
   - Pattern tattici (`team_tactical_patterns`)
   - Formazione avversaria (`opponent_formations` se presente)
4. **Build Prompt**:
   - Prompt personalizzato con nome cliente
   - Lista dati disponibili
   - Istruzioni per output bilingue
   - Esempi formato output
5. **Chiama OpenAI**: GPT-4o con `response_format: { type: "json_object" }`
6. **Parse Risposta**: Valida e normalizza JSON bilingue
7. **Return**: Riassunto completo

**Note Tecniche**:
- **Storico Andamento**: Analizza ultimi 30 match per identificare:
  - Formazioni che soffre (loss rate > 50%)
  - Trend recente (improving/declining/stable)
  - Problemi ricorrenti
- **Disposizione Reale**: Se `players_in_match` presente, usa posizioni reali per suggerimenti precisi
- **Retrocompatibilità**: Supporta output vecchio (solo IT) normalizzandolo a bilingue
- **Dati Parziali**: Funziona anche con dati parziali (warnings chiari, confidence score)

---

#### **`/app/api/assistant-chat/route.js` - Assistant Chat AI**

**Scopo**: Endpoint per chat interattiva con AI guida personale.

**Input**:
- `message`: Messaggio utente
- `currentPage`: Pagina corrente (opzionale, per contesto)

**Output**:
- `response`: Risposta AI personalizzata
- `remaining`: Richieste rimanenti (rate limit)
- `resetAt`: Timestamp reset rate limit

**Flusso Completo**:
1. **Autenticazione**: Valida Bearer token
2. **Rate Limiting**: 30 richieste/minuto per utente
3. **Build Context**:
   - Recupera profilo utente (`user_profiles`)
   - Estrae: `first_name`, `team_name`, `ai_name`, `how_to_remember`, `common_problems`
4. **Build Prompt**:
   - Prompt personalizzato con nome cliente
   - Lista completa 6 funzionalità disponibili (NON inventare altre)
   - Regole critiche: Tono amichevole, motivante, personale
   - Contesto pagina corrente
5. **Chiama OpenAI**: GPT-4o con `temperature: 0.7` (bilanciato)
6. **Parse Risposta**: Estrae `content` da risposta
7. **Return**: Risposta formattata

**Note Tecniche**:
- **Prompt Engineering**: Lista esplicita funzionalità per evitare "invenzioni"
- **Tono Personale**: Usa sempre nome cliente, celebra successi, incoraggia
- **Contesto Dinamico**: Passa `currentPage` per risposte contestuali
- **Error Handling**: Fallback sicuri se contesto non disponibile

---

#### **`/app/api/generate-countermeasures/route.js` - Contromisure Live**

**Scopo**: Genera suggerimenti tattici basati su formazione avversaria.

**Input**:
- `opponent_formation_id`: ID formazione avversaria
- `client_formation`: Formazione propria (opzionale)

**Output**:
- Array contromisure con:
  - `suggestion`: Suggerimento operativo
  - `reason`: Perché questo suggerimento
  - `priority`: "high" | "medium" | "low"

**Note Tecniche**:
- Usa `countermeasuresHelper.js` per logica tattica
- Considera storico partite (formazioni che soffre)

---

#### **`/app/api/extract-coach/route.js` - Estrazione Allenatore**

**Scopo**: Estrae dati allenatore da screenshot.

**Input**:
- `image`: Base64 screenshot allenatore

**Output**:
- Oggetto allenatore con: nome, stile, abilità, ecc.

---

#### **`/app/api/supabase/*` - Operazioni Database**

Tutti gli endpoint in `/app/api/supabase/` gestiscono operazioni database dirette.

**Pattern Comune**:
1. Autenticazione Bearer token
2. Validazione input
3. Query Supabase con Service Role Key
4. RLS verificato (filtro `user_id`)
5. Return risultato

**Endpoints**:
- `save-player`: Salva/aggiorna giocatore
- `save-match`: Salva partita
- `update-match`: Aggiorna partita (incluso `ai_summary`)
- `save-profile`: Salva profilo utente
- `save-formation-layout`: Salva layout formazione
- `assign-player-to-slot`: Assegna giocatore a slot
- `remove-player-from-slot`: Rimuovi giocatore da slot
- `delete-player`: Elimina giocatore
- `delete-match`: Elimina partita
- `save-coach`: Salva allenatore
- `set-active-coach`: Imposta allenatore attivo
- `save-tactical-settings`: Salva impostazioni tattiche
- `save-opponent-formation`: Salva formazione avversaria

---

### **`/components` - Componenti React Riusabili**

#### **`/components/AssistantChat.jsx` - Widget Chat AI**

**Scopo**: Widget chat fluttuante (bottom-right) per guida interattiva.

**Funzionalità**:
- **Widget Fluttuante**: Posizione fixed bottom-right, sempre disponibile
- **Stato Aperto/Chiuso**: Toggle con icona cervello
- **Lista Messaggi**: Scroll automatico a ultimo messaggio
- **Input Messaggio**: Invio con Enter o button
- **Quick Actions**: Suggerimenti rapidi (4 pulsanti)
- **Saluto Personale**: Al primo accesso (se profilo disponibile)
- **Loading Indicator**: Animazione durante chiamata API
- **Gestione Errori**: Messaggi user-friendly

**State Management**:
```javascript
const [isOpen, setIsOpen] = useState(false)
const [messages, setMessages] = useState([])
const [input, setInput] = useState('')
const [loading, setLoading] = useState(false)
const [userProfile, setUserProfile] = useState(null)
const [currentPage, setCurrentPage] = useState('')
```

**Tracking Route**:
- Usa `window.location.pathname` per tracciare pagina corrente
- `window.addEventListener('popstate')` per aggiornare su navigazione
- `currentPage` passato all'API per contesto

**Flusso Invio Messaggio**:
1. Cliente scrive messaggio → click "Invia"
2. Aggiunge messaggio utente alla lista
3. Chiama `/api/assistant-chat` con `message` e `currentPage`
4. Mostra loading indicator
5. Riceve risposta AI
6. Aggiunge risposta alla lista
7. Auto-scroll a ultimo messaggio

**Note Tecniche**:
- Carica profilo utente al mount (`useEffect`)
- Gestione errori robusta (session expired, rate limit, API error)
- Design neon compatibile con resto piattaforma

---

#### **`/components/LanguageProviderWrapper.jsx` - Wrapper i18n**

**Scopo**: Context provider per sistema i18n.

**Funzionalità**:
- **Context Provider**: Wrappa app con `LanguageContext`
- **Gestione Lingua**: `lang` (IT/EN) salvato in localStorage
- **Hook `useTranslation()`**: Restituisce `{ t, lang, changeLanguage }`

**Note Tecniche**:
- Usa `React.createContext()` e `useState`
- Persistenza localStorage per lingua preferita

---

#### **`/components/LanguageSwitch.jsx` - Selettore Lingua**

**Scopo**: Componente per cambio lingua IT/EN.

**Funzionalità**:
- **Toggle Lingua**: Click → cambia IT ↔ EN
- **Icona Globe**: Lucide React
- **Stile Neon**: Compatibile con design piattaforma

**Note Tecniche**:
- Usa `useTranslation()` per `changeLanguage()`
- Aggiorna localStorage automaticamente

---

#### **`/components/TacticalSettingsPanel.jsx` - Pannello Impostazioni Tattiche**

**Scopo**: Pannello per gestione impostazioni tattiche squadra.

**Funzionalità**:
- **Impostazioni Tattiche**: Stile di gioco, pressing, build-up, ecc.
- **Salvataggio**: Tramite `/api/supabase/save-tactical-settings`

**Note Tecniche**:
- Gestione stato form complesso
- Validazione input

---

### **`/lib` - Librerie e Utilities**

#### **`/lib/supabaseClient.js` - Client Supabase Frontend**

**Scopo**: Client Supabase per query dirette dal frontend.

**Funzionalità**:
- **Inizializzazione Client**: Con `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Export Singleton**: `export const supabase = createClient(...)`

**Note Tecniche**:
- Usa `@supabase/supabase-js`
- RLS gestisce accesso automaticamente
- Usato in tutti i componenti frontend per query dirette

---

#### **`/lib/authHelper.js` - Helper Autenticazione**

**Scopo**: Utilities per validazione token Bearer in API routes.

**Funzioni**:
- `extractBearerToken(request)`: Estrae token da header Authorization
- `validateToken(token)`: Valida token con Supabase Auth
- Return `{ user_id, email }` se valido, `null` se invalido

**Note Tecniche**:
- Usato in tutte le API routes che richiedono autenticazione
- Gestione errori robusta

---

#### **`/lib/openaiHelper.js` - Helper OpenAI**

**Scopo**: Utilities per chiamate OpenAI API.

**Funzioni**:
- `callOpenAIWithRetry(messages, options, maxRetries = 3)`: Chiamata OpenAI con retry automatico
- Gestione errori, retry con backoff esponenziale
- Supporta `response_format: { type: "json_object" }` per output JSON

**Note Tecniche**:
- Usa `OPENAI_API_KEY` da variabili ambiente
- Retry automatico per errori temporanei
- Logging dettagliato per debugging

---

#### **`/lib/rateLimiter.js` - Rate Limiting**

**Scopo**: Sistema rate limiting in-memory per protezione API.

**Configurazione**:
```javascript
const RATE_LIMIT_CONFIG = {
  '/api/analyze-match': { maxRequests: 10, windowMs: 60000 },
  '/api/assistant-chat': { maxRequests: 30, windowMs: 60000 },
  // ... altri endpoint
}
```

**Funzioni**:
- `checkRateLimit(userId, endpoint)`: Verifica se utente ha superato limite
- Return `{ allowed: boolean, remaining: number, resetAt: Date }`

**Note Tecniche**:
- **In-Memory**: Per produzione, usare Redis
- Reset automatico ogni `windowMs`
- Headers rate limit restituiti in risposta

---

#### **`/lib/i18n.js` - Sistema Internazionalizzazione**

**Scopo**: Sistema i18n custom per supporto IT/EN.

**Struttura**:
- `translations`: Oggetto con chiavi `it` e `en`
- Ogni chiave contiene traduzioni per quella lingua
- `useTranslation()`: Hook React per accesso traduzioni

**Funzioni**:
- `t(key)`: Restituisce traduzione per chiave (fallback a EN se manca)
- `changeLanguage(newLang)`: Cambia lingua e salva in localStorage

**Note Tecniche**:
- **1400+ righe**: File grande con tutte le traduzioni
- **Fallback**: Se traduzione IT manca, usa EN
- **Persistenza**: Lingua salvata in localStorage

---

#### **`/lib/normalize.js` - Normalizzazione Dati**

**Scopo**: Utilities per normalizzare dati estratti da AI.

**Funzioni**:
- Normalizzazione nomi giocatori
- Normalizzazione ruoli/posizioni
- Normalizzazione statistiche
- Normalizzazione formato bilingue

**Note Tecniche**:
- Usato dopo estrazione dati da OpenAI
- Garantisce coerenza dati nel database

---

#### **`/lib/countermeasuresHelper.js` - Helper Contromisure**

**Scopo**: Logica tattica per generazione contromisure.

**Funzioni**:
- Analisi formazione avversaria
- Suggerimenti basati su storico
- Calcolo priorità suggerimenti

---

#### **`/lib/tacticalInstructions.js` - Istruzioni Tattiche**

**Scopo**: Utilities per generazione istruzioni tattiche.

**Funzioni**:
- Generazione istruzioni individuali
- Istruzioni basate su posizione
- Istruzioni basate su stile avversario

---

### **`/migrations` - Migrazioni Database**

Cartella con file SQL per migrazioni Supabase.

**File Principali**:
- `create_user_profiles_table.sql`: Crea tabella profili utente
- `create_matches_table.sql`: Crea tabella partite
- `create_team_tactical_settings.sql`: Crea tabella impostazioni tattiche
- `create_coaches_table.sql`: Crea tabella allenatori
- `fix_slot_index_and_rls.sql`: Fix RLS e indici

**Note Tecniche**:
- Eseguire migrazioni in ordine
- Usare Supabase Dashboard o `scripts/run-migration.js`

---

## 🗄️ DATABASE SCHEMA

### **Tabelle Principali**

#### **`user_profiles` - Profili Utente**

**Scopo**: Dati personali e preferenze utente.

**Colonne Principali**:
- `user_id` (UUID, PK, FK → auth.users)
- `first_name`, `last_name` (text)
- `team_name` (text)
- `current_division` (text)
- `favorite_team` (text)
- `ai_name` (text) - Nome personalizzato per AI
- `how_to_remember` (text) - Come AI deve ricordare utente
- `common_problems` (text[]) - Array problemi comuni
- `profile_completion_score` (numeric) - 0-100
- `profile_completion_level` (text) - "beginner" | "intermediate" | "advanced" | "expert"

**RLS**: Abilitato, utente può leggere/scrivere solo il proprio profilo.

---

#### **`players` - Giocatori Rosa**

**Scopo**: Giocatori della rosa cliente.

**Colonne Principali**:
- `id` (UUID, PK)
- `user_id` (UUID, FK → auth.users)
- `name`, `role`, `position` (text)
- `rating` (numeric)
- `team` (text)
- `slot_index` (integer) - 0-10 = titolare, NULL = riserva
- `photo_slots` (JSONB) - Traccia quali foto sono caricate: `{ card: true, stats: false, skills: false }`
- `statistics` (JSONB) - Statistiche complete
- `skills` (JSONB) - Array abilità
- `boosters` (JSONB) - Array booster

**RLS**: Abilitato, utente può leggere/scrivere solo i propri giocatori.

**Indici**:
- `idx_players_user_slot`: `(user_id, slot_index)` per query veloci

---

#### **`matches` - Partite**

**Scopo**: Storico partite cliente.

**Colonne Principali**:
- `id` (UUID, PK)
- `user_id` (UUID, FK → auth.users)
- `result` (text) - "win" | "draw" | "loss"
- `player_ratings` (JSONB) - Array voti giocatori
- `team_stats` (JSONB) - Statistiche squadra
- `attack_areas` (JSONB) - Percentuali aree attacco
- `ball_recovery_zones` (JSONB) - Coordinate recuperi palla
- `formation_played` (text) - Formazione usata
- `playing_style_played` (text) - Stile di gioco usato
- `opponent_formation_id` (UUID, FK → opponent_formations)
- `players_in_match` (JSONB) - Disposizione reale giocatori (opzionale)
- `ai_summary` (JSONB) - Riassunto AI bilingue (IT/EN)
- `created_at`, `updated_at` (timestamptz)

**RLS**: Abilitato, utente può leggere/scrivere solo le proprie partite.

**Indici**:
- `idx_matches_user_created`: `(user_id, created_at DESC)` per query ultime partite

---

#### **`formation_layout` - Layout Formazione**

**Scopo**: Coordinate slot per ogni formazione.

**Colonne Principali**:
- `id` (UUID, PK)
- `user_id` (UUID, FK → auth.users, UNIQUE)
- `formation` (text) - "4-3-3", "4-2-3-1", ecc.
- `slot_positions` (JSONB) - Array coordinate `[{ slot: 0, x: 50, y: 20 }, ...]`

**RLS**: Abilitato, un layout per utente (UNIQUE constraint).

---

#### **`opponent_formations` - Formazioni Avversarie**

**Scopo**: Formazioni avversarie caricate.

**Colonne Principali**:
- `id` (UUID, PK)
- `user_id` (UUID, FK → auth.users)
- `formation` (text)
- `playing_style` (text)
- `team_strength` (numeric)

**RLS**: Abilitato.

---

#### **`team_tactical_patterns` - Pattern Tattici**

**Scopo**: Pattern tattici ricorrenti identificati da AI.

**Colonne Principali**:
- `id` (UUID, PK)
- `user_id` (UUID, FK → auth.users)
- `pattern_type` (text)
- `recurring_issues` (JSONB) - Array problemi ricorrenti

**RLS**: Abilitato.

---

#### **`coaches` - Allenatori**

**Scopo**: Allenatori caricati.

**Colonne Principali**:
- `id` (UUID, PK)
- `user_id` (UUID, FK → auth.users)
- `name` (text)
- `style` (text)
- `is_active` (boolean)

**RLS**: Abilitato.

---

## 🔒 SICUREZZA E AUTENTICAZIONE

### **Autenticazione**

**Pattern**:
- **Frontend**: Supabase Auth (`supabase.auth.signInWithPassword()`)
- **Backend**: Bearer token in header `Authorization: Bearer <token>`
- **Validazione**: `authHelper.js` → `validateToken()` con Supabase Auth

**Endpoints Protetti**:
- Tutti gli endpoint in `/app/api/supabase/*` richiedono autenticazione
- `/api/analyze-match` richiede autenticazione
- `/api/assistant-chat` richiede autenticazione

**Endpoints Pubblici** (da proteggere in futuro):
- `/api/extract-player` - Attualmente pubblico
- `/api/extract-formation` - Attualmente pubblico

---

### **Row Level Security (RLS)**

**Tutte le tabelle hanno RLS abilitato**:
- Utente può leggere/scrivere solo i propri dati
- Filtro automatico `user_id` in tutte le query
- Service Role Key usato solo in API routes (server-only)

**Policy Esempio**:
```sql
CREATE POLICY "Users can read own players"
ON players FOR SELECT
USING (auth.uid() = user_id);
```

---

### **Rate Limiting**

**Configurazione**:
- `/api/analyze-match`: 10 richieste/minuto
- `/api/assistant-chat`: 30 richieste/minuto
- Altri endpoint: Configurabili in `rateLimiter.js`

**Implementazione**:
- In-memory (per produzione, usare Redis)
- Contatore per utente
- Reset automatico ogni `windowMs`

---

### **Input Validation**

**Tutti gli endpoint validano**:
- Tipo dati (string, number, array, ecc.)
- Dimensione input (max length, max size)
- Formato dati (email, UUID, ecc.)
- Presenza campi obbligatori

---

## 🌍 INTERNAZIONALIZZAZIONE

### **Sistema i18n**

**Implementazione**: Custom con React Context (`lib/i18n.js`)

**Lingue Supportate**:
- **Italiano (IT)**: Default
- **Inglese (EN)**: Completo

**Uso**:
```javascript
const { t, lang, changeLanguage } = useTranslation()
const text = t('dashboard') // "Dashboard" o "Dashboard"
```

**Persistenza**: Lingua salvata in `localStorage` (`app_language`)

**Traduzioni**:
- **1400+ righe** in `lib/i18n.js`
- Ogni chiave ha traduzione IT e EN
- Fallback: Se IT manca, usa EN

**Componenti con i18n**:
- Tutte le pagine frontend
- Assistant Chat (risposte AI in lingua utente)
- Riassunto AI (bilingue IT/EN)

---

## ⚙️ CONFIGURAZIONE E DEPLOY

### **Variabili Ambiente**

**Richiesta per Funzionamento**:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# OpenAI
OPENAI_API_KEY=sk-...
```

**Vercel Production**:
- Configurare in Vercel Dashboard → Settings → Environment Variables
- Tutte le variabili devono essere presenti

---

### **Deploy Vercel**

**Processo**:
1. Push a GitHub
2. Vercel auto-deploy su push a `main`
3. Build Next.js automatico
4. Serverless functions deployate

**Note**:
- API routes diventano serverless functions
- Variabili ambiente configurate in Vercel Dashboard
- Logs disponibili in Vercel Dashboard

---

### **Setup Locale**

```bash
# Installazione dipendenze
npm install

# Sviluppo
npm run dev

# Build produzione
npm run build

# Start produzione
npm start
```

**File `.env.local`** (non committato):
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=...
```

---

## 🔄 FLUSSI PRINCIPALI

### **Flusso 1: Caricamento Formazione**

1. Cliente va su `/gestione-formazione`
2. Seleziona formazione (es: "4-3-3")
3. Carica screenshot formazione completa
4. Click "Estrai Formazione"
5. Frontend chiama `/api/extract-formation`
6. Backend estrae 11 giocatori con AI
7. Frontend mostra preview giocatori
8. Cliente conferma → salvataggio automatico
9. Giocatori salvati come TITOLARI (slot_index 0-10)

---

### **Flusso 2: Caricamento Giocatore**

1. Cliente seleziona slot (titolare o riserva)
2. Carica 1-3 screenshot (card, stats, skills/booster)
3. Click "Estrai Dati"
4. Frontend chiama `/api/extract-player`
5. Backend estrae dati completi con AI
6. Frontend mostra preview dati
7. Cliente conferma → salvataggio
8. Giocatore salvato con `slot_index` (0-10 = titolare, NULL = riserva)
9. `photo_slots` aggiornato per tracciare foto caricate

---

### **Flusso 3: Aggiunta Partita**

1. Cliente va su `/match/new`
2. **Step 1**: Carica screenshot pagelle → "Estrai Dati" → `/api/extract-match-data`
3. **Step 2**: Carica screenshot statistiche → "Estrai Dati"
4. **Step 3**: Carica screenshot aree attacco → "Estrai Dati"
5. **Step 4**: Carica screenshot recuperi palla → "Estrai Dati"
6. **Step 5**: Carica screenshot formazione avversaria → "Estrai Dati"
7. Click "Salva Partita" → `/api/supabase/save-match`
8. Redirect a `/match/[id]`

---

### **Flusso 4: Generazione Riassunto AI**

1. Cliente va su `/match/[id]`
2. Click "Genera Riassunto AI"
3. Frontend chiama `/api/analyze-match` con `match_id`
4. Backend recupera:
   - Dati partita
   - Profilo utente
   - Rosa cliente
   - Storico match (ultimi 30)
   - Pattern tattici
   - Formazione avversaria
5. Backend chiama OpenAI GPT-4o con prompt completo
6. AI genera riassunto bilingue (IT/EN)
7. Backend salva `ai_summary` in `matches`
8. Frontend mostra riassunto con selezione lingua

---

### **Flusso 5: Assistant Chat**

1. Cliente click icona cervello (bottom-right)
2. Widget chat si apre
3. Cliente scrive messaggio (es: "Come carico una partita?")
4. Frontend chiama `/api/assistant-chat` con `message` e `currentPage`
5. Backend recupera profilo utente
6. Backend chiama OpenAI GPT-4o con prompt personalizzato
7. AI risponde in modo personale e amichevole
8. Frontend mostra risposta nella chat
9. Cliente può continuare conversazione

---

## 📊 METRICHE E MONITORAGGIO

### **Logging**

**Frontend**:
- `console.log('[ComponentName]', ...)` per debugging
- Errori loggati con dettagli completi

**Backend**:
- `console.log('[endpoint-name]', ...)` per tracciamento
- Errori loggati con stack trace

**Vercel**:
- Logs disponibili in Vercel Dashboard
- Function logs per ogni API route

---

### **Performance**

**Tempi Tipici**:
- Estrazione formazione: ~3-5 secondi (OpenAI Vision)
- Estrazione giocatore: ~2-4 secondi per immagine
- Analisi partita: ~5-10 secondi (OpenAI GPT-4o)
- Assistant Chat: ~1-3 secondi (OpenAI GPT-4o)
- Query Supabase: ~100-200ms

---

## 🎨 DESIGN E UX

### **Stile Neon**

**Tema**: Design neon con glow effects, compatibile con gaming/esports.

**Colori Principali**:
- `--neon-blue`: #00d4ff (primary)
- `--neon-purple`: #a855f7 (secondary)
- `--neon-orange`: #ff6b35 (accent)
- `--neon-pink`: #ec4899 (accent)
- `--neon-cyan`: #00f5ff (accent)

**CSS Globale** (`app/globals.css`):
- Variabili CSS per colori
- Animazioni (bounce, pulse)
- Glow effects
- Responsive design

---

### **Componenti UI**

**Pattern Comune**:
- Card con bordo neon e glow effect
- Button con hover effects
- Modal per dettagli
- Loading indicators animati
- Error messages user-friendly

---

## ✅ STATUS IMPLEMENTAZIONE

### **Funzionalità Complete** ✅

- ✅ Dashboard con statistiche
- ✅ Gestione formazione 2D
- ✅ Upload formazione e giocatori
- ✅ Wizard aggiungi partita (5 step)
- ✅ Dettaglio partita con riassunto AI
- ✅ Dettaglio giocatore
- ✅ Impostazioni profilo
- ✅ Guida completa interattiva
- ✅ Assistant Chat AI
- ✅ Supporto bilingue IT/EN
- ✅ Autenticazione e sicurezza
- ✅ Rate limiting

### **Funzionalità Parziali** ⏳

- ⏳ Contromisure Live (backend completo, frontend da migliorare)
- ⏳ Gestione Allenatori (base implementata)

### **Pianificato** 📋

- 📋 Hero Points / Sistema crediti
- 📋 Voice AI Coach (GPT-Realtime)
- 📋 Analytics avanzate
- 📋 Export dati

---

## 📝 NOTE FINALI

### **Best Practices**

1. **Query Dirette**: Usa Supabase Client per letture (gratis, veloce)
2. **API Routes**: Usa solo per operazioni complesse o chiamate OpenAI
3. **RLS**: Sempre abilitato, non bypassare
4. **Error Handling**: Try-catch completo, messaggi user-friendly
5. **i18n**: Tutte le stringhe UI devono essere tradotte

### **Manutenzione**

- **Aggiornamento Dipendenze**: `npm update` regolarmente
- **Migrazioni Database**: Eseguire in ordine, testare in dev
- **Logs**: Monitorare Vercel logs per errori
- **Rate Limits**: Aggiustare in base a utilizzo reale

---

**Ultimo Aggiornamento**: 23 Gennaio 2026  
**Versione Documentazione**: 2.0.0  
**Status**: ✅ **PRODUZIONE** - Sistema Completo e Funzionante
