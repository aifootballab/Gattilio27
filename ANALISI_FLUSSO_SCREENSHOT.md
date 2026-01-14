# 🔍 Analisi Flusso Screenshot → Rosa

## ❌ PROBLEMA IDENTIFICATO

### **Flusso Attuale (ROTTO)**

```
ScreenshotUpload
  ↓
visionService.uploadAndProcessScreenshot()
  ↓
visionService.processScreenshot()
  ↓
supabase.functions.invoke('process-screenshot')  ❌ NON ESISTE PIÙ!
```

**Problema**: `visionService.js` chiama `process-screenshot` che è stata rimossa!

### **Flusso Corretto (DA IMPLEMENTARE)**

#### **Opzione 1: Usare process-screenshot-gpt direttamente**
```
ScreenshotUpload
  ↓
visionService.uploadScreenshot() → Supabase Storage
  ↓
visionService.processScreenshot() → process-screenshot-gpt ✅
  ↓
extracted_data → PlayerDestinationSelector
  ↓
playerService.upsertPlayerBuild()
  ↓
rosaService.addPlayerToRosaInSlot()
  ↓
Rosa aggiornata ✅
```

#### **Opzione 2: Usare GPT Realtime (FUTURO)**
```
ScreenshotUpload
  ↓
gptRealtimeService.sendImage()
  ↓
GPT Realtime analizza → analyze_screenshot function
  ↓
execute-function → functions.analyzeScreenshot()
  ↓
process-screenshot-gpt (o logica diretta)
  ↓
extracted_data → Form precompilato
  ↓
Utente valida → Salva
```

## ✅ COSA FUNZIONA

1. **ScreenshotUpload** ✅
   - Drag & drop funziona
   - Upload a Supabase Storage funziona
   - Preview immagine funziona

2. **PlayerDestinationSelector** ✅
   - Selezione titolare/riserva
   - Selezione posizione
   - Selezione slot

3. **playerService** ✅
   - `searchPlayer()` - Cerca giocatore
   - `upsertPlayerBuild()` - Crea/aggiorna build

4. **rosaService** ✅
   - `addPlayerToRosaInSlot()` - Aggiunge giocatore in slot
   - `createRosa()` - Crea rosa
   - `loadMainRosa()` - Carica rosa

5. **process-screenshot-gpt** ✅
   - Edge function esiste
   - Analizza screenshot con GPT-4o Vision
   - Ritorna candidate profile

## ❌ COSA NON FUNZIONA

1. **visionService.processScreenshot()** ❌
   - Chiama `process-screenshot` che non esiste
   - Deve chiamare `process-screenshot-gpt`

2. **functions.analyzeScreenshot()** ❌
   - Deve esistere in `functions.ts`
   - Deve chiamare `process-screenshot-gpt` o logica diretta

3. **Polling status** ❌
   - `pollProcessingStatus()` è vuoto
   - Deve recuperare log da `screenshot_processing_log`

## 🔧 CORREZIONI NECESSARIE

### **1. Correggere visionService.js**
```javascript
// DA:
const { data, error } = await supabase.functions.invoke('process-screenshot', {

// A:
const { data, error } = await supabase.functions.invoke('process-screenshot-gpt', {
```

### **2. Verificare functions.analyzeScreenshot()**
- Deve esistere in `functions.ts`
- Deve chiamare `process-screenshot-gpt` o implementare logica

### **3. Implementare polling**
```javascript
const pollProcessingStatus = async (logId) => {
  const maxAttempts = 30
  const delay = 2000 // 2 secondi
  
  for (let i = 0; i < maxAttempts; i++) {
    const log = await getProcessingLog(logId)
    
    if (log.processing_status === 'completed') {
      setExtractedData(log.extracted_data)
      setIsProcessing(false)
      return
    }
    
    if (log.processing_status === 'failed') {
      setError(log.error_message || 'Errore durante il processing')
      setIsProcessing(false)
      return
    }
    
    await new Promise(resolve => setTimeout(resolve, delay))
  }
  
  setError('Timeout: il processing sta impiegando troppo tempo')
  setIsProcessing(false)
}
```

### **4. Verificare formato dati**
- `extracted_data` deve avere formato corretto
- Deve essere compatibile con `handleDestinationConfirm()`

## 📋 FLUSSO COMPLETO CORRETTO

```
1. Utente trascina screenshot
   ↓
2. ScreenshotUpload.handleFile()
   ↓
3. visionService.uploadScreenshot() → Supabase Storage
   ↓
4. visionService.processScreenshot() → process-screenshot-gpt
   ↓
5. process-screenshot-gpt:
   - Crea log in screenshot_processing_log
   - Scarica immagine
   - Chiama GPT-4o Vision
   - Salva extracted_data nel log
   ↓
6. ScreenshotUpload.pollProcessingStatus() (o extracted_data immediato)
   ↓
7. Mostra extracted_data all'utente
   ↓
8. Utente clicca "Scegli Destinazione"
   ↓
9. PlayerDestinationSelector:
   - Selezione titolare/riserva
   - Selezione posizione (solo titolari)
   - Selezione slot (solo titolari)
   ↓
10. handleDestinationConfirm():
    - playerService.searchPlayer() → trova player_base
    - playerService.upsertPlayerBuild() → crea build
    - rosaService.addPlayerToRosaInSlot() → aggiunge a rosa
    - loadMainRosa() → ricarica rosa
   ↓
11. Rosa aggiornata ✅
```

## 🎯 PRIORITÀ

1. **URGENTE**: Correggere `visionService.js` per chiamare `process-screenshot-gpt`
2. **URGENTE**: Verificare che `functions.analyzeScreenshot()` esista
3. **IMPORTANTE**: Implementare polling per status
4. **FUTURO**: Integrare GPT Realtime per analisi screenshot
