# 📱 Analisi: Drag & Drop su Mobile

**Data**: 24 Gennaio 2026  
**Problema**: Drag & drop funziona solo su desktop, non su mobile  
**Stato**: ⚠️ **DA IMPLEMENTARE**

---

## 🔍 PERCHÉ NON FUNZIONA SU MOBILE

### Problema Attuale

Il codice implementato usa **solo eventi mouse**:
- `onMouseDown` - Inizia drag
- `mousemove` - Aggiorna posizione durante drag
- `mouseup` - Finalizza drag

**Su mobile**, questi eventi **non vengono triggerati** perché:
1. Mobile non ha mouse fisico
2. Touch screen usa eventi touch diversi
3. Browser mobile non emula eventi mouse durante touch

---

## 📱 DIFFERENZA TRA MOUSE E TOUCH

### Eventi Mouse (Desktop)
```javascript
onMouseDown → mousemove → mouseup
```

### Eventi Touch (Mobile)
```javascript
onTouchStart → touchmove → touchend
```

**Differenze chiave**:
- Touch events hanno `touches` array (multi-touch)
- Touch events hanno `preventDefault()` per evitare scroll
- Touch events hanno coordinate in `touches[0].clientX/Y`

---

## ✅ SOLUZIONE: Supporto Multi-Device

### Opzione 1: Eventi Unificati (RACCOMANDATO) ⭐

Implementare handler che supportano **sia mouse che touch**:

```javascript
const handlePointerDown = (e) => {
  // Supporta sia mouse che touch
  const isTouch = e.type.startsWith('touch')
  const clientX = isTouch ? e.touches[0].clientX : e.clientX
  const clientY = isTouch ? e.touches[0].clientY : e.clientY
  
  // ... resto del codice
}

const handlePointerMove = (e) => {
  const isTouch = e.type.startsWith('touch')
  const clientX = isTouch ? e.touches[0].clientX : e.clientX
  const clientY = isTouch ? e.touches[0].clientY : e.clientY
  
  // ... resto del codice
}

const handlePointerUp = (e) => {
  // ... finalizza drag
}
```

**Vantaggi**:
- ✅ Un solo handler per entrambi
- ✅ Codice più pulito
- ✅ Funziona su desktop e mobile

---

### Opzione 2: Handler Separati

Implementare handler separati per mouse e touch:

```javascript
const handleMouseDown = (e) => { /* codice mouse */ }
const handleTouchStart = (e) => { 
  e.preventDefault() // Previene scroll durante drag
  // ... codice touch
}
```

**Vantaggi**:
- ✅ Controllo più fine
- ✅ Gestione preventDefault specifica per touch

**Svantaggi**:
- ⚠️ Codice duplicato
- ⚠️ Manutenzione doppia

---

## 🔧 IMPLEMENTAZIONE RACCOMANDATA

### Modifiche a SlotCard Component

**Prima** (solo mouse):
```javascript
onMouseDown={isEditMode && player ? handleMouseDown : undefined}
```

**Dopo** (mouse + touch):
```javascript
onMouseDown={isEditMode && player ? handlePointerDown : undefined}
onTouchStart={isEditMode && player ? handlePointerStart : undefined}
onTouchMove={isDragging ? handlePointerMove : undefined}
onTouchEnd={isDragging ? handlePointerEnd : undefined}
```

### Handler Unificato

```javascript
const handlePointerStart = (e) => {
  if (!isEditMode || !player) return
  
  // Previeni scroll su mobile
  if (e.type.startsWith('touch')) {
    e.preventDefault()
  }
  e.stopPropagation()
  
  const container = e.currentTarget.closest('[data-field-container]')
  if (!container) return
  
  const containerRect = container.getBoundingClientRect()
  
  // Estrai coordinate (mouse o touch)
  const isTouch = e.type.startsWith('touch')
  const startX = isTouch ? e.touches[0].clientX : e.clientX
  const startY = isTouch ? e.touches[0].clientY : e.clientY
  
  const startPercentX = position.x + (offsetX || 0)
  const startPercentY = position.y + (offsetY || 0)
  
  setIsDragging(true)
  const dragState = { startX, startY, startPercentX, startPercentY, containerRect, isTouch }
  setDragStart(dragState)
  
  let lastOffset = { x: 0, y: 0 }
  
  const handlePointerMove = (moveEvent) => {
    // Estrai coordinate
    const moveIsTouch = moveEvent.type.startsWith('touch')
    const currentX = moveIsTouch ? moveEvent.touches[0].clientX : moveEvent.clientX
    const currentY = moveIsTouch ? moveEvent.touches[0].clientY : moveEvent.clientY
    
    const deltaX = currentX - dragState.startX
    const deltaY = currentY - dragState.startY
    
    const percentX = (deltaX / dragState.containerRect.width) * 100
    const percentY = (deltaY / dragState.containerRect.height) * 100
    
    const newX = Math.max(5, Math.min(95, dragState.startPercentX + percentX))
    const newY = Math.max(5, Math.min(95, dragState.startPercentY + percentY))
    
    lastOffset = {
      x: newX - dragState.startPercentX,
      y: newY - dragState.startPercentY
    }
    
    setCurrentOffset(lastOffset)
    
    // Previeni scroll su mobile durante drag
    if (moveIsTouch) {
      moveEvent.preventDefault()
    }
  }
  
  const handlePointerEnd = () => {
    if (lastOffset.x !== 0 || lastOffset.y !== 0) {
      const newPosition = {
        x: dragState.startPercentX + lastOffset.x,
        y: dragState.startPercentY + lastOffset.y
      }
      
      if (onPositionChange) {
        onPositionChange(slot_index, newPosition)
      }
    }
    
    setIsDragging(false)
    setDragStart(null)
    setCurrentOffset({ x: 0, y: 0 })
    
    // Rimuovi listener
    if (dragState.isTouch) {
      document.removeEventListener('touchmove', handlePointerMove)
      document.removeEventListener('touchend', handlePointerEnd)
    } else {
      document.removeEventListener('mousemove', handlePointerMove)
      document.removeEventListener('mouseup', handlePointerEnd)
    }
  }
  
  // Aggiungi listener appropriati
  if (dragState.isTouch) {
    document.addEventListener('touchmove', handlePointerMove, { passive: false })
    document.addEventListener('touchend', handlePointerEnd)
  } else {
    document.addEventListener('mousemove', handlePointerMove)
    document.addEventListener('mouseup', handlePointerEnd)
  }
}
```

---

## ⚠️ CONSIDERAZIONI MOBILE

### 1. Prevent Default

**Importante**: Su mobile, `preventDefault()` su `touchmove` previene lo scroll della pagina durante il drag.

**Nota**: Usa `{ passive: false }` quando aggiungi listener per permettere `preventDefault()`.

### 2. Multi-Touch

Il codice usa `touches[0]` per il primo tocco. Se l'utente tocca con due dita, considera solo il primo.

### 3. Performance

Su mobile, eventi touch possono essere più frequenti. Considera throttling se necessario.

### 4. UX Mobile

- **Feedback visivo**: Assicurati che sia chiaro che l'elemento è draggabile
- **Area touch**: Su mobile, l'area touch dovrebbe essere più grande (min 44x44px)
- **Haptic feedback**: Opzionale, ma migliora UX

---

## 📊 DIFFICOLTÀ IMPLEMENTAZIONE

### ⭐⭐ (Bassa-Media)

**Tempo stimato**: 1-2 ore

**Modifiche necessarie**:
1. Aggiungere handler touch a SlotCard
2. Unificare logica mouse/touch
3. Test su dispositivo mobile reale
4. Verificare preventDefault per scroll

---

## ✅ CHECKLIST IMPLEMENTAZIONE

- [ ] Aggiungere `onTouchStart` a SlotCard
- [ ] Aggiungere `onTouchMove` (solo quando `isDragging`)
- [ ] Aggiungere `onTouchEnd` (solo quando `isDragging`)
- [ ] Unificare logica coordinate (mouse/touch)
- [ ] Aggiungere `preventDefault()` per touch
- [ ] Usare `{ passive: false }` per touchmove listener
- [ ] Test su dispositivo mobile reale
- [ ] Verificare che scroll funzioni quando non in drag
- [ ] Verificare che click normale funzioni su mobile

---

## 🧪 TEST MOBILE

### Test da Fare

1. **Touch Start**
   - Tocco su giocatore → inizia drag
   - Scroll pagina disabilitato durante drag

2. **Touch Move**
   - Trascinamento → posizione aggiornata
   - Coordinate corrette

3. **Touch End**
   - Rilascio → posizione salvata
   - Scroll pagina riabilitato

4. **Click Normale**
   - Tocco veloce (non drag) → apre modal assegnazione
   - Scroll pagina funziona normalmente

---

## 🚀 RACCOMANDAZIONE

**Implementare Opzione 1 (Eventi Unificati)** perché:
- ✅ Codice più pulito
- ✅ Manutenzione più semplice
- ✅ Funziona su desktop e mobile
- ✅ Nessuna duplicazione logica

**Tempo**: 1-2 ore  
**Rischio**: 🟢 Basso (solo aggiunte, nessuna modifica logica esistente)

---

**Ultimo Aggiornamento**: 24 Gennaio 2026
