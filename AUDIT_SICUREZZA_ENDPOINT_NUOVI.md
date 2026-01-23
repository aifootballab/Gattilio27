# Audit Sicurezza Endpoint Nuovi

**Data:** 23 Gennaio 2026  
**Endpoint Analizzati:**
- `/api/analyze-match` (POST)
- `/api/supabase/delete-match` (DELETE)

---

## 🔍 ANALISI SICUREZZA

### ✅ PUNTI DI FORZA

#### 1. **Autenticazione** ✅
- ✅ Entrambi gli endpoint richiedono Bearer token
- ✅ Usano `validateToken()` helper esistente
- ✅ Verificano `userData?.user?.id` prima di procedere
- ✅ Allineati con pattern esistenti (`save-match`, `update-match`)

#### 2. **Validazione Input Base** ✅
- ✅ `/api/analyze-match`: Verifica presenza `matchData` e tipo object
- ✅ `/api/supabase/delete-match`: Verifica presenza `match_id` nei query params
- ✅ Verifica confidence > 0 prima di chiamare OpenAI

#### 3. **Gestione Errori** ✅
- ✅ Try-catch completo
- ✅ Messaggi errore specifici
- ✅ Status code appropriati (400, 401, 404, 500)
- ✅ Logging errori (console.error)

#### 4. **Sicurezza Database** ✅
- ✅ `/api/supabase/delete-match`: Verifica ownership (doppio check: fetch + delete con user_id)
- ✅ Usa Service Role Key solo per operazioni admin necessarie
- ✅ Doppio filtro `eq('user_id', userId)` per sicurezza extra

---

## ⚠️ VULNERABILITÀ TROVATE

### 🔴 CRITICHE

#### 1. **Nessun Rate Limiting** ❌
**Endpoint:** Entrambi  
**Rischio:** ALTO  
**Impatto:**
- Abuso quota OpenAI (`/api/analyze-match`)
- DoS attack (`/api/supabase/delete-match`)
- Costi imprevedibili

**Fix Necessario:**
```javascript
// Implementare rate limiting per utente
// Es: max 10 chiamate/minuto per /api/analyze-match
// Es: max 5 chiamate/minuto per /api/supabase/delete-match
```

---

### 🟠 ALTE

#### 2. **Nessuna Validazione Dimensione Payload** ❌
**Endpoint:** `/api/analyze-match`  
**Rischio:** MEDIO-ALTO  
**Impatto:**
- DoS con payload JSON enorme
- Memoria server esaurita
- Costi OpenAI alti per prompt giganti

**Problema:**
```javascript
const { matchData } = await req.json()
// Nessuna validazione dimensione!
// matchData potrebbe essere 100MB
```

**Fix Necessario:**
```javascript
// Validare dimensione JSON prima di parse
// Max 1MB per matchData
```

#### 3. **Nessuna Validazione UUID per match_id** ❌
**Endpoint:** `/api/supabase/delete-match`  
**Rischio:** MEDIO  
**Impatto:**
- SQL injection (mitigato da Supabase, ma meglio validare)
- Errori database con ID malformati
- Logging errori inutili

**Problema:**
```javascript
const matchId = searchParams.get('match_id')
// Nessuna validazione formato UUID!
```

**Fix Necessario:**
```javascript
// Validare formato UUID v4
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
if (!UUID_REGEX.test(matchId)) {
  return NextResponse.json({ error: 'Invalid match_id format' }, { status: 400 })
}
```

#### 4. **Nessuna Validazione Dimensione matchData** ❌
**Endpoint:** `/api/analyze-match`  
**Rischio:** MEDIO  
**Impatto:**
- Prompt OpenAI troppo lungo (costo alto)
- Timeout OpenAI
- Memoria esaurita

**Problema:**
```javascript
// matchData potrebbe contenere migliaia di giocatori
// Nessun limite su dimensione oggetto
```

**Fix Necessario:**
```javascript
// Validare dimensione JSON serializzato
// Max 500KB per matchData
```

---

### 🟡 MEDIE

#### 5. **Nessuna Sanitizzazione Prompt** ⚠️
**Endpoint:** `/api/analyze-match`  
**Rischio:** BASSO-MEDIO  
**Impatto:**
- Prompt injection (mitigato, ma meglio sanitizzare)
- Costi OpenAI alti se dati malformati

**Fix Consigliato:**
```javascript
// Limitare lunghezza campi stringa nel prompt
// Rimuovere caratteri speciali pericolosi
```

#### 6. **Logging User ID** ⚠️
**Endpoint:** `/api/supabase/delete-match`  
**Rischio:** BASSO (GDPR compliance)  
**Impatto:**
- Privacy: user_id nei log

**Fix Consigliato:**
```javascript
// Hashare user_id nei log o rimuovere
console.log(`[delete-match] Match deleted: ${matchId} by user: ${hashUserId(userId)}`)
```

#### 7. **Nessun Timeout su Chiamata OpenAI** ⚠️
**Endpoint:** `/api/analyze-match`  
**Rischio:** BASSO (già gestito da `callOpenAIWithRetry`)  
**Impatto:**
- Timeout già gestito da helper esistente ✅

---

## 📋 RACCOMANDAZIONI PRIORITARIE

### Immediate (Oggi)

1. ✅ **Aggiungere validazione UUID per match_id**
   - Tempo: 5 minuti
   - Rischio: BASSO
   - Impatto: MEDIO

2. ✅ **Aggiungere validazione dimensione payload**
   - Tempo: 15 minuti
   - Rischio: BASSO
   - Impatto: ALTO

3. ✅ **Aggiungere validazione dimensione matchData**
   - Tempo: 10 minuti
   - Rischio: BASSO
   - Impatto: MEDIO

### Breve Termine (Questa Settimana)

4. ⚠️ **Implementare rate limiting**
   - Tempo: 2-3 ore
   - Rischio: MEDIO (modifica middleware)
   - Impatto: ALTO

5. ⚠️ **Sanitizzare prompt OpenAI**
   - Tempo: 30 minuti
   - Rischio: BASSO
   - Impatto: BASSO-MEDIO

6. ⚠️ **Hashare user_id nei log**
   - Tempo: 10 minuti
   - Rischio: BASSO
   - Impatto: BASSO (GDPR compliance)

---

## 🔒 ALLINEAMENTO CON PATTERN ESISTENTI

### Confronto con `/api/supabase/save-match`

**Pattern Esistenti:**
- ✅ Autenticazione Bearer token
- ✅ Validazione input base
- ✅ Service Role Key per operazioni admin
- ✅ Try-catch completo
- ✅ Logging errori

**Nuovi Endpoint:**
- ✅ Seguono stesso pattern ✅
- ✅ Allineati con codice esistente ✅

**Differenze (da correggere):**
- ❌ Manca rate limiting (anche negli endpoint esistenti)
- ❌ Manca validazione UUID (anche negli endpoint esistenti)
- ❌ Manca validazione dimensione payload (anche negli endpoint esistenti)

**Conclusione:** I nuovi endpoint sono **allineati** con il codice esistente. Le vulnerabilità trovate sono **sistemiche** (presenti anche negli endpoint esistenti).

---

## ✅ CHECKLIST CORREZIONI

- [x] Validazione UUID per match_id ✅
- [x] Validazione dimensione payload JSON (max 1MB) ✅
- [x] Validazione dimensione matchData (max 500KB) ✅
- [x] Rate limiting (middleware o per-endpoint) ✅
- [x] Sanitizzazione prompt (limite lunghezza campi) ✅
- [x] Rimozione user_id dai log (privacy/GDPR) ✅

---

## 🔧 CORREZIONI APPLICATE

### 1. Validazione UUID ✅
**File:** `app/api/supabase/delete-match/route.js`
```javascript
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
if (!UUID_REGEX.test(matchId)) {
  return NextResponse.json({ error: 'Invalid match_id format' }, { status: 400 })
}
```

### 2. Validazione Dimensione Payload ✅
**File:** `app/api/analyze-match/route.js`
```javascript
const contentLength = req.headers.get('content-length')
if (contentLength && parseInt(contentLength) > 1024 * 1024) {
  return NextResponse.json({ error: 'Payload too large (max 1MB)' }, { status: 413 })
}
```

### 3. Validazione Dimensione matchData ✅
**File:** `app/api/analyze-match/route.js`
```javascript
const matchDataSize = JSON.stringify(matchData).length
const MAX_MATCH_DATA_SIZE = 500 * 1024 // 500KB
if (matchDataSize > MAX_MATCH_DATA_SIZE) {
  return NextResponse.json({ error: 'matchData too large (max 500KB)' }, { status: 413 })
}
```

### 4. Rate Limiting ✅
**File:** `lib/rateLimiter.js` (NUOVO)
- In-memory store per rate limiting
- Configurazione per endpoint:
  - `/api/analyze-match`: 10 req/min
  - `/api/supabase/delete-match`: 5 req/min
- Headers standard (X-RateLimit-*)

**Integrato in:**
- `app/api/analyze-match/route.js`
- `app/api/supabase/delete-match/route.js`

### 5. Sanitizzazione Prompt ✅
**File:** `app/api/analyze-match/route.js`
```javascript
// Limita lunghezza campi stringa
result: matchData.result?.substring(0, 50)
formation_played: matchData.formation_played?.substring(0, 100)
playing_style_played: matchData.playing_style_played?.substring(0, 100)
```

### 6. Validazione Dimensione Prompt ✅
**File:** `app/api/analyze-match/route.js`
```javascript
const promptSize = prompt.length
const MAX_PROMPT_SIZE = 50 * 1024 // 50KB
if (promptSize > MAX_PROMPT_SIZE) {
  return NextResponse.json({ error: 'Match data too large to analyze' }, { status: 413 })
}
```

### 7. Privacy Logging ✅
**File:** `app/api/supabase/delete-match/route.js`
- Rimossi user_id dai log (solo matchId loggato)

---

## 📊 STATO FINALE

**Sicurezza Base:** ✅ **BUONA**
- Autenticazione: ✅
- Validazione base: ✅
- Gestione errori: ✅
- Ownership check: ✅

**Sicurezza Avanzata:** ✅ **IMPLEMENTATA**
- Rate limiting: ✅ (10 req/min analyze, 5 req/min delete)
- Validazione dimensione: ✅ (1MB payload, 500KB matchData, 50KB prompt)
- Validazione formato: ✅ (UUID v4 per match_id)
- Sanitizzazione: ✅ (limite lunghezza campi)
- Privacy: ✅ (user_id non loggato)

**Allineamento Codice:** ✅ **ALLINEATO**
- Pattern esistenti: ✅
- Stile codice: ✅
- Gestione errori: ✅
