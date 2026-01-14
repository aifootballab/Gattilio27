# 🔍 Analisi Completa: Codice Essenziale vs Non Necessario

## ✅ CODICE ESSENZIALE (Mantenere)

### **Frontend - Componenti Core**

#### **1. AIBrainButton** ✅ ESSENZIALE
- File: `components/dashboard/AIBrainButton.jsx`
- Usa: VoiceCoachingPanel, ScreenshotUpload, gptRealtimeService
- Funzione: Punto centrale che apre conversazione/screenshot

#### **2. VoiceCoachingPanel** ✅ ESSENZIALE
- File: `components/coaching/VoiceCoachingPanel.jsx`
- Usa: gptRealtimeService, useRosa, supabase
- Funzione: Conversazione GPT Realtime

#### **3. ScreenshotUpload** ✅ ESSENZIALE (da modificare)
- File: `components/rosa/ScreenshotUpload.jsx`
- Usa: visionService, rosaService, playerService, PlayerDestinationSelector
- Funzione: Upload screenshot e precompilazione form
- **DA MODIFICARE**: Usare GPT Realtime invece di visionService

#### **4. PlayerDestinationSelector** ✅ ESSENZIALE
- File: `components/rosa/PlayerDestinationSelector.jsx`
- Usa: useRosa
- Funzione: Seleziona dove inserire giocatore (titolare/riserva)

#### **5. DashboardLayout** ✅ ESSENZIALE
- File: `components/dashboard/DashboardLayout.jsx`
- Usa: SidebarNavigation, MainHeader
- Funzione: Layout principale

#### **6. RosaStatusPanel** ✅ ESSENZIALE
- File: `components/dashboard/RosaStatusPanel.jsx`
- Funzione: Mostra stato rosa

#### **7. RosaContext** ✅ ESSENZIALE
- File: `contexts/RosaContext.tsx`
- Usa: rosaService, playerService
- Funzione: Gestione stato rosa globale

### **Frontend - Servizi**

#### **1. gptRealtimeService** ✅ ESSENZIALE
- File: `services/gptRealtimeService.js`
- Funzione: Connessione GPT Realtime API

#### **2. rosaService** ✅ ESSENZIALE
- File: `services/rosaService.js`
- Usato da: RosaContext, ScreenshotUpload
- Funzione: Operazioni su rosa

#### **3. playerService** ✅ ESSENZIALE
- File: `services/playerService.js`
- Usato da: RosaContext, ScreenshotUpload
- Funzione: Operazioni su giocatori

#### **4. visionService** ⚠️ DA SOSTITUIRE
- File: `services/visionService.js`
- Usato da: ScreenshotUpload
- **DA SOSTITUIRE**: Usare GPT Realtime invece

### **Backend - Edge Functions**

#### **1. execute-function** ✅ ESSENZIALE
- File: `supabase/functions/execute-function/index.ts`
- Funzione: Esegue function calls da GPT Realtime

#### **2. functions.ts** ✅ ESSENZIALE
- File: `supabase/functions/functions.ts`
- Funzione: Implementazioni funzioni business

#### **3. process-screenshot-gpt** ✅ ESSENZIALE (per analisi screenshot)
- File: `supabase/functions/process-screenshot-gpt/index.ts`
- Funzione: Analizza screenshot con GPT-4o Vision

## ❌ CODICE NON NECESSARIO (Rimuovere)

### **Frontend - Componenti Non Usati**

#### **Componenti Rosa Non Essenziali** ❌
- RosaManualInput (form manuale - non serve se usiamo GPT)
- RosaVoiceInput (non usato)
- RosaViewer (visualizzazione - non essenziale)
- RosaTitolari (visualizzazione - non essenziale per flusso)
- RosaPanchina (visualizzazione - non essenziale per flusso)
- RosaProfiling (analisi - non essenziale)
- RosaAnalysis (analisi - non essenziale)
- RosaPrecompilatoInput (non usato)
- RosaScreenshotInput (duplicato di ScreenshotUpload)
- PlayerCard, PlayerAutocomplete, PlayerCardDetailed (non essenziali per flusso)

#### **Componenti Dashboard Non Essenziali** ❌
- UserInfoPanel (non essenziale)
- MainHeader (se non usato)
- SidebarNavigation (se non usato)

#### **Componenti Altri** ❌
- Tutti i componenti in `analisi/`, `avversario/`, `match-center/`, `opponent/`, `post-match/`, `sinergie/`, `statistiche/`
- Componenti in `pages/` non usati
- AdminImportJSON (solo per admin)

### **Frontend - Servizi Non Usati**

#### **Servizi Non Essenziali** ❌
- `coachingService.js` - Non usato nel flusso GPT Realtime
- `importService.js` - Solo per admin
- `managerService.js` - Solo per sinergie
- `strengthService.js` - Solo per sinergie
- `suggestionService.js` - Solo per dashboard (non essenziale)

### **Backend - Edge Functions Non Usate**

#### **Edge Functions Non Essenziali** ❌
- `analyze-heatmap-screenshot-gpt` - Non usata
- `analyze-player-ratings-gpt` - Non usata
- `analyze-rosa` - Non usata
- `analyze-squad-formation-gpt` - Non usata
- `import-players-from-drive` - Solo admin
- `import-players-json` - Solo admin
- `process-screenshot` - Vecchia (usare process-screenshot-gpt)
- `scrape-managers` - Solo admin
- `scrape-players` - Solo admin

### **Pagine Non Essenziali**

#### **Pagine da Rimuovere** ❌
- `app/admin/` - Solo admin
- `app/analisi-partite/` - Non essenziale
- `app/avversario/` - Non essenziale
- `app/sinergie/` - Non essenziale
- `app/statistiche/` - Non essenziale
- Mantenere solo: `app/dashboard/`, `app/rosa/`, `app/page.tsx`

## 📋 TABELLE DATABASE (Predefinite - Mantenere)

### **Tabelle Essenziali** ✅
- `players_base` - Database giocatori
- `player_builds` - Build utente
- `user_rosa` - Rose utente
- `screenshot_processing_log` - Log screenshot
- `coaching_sessions` - Sessioni coaching
- `user_profiles` - Profili utente

### **Tabelle Supporto** ✅
- `boosters` - Booster disponibili
- `playing_styles` - Stili di gioco
- `team_playing_styles` - Stili squadra
- `managers` - Manager
- `position_competency` - Competenze posizione

### **Tabelle Opzionali** ⚠️
- `unified_match_contexts` - Contesti partita (non usato nel flusso base)
- `coaching_suggestions` - Suggerimenti (non usato nel flusso base)
- `candidate_profiles` - Profili candidati (usato per validazione form)
- `heat_maps`, `chart_data`, `player_match_ratings`, `squad_formations` - Analisi avanzate (non essenziali)

## 🎯 PIANO DI PULIZIA

### **Fase 1: Rimuovere Componenti Non Usati**
1. Rimuovere componenti rosa non essenziali
2. Rimuovere componenti dashboard non essenziali
3. Rimuovere componenti analisi/avversario/sinergie/statistiche

### **Fase 2: Rimuovere Servizi Non Usati**
1. Rimuovere coachingService, importService, managerService, strengthService, suggestionService
2. Aggiornare services/index.js

### **Fase 3: Rimuovere Edge Functions Non Usate**
1. Rimuovere edge functions non essenziali
2. Mantenere solo: execute-function, functions.ts, process-screenshot-gpt

### **Fase 4: Rimuovere Pagine Non Essenziali**
1. Rimuovere pagine admin, analisi-partite, avversario, sinergie, statistiche
2. Mantenere solo: dashboard, rosa, home

### **Fase 5: Modificare ScreenshotUpload**
1. Sostituire visionService con gptRealtimeService
2. Usare GPT Realtime per analisi screenshot
3. Precompilare form automaticamente
