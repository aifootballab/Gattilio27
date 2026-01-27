# 📊 Analisi Complessità: Alert Profilazione Card 2D

**Data**: 26 Gennaio 2026  
**Obiettivo**: Aggiungere alert visivo (colore bordo) su card giocatori campo 2D basato su completamento profilazione

---

## 🔍 ANALISI SITUAZIONE ATTUALE

### **Componente SlotCard** (riga 2485-2710)

**Complessità**: Media-Alta
- **225 righe** di codice
- **Logica drag & drop** complessa (mouse + touch)
- **Hover handlers** con manipolazione diretta DOM
- **3 stati visivi**: normale, hover, dragging

### **Struttura photo_slots**

**Chiavi tracciate**:
- `card` (boolean) - Card giocatore
- `statistiche` (boolean) - Statistiche complete
- `abilita` (boolean) - Abilità/Com Skills
- `booster` (boolean, opzionale) - Booster (può essere in stessa foto di abilita)

**Logica completamento** (già presente in AssignModal riga 2863):
```javascript
const isProfileComplete = photoSlots.card && photoSlots.statistiche && (photoSlots.abilita || photoSlots.booster)
// 3 foto principali: card, statistiche, abilità/booster
```

### **Bordo Attuale** (viola fisso)

**3 punti di modifica**:
1. **Bordo iniziale** (riga 2618): `'1.5px solid rgba(147, 51, 234, 0.8)'`
2. **Hover enter** (riga 2645): `'rgba(147, 51, 234, 1)'`
3. **Hover leave** (riga 2659): `'rgba(147, 51, 234, 0.8)'`

**Box shadow** (coordinato):
- Normale: `'0 4px 16px rgba(59, 130, 246, 0.4), 0 0 20px rgba(147, 51, 234, 0.3)'`
- Hover: `'0 6px 24px rgba(59, 130, 246, 0.6), 0 0 30px rgba(147, 51, 234, 0.5)'`

---

## 🎯 PROPOSTA INTERVENTO

### **Strategia: Minimale e Sicura**

**Approccio**: Aggiungere funzione helper + sostituire 3 occorrenze colore

### **1. Funzione Helper** (all'inizio SlotCard)

```javascript
// Calcola colore bordo basato su completamento profilazione
function getProfileBorderColor(photoSlots) {
  if (!photoSlots || typeof photoSlots !== 'object') {
    return 'rgba(239, 68, 68, 0.8)' // Rosso: nessun dato
  }
  
  const hasCard = photoSlots.card === true
  const hasStats = photoSlots.statistiche === true
  const hasSkills = photoSlots.abilita === true || photoSlots.booster === true
  
  const count = [hasCard, hasStats, hasSkills].filter(Boolean).length
  
  if (count === 3) {
    return 'rgba(34, 197, 94, 0.8)'      // Verde: completo (3/3)
  }
  if (count === 2) {
    return 'rgba(251, 191, 36, 0.8)'      // Arancione: parziale (2/3)
  }
  return 'rgba(239, 68, 68, 0.8)'        // Rosso: incompleto (0-1/3)
}

// Calcola colore hover (stesso colore, opacità maggiore)
function getProfileBorderColorHover(photoSlots) {
  const baseColor = getProfileBorderColor(photoSlots)
  return baseColor.replace('0.8', '1.0').replace('0.6', '1.0')
}
```

### **2. Calcolo Colore** (all'inizio return SlotCard)

```javascript
const profileBorderColor = isEmpty 
  ? 'rgba(148, 163, 184, 0.5)'  // Grigio per slot vuoto
  : getProfileBorderColor(player.photo_slots)

const profileBorderColorHover = isEmpty
  ? 'rgba(148, 163, 184, 0.7)'
  : getProfileBorderColorHover(player.photo_slots)
```

### **3. Sostituzioni** (3 punti)

**A. Bordo iniziale** (riga 2618):
```javascript
// PRIMA:
border: isEmpty 
  ? '1.5px solid rgba(148, 163, 184, 0.5)' 
  : '1.5px solid rgba(147, 51, 234, 0.8)',

// DOPO:
border: `1.5px solid ${profileBorderColor}`,
```

**B. Hover enter** (riga 2645):
```javascript
// PRIMA:
e.currentTarget.style.borderColor = isEmpty 
  ? 'rgba(148, 163, 184, 0.7)' 
  : 'rgba(147, 51, 234, 1)'

// DOPO:
e.currentTarget.style.borderColor = profileBorderColorHover
```

**C. Hover leave** (riga 2659):
```javascript
// PRIMA:
e.currentTarget.style.borderColor = isEmpty 
  ? 'rgba(148, 163, 184, 0.5)' 
  : 'rgba(147, 51, 234, 0.8)'

// DOPO:
e.currentTarget.style.borderColor = profileBorderColor
```

### **4. Box Shadow Coordinato** (opzionale, per coerenza)

**Calcolare box shadow basato su colore**:
```javascript
function getProfileBoxShadow(photoSlots, isHover = false) {
  if (!photoSlots || typeof photoSlots !== 'object') {
    return isHover 
      ? '0 6px 24px rgba(239, 68, 68, 0.6), 0 0 30px rgba(239, 68, 68, 0.5)'
      : '0 4px 16px rgba(239, 68, 68, 0.4), 0 0 20px rgba(239, 68, 68, 0.3)'
  }
  
  const hasCard = photoSlots.card === true
  const hasStats = photoSlots.statistiche === true
  const hasSkills = photoSlots.abilita === true || photoSlots.booster === true
  const count = [hasCard, hasStats, hasSkills].filter(Boolean).length
  
  if (count === 3) {
    // Verde
    return isHover
      ? '0 6px 24px rgba(34, 197, 94, 0.6), 0 0 30px rgba(34, 197, 94, 0.5)'
      : '0 4px 16px rgba(34, 197, 94, 0.4), 0 0 20px rgba(34, 197, 94, 0.3)'
  }
  if (count === 2) {
    // Arancione
    return isHover
      ? '0 6px 24px rgba(251, 191, 36, 0.6), 0 0 30px rgba(251, 191, 36, 0.5)'
      : '0 4px 16px rgba(251, 191, 36, 0.4), 0 0 20px rgba(251, 191, 36, 0.3)'
  }
  // Rosso
  return isHover
    ? '0 6px 24px rgba(239, 68, 68, 0.6), 0 0 30px rgba(239, 68, 68, 0.5)'
    : '0 4px 16px rgba(239, 68, 68, 0.4), 0 0 20px rgba(239, 68, 68, 0.3)'
}
```

---

## 📋 COMPLESSITÀ INTERVENTO

### **Livello Complessità**: Bassa

**Motivi**:
- ✅ **Intervento isolato**: Solo componente SlotCard
- ✅ **Nessuna modifica logica**: Solo cambio colore
- ✅ **Funzione helper pura**: Facilmente testabile
- ✅ **Backward compatible**: Se photo_slots manca, usa rosso (sicuro)
- ✅ **3 punti modifica**: Chiaramente identificati

### **Rischi**

**Rischio Basso**:
- ✅ Non modifica logica drag & drop
- ✅ Non modifica struttura dati
- ✅ Fallback sicuro (rosso se dati mancanti)
- ✅ Slot vuoti non toccati (restano grigi)

**Rischio Medio**:
- ⚠️ Box shadow: Se cambiamo anche questo, 6 punti modifica invece di 3
- ⚠️ Performance: Calcolo colore ad ogni render (minimo, ma da considerare)

**Mitigazione**:
- ✅ Funzione helper semplice (O(1))
- ✅ Calcolo solo se player presente
- ✅ Box shadow opzionale (si può fare dopo)

---

## 🎨 DESIGN COLORI

### **Sistema Colori Proposto**

**Verde** (3/3 - Completo):
- Bordo: `rgba(34, 197, 94, 0.8)` (green-500)
- Hover: `rgba(34, 197, 94, 1.0)`
- Box shadow: `rgba(34, 197, 94, 0.3-0.5)`

**Arancione** (2/3 - Parziale):
- Bordo: `rgba(251, 191, 36, 0.8)` (amber-400)
- Hover: `rgba(251, 191, 36, 1.0)`
- Box shadow: `rgba(251, 191, 36, 0.3-0.5)`

**Rosso** (0-1/3 - Incompleto):
- Bordo: `rgba(239, 68, 68, 0.8)` (red-500)
- Hover: `rgba(239, 68, 68, 1.0)`
- Box shadow: `rgba(239, 68, 68, 0.3-0.5)`

**Grigio** (Slot vuoto - invariato):
- Bordo: `rgba(148, 163, 184, 0.5)` (slate-400)
- Hover: `rgba(148, 163, 184, 0.7)`

---

## 🔧 IMPLEMENTAZIONE STEP-BY-STEP

### **Step 1: Aggiungere Funzione Helper** (all'inizio SlotCard, dopo getDisplayName)

```javascript
// Calcola colore bordo basato su completamento profilazione
function getProfileBorderColor(photoSlots) {
  if (!photoSlots || typeof photoSlots !== 'object') {
    return 'rgba(239, 68, 68, 0.8)' // Rosso: nessun dato
  }
  
  const hasCard = photoSlots.card === true
  const hasStats = photoSlots.statistiche === true
  const hasSkills = photoSlots.abilita === true || photoSlots.booster === true
  
  const count = [hasCard, hasStats, hasSkills].filter(Boolean).length
  
  if (count === 3) return 'rgba(34, 197, 94, 0.8)'      // Verde: completo
  if (count === 2) return 'rgba(251, 191, 36, 0.8)'      // Arancione: parziale
  return 'rgba(239, 68, 68, 0.8)'                        // Rosso: incompleto
}
```

### **Step 2: Calcolare Colori** (prima del return)

```javascript
const profileBorderColor = isEmpty 
  ? 'rgba(148, 163, 184, 0.5)'  // Grigio per slot vuoto
  : getProfileBorderColor(player.photo_slots)

const profileBorderColorHover = isEmpty
  ? 'rgba(148, 163, 184, 0.7)'
  : getProfileBorderColor(player.photo_slots).replace('0.8', '1.0')
```

### **Step 3: Sostituire Bordo Iniziale** (riga 2618)

```javascript
border: `1.5px solid ${profileBorderColor}`,
```

### **Step 4: Sostituire Hover Enter** (riga 2645)

```javascript
e.currentTarget.style.borderColor = profileBorderColorHover
```

### **Step 5: Sostituire Hover Leave** (riga 2659)

```javascript
e.currentTarget.style.borderColor = profileBorderColor
```

### **Step 6 (Opzionale): Box Shadow Coordinato**

Se vogliamo anche box shadow coordinato, aggiungere funzione helper e sostituire anche quelle occorrenze.

---

## ✅ CHECKLIST IMPLEMENTAZIONE

### **Pre-Implementazione**
- [x] Analisi complessità completata
- [x] Punti modifica identificati (3)
- [x] Funzione helper progettata
- [x] Colori definiti
- [x] Rischi valutati

### **Implementazione**
- [ ] Aggiungere funzione helper `getProfileBorderColor`
- [ ] Calcolare colori prima del return
- [ ] Sostituire bordo iniziale (riga 2618)
- [ ] Sostituire hover enter (riga 2645)
- [ ] Sostituire hover leave (riga 2659)
- [ ] (Opzionale) Box shadow coordinato

### **Post-Implementazione**
- [ ] Test: Slot vuoto (grigio invariato)
- [ ] Test: Giocatore senza photo_slots (rosso)
- [ ] Test: Giocatore 1/3 (rosso)
- [ ] Test: Giocatore 2/3 (arancione)
- [ ] Test: Giocatore 3/3 (verde)
- [ ] Test: Hover funziona correttamente
- [ ] Test: Drag & drop non rotto

---

## 🎯 VANTAGGI INTERVENTO

### **Minimale**
- ✅ Solo 3 sostituzioni stringa
- ✅ 1 funzione helper semplice
- ✅ Nessuna modifica logica esistente

### **Sicuro**
- ✅ Backward compatible
- ✅ Fallback sicuro (rosso se dati mancanti)
- ✅ Slot vuoti non toccati

### **Efficace**
- ✅ Feedback visivo immediato
- ✅ Motiva completamento profilazione
- ✅ Sistema chiaro (verde/arancione/rosso)

---

## ⚠️ CONSIDERAZIONI

### **Performance**
- Calcolo colore: O(1), minimo overhead
- Solo se player presente (non per slot vuoti)
- Nessun re-render aggiuntivo

### **UX**
- Colori intuitivi (semaforo)
- Non invasivo (solo bordo)
- Mantiene design esistente

### **Manutenibilità**
- Funzione helper isolata
- Facilmente testabile
- Facilmente estendibile (es: aggiungere tooltip)

---

**Status**: ✅ **PRONTO PER IMPLEMENTAZIONE**

**Complessità**: 🟢 **BASSA** (3 sostituzioni + 1 funzione helper)

**Rischio**: 🟢 **BASSO** (intervento isolato, backward compatible)
