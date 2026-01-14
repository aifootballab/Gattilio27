# 🔍 Analisi Completa Autenticazione Edge Functions

## 📋 Obiettivo
Verificare preventivamente tutti i flussi di autenticazione per le Edge Functions prima di fare deploy, evitando errori 401 dopo il push.

---

## 🔐 Configurazione Edge Functions

### **`voice-coaching-gpt`**
- **Status**: `verify_jwt: true` ✅
- **Implicazione**: Richiede JWT token valido dell'utente autenticato
- **Deploy**: Versione 4, ACTIVE

---

## 📊 Mappatura Chiamate Edge Functions

### **1. `voice-coaching-gpt` - Tutte le chiamate**

#### **1.1. `realtimeCoachingServiceV2.js`** ✅ CORRETTO
**File**: `services/realtimeCoachingServiceV2.js`

**Metodi che chiamano Edge Function:**
- `startSession()` - Linea 27-80
- `handleFunctionCall()` - Linea 318-395

**Autenticazione**:
- ✅ Usa `fetch()` diretto con `session.access_token`
- ✅ Verifica sessione con `supabase.auth.getSession()`
- ✅ Gestisce errore se utente non autenticato

**Status**: ✅ **CORRETTO** - Usa JWT token utente

---

#### **1.2. `realtimeCoachingService.js`** ⚠️ DA VERIFICARE
**File**: `services/realtimeCoachingService.js`

**Metodi che chiamano Edge Function:**
- `startSession()` - Linea 29
- `sendMessage()` - Linea 62
- `uploadScreenshot()` - Linea 134
- `startKeepAlive()` - Linea 187
- `endSession()` - Linea 210

**Autenticazione**:
- ⚠️ Usa `supabase.functions.invoke()` che dovrebbe gestire automaticamente l'auth
- ⚠️ **NON verifica esplicitamente** se c'è una sessione attiva
- ⚠️ Se non c'è sessione, `supabase.functions.invoke()` potrebbe fallire con 401

**Problema Potenziale**:
- `supabase.functions.invoke()` include automaticamente il JWT token **SOLO se c'è una sessione attiva nel client**
- Se il client Supabase non ha una sessione, la chiamata fallirà con 401
- Non c'è gestione esplicita dell'errore di autenticazione

**Raccomandazione**:
- ✅ Aggiungere verifica sessione prima di chiamare Edge Function
- ✅ Gestire errore 401 con messaggio chiaro all'utente

---

#### **1.3. `VoiceCoachingPanel.jsx`** ⚠️ DA VERIFICARE
**File**: `components/coaching/VoiceCoachingPanel.jsx`

**Uso**:
- Usa `realtimeCoachingServiceV2` (già corretto)
- Ma potrebbe anche usare `realtimeCoachingService` (da verificare)

**Status**: ⚠️ **DA VERIFICARE** - Verificare quale servizio viene usato

---

### **2. Altre Edge Functions**

#### **2.1. `process-screenshot-gpt`**
**Chiamata da**:
- `services/visionService.js` - Linea 76
- `src/services/visionService.js` - Linea 75

**Autenticazione**:
- ✅ `src/services/visionService.js` verifica sessione (linea 69-73)
- ⚠️ `services/visionService.js` ha autenticazione commentata (linea 70-73)

**Status**: ⚠️ **INCONSISTENTE** - Un file verifica, l'altro no

---

#### **2.2. `analyze-rosa`**
**Chiamata da**:
- `services/rosaService.js` - Linea 453
- `src/contexts/RosaContext.jsx` - Linea 208

**Autenticazione**:
- ✅ `src/contexts/RosaContext.jsx` verifica sessione (linea 202-205)
- ⚠️ `services/rosaService.js` ha autenticazione commentata (linea 446-449)

**Status**: ⚠️ **INCONSISTENTE** - Un file verifica, l'altro no

---

## 🔧 Problemi Identificati

### **Problema 1: `realtimeCoachingService.js` non verifica sessione**
**Gravità**: 🔴 **ALTA**

**Impatto**:
- Se utente non autenticato, tutte le chiamate falliranno con 401
- Nessun messaggio di errore chiaro all'utente
- Keep-alive fallirà silenziosamente

**Soluzione**:
```javascript
// Aggiungere verifica sessione prima di ogni chiamata
const { data: { session }, error: sessionError } = await supabase.auth.getSession()
if (sessionError || !session) {
  throw new Error('User not authenticated. Please log in.')
}
```

---

### **Problema 2: Inconsistenza tra file `src/` e `services/`**
**Gravità**: 🟡 **MEDIA**

**Impatto**:
- File in `src/` verificano autenticazione
- File in `services/` hanno autenticazione commentata
- Comportamento inconsistente

**Soluzione**:
- Decidere quale directory è quella attiva
- Allineare comportamento autenticazione
- Rimuovere codice commentato o attivarlo

---

### **Problema 3: `supabase.functions.invoke()` vs `fetch()` diretto**
**Gravità**: 🟡 **MEDIA**

**Impatto**:
- Due approcci diversi per chiamare Edge Functions
- `supabase.functions.invoke()` gestisce automaticamente auth (se c'è sessione)
- `fetch()` diretto richiede gestione manuale del JWT

**Raccomandazione**:
- Standardizzare su un approccio
- Se `verify_jwt: true`, sempre verificare sessione prima
- Usare helper function per gestire auth in modo consistente

---

## ✅ Piano di Correzione

### **Step 1: Correggere `realtimeCoachingService.js`**
- [ ] Aggiungere verifica sessione in `startSession()`
- [ ] Aggiungere verifica sessione in `sendMessage()`
- [ ] Aggiungere verifica sessione in `uploadScreenshot()`
- [ ] Aggiungere verifica sessione in `startKeepAlive()`
- [ ] Aggiungere verifica sessione in `endSession()`
- [ ] Gestire errore 401 con messaggio chiaro

### **Step 2: Allineare autenticazione in `services/`**
- [ ] Verificare quale directory è attiva (`src/` o `services/`)
- [ ] Allineare `services/visionService.js` con `src/services/visionService.js`
- [ ] Allineare `services/rosaService.js` con `src/contexts/RosaContext.jsx`
- [ ] Rimuovere codice commentato o attivarlo

### **Step 3: Standardizzare approccio**
- [ ] Creare helper function per chiamate Edge Functions con auth
- [ ] Usare helper in tutti i servizi
- [ ] Documentare pattern da seguire

### **Step 4: Test completo**
- [ ] Test con utente autenticato
- [ ] Test con utente non autenticato (dovrebbe mostrare errore chiaro)
- [ ] Test keep-alive con sessione scaduta
- [ ] Test tutte le Edge Functions

---

## 📝 Helper Function Proposta

```javascript
/**
 * Helper per chiamare Edge Function con autenticazione
 */
async function invokeEdgeFunction(functionName, body) {
  // Verifica sessione
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
  if (sessionError || !session) {
    throw new Error('User not authenticated. Please log in.')
  }

  // Chiama Edge Function
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: body
  })

  if (error) {
    // Gestisci errori specifici
    if (error.status === 401) {
      throw new Error('Authentication failed. Please log in again.')
    }
    throw error
  }

  return data
}
```

---

## 🎯 Checklist Pre-Deploy

Prima di ogni deploy di Edge Function con `verify_jwt: true`:

- [ ] Verificare tutti i servizi che chiamano la funzione
- [ ] Verificare che tutti verifichino la sessione prima di chiamare
- [ ] Verificare gestione errori 401
- [ ] Testare con utente autenticato
- [ ] Testare con utente non autenticato
- [ ] Verificare che messaggi di errore siano chiari
- [ ] Documentare pattern di autenticazione

---

## 📚 Note

1. **`supabase.functions.invoke()`** include automaticamente il JWT token **SOLO se c'è una sessione attiva nel client Supabase**
2. Se non c'è sessione, la chiamata fallirà con 401
3. **SEMPRE verificare sessione prima** di chiamare Edge Function con `verify_jwt: true`
4. **Gestire errore 401** con messaggio chiaro all'utente
5. **Standardizzare approccio** per evitare inconsistenze

---

**Data Analisi**: 2025-01-27
**Versione**: 1.0
