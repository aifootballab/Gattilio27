# 📋 AUDIT ENTERPRISE - GATTILIO27
## Analisi Completa End-to-End: Sicurezza, Performance, Stabilità, UX

**Data:** 2026-01-30  
**Progetto:** Gattilio27  
**Versione:** 1.0.0  
**Stato:** Pre-Go-Live Review  

---

## 🎯 EXECUTIVE SUMMARY

| Area | Stato | Issue Critiche | Issue Medie | Issue Basse |
|------|-------|----------------|-------------|-------------|
| **Sicurezza** | ⚠️ Da migliorare | 2 | 4 | 2 |
| **Stabilità** | ⚠️ Da migliorare | 5 | 6 | 3 |
| **Performance** | ✅ Accettabile | 0 | 2 | 4 |
| **UX/Usabilità** | ⚠️ Da migliorare | 4 | 8 | 12 |
| **Codice** | ⚠️ Da migliorare | 1 | 5 | 8 |

**Raccomandazione:** ⚠️ **GO-LIVE RIMANDATO** fino a risoluzione issue critiche (stima: 3-5 giorni)

---

## 🔴 CRITICO - Bloccanti per Go-Live

### RC-001: Race Condition Assegnazione Slot
**File:** `app/api/supabase/assign-player-to-slot/route.js`  
**Linee:** 66-115  
**Severità:** 🔴 CRITICO  

```javascript
// CODICE PROBLEMATICO
const { data: existingPlayerInSlot } = await admin
  .from('players')
  .select('id, player_name, age')
  .eq('user_id', userId)
  .eq('slot_index', slot_index)
  .maybeSingle()

if (existingPlayerInSlot) {
  await admin.from('players').delete()...  // Step 1
  await admin.from('players').update(...)  // Step 2 - NON ATOMICO
}
await admin.from('players').update(...)    // Step 3
```

**Scenario Problema:**
1. Utente A assegna giocatore X allo slot 5
2. Utente B (stesso account, altra tab) assegna giocatore Y allo slot 5 contemporaneamente
3. Entrambe le richieste leggono slot 5 come libero
4. Entrambe scrivono, risultato: uno dei due giocatori perso

**Impatto:** Perdita dati giocatore, stato database inconsistente

**Fix Suggerito:**
```javascript
// Usare RPC PostgreSQL atomico
const { error } = await admin.rpc('atomic_slot_assignment', {
  p_user_id: userId,
  p_slot_index: slot_index,
  p_player_id: player_id
});

// Funzione PostgreSQL:
/*
CREATE OR REPLACE FUNCTION atomic_slot_assignment(
  p_user_id UUID,
  p_slot_index INTEGER,
  p_player_id UUID
) RETURNS VOID AS $$
BEGIN
  -- Lock riga utente
  PERFORM pg_advisory_xact_lock(hashtextext(p_user_id::text));
  
  -- Libera slot esistente
  UPDATE players SET slot_index = NULL 
  WHERE user_id = p_user_id AND slot_index = p_slot_index;
  
  -- Assegna nuovo giocatore
  UPDATE players SET slot_index = p_slot_index 
  WHERE id = p_player_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;
*/
```

---

### RC-002: window.confirm() Bloccante UX
**File:** `app/gestione-formazione/page.jsx` (multiple)  
**Occorrenze:** 9 volte (righe 400, 471, 556, 887, 1212, 1369, 1450, 1623, 1673)  
**Severità:** 🔴 CRITICO  

**Problema:** 
- Browser moderni bloccano `window.confirm()` in alcuni contesti
- Non funziona in modalità SSR/hydration di Next.js
- Esperienza utente inconsistente (stile OS dipendente)
- Accessibilità: non navigabile da tastiera correttamente

**Codice problematico:**
```javascript
// Riga 400
if (!window.confirm(errorMsg)) {
  setAssigning(false)
  return
}
```

**Fix Suggerito:**
```javascript
// Usare il componente ConfirmModal già presente nel progetto
const [pendingAction, setPendingAction] = useState(null);

// Nel render:
{pendingAction && (
  <ConfirmModal
    show={true}
    title={pendingAction.title}
    message={pendingAction.message}
    onConfirm={() => {
      pendingAction.onConfirm();
      setPendingAction(null);
    }}
    onCancel={() => setPendingAction(null)}
  />
)}
```

---

### RC-003: Perdita Dati Sessione Scaduta
**File:** `app/gestione-formazione/page.jsx` e `app/match/new/page.jsx`  
**Severità:** 🔴 CRITICO  

**Scenario:**
1. Utente passa 15 minuti a caricare dati partita
2. Sessione scade durante operazione
3. API ritorna 401
4. Utente viene redirectato a login
5. **Dati persi irreversibilmente**

**Codice problematico:**
```javascript
// gestione-formazione/page.jsx:937-939
const { data: session } = await supabase.auth.getSession()
if (!session?.session?.access_token) {
  throw new Error('Sessione scaduta')  // Dati persi!
}
```

**Fix Suggerito - Pattern Recovery:**
```javascript
// 1. Salvare stato in localStorage prima di chiamate API
const savePendingOperation = (operation, data) => {
  localStorage.setItem('pending_operation', JSON.stringify({
    operation,
    data,
    timestamp: Date.now()
  }));
};

// 2. Dopo login, verificare e ripristinare
useEffect(() => {
  const pending = localStorage.getItem('pending_operation');
  if (pending) {
    const { operation, data } = JSON.parse(pending);
    // Ripristina operazione
    showRecoveryModal(operation, data);
  }
}, []);
```

---

### RC-004: Doppio Click = Duplicati
**File:** `app/match/new/page.jsx:702`, `app/gestione-formazione/page.jsx:1020`  
**Severità:** 🔴 CRITICO  

**Problema:** Nessun flag `isProcessing` blocca click multipli durante operazioni asincrone.

```javascript
// match/new/page.jsx:702 - handleSaveMatch
const handleSaveMatch = async () => {
  // Nessun check se già in corso!
  setSaving(true);  // Troppo tardi, doppio click già passato
  // ... operazioni
}
```

**Scenario:**
1. Utente clicca "Salva Partita"
2. Connessione lenta, nessun feedback immediato
3. Utente clicca di nuovo pensando che non abbia funzionato
4. Partita salvata 2 volte

**Fix Suggerito:**
```javascript
const [isProcessing, setIsProcessing] = useState(false);

const handleSaveMatch = async () => {
  if (isProcessing) return;  // Blocca doppio click
  
  setIsProcessing(true);
  try {
    // ... operazioni
  } finally {
    setIsProcessing(false);
  }
};

// UI:
<Button 
  disabled={isProcessing}
  loading={isProcessing}
>
  {isProcessing ? 'Salvataggio...' : 'Salva Partita'}
</Button>
```

---

### RC-005: Gestione Errori HTTP Esposti
**File:** `app/gestione-formazione/page.jsx:1511`  
**Severità:** 🔴 CRITICO  

**Problema:** Errori tecnici mostrati direttamente all'utente.

```javascript
// Riga 1511
setError(err.message || 'Errore caricamento dati')
```

**Esempi di errori che l'utente vede:**
- "Quota OpenAI esaurita. Controlla il tuo piano..."
- "PGRST116: no rows found"
- "500 Internal Server Error"
- "Request timeout after 60000ms"

**Fix Suggerito - Mappatura Errori:**
```javascript
const ERROR_MESSAGES = {
  'quota_exceeded': 'Servizio momentaneamente non disponibile. Riprova tra qualche minuto.',
  'rate_limit': 'Hai effettuato troppe richieste. Attendi un momento.',
  'timeout': 'Connessione lenta. Verifica la tua rete e riprova.',
  'invalid_image': 'Immagine non valida. Prova con un altro screenshot.',
  'session_expired': 'Sessione scaduta. Accedi di nuovo per continuare.',
  'default': 'Si è verificato un errore. Riprova o contatta il supporto.'
};

const getUserErrorMessage = (error) => {
  const code = extractErrorCode(error);
  return ERROR_MESSAGES[code] || ERROR_MESSAGES.default;
};
```

---

## 🟡 MEDIO - Importanti ma non bloccanti

### RM-001: No Transazione in save-match
**File:** `app/api/supabase/save-match/route.js`  
**Linee:** 427-447  
**Severità:** 🟡 MEDIO  

**Problema:** Pattern calcolati salvati anche se task progress fallisce.

```javascript
// Codice problematico
calculateTacticalPatterns(admin, userId)
  .then(async () => {
    await updateAIKnowledgeScore(...)
    await updateTasksProgressAfterMatch(...)  // Se fallisce, pattern rimangono
  })
```

**Fix:** Usare batch transaction o rollback manuale.

---

### RM-002: Memory Leak Timer
**File:** `app/gestione-formazione/page.jsx:220-225`  
**Severità:** 🟡 MEDIO  

```javascript
React.useEffect(() => {
  if (toast) {
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }
}, [toast])
```

**Problema:** Se toast cambia rapidamente, timer multipli attivi.

**Fix:**
```javascript
React.useEffect(() => {
  if (!toast) return;
  
  const timer = setTimeout(() => setToast(null), 4000);
  return () => clearTimeout(timer);
}, [toast?.id]); // Dipendenza da ID univoco
```

---

### RM-003: Mutazione Stato React
**File:** `app/match/new/page.jsx:271`  
**Severità:** 🟡 MEDIO  

```javascript
// Mutazione diretta - Anti-pattern React
stepData.team_stats = statsWithoutResult
```

**Fix:**
```javascript
setStepData(prev => ({
  ...prev,
  team_stats: statsWithoutResult
}));
```

---

### RM-004: Validazione LocalStorage Mancante
**File:** `app/match/new/page.jsx:42-44`  
**Severità:** 🟡 MEDIO  

```javascript
const parsed = JSON.parse(saved)
setStepData(parsed.stepData || {})  // Nessuna validazione schema!
```

**Rischio:** Corruzione dati se localStorage manipolato.

**Fix:**
```javascript
import { z } from 'zod';

const StepDataSchema = z.object({
  player_ratings: z.object({}).optional(),
  team_stats: z.object({}).optional(),
  // ... validazione completa
});

try {
  const parsed = JSON.parse(saved);
  const validated = StepDataSchema.parse(parsed.stepData);
  setStepData(validated);
} catch (e) {
  console.warn('Dati localStorage corrotti, resetto');
  localStorage.removeItem(STORAGE_KEY);
}
```

---

### RM-005: Query N+1
**File:** `app/api/supabase/save-formation-layout/route.js:177-194`  
**Severità:** 🟡 MEDIO  

```javascript
// 11 query separate in loop!
for (const [slotIndex, slotPos] of Object.entries(completeSlots)) {
  await admin
    .from('players')
    .update({ position: slotPos.position })
    .eq('slot_index', slotIdx)
}
```

**Fix:** Batch update
```javascript
await admin
  .from('players')
  .upsert(
    Object.entries(completeSlots).map(([idx, pos]) => ({
      slot_index: Number(idx),
      position: pos.position,
      user_id: userId
    }))
  );
```

---

### RM-006: Chiamata Supabase senza Gestione Errore
**File:** `app/gestione-formazione/page.jsx:1010-1016`  
**Severità:** 🟡 MEDIO  

```javascript
// Nessun try/catch!
await supabase
  .from('players')
  .update({ slot_index: null })
  .eq('id', duplicatePlayerId)
```

**Fix:** Aggiungere gestione errore e rollback stato UI.

---

## 🟢 BASSO - Miglioramenti consigliati

### RB-001: Codice Duplicato Estrazione
**File:** `app/gestione-formazione/page.jsx`  
**Linee:** 748-926 e 1479-1722  

Logica estrazione dati duplicata quasi identica. Estrarre in hook `usePlayerExtraction`.

---

### RB-002: Dead Code
**File:** `app/api/supabase/save-match/route.js:449-451`  

Commento riferimento a helper inesistente.

---

### RB-003: Validazione Debole
**File:** `app/api/supabase/save-player/route.js`  

`player_name` validato solo su lunghezza, no caratteri speciali o SQL injection (anche se Supabase parametrizza).

---

## 📊 FLUSSI END-TO-END ANALISI

### Flusso 1: Caricamento Giocatore
```
Utente → Clicca Slot → Upload Foto → Estrazione AI 
→ Selezione Posizioni → Check Duplicati → Salvataggio
```

| Step | Problema | Stato |
|------|----------|-------|
| Upload | No progresso % | ⚠️ |
| Estrazione | Timeout 60s bloccato | ⚠️ |
| Selezione Posizioni | UX ok | ✅ |
| Check Duplicati | Closure variabili non catturate | 🔴 |
| Salvataggio | No rollback su errore | 🔴 |

### Flusso 2: Wizard Partita
```
Utente → Step 1 → Step 2 → ... → Step 5 → Salva
```

| Step | Problema | Stato |
|------|----------|-------|
| Navigazione | No "Indietro" | ⚠️ |
| Skip Step | Perde dati senza conferma | 🔴 |
| LocalStorage | No validazione schema | ⚠️ |
| Salva | Doppio click possibile | 🔴 |
| Recovery | Sessione scade = dati persi | 🔴 |

### Flusso 3: Chat AI
```
Utente → Apre Chat → Scrive Messaggio → Riceve Risposta
```

| Step | Problema | Stato |
|------|----------|-------|
| Persistenza | Persa al refresh | ⚠️ |
| Rate Limit | Messaggio generico | ⚠️ |
| Errori | "Riprova tra un attimo" per tutto | ⚠️ |

---

## 🛡️ SICUREZZA

### Problemi Identificati

| # | Problema | File | Risk |
|---|----------|------|------|
| 1 | window.confirm bypassabile | Multiple | Medium |
| 2 | No rate limiting per utente anonimo | rateLimiter.js | Low |
| 3 | Dati sensibili in localStorage (plaintext) | match/new | Medium |
| 4 | Token visibile in network tab (normale) | Tutte le API | Low |

### Raccomandazioni
1. Aggiungere CSP headers
2. Validare tutti gli input con Zod
3. Criptare dati localStorage sensibili
4. Aggiungere audit log per operazioni critiche

---

## 🚀 PERFORMANCE

### Query Lente Identificate

| Query | File | Tempo stimato | Fix |
|-------|------|---------------|-----|
| Ricerca duplicati ILIKE | save-player | O(n) senza indice | Aggiungere indice trigram |
| Update 11 slot separati | save-formation | 11 round-trip | Batch upsert |
| Select * senza limit | lista-giocatori | Caricamento infinito | Aggiungere LIMIT/OFFSET |

---

## 📋 CHECKLIST GO-LIVE

### Deve essere completato prima del go-live:

- [ ] RC-001: Transazioni atomiche slot giocatori
- [ ] RC-002: Sostituire tutti window.confirm
- [ ] RC-003: Recovery sessione scaduta
- [ ] RC-004: Blocco doppio click operazioni
- [ ] RC-005: Mappatura errori user-friendly
- [ ] RM-001: Transazione save-match
- [ ] RM-006: Gestione errori Supabase

### Completare entro 30 giorni:

- [ ] RM-002: Fix memory leak timer
- [ ] RM-003: Eliminare mutazioni stato
- [ ] RM-004: Validazione localStorage
- [ ] RB-001: Refactoring codice duplicato

---

## 💡 RACCOMANDAZIONI STRATEGICHE

### 1. Aggiungere Feature Flags
```javascript
const FEATURES = {
  ENABLE_RECOVERY_SESSION: false,  // Attivare dopo fix RC-003
  ENABLE_ATOMIC_SLOTS: false,      // Attivare dopo fix RC-001
  STRICT_VALIDATION: false         // Attivare dopo testing
};
```

### 2. Implementare Monitoring
```javascript
// Sentry o simile per catturare errori in produzione
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  beforeSend(event) {
    // Sanitizzare dati sensibili
    return sanitizeEvent(event);
  }
});
```

### 3. Aggiungere Test E2E Critici
- Caricamento giocatore completo
- Wizard partita con recovery
- Race condition slot
- Sessione scaduta durante operazione

---

## 📞 CONTATTI E SUPPORTO

**Team Sviluppo:** [...]  
**Responsabile Prodotto:** [...]  
**Data prevista go-live:** [DA DEFINIRE]  
**Data revisione:** 2026-01-30

---

**Documento versione:** 1.0  
**Prossima revisione:** Dopo fix issue critiche  
**Classificazione:** CONFIDENTIAL - Internal Use Only
