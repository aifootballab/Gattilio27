# 🔒 Protocollo Sicurezza Modifiche Codice Critico

## Contesto
File critici da non rompere:
- `app/gestione-formazione/page.jsx` (~4.200 righe) - Gestione rosa giocatori
- `app/allenatori/page.jsx` (~600 righe) - Gestione allenatori

**Se questi file si rompono, l'app diventa inutilizzabile.**

---

## ✅ Metodo "Feature Flag + Branch Isolato"

### Step 1: Preparazione Ambiente (Fai questo prima)

```bash
# 1. Crea tag immutabile di produzione (già fatto)
git tag backup-produzione-20260130-172500

# 2. Crea branch di lavoro isolato
git checkout -b fix/window-confirm-sicuro

# 3. Push del tag (backup permanente)
git push origin backup-produzione-20260130-172500
```

---

### Step 2: Implementazione Feature Flag

Aggiungi in cima al file (dopo gli import):

```javascript
// =====================================================
// FEATURE FLAG - Sicurezza modifiche
// =====================================================
// Imposta a true SOLO quando hai testato TUTTO su Vercel
const USE_CONFIRM_MODAL = false // << CAMBIA QUI quando sicuro
// =====================================================
```

---

### Step 3: Pattern Modifica Sicura

Per OGNI window.confirm, usa questo pattern:

#### ❌ PRIMA (pericoloso - modifica diretta):
```javascript
if (!window.confirm(errorMsg)) {
  setAssigning(false)
  return
}
```

#### ✅ DOPO (sicuro - feature flag):
```javascript
const userConfirmed = await showConfirmSafe({
  enabled: USE_CONFIRM_MODAL,
  fallback: () => window.confirm(errorMsg),  // Vecchio metodo se flag=false
  modalProps: { title, message, variant },   // Nuovo metodo se flag=true
})

if (!userConfirmed) {
  setAssigning(false)
  return
}
```

---

### Step 4: Helper showConfirmSafe

Crea questo helper IN CIMA al file (prima dei componenti):

```javascript
/**
 * Helper per conferma sicura con feature flag
 * Permette rollback istantaneo cambiando USE_CONFIRM_MODAL
 */
async function showConfirmSafe({ enabled, fallback, modalProps }) {
  if (!enabled) {
    // MODALITÀ SICURA: usa window.confirm (vecchio metodo funzionante)
    return fallback()
  }
  
  // MODALITÀ NUOVA: usa ConfirmModal (da implementare)
  // TODO: Implementare logica ConfirmModal
  console.log('[showConfirmSafe] Modalità ConfirmModal non ancora implementata, usando fallback')
  return fallback()
}
```

---

### Step 5: Modifica Graduale (una per volta)

#### 5.1 Modifica solo la PRIMA occorrenza (riga 402)

```javascript
// Riga 402 - ORIGINALE:
// if (!window.confirm(errorMsg)) {
//   setAssigning(false)
//   return
// }

// Riga 402 - NUOVA (con flag):
const confirmed = await showConfirmSafe({
  enabled: USE_CONFIRM_MODAL,
  fallback: () => window.confirm(errorMsg),
  modalProps: {
    title: t('confirmAction'),
    message: errorMsg,
    variant: 'warning'
  }
})

if (!confirmed) {
  setAssigning(false)
  return
}
```

#### 5.2 Test su Vercel

1. Commit e push del branch `fix/window-confirm-sicuro`
2. Vercel crea deploy preview
3. Testa la funzionalità:
   - Carica un giocatore duplicato
   - Verifica che appaia il confirm (vecchio stile)
   - Verifica che funzioni Annulla e Conferma

#### 5.3 Se tutto OK → abilita flag per quella funzione

```javascript
const USE_CONFIRM_MODAL_RIGA_402 = true  // Solo per questa funzione
```

#### 5.4 Se qualcosa NON va → rollback immediato

```javascript
// Cambia semplicemente:
const USE_CONFIRM_MODAL_RIGA_402 = false  // Torna al vecchio metodo
```

---

### Step 6: Rollback Emergenza (se tutto si rompe)

#### Opzione A: Rollback del flag (veloce - 10 secondi)
```javascript
const USE_CONFIRM_MODAL = false  // Tutto torna come prima
```

#### Opzione B: Revert del file (sicuro - 30 secondi)
```bash
# Ripristina file originale
git checkout backup-produzione-20260130-172500 -- app/gestione-formazione/page.jsx

# Commit del rollback
git commit -m "rollback: ripristino gestione-formazione originale"

# Push
git push origin fix/window-confirm-sicuro
```

#### Opzione C: Eliminazione branch (nucleare - 1 minuto)
```bash
# Torna al master sicuro
git checkout master

# Elimina branch rotto
git branch -D fix/window-confirm-sicuro

# Ricrea da zero
git checkout -b fix/window-confirm-sicuro-v2
```

---

## 🧪 Test Case Obbligatori

Prima di mettere `USE_CONFIRM_MODAL = true`, testa:

### Test 1: Assegnazione giocatore duplicato
```
1. Clicca slot vuoto
2. Carica foto giocatore che esiste già in altro slot
3. Verifica che appaia confirm
4. Clicca "Annulla" → giocatore non deve essere assegnato
5. Ripeti e clicca "Conferma" → giocatore deve essere assegnato
```

### Test 2: Rimozione giocatore da slot
```
1. Clicca su giocatore assegnato
2. Prova a rimuoverlo
3. Verifica confirm e funzionamento Annulla/Conferma
```

### Test 3: Salvataggio formazione
```
1. Modifica posizioni
2. Salva
3. Verifica che i dati persistano dopo refresh
```

---

## 📋 Checklist Prima di Ogni Deploy

- [ ] Tag backup creato (`git tag`)
- [ ] Branch isolato (`fix/nome-feature`)
- [ ] Feature flag implementato
- [ ] Test case superati su Vercel preview
- [ ] Rollback testato (revert e verifica che torna tutto)
- [ ] Documentazione aggiornata

---

## ⚠️ Regola d'Oro

> **"Se non hai tempo di testare, non hai tempo di fare la modifica."**

Meglio lasciare `window.confirm` funzionante che avere un ConfirmModal rotto.

---

## 📞 Emergenze

Se in produzione qualcosa si rompe:
```bash
# Rollback immediato (2 minuti)
git checkout backup-produzione-20260130-172500
git checkout -b hotfix/rollback-urgente
git push origin hotfix/rollback-urgente
# Apri PR e merge immediato
```

---

**Backup attuale:** `backup-produzione-20260130-172500`
**Branch lavoro:** `fix/window-confirm-sicuro` (da creare)
**Feature flag:** `USE_CONFIRM_MODAL = false` (default sicuro)
