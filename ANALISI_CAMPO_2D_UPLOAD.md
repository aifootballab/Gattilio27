# Analisi: Caricamento Foto 2D Campo Personalizzato

**Data**: 24 Gennaio 2026  
**Problema attuale**: Moduli non salvano (bug da fixare)  
**Proposta**: Permettere al cliente di caricare foto 2D del campo e adeguare il sistema.

---

## 1. PROBLEMA IMMEDIATO: Moduli non salvano

### Bug identificato
**File**: `app/gestione-formazione/page.jsx`, riga ~3759

**Problema**:
```javascript
const key = Object.keys(formations).find(k => formations[k] === variation)
```

**Causa**: Confronto oggetti con `===` non funziona (oggetti diversi, anche se contenuto uguale).

**Fix necessario**:
```javascript
// Opzione 1: Passare chiave nel raggruppamento
grouped[base].variations.push({ ...formation, _key: key })

// Opzione 2: Trovare per nome (più sicuro)
const key = Object.keys(formations).find(k => 
  formations[k].name === variation.name && 
  formations[k].baseFormation === variation.baseFormation
)
```

---

## 2. PROPOSTA: Caricare Foto 2D Campo Personalizzato

### Stato attuale

**Come funziona ora**:
- Campo 2D **hardcoded** con SVG/CSS (righe 1380-1578)
- Coordinate percentuali (0-100) per posizionare giocatori
- Background verde scuro con linee campo disegnate via CSS
- Giocatori posizionati con `position: absolute` usando `left: x%`, `top: y%`

**Struttura attuale**:
```javascript
// Campo renderizzato con div + CSS
<div style={{ position: 'relative', background: 'dark green', ... }}>
  {/* Linee campo via CSS/SVG */}
  {/* Giocatori posizionati con coordinate percentuali */}
</div>
```

---

## 3. Analisi proposta: Upload foto 2D campo

### Cosa cambierebbe

**PRIMA**:
- Campo fisso (SVG/CSS hardcoded)
- Coordinate percentuali sempre valide (0-100 = 0%-100% del container)

**DOPO**:
- Campo personalizzato (immagine uploadata dal cliente)
- Coordinate percentuali **dovrebbero** funzionare ancora (sono relative)
- **MA**: Problema di allineamento/calibrazione

### Difficoltà tecniche

#### ⚠️ RISCHIO ALTO: Allineamento coordinate

**Problema**: Le coordinate percentuali (0-100) sono relative al **container**, non al campo visibile nell'immagine.

**Esempio**:
- Cliente carica foto campo eFootball
- Campo reale nell'immagine potrebbe essere **centrato** con bordi/menu attorno
- Coordinate `x: 50, y: 90` (portiere) potrebbero puntare a **menu laterale** invece che porta

**Soluzione necessaria**:
1. **Calibrazione manuale**: Cliente deve indicare "questo punto è porta (x:50, y:90)"
2. **Rilevamento automatico**: AI/computer vision per trovare area campo nell'immagine
3. **Crop automatico**: Tagliare automaticamente solo area campo

#### ⚠️ RISCHIO MEDIO: Aspetto ratio

**Problema**: Foto campo potrebbero avere aspect ratio diversi (16:9, 4:3, ecc.).

**Impatto**: 
- Coordinate percentuali funzionano solo se container ha stesso aspect ratio
- Se foto è più larga/stretta, posizioni giocatori si deformano

**Soluzione**: 
- Forzare aspect ratio fisso (es. 16:9) con `object-fit: contain`
- O normalizzare coordinate in base a aspect ratio reale

#### ✅ RISCHIO BASSO: Salvataggio/Visualizzazione

**Problema**: Dove salvare foto campo? Come visualizzarla?

**Soluzione**:
- Salvare in `formation_layout.field_background_image` (URL o base64)
- Visualizzare come `background-image` CSS invece di SVG/CSS hardcoded
- Fallback a campo default se non caricata

---

## 4. Implementazione proposta

### Opzione A: Upload semplice (minimo sforzo)

**Cosa**:
- Cliente carica foto campo
- Sistema la usa come background
- Coordinate percentuali **assumono** che campo sia full-width/height

**Difficoltà**: ⭐⭐ (bassa-media)
- **Frontend**: Upload immagine, salvataggio URL, visualizzazione background
- **Backend**: Salvataggio URL in `formation_layout.field_background_image`
- **Rischio**: Allineamento potrebbe essere sbagliato se campo non è full-size

**Pro**:
- Implementazione rapida (2-3 ore)
- Zero cambio coordinate esistenti
- Funziona se cliente carica foto campo full-size

**Contro**:
- Nessuna calibrazione (potrebbe essere sbagliato)
- Aspetto ratio potrebbe deformare

### Opzione B: Upload + Calibrazione (raccomandato)

**Cosa**:
- Cliente carica foto campo
- Sistema chiede di cliccare 4 punti: porta sinistra, porta destra, centrocampo sinistro, centrocampo destro
- Sistema calcola trasformazione coordinate

**Difficoltà**: ⭐⭐⭐ (media)
- **Frontend**: Upload, modal calibrazione (4 click), calcolo trasformazione
- **Backend**: Salvataggio URL + parametri calibrazione (offset, scale)
- **Rischio**: Più complesso, ma più preciso

**Pro**:
- Allineamento preciso
- Funziona con qualsiasi foto campo
- Coordinate esistenti funzionano correttamente

**Contro**:
- UX più complessa (4 click per calibrare)
- Richiede calcolo trasformazione coordinate

### Opzione C: Upload + AI Detection (avanzato)

**Cosa**:
- Cliente carica foto campo
- AI (GPT-4 Vision) trova automaticamente area campo
- Sistema crop e calibra automaticamente

**Difficoltà**: ⭐⭐⭐⭐ (alta)
- **Frontend**: Upload, chiamata API AI, visualizzazione
- **Backend**: Endpoint AI per detection campo
- **Rischio**: Dipende da accuratezza AI

**Pro**:
- Zero intervento utente
- Funziona automaticamente

**Contro**:
- Costo API AI
- Potrebbe fallire su foto particolari
- Più complesso

---

## 5. Rischio per codice esistente

### ✅ SICURO: Coordinate percentuali

**Perché**: Coordinate 0-100 sono **relative al container**, non al background. Se cambio solo background (da SVG a immagine), coordinate funzionano ancora.

**Esempio**:
```javascript
// PRIMA: background SVG, giocatore a x: 50% (centro container)
// DOPO: background immagine, giocatore a x: 50% (centro container)
// Funziona se container stesso
```

### ⚠️ ATTENZIONE: Visualizzazione campo

**Cosa toccare**:
- Sezione render campo (righe 1380-1578)
- Cambiare da SVG/CSS hardcoded a `background-image: url(...)`

**Rischio**: 
- Se implementato male, campo potrebbe non visualizzarsi
- **Ma**: Fallback a campo default se immagine non caricata

### ✅ SICURO: Salvataggio

**Perché**: 
- Aggiungere campo `field_background_image` a `formation_layout` (JSONB)
- Non tocca logica esistente
- Retrocompatibile (campo opzionale)

---

## 6. Raccomandazione

### Fase 1 (immediato): Fix bug salvataggio moduli
- **Tempo**: 10 minuti
- **Rischio**: Zero (solo fix bug)

### Fase 2 (se approvato): Upload campo 2D semplice (Opzione A)
- **Tempo**: 2-3 ore
- **Rischio**: Basso (solo aggiunta, non modifica esistente)
- **Implementazione**:
  1. Aggiungere campo `field_background_image` a `formation_layout`
  2. UI upload foto campo (opzionale)
  3. Visualizzare come background se presente
  4. Fallback a campo default

### Fase 3 (futuro, se necessario): Calibrazione (Opzione B)
- **Tempo**: 4-6 ore
- **Rischio**: Medio (calcolo trasformazione)
- **Solo se** Opzione A non è sufficiente

---

## 7. Checklist implementazione (Opzione A)

- [ ] Fix bug salvataggio moduli (chiave variazione)
- [ ] Aggiungere campo `field_background_image` (JSONB, opzionale) a `formation_layout`
- [ ] UI upload foto campo (pulsante opzionale in gestione formazione)
- [ ] Endpoint API salvataggio immagine campo
- [ ] Modificare render campo: usare `background-image` se presente, altrimenti SVG default
- [ ] Test: Verificare che coordinate funzionino con foto campo
- [ ] Test: Verificare aspect ratio (forzare 16:9 o normalizzare)
- [ ] Fallback: Se immagine non caricata, usare campo default

---

## 8. Conclusione

**Rischio totale**: 🟡 **MEDIO-BASSO**

- **Fix bug salvataggio**: Zero rischio, necessario
- **Upload campo 2D (Opzione A)**: Basso rischio, solo aggiunta
- **Coordinate esistenti**: Funzionano ancora (sono relative)
- **Codice esistente**: Non toccato (solo aggiunta background)

**Raccomandazione**: 
1. ✅ **FIX BUG** salvataggio moduli (immediato)
2. ✅ **IMPLEMENTA** Opzione A (upload semplice) se approvato
3. ⏸️ **VALUTA** Opzione B (calibrazione) solo se Opzione A non sufficiente

---

**Nessuna modifica applicata.** Questo documento è solo analisi.
