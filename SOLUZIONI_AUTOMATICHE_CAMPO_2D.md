# Soluzioni Automatiche: Campo 2D da Screenshot Completo

**Data**: 24 Gennaio 2026  
**Vincolo**: Cliente carica screenshot completo eFootball (con menu), non possiamo chiedere screenshot precisi.

---

## 1. SOLUZIONI AUTOMATICHE (senza intervento cliente)

### Opzione A: Crop Automatico AI (GPT-4 Vision) ⭐ RACCOMANDATO

**Cosa**: AI analizza screenshot e trova automaticamente area campo, poi crop.

**Come funziona**:
1. Cliente carica screenshot completo
2. Sistema invia a GPT-4 Vision API
3. AI trova coordinate area campo (x1, y1, x2, y2) nell'immagine
4. Sistema crop automaticamente solo area campo
5. Salva immagine croppata
6. Coordinate percentuali funzionano direttamente ✅

**Implementazione**:
```javascript
// Endpoint: /api/detect-field-area
const prompt = `Analizza questo screenshot di eFootball. 
Trova l'area del campo da calcio (escludi menu laterali, barre UI).
Restituisci coordinate bounding box in percentuali:
{
  "field_area": {
    "x1": 20,  // % da sinistra
    "y1": 10,  // % dall'alto
    "x2": 80,  // % da sinistra
    "y2": 90   // % dall'alto
  }
}`

// Dopo detection, crop immagine
const croppedImage = cropImage(originalImage, x1, y1, x2, y2)
```

**Difficoltà**: ⭐⭐⭐ (media)
**Tempo**: 3-4 ore
**Rischio**: 🟡 Medio (accuratezza AI ~90-95%)

**Pro**:
- Zero intervento cliente
- Funziona automaticamente
- Coordinate funzionano dopo crop

**Contro**:
- Costo API (~$0.01-0.02 per immagine)
- Potrebbe fallire su screenshot particolari
- Richiede endpoint API dedicato

---

### Opzione B: Calibrazione Manuale Semplice (2 click)

**Cosa**: Cliente clicca solo 2 punti (angoli campo) invece di 4.

**Come funziona**:
1. Cliente carica screenshot completo
2. Sistema mostra immagine con overlay
3. Cliente clicca: **angolo superiore sinistro campo** e **angolo inferiore destro campo**
4. Sistema calcola area campo e crop
5. Salva immagine croppata

**Implementazione**:
```javascript
const [click1, click2, setClick1, setClick2] = React.useState(null, null)

// Al click su immagine
const handleImageClick = (e) => {
  const rect = e.currentTarget.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * 100
  const y = ((e.clientY - rect.top) / rect.height) * 100
  
  if (!click1) {
    setClick1({ x, y })
  } else if (!click2) {
    setClick2({ x, y })
    // Calcola area e crop
    cropField(click1, { x, y })
  }
}
```

**Difficoltà**: ⭐⭐ (bassa-media)
**Tempo**: 2-3 ore
**Rischio**: 🟢 Basso (controllo cliente)

**Pro**:
- Solo 2 click (veloce)
- Cliente ha controllo
- Funziona sempre

**Contro**:
- Richiede intervento cliente (minimo)
- UX leggermente più complessa

---

### Opzione C: Rilevamento Automatico Bordi (Computer Vision Semplice)

**Cosa**: Algoritmo trova bordi campo automaticamente (senza AI).

**Come funziona**:
1. Cliente carica screenshot
2. Sistema analizza immagine (edge detection, color analysis)
3. Trova area verde scuro (campo) vs area scura (menu)
4. Calcola bounding box campo
5. Crop automatico

**Implementazione**:
```javascript
// Usa Canvas API per analisi pixel
const detectFieldArea = (imageData) => {
  // Trova pixel verdi (campo) vs neri/grigi (menu)
  // Calcola bounding box area verde
  // Ritorna coordinate
}
```

**Difficoltà**: ⭐⭐⭐⭐ (alta)
**Tempo**: 6-8 ore
**Rischio**: 🟡 Medio (potrebbe fallire su screenshot particolari)

**Pro**:
- Zero costo API
- Zero intervento cliente
- Funziona offline

**Contro**:
- Complesso da implementare
- Potrebbe fallire su screenshot con colori simili
- Meno robusto di AI

---

### Opzione D: Trasformazione Coordinate (senza crop)

**Cosa**: Non crop immagine, ma trasforma coordinate per adattarsi all'area campo.

**Come funziona**:
1. Cliente carica screenshot completo
2. Sistema rileva area campo (AI o 2 click)
3. Salva parametri trasformazione (offset, scale)
4. Quando posiziona giocatori, trasforma coordinate:
   - `x_new = (x_old * scale_x) + offset_x`
   - `y_new = (y_old * scale_y) + offset_y`

**Implementazione**:
```javascript
// Salva parametri in formation_layout
{
  field_background_image: "url...",
  field_transform: {
    offset_x: 20,  // % menu sinistro
    offset_y: 10,  // % menu superiore
    scale_x: 60,   // % larghezza campo
    scale_y: 80    // % altezza campo
  }
}

// Quando posiziona giocatore
const transformCoordinate = (x, y, transform) => {
  return {
    x: (x * transform.scale_x / 100) + transform.offset_x,
    y: (y * transform.scale_y / 100) + transform.offset_y
  }
}
```

**Difficoltà**: ⭐⭐⭐ (media)
**Tempo**: 4-5 ore
**Rischio**: 🟡 Medio (più complesso)

**Pro**:
- Mantiene immagine originale
- Funziona con qualsiasi screenshot
- Cliente vede screenshot completo

**Contro**:
- Più complesso (trasformazione coordinate)
- Richiede calcolo per ogni posizione
- Potrebbe essere confuso

---

## 2. RACCOMANDAZIONE: Opzione A (Crop AI) + Fallback Opzione B (2 click)

### Perché questa combinazione

**Opzione A (primaria)**:
- Funziona automaticamente per ~90-95% dei casi
- Zero intervento cliente
- UX migliore

**Opzione B (fallback)**:
- Se AI fallisce o cliente non soddisfatto
- Solo 2 click (veloce)
- Controllo totale

**Flusso**:
1. Cliente carica screenshot
2. Sistema prova crop automatico AI
3. Mostra preview immagine croppata
4. Se cliente non soddisfatto → mostra opzione "Calibra manualmente" (2 click)
5. Salva immagine croppata (da AI o manuale)

---

## 3. IMPLEMENTAZIONE DETTAGLIATA (Opzione A)

### 3.1 Endpoint API: Detect Field Area

**File**: `app/api/detect-field-area/route.js`

```javascript
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(req) {
  const { imageBase64 } = await req.json()
  
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Analizza questo screenshot di eFootball. 
Trova l'area del campo da calcio (escludi menu laterali, barre UI, informazioni in basso).
Il campo è l'area verde centrale con giocatori posizionati.
Restituisci SOLO JSON con coordinate bounding box in percentuali (0-100):
{
  "field_area": {
    "x1": 20,  // % da sinistra (inizio campo)
    "y1": 10,  // % dall'alto (inizio campo)
    "x2": 80,  // % da sinistra (fine campo)
    "y2": 90   // % dall'alto (fine campo)
  }
}`
        },
        {
          type: 'image_url',
          image_url: { url: `data:image/png;base64,${imageBase64}` }
        }
      ]
    }],
    max_tokens: 200
  })
  
  const result = JSON.parse(response.choices[0].message.content)
  return NextResponse.json(result)
}
```

### 3.2 Frontend: Upload + Crop Automatico

**File**: `app/gestione-formazione/page.jsx`

```javascript
const [fieldImageFile, setFieldImageFile] = React.useState(null)
const [fieldImagePreview, setFieldImagePreview] = React.useState(null)
const [fieldImageCropped, setFieldImageCropped] = React.useState(null)
const [detectingField, setDetectingField] = React.useState(false)

const handleFieldImageUpload = async (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  
  // Preview originale
  const reader = new FileReader()
  reader.onload = (e) => {
    setFieldImagePreview(e.target.result)
    setFieldImageFile(file)
    
    // Auto-detect e crop
    detectAndCropField(e.target.result)
  }
  reader.readAsDataURL(file)
}

const detectAndCropField = async (imageBase64) => {
  setDetectingField(true)
  try {
    // 1. Detect area campo
    const detectRes = await fetch('/api/detect-field-area', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: imageBase64.split(',')[1] })
    })
    const { field_area } = await detectRes.json()
    
    // 2. Crop immagine
    const cropped = await cropImage(imageBase64, field_area)
    setFieldImageCropped(cropped)
  } catch (err) {
    console.error('Error detecting field:', err)
    // Fallback: mostra opzione calibrazione manuale
  } finally {
    setDetectingField(false)
  }
}

const cropImage = (imageBase64, area) => {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      const x1 = (area.x1 / 100) * img.width
      const y1 = (area.y1 / 100) * img.height
      const x2 = (area.x2 / 100) * img.width
      const y2 = (area.y2 / 100) * img.height
      
      canvas.width = x2 - x1
      canvas.height = y2 - y1
      
      ctx.drawImage(img, x1, y1, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height)
      
      resolve(canvas.toDataURL('image/png'))
    }
    img.src = imageBase64
  })
}
```

### 3.3 Salvataggio

**Modificare `handleSelectManualFormation`**:
```javascript
const handleSelectManualFormation = async (formation, slotPositions, fieldBackgroundImage = null) => {
  // ... codice esistente ...
  
  body: JSON.stringify({
    formation: formation || 'Personalizzato',
    slot_positions: slotPositions || layout?.slot_positions,
    field_background_image: fieldBackgroundImage, // Immagine croppata
    preserve_slots: preserveSlots
  })
}
```

---

## 4. COSTI E PERFORMANCE

### Costo API GPT-4 Vision

**Per immagine**:
- Input: ~$0.01-0.02 (screenshot ~1MB)
- Output: ~$0.0001 (JSON piccolo)
- **Totale**: ~$0.01-0.02 per upload campo

**Impatto**: Basso (solo quando cliente carica campo, non ad ogni caricamento)

### Performance

- **Tempo detection**: ~2-5 secondi (API OpenAI)
- **Tempo crop**: <1 secondo (client-side)
- **Totale**: ~3-6 secondi per upload completo

---

## 5. FALLBACK: Calibrazione Manuale (2 click)

**Se AI fallisce o cliente non soddisfatto**:

```jsx
{fieldImagePreview && !fieldImageCropped && (
  <div>
    <p>Clicca 2 punti per definire area campo:</p>
    <p>1. Angolo superiore sinistro campo</p>
    <p>2. Angolo inferiore destro campo</p>
    
    <div 
      style={{ position: 'relative' }}
      onClick={handleManualCalibration}
    >
      <img src={fieldImagePreview} style={{ width: '100%' }} />
      {click1 && (
        <div style={{
          position: 'absolute',
          left: `${click1.x}%`,
          top: `${click1.y}%`,
          width: '10px',
          height: '10px',
          background: 'red',
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)'
        }} />
      )}
    </div>
  </div>
)}
```

---

## 6. RISCHI E MITIGAZIONI

### ⚠️ Rischio: Accuratezza AI

**Problema**: AI potrebbe non trovare correttamente area campo.

**Mitigazione**:
- Fallback a calibrazione manuale (2 click)
- Validazione: se area trovata è troppo piccola/grande → avviso
- Preview prima di salvare (cliente verifica)

### ✅ Sicuro: Coordinate dopo crop

**Perché**: Dopo crop, immagine = campo full-size → coordinate percentuali funzionano direttamente.

---

## 7. CHECKLIST IMPLEMENTAZIONE

### Backend
- [ ] Creare endpoint `/api/detect-field-area` (GPT-4 Vision)
- [ ] Modificare `save-formation-layout` per accettare `field_background_image`
- [ ] Aggiungere colonna `field_background_image` a `formation_layout` (Supabase)

### Frontend - Modal
- [ ] Aggiungere tab "Campo Personalizzato"
- [ ] Upload immagine
- [ ] Chiamata API detect-field-area
- [ ] Crop automatico immagine
- [ ] Preview immagine croppata
- [ ] Fallback calibrazione manuale (2 click) se AI fallisce
- [ ] Salvataggio immagine croppata

### Frontend - Render Campo
- [ ] Usare `field_background_image` come background se presente
- [ ] Fallback a CSS default se null

### UX
- [ ] Loading state durante detection
- [ ] Preview prima di confermare
- [ ] Messaggio "Campo rilevato automaticamente" o "Calibra manualmente"
- [ ] Traduzioni i18n

---

## 8. CONCLUSIONE

**Soluzione raccomandata**: **Opzione A (Crop AI) + Fallback B (2 click)**

**Vantaggi**:
- ✅ Funziona automaticamente per la maggior parte dei casi
- ✅ Zero istruzioni al cliente (carica screenshot completo)
- ✅ Fallback sempre disponibile (2 click se necessario)
- ✅ Coordinate funzionano dopo crop

**Tempo implementazione**: 4-5 ore
**Rischio**: 🟡 Medio (mitigato da fallback)

---

**Nessuna modifica applicata.** Questo documento è solo proposta.
