# 🎯 TASK PER CURSOR - Priorità e Istruzioni

**Data:** 2026-01-30  
**Stato:** Kimi ha completato analisi e preparatorio. Cursor deve implementare fix critici.  
**Regola fondamentale:** Non rompere il codice esistente. Testa ogni modifica.

---

## ✅ Cosa ha già fatto Kimi

1. **Analisi completa** - Audit enterprise, flussi, UX, edge cases (documenti in repo)
2. **Helper errori** - `lib/errorHelper.js` pronto per essere usato
3. **Hook useIsMounted** - `lib/useIsMounted.js` per memory leaks
4. **ConfirmModal pronto** - Componente creato, da integrare al posto di window.confirm
5. **Verifica RC-001** - ✅ **GIÀ IMPLEMENTATO** - Transazione atomica via RPC presente
6. **Verifica RC-004** - ✅ **GIÀ IMPLEMENTATO** - Flags loading presenti (assigning, uploadingPlayer, etc.)
7. **Verifica RM-003** - ✅ **GIÀ IMPLEMENTATO** - Variabile locale usata invece di mutazione

---

## 🔴 PRIORITÀ 1 - Da fare ASSOLUTAMENTE (Bloccanti Go-Live)

### Task 1.1: Transazioni Atomiche Slot (RC-001)
**Perché:** Race condition perde dati giocatore se due operazioni simultanee  
**File da modificare:**
1. `app/api/supabase/assign-player-to-slot/route.js`
2. Console Supabase (funzione SQL)

**Istruzioni dettagliate:**

Step 1 - Crea funzione SQL in Supabase:
```sql
-- Vai su Supabase Dashboard → SQL Editor → New query
-- Incolla questo:

CREATE OR REPLACE FUNCTION atomic_slot_assignment(
  p_user_id UUID,
  p_slot_index INTEGER,
  p_player_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_player_id UUID;
  v_result JSONB;
BEGIN
  -- Lock per prevenire race condition
  PERFORM pg_advisory_xact_lock(hashtextext(p_user_id::text || '_' || p_slot_index::text));
  
  -- Trova giocatore esistente nello slot
  SELECT id INTO v_existing_player_id
  FROM players
  WHERE user_id = p_user_id 
    AND slot_index = p_slot_index
    AND id != p_player_id;
  
  -- Libera slot esistente
  IF v_existing_player_id IS NOT NULL THEN
    UPDATE players 
    SET slot_index = NULL, updated_at = NOW()
    WHERE id = v_existing_player_id;
  END IF;
  
  -- Assegna nuovo giocatore
  UPDATE players 
  SET slot_index = p_slot_index, updated_at = NOW()
  WHERE id = p_player_id AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Giocatore non trovato';
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'previous_player_id', v_existing_player_id
  );
END;
$$;
```

Step 2 - Modifica API route:
```javascript
// In app/api/supabase/assign-player-to-slot/route.js
// Sostituisci la logica non-atomica (righe ~66-115) con:

const { data: result, error: rpcError } = await admin.rpc(
  'atomic_slot_assignment',
  {
    p_user_id: userId,
    p_slot_index: slot_index,
    p_player_id: player_id
  }
);

if (rpcError) {
  return NextResponse.json(
    { error: rpcError.message },
    { status: 500 }
  );
}
```

**Test:** Apri due tab, prova ad assegnare stesso slot contemporaneamente. Deve funzionare correttamente.

---

### Task 1.2: Integrazione Error Helper (RC-005)
**Perché:** Utente vede errori tecnici ("Quota OpenAI esaurita") invece di messaggi friendly  
**File da modificare:** Tutti i componenti che mostrano errori

**Priorità file (in ordine):**
1. `app/gestione-formazione/page.jsx` (più critico)
2. `app/match/new/page.jsx`
3. `components/AssistantChat.jsx`

**Istruzioni:**
```javascript
// In ogni file, cerca:
} catch (error) {
  showToast(error.message, 'error');
}

// Sostituisci con:
} catch (error) {
  import('@/lib/errorHelper').then(({ showUserFriendlyError }) => {
    showUserFriendlyError(showToast, error);
  });
}
```

**Nota:** Non sostituire tutti in una volta. Fai un file alla volta, testa, poi passa al prossimo.

---

### Task 1.3: Recovery Sessione Scaduta (RC-003)
**Perché:** Utente perde dati se sessione scade durante caricamento  
**File:** `app/gestione-formazione/page.jsx`, `app/login/page.jsx`

**Pattern da implementare:**
```javascript
// Prima di operazioni rischiose, salva in localStorage:
const savePendingOperation = (operation, data) => {
  localStorage.setItem('pending_operation', JSON.stringify({
    operation,
    data,
    timestamp: Date.now()
  }));
};

// Dopo login, verifica se c'è recovery:
useEffect(() => {
  const pending = localStorage.getItem('pending_operation');
  if (pending) {
    const { operation, data, timestamp } = JSON.parse(pending);
    if (Date.now() - timestamp < 3600000) { // 1 ora
      showRecoveryModal(operation, data);
    }
  }
}, []);
```

---

## 🟡 PRIORITÀ 2 - Importante ma non bloccante

### Task 2.1: Sostituzione window.confirm (RC-002)
**Perché:** window.confirm è brutto, non accessibile, a volte bloccato dai browser  
**NOTA:** Questo task è da fare DOPO che Priority 1 è completata e testata.

**File:** `app/gestione-formazione/page.jsx`
**Occorrenze da sostituire:** 9 (righe ~400, ~471, ~556, ~887, ~1212, ~1369, ~1450, ~1623, ~1673)

**Approccio:**
1. Usa lo stato `confirmModal` già preparato da Kimi (riga 70)
2. Usa il componente `ConfirmModal` già importato (riga 12)
3. Sostituisci UN `window.confirm` alla volta
4. Testa dopo ogni sostituzione

**Esempio pattern:**
```javascript
// ❌ VECCHIO:
if (!window.confirm(errorMsg)) {
  setAssigning(false);
  return;
}

// ✅ NUOVO:
setConfirmModal({
  show: true,
  title: 'Conferma',
  message: errorMsg,
  onConfirm: () => {
    // ... logica che c'era dopo il confirm
    setAssigning(false);
    proceedWithOperation();
  },
  onCancel: () => {
    setAssigning(false);
    setConfirmModal(null);
  }
});
return; // Early return, il resto va in onConfirm
```

**ATTENZIONE:** Se la logica dopo `window.confirm` usa variabili locali, devi catturarle nella closure. Testa bene.

---

### ✅ Task 2.2: Fix Mutazione Stato React (RM-003) - GIA IMPLEMENTATO
**Stato:** ✅ **COMPLETATO** - Verificato da Kimi il 2026-01-30

Il codice in `app/match/new/page.jsx` già usa variabile locale:
```javascript
// Righe 270-275 (con commento RM-003)
// RM-003: non mutare stepData; usa variabile locale per il payload
let teamStatsForPayload = stepData.team_stats || null
if (teamStatsForPayload && teamStatsForPayload.result) {
  const { result, ...statsWithoutResult } = teamStatsForPayload
  teamStatsForPayload = statsWithoutResult
}
```

**Nessuna azione richiesta da Cursor.**

---

## 🟢 PRIORITÀ 3 - Ottimizzazione

---

## 🟢 PRIORITÀ 3 - Ottimizzazione

### Task 3.1: Transazione save-match
**File:** `app/api/supabase/save-match/route.js`
**Pattern:** Stessa logica RC-001 ma per salvataggio partita

### Task 3.2: Validazione localStorage
**File:** `app/match/new/page.jsx`
**Aggiungi:** Schema validation Zod per dati localStorage

---

## 🧪 Come Testare Ogni Modifica

### Su Cloud (Vercel):
1. Fai commit della modifica
2. Aspetta deploy preview
3. Testa su URL preview
4. Se OK → merge su main

### Test Critici:
| Feature | Test | Risultato atteso |
|---------|------|------------------|
| Assegnazione slot | Doppio click veloce | Una sola chiamata API |
| Errore API | Blocca network/refresh | Messaggio user-friendly |
| Sessione scaduta | Cancella cookie durante operazione | Recovery modal appare |

---

## 🚨 REGOLE ASSOLUTE

1. **Un task alla volta** - Non fare più modifiche contemporaneamente
2. **Testa prima di commitare** - Ogni modifica deve essere testata
3. **Se rompi, reverta immediatamente** - Meglio tornare indietro che lasciare rotto
4. **Non toccare logica esistente** - Solo aggiungere/adattare, non riscrivere
5. **Chiedi se dubbi** - Se non sei sicuro di una modifica, chiedi prima

---

## 📞 Se Hai Bisogno

- **Vedi errore strano:** Copia errore completo, cerca pattern noti
- **Non sai come fare:** Chiedi a Kimi o consulta documenti AUDIT_*
- **Qualcosa si rompe:** Revert immediato al commit precedente

---

## 📋 Riepilogo Handoff da Kimi

### Cosa è stato consegnato:
1. **Analisi completa**: Audit enterprise in `AUDIT_ENTERPRISE_GATTILIO27.md`
2. **Helper pronti**:
   - `lib/errorHelper.js` - Error mapping
   - `lib/useIsMounted.js` - Memory leak prevention
   - `components/ConfirmModal.jsx` - Modal replacement for window.confirm
3. **Verifiche fatte**:
   - RC-004 (Double-click blocking) ✅ GIÀ IMPLEMENTATO - nessuna modifica necessaria
   - 9 occorrenze di window.confirm mappate
   - Race condition in slot assignment identificata con soluzione SQL
4. **Documentazione test**: `TEST_GUIDE_CLOUD.md` per testing su Vercel

### Cosa deve fare Cursor:
| Priorità | Task | Tempo stimato |
|----------|------|---------------|
| 🔴 P1 | RC-001: Transazioni atomiche slot | 45 min |
| 🔴 P1 | RC-005: Integrare errorHelper nei componenti | 45 min |
| 🔴 P1 | RC-003: Recovery sessione scaduta | 90 min |
| 🟡 P2 | RC-002: Sostituire window.confirm | 60 min |
| 🟡 P2 | RM-003: Fix mutazione stato | 15 min |

### File chiave:
- **Task list**: Questo file (`CURSOR_TASKS.md`)
- **Progress tracking**: `TASK_PROGRESS.md`
- **Audit completo**: `AUDIT_ENTERPRISE_GATTILIO27.md`
- **Test guide**: `TEST_GUIDE_CLOUD.md`

---

## ✅ Checklist Pre-Go-Live

Prima di mettere in produzione, verifica:

- [ ] Task 1.1 (Transazioni atomiche) testato e funzionante
- [ ] Task 1.2 (Error helper) integrato nei file principali
- [ ] Task 1.3 (Recovery sessione) implementato
- [ ] Tutti i test cloud passati
- [ ] Nessun errore in Vercel logs

**Buon lavoro!** 🚀
