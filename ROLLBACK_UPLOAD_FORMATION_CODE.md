# 🔄 ROLLBACK: Codice Upload Formazione da Screenshot

**Data**: 26 Gennaio 2026  
**File**: `app/gestione-formazione/page.jsx`  
**Scopo**: Ripristino esatto del codice rimosso per upload formazione da screenshot

---

## ⚠️ IMPORTANTE

Questo documento contiene il codice **ESATTO** da ripristinare in caso di rotture dopo la rimozione.

**Ordine di ripristino**:
1. State `showUploadFormationModal` (riga 26)
2. Funzione `handleUploadFormation` (riga 1022-1112)
3. Pulsante "Importa da Screenshot" (riga 1891-1898)
4. Modal UploadFormation JSX (riga 2278-2286)
5. Componente `UploadModal` (riga 2365-2490)

---

## 📋 CODICE DA RIPRISTINARE

### **1. State `showUploadFormationModal`** (Dopo riga 25)

**Posizione**: Dopo `const [showFormationSelectorModal, setShowFormationSelectorModal] = React.useState(false)`

**Codice da inserire**:
```javascript
  const [showUploadFormationModal, setShowUploadFormationModal] = React.useState(false)
```

**Contesto completo** (righe 25-28):
```javascript
  const [showFormationSelectorModal, setShowFormationSelectorModal] = React.useState(false)
  const [showUploadFormationModal, setShowUploadFormationModal] = React.useState(false)
  const [showUploadReserveModal, setShowUploadReserveModal] = React.useState(false)
  const [uploadingFormation, setUploadingFormation] = React.useState(false)
```

---

### **2. Funzione `handleUploadFormation`** (Dopo riga 1021)

**Posizione**: Dopo `handleSaveTacticalSettings` e prima di `handleSelectManualFormation`

**Codice completo da inserire**:
```javascript
  const handleUploadFormation = async (imageDataUrl) => {
    setUploadingFormation(true)
    setError(null)

    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.access_token) {
        throw new Error('Sessione scaduta')
      }

      const token = session.session.access_token

      // 1. Estrai formazione
      const extractRes = await fetch('/api/extract-formation', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ imageDataUrl })
      })

      const extractData = await extractRes.json()
      if (!extractRes.ok) {
        const errorMsg = extractData.error || 'Errore estrazione formazione'
        // Se c'è un errore di quota OpenAI, mostralo chiaramente
        if (errorMsg.includes('quota') || errorMsg.includes('billing')) {
          throw new Error('Quota OpenAI esaurita. Controlla il tuo piano e i dettagli di fatturazione su https://platform.openai.com/account/billing')
        }
        throw new Error(errorMsg)
      }

      if (!extractData.formation) {
        throw new Error(t('formationExtractionFailed'))
      }

      // Completa slot mancanti
      const completeSlotPositions = (slotPositions) => {
        const complete = { ...(slotPositions || {}) }
        const defaultPositions = {
          0: { x: 50, y: 90, position: 'PT' },
          1: { x: 20, y: 70, position: 'DC' },
          2: { x: 40, y: 70, position: 'DC' },
          3: { x: 60, y: 70, position: 'DC' },
          4: { x: 80, y: 70, position: 'DC' },
          5: { x: 30, y: 50, position: 'MED' },
          6: { x: 50, y: 50, position: 'MED' },
          7: { x: 70, y: 50, position: 'MED' },
          8: { x: 25, y: 25, position: 'SP' },
          9: { x: 50, y: 25, position: 'CF' },
          10: { x: 75, y: 25, position: 'SP' }
        }
        for (let i = 0; i <= 10; i++) {
          if (!complete[i]) {
            complete[i] = defaultPositions[i] || { x: 50, y: 50, position: '?' }
          }
        }
        return complete
      }

      const slotPositions = completeSlotPositions(extractData.slot_positions)

      // 2. Salva layout
      const layoutRes = await fetch('/api/supabase/save-formation-layout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          formation: extractData.formation,
          slot_positions: slotPositions
        })
      })

      const layoutData = await layoutRes.json()
      if (!layoutRes.ok) {
        throw new Error(layoutData.error || 'Errore salvataggio layout')
      }

      setShowUploadFormationModal(false)
      
      // Ricarica dati senza reload pagina
      await fetchData()
    } catch (err) {
      console.error('[GestioneFormazione] Upload formation error:', err)
      setError(err.message || 'Errore caricamento formazione')
    } finally {
      setUploadingFormation(false)
    }
  }
```

**Contesto**: Inserire dopo la chiusura di `handleSaveTacticalSettings` e prima di `handleSelectManualFormation`

---

### **3. Pulsante "Importa da Screenshot"** (Dopo riga 1890)

**Posizione**: Dopo il pulsante "Crea Formazione" e prima della chiusura del div

**Codice completo da inserire**:
```javascript
            <button
              onClick={() => setShowUploadFormationModal(true)}
              className="btn"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Upload size={16} />
              {t('importFromScreenshot')}
            </button>
```

**Contesto completo** (righe 1884-1899):
```javascript
            <button
              onClick={() => setShowFormationSelectorModal(true)}
              className="btn primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Settings size={16} />
              {t('createFormationBtn')}
            </button>
            <button
              onClick={() => setShowUploadFormationModal(true)}
              className="btn"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Upload size={16} />
              {t('importFromScreenshot')}
            </button>
          </div>
```

---

### **4. Modal UploadFormation JSX** (Dopo riga 2276)

**Posizione**: Dopo `FormationSelectorModal` e prima di `Modal Upload Riserva`

**Codice completo da inserire**:
```javascript
      {/* Modal Upload Formazione (Opzione Avanzata) */}
      {showUploadFormationModal && (
        <UploadModal
          title="Importa Formazione da Screenshot"
          description="Carica uno screenshot della formazione completa (11 giocatori sul campo). Questa opzione estrae automaticamente formazione e posizioni."
          onUpload={handleUploadFormation}
          onClose={() => setShowUploadFormationModal(false)}
          uploading={uploadingFormation}
        />
      )}
```

**Contesto completo** (righe 2268-2288):
```javascript
      {/* Modal Selezione Formazione Manuale */}
      {showFormationSelectorModal && (
        <FormationSelectorModal
          onSelect={handleSelectManualFormation}
          onClose={() => setShowFormationSelectorModal(false)}
          loading={uploadingFormation}
        />
      )}

      {/* Modal Upload Formazione (Opzione Avanzata) */}
      {showUploadFormationModal && (
        <UploadModal
          title="Importa Formazione da Screenshot"
          description="Carica uno screenshot della formazione completa (11 giocatori sul campo). Questa opzione estrae automaticamente formazione e posizioni."
          onUpload={handleUploadFormation}
          onClose={() => setShowUploadFormationModal(false)}
          uploading={uploadingFormation}
        />
      )}

      {/* Modal Upload Riserva */}
```

---

### **5. Componente `UploadModal`** (Dopo riga 2364)

**Posizione**: Dopo l'ultima funzione prima di `SlotCard` component

**Codice completo da inserire**:
```javascript
function UploadModal({ title, description, onUpload, onClose, uploading }) {
  const { t } = useTranslation()
  const [image, setImage] = React.useState(null)
  const [preview, setPreview] = React.useState(null)

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) {
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target.result
      setPreview(dataUrl)
      setImage({ file, dataUrl })
    }
    reader.readAsDataURL(file)
  }

  const handleConfirm = () => {
    if (image?.dataUrl) {
      onUpload(image.dataUrl)
    }
  }

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '24px'
      }}
      onClick={onClose}
    >
      <div 
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '500px',
          width: '100%',
          padding: '24px',
          background: 'rgba(10, 14, 39, 0.95)',
          border: '2px solid var(--neon-blue)'
        }}
      >
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', marginTop: 0 }}>
          {title}
        </h2>
        <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '20px' }}>
          {description}
        </div>

        {!preview ? (
          <label style={{
            display: 'block',
            padding: '32px',
            border: '2px dashed rgba(0, 212, 255, 0.3)',
            borderRadius: '8px',
            textAlign: 'center',
            cursor: 'pointer',
            background: 'rgba(0, 212, 255, 0.05)'
          }}>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              disabled={uploading}
            />
              <Upload size={32} style={{ marginBottom: '12px', color: 'var(--neon-blue)' }} />
              <div style={{ fontSize: '14px' }}>Clicca per selezionare immagine</div>
              <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '8px' }}>
                Formati supportati: JPG, PNG
              </div>
          </label>
        ) : (
          <div style={{ marginBottom: '20px' }}>
            <img
              src={preview}
              alt="Preview"
              style={{
                width: '100%',
                maxHeight: '300px',
                objectFit: 'contain',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button 
            onClick={onClose} 
            className="btn"
            disabled={uploading}
            style={{ padding: '10px 20px' }}
          >
            Annulla
          </button>
          {preview && (
            <button 
              onClick={handleConfirm} 
              className="btn primary"
              disabled={uploading}
              style={{ 
                padding: '10px 20px',
                opacity: uploading ? 0.6 : 1
              }}
            >
              {uploading ? t('loading') : t('upload')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

**Nota**: Il componente usa `useTranslation()` per accedere a `t()`. Assicurarsi che `useTranslation` sia importato (già presente in riga 6).

**Contesto**: Inserire prima di `SlotCard` component (circa riga 2492)

---

## ✅ VERIFICHE POST-RIPRISTINO

Dopo il ripristino, verificare:

1. ✅ **State**: `showUploadFormationModal` è dichiarato
2. ✅ **Funzione**: `handleUploadFormation` è definita e accessibile
3. ✅ **Pulsante**: "Importa da Screenshot" appare nell'UI
4. ✅ **Modal**: Si apre correttamente quando si clicca il pulsante
5. ✅ **Componente**: `UploadModal` è definito e funzionante
6. ✅ **Import**: Icona `Upload` è importata (già presente in riga 8)

---

## 🔍 DIPENDENZE

### **Import già presenti** (NON modificare):
- ✅ `Upload` icon da `lucide-react` (riga 8)
- ✅ `React` (riga 3)
- ✅ `supabase` (riga 5)
- ✅ `useTranslation` (riga 6)

### **Funzioni dipendenti** (già presenti):
- ✅ `fetchData()` - Usata in `handleUploadFormation`
- ✅ `setError()` - Usata in `handleUploadFormation`
- ✅ `setUploadingFormation()` - Usata in `handleUploadFormation`
- ✅ `t()` - Usata in `handleUploadFormation` e `UploadModal`

### **API Endpoints** (già esistenti):
- ✅ `/api/extract-formation` - Usato in `handleUploadFormation`
- ✅ `/api/supabase/save-formation-layout` - Usato in `handleUploadFormation`

---

## 📝 NOTE IMPORTANTI

1. **Icona Upload**: L'icona `Upload` è già importata in riga 8, quindi non serve modificare gli import.

2. **State `uploadingFormation`**: Questo state è **MANTENUTO** anche dopo la rimozione perché usato da altre funzioni. Non serve ripristinarlo.

3. **Ordine di inserimento**: Seguire l'ordine indicato per evitare errori di sintassi.

4. **Test dopo ripristino**: 
   - Cliccare pulsante "Importa da Screenshot"
   - Verificare che il modal si apra
   - Verificare che l'upload funzioni
   - Verificare che il layout venga salvato

---

## 🚨 SE QUALCOSA NON FUNZIONA

1. **Errore "showUploadFormationModal is not defined"**:
   - Verificare che lo state sia dichiarato dopo riga 25

2. **Errore "handleUploadFormation is not defined"**:
   - Verificare che la funzione sia definita prima di essere usata nel JSX

3. **Errore "UploadModal is not defined"**:
   - Verificare che il componente sia definito prima di essere usato nel JSX

4. **Modal non si apre**:
   - Verificare che `showUploadFormationModal` sia settato a `true` nel pulsante

5. **Errore "t is not defined" in UploadModal**:
   - Passare `t` come prop al componente o usare stringhe hardcoded

---

**Documento creato**: 26 Gennaio 2026  
**Versione**: 1.0  
**Stato**: Pronto per rollback
