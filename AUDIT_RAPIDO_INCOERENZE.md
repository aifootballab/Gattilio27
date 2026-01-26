# 🔍 Audit Rapido: Incoerenze, Supabase, Flussi

**Data**: 26 Gennaio 2026  
**Stato**: ✅ Audit completato

---

## ✅ COERENZA CODICE

### **1. Validazione Limitazioni**
- ✅ **Frontend**: Warning con conferma (riga 1267-1279)
- ✅ **Backend**: Warning log, non blocca (riga 93-102)
- ✅ **Coerente**: Entrambi permettono salvataggio con warning

### **2. Validazione Difesa**
- ✅ **Corretto**: Usa `defendersByY.length` (solo y: 60-80)
- ✅ **Corretto**: Conta DC/TD/TS solo in zona difesa
- ✅ **Coerente**: Allineato con memoria Attila

### **3. SP (Seconda Punta)**
- ✅ **Gestita**: Logica relativa e assoluta
- ✅ **Presente**: In formazioni predefinite
- ✅ **Validata**: Inclusa in `validateFormationLimits`

---

## ⚠️ INCOERENZE IDENTIFICATE

### **1. Formazioni Predefinite: Nessuna Validazione**

**Problema**: Quando cliente seleziona formazione predefinita da `FormationSelectorModal`:
- Chiama `handleSelectManualFormation(formation, slotPositions)` direttamente
- **NON passa** per `handleSaveCustomPositions` (che ha validazione)
- **NON viene validata** prima di salvare

**Flusso**:
```
Cliente seleziona "4-3-3" predefinita
  ↓
FormationSelectorModal.onSelect()
  ↓
handleSelectManualFormation('4-3-3', slotPositions)
  ↓
fetch('/api/supabase/save-formation-layout')
  ↓
Backend: Warning ma salva (fase test)
  ↓
✅ Formazione salvata SENZA validazione frontend
```

**Impatto**: ⚠️ **MEDIO** - Formazioni predefinite bypassano validazione frontend (ma backend ha warning)

**Fix Necessario**: Aggiungere validazione anche in `handleSelectManualFormation` prima di chiamare API

---

### **2. Dataset Validazione Frontend/Backend**

**Problema**: 
- **Frontend** valida `updatedSlotPositions` (senza slot default)
- **Backend** valida `completeSlots` (con slot default aggiunti)

**Impatto**: ⚠️ **BASSO** - Potenziale inconsistenza, ma entrambi permettono salvataggio (fase test)

**Fix Futuro**: Allineare dataset (frontend dovrebbe validare `completeSlotPositions(updatedSlotPositions)`)

---

## ✅ ALLINEAMENTO SUPABASE

### **Tabelle Utilizzate**

**`formation_layout`**:
- ✅ **Endpoint**: `POST /api/supabase/save-formation-layout`
- ✅ **Operazioni**: UPSERT (onConflict: user_id)
- ✅ **Campi**: `user_id`, `formation`, `slot_positions` (JSONB), `updated_at`
- ✅ **RLS**: Abilitato (UNIQUE user_id)
- ✅ **Coerente**: Un layout per utente

**`players`**:
- ✅ **Endpoint**: `POST /api/supabase/save-player`, `PATCH /api/supabase/assign-player-to-slot`
- ✅ **Operazioni**: INSERT, UPDATE, DELETE
- ✅ **Campi**: `slot_index` (0-10 = titolare, NULL = riserva)
- ✅ **RLS**: Abilitato
- ✅ **Coerente**: Slot index gestito correttamente

**Nessun Endpoint Orfano**: ✅ Tutti gli endpoint utilizzati

---

## 🔄 FLUSSI

### **Flusso 1: Salvataggio Posizioni Personalizzate**

```
handleSaveCustomPositions()
  ↓
✅ Validazione frontend (warning con conferma)
  ↓
handleSelectManualFormation()
  ↓
✅ Validazione backend (warning log)
  ↓
✅ Salvataggio DB
```

**Stato**: ✅ **Coerente**

---

### **Flusso 2: Selezione Formazione Predefinita**

```
FormationSelectorModal.onSelect()
  ↓
handleSelectManualFormation()
  ↓
❌ Nessuna validazione frontend
  ↓
✅ Validazione backend (warning log)
  ↓
✅ Salvataggio DB
```

**Stato**: ⚠️ **Incoerenza** - Formazioni predefinite bypassano validazione frontend

---

### **Flusso 3: Upload Giocatore**

```
handleUploadPlayerToSlot()
  ↓
Extract player data
  ↓
PositionSelectionModal
  ↓
handleSavePlayerWithPositions()
  ↓
✅ Salvataggio giocatore
```

**Stato**: ✅ **Coerente**

---

## 📊 RIEPILOGO

| Aspetto | Stato | Note |
|---------|-------|------|
| **Validazione limitazioni** | ✅ Coerente | Warning invece di blocco (fase test) |
| **Validazione difesa** | ✅ Corretto | Usa `defendersByY` (solo y: 60-80) |
| **SP gestita** | ✅ OK | Logica corretta |
| **Formazioni predefinite** | ⚠️ Incoerenza | Bypassano validazione frontend |
| **Dataset validazione** | ⚠️ Minore | Frontend/backend diversi, ma entrambi permettono |
| **Supabase allineato** | ✅ OK | Nessun endpoint orfano |
| **Flussi** | ⚠️ Minore | Formazioni predefinite bypassano validazione frontend |

---

## ⚠️ PROBLEMA PRINCIPALE

**Formazioni Predefinite Bypassano Validazione Frontend**

- Quando cliente seleziona formazione predefinita, non passa per `handleSaveCustomPositions`
- Quindi non vede warning frontend
- Backend ha warning log, ma cliente non lo vede

**Fix Consigliato**: Aggiungere validazione anche in `handleSelectManualFormation` prima di chiamare API

---

**Documento creato**: 26 Gennaio 2026  
**Stato**: ✅ Audit completato, 1 incoerenza minore identificata
