# 📚 Documentazione: Drag & Drop Personalizzazione Posizioni Giocatori

**Versione**: 1.0  
**Data**: 24 Gennaio 2026  
**Autore**: AI Assistant  
**Stato**: ✅ Implementato e Testato

---

## 📋 Indice

1. [Panoramica](#panoramica)
2. [Funzionalità](#funzionalità)
3. [Come Usare](#come-usare)
4. [Implementazione Tecnica](#implementazione-tecnica)
5. [API e Endpoint](#api-e-endpoint)
6. [Traduzioni](#traduzioni)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Panoramica

La funzionalità **Drag & Drop Personalizzazione Posizioni** permette agli utenti di personalizzare manualmente le posizioni dei giocatori sul campo 2D trascinando le card dei giocatori.

### Caratteristiche Principali

- ✅ **Modalità Edit Toggle**: Attiva/disattiva modalità personalizzazione
- ✅ **Drag & Drop**: Trascina giocatori per spostarli sul campo
- ✅ **Salvataggio Automatico**: Salva posizioni personalizzate nel database
- ✅ **Retrocompatibilità**: Mantiene tutte le formazioni predefinite
- ✅ **Bilingue**: Supporto IT/EN completo

---

## 🚀 Funzionalità

### 1. Modalità Personalizzazione

Quando attiva, permette di:
- Trascinare i giocatori sul campo
- Visualizzare feedback visivo durante il drag
- Salvare le modifiche o annullarle

### 2. Pulsanti di Controllo

- **"Personalizza Posizioni"** (icona Move)
  - Attiva modalità edit
  - Cambia in "Salva Modifiche" quando attivo

- **"Salva Modifiche"** (icona CheckCircle2)
  - Salva posizioni personalizzate
  - Disattiva modalità edit

- **"Annulla"** (icona X)
  - Cancella modifiche non salvate
  - Disattiva modalità edit

### 3. Indicatore Visivo

Banner giallo informativo quando modalità edit è attiva:
> "Modalità personalizzazione attiva: trascina i giocatori per spostarli"

---

## 📖 Come Usare

### Per l'Utente Finale

1. **Accedi alla Gestione Formazione**
   - Vai su `/gestione-formazione`
   - Assicurati di avere una formazione caricata

2. **Attiva Modalità Personalizzazione**
   - Clicca sul pulsante **"Personalizza Posizioni"**
   - Il banner giallo appare per confermare l'attivazione

3. **Sposta i Giocatori**
   - Trascina le card dei giocatori sul campo
   - Le posizioni si aggiornano in tempo reale
   - Solo i giocatori assegnati possono essere spostati

4. **Salva le Modifiche**
   - Clicca **"Salva Modifiche"** per salvare
   - Oppure **"Annulla"** per scartare le modifiche

5. **Verifica**
   - Le posizioni vengono salvate nel database
   - La formazione personalizzata viene mantenuta

---

## 🔧 Implementazione Tecnica

### File Modificati

- `app/gestione-formazione/page.jsx`
- `lib/i18n.js`

### Componenti Principali

#### 1. State Management

```javascript
const [isEditMode, setIsEditMode] = React.useState(false)
const [customPositions, setCustomPositions] = React.useState({}) // { slot_index: { x, y } }
```

#### 2. Handler Functions

**`handlePositionChange(slotIndex, newPosition)`**
- Salva posizione modificata durante drag
- Aggiorna `customPositions` state

**`handleSaveCustomPositions()`**
- Merge posizioni personalizzate con `layout.slot_positions`
- Chiama `handleSelectManualFormation()` esistente
- Salva tramite endpoint API

#### 3. SlotCard Component

**Props Aggiunte**:
- `isEditMode`: Boolean - Attiva/disattiva drag & drop
- `onPositionChange`: Callback - Chiamato quando posizione cambia

**State Interno**:
- `isDragging`: Traccia se sta trascinando
- `dragStart`: Stato iniziale drag
- `currentOffset`: Offset corrente durante drag

**Handler Drag & Drop**:
- `handleMouseDown`: Inizia drag
- `handleMouseMove`: Aggiorna posizione durante drag
- `handleMouseUp`: Finalizza drag e chiama callback

### Flusso Dati

```
Utente trascina giocatore
  ↓
handleMouseDown → inizia drag
  ↓
handleMouseMove → aggiorna currentOffset
  ↓
handleMouseUp → chiama onPositionChange
  ↓
handlePositionChange → aggiorna customPositions
  ↓
Utente clicca "Salva Modifiche"
  ↓
handleSaveCustomPositions → merge con slot_positions
  ↓
handleSelectManualFormation → salva via API
  ↓
Database aggiornato ✅
```

---

## 🔌 API e Endpoint

### Endpoint Utilizzato

**`POST /api/supabase/save-formation-layout`**

**Request Body**:
```json
{
  "formation": "Personalizzato",
  "slot_positions": {
    "0": { "x": 50, "y": 90, "position": "PT" },
    "1": { "x": 25, "y": 70, "position": "DC" },
    // ... altri slot con posizioni personalizzate
  },
  "preserve_slots": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
}
```

**Response**:
```json
{
  "success": true,
  "layout": {
    "id": "...",
    "formation": "Personalizzato",
    "slot_positions": { ... }
  }
}
```

### Struttura Dati

**`slot_positions`** (JSONB in Supabase):
```javascript
{
  [slot_index]: {
    x: number,      // Percentuale da sinistra (0-100)
    y: number,      // Percentuale dall'alto (0-100)
    position: string // Ruolo (PT, DC, MED, SP, CF, etc.)
  }
}
```

---

## 🌐 Traduzioni

### Chiavi i18n Aggiunte

**Italiano**:
- `customizePositions`: "Personalizza Posizioni"
- `saveChanges`: "Salva Modifiche"
- `cancel`: "Annulla"
- `editModeActive`: "Modalità personalizzazione attiva: trascina i giocatori per spostarli"
- `positionsSavedSuccessfully`: "Posizioni salvate con successo"
- `errorSavingPositions`: "Errore salvataggio posizioni"
- `changesCancelled`: "Modifiche annullate"

**Inglese**:
- `customizePositions`: "Customize Positions"
- `saveChanges`: "Save Changes"
- `cancel`: "Cancel"
- `editModeActive`: "Edit mode active: drag players to move them"
- `positionsSavedSuccessfully`: "Positions saved successfully"
- `errorSavingPositions`: "Error saving positions"
- `changesCancelled`: "Changes cancelled"

### Uso

```javascript
import { useTranslation } from '@/lib/i18n'

const { t } = useTranslation()
// ...
{t('customizePositions')}
```

---

## 🐛 Troubleshooting

### Problema: Giocatori non si spostano

**Possibili Cause**:
1. Modalità edit non attiva
2. Giocatore non assegnato allo slot
3. JavaScript errors in console

**Soluzione**:
- Verifica che il pulsante "Personalizza Posizioni" sia attivo (verde)
- Assicurati che lo slot abbia un giocatore assegnato
- Controlla console browser per errori

---

### Problema: Posizioni non vengono salvate

**Possibili Cause**:
1. Errore API
2. Sessione scaduta
3. Validazione fallita

**Soluzione**:
- Verifica che la sessione sia valida
- Controlla network tab per errori API
- Verifica che le coordinate siano valide (5-95%)

---

### Problema: Coordinate fuori campo

**Possibili Cause**:
- Drag oltre i limiti del campo

**Soluzione**:
- Il sistema limita automaticamente le coordinate a 5-95%
- Se necessario, ripristina formazione predefinita

---

## 🔒 Sicurezza

### Validazioni

- ✅ Coordinate limitate a 5-95% (previene posizioni fuori campo)
- ✅ Verifica sessione utente prima di salvare
- ✅ Validazione slot_index (0-10)
- ✅ Preservazione slot esistenti durante salvataggio

### Permessi

- ✅ Solo utente autenticato può modificare
- ✅ Ogni utente modifica solo la propria formazione
- ✅ Row Level Security (RLS) in Supabase

---

## 📊 Performance

### Ottimizzazioni

- ✅ Event listener aggiunti solo durante drag
- ✅ Rimozione listener dopo mouseup
- ✅ State locale per offset (non re-render continui)
- ✅ Calcolo coordinate solo quando necessario

### Limiti

- ⚠️ Drag & drop funziona solo su desktop (eventi mouse)
- ⚠️ Mobile non supportato (richiederebbe eventi touch)

---

## 🔄 Compatibilità

### Browser Supportati

- ✅ Chrome/Edge (ultime versioni)
- ✅ Firefox (ultime versioni)
- ✅ Safari (ultime versioni)

### Dipendenze

- React 18+
- Next.js 14+
- Lucide React (icone)
- Supabase Client

---

## 📝 Note di Sviluppo

### Logica Non Modificata

- ✅ `handleSelectManualFormation()` - Invariata
- ✅ `calculateCardOffsets()` - Invariata
- ✅ `fetchData()` - Invariata
- ✅ Endpoint API - Invariato

### Aggiunte Incrementali

- ✅ Solo aggiunte, nessuna modifica a logica esistente
- ✅ Retrocompatibile con formazioni predefinite
- ✅ Funziona con tutte le formazioni esistenti

---

## 🚀 Prossimi Sviluppi (Opzionali)

### Possibili Miglioramenti

1. **Supporto Mobile**
   - Implementare eventi touch (`touchstart`, `touchmove`, `touchend`)
   - Adattare UX per schermi piccoli

2. **Vincoli Posizionali**
   - Validazione ruolo (es. portiere non oltre metà campo)
   - Suggerimenti posizionali intelligenti

3. **Undo/Redo**
   - Stack di modifiche per annullare/ripristinare

4. **Snap to Grid**
   - Allineamento automatico a griglia

---

## 📞 Supporto

Per problemi o domande:
1. Consulta `VERIFICA_COERENZA_DRAG_DROP.md` per dettagli tecnici
2. Consulta `ROLLBACK_DRAG_DROP.md` per istruzioni rollback
3. Verifica console browser per errori JavaScript
4. Verifica network tab per errori API

---

**Ultimo Aggiornamento**: 24 Gennaio 2026  
**Versione Documentazione**: 1.0
