# 📋 TASK PROGRESS - Gattilio27 Pre-Go-Live

**Ultimo aggiornamento:** 2026-01-30  
**Stato:** In corso  
**Commit attuale:** `aab04f1`  

---

## ✅ COMPLETATI (Fatto da Kimi AI)

### Documentazione & Analisi
| Task | Stato | File/Commit |
|------|-------|-------------|
| Audit enterprise completo | ✅ | `AUDIT_ENTERPRISE_GATTILIO27.md` |
| Analisi flussi end-to-end | ✅ | `REPORT_ANALISI_FLUSSI_END_TO_END.md` |
| UX audit cliente | ✅ | `REPORT_UX_AUDIT_GATTILIO27.md` |
| Edge cases analisi | ✅ | `ANALISI_EDGE_CASE_CLIENTE_GATTILIO27.md` |
| Piano rischi | ✅ | `RISCHI_E_PIANO_SICURO_INSERIMENTO_GIOCATORE.md` |

### Fix Implementati
| Task | Stato | File | Note |
|------|-------|------|------|
| Helper errori user-friendly | ✅ | `lib/errorHelper.js` | Mappatura errori tecnici → messaggi utente |
| Hook useIsMounted | ✅ | `lib/useIsMounted.js` | Previene memory leaks |
| Prompt Supabase SQL | ✅ | `PROMPT_CURSOR_SUPABASE.md` | Istruzioni complete per Cursor |

### Fix Codice (parziali)
| Task | Stato | File | Dettaglio |
|------|-------|------|-----------|
| Flusso upload giocatore | ✅ | `gestione-formazione/page.jsx` | `handleSavePlayerWithPositions` implementata |
| Validazione posizioni | ✅ | `save-player/route.js` | Aggiunte posizioni mancanti (CMF, LWF, etc.) |

---

## 🔄 IN CORSO / DA COMPLETARE

**📖 Documento guida per Cursor:** `CURSOR_TASKS.md`

### Priorità 1 - Bloccanti Go-Live 🔴

| ID | Task | Assegnato | Stato | Note |
|----|------|-----------|-------|------|
| RC-001 | Transazioni atomiche slot | **Cursor** | 🔄 | **Vedi CURSOR_TASKS.md Task 1.1** - SQL + API route |
| RC-002 | Sostituire window.confirm | **Cursor** | ⏳ | **Vedi CURSOR_TASKS.md Task 2.1** - Post-priority 1 |
| RC-003 | Recovery sessione scaduta | **Cursor** | ⏳ | **Vedi CURSOR_TASKS.md Task 1.3** - Pattern recovery |
| RC-004 | Blocco doppi click | ✅ Kimi | ✅ | **GIÀ IMPLEMENTATO - Verificato** |
| RC-005 | Mappatura errori completa | **Cursor** | 🔄 | **Vedi CURSOR_TASKS.md Task 1.2** - Integrare errorHelper |

### Priorità 2 - Importante 🟡

| ID | Task | Assegnato | Stato | Note |
|----|------|-----------|-------|------|
| RM-001 | Transazione save-match | **Cursor** | 🔄 | Dopo RC-001, stesso pattern SQL |
| RM-002 | Fix memory leak timer | Kimi AI | ⏳ | Modifica useEffect toast |
| RM-003 | Mutazione stato React | **Cursor** | ⏳ | **Vedi CURSOR_TASKS.md Task 2.2** - `match/new/page.jsx:271` |
| RM-004 | Validazione localStorage | **Cursor** | ⏳ | Schema validation |
| RM-006 | Try/catch Supabase | Kimi AI | ⏳ | Aggiungere gestione errori |

### Priorità 3 - Ottimizzazione 🟢

| ID | Task | Assegnato | Stato | Note |
|----|------|-----------|-------|------|
| RB-001 | Refactoring codice duplicato | Future | ⏳ | Estrazione hook |
| RB-002 | Pulizia dead code | Kimi AI | ⏳ | Rimuovere commenti/code morto |
| RB-003 | Validazioni più rigide | Future | ⏳ | Sanitizzazione input |

---

## 📋 CHECKLIST GO-LIVE

### Deve essere fatto PRIMA del go-live:

- [x] Analisi completa problema
- [x] Documentazione audit enterprise
- [ ] RC-001: Transazioni atomiche slot giocatori
- [ ] RC-002: Sostituire tutti window.confirm
- [ ] RC-003: Recovery sessione scaduta
- [x] RC-004: Blocco doppio click operazioni (GIÀ IMPLEMENTATO)
- [ ] RC-005: Mappatura errori user-friendly (integrazione)
- [ ] RM-001: Transazione save-match
- [ ] RM-006: Gestione errori Supabase

### Completare entro 30 giorni post-go-live:

- [ ] RM-002: Fix memory leak timer
- [ ] RM-003: Eliminare mutazioni stato
- [ ] RM-004: Validazione localStorage
- [ ] RB-001: Refactoring codice duplicato

---

## 📝 ISTRUZIONI PER CURSOR

### Task 1: Transazioni Atomiche (RC-001) 🔴

**File da modificare:**
1. Esegui SQL in Supabase Console (vedi `PROMPT_CURSOR_SUPABASE.md`)
2. Modifica `app/api/supabase/assign-player-to-slot/route.js`
   - Rimuovi logica non-atomica (righe 66-115)
   - Aggiungi chiamata RPC a `atomic_slot_assignment`
3. Test: apri due tab, prova ad assegnare stesso slot contemporaneamente

**Codice di riferimento:**
```javascript
// Da implementare nella route
const { data: result, error: rpcError } = await admin.rpc(
  'atomic_slot_assignment',
  {
    p_user_id: userId,
    p_slot_index: slot_index,
    p_player_id: player_id
  }
);
```

---

### Task 2: Sostituire window.confirm (RC-002) 🔴

**File:** `app/gestione-formazione/page.jsx`

**Occorrenze da sostituire:**
1. Riga ~400: `if (!window.confirm(errorMsg))`
2. Riga ~471: `window.confirm(confirmMessage)`
3. Riga ~556: `window.confirm(confirmMsg)`
4. Riga ~887: `window.confirm(...)`
5. Riga ~1212: `window.confirm(warningMsg)`
6. Riga ~1369: `window.confirm(alertMessage)`
7. Riga ~1450: `window.confirm(warningMsg)`
8. Riga ~1623: `window.confirm(confirmMsg)`
9. Riga ~1673: `window.confirm(confirmMsg)`

**Pattern da seguire:**
```javascript
// ❌ Prima
if (!window.confirm('Messaggio')) {
  return;
}
// ... azione

// ✅ Dopo
const [confirmModal, setConfirmModal] = useState({
  show: false,
  title: '',
  message: '',
  onConfirm: null
});

// Nel render
{confirmModal.show && (
  <ConfirmModal
    show={true}
    title={confirmModal.title}
    message={confirmModal.message}
    onConfirm={() => {
      confirmModal.onConfirm();
      setConfirmModal({ show: false });
    }}
    onCancel={() => setConfirmModal({ show: false })}
  />
)}

// Al posto di window.confirm
setConfirmModal({
  show: true,
  title: 'Conferma',
  message: 'Messaggio',
  onConfirm: () => {
    // ... azione
  }
});
return; // Early return, azione async nel callback
```

---

### Task 3: Recovery Sessione (RC-003) 🔴

**File da modificare:**
- `lib/authHelper.js` - Aggiungere funzione savePendingOperation
- `app/login/page.jsx` - Aggiungere recovery dopo login
- `app/gestione-formazione/page.jsx` - Salvare stato prima di chiamate API

**Pattern:**
```javascript
// Prima di chiamata API rischiosa
savePendingOperation('uploadPlayer', {
  extractedData,
  selectedSlot,
  timestamp: Date.now()
});

// Dopo login
useEffect(() => {
  const pending = getPendingOperation();
  if (pending && Date.now() - pending.timestamp < 3600000) {
    showRecoveryModal(pending);
  }
}, []);
```

---

### Task 4: Blocco Doppi Click (RC-004) 🔴

**File:**
- `app/match/new/page.jsx` - Handler salvataggio
- `app/gestione-formazione/page.jsx` - Handler upload/salvataggio

**Pattern:**
```javascript
const [isProcessing, setIsProcessing] = useState(false);

const handleSave = async () => {
  if (isProcessing) return; // Blocca doppio click
  
  setIsProcessing(true);
  try {
    // ... operazione
  } finally {
    setIsProcessing(false);
  }
};

// UI
<Button disabled={isProcessing}>
  {isProcessing ? 'Salvataggio...' : 'Salva'}
</Button>
```

---

### Task 5: Integrazione Error Helper (RC-005) 🟡

**File da modificare:**
- Tutti i componenti che mostrano errori (`showToast(error.message)`)

**Pattern:**
```javascript
import { showUserFriendlyError } from '@/lib/errorHelper';

// ❌ Prima
} catch (error) {
  showToast(error.message, 'error');
}

// ✅ Dopo
} catch (error) {
  const { shouldRedirect } = showUserFriendlyError(showToast, error);
  if (shouldRedirect) {
    router.push('/login');
  }
}
```

---

## 🕐 TEMPISTICHE STIMATE

| Task | Tempo stimato | Dipendenze |
|------|---------------|------------|
| RC-001 Transazioni | 45 min | Cursor + Supabase |
| RC-002 window.confirm | 60 min | Cursor (9 sostituzioni) |
| RC-003 Recovery | 90 min | Cursor (modifiche multiple) |
| RC-004 Doppi click | 30 min | Cursor (4 file) |
| RC-005 Error helper | 45 min | Cursor (integrazione) |
| **TOTALE** | **~5.5 ore** | **Cursor** |

---

## 📞 CONTATTI

- **Kimi AI:** Ha completato analisi e fix sicuri
- **Cursor:** Responsabile fix transazioni e refactoring
- **Team:** Review e testing

---

**Prossima milestone:** Completamento issue critiche (RC-001 → RC-005)  
**Data target:** [Da definire]  
**Bloccante per go-live:** Sì
