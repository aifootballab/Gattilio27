# Proposta: Drag & Drop Giocatori su Campo Esistente

**Data**: 24 Gennaio 2026  
**Obiettivo**: Aggiungere possibilità di spostare manualmente giocatori sul campo CSS esistente (senza caricare screenshot).

---

## 1. COSA CAMBIA

### ✅ Mantiene tutto esistente
- Campo CSS/SVG hardcoded (come ora)
- Formazioni predefinite (Base + Variazioni)
- Logica salvataggio esistente
- Collision detection esistente

### ➕ Aggiunge solo
- Toggle "Modalità Personalizza" (icona matita/edit)
- Drag & drop per spostare giocatori
- Salvataggio posizioni personalizzate

---

## 2. COME FUNZIONA

### Flusso utente

1. **Cliente seleziona formazione** (Base o Variazione) → giocatori posizionati
2. **Cliente clicca "Personalizza"** (icona matita) → attiva modalità edit
3. **Cliente trascina giocatore** → sposta card sul campo
4. **Sistema salva automaticamente** (o pulsante "Salva modifiche")
5. **Risultato**: Formazione personalizzata con posizioni modificate ✅

---

## 3. IMPLEMENTAZIONE

### 3.1 Toggle "Modalità Personalizza"

**Dove**: Accanto al pulsante "Cambia Formazione"

**UI**:
```jsx
<div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
  <button onClick={() => setShowFormationSelectorModal(true)}>
    Cambia Formazione
  </button>
  
  <button
    onClick={() => setIsEditMode(!isEditMode)}
    style={{
      padding: '8px 16px',
      background: isEditMode ? 'rgba(34, 197, 94, 0.2)' : 'rgba(0, 212, 255, 0.1)',
      border: `2px solid ${isEditMode ? 'var(--neon-green)' : 'var(--neon-blue)'}`,
      borderRadius: '8px',
      cursor: 'pointer'
    }}
  >
    {isEditMode ? <Check size={18} /> : <Edit size={18} />}
    {isEditMode ? 'Salva Modifiche' : 'Personalizza Posizioni'}
  </button>
</div>
```

### 3.2 Drag & Drop su SlotCard

**Modificare `SlotCard`** per supportare drag:

```javascript
function SlotCard({ slot, onClick, onRemove, isEditMode, onPositionChange }) {
  const [isDragging, setIsDragging] = React.useState(false)
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 })
  
  const handleMouseDown = (e) => {
    if (!isEditMode || !slot.player) return
    
    e.preventDefault()
    setIsDragging(true)
    
    const rect = e.currentTarget.getBoundingClientRect()
    const startX = e.clientX - rect.left
    const startY = e.clientY - rect.top
    
    const handleMouseMove = (e) => {
      const container = e.currentTarget.closest('[data-field-container]')
      if (!container) return
      
      const containerRect = container.getBoundingClientRect()
      const newX = ((e.clientX - containerRect.left) / containerRect.width) * 100
      const newY = ((e.clientY - containerRect.top) / containerRect.height) * 100
      
      // Limita dentro campo (0-100)
      const clampedX = Math.max(5, Math.min(95, newX))
      const clampedY = Math.max(5, Math.min(95, newY))
      
      setDragOffset({
        x: clampedX - slot.position.x,
        y: clampedY - slot.position.y
      })
    }
    
    const handleMouseUp = () => {
      if (dragOffset.x !== 0 || dragOffset.y !== 0) {
        // Salva nuova posizione
        onPositionChange(slot.slot_index, {
          x: slot.position.x + dragOffset.x,
          y: slot.position.y + dragOffset.y
        })
      }
      
      setIsDragging(false)
      setDragOffset({ x: 0, y: 0 })
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }
  
  return (
    <div
      onMouseDown={isEditMode && slot.player ? handleMouseDown : undefined}
      style={{
        // ... stili esistenti
        cursor: isEditMode && slot.player ? 'move' : 'pointer',
        position: 'absolute',
        left: `${slot.position.x + (slot.offsetX || 0) + dragOffset.x}%`,
        top: `${slot.position.y + (slot.offsetY || 0) + dragOffset.y}%`,
        transform: 'translate(-50%, -50%)',
        opacity: isDragging ? 0.8 : 1,
        zIndex: isDragging ? 1000 : (slot.hasNearbyCards ? 2 : 1)
      }}
    >
      {/* ... contenuto esistente */}
    </div>
  )
}
```

### 3.3 Handler salvataggio posizione

```javascript
const [customPositions, setCustomPositions] = React.useState({}) // { slot_index: { x, y } }

const handlePositionChange = (slotIndex, newPosition) => {
  setCustomPositions(prev => ({
    ...prev,
    [slotIndex]: newPosition
  }))
}

const handleSaveCustomPositions = async () => {
  // Merge posizioni personalizzate con slot_positions esistenti
  const updatedSlotPositions = { ...layout.slot_positions }
  
  Object.entries(customPositions).forEach(([slotIndex, position]) => {
    updatedSlotPositions[slotIndex] = {
      ...updatedSlotPositions[slotIndex],
      x: position.x,
      y: position.y
    }
  })
  
  // Salva
  await handleSelectManualFormation(
    layout.formation || 'Personalizzato',
    updatedSlotPositions
  )
  
  setIsEditMode(false)
  setCustomPositions({})
}
```

### 3.4 Vincoli posizionali (opzionale)

```javascript
const validatePosition = (slotIndex, x, y) => {
  const role = layout.slot_positions[slotIndex]?.position
  
  // Portiere (slot 0)
  if (slotIndex === 0) {
    return y >= 80 && x >= 40 && x <= 60
  }
  
  // Difensori (slot 1-4)
  if (slotIndex >= 1 && slotIndex <= 4) {
    return y >= 60 // Non oltre metà campo
  }
  
  // Centrocampisti (slot 5-7)
  if (slotIndex >= 5 && slotIndex <= 7) {
    return y >= 30 && y <= 70
  }
  
  // Attaccanti (slot 8-10)
  if (slotIndex >= 8 && slotIndex <= 10) {
    return y <= 40
  }
  
  return true
}
```

---

## 4. UI PROPOSTA

### Pulsante "Personalizza"

```jsx
{layout && (
  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
    <button
      onClick={() => setShowFormationSelectorModal(true)}
      className="btn"
    >
      Cambia Formazione
    </button>
    
    <button
      onClick={() => setIsEditMode(!isEditMode)}
      className="btn"
      style={{
        background: isEditMode ? 'rgba(34, 197, 94, 0.2)' : 'rgba(0, 212, 255, 0.1)',
        borderColor: isEditMode ? 'var(--neon-green)' : 'var(--neon-blue)'
      }}
    >
      {isEditMode ? (
        <>
          <Check size={16} />
          Salva Modifiche
        </>
      ) : (
        <>
          <Edit size={16} />
          Personalizza Posizioni
        </>
      )}
    </button>
    
    {isEditMode && (
      <button
        onClick={() => {
          setIsEditMode(false)
          setCustomPositions({})
        }}
        className="btn"
        style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: '#ef4444' }}
      >
        <X size={16} />
        Annulla
      </button>
    )}
  </div>
)}
```

### Indicatore modalità edit

```jsx
{isEditMode && (
  <div style={{
    padding: '12px',
    background: 'rgba(251, 191, 36, 0.1)',
    border: '1px solid rgba(251, 191, 36, 0.3)',
    borderRadius: '8px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  }}>
    <Info size={16} color="#fbbf24" />
    <span style={{ fontSize: '14px', color: '#fbbf24' }}>
      Modalità personalizzazione attiva: trascina i giocatori per spostarli
    </span>
  </div>
)}
```

---

## 5. RISCHI E VANTAGGI

### ✅ Vantaggi

- **Zero cambio campo**: Mantiene CSS esistente
- **Flessibilità**: Cliente può personalizzare qualsiasi formazione
- **Incrementale**: Aggiunta opzionale, non obbligatoria
- **Retrocompatibile**: Formazioni predefinite funzionano ancora

### ⚠️ Rischio: UX mobile

**Problema**: Drag & drop potrebbe essere difficile su touch.

**Mitigazione**:
- Usare eventi touch (`touchstart`, `touchmove`, `touchend`)
- Oppure: click-to-move (clicca card → clicca nuova posizione)

### ✅ Sicuro: Codice esistente

**Perché**:
- Solo aggiunta UI drag & drop
- Usa stesso `slot_positions` esistente
- Stesso salvataggio `save-formation-layout`
- Nessuna logica modificata

---

## 6. DIFFICOLTÀ

### ⭐⭐ (Bassa-Media)

**Frontend**:
- Toggle modalità edit: 30 min
- Drag & drop SlotCard: 2-3 ore
- Salvataggio posizioni: 30 min
- Vincoli posizionali (opzionale): 1 ora

**Backend**: Zero (usa esistente)

**Totale**: 3-4 ore

---

## 7. CHECKLIST IMPLEMENTAZIONE

### Frontend
- [ ] Aggiungere state `isEditMode` e `customPositions`
- [ ] Aggiungere pulsante "Personalizza Posizioni" (toggle edit)
- [ ] Modificare `SlotCard` per supportare drag & drop
- [ ] Handler `handlePositionChange` per salvare nuove posizioni
- [ ] Handler `handleSaveCustomPositions` per salvare modifiche
- [ ] Indicatore modalità edit attiva
- [ ] Vincoli posizionali (opzionale, per evitare formazioni impossibili)
- [ ] Supporto touch per mobile (opzionale)

### UX
- [ ] Cursor "move" quando in modalità edit
- [ ] Feedback visivo durante drag (opacità, z-index)
- [ ] Messaggio informativo quando edit attivo
- [ ] Pulsante "Annulla" per resettare modifiche
- [ ] Traduzioni i18n

### Testing
- [ ] Test drag & drop desktop
- [ ] Test drag & drop mobile (touch)
- [ ] Test salvataggio posizioni personalizzate
- [ ] Test vincoli posizionali (se implementati)

---

## 8. ESEMPIO CODICE COMPLETO

### Modifiche a SlotCard

```javascript
function SlotCard({ slot, onClick, onRemove, isEditMode = false, onPositionChange }) {
  const [isDragging, setIsDragging] = React.useState(false)
  const [dragStart, setDragStart] = React.useState(null)
  const [currentOffset, setCurrentOffset] = React.useState({ x: 0, y: 0 })
  
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
    const startPercentX = slot.position.x
    const startPercentY = slot.position.y
    
    setIsDragging(true)
    setDragStart({ startX, startY, startPercentX, startPercentY, containerRect })
    
    const handleMouseMove = (e) => {
      const deltaX = e.clientX - startX
      const deltaY = e.clientY - startY
      
      const percentX = (deltaX / containerRect.width) * 100
      const percentY = (deltaY / containerRect.height) * 100
      
      const newX = Math.max(5, Math.min(95, startPercentX + percentX))
      const newY = Math.max(5, Math.min(95, startPercentY + percentY))
      
      setCurrentOffset({
        x: newX - startPercentX,
        y: newY - startPercentY
      })
    }
    
    const handleMouseUp = () => {
      if (currentOffset.x !== 0 || currentOffset.y !== 0) {
        const newPosition = {
          x: startPercentX + currentOffset.x,
          y: startPercentY + currentOffset.y
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
  
  return (
    <div
      onMouseDown={isEditMode && slot.player ? handleMouseDown : undefined}
      onClick={!isEditMode ? onClick : undefined}
      style={{
        // ... stili esistenti
        cursor: isEditMode && slot.player ? 'move' : 'pointer',
        position: 'absolute',
        left: `${slot.position.x + (slot.offsetX || 0) + currentOffset.x}%`,
        top: `${slot.position.y + (slot.offsetY || 0) + currentOffset.y}%`,
        transform: 'translate(-50%, -50%)',
        opacity: isDragging ? 0.7 : 1,
        zIndex: isDragging ? 1000 : (slot.hasNearbyCards ? 2 : 1),
        userSelect: 'none' // Previene selezione testo durante drag
      }}
    >
      {/* ... contenuto esistente */}
    </div>
  )
}
```

### Modifiche al render campo

```jsx
<div
  data-field-container
  className="card"
  style={{
    // ... stili esistenti campo
  }}
>
  {/* ... linee campo esistenti */}
  
  {/* Card giocatori */}
  {slotsWithOffsets.map((slot) => (
    <SlotCard
      key={slot.slot_index}
      slot={slot}
      onClick={() => handleSlotClick(slot.slot_index)}
      onRemove={slot.player ? () => handleRemoveFromSlot(slot.player.id) : null}
      isEditMode={isEditMode}
      onPositionChange={handlePositionChange}
    />
  ))}
</div>
```

---

## 9. CONCLUSIONE

**Soluzione**: **Drag & Drop su Campo Esistente**

**Vantaggi**:
- ✅ Mantiene campo CSS esistente (zero cambio)
- ✅ Aggiunta opzionale (toggle on/off)
- ✅ Flessibilità totale (cliente personalizza)
- ✅ Retrocompatibile (formazioni predefinite funzionano)

**Tempo**: 3-4 ore
**Rischio**: 🟢 Basso (solo aggiunta UI, nessuna logica modificata)

**Raccomandazione**: ✅ **SICURO procedere** - Soluzione semplice e incrementale

---

**Nessuna modifica applicata.** Questo documento è solo proposta.
