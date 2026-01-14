# 🚀 Sprint 1: Screenshot Analysis con GPT-Realtime - Implementation Plan

**Data**: 2025-01-12  
**Status**: 🟡 IN PROGRESS  
**Focus**: Enterprise-ready implementation con allineamento al contesto progetto

---

## 🎯 OBIETTIVO SPRINT 1

Implementare l'analisi screenshot con GPT-Realtime seguendo i principi del progetto:
- ✅ **Profilazione Progressiva**: Non salvare senza conferma utente
- ✅ **CandidateProfile**: Output con value/status/confidence per ogni campo
- ✅ **State Machine**: empty → suggested → editing → confirmed
- ✅ **Enterprise Ready**: Error handling, logging, validazione, performance

---

## 📋 TASK BREAKDOWN

### **Task 1.1: Edge Function process-screenshot-gpt** (Priorità ALTA)
**Obiettivo**: Sostituire Google Vision con GPT-Realtime per analisi profilo giocatore

**File**: `supabase/functions/process-screenshot-gpt/index.ts`

**Requisiti Enterprise**:
- ✅ Error handling completo
- ✅ Logging strutturato
- ✅ Validazione input
- ✅ Rate limiting ready
- ✅ Caching ready
- ✅ Non salvare dati (solo estrazione)
- ✅ Output CandidateProfile con confidence

**Dipendenza**: OpenAI GPT-4o Realtime API key

---

### **Task 1.2: Edge Function analyze-heatmap-screenshot-gpt** (Priorità MEDIA)
**Obiettivo**: Analisi heat maps partita (Aree di recupero/attacco)

**File**: `supabase/functions/analyze-heatmap-screenshot-gpt/index.ts`

**Requisiti Enterprise**:
- ✅ Estrazione coordinate/percentuali
- ✅ Pattern analysis
- ✅ Validazione dati estratti

---

### **Task 1.3: Edge Function analyze-squad-formation-gpt** (Priorità MEDIA)
**Obiettivo**: Analisi formazione squadra completa

**File**: `supabase/functions/analyze-squad-formation-gpt/index.ts`

**Requisiti Enterprise**:
- ✅ Estrazione 11 giocatori
- ✅ Formazione tattica
- ✅ Forza complessiva
- ✅ Validazione squadra completa

---

### **Task 1.4: Edge Function analyze-player-ratings-gpt** (Priorità MEDIA)
**Obiettivo**: Estrazione voti post-partita (Pagelle giocatori)

**File**: `supabase/functions/analyze-player-ratings-gpt/index.ts`

**Requisiti Enterprise**:
- ✅ Estrazione lista completa voti
- ✅ Top performer detection
- ✅ Analisi distribuzione voti

---

### **Task 1.5: Componenti Frontend** (Priorità ALTA)
**Obiettivo**: Integrare nuove Edge Functions nel frontend

**File da modificare/creare**:
- `components/rosa/ScreenshotUpload.jsx` - Usare process-screenshot-gpt
- `components/analisi/HeatMapScreenshotUpload.jsx` - NUOVO
- `components/rosa/SquadFormationScreenshotUpload.jsx` - NUOVO
- `components/statistiche/PlayerRatingsUpload.jsx` - NUOVO

**Requisiti Enterprise**:
- ✅ UI per visualizzare CandidateProfile
- ✅ Badge per status (certain/uncertain/missing)
- ✅ Form per completare/correggere
- ✅ Bottone "Conferma" (solo dopo conferma salva)

---

### **Task 1.6: Database Schema Updates** (Priorità MEDIA)
**Obiettivo**: Aggiungere tabelle/campi per nuovi casi d'uso

**Migration**: `003_add_gpt_realtime_support.sql`

**Tabelle da creare/aggiornare**:
- `candidate_profiles` - Profili non confermati
- `heat_maps` - Heat maps estratte
- `chart_data` - Dati da grafici
- `player_match_ratings` - Voti post-partita
- `squad_formations` - Formazioni squadra

---

### **Task 1.7: Allineamento e Testing** (Priorità ALTA)
**Obiettivo**: Verificare allineamento contesto progetto e funzionamento

**Checklist**:
- ✅ Profilazione progressiva rispettata (no auto-save)
- ✅ CandidateProfile con confidence
- ✅ State machine implementata
- ✅ Error handling enterprise
- ✅ Logging completo
- ✅ Performance acceptable

---

## 🏗️ ARCHITETTURA IMPLEMENTAZIONE

### **Pattern Edge Function (Enterprise)**:

```typescript
// Pattern standard per tutte le Edge Functions GPT-Realtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface Request {
  image_url: string
  image_type: string
  user_id: string
}

interface CandidateProfile {
  // Output con value/status/confidence per ogni campo
  [field: string]: {
    value: any | null
    status: "certain" | "uncertain" | "missing"
    confidence: number // 0.0-1.0
  }
}

serve(async (req) => {
  try {
    // 1. Validazione input
    // 2. Log entry (no save)
    // 3. Download image
    // 4. GPT-Realtime API call
    // 5. Parse CandidateProfile
    // 6. Validazione output
    // 7. Return CandidateProfile (NO SAVE)
  } catch (error) {
    // Enterprise error handling
  }
})
```

### **Pattern Frontend (Enterprise)**:

```typescript
// Pattern standard per componenti screenshot upload
1. Upload screenshot → Supabase Storage
2. Call Edge Function GPT-Realtime
3. Receive CandidateProfile
4. Display con badge status
5. User review/edit/correct
6. User click "Conferma"
7. THEN save to database (solo confirmed)
```

---

## 🔒 REQUISITI ENTERPRISE

### **Security**:
- ✅ Input validation
- ✅ Rate limiting ready
- ✅ CORS configurato
- ✅ Error messages non esporre internals

### **Performance**:
- ✅ Timeout configurabili
- ✅ Caching ready (stesso screenshot = stesso risultato)
- ✅ Async processing ready

### **Reliability**:
- ✅ Error handling completo
- ✅ Retry logic ready
- ✅ Logging strutturato
- ✅ Monitoring ready

### **Maintainability**:
- ✅ Codice documentato
- ✅ Type safety (quando possibile)
- ✅ Consistent patterns
- ✅ Testable architecture

---

## 📊 CRITERI DI ACCETTAZIONE

### **Funzionalità**:
- ✅ Tutte le Edge Functions GPT-Realtime implementate
- ✅ CandidateProfile output con confidence
- ✅ Frontend mostra status per ogni campo
- ✅ Salvataggio solo dopo conferma utente

### **Enterprise**:
- ✅ Error handling completo
- ✅ Logging strutturato
- ✅ Validazione input/output
- ✅ Performance acceptable (<5s per screenshot)

### **Allineamento Progetto**:
- ✅ Profilazione progressiva rispettata
- ✅ Non salvare senza conferma
- ✅ State machine implementata
- ✅ Dizionari canonici per skills/booster/stili

---

---

## ✅ STATO IMPLEMENTAZIONE

### **Edge Functions Completate**:
- ✅ **Task 1.1**: `process-screenshot-gpt` - Completato (enterprise-ready)
- ✅ **Task 1.2**: `analyze-heatmap-screenshot-gpt` - Completato
- ✅ **Task 1.3**: `analyze-squad-formation-gpt` - Completato
- ✅ **Task 1.4**: `analyze-player-ratings-gpt` - Completato
- ✅ **Task 1.6**: Database schema migration 003 - Completato

### **In Progress**:
- ⏳ **Task 1.5**: Componenti Frontend - Da implementare
- ⏳ **Task 1.7**: Test e validazione - Da fare

### **Allineamento Enterprise**:
- ✅ Profilazione progressiva rispettata (NO auto-save)
- ✅ CandidateProfile con confidence per ogni campo
- ✅ Error handling completo
- ✅ Logging strutturato
- ✅ Validazione input/output
- ✅ Security checks (CORS, error messages)

---

**Status**: 🟢 **SPRINT 1 - BACKEND COMPLETATO** - Edge Functions pronte per deployment
