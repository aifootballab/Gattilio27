# 🎨 Analisi Modal dal Punto di Vista Cliente

## Problemi Identificati

### 1. PositionSelectionModal - ETICHETTE SOLO IN ITALIANO ❌
**Dove:** `components/PositionSelectionModal.jsx` righe 5-24

**Problema:**
```javascript
const POSITIONS = [
  { id: 'PT', label: 'PT (Portiere)' },      // ← Solo italiano
  { id: 'DC', label: 'DC (Difensore Centrale)' },
  ...
]
```

**Impatto cliente:**
- Utente inglese vede "Portiere", "Difensore Centrale" → NON CAPISCE
- Esperienza rovinata per utenti internazionali

**Fix:** Usare t() per le etichette

---

### 2. Dashboard - TITOLO HARDCODED ❌
**Dove:** `app/page.jsx` riga 740

**Problema:**
```javascript
<h2>Ultime Partite</h2>  // ← Sempre italiano
```

**Fix:** `{t('recentMatches')}`

---

### 3. Dashboard - CONFIRM NATIVO ❌
**Dove:** `app/page.jsx` riga 208

**Problema:**
```javascript
if (!confirm(t('confirmDeleteMatch')))  // ← Alert brutto del browser
```

**Impatto cliente:**
- Stile vecchio, inconsistente con l'app
- Non professionale

**Fix:** Usare ConfirmModal

---

### 4. MissingDataModal - NOMI CAMPI TECNICI ❌
**Dove:** `components/MissingDataModal.jsx` righe 121, 164

**Problema:**
- Mostra `missing.label` che può essere "overall_rating" invece di "Overall Rating"
- Il cliente vede nomi tecnici del database

**Fix:** Mappatura campi → label umane tradotte

---

## ✅ Soluzioni Proposte

### Pattern per Posizioni Bilingue
```javascript
// In lib/i18n.js aggiungere:
positions: {
  PT: { it: 'Portiere', en: 'Goalkeeper' },
  DC: { it: 'Difensore Centrale', en: 'Center Back' },
  ...
}

// Uso nel componente:
{ id: 'PT', label: `PT (${t('positions.PT')})` }
```

### Pattern per Campi Dati
```javascript
// Mappatura nomi tecnici → label umane
const FIELD_LABELS = {
  player_name: { it: 'Nome Giocatore', en: 'Player Name' },
  overall_rating: { it: 'Valutazione Generale', en: 'Overall Rating' },
  ...
}
```

### ConfirmModal - Già OK ✅
- Già bilingue
- Già responsive
- Già coerente

---

## Priorità Fix

| # | Problema | Impatto | Sforzo | Priorità |
|---|----------|---------|--------|----------|
| 1 | PositionSelectionModal italiano | Alto | Medio | 🔴 Alta |
| 2 | Dashboard titolo hardcoded | Medio | Basso | 🟡 Media |
| 3 | Dashboard confirm nativo | Medio | Basso | 🟡 Media |
| 4 | MissingDataModal nomi tecnici | Medio | Medio | 🟡 Media |

---

## Test da Fare (Cliente)

1. **Cambio lingua:** Passa da IT a EN e verifica che tutti i modal cambino lingua
2. **Mobile:** Apri ogni modal su telefono, verifica che bottoni siano cliccabili
3. **Chiarezza:** Chiedi a un non-tecnico di capire i messaggi dei modal
