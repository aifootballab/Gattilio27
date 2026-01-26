# 🔍 CHECK COMPLETO SISTEMA - Flussi, Endpoint, Nomenclatura, UX

**Data**: 26 Gennaio 2026  
**Scopo**: Verifica completa flussi, endpoint, nomenclatura, UX responsiva, logica INSERT/UPDATE

---

## 📊 LOGICA INSERT vs UPDATE (save-player)

### **Flusso Attuale**

**1. Verifica Giocatore nello Slot (riga 154-267)**
```javascript
// Se slot_index è presente (0-10 = titolare)
if (playerData.slot_index !== null && playerData.slot_index !== undefined) {
  // Cerca giocatore esistente nello stesso slot
  const existingPlayerInSlot = await admin
    .from('players')
    .select('id, player_name, overall_rating, ...')
    .eq('user_id', userId)
    .eq('slot_index', playerData.slot_index)
    .maybeSingle()

  if (existingPlayerInSlot) {
    // ✅ UPDATE con merge dati
    // - Merge photo_slots, base_stats, skills, com_skills, boosters
    // - Math.max() per overall_rating (evita downgrade)
    // - NON sovrascrive original_positions (mantiene originali)
    return { action: 'updated', is_new: false }
  }
}
```

**2. Verifica Duplicati per Nome+Età (riga 270-329)**
```javascript
// Verifica duplicati in CAMPO (titolari)
// Verifica duplicati in RISERVE
// Se trova duplicato → ERRORE 400 (non procede)
```

**3. INSERT Nuovo Giocatore (riga 331-353)**
```javascript
// Se non esiste nello slot e non ci sono duplicati
// → INSERT nuovo giocatore
return { is_new: true }
```

### **✅ LOGICA CORRETTA**

**Quando il cliente modifica e salva:**
- **Se giocatore nello stesso slot** → **UPDATE** (merge intelligente)
- **Se nuovo slot o riserva** → **INSERT** (dopo verifica duplicati)
- **Se duplicato trovato** → **ERRORE** (previene duplicati)

**⚠️ ATTENZIONE**: Il cliente è fonte di verità solo per **nuovi dati**. I dati esistenti vengono **mergiati** (non sovrascritti completamente).

---

## 🔤 NOMENCLATURA: Frontend ↔ Backend ↔ Supabase

### **Mapping Campi**

| Frontend (extract-player) | Backend (save-player) | Supabase DB |
|---------------------------|----------------------|-------------|
| `player_name` | `player_name` | `player_name` ✅ |
| `overall_rating` | `overall_rating` | `overall_rating` ✅ |
| `position` | `position` | `position` ✅ |
| `height_cm` | `height` | `height` ⚠️ |
| `weight_kg` | `weight` | `weight` ⚠️ |
| `level_current` | `current_level` | `current_level` ⚠️ |
| `level_cap` | `level_cap` | `level_cap` ✅ |
| `boosters` | `available_boosters` | `available_boosters` ⚠️ |
| `original_positions` | `original_positions` | `original_positions` ✅ |

### **⚠️ INCONGRUENZE TROVATE**

1. **`height_cm` → `height`**
   - ✅ **Corretto**: Backend converte `height_cm` in `height` (riga 109)
   - ✅ **Coerente**: Supabase ha colonna `height` (INTEGER)

2. **`weight_kg` → `weight`**
   - ✅ **Corretto**: Backend converte `weight_kg` in `weight` (riga 110)
   - ✅ **Coerente**: Supabase ha colonna `weight` (INTEGER)

3. **`level_current` → `current_level`**
   - ✅ **Corretto**: Backend converte `level_current` in `current_level` (riga 117)
   - ✅ **Coerente**: Supabase ha colonna `current_level` (INTEGER)

4. **`boosters` → `available_boosters`**
   - ✅ **Corretto**: Backend converte `boosters` in `available_boosters` (riga 108)
   - ✅ **Coerente**: Supabase ha colonna `available_boosters` (JSONB)

### **✅ NOMENCLATURA COERENTE**

Tutti i mapping sono corretti. Il backend fa da "adapter" tra frontend (nomi descrittivi) e Supabase (nomi compatti).

---

## 🔄 FLUSSI COMPLETI

### **Flusso 1: Upload Nuovo Giocatore**

```
1. Cliente carica 1-3 foto → UploadPlayerModal
2. handleUploadPlayerToSlot():
   - Loop su tutte le foto
   - Chiama /api/extract-player per ogni foto
   - Merge dati (escludendo overall_rating durante merge)
   - Math.max() su overall_rating da tutte le foto
   - Check dati mancanti (checkMissingData)
   - Se obbligatori mancanti → MissingDataModal
   - Se tutto ok → PositionSelectionModal
3. handleSavePlayerWithPositions():
   - Verifica duplicati (frontend)
   - Chiama /api/supabase/save-player
4. save-player:
   - Verifica giocatore nello slot → UPDATE se esiste
   - Verifica duplicati per nome+età → ERRORE se duplicato
   - INSERT nuovo giocatore
5. fetchData() → Ricarica lista giocatori
```

### **Flusso 2: Modifica Giocatore Esistente**

```
1. Cliente clicca su giocatore → AssignModal
2. Cliente carica nuove foto → UploadPlayerModal
3. handleUploadPlayerToSlot():
   - Estrae dati da nuove foto
   - Merge con dati esistenti (se presenti)
   - Check dati mancanti
   - PositionSelectionModal
4. handleSavePlayerWithPositions():
   - Chiama /api/supabase/save-player
5. save-player:
   - Trova giocatore nello slot → UPDATE
   - Merge intelligente:
     * photo_slots: { ...existing, ...new }
     * base_stats: { ...existing, ...new }
     * skills: concatena e rimuovi duplicati
     * overall_rating: Math.max(existing, new)
     * original_positions: NON sovrascrive (mantiene originali)
6. fetchData() → Ricarica lista giocatori
```

### **Flusso 3: Assign Riserva a Slot**

```
1. Cliente clicca slot vuoto → AssignModal
2. Cliente seleziona riserva → handleAssignFromReserve()
3. Chiama /api/supabase/assign-player-to-slot
4. assign-player-to-slot:
   - Recupera formation_layout
   - Calcola position da slot_positions
   - UPDATE giocatore:
     * slot_index = nuovo slot
     * position = position calcolata
5. fetchData() → Ricarica lista giocatori
```

---

## 🌐 ENDPOINT API

### **Player Management**

| Endpoint | Metodo | Scopo | Logica |
|----------|--------|-------|--------|
| `/api/extract-player` | POST | Estrae dati da foto | OCR con GPT-4o |
| `/api/supabase/save-player` | POST | Salva/aggiorna giocatore | INSERT o UPDATE (vedi sopra) |
| `/api/supabase/assign-player-to-slot` | PATCH | Assegna riserva a slot | UPDATE slot_index + position |
| `/api/supabase/remove-player-from-slot` | PATCH | Rimuove da slot | UPDATE slot_index = NULL |
| `/api/supabase/delete-player` | DELETE | Elimina giocatore | DELETE permanente |

### **Formation Management**

| Endpoint | Metodo | Scopo |
|----------|--------|-------|
| `/api/extract-formation` | POST | Estrae formazione da foto |
| `/api/supabase/save-formation-layout` | POST | Salva layout formazione |
| `/api/supabase/save-tactical-settings` | POST | Salva impostazioni tattiche |

### **Match Management**

| Endpoint | Metodo | Scopo |
|----------|--------|-------|
| `/api/extract-match-data` | POST | Estrae dati partita |
| `/api/supabase/save-match` | POST | Salva partita |
| `/api/supabase/update-match` | POST | Aggiorna partita |
| `/api/supabase/delete-match` | DELETE | Elimina partita |
| `/api/analyze-match` | POST | Analizza partita con AI |

### **Coach Management**

| Endpoint | Metodo | Scopo |
|----------|--------|-------|
| `/api/extract-coach` | POST | Estrae dati allenatore |
| `/api/supabase/save-coach` | POST | Salva allenatore |
| `/api/supabase/set-active-coach` | POST | Imposta allenatore attivo |

### **Profile Management**

| Endpoint | Metodo | Scopo |
|----------|--------|-------|
| `/api/supabase/save-profile` | POST | Salva profilo utente |

### **AI & Analysis**

| Endpoint | Metodo | Scopo |
|----------|--------|-------|
| `/api/assistant-chat` | POST | Chat con AI coach |
| `/api/generate-countermeasures` | POST | Genera contromisure |
| `/api/admin/recalculate-patterns` | POST | Ricalcola pattern tattici |

### **✅ COERENZA ENDPOINT**

- ✅ Pattern RESTful: POST per creare, PATCH per aggiornare, DELETE per eliminare
- ✅ Nomenclatura coerente: `/api/supabase/` per operazioni DB, `/api/extract-` per OCR
- ✅ Autenticazione: Tutti gli endpoint richiedono Bearer token

---

## 📱 UX RESPONSIVA

### **Verifica Media Queries**

**❌ PROBLEMA TROVATO**: Nessuna media query esplicita nel codice.

**Codice attuale**:
- Solo commento "Previeni scroll su mobile durante drag" (riga 2511, 2558)
- Nessun `@media` query
- Layout usa percentuali e flexbox (buono per responsive)

### **Raccomandazioni**

1. **Aggiungere Media Queries**:
   ```css
   @media (max-width: 768px) {
     /* Mobile styles */
   }
   @media (max-width: 1024px) {
     /* Tablet styles */
   }
   ```

2. **Verificare Componenti**:
   - `MissingDataModal` → Testare su mobile
   - `PositionSelectionModal` → Testare su mobile
   - `UploadPlayerModal` → Testare su mobile
   - Campo 2D → Testare drag & drop su touch

3. **Touch Events**:
   - Verificare che drag & drop funzioni su mobile
   - Aggiungere supporto touch se necessario

---

## 🔍 VERIFICHE SPECIFICHE

### **1. Check Dati Mancanti**

**✅ IMPLEMENTATO**:
- Funzione `checkMissingData()` (riga 685-720)
- Modal `MissingDataModal` per inserimento manuale
- Handler `handleManualInput()` per merge dati manuali

**⚠️ DA VERIFICARE**:
- Test su mobile: modal è leggibile?
- Form input sono usabili su touch?

### **2. Merge Logica**

**✅ CORRETTO**:
- `photo_slots`: `{ ...existing, ...new }` (nuovi sovrascrivono)
- `base_stats`: `{ ...existing, ...new }` (nuovi sovrascrivono)
- `skills`: concatena e rimuovi duplicati
- `overall_rating`: `Math.max(existing, new)` (evita downgrade)
- `original_positions`: NON sovrascrive se esiste già

### **3. Verifica Duplicati**

**✅ IMPLEMENTATO**:
- Frontend: verifica prima di salvare (riga 894-957)
- Backend: verifica prima di INSERT (riga 270-329)
- Doppio check: previene duplicati sia in campo che in riserve

### **4. Sincronizzazione Position**

**✅ IMPLEMENTATO**:
- `save-formation-layout`: sincronizza `players.position` dopo salvataggio layout (riga 175-194)
- `assign-player-to-slot`: adatta automaticamente position (riga 191-196)

---

## ⚠️ PROBLEMI IDENTIFICATI

### **1. Responsività Mobile**

**Problema**: Nessuna media query esplicita.

**Impatto**: Layout potrebbe non essere ottimale su mobile.

**Soluzione**: Aggiungere media queries per mobile/tablet.

---

### **2. Mapping Nomenclatura**

**Status**: ✅ **CORRETTO** - Backend fa da adapter tra frontend e Supabase.

**Nota**: Mapping è intenzionale e coerente.

---

### **3. Logica INSERT/UPDATE**

**Status**: ✅ **CORRETTO** - Cliente è fonte di verità per nuovi dati, merge intelligente per esistenti.

**Flusso**:
- Nuovo giocatore → INSERT
- Giocatore esistente nello slot → UPDATE (merge)
- Duplicato → ERRORE (previene duplicati)

---

## ✅ CHECKLIST FINALE

### **Flussi**

- [x] ✅ Upload nuovo giocatore → INSERT
- [x] ✅ Modifica giocatore esistente → UPDATE (merge)
- [x] ✅ Assign riserva a slot → UPDATE slot_index
- [x] ✅ Check dati mancanti → Modal inserimento manuale
- [x] ✅ Verifica duplicati → Frontend + Backend

### **Nomenclatura**

- [x] ✅ Frontend → Backend → Supabase (mapping corretto)
- [x] ✅ `height_cm` → `height` ✅
- [x] ✅ `weight_kg` → `weight` ✅
- [x] ✅ `level_current` → `current_level` ✅
- [x] ✅ `boosters` → `available_boosters` ✅

### **Endpoint**

- [x] ✅ Pattern RESTful coerente
- [x] ✅ Autenticazione su tutti gli endpoint
- [x] ✅ Nomenclatura `/api/supabase/` vs `/api/extract-`

### **UX Responsiva**

- [ ] ⚠️ Media queries mancanti (da aggiungere)
- [x] ✅ Layout usa flexbox/percentuali (buono per responsive)
- [ ] ⚠️ Touch events da verificare (drag & drop su mobile)

### **Logica INSERT/UPDATE**

- [x] ✅ Cliente modifica → UPDATE se esiste nello slot
- [x] ✅ Cliente nuovo → INSERT dopo verifica duplicati
- [x] ✅ Merge intelligente (preserva dati esistenti)
- [x] ✅ Math.max() overall_rating (evita downgrade)

---

## 🎯 RACCOMANDAZIONI

### **1. Aggiungere Media Queries**

```css
/* Mobile */
@media (max-width: 768px) {
  .formation-field { /* ... */ }
  .modal { /* ... */ }
}

/* Tablet */
@media (max-width: 1024px) {
  /* ... */
}
```

### **2. Test Mobile**

- Testare `MissingDataModal` su mobile
- Testare `PositionSelectionModal` su mobile
- Testare drag & drop su touch device

### **3. Documentazione**

- Documentare mapping nomenclatura
- Documentare logica INSERT/UPDATE
- Documentare flussi completi

---

## ✅ STATUS FINALE

**✅ FLUSSI**: Corretti e coerenti  
**✅ NOMENCLATURA**: Mapping corretto (backend fa da adapter)  
**✅ ENDPOINT**: Pattern RESTful coerente  
**⚠️ UX RESPONSIVA**: Media queries mancanti (da aggiungere)  
**✅ LOGICA INSERT/UPDATE**: Corretta (cliente è fonte di verità per nuovi dati, merge per esistenti)

---

**Ultimo Aggiornamento**: 26 Gennaio 2026  
**Status**: ✅ **CHECK COMPLETO - Sistema Coerente (eccetto media queries)**
