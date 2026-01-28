# 📝 Esempio Migrazione Alert Graduale – 2026-01-28

**Obiettivo**: Mostrare come migrare gradualmente senza rompere codice esistente.

**Principio**: Retrocompatibilità totale - nuovo sistema può coesistere con quello esistente.

---

## 🎯 Strategia Migrazione

### FASE 1: Integrare Provider (Nessun Breaking Change)

**File**: `app/layout.tsx`

```tsx
import { AlertProvider } from '@/lib/useAlert'

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>
        <LanguageProviderWrapper>
          <AlertProvider> {/* NUOVO: Aggiunto */}
            <div className="custom-background" />
            {children}
            <GuideTour />
            <AssistantChat />
          </AlertProvider> {/* NUOVO: Chiuso */}
        </LanguageProviderWrapper>
      </body>
    </html>
  )
}
```

**Risultato**: ✅ Nessun breaking change, sistema esistente continua a funzionare.

---

### FASE 2: Migrare window.confirm() Gradualmente

#### Esempio 1: Duplicato in Formazione

**PRIMA** (linea 915-919):
```javascript
const confirmMsg = t('duplicateInFormationAlert')
  .replace('${playerName}', playerData.player_name)
  .replace('${playerAge}', playerAgeStr)
  .replace('${slotIndex}', duplicatePlayer.slot_index)
if (!window.confirm(confirmMsg)) {
  setUploadingPlayer(false)
  return
}
// ... procedi con sostituzione
```

**DOPO** (migrazione graduale):
```javascript
import { useAlert } from '@/lib/useAlert'

// Nel componente:
const { showConfirm } = useAlert()

// Sostituisci window.confirm():
showConfirm({
  title: t('duplicatePlayerTitle') || 'Giocatore Duplicato',
  message: t('duplicateInFormationMessage', {
    playerName: playerData.player_name,
    playerAge: playerAgeStr,
    slotIndex: duplicatePlayer.slot_index
  }) || `Il giocatore "${playerData.player_name}"${playerAgeStr} è già presente in formazione nello slot ${duplicatePlayer.slot_index}.`,
  details: t('duplicateInFormationDetails') || 'Vuoi sostituirlo con i nuovi dati?',
  variant: 'warning',
  confirmVariant: 'primary',
  confirmLabel: t('replace') || 'Sostituisci',
  cancelLabel: t('cancel') || 'Annulla',
  onConfirm: () => {
    // Procedi con sostituzione (codice esistente)
    // ... 
  },
  onCancel: () => {
    setUploadingPlayer(false)
  }
})
```

**Vantaggi**:
- ✅ Messaggio strutturato (title + message + details)
- ✅ Stile coerente con altri modal
- ✅ Supporto traduzioni completo
- ✅ Nessun breaking change (codice esistente continua a funzionare)

---

#### Esempio 2: Dati Opzionali Mancanti

**PRIMA** (linea 861-863):
```javascript
const optionalFields = missing.optional.map(m => m.label).join(', ')
const shouldContinue = window.confirm(
  `${t('missingOptionalData') || 'Alcuni dati opzionali non sono stati estratti'}: ${optionalFields}.\n\n${t('continueWithoutOptionalData') || 'Vuoi continuare comunque? Puoi aggiungerli dopo.'}`
)
if (!shouldContinue) {
  setMissingData(missing)
  setExtractedPlayerData({...})
  setShowMissingDataModal(true)
  setUploadingPlayer(false)
  return
}
```

**DOPO** (migrazione graduale):
```javascript
import { useAlert } from '@/lib/useAlert'

const { showConfirm } = useAlert()

// Sostituisci window.confirm() con modal più chiaro:
showConfirm({
  title: t('missingOptionalDataTitle') || 'Dati Opzionali Mancanti',
  message: t('missingOptionalDataMessage', { fields: optionalFields }) 
    || `Alcuni dati opzionali non sono stati estratti: ${optionalFields}.`,
  details: t('missingOptionalDataDetails') 
    || 'Puoi aggiungerli dopo. Vuoi continuare comunque?',
  variant: 'info',
  confirmLabel: t('continue') || 'Continua',
  cancelLabel: t('addNow') || 'Aggiungi Ora',
  onConfirm: () => {
    // Procedi (codice esistente)
  },
  onCancel: () => {
    // Mostra modal (codice esistente)
    setMissingData(missing)
    setExtractedPlayerData({...})
    setShowMissingDataModal(true)
    setUploadingPlayer(false)
  }
})
```

**Vantaggi**:
- ✅ Elimina doppio flusso (confirm → modal)
- ✅ Messaggio più chiaro e strutturato
- ✅ Bottoni più chiari ("Continua" vs "Aggiungi Ora")

---

### FASE 3: Migliorare Messaggi Errore

#### Esempio: Errore Caricamento Dati

**PRIMA** (linea 165):
```javascript
catch (err) {
  console.error('[GestioneFormazione] Error:', err)
  setError(err.message || 'Errore caricamento dati')
}
```

**DOPO** (migrazione graduale):
```javascript
import { useAlert, createErrorAlert } from '@/lib/alertHelper'

const { showAlert } = useAlert()

catch (err) {
  console.error('[GestioneFormazione] Error:', err)
  
  // Usa helper per creare alert specifico
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
  showAlert(alertConfig.message, alertConfig.variant, {
    type: 'toast',
    details: alertConfig.details,
    actions: alertConfig.actions,
    autoDismiss: alertConfig.autoDismiss,
    persistent: alertConfig.persistent
  })
  
  // Mantieni error state per retrocompatibilità (se necessario)
  setError(alertConfig.message)
}
```

**Vantaggi**:
- ✅ Messaggio specifico invece di generico
- ✅ Suggerimenti chiari
- ✅ Azione "Riprova" disponibile
- ✅ Retrocompatibile (error state mantenuto)

---

### FASE 4: Aggiungere Feedback Progressivo

#### Esempio: Estrazione Foto Multiple

**PRIMA** (linea 722-817):
```javascript
setUploadingPlayer(true)
// ... loop estrazione senza feedback ...
setUploadingPlayer(false)
```

**DOPO** (migrazione graduale):
```javascript
import { useAlert } from '@/lib/useAlert'

const { showAlert } = useAlert()
const [progress, setProgress] = React.useState(null)

setUploadingPlayer(true)

// Mostra progresso durante estrazione
for (let i = 0; i < uploadImages.length; i++) {
  setProgress({
    current: i + 1,
    total: uploadImages.length,
    message: t('extractingPhoto', { 
      current: i + 1, 
      total: uploadImages.length 
    }) || `Estrazione foto ${i + 1}/${uploadImages.length}...`
  })
  
  // ... estrazione ...
}

setUploadingPlayer(false)
setProgress(null)

// Render progresso (opzionale, può essere banner o inline)
{progress && (
  <Alert
    type="banner"
    variant="info"
    message={progress.message}
    persistent={true}
  />
)}
```

**Vantaggi**:
- ✅ Utente sa cosa sta succedendo
- ✅ Feedback progressivo chiaro
- ✅ Non blocca il flusso

---

## 🔄 Coesistenza Sistema Vecchio/Nuovo

### Durante Migrazione:

1. **Toast esistente continua a funzionare**:
   ```javascript
   // Sistema vecchio (continua a funzionare)
   showToast(t('photoUploadedSuccessfully'), 'success')
   
   // Sistema nuovo (può essere usato parallelamente)
   const { showAlert } = useAlert()
   showAlert(t('photoUploadedSuccessfully'), 'success', { type: 'toast' })
   ```

2. **window.confirm() può coesistere**:
   ```javascript
   // Vecchio (funziona ancora)
   if (window.confirm('Conferma?')) { ... }
   
   // Nuovo (può essere usato parallelamente)
   showConfirm({ message: 'Conferma?', onConfirm: () => { ... } })
   ```

3. **Error state può essere renderizzato**:
   ```javascript
   // Vecchio (continua a funzionare)
   setError('Errore')
   
   // Nuovo (può essere aggiunto)
   const { showAlert } = useAlert()
   showAlert('Errore', 'error', { type: 'banner' })
   ```

---

## ✅ Checklist Migrazione

### Per ogni punto critico:

1. ✅ **Identifica punto da migrare** (es. window.confirm linea 915)
2. ✅ **Crea traduzioni** (se mancanti) in `lib/i18n.js`
3. ✅ **Sostituisci con nuovo sistema** mantenendo logica esistente
4. ✅ **Testa funzionalità** (non deve rompere nulla)
5. ✅ **Verifica coerenza** con altri alert/modal
6. ✅ **Documenta cambiamento** (commento nel codice)

---

## 🎯 Priorità Migrazione

### 🔴 ALTA (da fare subito):
1. **window.confirm() duplicati** (6-8 punti) → ConfirmModal
2. **Errori generici** (5-6 punti) → Alert specifici con suggerimenti

### 🟡 MEDIA (da fare dopo):
3. **Feedback progressivo** durante estrazione
4. **Renderizzare error state** se presente

### 🟢 BASSA (nice to have):
5. **Migliorare loading state** con progresso
6. **Aggiungere suggerimenti** a tutti gli errori

---

**Status**: 🟢 ESEMPI PRONTI - PRONTO PER MIGRAZIONE GRADUALE

**Nota**: Ogni migrazione può essere fatta indipendentemente senza rompere nulla.
