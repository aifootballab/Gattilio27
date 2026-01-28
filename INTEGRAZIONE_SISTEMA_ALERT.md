# ✅ Integrazione Sistema Alert Enterprise – 2026-01-28

**Status**: 🟢 COMPONENTI CREATI - PRONTO PER INTEGRAZIONE GRADUALE

**Principio**: Retrocompatibilità totale - nessun breaking change.

---

## 📦 Componenti Creati

### 1. ✅ `components/Alert.jsx`
- Componente alert unificato (toast, banner, inline)
- Varianti: info, success, warning, error
- Coerente con pattern esistenti (stesso z-index, stili, colori)

### 2. ✅ `components/ConfirmModal.jsx`
- Modal conferma custom (sostituisce window.confirm())
- Pattern coerente con MissingDataModal/PositionSelectionModal
- Stesso z-index (10000), stesso overlay, stesso stile

### 3. ✅ `lib/alertHelper.js`
- Helper centralizzato per creare alert
- Funzioni: `showAlert()`, `showConfirm()`, `createErrorAlert()`, `createSuccessAlert()`, `createWarningAlert()`

### 4. ✅ `lib/useAlert.js`
- Hook React per gestione alert
- Provider: `AlertProvider`
- Hook: `useAlert()`

---

## 🔄 Integrazione nel Layout (Opzionale)

**File**: `app/layout.tsx`

```tsx
import { AlertProvider } from '@/lib/useAlert'

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>
        <LanguageProviderWrapper>
          <AlertProvider> {/* OPZIONALE: Aggiungi se vuoi usare hook useAlert() */}
            <div className="custom-background" />
            {children}
            <GuideTour />
            <AssistantChat />
          </AlertProvider>
        </LanguageProviderWrapper>
      </body>
    </html>
  )
}
```

**Nota**: Se NON aggiungi AlertProvider, i componenti possono essere usati direttamente senza hook.

---

## 🎯 Uso Diretto (Senza Provider)

### Esempio 1: Usare Alert direttamente

```jsx
import Alert from '@/components/Alert'

// Nel componente:
const [showError, setShowError] = React.useState(false)

{showError && (
  <Alert
    type="toast"
    variant="error"
    message="Errore caricamento giocatori"
    details="Verifica la connessione e riprova."
    actions={[
      { label: 'Riprova', onClick: () => fetchData() }
    ]}
    onDismiss={() => setShowError(false)}
    autoDismiss={8000}
  />
)}
```

### Esempio 2: Usare ConfirmModal direttamente

```jsx
import ConfirmModal from '@/components/ConfirmModal'

// Nel componente:
const [showConfirm, setShowConfirm] = React.useState(false)

<ConfirmModal
  show={showConfirm}
  title="Conferma Eliminazione"
  message="Sei sicuro di voler eliminare questo giocatore?"
  details="Questa azione non può essere annullata."
  variant="error"
  confirmVariant="danger"
  confirmLabel="Elimina"
  cancelLabel="Annulla"
  onConfirm={() => {
    // Elimina giocatore
    handleDelete()
    setShowConfirm(false)
  }}
  onCancel={() => setShowConfirm(false)}
/>
```

---

## 🔄 Migrazione Graduale window.confirm()

### Esempio: Duplicato in Formazione

**PRIMA** (linea 915-919 in `app/gestione-formazione/page.jsx`):
```javascript
const confirmMsg = t('duplicateInFormationAlert')
  .replace('${playerName}', playerData.player_name)
  .replace('${playerAge}', playerAgeStr)
  .replace('${slotIndex}', duplicatePlayer.slot_index)
if (!window.confirm(confirmMsg)) {
  setUploadingPlayer(false)
  return
}
```

**DOPO** (migrazione senza rompere):
```javascript
import ConfirmModal from '@/components/ConfirmModal'

// Aggiungi stato nel componente:
const [showDuplicateConfirm, setShowDuplicateConfirm] = React.useState(false)
const [duplicateConfirmData, setDuplicateConfirmData] = React.useState(null)

// Sostituisci window.confirm():
if (duplicatePlayer) {
  setDuplicateConfirmData({
    playerName: playerData.player_name,
    playerAge: playerAgeStr,
    slotIndex: duplicatePlayer.slot_index
  })
  setShowDuplicateConfirm(true)
  return // Non procedere finché non confermato
}

// Aggiungi modal nel JSX (dopo toast esistente):
<ConfirmModal
  show={showDuplicateConfirm}
  title={t('duplicatePlayerTitle') || 'Giocatore Duplicato'}
  message={t('duplicateInFormationMessage', duplicateConfirmData) 
    || `Il giocatore "${duplicateConfirmData?.playerName}"${duplicateConfirmData?.playerAge} è già presente in formazione nello slot ${duplicateConfirmData?.slotIndex}.`}
  details={t('duplicateInFormationDetails') || 'Vuoi sostituirlo con i nuovi dati?'}
  variant="warning"
  confirmLabel={t('replace') || 'Sostituisci'}
  cancelLabel={t('cancel') || 'Annulla'}
  onConfirm={() => {
    setShowDuplicateConfirm(false)
    // Procedi con sostituzione (codice esistente)
    // ...
  }}
  onCancel={() => {
    setShowDuplicateConfirm(false)
    setUploadingPlayer(false)
  }}
/>
```

**Vantaggi**:
- ✅ Nessun breaking change (codice esistente continua a funzionare)
- ✅ Messaggio più chiaro e strutturato
- ✅ Stile coerente con altri modal
- ✅ Supporto traduzioni completo

---

## 🔄 Migliorare Messaggi Errore

### Esempio: Errore Caricamento Dati

**PRIMA** (linea 165):
```javascript
catch (err) {
  setError(err.message || 'Errore caricamento dati')
}
```

**DOPO** (migrazione senza rompere):
```javascript
import Alert from '@/components/Alert'
import { createErrorAlert } from '@/lib/alertHelper'

// Aggiungi stato:
const [errorAlert, setErrorAlert] = React.useState(null)

catch (err) {
  // Crea alert specifico
  const alertConfig = createErrorAlert(err, {
    operation: 'caricamento dati',
    suggestions: [
      'Verifica la connessione internet',
      'Ricarica la pagina',
      'Controlla che tutti i servizi siano online'
    ],
    retryAction: () => fetchData()
  })
  
  // Mostra alert
  setErrorAlert(alertConfig)
  
  // Mantieni error state per retrocompatibilità
  setError(alertConfig.message)
}

// Aggiungi nel JSX:
{errorAlert && (
  <Alert
    type="toast"
    variant={errorAlert.variant}
    message={errorAlert.message}
    details={errorAlert.details}
    actions={errorAlert.actions}
    onDismiss={() => setErrorAlert(null)}
    autoDismiss={errorAlert.autoDismiss}
    persistent={errorAlert.persistent}
  />
)}
```

---

## ✅ Checklist Integrazione

### Per ogni punto da migrare:

1. ✅ **Importa componente** (Alert o ConfirmModal)
2. ✅ **Aggiungi stato** per controllare visibilità
3. ✅ **Sostituisci window.confirm()** o migliora messaggio errore
4. ✅ **Aggiungi componente nel JSX**
5. ✅ **Testa funzionalità** (non deve rompere nulla)
6. ✅ **Verifica coerenza** con altri alert/modal

---

## 🛡️ Garanzie Enterprise

### Retrocompatibilità:
- ✅ `showToast()` esistente continua a funzionare
- ✅ `window.confirm()` può coesistere durante migrazione
- ✅ `error` state può essere mantenuto per retrocompatibilità
- ✅ Nessun breaking change

### Coerenza:
- ✅ Stesso pattern dei modal esistenti
- ✅ Stessi colori e stili (var(--neon-blue), etc.)
- ✅ Stesse icone (lucide-react)
- ✅ Stesso z-index (10000)

### Robustezza:
- ✅ Gestione errori completa
- ✅ Fallback per traduzioni mancanti
- ✅ Validazione input
- ✅ Accessibilità (ARIA labels)

---

## 📊 Priorità Migrazione

### 🔴 ALTA (da fare subito):
1. **window.confirm() duplicati** (6-8 punti) → ConfirmModal
2. **Errori generici** (5-6 punti) → Alert specifici

### 🟡 MEDIA (da fare dopo):
3. **Feedback progressivo** durante estrazione
4. **Renderizzare error state** se presente

---

**Status**: 🟢 PRONTO PER MIGRAZIONE GRADUALE

**Nota**: Ogni migrazione può essere fatta indipendentemente senza rompere nulla.
