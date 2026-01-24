# Soluzione: Gestione Variazioni Formazioni

**Problema**: Con 40+ formazioni (base + variazioni), la lista diventa ingestibile.  
**Soluzione**: Organizzazione gerarchica con **tab + raggruppamento per base**.

---

## 1. Struttura dati organizzata

```javascript
const formations = {
  // BASE: Formazioni ufficiali eFootball
  '4-3-3': {
    name: '4-3-3',
    category: 'base',
    baseFormation: '4-3-3',
    slot_positions: { /* ... */ }
  },
  
  // VARIAZIONI: Raggruppate per base
  '4-3-3-wide': {
    name: '4-3-3 (Largo)',
    category: 'variation',
    baseFormation: '4-3-3',
    variation: 'wide',
    slot_positions: { /* ... */ }
  },
  '4-3-3-compact': {
    name: '4-3-3 (Compatto)',
    category: 'variation',
    baseFormation: '4-3-3',
    variation: 'compact',
    slot_positions: { /* ... */ }
  },
  '4-3-3-offensive': {
    name: '4-3-3 (Offensivo)',
    category: 'variation',
    baseFormation: '4-3-3',
    variation: 'offensive',
    slot_positions: { /* ... */ }
  },
  '4-3-3-defensive': {
    name: '4-3-3 (Difensivo)',
    category: 'variation',
    baseFormation: '4-3-3',
    variation: 'defensive',
    slot_positions: { /* ... */ }
  }
}
```

---

## 2. UI proposta: Tab + Raggruppamento

### Opzione A: Tab "Base" / "Variazioni" (semplice)

```
┌─────────────────────────────────────┐
│ Seleziona Formazione Tattica    [X] │
├─────────────────────────────────────┤
│ [Base] [Variazioni]                 │ ← Tab
├─────────────────────────────────────┤
│ 🔍 Cerca: [____________]             │ ← Ricerca opzionale
├─────────────────────────────────────┤
│                                     │
│ TAB BASE:                             │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐     │
│ │4-3-3│ │4-2-3│ │3-5-2│ │4-4-2│ ... │
│ └─────┘ └─────┘ └─────┘ └─────┘     │
│                                     │
│ TAB VARIAZIONI:                      │
│ ┌─────────────────────────────────┐ │
│ │ 4-3-3                           ▼│ │ ← Dropdown/Espansione
│ │   • 4-3-3 (Largo)               │ │
│ │   • 4-3-3 (Compatto)            │ │
│ │   • 4-3-3 (Offensivo)           │ │
│ │   • 4-3-3 (Difensivo)           │ │
│ ├─────────────────────────────────┤ │
│ │ 4-2-1-3                         │ │
│ │   • 4-2-1-3 (Compatto)         │ │
│ │   • 4-2-1-3 (Largo)            │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Opzione B: Lista unica con raggruppamento (più compatta)

```
┌─────────────────────────────────────┐
│ Seleziona Formazione Tattica    [X] │
├─────────────────────────────────────┤
│ 🔍 Cerca: [____________]             │
│ [Tutte] [Base] [Variazioni]          │ ← Filtro rapido
├─────────────────────────────────────┤
│                                     │
│ 📁 4-3-3                            │ ← Raggruppamento
│   ┌─────┐ ┌──────────┐ ┌─────────┐ │
│   │4-3-3│ │4-3-3(Lar)│ │4-3-3(Of)│ │
│   └─────┘ └──────────┘ └─────────┘ │
│                                     │
│ 📁 4-2-1-3                          │
│   ┌─────┐ ┌──────────┐              │
│   │4-2-1│ │4-2-1-3(C)│              │
│   └─────┘ └──────────┘              │
│                                     │
└─────────────────────────────────────┘
```

**Raccomandazione**: **Opzione A** (tab) → più chiaro, separa base da variazioni.

---

## 3. Implementazione UI (codice)

### Helper per organizzare formazioni

```javascript
// Helper: raggruppa formazioni per base
function groupFormationsByBase(formations) {
  const grouped = {}
  
  Object.entries(formations).forEach(([key, formation]) => {
    const base = formation.baseFormation || formation.name
    
    if (!grouped[base]) {
      grouped[base] = {
        base: formation.category === 'base' ? formation : null,
        variations: []
      }
    }
    
    if (formation.category === 'base') {
      grouped[base].base = formation
    } else {
      grouped[base].variations.push(formation)
    }
  })
  
  return grouped
}

// Helper: filtra per categoria
function filterFormations(formations, category) {
  if (category === 'all') return formations
  
  return Object.fromEntries(
    Object.entries(formations).filter(([_, f]) => {
      if (category === 'base') return f.category === 'base'
      if (category === 'variation') return f.category === 'variation'
      return true
    })
  )
}
```

### Componente Modal aggiornato

```javascript
function FormationSelectorModal({ onSelect, onClose }) {
  const [activeTab, setActiveTab] = React.useState('base') // 'base' | 'variation'
  const [selectedFormation, setSelectedFormation] = React.useState(null)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [expandedBase, setExpandedBase] = React.useState(null) // Per dropdown variazioni
  
  // Raggruppa formazioni
  const grouped = React.useMemo(() => {
    const filtered = filterFormations(formations, activeTab)
    return groupFormationsByBase(filtered)
  }, [activeTab])
  
  // Filtra per ricerca
  const filteredGrouped = React.useMemo(() => {
    if (!searchQuery) return grouped
    
    const query = searchQuery.toLowerCase()
    const filtered = {}
    
    Object.entries(grouped).forEach(([base, group]) => {
      const matchesBase = base.toLowerCase().includes(query)
      const matchingVariations = group.variations.filter(v => 
        v.name.toLowerCase().includes(query)
      )
      
      if (matchesBase || matchingVariations.length > 0) {
        filtered[base] = {
          ...group,
          variations: activeTab === 'variation' ? matchingVariations : group.variations
        }
      }
    })
    
    return filtered
  }, [grouped, searchQuery, activeTab])
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Seleziona Formazione Tattica</h2>
        
        {/* Tab */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            onClick={() => setActiveTab('base')}
            className={activeTab === 'base' ? 'active' : ''}
          >
            Moduli Base ({Object.values(formations).filter(f => f.category === 'base').length})
          </button>
          <button
            onClick={() => setActiveTab('variation')}
            className={activeTab === 'variation' ? 'active' : ''}
          >
            Variazioni ({Object.values(formations).filter(f => f.category === 'variation').length})
          </button>
        </div>
        
        {/* Ricerca */}
        <input
          type="text"
          placeholder="🔍 Cerca formazione..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '8px', marginBottom: '16px' }}
        />
        
        {/* Lista formazioni */}
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {activeTab === 'base' ? (
            // TAB BASE: Griglia semplice
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
              {Object.values(filteredGrouped)
                .filter(g => g.base)
                .map(group => (
                  <button
                    key={group.base.name}
                    onClick={() => setSelectedFormation(group.base.name)}
                    className={selectedFormation === group.base.name ? 'selected' : ''}
                  >
                    {group.base.name}
                  </button>
                ))}
            </div>
          ) : (
            // TAB VARIAZIONI: Raggruppate per base
            <div>
              {Object.entries(filteredGrouped)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([base, group]) => (
                  <div key={base} style={{ marginBottom: '16px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '8px',
                        cursor: 'pointer',
                        padding: '8px',
                        background: 'rgba(0, 212, 255, 0.05)',
                        borderRadius: '4px'
                      }}
                      onClick={() => setExpandedBase(expandedBase === base ? null : base)}
                    >
                      <span>{expandedBase === base ? '▼' : '▶'}</span>
                      <strong>{base}</strong>
                      <span style={{ opacity: 0.6, fontSize: '12px' }}>
                        ({group.variations.length} variazioni)
                      </span>
                    </div>
                    
                    {expandedBase === base && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px', marginLeft: '24px' }}>
                        {group.variations.map(variation => (
                          <button
                            key={variation.name}
                            onClick={() => setSelectedFormation(variation.name)}
                            className={selectedFormation === variation.name ? 'selected' : ''}
                          >
                            {variation.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
        
        {/* Pulsanti */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button onClick={onClose}>Annulla</button>
          {selectedFormation && (
            <button onClick={() => {
              const formation = Object.values(formations).find(f => f.name === selectedFormation)
              onSelect(formation.name, formation.slot_positions)
            }}>
              Conferma
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

## 4. Vantaggi soluzione

✅ **Organizzazione chiara**: Base separate da variazioni  
✅ **Scalabile**: Funziona con 10 o 100 formazioni  
✅ **Ricerca**: Trova rapidamente quello che serve  
✅ **Raggruppamento**: Variazioni raggruppate per base (non lista piatta)  
✅ **UX intuitiva**: Tab familiari, dropdown espandibili  

---

## 5. Esempio struttura finale

**Formazioni totali**: ~42
- **Base**: 22 formazioni (15 ufficiali + 7 aggiuntive)
- **Variazioni**: ~20 (4-5 variazioni per 4-5 formazioni principali)

**Organizzazione**:
- Tab "Moduli Base": 22 pulsanti in griglia
- Tab "Variazioni": 5-6 gruppi espandibili (4-3-3, 4-2-1-3, 4-2-3-1, 3-5-2, ecc.)

---

## 6. Prossimi passi

1. ✅ Aggiungere struttura dati con `category` e `baseFormation`
2. ✅ Implementare helper `groupFormationsByBase` e `filterFormations`
3. ✅ Aggiornare modal con tab + raggruppamento
4. ✅ Aggiungere ricerca opzionale
5. ✅ Test con 40+ formazioni

---

**Questa soluzione gestisce facilmente tutte le variazioni senza confondere l'utente.**
