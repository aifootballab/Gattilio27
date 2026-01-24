# Soluzione: Drag & Drop Giocatori su Campo 2D Personalizzato

**Data**: 24 Gennaio 2026  
**Proposta**: Cliente carica screenshot completo, poi sposta manualmente giocatori sul campo cliccando/trascinando.

---

## 1. COME FUNZIONA

### Flusso utente

1. **Cliente carica screenshot completo** (con menu, tutto)
2. **Sistema mostra screenshot come background** del campo
3. **Cliente clicca su giocatore** nella foto (es. Buffon in porta)
4. **Sistema crea card giocatore** nella posizione cliccata
5. **Cliente può trascinare** la card per spostarla
6. **Cliente assegna ruolo** (PT, DC, MED, ecc.) dalla lista
7. **Sistema salva posizione** (coordinate percentuali relative al container)
8. **Risultato**: Formazione personalizzata con campo 2D del cliente ✅

---

## 2. VANTAGGI

### ✅ Risolve tutti i problemi

- **Nessun crop necessario**: Usa screenshot completo così com'è
- **Nessuna calibrazione**: Cliente posiziona direttamente dove vuole
- **Nessuna AI**: Cliente fa tutto manualmente (zero costo)
- **Coordinate automatiche**: Sistema calcola percentuali dal click/trascinamento
- **Ruoli personalizzati**: Cliente assegna ruolo che preferisce

### ✅ UX intuitiva

- Cliente vede screenshot reale
- Clicca dove vuole posizionare giocatore
- Trascina per spostare
- Assegna ruolo dalla lista
- Vede risultato immediato

---

## 3. IMPLEMENTAZIONE

### 3.1 Modalità "Personalizza Campo"

**Dove**: Tab "Campo Personalizzato" nel modal "Cambia Formazione"

**UI**:
```
Tab "Campo Personalizzato"
├── Upload screenshot completo
├── Preview screenshot (come background)
├── Istruzioni: "Clicca sul campo per posizionare giocatori"
├── Lista giocatori disponibili (titolari + riserve)
├── Pulsante "Salva formazione personalizzata"
└── Preview formazione risultante
```

### 3.2 Flusso interattivo

**Step 1: Upload screenshot**
- Cliente carica screenshot completo
- Sistema mostra come background del campo

**Step 2: Posizionamento giocatori**
- Cliente clicca su punto del campo (es. dove c'è Buffon nella foto)
- Sistema apre modal: "Seleziona giocatore da posizionare"
- Cliente sceglie giocatore (es. Buffon) e ruolo (PT)
- Sistema crea card giocatore in quella posizione

**Step 3: Spostamento (opzionale)**
- Cliente può trascinare card per spostarla
- Oppure cliccare card → "Sposta" → cliccare nuova posizione

**Step 4: Salvataggio**
- Cliente clicca "Salva formazione personalizzata"
- Sistema salva:
  - `formation: "Personalizzato"`
  - `slot_positions`: Coordinate da posizioni cliccate/trascinate
  - `field_background_image`: Screenshot originale

---

## 4. COME SI ADEGUANO LE POSIZIONI?

### ✅ Funziona automaticamente

**Perché**:
- Cliente clicca direttamente sul campo nello screenshot
- Sistema calcola coordinate percentuali dal click: `x = (clickX / containerWidth) * 100`
- Coordinate sono **relative al container**, non al background
- Funziona con qualsiasi screenshot (con o senza menu)

**Esempio**:
```
Container campo: 600px x 900px
Cliente clicca su porta (nello screenshot): x: 300px, y: 810px
Sistema calcola: x: 50%, y: 90%
Salva: slot_positions[0] = { x: 50, y: 90, position: 'PT' }
```

**Risultato**: Posizione corretta indipendentemente da menu/bordi ✅

---

## 5. IMPLEMENTAZIONE DETTAGLIATA

### 5.1 State Management

```javascript
const [fieldBackgroundImage, setFieldBackgroundImage] = React.useState(null)
const [customFormation, setCustomFormation] = React.useState({}) // { slot_index: { player_id, x, y, position } }
const [isPlacingPlayer, setIsPlacingPlayer] = React.useState(false)
const [selectedPlayer, setSelectedPlayer] = React.useState(null)
const [placingSlot, setPlacingSlot] = React.useState(null)
```

### 5.2 Click su campo per posizionare

```javascript
const handleFieldClick = (e) => {
  if (!isPlacingPlayer) return
  
  const rect = e.currentTarget.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * 100
  const y = ((e.clientY - rect.top) / rect.height) * 100
  
  // Trova slot libero (0-10)
  const nextSlot = findNextAvailableSlot(customFormation)
  
  if (nextSlot !== null) {
    setCustomFormation(prev => ({
      ...prev,
      [nextSlot]: {
        player_id: selectedPlayer.id,
        player_name: selectedPlayer.player_name,
        x: x,
        y: y,
        position: selectedPlayer.position || '?'
      }
    }))
    
    setIsPlacingPlayer(false)
    setSelectedPlayer(null)
  }
}
```

### 5.3 Drag & Drop per spostare

```javascript
const [draggedSlot, setDraggedSlot] = React.useState(null)

const handleDragStart = (slotIndex) => {
  setDraggedSlot(slotIndex)
}

const handleDragEnd = (e) => {
  if (!draggedSlot) return
  
  const rect = e.currentTarget.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * 100
  const y = ((e.clientY - rect.top) / rect.height) * 100
  
  setCustomFormation(prev => ({
    ...prev,
    [draggedSlot]: {
      ...prev[draggedSlot],
      x: x,
      y: y
    }
  }))
  
  setDraggedSlot(null)
}
```

### 5.4 Modal selezione giocatore

```javascript
function PlayerSelectionModal({ players, onSelect, onClose }) {
  const titolari = players.filter(p => p.slot_index === null) // Riserve disponibili
  const riserve = players.filter(p => p.slot_index === null)
  const allAvailable = [...titolari, ...riserve]
  
  return (
    <div className="modal">
      <h3>Seleziona giocatore da posizionare</h3>
      <div>
        {allAvailable.map(player => (
          <button
            key={player.id}
            onClick={() => onSelect(player)}
          >
            {player.player_name} - {player.position} ({player.overall_rating})
          </button>
        ))}
      </div>
      <button onClick={onClose}>Annulla</button>
    </div>
  )
}
```

### 5.5 Salvataggio

```javascript
const handleSaveCustomFormation = async () => {
  // Converti customFormation in slot_positions
  const slotPositions = {}
  Object.entries(customFormation).forEach(([slotIndex, data]) => {
    slotPositions[slotIndex] = {
      x: data.x,
      y: data.y,
      position: data.position
    }
  })
  
  // Salva
  await handleSelectManualFormation(
    'Personalizzato',
    slotPositions,
    fieldBackgroundImage
  )
}
```

---

## 6. UI PROPOSTA

### Tab "Campo Personalizzato"

```jsx
{activeTab === 'custom-field' && (
  <div>
    {/* Upload screenshot */}
    {!fieldBackgroundImage ? (
      <label>
        <input type="file" accept="image/*" onChange={handleFieldUpload} />
        <button>📷 Carica Screenshot Campo</button>
      </label>
    ) : (
      <>
        {/* Preview campo con giocatori posizionati */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '2/3',
            backgroundImage: `url(${fieldBackgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            border: '2px solid var(--neon-blue)',
            borderRadius: '8px',
            cursor: isPlacingPlayer ? 'crosshair' : 'default'
          }}
          onClick={handleFieldClick}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDragEnd}
        >
          {/* Giocatori posizionati */}
          {Object.entries(customFormation).map(([slotIndex, data]) => (
            <div
              key={slotIndex}
              draggable
              onDragStart={() => handleDragStart(slotIndex)}
              style={{
                position: 'absolute',
                left: `${data.x}%`,
                top: `${data.y}%`,
                transform: 'translate(-50%, -50%)',
                padding: '8px',
                background: 'rgba(0, 212, 255, 0.9)',
                borderRadius: '4px',
                cursor: 'move'
              }}
            >
              {data.player_name} ({data.position})
            </div>
          ))}
        </div>
        
        {/* Pulsante "Aggiungi giocatore" */}
        <button onClick={() => setIsPlacingPlayer(true)}>
          ➕ Aggiungi Giocatore
        </button>
        
        {/* Lista giocatori posizionati */}
        <div>
          <h4>Giocatori posizionati ({Object.keys(customFormation).length}/11)</h4>
          {Object.entries(customFormation).map(([slot, data]) => (
            <div key={slot}>
              Slot {slot}: {data.player_name} - {data.position}
              <button onClick={() => removePlayer(slot)}>Rimuovi</button>
            </div>
          ))}
        </div>
      </>
    )}
  </div>
)}
```

---

## 7. RISCHI E VANTAGGI

### ✅ Vantaggi

- **Zero AI**: Nessun costo API, nessuna dipendenza
- **Zero calibrazione**: Cliente posiziona direttamente
- **Flessibilità totale**: Cliente può creare qualsiasi formazione
- **Intuitivo**: Clicca e trascina (UX familiare)
- **Coordinate automatiche**: Sistema calcola percentuali dal click

### ⚠️ Rischio: UX complessa

**Problema**: Potrebbe essere confuso per utenti non esperti.

**Mitigazione**:
- Istruzioni chiare: "Clicca sul campo per posizionare giocatori"
- Preview in tempo reale
- Lista giocatori posizionati visibile
- Pulsante "Reset" per ricominciare

### ✅ Sicuro: Codice esistente

**Perché**:
- Usa stesso sistema `slot_positions` esistente
- Stesso salvataggio `save-formation-layout`
- Solo aggiunta UI drag & drop
- Nessuna logica esistente modificata

---

## 8. DIFFICOLTÀ

### ⭐⭐ (Bassa-Media)

**Frontend**:
- Upload immagine: 30 min
- Click-to-place: 1 ora
- Drag & drop: 1-2 ore
- Modal selezione giocatore: 30 min
- Salvataggio: 30 min (usa esistente)

**Backend**:
- Aggiungere `field_background_image` a `save-formation-layout`: 15 min
- Aggiungere colonna DB: 5 min

**Totale**: 3-4 ore

---

## 9. CHECKLIST IMPLEMENTAZIONE

### Backend
- [ ] Aggiungere colonna `field_background_image` a `formation_layout` (Supabase)
- [ ] Modificare `save-formation-layout` per accettare `field_background_image`

### Frontend - Modal
- [ ] Aggiungere tab "Campo Personalizzato"
- [ ] Upload screenshot completo
- [ ] Preview screenshot come background
- [ ] Click su campo per posizionare giocatore
- [ ] Modal selezione giocatore + ruolo
- [ ] Drag & drop per spostare giocatori posizionati
- [ ] Lista giocatori posizionati (0-10)
- [ ] Rimozione giocatore
- [ ] Salvataggio formazione personalizzata

### Frontend - Render Campo
- [ ] Usare `field_background_image` come background se presente
- [ ] Fallback a CSS default se null

### UX
- [ ] Istruzioni chiare: "Clicca sul campo per posizionare giocatori"
- [ ] Cursor "crosshair" quando in modalità posizionamento
- [ ] Preview giocatori posizionati in tempo reale
- [ ] Pulsante "Reset" per ricominciare
- [ ] Traduzioni i18n

---

## 10. CONCLUSIONE

**Soluzione**: **Drag & Drop Manuale su Campo 2D**

**Vantaggi**:
- ✅ Zero AI, zero calibrazione, zero crop
- ✅ Cliente ha controllo totale
- ✅ Funziona con qualsiasi screenshot
- ✅ Coordinate si adeguano automaticamente (dal click)
- ✅ UX intuitiva (clicca e trascina)

**Tempo**: 3-4 ore
**Rischio**: 🟢 Basso (solo aggiunta UI, nessuna logica modificata)

**Raccomandazione**: ✅ **SICURO procedere** - Soluzione più semplice e flessibile

---

**Nessuna modifica applicata.** Questo documento è solo proposta.
