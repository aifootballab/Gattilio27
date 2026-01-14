# 🚀 Implementazione Sistema Screenshot Processing
## Guida Completa

---

## ✅ COSA È STATO IMPLEMENTATO

### **1. Edge Function Supabase**
**File**: `supabase/functions/process-screenshot/index.ts`

**Funzionalità**:
- ✅ Upload e download immagine da Storage
- ✅ Integrazione Google Vision API (con API Key)
- ✅ Parsing OCR completo (nome, rating, stats, skills, build)
- ✅ Matching giocatori con database
- ✅ Salvataggio in `players_base` e `player_builds`
- ✅ Logging completo in `screenshot_processing_log`
- ✅ Gestione errori e fallback a mock data

**Note**: 
- Supporta API Key (metodo semplice)
- Mock data se Vision API non configurata
- Parsing OCR funzionale ma migliorabile

---

### **2. Servizi Frontend**
**File**: `src/services/visionService.js`

**Funzionalità**:
- ✅ Upload screenshot a Supabase Storage
- ✅ Validazione file (tipo, dimensione)
- ✅ Chiamata Edge Function
- ✅ Gestione errori

**API**:
```javascript
// Upload e processa
const result = await uploadAndProcessScreenshot(file, 'player_profile', userId)

// Solo upload
const uploadResult = await uploadScreenshot(file, userId)

// Solo process
const processResult = await processScreenshot(imageUrl, 'player_profile', userId)
```

---

### **3. Componenti React**

#### **ScreenshotUpload**
**File**: `src/components/rosa/ScreenshotUpload.jsx`

**Funzionalità**:
- ✅ Drag & drop upload
- ✅ Preview immagine
- ✅ Visualizzazione dati estratti
- ✅ Conferma e aggiunta giocatore a rosa
- ✅ Gestione stati (uploading, processing, error)

#### **RosaScreenshotInput**
**File**: `src/components/rosa/RosaScreenshotInput.jsx`

**Funzionalità**:
- ✅ Wrapper per ScreenshotUpload
- ✅ Istruzioni utente
- ✅ Integrazione con RosaContext

---

### **4. Utils Parsing**
**File**: `src/utils/ocrParser.js`

**Funzionalità**:
- ✅ Estrazione nome giocatore (pattern matching)
- ✅ Estrazione overall rating
- ✅ Estrazione posizione
- ✅ Estrazione statistiche (attacking, defending, athleticism)
- ✅ Estrazione skills e com skills
- ✅ Estrazione build data (level cap, development points, booster)

**Note**: Parser funzionale ma può essere migliorato con più test

---

### **5. Database Schema**
**File**: `supabase/migrations/001_initial_schema.sql`

**Tabelle**:
- ✅ `players_base` - Database giocatori
- ✅ `player_builds` - Build utenti
- ✅ `user_rosa` - Rose utenti
- ✅ `screenshot_processing_log` - Log processing
- ✅ `boosters` - Database booster
- ✅ `unified_match_contexts` - Contesti partita
- ✅ `coaching_suggestions` - Suggerimenti

**Sicurezza**:
- ✅ Row Level Security (RLS) configurato
- ✅ Policies per accesso utente

---

## 🔧 CONFIGURAZIONE RICHIESTA

### **1. Google Cloud Vision API**

**Metodo 1: API Key (Consigliato)**
1. Vai a Google Cloud Console
2. Crea/Seleziona progetto
3. Abilita "Cloud Vision API"
4. Vai a "Credentials" → "Create Credentials" → "API Key"
5. Copia API Key

**Aggiungi in Vercel**:
```
GOOGLE_VISION_API_KEY=your-api-key-here
```

**Metodo 2: Service Account** (più complesso)
- Richiede JWT signing corretto
- Vedi `SETUP_GOOGLE_VISION_VERCEL.md`

---

### **2. Supabase Storage**

**Crea Bucket**:
```sql
-- In Supabase Dashboard → Storage
-- Crea bucket: player-screenshots
-- Access: Private
-- Max size: 10MB
```

**O via SQL**:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('player-screenshots', 'player-screenshots', false);
```

---

### **3. Supabase Edge Functions**

**Deploy Function**:
```bash
# Se hai Supabase CLI
supabase functions deploy process-screenshot

# Oppure via Dashboard
# Settings → Edge Functions → Deploy
```

**Configura Secrets**:
- `GOOGLE_VISION_API_KEY` (o `GOOGLE_VISION_CREDENTIALS`)
- `SUPABASE_URL` (automatico)
- `SUPABASE_SERVICE_ROLE_KEY` (automatico)

---

### **4. Variabili Frontend (Vercel)**

**Vercel** → Settings → Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_OPENAI_API_KEY=sk-...   # se usi il realtime nel browser
```

---

## 🧪 TESTING

### **Test Produzione (Vercel)**

1. **Test Upload**:
```javascript
import { uploadScreenshot } from './services/visionService'

const file = // File object
const result = await uploadScreenshot(file, 'user-id')
console.log(result)
```

2. **Test Processing**:
```javascript
import { processScreenshot } from './services/visionService'

const result = await processScreenshot(
  'https://...image-url...',
  'player_profile',
  'user-id'
)
console.log(result.extracted_data)
```

3. **Test Componente (Vercel)**:
- Apri `/rosa`
- Click "Aggiungi Giocatore"
- Seleziona "Carica Screenshot"
- Carica screenshot profilo giocatore

---

## 📊 FLUSSO COMPLETO

```
1. UTENTE: Carica screenshot in RosaPage
   ↓
2. ScreenshotUpload: Upload a Supabase Storage
   ↓
3. visionService: Chiama Edge Function
   ↓
4. Edge Function: 
   - Download immagine
   - Google Vision API (OCR)
   - Parsing dati
   - Salva in database
   ↓
5. Frontend: Riceve dati estratti
   ↓
6. ScreenshotUpload: Mostra preview
   ↓
7. UTENTE: Conferma
   ↓
8. RosaContext: Aggiunge giocatore a rosa
```

---

## ⚠️ LIMITAZIONI ATTUALI

1. **Parsing OCR**: 
   - Funziona ma accuracy dipende da qualità screenshot
   - Pattern matching può migliorare con più test

2. **Google Vision API**:
   - Attualmente usa API Key (metodo semplice)
   - Service Account JWT non completamente implementato

3. **Autenticazione**:
   - `userId` è hardcoded come 'temp-user-id'
   - Da integrare con Supabase Auth

4. **Build Data**:
   - Estrazione build è base
   - Può non catturare tutti i casi

---

## 🎯 PROSSIMI MIGLIORAMENTI

1. **Parsing Avanzato**:
   - Machine Learning per riconoscimento layout
   - Template matching per diversi formati
   - Validazione cross-field

2. **Performance**:
   - Caching risultati OCR
   - Batch processing multipli screenshot
   - Compressione immagini

3. **UI/UX**:
   - Correzione manuale dati estratti
   - Preview più dettagliato
   - Progress bar più accurata

4. **Integrazione**:
   - Autenticazione Supabase completa
   - Salvataggio rosa in database
   - Analisi squadra automatica

---

## 📝 NOTE TECNICHE

### **Edge Function Dependencies**
- `@supabase/supabase-js` - Client Supabase
- Google Vision API - Via fetch (no SDK necessario)

### **Frontend Dependencies**
- `@supabase/supabase-js` - Client Supabase
- `lucide-react` - Icons

### **Storage Path**
- Pattern: `player-screenshots/{user_id}/{timestamp}_{random}.{ext}`
- Access: Privato (solo utente proprietario)

---

**Status**: 🟢 Implementazione base completata, pronto per testing e configurazione
