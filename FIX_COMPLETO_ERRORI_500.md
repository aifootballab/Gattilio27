# 🔧 Fix Completo Errori 500 - Voice Coaching GPT Edge Function

**Data**: 2025-01-14  
**Problema**: Errori 500 continui nella Edge Function `voice-coaching-gpt`

---

## 🐛 PROBLEMA IDENTIFICATO

### **Causa Principale**:
Le query Supabase usavano `.single()` che **fallisce con errore 500** se non trova risultati. Questo causava errori quando:
- L'utente non ha ancora una rosa principale (`user_rosa` con `is_main = true`)
- L'utente non ha ancora un profilo (`user_profiles`)
- La sessione non esiste o è scaduta

### **Errore Specifico**:
```typescript
// ❌ PRIMA (causava errore 500 se non trovava risultati):
const { data: rosa } = await supabase
  .from('user_rosa')
  .select('*')
  .eq('user_id', userId)
  .eq('is_main', true)
  .single() // ❌ Lancia errore se non trova risultati
```

---

## ✅ FIX APPLICATI

### **1. Sostituito `.single()` con `.maybeSingle()`**

**File**: `supabase/functions/voice-coaching-gpt/index.ts`

#### **Fix 1: `handleStartSession` (linea 366-389)**
```typescript
// ✅ DOPO (gestisce correttamente il caso "non trovato"):
const { data: rosa, error: rosaError } = await supabase
  .from('user_rosa')
  .select('*, players:player_builds(*)')
  .eq('user_id', userId)
  .eq('is_main', true)
  .maybeSingle() // ✅ Restituisce null se non trova risultati, non errore

if (rosa && !rosaError) {
  userContext.rosa = rosa
} else if (rosaError && rosaError.code !== 'PGRST116') {
  // PGRST116 = "no rows returned" - non è un errore critico
  console.warn('Warning loading rosa:', rosaError.message)
}
```

#### **Fix 2: `send_message` handler (linea 187-203)**
Stesso fix applicato per le query `user_rosa` e `user_profiles` nel handler `send_message`.

#### **Fix 3: `send_message` session loading (linea 145-172)**
```typescript
// ✅ DOPO:
const { data: session, error: sessionError } = await supabase
  .from('coaching_sessions')
  .select('*')
  .eq('session_id', session_id)
  .eq('user_id', user_id)
  .eq('is_active', true)
  .maybeSingle() // ✅ Usa maybeSingle() per gestire meglio il caso "non trovato"

if (sessionError && sessionError.code !== 'PGRST116') {
  // PGRST116 = "no rows returned" - gestito sotto
  console.error('Error loading session:', sessionError)
  return new Response(
    JSON.stringify({ error: 'Error loading session', details: sessionError.message }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

if (!session) {
  return new Response(
    JSON.stringify({ error: 'Session not found or expired' }),
    { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
```

---

## 📋 QUERY CORRETTE

### **Differenza tra `.single()` e `.maybeSingle()`**:

| Metodo | Comportamento se non trova risultati |
|--------|--------------------------------------|
| `.single()` | ❌ Lancia errore 500 (`PGRST116`) |
| `.maybeSingle()` | ✅ Restituisce `null` senza errori |

### **Quando usare**:
- **`.single()`**: Quando **devi** avere un risultato, altrimenti è un errore critico
- **`.maybeSingle()`**: Quando il risultato è **opzionale** (es. rosa, profilo utente)

---

## 🎯 RISULTATO ATTESO

Dopo questi fix:
- ✅ La Edge Function non dovrebbe più restituire errori 500 quando l'utente non ha rosa/profilo
- ✅ Le sessioni vengono create correttamente anche per nuovi utenti
- ✅ Gli errori sono gestiti correttamente con status HTTP appropriati (404, 410, 500)
- ✅ I log sono più informativi per il debugging

---

## 📝 NOTE TECNICHE

### **Codice Errore PGRST116**:
- **Significato**: "no rows returned"
- **Quando si verifica**: Query con `.single()` che non trova risultati
- **Gestione**: Non è un errore critico se il risultato è opzionale, quindi usiamo `.maybeSingle()`

### **Error Handling Migliorato**:
- ✅ Distinzione tra errori critici e "non trovato"
- ✅ Logging dettagliato per debugging
- ✅ Status HTTP appropriati (404 per "not found", 500 per errori server)

---

## ✅ STATUS

- ✅ Fix applicato a `handleStartSession`
- ✅ Fix applicato a `send_message` handler
- ✅ Fix applicato a session loading
- ✅ Commit e push completati
- ⏳ Deploy automatico su Supabase in corso
- ⏳ Test end-to-end da eseguire dopo deploy

---

**Prossimi Step**:
1. ⏳ Attendere deploy automatico Supabase
2. ⏳ Test `start_session` action con nuovo utente
3. ⏳ Verificare logs Supabase per confermare fix
4. ⏳ Test completo end-to-end
