# 📋 PIANO IMPLEMENTAZIONE: Drag & Drop Giocatori

**Data**: 24 Gennaio 2026  
**File Principale**: `app/gestione-formazione/page.jsx`  
**Backup**: `app/gestione-formazione/page.jsx.backup-20260124-113721.bak` ✅

---

## ✅ PRE-IMPLEMENTAZIONE: VERIFICHE COMPLETATE

### 1. Backup Creato ✅
- **File**: `app/gestione-formazione/page.jsx.backup-20260124-113721.bak`
- **Dimensione**: Verificata
- **Data**: 24 Gennaio 2026, 11:37:21

### 2. Analisi Codice Esistente ✅

**Funzioni che NON verranno modificate**:
- ✅ `fetchData()` - Caricamento dati (righe ~38-158)
- ✅ `handleSelectManualFormation()` - Salvataggio formazione (righe ~842-891)
- ✅ `handleAssignFromReserve()` - Assegnazione giocatori
- ✅ `handleRemoveFromSlot()` - Rimozione giocatori
- ✅ `calculateCardOffsets()` - Calcolo offset collisioni (righe ~1130-1177)
- ✅ Endpoint API `/api/supabase/save-formation-layout` - Backend invariato

**Strutture dati che NON verranno modificate**:
- ✅ `layout.slot_positions` - Formato: `{ slot_index: { x, y, position } }`
- ✅ `titolari` - Array giocatori con slot_index 0-10
- ✅ `riserve` - Array giocatori con slot_index NULL

---

## 📝 MODIFICHE DA IMPLEMENTARE

### 1. Aggiungere State (righe ~35-36, dopo `savingTacticalSettings`)

```javascript
const [isEditMode, setIsEditMode] = React.useState(false)
const [customPositions, setCustomPositions] = React.useState({}) // { slot_index: { x, y } }
```

**Posizione**: Dopo riga ~35 (`const [savingTacticalSettings, setSavingTacticalSettings] = React.useState(false)`)

---

### 2. Aggiungere Handler `handlePositionChange` (dopo `handleSlotClick`, riga ~196)

```javascript
const handlePositionChange = (slotIndex, newPosition) => {
  setCustomPositions(prev => ({
    ...prev,
    [slotIndex]: newPosition
  }))
}
```

**Posizione**: Dopo `handleSlotClick` (riga ~190-196)

---

### 3. Aggiungere Handler `handleSaveCustomPositions` (dopo `handleSelectManualFormation`, riga ~891)

```javascript
const handleSaveCustomPositions = async () => {
  if (!layout || Object.keys(customPositions).length === 0) {
    setIsEditMode(false)
    setCustomPositions({})
    return
  }
  
  setUploadingFormation(true)
  setError(null)
  
  try {
    // Merge posizioni personalizzate con slot_positions esistenti
    const updatedSlotPositions = { ...layout.slot_positions }
    
    Object.entries(customPositions).forEach(([slotIndex, position]) => {
      const slotIdx = Number(slotIndex)
      if (updatedSlotPositions[slotIdx]) {
        updatedSlotPositions[slotIdx] = {
          ...updatedSlotPositions[slotIdx],
          x: position.x,
          y: position.y
        }
      }
    })
    
    // Usa funzione esistente per salvare (NON MODIFICATA)
    await handleSelectManualFormation(
      layout.formation || 'Personalizzato',
      updatedSlotPositions
    )
    
    setIsEditMode(false)
    setCustomPositions({})
    showToast(t('positionsSavedSuccessfully') || 'Posizioni salvate con successo', 'success')
  } catch (err) {
    console.error('[GestioneFormazione] Save custom positions error:', err)
    setError(err.message || 'Errore salvataggio posizioni')
    showToast(err.message || t('errorSavingPositions') || 'Errore salvataggio posizioni', 'error')
  } finally {
    setUploadingFormation(false)
  }
}
```

**Posizione**: Dopo `handleSelectManualFormation` (riga ~891)

---

### 4. Aggiungere Pulsante "Personalizza Posizioni" (dopo pulsante "Cambia Formazione", riga ~1266)

**Posizione**: Dopo il pulsante "Cambia Formazione" (riga ~1265-1270)

```jsx
{layout?.formation && (
  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
    <button
      onClick={() => setShowFormationSelectorModal(true)}
      className="btn"
      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
    >
      <Settings size={16} />
      {t('changeFormation')}
    </button>
    
    {/* NUOVO PULSANTE */}
    <button
      onClick={() => {
        if (isEditMode) {
          handleSaveCustomPositions()
        } else {
          setIsEditMode(true)
        }
      }}
      className="btn"
      disabled={uploadingFormation}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        background: isEditMode ? 'rgba(34, 197, 94, 0.2)' : 'rgba(0, 212, 255, 0.1)',
        borderColor: isEditMode ? 'var(--neon-green)' : 'var(--neon-blue)',
        opacity: uploadingFormation ? 0.5 : 1,
        cursor: uploadingFormation ? 'not-allowed' : 'pointer'
      }}
    >
      {isEditMode ? (
        <>
          <Check size={16} />
          {t('saveChanges') || 'Salva Modifiche'}
        </>
      ) : (
        <>
          <Edit size={16} />
          {t('customizePositions') || 'Personalizza Posizioni'}
        </>
      )}
    </button>
    
    {isEditMode && (
      <button
        onClick={() => {
          setIsEditMode(false)
          setCustomPositions({})
          showToast(t('changesCancelled') || 'Modifiche annullate', 'success')
        }}
        className="btn"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(239, 68, 68, 0.1)',
          borderColor: '#ef4444'
        }}
      >
        <X size={16} />
        {t('cancel') || 'Annulla'}
      </button>
    )}
  </div>
)}
```

**Nota**: Modificare il wrapper del pulsante esistente per includere il nuovo pulsante.

---

### 5. Aggiungere Indicatore Modalità Edit (dopo pulsanti, prima del campo, riga ~1380)

```jsx
{/* Indicatore Modalità Edit */}
{isEditMode && (
  <div style={{
    padding: '12px 16px',
    background: 'rgba(251, 191, 36, 0.1)',
    border: '1px solid rgba(251, 191, 36, 0.3)',
    borderRadius: '8px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    maxWidth: 'clamp(540px, 45vw, 720px)',
    margin: '0 auto 16px auto'
  }}>
    <Info size={16} color="#fbbf24" />
    <span style={{ fontSize: '14px', color: '#fbbf24' }}>
      {t('editModeActive') || 'Modalità personalizzazione attiva: trascina i giocatori per spostarli'}
    </span>
  </div>
)}
```

**Posizione**: Prima del campo 2D (riga ~1380, prima di `{/* Campo 2D */}`)

---

### 6. Modificare `SlotCard` Component (righe ~1901-2001)

**Aggiungere props**:
```javascript
function SlotCard({ slot, onClick, onRemove, isEditMode = false, onPositionChange }) {
```

**Aggiungere state interno**:
```javascript
const [isDragging, setIsDragging] = React.useState(false)
const [dragStart, setDragStart] = React.useState(null)
const [currentOffset, setCurrentOffset] = React.useState({ x: 0, y: 0 })
```

**Aggiungere handler drag & drop** (prima del return):
```javascript
const handleMouseDown = (e) => {
  if (!isEditMode || !slot.player) return
  
  e.preventDefault()
  e.stopPropagation()
  
  const rect = e.currentTarget.getBoundingClientRect()
  const container = e.currentTarget.closest('[data-field-container]')
  if (!container) return
  
  const containerRect = container.getBoundingClientRect()
  const startX = e.clientX
  const startY = e.clientY
  const startPercentX = slot.position.x + (slot.offsetX || 0)
  const startPercentY = slot.position.y + (slot.offsetY || 0)
  
  setIsDragging(true)
  setDragStart({ startX, startY, startPercentX, startPercentY, containerRect })
  
  const handleMouseMove = (e) => {
    if (!dragStart) return
    
    const deltaX = e.clientX - dragStart.startX
    const deltaY = e.clientY - dragStart.startY
    
    const percentX = (deltaX / dragStart.containerRect.width) * 100
    const percentY = (deltaY / dragStart.containerRect.height) * 100
    
    const newX = Math.max(5, Math.min(95, dragStart.startPercentX + percentX))
    const newY = Math.max(5, Math.min(95, dragStart.startPercentY + percentY))
    
    setCurrentOffset({
      x: newX - dragStart.startPercentX,
      y: newY - dragStart.startPercentY
    })
  }
  
  const handleMouseUp = () => {
    if (dragStart && (currentOffset.x !== 0 || currentOffset.y !== 0)) {
      const newPosition = {
        x: dragStart.startPercentX + currentOffset.x,
        y: dragStart.startPercentY + currentOffset.y
      }
      
      if (onPositionChange) {
        onPositionChange(slot.slot_index, newPosition)
      }
    }
    
    setIsDragging(false)
    setDragStart(null)
    setCurrentOffset({ x: 0, y: 0 })
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }
  
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}
```

**Modificare onClick**:
```javascript
onClick={!isEditMode ? onClick : undefined}
```

**Modificare onMouseDown**:
```javascript
onMouseDown={isEditMode && slot.player ? handleMouseDown : undefined}
```

**Modificare stili**:
```javascript
style={{
  // ... stili esistenti
  cursor: isEditMode && slot.player ? 'move' : 'pointer',
  left: `${slot.position.x + (slot.offsetX || 0) + currentOffset.x}%`,
  top: `${slot.position.y + (slot.offsetY || 0) + currentOffset.y}%`,
  opacity: isDragging ? 0.7 : 1,
  zIndex: isDragging ? 1000 : (slot.hasNearbyCards ? 2 : 1),
  userSelect: 'none' // Previene selezione testo durante drag
}}
```

---

### 7. Modificare Render Campo (righe ~1568-1575)

**Aggiungere attributo al container campo**:
```jsx
<div 
  className="card" 
  data-field-container  // ← AGGIUNGERE
  style={{ 
    // ... stili esistenti
  }}
>
```

**Modificare render SlotCard**:
```jsx
{slots.map((slot) => (
  <SlotCard
    key={slot.slot_index}
    slot={slot}
    onClick={() => handleSlotClick(slot.slot_index)}
    onRemove={slot.player ? () => handleRemoveFromSlot(slot.player.id) : null}
    isEditMode={isEditMode}  // ← AGGIUNGERE
    onPositionChange={handlePositionChange}  // ← AGGIUNGERE
  />
))}
```

---

### 8. Verificare Import Icone (riga ~8)

**Verificare che siano presenti**:
```javascript
import { ..., Edit, Check, ... } from 'lucide-react'
```

Se non presenti, aggiungere `Edit` e `Check`.

---

### 9. Aggiungere Traduzioni i18n (opzionale, ma consigliato)

**File**: `lib/i18n.js`

**Aggiungere in `it`**:
```javascript
customizePositions: 'Personalizza Posizioni',
saveChanges: 'Salva Modifiche',
cancel: 'Annulla',
editModeActive: 'Modalità personalizzazione attiva: trascina i giocatori per spostarli',
positionsSavedSuccessfully: 'Posizioni salvate con successo',
errorSavingPositions: 'Errore salvataggio posizioni',
changesCancelled: 'Modifiche annullate'
```

**Aggiungere in `en`**:
```javascript
customizePositions: 'Customize Positions',
saveChanges: 'Save Changes',
cancel: 'Cancel',
editModeActive: 'Edit mode active: drag players to move them',
positionsSavedSuccessfully: 'Positions saved successfully',
errorSavingPositions: 'Error saving positions',
changesCancelled: 'Changes cancelled'
```

---

## 🔍 CHECKLIST IMPLEMENTAZIONE

### Pre-Implementazione
- [x] Backup creato
- [x] Documento rollback creato
- [x] Analisi codice completata
- [x] Piano implementazione creato

### Implementazione
- [ ] Aggiungere state `isEditMode`, `customPositions`
- [ ] Aggiungere handler `handlePositionChange`
- [ ] Aggiungere handler `handleSaveCustomPositions`
- [ ] Aggiungere pulsante "Personalizza Posizioni"
- [ ] Aggiungere pulsante "Annulla" (quando edit attivo)
- [ ] Aggiungere indicatore modalità edit
- [ ] Modificare `SlotCard` per drag & drop
- [ ] Aggiungere `data-field-container` al campo
- [ ] Passare props `isEditMode`, `onPositionChange` a `SlotCard`
- [ ] Verificare import icona `Edit`, `Check`
- [ ] Aggiungere traduzioni i18n (opzionale)

### Post-Implementazione
- [ ] Test drag & drop desktop
- [ ] Test salvataggio posizioni
- [ ] Test annullamento modifiche
- [ ] Test funzionalità esistenti (non devono rompersi)
- [ ] Verifica console errori
- [ ] Test su browser diversi

---

## ⚠️ ATTENZIONI

1. **Non modificare** `handleSelectManualFormation` - usa solo per salvare
2. **Non modificare** `calculateCardOffsets` - mantiene collision detection
3. **Non modificare** `fetchData` - caricamento invariato
4. **Non modificare** endpoint API - backend invariato
5. **Testare** che formazioni predefinite funzionino ancora
6. **Testare** che assegnazione giocatori funzioni ancora

---

## 🚨 IN CASO DI PROBLEMI

1. **Consultare**: `ROLLBACK_DRAG_DROP.md`
2. **Ripristinare backup**: `page.jsx.backup-20260124-113721.bak`
3. **Verificare console**: Errori JavaScript
4. **Verificare network**: Chiamate API fallite

---

**Ultimo Aggiornamento**: 24 Gennaio 2026  
**Stato**: Pronto per implementazione
