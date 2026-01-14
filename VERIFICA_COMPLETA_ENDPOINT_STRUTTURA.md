# 🔍 Verifica Completa: Endpoint, Conflitti e Struttura Supabase
## Analisi Completa del Sistema - 2025-01-14

**Status**: 🟡 **IN VERIFICA**  
**Versione**: 2.0 (Next.js + GPT-Realtime)

---

## 📋 INDICE

1. [Edge Functions - Inventario Completo](#edge-functions)
2. [Conflitti Codice Vecchio/Nuovo](#conflitti)
3. [Struttura Supabase Database](#database)
4. [Storage Buckets](#storage)
5. [Servizi Frontend](#servizi)
6. [Coerenza Endpoint](#coerenza)
7. [Problemi Trovati](#problemi)
8. [Raccomandazioni](#raccomandazioni)

---

## 🔧 EDGE FUNCTIONS - INVENTARIO COMPLETO

### **Functions Attive** (13 totali)

| Function | Status | Uso Attuale | Tecnologia | Endpoint |
|----------|--------|-------------|------------|----------|
| `voice-coaching-gpt` | ✅ ATTIVO | ✅ **USATO** | GPT-Realtime WebSocket | `/functions/v1/voice-coaching-gpt` |
| `process-screenshot` | ✅ ATTIVO | ✅ **USATO** | Google Vision OCR | `/functions/v1/process-screenshot` |
| `process-screenshot-gpt` | ✅ ATTIVO | ⚠️ **NON USATO** | GPT-4o Vision | `/functions/v1/process-screenshot-gpt` |
| `analyze-rosa` | ✅ ATTIVO | ✅ **USATO** | GPT-4o | `/functions/v1/analyze-rosa` |
| `analyze-squad-formation-gpt` | ✅ ATTIVO | ❌ **NON USATO** | GPT-4o Vision | `/functions/v1/analyze-squad-formation-gpt` |
| `analyze-heatmap-screenshot-gpt` | ✅ ATTIVO | ❌ **NON USATO** | GPT-4o Vision | `/functions/v1/analyze-heatmap-screenshot-gpt` |
| `analyze-player-ratings-gpt` | ✅ ATTIVO | ❌ **NON USATO** | GPT-4o Vision | `/functions/v1/analyze-player-ratings-gpt` |
| `import-players-json` | ✅ ATTIVO | ✅ **USATO** | Supabase DB | `/functions/v1/import-players-json` |
| `import-players-from-drive` | ⚠️ DEPRECATO | ❌ **NON USATO** | Google Drive | `/functions/v1/import-players-from-drive` |
| `scrape-managers` | ✅ ATTIVO | ✅ **USATO** | Web Scraping | `/functions/v1/scrape-managers` |
| `scrape-players` | ✅ ATTIVO | ⚠️ **TEST** | Web Scraping | `/functions/v1/scrape-players` |
| `test-efootballhub` | ✅ TEST | ⚠️ **TEST** | Web Scraping | `/functions/v1/test-efootballhub` |
| `test-managers-url` | ✅ TEST | ⚠️ **TEST** | Web Scraping | `/functions/v1/test-managers-url` |

---

## ⚠️ CONFLITTI CODICE VECCHIO/NUOVO

### **1. Servizi Coaching Duplicati** 🔴 **CONFLITTO**

#### **`realtimeCoachingService.js`** (VECCHIO - HTTP REST)
- **Status**: ⚠️ **OBSOLETO** ma ancora presente
- **Tecnologia**: HTTP REST API → Edge Function
- **Uso**: ❌ **NON USATO** (sostituito da V2)
- **Chiama**: `voice-coaching-gpt` Edge Function con `action: 'send_message'`

#### **`realtimeCoachingServiceV2.js`** (NUOVO - WebSocket)
- **Status**: ✅ **ATTIVO**
- **Tecnologia**: WebSocket diretto a OpenAI Realtime API
- **Uso**: ✅ **USATO** da `VoiceCoachingPanel.jsx`
- **Chiama**: `wss://api.openai.com/v1/realtime` direttamente

**Problema**: Due servizi con stesso scopo ma tecnologie diverse.

**Raccomandazione**: 
- ✅ Mantenere solo `realtimeCoachingServiceV2.js`
- ❌ Rimuovere o deprecare `realtimeCoachingService.js`

---

### **2. Storage Buckets Inconsistenti** 🟡 **INCONSISTENZA**

#### **Bucket `player-screenshots`** (Documentato)
- **Uso**: `visionService.js` → `uploadScreenshot()`
- **Path**: `{userId}/{timestamp}_{random}.{ext}`
- **Access**: Privato
- **Policies**: RLS per utente

#### **Bucket `screenshots`** (Usato in codice)
- **Uso**: `realtimeCoachingService.js` → `uploadScreenshot()`
- **Uso**: `VoiceCoachingPanel.jsx` → `uploadImageToStorage()`
- **Path**: `chat-images/{fileName}`
- **Access**: Pubblico (getPublicUrl)

**Problema**: Due bucket diversi per screenshot.

**Raccomandazione**:
- ✅ Standardizzare su **`screenshots`** (più generico)
- ✅ Creare sottocartelle: `chat-images/`, `player-profiles/`, `formations/`
- ⚠️ Verificare che `player-screenshots` esista ancora o migrare

---

### **3. Vision Service - Doppia Implementazione** 🟡 **INCONSISTENZA**

#### **`visionService.js`** (Root)
- **Status**: ✅ **ATTIVO**
- **Usa**: `process-screenshot` (Google Vision)
- **Bucket**: `player-screenshots`

#### **`src/services/visionService.js`** (Legacy)
- **Status**: ⚠️ **DUPLICATO**
- **Usa**: `process-screenshot` (Google Vision)
- **Bucket**: `player-screenshots`

**Problema**: File duplicato in `src/` e root.

**Raccomandazione**:
- ✅ Verificare quale viene usato
- ❌ Rimuovere duplicato in `src/`

---

## 🗄️ STRUTTURA SUPABASE DATABASE

### **Tabelle Verificate** (7 totali)

| Tabella | Status | RLS | Uso | Note |
|----------|--------|-----|-----|------|
| `players_base` | ✅ ATTIVA | ✅ Pubblico lettura | Catalogo giocatori | Indici: name, position, konami_id |
| `boosters` | ✅ ATTIVA | ✅ Pubblico lettura | Catalogo booster | |
| `player_builds` | ✅ ATTIVA | ✅ Privato | Build utenti | FK: players_base, user_id |
| `user_rosa` | ✅ ATTIVA | ✅ Privato | Rose utenti | FK: user_id |
| `screenshot_processing_log` | ✅ ATTIVA | ✅ Privato | Log processing | FK: user_id |
| `unified_match_contexts` | ✅ ATTIVA | ✅ Privato | Contesti partita | FK: user_id |
| `coaching_suggestions` | ✅ ATTIVA | ✅ Privato | Suggerimenti | FK: user_id, rosa_id |

### **Tabelle Aggiuntive** (da verificare)

| Tabella | Status | Note |
|----------|--------|------|
| `coaching_sessions` | ❓ **DA VERIFICARE** | Usata da `voice-coaching-gpt` ma non in migration |
| `client_profiles` | ❓ **DA VERIFICARE** | Documentata ma non in migration |

**Problema**: `coaching_sessions` usata in codice ma non creata in migration.

**Raccomandazione**:
- ✅ Creare migration per `coaching_sessions`
- ✅ Verificare se `client_profiles` serve

---

## 📦 STORAGE BUCKETS

### **Bucket `player-screenshots`** (Documentato)
- **Status**: ✅ Creato in migration `002_create_storage_bucket.sql`
- **Access**: Privato
- **Max Size**: 10MB
- **Types**: JPG, PNG, WebP
- **Policies**: RLS per utente

### **Bucket `screenshots`** (Usato in codice)
- **Status**: ❓ **DA VERIFICARE** se esiste
- **Access**: Pubblico (getPublicUrl)
- **Uso**: Chat immagini, screenshot generici

**Problema**: Due bucket per screenshot.

**Raccomandazione**:
- ✅ Verificare esistenza bucket `screenshots`
- ✅ Unificare in un solo bucket con sottocartelle

---

## 🔌 SERVIZI FRONTEND

### **Servizi Attivi**

| Servizio | File | Endpoint Usati | Status |
|----------|------|----------------|--------|
| `realtimeCoachingServiceV2` | `services/realtimeCoachingServiceV2.js` | OpenAI Realtime API (WebSocket) | ✅ ATTIVO |
| `realtimeCoachingService` | `services/realtimeCoachingService.js` | `voice-coaching-gpt` | ⚠️ OBSOLETO |
| `visionService` | `services/visionService.js` | `process-screenshot` | ✅ ATTIVO |
| `rosaService` | `services/rosaService.js` | `analyze-rosa` + Direct DB | ✅ ATTIVO |
| `playerService` | `services/playerService.js` | Direct DB | ✅ ATTIVO |
| `managerService` | `services/managerService.js` | `scrape-managers` | ✅ ATTIVO |
| `importService` | `services/importService.js` | `import-players-json` | ✅ ATTIVO |

### **Servizi Legacy** (in `src/`)

| Servizio | File | Status |
|----------|------|--------|
| `visionService` | `src/services/visionService.js` | ⚠️ DUPLICATO |
| `coachingService` | `src/services/coachingService.js` | ❓ DA VERIFICARE |
| `RosaContext` | `src/contexts/RosaContext.jsx` | ❓ DA VERIFICARE |

**Problema**: Duplicati in `src/` che potrebbero non essere usati.

**Raccomandazione**:
- ✅ Verificare se `src/` viene usato (Next.js ignora `src/` per default)
- ❌ Rimuovere duplicati se non usati

---

## 🔗 COERENZA ENDPOINT

### **Chiamate Edge Functions Verificate**

#### ✅ **Coerenti**

1. **`voice-coaching-gpt`**
   - Chiamato da: `realtimeCoachingServiceV2.js` (per function calls)
   - Action: `execute_function`
   - ✅ Coerente

2. **`process-screenshot`**
   - Chiamato da: `visionService.js`
   - Body: `{ image_url, image_type, user_id }`
   - ✅ Coerente

3. **`analyze-rosa`**
   - Chiamato da: `rosaService.js`
   - Body: `{ rosa_id, user_id }`
   - ✅ Coerente

4. **`scrape-managers`**
   - Chiamato da: `managerService.js`
   - Body: `{ manager_name, batch_size, test_mode }`
   - ✅ Coerente

5. **`import-players-json`**
   - Chiamato da: `importService.js`
   - Body: `{ json_data, options }`
   - ✅ Coerente

#### ⚠️ **Incoerenze**

1. **`process-screenshot-gpt`**
   - Chiamato da: `voice-coaching-gpt/index.ts` (interno)
   - ❌ **NON chiamato** da `visionService.js` (usa Google Vision)
   - **Problema**: Function deployata ma non usata direttamente

2. **`analyze-squad-formation-gpt`**
   - ❌ **NON chiamato** da nessun servizio
   - **Problema**: Function deployata ma non usata

3. **`analyze-heatmap-screenshot-gpt`**
   - ❌ **NON chiamato** da nessun servizio
   - **Problema**: Function deployata ma non usata

4. **`analyze-player-ratings-gpt`**
   - ❌ **NON chiamato** da nessun servizio
   - **Problema**: Function deployata ma non usata

---

## 🐛 PROBLEMI TROVATI

### **🔴 Critici**

1. **Tabella `coaching_sessions` mancante**
   - Usata da `voice-coaching-gpt/index.ts` ma non creata in migration
   - **Fix**: Creare migration

2. **Bucket `screenshots` non verificato**
   - Usato in codice ma non documentato
   - **Fix**: Verificare esistenza o creare

### **🟡 Warning**

1. **Servizio duplicato `realtimeCoachingService.js`**
   - Obsoleto ma ancora presente
   - **Fix**: Rimuovere o deprecare

2. **Storage buckets inconsistenti**
   - `player-screenshots` vs `screenshots`
   - **Fix**: Standardizzare

3. **Functions non usate**
   - 4 functions deployate ma non chiamate
   - **Fix**: Rimuovere o documentare per uso futuro

4. **File duplicati in `src/`**
   - Next.js ignora `src/` per default
   - **Fix**: Verificare e rimuovere se non usati

---

## ✅ RACCOMANDAZIONI

### **Immediate (Priorità Alta)**

1. ✅ **Creare migration per `coaching_sessions`**
   ```sql
   CREATE TABLE coaching_sessions (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL,
     session_id TEXT UNIQUE NOT NULL,
     context JSONB DEFAULT '{}',
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

2. ✅ **Verificare bucket `screenshots`**
   - Se non esiste, crearlo
   - Se esiste, documentarlo

3. ✅ **Rimuovere `realtimeCoachingService.js`**
   - Obsoleto, sostituito da V2

### **Medie (Priorità Media)**

4. ✅ **Standardizzare storage buckets**
   - Unificare in `screenshots` con sottocartelle
   - Migrare `player-screenshots` se necessario

5. ✅ **Rimuovere file duplicati in `src/`**
   - Verificare se usati
   - Rimuovere se obsoleti

### **Basse (Priorità Bassa)**

6. ✅ **Documentare functions non usate**
   - `process-screenshot-gpt` (usata internamente)
   - `analyze-squad-formation-gpt` (per uso futuro)
   - `analyze-heatmap-screenshot-gpt` (per uso futuro)
   - `analyze-player-ratings-gpt` (per uso futuro)

7. ✅ **Pulizia codice legacy**
   - Rimuovere `import-players-from-drive` se deprecato
   - Rimuovere test functions se non servono

---

## 📊 RIEPILOGO

### **✅ Funziona Correttamente**
- ✅ `voice-coaching-gpt` (WebSocket Realtime)
- ✅ `process-screenshot` (Google Vision)
- ✅ `analyze-rosa`
- ✅ `scrape-managers`
- ✅ `import-players-json`

### **⚠️ Da Sistemare**
- ⚠️ Tabella `coaching_sessions` mancante
- ⚠️ Bucket `screenshots` da verificare
- ⚠️ Servizio obsoleto `realtimeCoachingService.js`
- ⚠️ Storage buckets inconsistenti

### **❌ Non Usati (ma OK)**
- ❌ `process-screenshot-gpt` (usata internamente)
- ❌ `analyze-squad-formation-gpt` (per futuro)
- ❌ `analyze-heatmap-screenshot-gpt` (per futuro)
- ❌ `analyze-player-ratings-gpt` (per futuro)

---

**Status Finale**: 🟡 **SISTEMA FUNZIONANTE CON PICCOLI AGGIUSTAMENTI NECESSARI**
