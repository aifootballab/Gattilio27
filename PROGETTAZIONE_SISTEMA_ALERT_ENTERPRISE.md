# 🏢 Progettazione Sistema Alert Enterprise – 2026-01-28

**Obiettivo**: Creare sistema alert unificato, semplificato e enterprise-grade senza rompere codice esistente.

**Principi**:
- ✅ Retrocompatibilità totale
- ✅ Coerenza con pattern esistenti
- ✅ Graduale migrazione
- ✅ Nessun breaking change

---

## 📐 Analisi Pattern Esistenti

### Pattern Modal Esistenti:
- **MissingDataModal**: z-index 10000, overlay rgba(0,0,0,0.7), border-radius 12px
- **PositionSelectionModal**: Stesso pattern
- **Stile coerente**: Background var(--bg-primary), border var(--border-color)

### Pattern Toast Esistente:
- **Posizione**: Fixed top-right (top: 20px, right: 20px)
- **z-index**: 10000
- **Auto-dismiss**: 4 secondi
- **Stile**: Success (verde) / Error (rosso), backdrop-filter blur

### Pattern Error Inline (login):
- **Banner inline** con AlertCircle icon
- **Colori**: Error (rosso rgba), Success (verde rgba)
- **Stile**: Padding 12px, border-radius 8px

---

## 🎯 Sistema Proposto

### 1. **Componente Alert Unificato** (`components/Alert.jsx`)

**Tipi supportati**:
- `toast` - Toast temporaneo (top-right, auto-dismiss)
- `banner` - Banner persistente (top page, no dismiss)
- `inline` - Banner inline nel contenuto

**Varianti**:
- `info` - Info blu
- `success` - Successo verde
- `warning` - Warning arancione
- `error` - Errore rosso

**API**:
```jsx
<Alert 
  type="toast" // o "banner" o "inline"
  variant="error" // o "success", "warning", "info"
  message="Messaggio specifico"
  details="Dettagli opzionali"
  actions={[
    { label: "Riprova", onClick: handleRetry },
    { label: "Annulla", onClick: handleCancel }
  ]}
  onDismiss={handleDismiss}
  autoDismiss={4000} // ms, solo per toast
/>
```

**Retrocompatibilità**:
- Se usato come toast, mantiene stesso comportamento attuale
- Se usato come banner/inline, nuovo comportamento

---

### 2. **Componente ConfirmModal** (`components/ConfirmModal.jsx`)

**Sostituisce**: Tutti i `window.confirm()`

**Pattern coerente** con MissingDataModal/PositionSelectionModal:
- Stesso z-index (10000)
- Stesso overlay (rgba(0,0,0,0.7))
- Stesso stile card

**API**:
```jsx
<ConfirmModal
  show={showConfirm}
  title="Conferma Azione"
  message="Messaggio principale"
  details="Dettagli opzionali"
  confirmLabel="Conferma"
  cancelLabel="Annulla"
  variant="warning" // o "error", "info"
  onConfirm={handleConfirm}
  onCancel={handleCancel}
/>
```

**Vantaggi**:
- ✅ Stile coerente con altri modal
- ✅ Messaggi strutturati (title + message + details)
- ✅ Supporto traduzioni completo
- ✅ Accessibilità migliore

---

### 3. **Helper Centralizzato** (`lib/alertHelper.js`)

**API unificata**:
```javascript
import { showAlert, showConfirm } from '@/lib/alertHelper'

// Toast semplice (retrocompatibile con showToast)
showAlert('Messaggio successo', 'success', { type: 'toast' })

// Toast con dettagli
showAlert('Errore caricamento', 'error', {
  type: 'toast',
  details: 'Errore caricamento giocatori. Verifica connessione.',
  actions: [{ label: 'Riprova', onClick: handleRetry }]
})

// Banner persistente
showAlert('Warning importante', 'warning', { 
  type: 'banner',
  persistent: true 
})

// Confirm modal
showConfirm({
  title: 'Conferma Eliminazione',
  message: 'Sei sicuro di voler eliminare questo giocatore?',
  details: 'Questa azione non può essere annullata.',
  variant: 'error',
  onConfirm: handleDelete,
  onCancel: handleCancel
})
```

**Retrocompatibilità**:
- `showToast()` esistente continua a funzionare
- Nuovo `showAlert()` può essere usato gradualmente
- Nessun breaking change

---

## 🔄 Piano Migrazione Graduale

### FASE 1: Creare Componenti (Nessun Breaking Change)
1. ✅ Creare `components/Alert.jsx` - Componente unificato
2. ✅ Creare `components/ConfirmModal.jsx` - Sostituisce window.confirm()
3. ✅ Creare `lib/alertHelper.js` - Helper centralizzato
4. ✅ Testare componenti isolatamente

### FASE 2: Migrare Punti Critici (Retrocompatibile)
1. ✅ Sostituire `window.confirm()` duplicati con `ConfirmModal`
2. ✅ Migliorare messaggi errori generici con `showAlert()` specifico
3. ✅ Aggiungere feedback progressivo durante estrazione
4. ✅ Testare ogni migrazione singolarmente

### FASE 3: Miglioramenti (Opzionale)
1. ✅ Renderizzare `error` state se presente
2. ✅ Migliorare loading state con progresso
3. ✅ Aggiungere suggerimenti a tutti gli errori

---

## 🎨 Design Coerente

### Colori (coerenti con tema esistente):
- **Success**: `rgba(34, 197, 94, 0.95)` / `#22c55e`
- **Error**: `rgba(239, 68, 68, 0.95)` / `#ef4444`
- **Warning**: `rgba(251, 191, 36, 0.95)` / `#fbbf24`
- **Info**: `rgba(0, 212, 255, 0.95)` / `var(--neon-blue)`

### Stile (coerente con modal esistenti):
- **Border-radius**: 12px (modal), 8px (toast/banner)
- **Padding**: 24px (modal), 16px (toast/banner)
- **Shadow**: `0 8px 32px rgba(0, 0, 0, 0.5)` (modal), `0 8px 24px rgba(0, 0, 0, 0.4)` (toast)
- **Backdrop**: `backdrop-filter: blur(8px)` (toast)

### Icone (coerenti con lucide-react):
- **Success**: `CheckCircle2`
- **Error**: `AlertCircle`
- **Warning**: `AlertTriangle`
- **Info**: `Info`

---

## 📝 Esempi Migrazione

### Esempio 1: window.confirm() → ConfirmModal

**Prima**:
```javascript
const confirmMsg = t('duplicateInFormationAlert')
  .replace('${playerName}', playerData.player_name)
  .replace('${playerAge}', playerAgeStr)
  .replace('${slotIndex}', duplicatePlayer.slot_index)
if (!window.confirm(confirmMsg)) {
  return
}
```

**Dopo**:
```javascript
const { showConfirm } = useAlert() // Hook o import diretto
showConfirm({
  title: t('duplicatePlayerTitle'),
  message: t('duplicateInFormationMessage', {
    playerName: playerData.player_name,
    playerAge: playerAgeStr,
    slotIndex: duplicatePlayer.slot_index
  }),
  variant: 'warning',
  onConfirm: () => {
    // Procedi con sostituzione
  },
  onCancel: () => {
    setUploadingPlayer(false)
  }
})
```

### Esempio 2: Errore generico → Errore specifico

**Prima**:
```javascript
catch (err) {
  showToast(err.message || 'Errore caricamento dati', 'error')
}
```

**Dopo**:
```javascript
catch (err) {
  // Identifica tipo errore
  if (err.message.includes('network') || err.message.includes('fetch')) {
    showAlert(t('errorNetwork'), 'error', {
      type: 'toast',
      details: t('errorNetworkDetails'),
      actions: [{ label: t('retry'), onClick: () => fetchData() }]
    })
  } else if (err.message.includes('session')) {
    showAlert(t('errorSession'), 'error', {
      type: 'toast',
      details: t('errorSessionDetails')
    })
  } else {
    // Fallback generico (retrocompatibile)
    showAlert(err.message || t('errorGeneric'), 'error', { type: 'toast' })
  }
}
```

### Esempio 3: Loading generico → Progressivo

**Prima**:
```javascript
setUploadingPlayer(true)
// ... estrazione ...
setUploadingPlayer(false)
```

**Dopo**:
```javascript
setUploadingPlayer(true)
setProgress({ current: 0, total: uploadImages.length, message: t('extractingPhotos') })

for (let i = 0; i < uploadImages.length; i++) {
  setProgress({ 
    current: i + 1, 
    total: uploadImages.length, 
    message: t('extractingPhoto', { current: i + 1, total: uploadImages.length })
  })
  // ... estrazione ...
}
setUploadingPlayer(false)
```

---

## 🛡️ Garanzie Enterprise

### 1. **Retrocompatibilità**
- ✅ `showToast()` esistente continua a funzionare
- ✅ `window.confirm()` può coesistere durante migrazione
- ✅ Nessun breaking change

### 2. **Coerenza**
- ✅ Stesso pattern dei modal esistenti
- ✅ Stessi colori e stili
- ✅ Stesse icone (lucide-react)

### 3. **Robustezza**
- ✅ Gestione errori completa
- ✅ Fallback per traduzioni mancanti
- ✅ Validazione input

### 4. **Testabilità**
- ✅ Componenti isolati e testabili
- ✅ Helper con logica separata
- ✅ Mockable per test

### 5. **Accessibilità**
- ✅ ARIA labels
- ✅ Keyboard navigation
- ✅ Focus management

---

## 📊 Struttura File

```
components/
  Alert.jsx              # Componente alert unificato
  ConfirmModal.jsx       # Modal conferma (sostituisce window.confirm)
  
lib/
  alertHelper.js         # Helper centralizzato per gestione alert
  useAlert.js            # Hook React (opzionale, per comodità)
```

---

## 🚀 Implementazione Incrementale

### Step 1: Creare Componenti Base
- ✅ Alert.jsx (toast + banner + inline)
- ✅ ConfirmModal.jsx (modal conferma)
- ✅ alertHelper.js (helper centralizzato)

### Step 2: Integrare senza Rompere
- ✅ Alert può essere usato parallelamente a toast esistente
- ✅ ConfirmModal può essere usato parallelamente a window.confirm()
- ✅ Nessuna modifica al codice esistente

### Step 3: Migrare Gradualmente
- ✅ Un punto alla volta
- ✅ Test dopo ogni migrazione
- ✅ Rollback facile se problemi

---

**Status**: 🟡 PROGETTAZIONE COMPLETATA - PRONTO PER IMPLEMENTAZIONE

**Prossimo step**: Implementare componenti base mantenendo retrocompatibilità totale
