# Proposta Implementazione: Caricamento Foto 2D Campo

**Data**: 24 Gennaio 2026  
**Obiettivo**: Permettere al cliente di caricare foto 2D del campo nel modal "Cambia Formazione"

---

## 1. DOVE INSERIRE: Nel Modal "Cambia Formazione"

### Struttura attuale modal
```
FormationSelectorModal
├── Header (Titolo + X)
├── Descrizione
├── Tab: [Base] [Variazioni]
├── Ricerca
├── Lista formazioni (griglia o raggruppata)
└── Pulsanti: [Annulla] [Conferma]
```

### Proposta: Aggiungere Tab "Campo Personalizzato"

**NUOVA struttura**:
```
FormationSelectorModal
├── Header (Titolo + X)
├── Descrizione
├── Tab: [Base] [Variazioni] [Campo Personalizzato] ← NUOVO
├── 
│   TAB BASE/VARIAZIONI (esistente):
│   ├── Ricerca
│   └── Lista formazioni
│
│   TAB CAMPO PERSONALIZZATO (nuovo):
│   ├── Upload foto campo 2D
│   ├── Preview immagine caricata
│   ├── Istruzioni: "Carica screenshot campo eFootball. Le posizioni si adeguano automaticamente."
│   └── Pulsante "Usa questo campo"
└── Pulsanti: [Annulla] [Conferma]
```

**Alternativa (più semplice)**: Aggiungere opzione **sopra i tab**:
```
FormationSelectorModal
├── Header
├── Descrizione
├── [📷 Carica Campo 2D] ← Pulsante opzionale sopra i tab
├── Tab: [Base] [Variazioni]
└── ...
```

**Raccomandazione**: **Tab separato** (più chiaro, non confonde con formazioni predefinite).

---

## 2. COME GESTIRE: Flusso completo

### 2.1 Upload immagine

**Dove**: Tab "Campo Personalizzato" nel modal

**UI**:
```jsx
<Tab "Campo Personalizzato">
  <div>
    <h3>Carica Foto Campo 2D</h3>
    <p>Carica uno screenshot del campo eFootball. Le posizioni dei giocatori si adeguano automaticamente.</p>
    
    {!fieldImage ? (
      <label>
        <input type="file" accept="image/*" onChange={handleFieldImageUpload} />
        <button>📷 Carica Foto Campo</button>
      </label>
    ) : (
      <div>
        <img src={fieldImage.preview} alt="Campo caricato" />
        <button onClick={removeFieldImage}>Rimuovi</button>
      </div>
    )}
  </div>
</Tab>
```

### 2.2 Salvataggio

**Backend**: Modificare `save-formation-layout` per accettare `field_background_image` (opzionale)

**Schema DB**: Aggiungere campo `field_background_image` (TEXT o JSONB) a `formation_layout`

**Flusso**:
1. Cliente carica foto → converti in base64 o salva URL
2. Quando conferma formazione → invia anche `field_background_image`
3. Backend salva in `formation_layout.field_background_image`
4. Frontend visualizza come background se presente

### 2.3 Visualizzazione campo

**Dove**: Nella pagina gestione-formazione, render campo (righe 1384-1576)

**Modifica**:
```jsx
// PRIMA: Background CSS hardcoded
<div style={{ background: 'linear-gradient(...)' }}>

// DOPO: Background immagine se presente, altrimenti CSS default
<div style={{ 
  background: layout.field_background_image 
    ? `url(${layout.field_background_image}) center/cover no-repeat`
    : 'linear-gradient(...)'
}}>
```

---

## 3. COME SI ADEGUANO LE POSIZIONI?

### ✅ FUNZIONA se campo è full-size

**Perché**: Le coordinate percentuali (0-100) sono **relative al container**, non al background.

**Esempio**:
- Container campo: `width: 600px, height: 900px`
- Giocatore portiere: `x: 50, y: 90` → `left: 50%` (300px), `top: 90%` (810px)
- **Se background immagine copre tutto il container** → posizione corretta ✅

**Condizione necessaria**: 
- Immagine campo deve essere **full-size** nel container (no bordi, no menu laterali)
- O usare `background-size: cover` per coprire tutto

### ⚠️ PROBLEMA se campo ha bordi/menu

**Scenario**:
- Cliente carica screenshot eFootball completo (con menu laterali, UI)
- Campo reale è **centrato** con bordi attorno
- Coordinate `x: 50, y: 90` puntano a **centro container** (menu laterale) invece che porta

**Soluzione necessaria**:
1. **Opzione A (semplice)**: Istruzioni chiare "Carica solo area campo, senza menu"
2. **Opzione B (calibrazione)**: Cliente clicca 4 punti (porte, centrocampo) per calibrare
3. **Opzione C (AI)**: AI trova automaticamente area campo e crop

**Raccomandazione iniziale**: **Opzione A** (istruzioni + `object-fit: cover`)

---

## 4. IMPLEMENTAZIONE DETTAGLIATA

### 4.1 Modifiche DB (Supabase)

**Tabella**: `formation_layout`

**Aggiungere colonna**:
```sql
ALTER TABLE formation_layout 
ADD COLUMN field_background_image TEXT;
```

**Tipo**: TEXT (URL o base64) o JSONB (se vogliamo metadati aggiuntivi)

### 4.2 Modifiche Backend

**File**: `app/api/supabase/save-formation-layout/route.js`

**Modifiche**:
```javascript
// PRIMA
const { formation, slot_positions, preserve_slots } = await req.json()

// DOPO
const { formation, slot_positions, preserve_slots, field_background_image } = await req.json()

// Salvataggio
.upsert({
  user_id: userId,
  formation: String(formation).trim(),
  slot_positions: completeSlots,
  field_background_image: field_background_image || null, // ← NUOVO
  updated_at: new Date().toISOString()
}, {
  onConflict: 'user_id'
})
```

### 4.3 Modifiche Frontend - Modal

**File**: `app/gestione-formazione/page.jsx`

**Aggiungere**:
1. **Tab "Campo Personalizzato"** (dopo tab Variazioni)
2. **State** per immagine campo caricata
3. **Handler** upload immagine
4. **Preview** immagine
5. **Passare** `field_background_image` a `onSelect`

### 4.4 Modifiche Frontend - Render Campo

**File**: `app/gestione-formazione/page.jsx`, righe 1384-1576

**Modificare background**:
```jsx
// Leggi field_background_image da layout
const fieldBackground = layout?.field_background_image

<div style={{ 
  // ... stili esistenti
  background: fieldBackground 
    ? `url(${fieldBackground}) center/cover no-repeat, linear-gradient(...)` // Immagine + fallback
    : `linear-gradient(...)` // Default CSS
}}>
```

---

## 5. FLUSSO UTENTE COMPLETO

### Scenario: Cliente vuole usare campo personalizzato

1. **Apre modal "Cambia Formazione"**
2. **Clicca tab "Campo Personalizzato"**
3. **Carica foto campo 2D** (screenshot eFootball)
4. **Vede preview** dell'immagine caricata
5. **Clicca "Conferma Formazione"**
6. **Sistema salva**:
   - Formazione: "Personalizzato" (o nome scelto)
   - `slot_positions`: Usa quelli esistenti (o default)
   - `field_background_image`: URL/base64 immagine
7. **Campo si aggiorna** con immagine caricata
8. **Giocatori** rimangono nelle stesse posizioni percentuali (si adeguano automaticamente)

### Scenario: Cliente vuole tornare a campo default

1. **Apre modal**
2. **Seleziona formazione predefinita** (tab Base/Variazioni)
3. **Conferma**
4. **Sistema salva** `field_background_image: null`
5. **Campo torna** a CSS default

---

## 6. RISCHI E PRECAUZIONI

### ⚠️ Rischio: Allineamento posizioni

**Problema**: Se immagine ha bordi, posizioni potrebbero essere sbagliate.

**Mitigazione**:
- Istruzioni chiare: "Carica screenshot campo full-size, senza menu laterali"
- Usare `background-size: cover` per coprire tutto
- Opzionale: Preview con overlay per verificare allineamento

### ✅ Sicuro: Coordinate esistenti

**Perché**: Coordinate percentuali funzionano sempre (sono relative al container).

**Esempio**:
- Portiere a `x: 50, y: 90` → sempre `left: 50%`, `top: 90%` del container
- Funziona sia con background CSS che immagine

### ✅ Sicuro: Codice esistente

**Perché**: 
- Aggiunta campo opzionale (non obbligatorio)
- Se `field_background_image` è null, usa CSS default
- Nessuna logica esistente modificata

---

## 7. CHECKLIST IMPLEMENTAZIONE

### Backend
- [ ] Aggiungere colonna `field_background_image` a `formation_layout` (Supabase)
- [ ] Modificare `save-formation-layout` per accettare `field_background_image`
- [ ] Salvare `field_background_image` in DB (opzionale, può essere null)

### Frontend - Modal
- [ ] Aggiungere tab "Campo Personalizzato" nel modal
- [ ] Aggiungere state per immagine campo (`fieldImage`, `fieldImagePreview`)
- [ ] Implementare upload immagine (input file + preview)
- [ ] Passare `field_background_image` a `onSelect` quando conferma
- [ ] Aggiungere traduzioni i18n per nuove stringhe

### Frontend - Render Campo
- [ ] Leggere `field_background_image` da `layout`
- [ ] Modificare background: usare immagine se presente, altrimenti CSS default
- [ ] Testare che coordinate funzionino con immagine caricata

### UX/UI
- [ ] Istruzioni chiare: "Carica screenshot campo full-size"
- [ ] Preview immagine prima di confermare
- [ ] Opzione "Rimuovi campo personalizzato" per tornare a default
- [ ] Messaggio informativo: "Le posizioni si adeguano automaticamente"

---

## 8. ESEMPIO CODICE

### Tab "Campo Personalizzato"

```jsx
{activeTab === 'custom-field' && (
  <div>
    <div style={{ marginBottom: '20px' }}>
      <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>
        {t('uploadCustomField')}
      </h3>
      <p style={{ fontSize: '13px', opacity: 0.8, marginBottom: '16px' }}>
        {t('customFieldInstructions')}
      </p>
      
      {!fieldImagePreview ? (
        <label style={{
          display: 'block',
          padding: '24px',
          border: '2px dashed rgba(0, 212, 255, 0.3)',
          borderRadius: '8px',
          textAlign: 'center',
          cursor: 'pointer',
          background: 'rgba(0, 212, 255, 0.05)'
        }}>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                const reader = new FileReader()
                reader.onload = (e) => {
                  setFieldImagePreview(e.target.result)
                  setFieldImageFile(file)
                }
                reader.readAsDataURL(file)
              }
            }}
            style={{ display: 'none' }}
          />
          <Upload size={32} style={{ marginBottom: '8px', color: 'var(--neon-blue)' }} />
          <div style={{ fontSize: '14px', fontWeight: 600 }}>
            {t('clickToUploadField')}
          </div>
        </label>
      ) : (
        <div>
          <img
            src={fieldImagePreview}
            alt="Campo caricato"
            style={{
              width: '100%',
              maxHeight: '300px',
              objectFit: 'contain',
              borderRadius: '8px',
              marginBottom: '12px',
              border: '1px solid rgba(0, 212, 255, 0.3)'
            }}
          />
          <button
            onClick={() => {
              setFieldImagePreview(null)
              setFieldImageFile(null)
            }}
            style={{
              padding: '8px 16px',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#ef4444',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            {t('remove')}
          </button>
        </div>
      )}
    </div>
    
    {fieldImagePreview && (
      <div style={{
        padding: '12px',
        background: 'rgba(34, 197, 94, 0.1)',
        border: '1px solid rgba(34, 197, 94, 0.3)',
        borderRadius: '8px',
        fontSize: '13px',
        marginBottom: '16px'
      }}>
        ✓ {t('fieldImageReady')}
      </div>
    )}
  </div>
)}
```

### Modifica handleConfirm

```jsx
const handleConfirm = () => {
  if (activeTab === 'custom-field' && fieldImagePreview) {
    // Usa campo personalizzato
    onSelect('Personalizzato', null, fieldImagePreview) // Passa anche immagine
  } else if (selectedFormation && formations[selectedFormation]) {
    // Usa formazione predefinita
    onSelect(formations[selectedFormation].name, formations[selectedFormation].slot_positions, null)
  }
}
```

### Modifica handleSelectManualFormation

```jsx
const handleSelectManualFormation = async (formation, slotPositions, fieldBackgroundImage = null) => {
  // ... codice esistente ...
  
  const layoutRes = await fetch('/api/supabase/save-formation-layout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      formation: formation,
      slot_positions: slotPositions || layout?.slot_positions, // Usa esistenti se non forniti
      field_background_image: fieldBackgroundImage, // ← NUOVO
      preserve_slots: preserveSlots
    })
  })
}
```

### Modifica render campo

```jsx
const fieldBackground = layout?.field_background_image

<div style={{ 
  // ... stili esistenti
  background: fieldBackground
    ? `url(${fieldBackground}) center/cover no-repeat, 
       linear-gradient(180deg, rgba(5, 8, 21, 0.4) 0%, rgba(10, 14, 39, 0.3) 50%, rgba(5, 8, 21, 0.4) 100%)`
    : `linear-gradient(180deg, rgba(5, 8, 21, 0.4) 0%, rgba(10, 14, 39, 0.3) 50%, rgba(5, 8, 21, 0.4) 100%),
       linear-gradient(90deg, rgba(22, 163, 74, 0.08) 0%, rgba(34, 197, 94, 0.12) 50%, rgba(22, 163, 74, 0.08) 100%),
       ...` // CSS default esistente
}}>
```

---

## 9. TRADUZIONI I18N

**Aggiungere a `lib/i18n.js`**:

```javascript
// IT
uploadCustomField: 'Carica Campo 2D Personalizzato',
customFieldInstructions: 'Carica uno screenshot del campo eFootball. Le posizioni dei giocatori si adeguano automaticamente alle coordinate percentuali.',
clickToUploadField: 'Clicca per caricare foto campo',
fieldImageReady: 'Campo caricato. Le posizioni esistenti verranno mantenute.',

// EN
uploadCustomField: 'Upload Custom 2D Field',
customFieldInstructions: 'Upload an eFootball field screenshot. Player positions will automatically adapt to percentage coordinates.',
clickToUploadField: 'Click to upload field photo',
fieldImageReady: 'Field uploaded. Existing positions will be maintained.',
```

---

## 10. CONCLUSIONE

**Rischio totale**: 🟡 **MEDIO-BASSO**

- **Coordinate**: Funzionano automaticamente (sono percentuali relative)
- **Allineamento**: Potrebbe richiedere istruzioni chiare o calibrazione futura
- **Codice esistente**: Non toccato (solo aggiunta campo opzionale)

**Tempo implementazione**: 3-4 ore

**Raccomandazione**: ✅ **SICURO procedere** con Opzione A (upload semplice + istruzioni)

---

**Nessuna modifica applicata.** Questo documento è solo proposta dettagliata.
