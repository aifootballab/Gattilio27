# 🔍 Analisi Problema: Formazioni Predefinite + Trascinamento

**Data**: 26 Gennaio 2026  
**Problema Identificato**: Validazione inconsistente per formazioni predefinite

---

## 📋 SCENARI

### **Scenario 1: Formazione Predefinita → Salva Subito (SENZA modifiche)**

```
Cliente seleziona "4-3-3" predefinita
  ↓
FormationSelectorModal.handleConfirm()
  ↓
onSelect('4-3-3', slot_positions)
  ↓
handleSelectManualFormation('4-3-3', slot_positions)
  ↓
❌ NO validazione frontend
  ↓
fetch('/api/supabase/save-formation-layout')
  ↓
Backend: Warning log (ma cliente non lo vede)
  ↓
✅ Formazione salvata
```

**Problema**: ⚠️ Cliente non vede warning frontend

---

### **Scenario 2: Formazione Predefinita → Modifica Trascinando → Salva**

```
Cliente seleziona "4-3-3" predefinita
  ↓
handleSelectManualFormation() → salva (NO validazione frontend)
  ↓
Cliente attiva "Personalizza Posizioni"
  ↓
Cliente trascina giocatori sul campo 2D
  ↓
handlePositionChange() → aggiorna customPositions
  ↓
Cliente clicca "Salva Modifiche"
  ↓
handleSaveCustomPositions()
  ↓
✅ Validazione frontend (riga 1264-1279)
  ↓
Se invalida → window.confirm() con warning
  ↓
Se conferma → handleSelectManualFormation() (riga 1282)
  ↓
✅ Salvataggio
```

**Stato**: ✅ **OK** - Validazione presente quando cliente modifica trascinando

---

## ⚠️ PROBLEMA IDENTIFICATO

### **Due Problemi Separati:**

1. **Formazione Predefinita Salvata Subito**:
   - Cliente seleziona predefinita → salva immediatamente
   - ❌ NO validazione frontend
   - Backend logga warning, ma cliente non lo vede

2. **Formazione Predefinita Modificata Trascinando**:
   - Cliente seleziona predefinita → modifica trascinando → salva
   - ✅ HA validazione frontend (in `handleSaveCustomPositions`)
   - ✅ OK quando cliente modifica

---

## 🔧 SOLUZIONE

### **Fix Necessario:**

Aggiungere validazione anche in `handleSelectManualFormation` PRIMA di chiamare API:

```javascript
const handleSelectManualFormation = async (formation, slotPositions) => {
  setUploadingFormation(true)
  setError(null)

  try {
    // ✅ AGGIUNGERE: Validazione limitazioni ruolo
    const { validateFormationLimits } = await import('../../lib/validateFormationLimits')
    const validation = validateFormationLimits(slotPositions)
    if (!validation.valid) {
      const errorMsg = validation.errors.join('\n')
      const warningMsg = `⚠️ Formazione non valida secondo regole eFootball:\n\n${errorMsg}\n\nVuoi salvare comunque?`
      const confirmed = window.confirm(warningMsg)
      if (!confirmed) {
        setError(errorMsg)
        showToast('Salvataggio annullato', 'error')
        setUploadingFormation(false)
        return
      }
      // Cliente conferma → procedi con salvataggio (warning ma non blocco)
      showToast('⚠️ Formazione salvata con limitazioni non rispettate', 'error')
    }

    // ... resto del codice esistente (fetch API, ecc.)
  } catch (err) {
    // ... gestione errori esistente
  }
}
```

---

## 📊 RIEPILOGO FLUSSI

| Scenario | Validazione Frontend | Stato |
|----------|---------------------|-------|
| **Predefinita → Salva subito** | ❌ NO | ⚠️ Problema |
| **Predefinita → Modifica → Salva** | ✅ SÌ (in `handleSaveCustomPositions`) | ✅ OK |
| **Posizioni personalizzate → Salva** | ✅ SÌ (in `handleSaveCustomPositions`) | ✅ OK |

---

## ✅ DOPO FIX

Tutti gli scenari avranno validazione frontend coerente:

1. **Predefinita → Salva subito**: Validazione in `handleSelectManualFormation`
2. **Predefinita → Modifica → Salva**: Validazione in `handleSaveCustomPositions`
3. **Posizioni personalizzate → Salva**: Validazione in `handleSaveCustomPositions`

---

**Documento creato**: 26 Gennaio 2026  
**Stato**: ⚠️ Problema identificato, fix necessario
