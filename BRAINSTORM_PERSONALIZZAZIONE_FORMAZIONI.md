# Brainstorm: Personalizzazione Formazioni eFootball

**Data**: 24 Gennaio 2026  
**Contesto**: eFootball permette di spostare giocatori sul campo anche all'interno di un modulo predefinito (es. 4-2-1-3 può essere più largo/stretto, più offensivo/difensivo).  
**Obiettivo**: Valutare opzioni per personalizzazione posizioni, difficoltà, suggerimenti, aumento moduli.

---

## 1. Stato attuale

### Struttura dati
- **`formation_layout.slot_positions`** (JSONB): `{ 0: { x: 50, y: 90, position: 'PT' }, 1: { x: 25, y: 75, position: 'TD' }, ... }`
- **Coordinate**: percentuali 0-100 (x = larghezza, y = profondità)
- **14 formazioni predefinite** hardcoded in `gestione-formazione/page.jsx`
- **Collision detection** già presente (`calculateCardOffsets`) per evitare sovrapposizioni
- **Salvataggio**: `POST /api/supabase/save-formation-layout` con `slot_positions` completo

### Limiti attuali
- Posizioni **fisse** per ogni formazione (non modificabili dall'utente)
- Nessun drag & drop per spostare giocatori
- Nessuna variazione personalizzata (es. "4-3-3 largo" vs "4-3-3 stretto")

---

## 2. Opzioni di personalizzazione

### Opzione A: Drag & Drop completo (massima libertà)

**Cosa**: L'utente può trascinare qualsiasi giocatore in qualsiasi punto del campo (con vincoli ragionevoli).

**Implementazione**:
- **Frontend**: 
  - Libreria drag & drop (es. `react-draggable`, `@dnd-kit/core`, o vanilla con `onMouseDown`/`onMouseMove`/`onMouseUp`)
  - Modalità "edit" (toggle on/off) per abilitare drag
  - Vincoli: portiere (slot 0) solo in area porta (y > 80), difensori non oltre metà campo (y < 60), ecc.
  - Salvataggio automatico o pulsante "Salva modifiche"
- **Backend**: Nessun cambio (già accetta `slot_positions` personalizzati)
- **DB**: Nessun cambio schema (JSONB già flessibile)

**Difficoltà**: ⭐⭐⭐ (media-alta)
- **Frontend**: 2-3 giorni (drag & drop, vincoli, UX, test)
- **Backend**: 0 (già supportato)
- **Testing**: 1 giorno (vincoli, edge cases, mobile)

**Pro**:
- Massima flessibilità (come eFootball)
- Utente può creare variazioni infinite
- Nessun cambio DB/API

**Contro**:
- UX complessa (potrebbe confondere utenti casuali)
- Richiede validazione vincoli (portiere, difensori, ecc.)
- Possibili formazioni "impossibili" (es. tutti in attacco)

---

### Opzione B: Personalizzazione guidata (vincoli intelligenti)

**Cosa**: L'utente può modificare posizioni ma con vincoli basati sul ruolo e sulla formazione base.

**Implementazione**:
- **Frontend**:
  - Drag & drop **con snap a zone** (es. difensori solo in area difensiva, attaccanti solo in area offensiva)
  - Slider o pulsanti per "larghezza" / "profondità" / "compattamento" (es. "Più largo" sposta terzini e ali verso i lati)
  - Preset rapidi: "Largo", "Stretto", "Offensivo", "Difensivo" (modificano x/y di tutti gli slot in modo coerente)
- **Backend**: Validazione vincoli opzionale (es. portiere y > 75, difensori y > 50)
- **DB**: Nessun cambio

**Difficoltà**: ⭐⭐⭐⭐ (alta)
- **Frontend**: 4-5 giorni (drag con snap, slider, preset, validazione)
- **Backend**: 1 giorno (validazione vincoli)
- **Testing**: 2 giorni

**Pro**:
- Bilanciamento flessibilità/UX
- Evita formazioni impossibili
- Preset rapidi per utenti non esperti

**Contro**:
- Più complesso da implementare
- Vincoli potrebbero limitare troppo

---

### Opzione C: Aumentare moduli predefiniti (minimo sforzo)

**Cosa**: Aggiungere più formazioni predefinite (es. 4-3-3 largo, 4-3-3 stretto, 4-2-3-1 offensivo, ecc.).

**Implementazione**:
- **Frontend**: Aggiungere formazioni in `formations` object (es. `'4-3-3-wide'`, `'4-3-3-narrow'`)
- **Backend**: Nessun cambio
- **DB**: Nessun cambio

**Difficoltà**: ⭐ (bassa)
- **Frontend**: 1-2 ore (aggiungere 10-20 formazioni con posizioni diverse)
- **Backend**: 0
- **Testing**: 30 min

**Pro**:
- Implementazione immediata
- Zero rischio
- Utenti scelgono da lista (UX semplice)

**Contro**:
- Non copre tutte le variazioni possibili
- Lista potrebbe diventare troppo lunga (30+ formazioni)
- Non personalizzabile

---

### Opzione D: Ibrido (moduli + personalizzazione opzionale)

**Cosa**: Aumentare moduli predefiniti **E** aggiungere modalità "Personalizza" per modificare posizioni.

**Implementazione**:
- **Fase 1**: Aumentare moduli (Opzione C) → **immediato**
- **Fase 2**: Aggiungere toggle "Modalità personalizza" → drag & drop (Opzione A o B) → **futuro**

**Difficoltà**: ⭐⭐ (bassa per Fase 1, media per Fase 2)
- **Fase 1**: 1-2 ore
- **Fase 2**: 2-5 giorni (a seconda di A o B)

**Pro**:
- Soluzione incrementale
- Utenti casuali usano moduli, utenti avanzati personalizzano
- Massima flessibilità a lungo termine

**Contro**:
- Richiede due implementazioni (ma separate nel tempo)

---

## 3. Suggerimenti architetturali

### 3.1 Struttura dati (già OK)

- **`slot_positions`** JSONB è perfetto: flessibile, nessun cambio schema
- **Coordinate percentuali** (0-100) sono responsive e scalabili
- **Formato attuale** `{ slot: { x, y, position } }` è chiaro

### 3.2 Se si implementa drag & drop

**Librerie consigliate**:
- **`@dnd-kit/core`** + `@dnd-kit/sortable`: moderna, accessibile, mobile-friendly
- **`react-draggable`**: semplice ma meno performante su mobile
- **Vanilla JS**: massimo controllo ma più codice

**Pattern suggerito**:
```javascript
// State per modalità edit
const [isEditMode, setIsEditMode] = React.useState(false)

// Handler drag
const handleDragEnd = (slotIndex, newX, newY) => {
  // Validazione vincoli
  if (!validatePosition(slotIndex, newX, newY)) return
  
  // Aggiorna slot_positions locale
  const updated = { ...layout.slot_positions }
  updated[slotIndex] = { ...updated[slotIndex], x: newX, y: newY }
  setLayout({ ...layout, slot_positions: updated })
  
  // Auto-save o pulsante "Salva"
}
```

**Vincoli suggeriti**:
- **Portiere (slot 0)**: y >= 80, x tra 40-60
- **Difensori (slot 1-4)**: y >= 60 (non oltre metà campo)
- **Centrocampisti (slot 5-7)**: y tra 30-70
- **Attaccanti (slot 8-10)**: y <= 40
- **Larghezza minima**: distanza min 8% tra slot sulla stessa linea

### 3.3 Se si aumentano moduli

**Organizzazione suggerita**:
```javascript
const formations = {
  // Base
  '4-3-3': { name: '4-3-3', slot_positions: {...} },
  '4-3-3-wide': { name: '4-3-3 (Largo)', slot_positions: {...} },
  '4-3-3-narrow': { name: '4-3-3 (Stretto)', slot_positions: {...} },
  '4-3-3-offensive': { name: '4-3-3 (Offensivo)', slot_positions: {...} },
  // ...
}
```

**Categorie UI**:
- "Moduli Base" (4-3-3, 4-2-3-1, 3-5-2, ecc.)
- "Variazioni" (4-3-3 largo, 4-2-3-1 offensivo, ecc.)
- "Personalizzato" (se implementato drag & drop)

---

## 4. Raccomandazione

### Approccio incrementale (Opzione D)

**Fase 1 (immediato, 1-2 ore)**:
1. Aggiungere **10-15 formazioni predefinite** con variazioni:
   - 4-3-3 largo, 4-3-3 stretto, 4-3-3 offensivo
   - 4-2-3-1 largo, 4-2-3-1 offensivo
   - 3-5-2 largo, 3-5-2 difensivo
   - 4-4-2 largo, 4-4-2 diamond
   - ecc.
2. Organizzare UI con categorie (Base / Variazioni)
3. **Risultato**: Utenti hanno più opzioni subito, zero rischio

**Fase 2 (futuro, 2-5 giorni)**:
1. Aggiungere toggle "Personalizza formazione" (icona matita/edit)
2. Implementare drag & drop con vincoli (Opzione B, più sicura di A)
3. Salvataggio automatico o pulsante "Salva modifiche"
4. **Risultato**: Utenti avanzati possono personalizzare, altri usano moduli

**Perché questo approccio**:
- ✅ Valore immediato (più moduli) con sforzo minimo
- ✅ Flessibilità futura (personalizzazione) senza bloccare Fase 1
- ✅ UX progressiva (moduli semplici → personalizzazione avanzata)
- ✅ Zero rischio Fase 1 (solo aggiunta dati)

---

## 5. Considerazioni AI (contromisure)

**Impatto su `generate-countermeasures`**:
- **Attuale**: Prompt usa `formation` (es. "4-3-3") e `slot_positions` (coordinate)
- **Con personalizzazione**: L'AI può interpretare variazioni (es. "4-3-3 largo" = terzini più esterni, "4-3-3 offensivo" = attaccanti più avanzati)
- **Suggerimento**: Aggiungere nel prompt descrizione posizioni (es. "Terzini a x=20 e x=80 (formazione larga)" vs "Terzini a x=30 e x=70 (formazione stretta)")

**Nessun cambio necessario** nel prompt helper (già legge `slot_positions`), ma si può migliorare la descrizione delle posizioni per l'AI.

---

## 6. Checklist decisione

- [ ] **Priorità**: Utenti chiedono più moduli o personalizzazione?
- [ ] **Tempo disponibile**: 1-2 ore (Fase 1) vs 2-5 giorni (Fase 2)
- [ ] **Complessità UX**: Moduli semplici vs drag & drop
- [ ] **Mobile**: Drag & drop funziona bene su touch?
- [ ] **Validazione**: Serve validare formazioni "impossibili"?

---

## 7. Prossimi passi (se approvato)

1. **Decidere**: Fase 1 (moduli) o Fase 2 (personalizzazione) o entrambe
2. **Se Fase 1**: Lista formazioni da aggiungere (es. quali variazioni di 4-3-3, 4-2-3-1, ecc.)
3. **Se Fase 2**: Scegliere libreria drag & drop, definire vincoli, mockup UX
4. **Test**: Verificare che `save-formation-layout` accetti posizioni personalizzate (già supportato)

---

**Nessuna modifica al codice è stata applicata.** Questo documento è solo analisi e proposte.
