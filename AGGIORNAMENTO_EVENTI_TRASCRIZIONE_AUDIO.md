# 🎤 Aggiornamento Eventi Trascrizione Audio
## Aggiunta gestione eventi audio Realtime API

**Data**: 2025-01-14  
**Status**: 🔴 **DA IMPLEMENTARE**

---

## 📚 DOCUMENTAZIONE OPENAI

Secondo la documentazione ufficiale OpenAI Realtime API, ci sono eventi specifici per la trascrizione audio:

### **Eventi Input Audio (Utente parla)**:

1. **`input_audio_transcription.completed`**
   - Emesso quando l'audio dell'utente viene trascritto
   - Contiene il testo completo trascritto
   - Utile per mostrare all'utente cosa ha detto

2. **`input_audio_transcription.failed`**
   - Emesso se la trascrizione fallisce
   - Contiene dettagli errore

### **Eventi Response Audio (GPT parla)**:

1. **`response.audio_transcript.done`**
   - Emesso quando l'audio della risposta viene trascritto (se abilitato)
   - Utile per mostrare trascrizione della risposta vocale

---

## ❌ PROBLEMA ATTUALE

**Eventi gestiti**:
- ✅ `session.created`
- ✅ `response.text.delta`
- ✅ `response.text.done`
- ✅ `response.function_call`
- ✅ `error`

**Eventi mancanti**:
- ❌ `input_audio_transcription.completed` - Trascrizione audio utente
- ❌ `input_audio_transcription.failed` - Errore trascrizione
- ❌ `response.audio_transcript.done` - Trascrizione risposta (opzionale)

---

## ✅ SOLUZIONE

### **1. Aggiungere Callback per Trascrizione**

```javascript
// Nuovo callback per trascrizione audio utente
onAudioTranscription: ((text: string) => void) | null = null
```

### **2. Gestire Eventi nel handleMessage**

```javascript
case 'input_audio_transcription.completed':
  // Trascrizione audio utente completata
  if (this.onAudioTranscription && event?.text) {
    this.onAudioTranscription(event.text)
  }
  break

case 'input_audio_transcription.failed':
  // Errore trascrizione
  if (this.onError) {
    this.onError(new Error(`Audio transcription failed: ${event.error}`))
  }
  break

case 'response.audio_transcript.done':
  // Trascrizione risposta audio (opzionale)
  console.log('🎤 Response audio transcribed:', event.text)
  break
```

### **3. Mostrare Trascrizione in UI**

- Mostrare trascrizione in tempo reale mentre utente parla
- Mostrare errore se trascrizione fallisce
- Opzionale: mostrare trascrizione risposta audio

---

## 🎯 BENEFICI

1. **Feedback Utente**:
   - Utente vede cosa ha detto mentre parla
   - Migliore UX (come ChatGPT voice)

2. **Debug**:
   - Possiamo vedere se audio viene trascritto correttamente
   - Identificare problemi di qualità audio

3. **Accessibilità**:
   - Utenti possono vedere trascrizione se preferiscono leggere

---

## 📋 IMPLEMENTAZIONE

### **File da Modificare**:

1. **`services/realtimeCoachingServiceV2.js`**
   - Aggiungere callback `onAudioTranscription`
   - Gestire eventi trascrizione in `handleMessage()`

2. **`components/coaching/VoiceCoachingPanel.jsx`**
   - Mostrare trascrizione in UI
   - Aggiornare messaggio utente con trascrizione

---

**Status**: 🔴 **DA IMPLEMENTARE** - Aggiungere gestione eventi trascrizione
