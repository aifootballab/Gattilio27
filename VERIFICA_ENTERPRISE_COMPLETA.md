# ✅ Verifica Enterprise Completa - GPT-Realtime Integration

**Data**: 2025-01-14  
**Status**: 🔍 **VERIFICA IN CORSO**  
**Obiettivo**: Verificare che tutto funzioni per risultato enterprise

---

## 📋 CHECKLIST VERIFICA

### **1. Configurazione OpenAI API Key** ✅

**Verifica**:
- [x] Chiave OpenAI configurata come secret in Supabase
- [ ] Secret `OPENAI_API_KEY` presente e accessibile
- [ ] Edge Functions possono accedere al secret

**Come verificare**:
```sql
-- Verifica che le Edge Functions possano accedere ai secrets
-- (da verificare nel Dashboard → Edge Functions → Settings → Secrets)
```

**Azione richiesta**:
1. Vai su **Supabase Dashboard** → **Edge Functions** → **Settings** → **Secrets**
2. Verifica che `OPENAI_API_KEY` sia presente
3. Se manca, aggiungi: `OPENAI_API_KEY` = `sk-...` (la tua chiave)

---

### **2. Edge Functions GPT-Realtime Deployate** ⚠️

**Stato attuale**: ❌ **NON DEPLOYATE**

**Edge Functions da deployare**:
- [ ] `process-screenshot-gpt` - Analisi profilo giocatore
- [ ] `analyze-heatmap-screenshot-gpt` - Analisi heat maps
- [ ] `analyze-squad-formation-gpt` - Analisi formazioni squadra
- [ ] `analyze-player-ratings-gpt` - Analisi voti post-partita

**Azione richiesta**:
1. Deployare tutte le 4 Edge Functions tramite Supabase Dashboard o CLI
2. Verificare che siano ACTIVE
3. Testare endpoint con screenshot di test

**Deploy tramite Dashboard**:
1. Vai su **Supabase Dashboard** → **Edge Functions** → **Functions**
2. Clicca **"New function"**
3. Per ogni funzione:
   - Nome: `process-screenshot-gpt`
   - Copia contenuto da `supabase/functions/process-screenshot-gpt/index.ts`
   - Clicca **"Deploy"**

---

### **3. Database Schema GPT-Realtime** ✅

**Verifica tabelle**:
- [x] `candidate_profiles` - Profili non confermati
- [x] `heat_maps` - Heat maps estratte
- [x] `chart_data` - Dati grafici/statistiche
- [x] `player_match_ratings` - Voti post-partita
- [x] `squad_formations` - Formazioni squadra
- [x] `screenshot_processing_log` - Log processing (aggiornato)

**Verifica**:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'candidate_profiles',
    'heat_maps',
    'chart_data',
    'player_match_ratings',
    'squad_formations'
  );
```

**Status**: ✅ **TUTTE LE TABELLE ESISTONO**

---

### **4. Frontend: Trascinamento Foto** ⚠️

**Componente**: `ScreenshotUpload.jsx`

**Stato attuale**:
- ✅ Drag & drop implementato
- ✅ Upload a Supabase Storage funzionante
- ❌ **USA VECCHIO `process-screenshot`** (Google Vision, non GPT-Realtime)
- ❌ **NON usa `process-screenshot-gpt`**

**Azione richiesta**:
1. Aggiornare `visionService.js` per usare `process-screenshot-gpt`
2. Aggiornare `ScreenshotUpload.jsx` per gestire CandidateProfile
3. Implementare UI per visualizzare CandidateProfile con badge status
4. Implementare form conferma utente

**Modifiche necessarie**:

#### **visionService.js**:
```javascript
// SOSTITUIRE:
export async function processScreenshot(imageUrl, imageType, userId) {
  const { data, error } = await supabase.functions.invoke('process-screenshot', {
    // ...
  })
}

// CON:
export async function processScreenshotGPT(imageUrl, imageType, userId) {
  const { data, error } = await supabase.functions.invoke('process-screenshot-gpt', {
    body: {
      image_url: imageUrl,
      image_type: imageType,
      user_id: userId
    }
  })
  
  // Restituisce CandidateProfile (non salva nulla)
  return data
}
```

#### **ScreenshotUpload.jsx**:
```javascript
// Gestire CandidateProfile invece di extracted_data
const [candidateProfile, setCandidateProfile] = useState(null)

// Dopo chiamata GPT:
setCandidateProfile(result.candidate_profile)

// Mostrare UI con badge status (certain/uncertain/missing)
// Form per conferma/modifica
// Salvataggio solo dopo conferma
```

---

### **5. Popolamento Tabelle** ⚠️

**Flusso atteso**:
1. Utente carica screenshot
2. GPT-Realtime analizza e restituisce CandidateProfile
3. Utente conferma/modifica dati
4. **Solo dopo conferma**: Salvataggio in database

**Tabelle da popolare**:
- `candidate_profiles` - Dopo conferma utente
- `players_base` - Dati deterministici (nome, nazionalità, etc.)
- `player_builds` - Dati configurabili (livello, booster, etc.)
- `screenshot_processing_log` - Log processing

**Azione richiesta**:
1. Implementare funzione `confirmCandidateProfile()` che:
   - Salva in `candidate_profiles` con stato `confirmed`
   - Estrae dati deterministici → `players_base`
   - Estrae dati configurabili → `player_builds`
   - Aggiorna `screenshot_processing_log`

**Implementazione**:
```javascript
// services/candidateProfileService.js
export async function confirmCandidateProfile(candidateProfileId, userId) {
  // 1. Aggiorna candidate_profiles a stato 'confirmed'
  // 2. Estrai dati deterministici → players_base
  // 3. Estrai dati configurabili → player_builds
  // 4. Aggiorna screenshot_processing_log
}
```

---

### **6. Dettatura/Chat Vocale** ❌

**Stato attuale**: ❌ **NON IMPLEMENTATO** (solo mock)

**Componente**: `RosaVoiceInput.jsx`

**Cosa serve**:
1. **Edge Function**: `voice-coaching-gpt` o `voice-input-gpt`
2. **Frontend**: Integrazione Web Speech API o OpenAI Whisper
3. **Backend**: GPT-Realtime per analisi voce e generazione risposta

**Implementazione richiesta**:

#### **Opzione 1: OpenAI Whisper + GPT-Realtime**
```javascript
// 1. Registra audio utente
// 2. Invia a OpenAI Whisper per trascrizione
// 3. Invia trascrizione a GPT-Realtime per analisi
// 4. Genera risposta vocale (TTS) o testuale
```

#### **Opzione 2: GPT-Realtime Voice API**
```javascript
// Usa direttamente GPT-Realtime Voice API
// Streaming audio bidirezionale
```

**Azione richiesta**:
1. Creare Edge Function `voice-input-gpt`
2. Implementare registrazione audio nel frontend
3. Integrare con GPT-Realtime
4. Implementare risposta vocale o testuale

---

## 🚀 PIANO D'AZIONE ENTERPRISE

### **Fase 1: Deploy Backend** (PRIORITÀ ALTA)

1. **Verificare OPENAI_API_KEY**:
   - [ ] Dashboard → Edge Functions → Settings → Secrets
   - [ ] Verificare che `OPENAI_API_KEY` sia presente

2. **Deploy Edge Functions**:
   - [ ] Deploy `process-screenshot-gpt`
   - [ ] Deploy `analyze-heatmap-screenshot-gpt`
   - [ ] Deploy `analyze-squad-formation-gpt`
   - [ ] Deploy `analyze-player-ratings-gpt`
   - [ ] Verificare che siano ACTIVE

3. **Test Endpoint**:
   - [ ] Test `process-screenshot-gpt` con screenshot reale
   - [ ] Verificare che restituisca CandidateProfile
   - [ ] Verificare logs per errori

---

### **Fase 2: Aggiornare Frontend** (PRIORITÀ ALTA)

1. **Aggiornare visionService.js**:
   - [ ] Aggiungere `processScreenshotGPT()`
   - [ ] Mantenere `processScreenshot()` per retrocompatibilità (deprecare)

2. **Aggiornare ScreenshotUpload.jsx**:
   - [ ] Usare `processScreenshotGPT()` invece di `processScreenshot()`
   - [ ] Gestire CandidateProfile invece di extracted_data
   - [ ] Mostrare UI con badge status (certain/uncertain/missing)
   - [ ] Implementare form conferma/modifica

3. **Creare CandidateProfileUI.jsx**:
   - [ ] Componente per visualizzare CandidateProfile
   - [ ] Badge per status (certain/uncertain/missing)
   - [ ] Form per completare/correggere dati
   - [ ] Pulsante conferma

---

### **Fase 3: Implementare Salvataggio** (PRIORITÀ MEDIA)

1. **Creare candidateProfileService.js**:
   - [ ] Funzione `confirmCandidateProfile()`
   - [ ] Estrazione dati deterministici → `players_base`
   - [ ] Estrazione dati configurabili → `player_builds`
   - [ ] Aggiornamento `candidate_profiles` e `screenshot_processing_log`

2. **Integrare in ScreenshotUpload**:
   - [ ] Chiamare `confirmCandidateProfile()` dopo conferma utente
   - [ ] Gestire errori e feedback utente
   - [ ] Aggiornare rosa dopo salvataggio

---

### **Fase 4: Voice Input** (PRIORITÀ BASSA)

1. **Creare Edge Function voice-input-gpt**:
   - [ ] Accettare audio o trascrizione
   - [ ] Usare GPT-Realtime per analisi
   - [ ] Restituire risposta strutturata

2. **Aggiornare RosaVoiceInput.jsx**:
   - [ ] Implementare registrazione audio (Web Speech API)
   - [ ] Inviare a Edge Function
   - [ ] Mostrare risposta/trascrizione
   - [ ] Processare e aggiungere giocatori a rosa

---

## ✅ VERIFICA FINALE ENTERPRISE

### **Test End-to-End**:

1. **Upload Screenshot**:
   - [ ] Trascinare foto profilo giocatore
   - [ ] Verificare upload a Storage
   - [ ] Verificare chiamata a `process-screenshot-gpt`
   - [ ] Verificare che restituisca CandidateProfile

2. **Visualizzazione CandidateProfile**:
   - [ ] Verificare che UI mostri dati estratti
   - [ ] Verificare badge status (certain/uncertain/missing)
   - [ ] Verificare form per modifica

3. **Conferma e Salvataggio**:
   - [ ] Confermare CandidateProfile
   - [ ] Verificare salvataggio in `candidate_profiles`
   - [ ] Verificare popolamento `players_base`
   - [ ] Verificare popolamento `player_builds`
   - [ ] Verificare aggiornamento `screenshot_processing_log`

4. **Voice Input** (quando implementato):
   - [ ] Registrare audio
   - [ ] Verificare trascrizione
   - [ ] Verificare analisi GPT
   - [ ] Verificare aggiunta giocatori a rosa

---

## 📊 METRICHE ENTERPRISE

### **Performance**:
- ✅ Tempo processing screenshot: <5s target
- ✅ Tempo risposta GPT: <3s target
- ✅ Tempo totale upload → conferma: <10s target

### **Affidabilità**:
- ✅ Tasso errore: <1% target
- ✅ Retry automatico su errori temporanei
- ✅ Logging completo per debugging

### **Sicurezza**:
- ✅ Input validation completa
- ✅ CORS configurato
- ✅ Error messages non espongono internals
- ✅ Rate limiting (da implementare)

---

## 🎯 PROSSIMI PASSI IMMEDIATI

1. **VERIFICARE OPENAI_API_KEY** nel Dashboard
2. **DEPLOYARE 4 EDGE FUNCTIONS** GPT-Realtime
3. **TESTARE ENDPOINT** con screenshot reale
4. **AGGIORNARE FRONTEND** per usare GPT-Realtime
5. **IMPLEMENTARE SALVATAGGIO** dopo conferma utente

---

**Status**: 🟡 **IN VERIFICA** - Seguire piano d'azione per risultato enterprise