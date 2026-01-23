# Analisi Problema: Riassunto AI Impersonale

**Data:** 23 Gennaio 2026  
**Problema:** Il riassunto AI non riconosce nome utente, squadra, o preferenze personali

---

## 🔍 PROBLEMA IDENTIFICATO

**Situazione Attuale:**
- Utente ha salvato profilo con:
  - Nome: `attilio`
  - Squadra: `natural born game`
  - Nome IA: `attilio`
  - Come ricordarsi: `gioco per divertimento ma voglio migliorare`
- **Ma il riassunto AI è impersonale** e non usa questi dati

---

## 📊 FLUSSO ATTUALE (SBAGLIATO)

### 1. Frontend chiama `/api/analyze-match`
```
Frontend (match/new/page.jsx)
  ↓
POST /api/analyze-match
  Body: { matchData: {...} }
```

### 2. Backend (`analyze-match/route.js`)
```javascript
// ❌ PROBLEMA: NON recupera user_profiles
const userId = userData.user.id  // ✅ Ha userId
// ❌ MANCA: Query a user_profiles

// Genera prompt IMPERSONALE
const prompt = generateAnalysisPrompt(matchData, confidence, missingSections)
// Prompt: "Analizza i dati di questa partita..."
// ❌ NON include: nome utente, squadra, preferenze
```

### 3. Prompt inviato a OpenAI
```
"Analizza i dati di questa partita di eFootball e genera un riassunto dell'andamento.

RISULTATO: 6-1
DATI DISPONIBILI: ...
..."
```
**❌ Problema:** Prompt generico, senza contesto utente

### 4. Risposta OpenAI
```
"La partita si è conclusa con il risultato di 6-1..."
```
**❌ Problema:** Impersonale, non sa chi è l'utente

---

## ✅ FLUSSO CORRETTO (DA IMPLEMENTARE)

### 1. Frontend chiama `/api/analyze-match`
```
Frontend (match/new/page.jsx)
  ↓
POST /api/analyze-match
  Body: { matchData: {...} }
```

### 2. Backend (`analyze-match/route.js`) - DA MODIFICARE
```javascript
const userId = userData.user.id  // ✅ Ha userId

// ✅ NUOVO: Recupera profilo utente
const admin = createClient(supabaseUrl, serviceKey)
const { data: userProfile } = await admin
  .from('user_profiles')
  .select('first_name, team_name, ai_name, how_to_remember, client_team_name')
  .eq('user_id', userId)
  .maybeSingle()

// ✅ NUOVO: Genera prompt PERSONALIZZATO
const prompt = generateAnalysisPrompt(
  matchData, 
  confidence, 
  missingSections,
  userProfile  // ✅ Passa dati profilo
)
```

### 3. Prompt PERSONALIZZATO per OpenAI
```
"Analizza i dati di questa partita di eFootball per Attilio e genera un riassunto dell'andamento.

CONTESTO UTENTE:
- Nome: Attilio
- Squadra: natural born game
- Preferenze: gioco per divertimento ma voglio migliorare
- Nome IA: attilio

RISULTATO: 6-1
DATI DISPONIBILI: ...

ISTRUZIONI:
1. Rivolgiti direttamente ad Attilio (usa "tu", "la tua squadra")
2. Riferisciti alla squadra "natural born game" quando parli della squadra del cliente
3. Considera che Attilio gioca per divertimento ma vuole migliorare
4. Sii incoraggiante ma costruttivo
..."
```

### 4. Risposta OpenAI PERSONALIZZATA
```
"Attilio, la tua squadra natural born game ha ottenuto un'ottima vittoria per 6-1! 
Considerando che giochi per divertimento ma vuoi migliorare, ecco alcuni punti chiave..."
```
**✅ Risultato:** Personalizzato, riconosce utente e squadra

---

## 🔧 CAUSA DEL PROBLEMA

**Perché non funziona:**
1. ❌ `analyze-match/route.js` NON fa query a `user_profiles`
2. ❌ `generateAnalysisPrompt()` NON riceve dati profilo
3. ❌ Prompt generico senza contesto utente
4. ❌ OpenAI non sa chi è l'utente

**Dati disponibili ma non usati:**
- ✅ `user_profiles.first_name` → "attilio"
- ✅ `user_profiles.team_name` → "natural born game"
- ✅ `user_profiles.ai_name` → "attilio"
- ✅ `user_profiles.how_to_remember` → "gioco per divertimento ma voglio migliorare"
- ✅ `matches.client_team_name` → "natural born game" (se presente)

---

## 💡 SOLUZIONE

### Modifiche Necessarie

**1. Recuperare profilo utente in `analyze-match/route.js`:**
```javascript
// Dopo autenticazione, prima di generare prompt
const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const { data: userProfile } = await admin
  .from('user_profiles')
  .select('first_name, team_name, ai_name, how_to_remember')
  .eq('user_id', userId)
  .maybeSingle()
```

**2. Modificare `generateAnalysisPrompt()` per accettare profilo:**
```javascript
function generateAnalysisPrompt(matchData, confidence, missingSections, userProfile) {
  // Costruisci contesto utente
  let userContext = ''
  if (userProfile) {
    userContext = `\nCONTESTO UTENTE:\n`
    if (userProfile.first_name) {
      userContext += `- Nome: ${userProfile.first_name}\n`
    }
    if (userProfile.team_name) {
      userContext += `- Squadra: ${userProfile.team_name}\n`
    }
    if (userProfile.how_to_remember) {
      userContext += `- Preferenze: ${userProfile.how_to_remember}\n`
    }
    if (userProfile.ai_name) {
      userContext += `- Nome IA: ${userProfile.ai_name}\n`
    }
  }
  
  // Aggiungi istruzioni personalizzazione
  const personalizationInstructions = userProfile?.first_name
    ? `\nISTRUZIONI PERSONALIZZAZIONE:
1. Rivolgiti direttamente a ${userProfile.first_name} (usa "tu", "la tua squadra")
2. ${userProfile.team_name ? `Riferisciti alla squadra "${userProfile.team_name}" quando parli della squadra del cliente` : ''}
3. ${userProfile.how_to_remember ? `Considera che ${userProfile.how_to_remember}` : ''}
4. Sii incoraggiante ma costruttivo\n`
    : ''
  
  return `Analizza i dati di questa partita di eFootball${userProfile?.first_name ? ` per ${userProfile.first_name}` : ''} e genera un riassunto dell'andamento.
${userContext}
...`
}
```

**3. Passare profilo al prompt:**
```javascript
const prompt = generateAnalysisPrompt(
  sanitizedMatchData, 
  confidence, 
  missingSections,
  userProfile  // ✅ Passa profilo
)
```

---

## 📋 CHECKLIST IMPLEMENTAZIONE

- [ ] Recuperare `user_profiles` in `analyze-match/route.js`
- [ ] Modificare `generateAnalysisPrompt()` per accettare `userProfile`
- [ ] Aggiungere contesto utente al prompt
- [ ] Aggiungere istruzioni personalizzazione
- [ ] Testare con profilo completo
- [ ] Testare con profilo parziale (solo nome)
- [ ] Testare senza profilo (fallback impersonale)

---

## ✅ RISULTATO ATTESO

**Prima (Impersonale):**
> "La partita si è conclusa con il risultato di 6-1. Le statistiche mostrano..."

**Dopo (Personalizzato):**
> "Attilio, la tua squadra natural born game ha ottenuto un'ottima vittoria per 6-1! Considerando che giochi per divertimento ma vuoi migliorare, ecco alcuni punti chiave per continuare a crescere..."

---

## 🔒 GARANZIE

- ✅ **Backward Compatible:** Se profilo non esiste, prompt impersonale (come ora)
- ✅ **Non Bloccante:** Se errore recupero profilo, continua con prompt generico
- ✅ **Privacy:** Solo dati profilo utente (non dati altri utenti)
- ✅ **Performance:** Query profilo veloce (indice su user_id)
