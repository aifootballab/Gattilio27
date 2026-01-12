# 📸 Flusso Destinazione Screenshot
## Come il sistema sa dove inserire i dati estratti

**Data**: 2025-01-12  
**Status**: ✅ **IMPLEMENTATO**

---

## 🔄 FLUSSO COMPLETO

### **1. Upload Screenshot**

```
Utente carica screenshot
  ↓
ScreenshotUpload.handleFile()
  ↓
visionService.uploadAndProcessScreenshot()
  ↓
Edge Function: process-screenshot
  ↓
OCR + Estrazione dati
  ↓
extractedData disponibile
```

---

### **2. Selezione Destinazione**

```
extractedData disponibile
  ↓
Mostra PlayerDestinationSelector
  ↓
Utente seleziona:
  - Titolare O Riserva
  - (Se titolare) Posizione tattica
  - (Se titolare) Slot in formazione
  ↓
onConfirm(insertData)
```

---

### **3. Salvataggio con Destinazione**

```
handleDestinationConfirm(insertData)
  ↓
1. Cerca/crea player_base
  ↓
2. Crea/aggiorna player_build
  ↓
3. rosaService.addPlayerToRosaInSlot()
   - rosaId
   - playerBuildId
   - destination: 'titolare' | 'riserva'
   - slot: 0-10 (titolari) | 11-20 (riserve)
  ↓
4. Aggiorna user_rosa.player_build_ids[]
   - Inserisce in slot specifico
   - Se slot occupato, sposta giocatore esistente
  ↓
5. Ricarica rosa completa
```

---

## 📋 COMPONENTE: PlayerDestinationSelector

### **Funzionalità**:

1. **Preview Giocatore**:
   - Nome, OVR, Posizione

2. **Selezione Destinazione**:
   - Titolari (0/11) - Disabilitato se pieno
   - Riserve (0/10) - Disabilitato se pieno

3. **Selezione Posizione** (solo titolari):
   - Grid con tutte le posizioni (GK, CB, LB, ...)
   - Icone e nomi

4. **Selezione Slot** (solo titolari):
   - Grid 4x3 con slot formazione
   - Mostra slot occupati/liberi
   - Click per selezionare

5. **Conferma**:
   - Abilitato solo se:
     - Destinazione selezionata
     - (Titolare) Slot selezionato
     - (Riserva) Spazio disponibile

---

## 🔧 FUNZIONE: addPlayerToRosaInSlot

### **Parametri**:

```typescript
addPlayerToRosaInSlot(
  rosaId: string,
  playerBuildId: string,
  destination: 'titolare' | 'riserva',
  slot: number | null  // 0-10 per titolari, 11-20 per riserve, null = auto
)
```

### **Logica**:

1. **Ottieni rosa corrente**
2. **Crea array 21 slot** (inizializza con null se necessario)
3. **Se titolare**:
   - Valida slot (0-10)
   - Se slot occupato → sposta giocatore esistente in riserva
   - Inserisci nuovo giocatore nello slot
4. **Se riserva**:
   - Se slot null → trova primo libero (11-20)
   - Valida che ci sia spazio
   - Inserisci in slot
5. **Pulisci array** (rimuovi null)
6. **Aggiorna database**

---

## 📊 ESEMPIO FLUSSO

### **Scenario 1: Aggiungi Titolare**

```
1. Screenshot → extractedData
2. PlayerDestinationSelector mostra:
   - Titolari: 5/11
   - Riserve: 3/10
3. Utente seleziona "Titolari"
4. Utente seleziona posizione "CF"
5. Utente seleziona slot 9 (attaccante)
6. Conferma
7. Sistema:
   - Crea player_build
   - Inserisce in player_build_ids[9]
   - Aggiorna rosa
```

### **Scenario 2: Aggiungi Riserva**

```
1. Screenshot → extractedData
2. PlayerDestinationSelector mostra:
   - Titolari: 11/11 (pieno)
   - Riserve: 7/10
3. Utente seleziona "Riserve"
4. Conferma (slot auto = 18)
5. Sistema:
   - Crea player_build
   - Inserisce in player_build_ids[18]
   - Aggiorna rosa
```

### **Scenario 3: Slot Occupato**

```
1. Utente seleziona slot 5 (già occupato)
2. Sistema:
   - Sposta giocatore esistente da slot 5 → primo slot riserva libero
   - Inserisce nuovo giocatore in slot 5
   - Aggiorna rosa
```

---

## ✅ VALIDAZIONI

### **Titolari**:
- ✅ Massimo 11 giocatori
- ✅ Slot 0-10 validi
- ✅ Se slot occupato → sposta in riserva
- ✅ Se riserve piene → rimuove giocatore esistente

### **Riserve**:
- ✅ Massimo 10 giocatori
- ✅ Slot 11-20 validi
- ✅ Se slot null → auto-trova primo libero
- ✅ Se piene → errore

---

## 🎯 INTEGRAZIONE

### **ScreenshotUpload.jsx**:
- ✅ Mostra `PlayerDestinationSelector` dopo estrazione
- ✅ Gestisce `handleDestinationConfirm`
- ✅ Chiama `addPlayerToRosaWithSlot`

### **rosaService.js**:
- ✅ `addPlayerToRosaInSlot()` - Nuova funzione
- ✅ Gestisce slot specifici
- ✅ Gestisce spostamenti automatici

### **RosaContext.jsx**:
- ✅ Ricarica rosa dopo inserimento
- ✅ Aggiorna stato locale

---

## 📋 CHECKLIST

- [x] Componente PlayerDestinationSelector creato
- [x] Funzione addPlayerToRosaInSlot creata
- [x] Integrazione in ScreenshotUpload
- [x] Gestione slot occupati
- [x] Validazioni complete
- [x] UI/UX completa

---

**Status**: 🟢 **SISTEMA SA DOVE INSERIRE I DATI**

Il sistema ora chiede all'utente dove inserire il giocatore estratto e gestisce correttamente titolari/riserve e slot specifici.
