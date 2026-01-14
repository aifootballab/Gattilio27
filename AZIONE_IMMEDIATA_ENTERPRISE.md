# 🚀 Azione Immediata - Enterprise Integration

**Data**: 2025-01-14  
**Status**: ⚡ **AZIONE RICHIESTA**  
**Obiettivo**: Completare integrazione GPT-Realtime per risultato enterprise

---

## ⚡ STEP 1: Verificare OPENAI_API_KEY (2 minuti)

### **Azione**:
1. Vai su **Supabase Dashboard**: https://supabase.com/dashboard/project/zliuuorrwdetylollrua
2. **Edge Functions** → **Settings** → **Secrets**
3. Verifica che `OPENAI_API_KEY` sia presente
4. Se manca, aggiungi:
   - **Name**: `OPENAI_API_KEY`
   - **Value**: `sk-...` (la tua chiave OpenAI)
   - **Sensitive**: ✅ Sì

**✅ Verifica completata**: [ ] Sì / [ ] No

---

## ⚡ STEP 2: Deploy Edge Functions GPT-Realtime (10 minuti)

### **Opzione A: Supabase Dashboard** (CONSIGLIATO)

Per ogni Edge Function:

1. **Vai su**: **Edge Functions** → **Functions** → **"New function"**

2. **process-screenshot-gpt**:
   - Nome: `process-screenshot-gpt`
   - Copia contenuto da: `supabase/functions/process-screenshot-gpt/index.ts`
   - Clicca **"Deploy"**

3. **analyze-heatmap-screenshot-gpt**:
   - Nome: `analyze-heatmap-screenshot-gpt`
   - Copia contenuto da: `supabase/functions/analyze-heatmap-screenshot-gpt/index.ts`
   - Clicca **"Deploy"**

4. **analyze-squad-formation-gpt**:
   - Nome: `analyze-squad-formation-gpt`
   - Copia contenuto da: `supabase/functions/analyze-squad-formation-gpt/index.ts`
   - Clicca **"Deploy"**

5. **analyze-player-ratings-gpt**:
   - Nome: `analyze-player-ratings-gpt`
   - Copia contenuto da: `supabase/functions/analyze-player-ratings-gpt/index.ts`
   - Clicca **"Deploy"**

**✅ Deploy completato**: [ ] Sì / [ ] No

**Verifica**:
- [ ] `process-screenshot-gpt` - Status: ACTIVE
- [ ] `analyze-heatmap-screenshot-gpt` - Status: ACTIVE
- [ ] `analyze-squad-formation-gpt` - Status: ACTIVE
- [ ] `analyze-player-ratings-gpt` - Status: ACTIVE

---

## ⚡ STEP 3: Test Endpoint (5 minuti)

### **Test process-screenshot-gpt**:

1. Carica uno screenshot di test su Supabase Storage
2. Ottieni URL pubblico
3. Testa endpoint:

```bash
curl -X POST https://zliuuorrwdetylollrua.supabase.co/functions/v1/process-screenshot-gpt \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://zliuuorrwdetylollrua.supabase.co/storage/v1/object/public/player-screenshots/test.jpg",
    "image_type": "player_profile",
    "user_id": "00000000-0000-0000-0000-000000000001"
  }'
```

**Risultato atteso**:
```json
{
  "success": true,
  "log_id": "...",
  "candidate_profile": {
    "player_name": {
      "value": "...",
      "status": "certain",
      "confidence": 0.95
    },
    ...
  },
  "message": "Screenshot processed successfully. Review and confirm to save."
}
```

**✅ Test completato**: [ ] Sì / [ ] No

---

## ⚡ STEP 4: Aggiornare Frontend (15 minuti)

### **4.1: Aggiornare visionService.js**

Aggiungi nuova funzione per GPT-Realtime:

```javascript
// services/visionService.js

/**
 * Processa screenshot con GPT-Realtime (NUOVO)
 */
export async function processScreenshotGPT(imageUrl, imageType, userId) {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  const { data, error } = await supabase.functions.invoke('process-screenshot-gpt', {
    body: {
      image_url: imageUrl,
      image_type: imageType,
      user_id: userId
    }
  })

  if (error) {
    throw new Error(`Errore processing GPT: ${error.message}`)
  }

  // Restituisce CandidateProfile (non salva nulla)
  return data
}
```

### **4.2: Aggiornare ScreenshotUpload.jsx**

Sostituisci chiamata a `processScreenshot` con `processScreenshotGPT`:

```javascript
// components/rosa/ScreenshotUpload.jsx

import { processScreenshotGPT } from '../../services/visionService'

// In handleFile():
const result = await processScreenshotGPT(
  uploadResult.url,
  imageType,
  userId
)

// Gestisci CandidateProfile invece di extracted_data
setCandidateProfile(result.candidate_profile)
```

**✅ Frontend aggiornato**: [ ] Sì / [ ] No

---

## ⚡ STEP 5: Implementare UI CandidateProfile (20 minuti)

### **5.1: Creare CandidateProfileView.jsx**

```javascript
// components/rosa/CandidateProfileView.jsx

export default function CandidateProfileView({ candidateProfile, onConfirm, onCancel }) {
  return (
    <div className="candidate-profile-view">
      <h3>Dati Estratti - Rivedi e Conferma</h3>
      
      {/* Mostra ogni campo con badge status */}
      {Object.entries(candidateProfile).map(([key, field]) => (
        <div key={key} className="field-row">
          <label>{key}</label>
          <input 
            value={field.value || ''} 
            onChange={(e) => {/* update */}}
          />
          <span className={`badge ${field.status}`}>
            {field.status} ({Math.round(field.confidence * 100)}%)
          </span>
        </div>
      ))}
      
      <button onClick={onConfirm}>Conferma e Salva</button>
      <button onClick={onCancel}>Annulla</button>
    </div>
  )
}
```

### **5.2: Integrare in ScreenshotUpload.jsx**

```javascript
import CandidateProfileView from './CandidateProfileView'

// Mostra CandidateProfileView quando candidateProfile è disponibile
{candidateProfile && (
  <CandidateProfileView
    candidateProfile={candidateProfile}
    onConfirm={handleConfirmCandidateProfile}
    onCancel={handleCancel}
  />
)}
```

**✅ UI implementata**: [ ] Sì / [ ] No

---

## ⚡ STEP 6: Implementare Salvataggio (15 minuti)

### **6.1: Creare candidateProfileService.js**

```javascript
// services/candidateProfileService.js

export async function confirmCandidateProfile(candidateProfileId, userId) {
  // 1. Aggiorna candidate_profiles a stato 'confirmed'
  // 2. Estrai dati deterministici → players_base
  // 3. Estrai dati configurabili → player_builds
  // 4. Aggiorna screenshot_processing_log
}
```

**✅ Salvataggio implementato**: [ ] Sì / [ ] No

---

## ⚡ STEP 7: Voice Input (30 minuti - OPZIONALE)

### **7.1: Creare Edge Function voice-input-gpt**

```typescript
// supabase/functions/voice-input-gpt/index.ts
// Accetta audio o trascrizione
// Usa GPT-Realtime per analisi
// Restituisce risposta strutturata
```

### **7.2: Aggiornare RosaVoiceInput.jsx**

```javascript
// Implementare registrazione audio (Web Speech API)
// Inviare a Edge Function
// Mostrare risposta/trascrizione
// Processare e aggiungere giocatori a rosa
```

**✅ Voice input implementato**: [ ] Sì / [ ] No

---

## ✅ CHECKLIST FINALE

### **Backend**:
- [ ] OPENAI_API_KEY configurata
- [ ] 4 Edge Functions deployate e ACTIVE
- [ ] Test endpoint funzionante

### **Frontend**:
- [ ] visionService.js aggiornato
- [ ] ScreenshotUpload.jsx usa GPT-Realtime
- [ ] CandidateProfileView.jsx creato
- [ ] Salvataggio dopo conferma implementato

### **Voice Input** (opzionale):
- [ ] Edge Function voice-input-gpt creata
- [ ] RosaVoiceInput.jsx implementato

### **Test End-to-End**:
- [ ] Upload screenshot → GPT analisi → CandidateProfile
- [ ] Conferma utente → Salvataggio tabelle
- [ ] Verifica popolamento players_base e player_builds

---

## 🎯 RISULTATO ENTERPRISE

Dopo completamento:
- ✅ Trascinamento foto funzionante con GPT-Realtime
- ✅ Popolamento tabelle dopo conferma utente
- ✅ Voice input (se implementato)
- ✅ Allineamento enterprise (error handling, logging, security)

---

**Status**: ⚡ **AZIONE RICHIESTA** - Seguire step per completare integrazione