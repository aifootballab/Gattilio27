# 🔍 Analisi Problema: Drag & Drop su Android

**Data**: 24 Gennaio 2026  
**Problema**: Su Android, i giocatori non rimangono selezionati e tenendo premuto non succede niente  
**Stato**: ✅ **RISOLTO - Funziona correttamente**

---

## 🔴 PROBLEMA RILEVATO

### Sintomi
1. **Giocatori non rimangono selezionati** - Tocco veloce non funziona
2. **Tenendo premuto non succede niente** - Drag non inizia
3. **Nessun feedback visivo** - L'utente non capisce cosa sta succedendo

---

## 🔍 CAUSE POSSIBILI

### 1. PreventDefault Blocca Click (MOLTO PROBABILE) ⚠️

**Problema**:
```javascript
onTouchStart={isEditMode && player ? handlePointerStart : undefined}
```

Se `handlePointerStart` chiama `preventDefault()` anche quando NON è un drag, blocca il click normale.

**Su Android**:
- `preventDefault()` su `touchstart` blocca TUTTI gli eventi successivi (click, focus, etc.)
- Se l'utente tocca velocemente (click), `preventDefault()` impedisce il click
- Se l'utente tiene premuto (drag), potrebbe non funzionare se la logica non distingue click vs drag

### 2. Timing Android - Touch Delay

**Problema**:
- Android ha un delay di ~300ms per distinguere click da drag
- Se `preventDefault()` viene chiamato troppo presto, blocca tutto
- Serve distinguere tra "tocco veloce" (click) e "tocco lungo" (drag)

### 3. Gestione Multi-Touch Android

**Problema**:
- Android potrebbe triggerare eventi touch multipli
- `touches[0]` potrebbe non essere sempre disponibile
- Serve validazione più robusta

### 4. Event Bubbling Android

**Problema**:
- Su Android, eventi touch possono propagarsi diversamente
- `stopPropagation()` potrebbe non essere sufficiente
- Serve gestione più specifica

---

## ✅ SOLUZIONI PROPOSTE

### Soluzione 1: Distinguere Click vs Drag (RACCOMANDATO) ⭐

**Problema Attuale**:
- `preventDefault()` viene chiamato SUBITO su `touchstart`
- Questo blocca il click normale

**Soluzione**:
1. **NON chiamare `preventDefault()` su `touchstart`**
2. **Aspettare movimento** per capire se è drag o click
3. **Chiamare `preventDefault()` solo se è drag** (dopo movimento)

**Implementazione**:
```javascript
const handleTouchStart = (e) => {
  if (!isEditMode || !player) return
  
  // NON chiamare preventDefault() qui!
  // Aspetta di vedere se è drag o click
  
  const touch = e.touches[0]
  const startX = touch.clientX
  const startY = touch.clientY
  const startTime = Date.now()
  
  // Salva stato iniziale
  setTouchStart({ x: startX, y: startY, time: startTime })
  
  const handleTouchMove = (moveEvent) => {
    // Se si muove, è un drag
    const moveTouch = moveEvent.touches[0]
    const deltaX = Math.abs(moveTouch.clientX - startX)
    const deltaY = Math.abs(moveTouch.clientY - startY)
    
    // Se movimento > 5px, è drag
    if (deltaX > 5 || deltaY > 5) {
      // ORA chiama preventDefault() per bloccare scroll
      moveEvent.preventDefault()
      
      // Inizia drag
      handleDragStart(moveEvent)
    }
  }
  
  const handleTouchEnd = (endEvent) => {
    const endTime = Date.now()
    const timeDiff = endTime - startTime
    
    // Se tempo < 300ms e nessun movimento, è click
    if (timeDiff < 300 && !hasMoved) {
      // Gestisci click normale
      if (onClick) onClick()
    }
    
    // Rimuovi listener
    document.removeEventListener('touchmove', handleTouchMove)
    document.removeEventListener('touchend', handleTouchEnd)
  }
  
  document.addEventListener('touchmove', handleTouchMove, { passive: false })
  document.addEventListener('touchend', handleTouchEnd)
}
```

### Soluzione 2: Usare Pointer Events (Alternativa)

**Vantaggi**:
- API unificata per mouse e touch
- Gestione automatica di click vs drag
- Supporto migliore su Android

**Svantaggi**:
- Supporto browser più recente richiesto
- Potrebbe non funzionare su Android vecchi

### Soluzione 3: Click-to-Move (Fallback Mobile)

**Se drag non funziona**:
- Tocco veloce → seleziona giocatore
- Tocco su nuova posizione → sposta giocatore
- Più semplice per mobile

---

## 🔧 IMPLEMENTAZIONE RACCOMANDATA

### Modifiche Necessarie

1. **Separare Click da Drag**
   - Non chiamare `preventDefault()` su `touchstart`
   - Aspettare movimento per distinguere click vs drag
   - Chiamare `preventDefault()` solo durante drag

2. **Gestione Timing**
   - Usare timeout per distinguere click veloce (< 300ms) da drag
   - Se movimento > 5px, considerare drag

3. **Feedback Visivo**
   - Mostrare feedback quando drag inizia
   - Indicare chiaramente quando elemento è draggabile

4. **Validazione Touch**
   - Verificare che `touches[0]` esista
   - Gestire multi-touch (ignorare se > 1 tocco)

---

## 📊 DIFFICOLTÀ

### ⭐⭐⭐ (Media)

**Tempo stimato**: 2-3 ore

**Modifiche necessarie**:
1. Riscrivere logica touch per distinguere click vs drag
2. Gestire timing e movimento
3. Test su dispositivo Android reale
4. Verificare che click normale funzioni

---

## ✅ CHECKLIST RISOLUZIONE

- [ ] Rimuovere `preventDefault()` da `touchstart`
- [ ] Aggiungere logica per distinguere click vs drag
- [ ] Chiamare `preventDefault()` solo durante drag (touchmove)
- [ ] Gestire click normale quando tocco veloce
- [ ] Aggiungere feedback visivo quando drag inizia
- [ ] Validare `touches[0]` esista
- [ ] Test su dispositivo Android reale
- [ ] Verificare che scroll funzioni quando non in drag
- [ ] Verificare che click normale funzioni

---

## 🧪 TEST ANDROID

### Test da Fare

1. **Click Veloce**
   - Tocco veloce su giocatore → deve aprire modal assegnazione
   - NON deve iniziare drag

2. **Drag**
   - Tocco e movimento → deve iniziare drag
   - Scroll deve essere bloccato durante drag
   - Posizione deve aggiornarsi in tempo reale

3. **Scroll**
   - Scroll pagina → deve funzionare normalmente quando non in drag
   - NON deve essere bloccato quando non in edit mode

4. **Feedback**
   - Quando drag inizia → feedback visivo chiaro
   - Utente deve capire che sta trascinando

---

## 🚀 RACCOMANDAZIONE

**Implementare Soluzione 1 (Distinguere Click vs Drag)** perché:
- ✅ Risolve problema preventDefault che blocca click
- ✅ Mantiene funzionalità drag
- ✅ Compatibile con Android
- ✅ Migliora UX generale

**Tempo**: 2-3 ore  
**Rischio**: 🟡 Medio (modifica logica touch, ma testabile)

---

---

## ✅ RISOLUZIONE

**Data Risoluzione**: 24 Gennaio 2026  
**Stato**: ✅ **FUNZIONA CORRETTAMENTE**

Dopo test su Android, il drag & drop funziona correttamente:
- ✅ Giocatori rimangono selezionati
- ✅ Tenendo premuto inizia drag
- ✅ Trascinamento funziona
- ✅ Click normale funziona

**Implementazione attuale è corretta e funzionante.**

---

**Ultimo Aggiornamento**: 24 Gennaio 2026  
**Stato**: ✅ Risolto e funzionante
