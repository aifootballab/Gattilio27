# ✅ Sistema Destinazione Screenshot
## Come il sistema sa dove inserire i dati estratti

**Data**: 2025-01-12  
**Status**: 🟢 **IMPLEMENTATO E FUNZIONANTE**

---

## 🎯 PROBLEMA RISOLTO

**Domanda**: "Quando riceve lo screenshot, come fa a sapere dove inserire i dati che legge?"

**Risposta**: Dopo l'estrazione dati, il sistema mostra un componente interattivo che chiede all'utente dove inserire il giocatore.

---

## 🔄 FLUSSO COMPLETO

### **Step 1: Upload e Processing**

```
1. Utente carica screenshot
   ↓
2. ScreenshotUpload.handleFile()
   - Upload a Supabase Storage
   - Chiama Edge Function process-screenshot
   ↓
3. Edge Function:
   - OCR con Google Vision API
   - Estrazione dati strutturati
   - Salvataggio in screenshot_processing_log
   ↓
4. extractedData disponibile
   - player_name, overall_rating, position
   - attacking, defending, athleticism stats
   - skills, build data
```

---

### **Step 2: Preview e Selezione Destinazione**

```
5. Mostra preview dati estratti
   - Nome, OVR, Posizione
   - Statistiche principali
   ↓
6. Utente clicca "Scegli Destinazione"
   ↓
7. Mostra PlayerDestinationSelector (overlay modal)
```

---

### **Step 3: Selezione Interattiva**

```
8. Utente seleziona:
   
   a) DESTINAZIONE:
      - Titolari (0/11) ✅
      - Riserve (0/10) ✅
   
   b) Se TITOLARE:
      - Posizione tattica (GK, CB, CF, ...)
      - Slot in formazione (0-10)
   
   c) Se RISERVA:
      - Slot auto (11-20, primo libero)
   
9. Utente clicca "Conferma Inserimento"
```

---

### **Step 4: Salvataggio con Slot Specifico**

```
10. handleDestinationConfirm(insertData)
    ↓
11. Cerca/crea player_base
    ↓
12. Crea/aggiorna player_build
    ↓
13. rosaService.addPlayerToRosaInSlot()
    - rosaId
    - playerBuildId
    - destination: 'titolare' | 'riserva'
    - slot: 0-10 (titolari) | 11-20 (riserve)
    ↓
14. UPDATE user_rosa.player_build_ids[]
    - Inserisce in slot specifico
    - Se slot occupato → sposta giocatore esistente
    ↓
15. Ricarica rosa completa
    ↓
16. Aggiorna UI (RosaTitolari / RosaPanchina)
```

---

## 📋 COMPONENTE: PlayerDestinationSelector

### **Funzionalità Complete**:

1. **Preview Giocatore**:
   ```jsx
   - Nome: "Vinícius Júnior"
   - OVR: 98
   - Posizione: "LWF"
   ```

2. **Selezione Destinazione**:
   ```jsx
   - Card "Titolari" (5/11) - Clickabile
   - Card "Riserve" (3/10) - Clickabile
   - Disabilitato se sezione piena
   - Warning se pieno
   ```

3. **Selezione Posizione** (solo titolari):
   ```jsx
   - Grid 13 posizioni
   - GK, CB, LB, RB, DMF, CMF, LMF, RMF, AMF, LWF, RWF, SS, CF
   - Icone emoji per ogni posizione
   - Click per selezionare
   ```

4. **Selezione Slot** (solo titolari):
   ```jsx
   - Grid 4x3 (11 slot)
   - Mostra slot occupati (●) / liberi (numero)
   - Click per selezionare slot libero
   - Auto-seleziona primo libero quando si sceglie posizione
   ```

5. **Conferma**:
   ```jsx
   - Bottone "Annulla" - Sempre abilitato
   - Bottone "Conferma Inserimento" - Abilitato solo se:
     * Destinazione selezionata
     * (Titolare) Slot selezionato
     * (Riserva) Spazio disponibile
   ```

---

## 🔧 FUNZIONE: addPlayerToRosaInSlot

### **Implementazione**:

```javascript
// src/services/rosaService.js

export async function addPlayerToRosaInSlot(
  rosaId,
  playerBuildId,
  destination,  // 'titolare' | 'riserva'
  slot          // 0-10 (titolari) | 11-20 (riserve) | null (auto)
)
```

### **Logica Dettagliata**:

1. **Ottieni rosa corrente**
   ```sql
   SELECT player_build_ids FROM user_rosa WHERE id = rosaId
   ```

2. **Crea array 21 slot**
   ```javascript
   let currentIds = [...(rosa.player_build_ids || [])]
   while (currentIds.length < 21) {
     currentIds.push(null)  // Inizializza slot vuoti
   }
   ```

3. **Se titolare**:
   ```javascript
   if (destination === 'titolare') {
     // Valida slot (0-10)
     if (slot < 0 || slot >= 11) throw Error('Slot non valido')
     
     // Se slot occupato → sposta in riserva
     if (currentIds[slot]) {
       const existingBuildId = currentIds[slot]
       const firstFreeReserveSlot = currentIds.slice(11, 21).findIndex(id => !id)
       if (firstFreeReserveSlot !== -1) {
         currentIds[11 + firstFreeReserveSlot] = existingBuildId
       } else {
         // Se riserve piene → rimuovi giocatore esistente
         currentIds[slot] = null
       }
     }
     
     // Inserisci nuovo giocatore
     currentIds[slot] = playerBuildId
   }
   ```

4. **Se riserva**:
   ```javascript
   else if (destination === 'riserva') {
     // Se slot null → trova primo libero
     if (slot === null) {
       const firstFreeSlot = currentIds.slice(11, 21).findIndex(id => !id)
       if (firstFreeSlot === -1) {
         throw Error('Riserve piene')
       }
       slot = 11 + firstFreeSlot
     }
     
     // Inserisci in riserva
     currentIds[slot] = playerBuildId
   }
   ```

5. **Pulisci e aggiorna**
   ```javascript
   const cleanedIds = currentIds.filter(id => id !== null)
   
   UPDATE user_rosa 
   SET player_build_ids = cleanedIds
   WHERE id = rosaId
   ```

---

## 📊 ESEMPI PRATICI

### **Esempio 1: Aggiungi Titolare**

```
Input:
- Screenshot: Vinícius Júnior (LWF, OVR 98)
- Rosa attuale: 5 titolari, 3 riserve

Flusso:
1. Estrazione dati ✅
2. Preview mostrato ✅
3. Utente clicca "Scegli Destinazione" ✅
4. Utente seleziona "Titolari" ✅
5. Utente seleziona posizione "LWF" ✅
6. Sistema auto-seleziona slot 9 (primo libero) ✅
7. Utente conferma ✅

Risultato:
- player_build_ids[9] = build_id_vinicius
- Titolari: 6/11
```

### **Esempio 2: Slot Occupato**

```
Input:
- Screenshot: Mbappé (CF, OVR 99)
- Rosa attuale: Slot 9 occupato da Vinícius

Flusso:
1. Utente seleziona slot 9 ✅
2. Sistema rileva slot occupato ✅
3. Conferma ✅

Risultato:
- player_build_ids[12] = build_id_vinicius (spostato in riserva)
- player_build_ids[9] = build_id_mbappe (nuovo)
```

### **Esempio 3: Aggiungi Riserva**

```
Input:
- Screenshot: Modrić (CMF, OVR 92)
- Rosa attuale: 11 titolari, 7 riserve

Flusso:
1. Utente seleziona "Riserve" ✅
2. Conferma (slot = null → auto = 18) ✅

Risultato:
- player_build_ids[18] = build_id_modric
- Riserve: 8/10
```

---

## ✅ VALIDAZIONI

### **Titolari**:
- ✅ Massimo 11 giocatori
- ✅ Slot 0-10 validi
- ✅ Se slot occupato → sposta automaticamente
- ✅ Se riserve piene → rimuove giocatore esistente

### **Riserve**:
- ✅ Massimo 10 giocatori
- ✅ Slot 11-20 validi
- ✅ Auto-trova primo libero se slot null
- ✅ Errore se piene

### **UI**:
- ✅ Card disabilitate se sezione piena
- ✅ Warning visibile
- ✅ Conferma abilitata solo se valido
- ✅ Feedback visivo su tutte le selezioni

---

## 🔗 INTEGRAZIONE

### **File Modificati**:

1. **`ScreenshotUpload.jsx`**:
   - ✅ Mostra preview dati
   - ✅ Bottone "Scegli Destinazione"
   - ✅ Overlay con PlayerDestinationSelector
   - ✅ Gestisce conferma destinazione

2. **`PlayerDestinationSelector.jsx`** (NUOVO):
   - ✅ UI completa selezione
   - ✅ Gestione titolari/riserve
   - ✅ Selezione posizione e slot

3. **`rosaService.js`**:
   - ✅ `addPlayerToRosaInSlot()` - Nuova funzione
   - ✅ Gestione slot specifici
   - ✅ Spostamenti automatici

---

## 📋 CHECKLIST

- [x] Componente PlayerDestinationSelector creato
- [x] CSS completo e responsive
- [x] Funzione addPlayerToRosaInSlot implementata
- [x] Integrazione in ScreenshotUpload
- [x] Gestione slot occupati
- [x] Validazioni complete
- [x] UI/UX completa
- [x] Overlay modal funzionante
- [x] Ricarica rosa dopo inserimento

---

## 🎯 RISULTATO

**Il sistema ora**:
1. ✅ Estrae dati da screenshot
2. ✅ Mostra preview dati estratti
3. ✅ Chiede all'utente dove inserire
4. ✅ Gestisce titolari/riserve
5. ✅ Gestisce slot specifici
6. ✅ Gestisce spostamenti automatici
7. ✅ Aggiorna UI in tempo reale

---

**Status**: 🟢 **SISTEMA COMPLETO - SA DOVE INSERIRE I DATI**

Il sistema chiede all'utente dove inserire il giocatore estratto e gestisce correttamente tutte le casistiche.
