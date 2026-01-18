# Implementazione Convalida Caricamento

**Data**: 2024  
**Obiettivo**: Aggiungere pulsante "Convalida caricamento" per analizzare e salvare giocatori

---

## ✅ Cosa Abbiamo Già

### Database Supabase
- ✅ **Tabella `players`** con campo `user_id` (FK a `auth.users`)
  - Ogni giocatore salvato è associato all'utente che lo carica
  - RLS (Row Level Security) attivo

### API Routes
- ✅ **`POST /api/supabase/save-player`**
  - Salva giocatore in Supabase con `user_id` dal token
  - Accetta oggetto `player` completo
  - Restituisce `player_id` e `success`

### Frontend
- ✅ **Pagina `/upload`**
  - Caricamento immagini (drag & drop o click)
  - Preview immagini
  - Gestione sessione/autenticazione

---

## ❌ Cosa Manca

### 1. API Estrazione Dati da Immagine
- ❌ **`POST /api/extract-player`**
  - Analizza screenshot con OpenAI Vision
  - Estrae dati giocatore (nome, rating, stats, skills, etc.)
  - Restituisce oggetto `player` completo

### 2. Frontend - Limitazione e Pulsante
- ❌ **Limitare upload a max 3 immagini**
- ❌ **Pulsante "Convalida caricamento"**
- ❌ **Logica**: per ogni immagine → extract → save

---

## 🎯 Piano Implementazione

### Step 1: Creare API `extract-player`

**File**: `app/api/extract-player/route.js`

**Funzionalità**:
- Riceve `imageDataUrl` (base64)
- Chiama OpenAI Vision API (gpt-4o o gpt-4-vision-preview)
- Estrae dati giocatore da screenshot
- Restituisce oggetto `player` strutturato

**Request**:
```json
{
  "imageDataUrl": "data:image/jpeg;base64,..."
}
```

**Response**:
```json
{
  "player": {
    "player_name": "Nome Giocatore",
    "overall_rating": 85,
    "position": "CF",
    "team": "Team Name",
    "base_stats": { ... },
    "skills": [...],
    ...
  }
}
```

---

### Step 2: Limitare Upload a 3 Immagini

**File**: `app/upload/page.jsx`

**Modifica**:
```javascript
const handleFileSelect = (e) => {
  const files = Array.from(e.target.files)
  const imageFiles = files.filter(file => file.type.startsWith('image/'))
  
  // ✅ LIMITE 3 IMMAGINI
  if (imageFiles.length > 3) {
    setError('Puoi caricare massimo 3 immagini')
    return
  }
  
  if (images.length + imageFiles.length > 3) {
    setError(`Puoi caricare massimo 3 immagini. Hai già ${images.length} immagini.`)
    return
  }
  
  // ... resto del codice
}
```

---

### Step 3: Pulsante "Convalida Caricamento"

**File**: `app/upload/page.jsx`

**Funzionalità**:
- Visibile solo se `images.length > 0 && images.length <= 3`
- Al click: per ogni immagine:
  1. Chiama `POST /api/extract-player` con `imageDataUrl`
  2. Riceve `player` dati estratti
  3. Chiama `POST /api/supabase/save-player` con `player` + Bearer token
  4. Mostra progresso (1/3, 2/3, 3/3)
  5. Mostra successo/errore

**Codice**:
```javascript
const handleValidateAndSave = async () => {
  if (images.length === 0) {
    setError('Carica almeno un\'immagine')
    return
  }
  
  if (images.length > 3) {
    setError('Massimo 3 immagini consentite')
    return
  }
  
  setLoading(true)
  setError(null)
  
  try {
    // Ottieni token
    const { data: session } = await supabase.auth.getSession()
    if (!session?.session?.access_token) {
      throw new Error('Sessione non valida')
    }
    const token = session.session.access_token
    
    // Analizza e salva ogni immagine
    for (let i = 0; i < images.length; i++) {
      const img = images[i]
      
      // 1. Estrai dati
      const extractRes = await fetch('/api/extract-player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl: img.dataUrl })
      })
      
      const extractData = await extractRes.json()
      if (!extractRes.ok) {
        throw new Error(extractData.error || 'Errore estrazione dati')
      }
      
      // 2. Salva giocatore
      const saveRes = await fetch('/api/supabase/save-player', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ player: extractData.player })
      })
      
      const saveData = await saveRes.json()
      if (!saveRes.ok) {
        throw new Error(saveData.error || 'Errore salvataggio')
      }
    }
    
    setSuccess(`✅ ${images.length} giocatore/i salvato/i con successo!`)
    setImages([])
  } catch (err) {
    setError(err.message)
  } finally {
    setLoading(false)
  }
}
```

---

## 📋 Checklist

### Backend
- [ ] Creare `app/api/extract-player/route.js`
- [ ] Integrazione OpenAI Vision API
- [ ] Validazione input (imageDataUrl)
- [ ] Gestione errori

### Frontend
- [ ] Limitare upload a max 3 immagini
- [ ] Aggiungere pulsante "Convalida caricamento"
- [ ] Implementare `handleValidateAndSave`
- [ ] Mostrare progresso analisi (1/3, 2/3, 3/3)
- [ ] Gestione errori per singola immagine

### Test
- [ ] Test con 1 immagine
- [ ] Test con 3 immagini
- [ ] Test errore estrazione
- [ ] Test errore salvataggio

---

## 🔐 Variabili Ambiente Necessarie

**Vercel/Production**:
- `OPENAI_API_KEY` - API key OpenAI (server-only)

---

## ✅ Conclusione

**Abbiamo già:**
- ✅ Tabella `players` con `user_id`
- ✅ API `save-player` funzionante
- ✅ Frontend upload base

**Dobbiamo creare:**
- ❌ API `extract-player` (OpenAI Vision)
- ❌ Limitazione 3 immagini
- ❌ Pulsante convalida

**Flow finale:**
```
Cliente carica 1-3 immagini
  ↓
Click "Convalida caricamento"
  ↓
Per ogni immagine:
  1. extract-player → OpenAI Vision → dati giocatore
  2. save-player → Supabase → salva con user_id
  ↓
Successo: "N giocatori salvati"
```

---

**Ready to implement**: ✅
