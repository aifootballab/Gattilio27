# Proposta: Definizione Moduli eFootball con Variazioni

**Data**: 24 Gennaio 2026  
**Contesto**: eFootball ha **15 formazioni ufficiali** + variazioni (compatto, largo, offensivo, difensivo). Dalla foto: **4-2-1-3 con mediani vicini** (centrocampo compatto).  
**Obiettivo**: Definire struttura organizzata per moduli base + variazioni, come categorizzarli, quali aggiungere.

---

## 1. Formazioni ufficiali eFootball (15 totali)

### Formazioni con 4 difensori (8)
1. **4-4-2** ✅ (già presente)
2. **4-3-3** ✅ (già presente)
3. **4-3-2-1** ❌ (manca)
4. **4-3-1-2** ❌ (manca)
5. **4-2-3-1** ✅ (già presente)
6. **4-2-1-3** ❌ (manca - **nella foto**)
7. **4-1-4-1** ❌ (manca)
8. **4-1-2-3** ✅ (già presente, ma è 4-1-2-3)

### Formazioni con 3 difensori (4)
9. **3-4-3** ✅ (già presente)
10. **3-2-4-1** ❌ (manca)
11. **3-2-3-2** ❌ (manca)
12. **3-1-4-2** ✅ (già presente)
13. **3-4-1-2** ✅ (già presente)
14. **3-5-2** ✅ (già presente)

### Formazioni con 5 difensori (3)
15. **5-3-2** ✅ (già presente)
16. **5-2-2-1** ❌ (manca)
17. **5-2-1-2** ❌ (manca)
18. **5-4-1** ✅ (già presente)
19. **5-2-3** ✅ (già presente)

**Totale attuale**: 14 formazioni  
**Mancanti**: 5 formazioni base (4-3-2-1, 4-3-1-2, 4-2-1-3, 4-1-4-1, 3-2-4-1, 3-2-3-2, 5-2-2-1, 5-2-1-2)

---

## 2. Analisi foto: 4-2-1-3 con mediani vicini

**Dalla foto**:
- **Formazione**: 4-2-1-3
- **Caratteristica**: **Mediani vicini** (centrocampo compatto)
- **Struttura**:
  - 4 difensori (Zanetti TS, Maldini DC, Rijkaard DC, Cannavaro DC)
  - 2 mediani **vicini** (Vieira MED profondo, Sneijder TRQ sinistra avanzato, Davids CC destra avanzato) → **triangolo compatto**
  - 3 attaccanti (Vinícius P sinistra, Eto'o SP centrale, Gullit SP destra)

**Posizioni stimate dalla foto** (coordinate percentuali):
- **Portiere (0)**: x: 50, y: 90
- **Difesa (1-4)**: y: ~75, x: 25 (TS), 40 (DC), 60 (DC), 75 (TD)
- **Mediani (5-7)**: **COMPATTI** - y: ~55-60, x: 40-50-60 (triangolo centrale)
  - Vieira (MED): x: 50, y: 60 (profondo, centrale)
  - Sneijder (TRQ): x: 40, y: 50 (sinistra, avanzato)
  - Davids (CC): x: 60, y: 50 (destra, avanzato)
- **Attacco (8-10)**: y: ~25, x: 25 (SP), 50 (SP centrale), 75 (SP)

**Differenza vs 4-2-3-1**: In 4-2-1-3 i due mediani sono più vicini (compatto) e il trequartista è più avanzato, creando un triangolo offensivo con i 3 attaccanti.

---

## 3. Sistema di categorizzazione proposto

### 3.1 Struttura dati

```javascript
const formations = {
  // BASE: Formazioni ufficiali eFootball
  '4-3-3': {
    name: '4-3-3',
    category: 'base',
    baseFormation: '4-3-3',
    slot_positions: { /* posizioni standard */ }
  },
  
  // VARIAZIONI: Modifiche posizionali della base
  '4-3-3-wide': {
    name: '4-3-3 (Largo)',
    category: 'variation',
    baseFormation: '4-3-3',
    variation: 'wide',
    slot_positions: { /* terzini e ali più esterni */ }
  },
  '4-3-3-compact': {
    name: '4-3-3 (Compatto)',
    category: 'variation',
    baseFormation: '4-3-3',
    variation: 'compact',
    slot_positions: { /* centrocampo più stretto */ }
  },
  '4-3-3-offensive': {
    name: '4-3-3 (Offensivo)',
    category: 'variation',
    baseFormation: '4-3-3',
    variation: 'offensive',
    slot_positions: { /* attaccanti più avanzati, difesa più alta */ }
  },
  '4-3-3-defensive': {
    name: '4-3-3 (Difensivo)',
    category: 'variation',
    baseFormation: '4-3-3',
    variation: 'defensive',
    slot_positions: { /* difesa più bassa, centrocampo più arretrato */ }
  },
  
  // NUOVO: 4-2-1-3 (dalla foto)
  '4-2-1-3': {
    name: '4-2-1-3',
    category: 'base',
    baseFormation: '4-2-1-3',
    slot_positions: { /* mediani vicini, triangolo compatto */ }
  },
  '4-2-1-3-compact': {
    name: '4-2-1-3 (Compatto)',
    category: 'variation',
    baseFormation: '4-2-1-3',
    variation: 'compact',
    slot_positions: { /* mediani ancora più vicini */ }
  },
  '4-2-1-3-wide': {
    name: '4-2-1-3 (Largo)',
    category: 'variation',
    baseFormation: '4-2-1-3',
    variation: 'wide',
    slot_positions: { /* terzini e ali più esterni */ }
  }
}
```

### 3.2 Categorie UI

**Organizzazione suggerita**:
1. **"Moduli Base"** (15 formazioni ufficiali eFootball)
2. **"Variazioni"** (raggruppate per base: 4-3-3, 4-2-1-3, ecc.)
3. **"Personalizzato"** (se implementato drag & drop in futuro)

**UI modal selector**:
- **Tab/Sezioni**: "Base" | "Variazioni" | "Personalizzato"
- **Filtro per base**: "Tutte" | "4-3-3" | "4-2-1-3" | ecc.
- **Icone**: 🔵 Base, 🟢 Variazione, ✏️ Personalizzato

---

## 4. Variazioni da implementare (sistema)

### 4.1 Tipi di variazioni

Per ogni formazione base, possiamo creare variazioni modificando le coordinate:

| Variazione | Modifica coordinate | Esempio |
|------------|---------------------|---------|
| **Largo** | Terzini/ali x ±10-15% (più esterni), centrocampisti x ±5% | 4-3-3: terzini x: 20→15, x: 75→80 |
| **Stretto** | Terzini/ali x ±5-10% (più interni), centrocampisti x ±3% | 4-3-3: terzini x: 25→30, x: 75→70 |
| **Offensivo** | Attaccanti y -5-10% (più avanzati), difesa y +3-5% (più alta) | 4-3-3: attaccanti y: 25→20, difesa y: 75→78 |
| **Difensivo** | Difesa y -5-10% (più bassa), centrocampo y +3-5% (più arretrato) | 4-3-3: difesa y: 75→70, centrocampo y: 50→55 |
| **Compatto** | Centrocampisti x ±3-5% (più vicini al centro), distanza y ridotta | 4-2-1-3: mediani x: 40,50,60 → 42,50,58 |
| **Ampio** | Centrocampisti x ±5-10% (più larghi), terzini più esterni | 4-3-3: centrocampo x: 35,50,65 → 30,50,70 |

### 4.2 Algoritmo generazione variazioni

```javascript
// Helper per generare variazioni da base
function generateVariation(baseFormation, variationType) {
  const base = formations[baseFormation]
  const slots = { ...base.slot_positions }
  
  // Identifica ruoli per slot
  const roles = {
    goalkeeper: [0],
    defenders: [1, 2, 3, 4],
    midfielders: [5, 6, 7],
    attackers: [8, 9, 10]
  }
  
  switch (variationType) {
    case 'wide':
      // Terzini e ali più esterni
      if (slots[1]?.position === 'TD') slots[1].x = Math.max(10, slots[1].x - 5)
      if (slots[4]?.position === 'TS') slots[4].x = Math.min(90, slots[4].x + 5)
      // Ali più esterne
      roles.attackers.forEach(i => {
        if (slots[i]?.position === 'SP' || slots[i]?.position === 'P') {
          if (slots[i].x < 50) slots[i].x = Math.max(15, slots[i].x - 5)
          else slots[i].x = Math.min(85, slots[i].x + 5)
        }
      })
      break
    case 'compact':
      // Centrocampo più stretto
      roles.midfielders.forEach(i => {
        if (slots[i]) {
          if (slots[i].x < 50) slots[i].x = Math.min(50, slots[i].x + 3)
          else slots[i].x = Math.max(50, slots[i].x - 3)
        }
      })
      break
    case 'offensive':
      // Attaccanti più avanzati, difesa più alta
      roles.attackers.forEach(i => {
        if (slots[i]) slots[i].y = Math.max(10, slots[i].y - 5)
      })
      roles.defenders.forEach(i => {
        if (slots[i]) slots[i].y = Math.min(80, slots[i].y + 3)
      })
      break
    case 'defensive':
      // Difesa più bassa, centrocampo arretrato
      roles.defenders.forEach(i => {
        if (slots[i]) slots[i].y = Math.max(60, slots[i].y - 5)
      })
      roles.midfielders.forEach(i => {
        if (slots[i]) slots[i].y = Math.min(70, slots[i].y + 5)
      })
      break
  }
  
  return slots
}
```

---

## 5. Formazioni da aggiungere (priorità)

### Priorità ALTA (mancanti ufficiali)

1. **4-2-1-3** (nella foto, molto usata)
   - Base: mediani vicini (x: 40, 50, 60), trequartista avanzato (y: 45)
   - Variazioni: compatto, largo, offensivo

2. **4-3-2-1** (meta, 3 attaccanti)
   - Base: 3 centrocampisti, 2 trequartisti, 1 punta
   - Variazioni: largo, offensivo

3. **4-3-1-2** (diamond, meta)
   - Base: 3 centrocampisti, 1 trequartista, 2 attaccanti
   - Variazioni: compatto, offensivo

4. **4-1-4-1** (difensivo)
   - Base: 1 mediano, 4 centrocampisti larghi, 1 attaccante
   - Variazioni: largo, difensivo

### Priorità MEDIA (3 difensori)

5. **3-2-4-1** (offensivo)
6. **3-2-3-2** (bilanciato)

### Priorità BASSA (5 difensori)

7. **5-2-2-1** (difensivo)
8. **5-2-1-2** (difensivo con trequartista)

---

## 6. Proposta implementazione

### Fase 1: Aggiungere formazioni base mancanti (2-3 ore)

**Lista completa da aggiungere**:
1. `4-2-1-3` (dalla foto, mediani vicini)
2. `4-3-2-1`
3. `4-3-1-2`
4. `4-1-4-1`
5. `3-2-4-1`
6. `3-2-3-2`
7. `5-2-2-1`
8. `5-2-1-2`

**Totale**: 8 nuove formazioni base → **22 formazioni totali**

### Fase 2: Aggiungere variazioni per formazioni principali (3-4 ore)

**Variazioni per formazioni più usate** (4-3-3, 4-2-3-1, 4-2-1-3, 3-5-2):
- Largo, Stretto, Offensivo, Difensivo, Compatto

**Totale**: ~20 variazioni → **~42 formazioni totali**

### Fase 3: Organizzare UI con categorie (1 ora)

- Tab "Base" (22 formazioni)
- Tab "Variazioni" (raggruppate per base)
- Filtro per base formazione

---

## 7. Definizione 4-2-1-3 dalla foto

**Analisi posizioni** (coordinate percentuali stimate):

```javascript
'4-2-1-3': {
  name: '4-2-1-3',
  category: 'base',
  slot_positions: {
    0: { x: 50, y: 90, position: 'PT' }, // Buffon
    1: { x: 25, y: 75, position: 'TS' }, // Zanetti
    2: { x: 40, y: 75, position: 'DC' }, // Maldini
    3: { x: 60, y: 75, position: 'DC' }, // Rijkaard
    4: { x: 75, y: 75, position: 'TD' }, // Cannavaro (DC ma posizionato a destra)
    5: { x: 50, y: 60, position: 'MED' }, // Vieira (profondo, centrale)
    6: { x: 40, y: 50, position: 'TRQ' }, // Sneijder (sinistra, avanzato)
    7: { x: 60, y: 50, position: 'CC' }, // Davids (destra, avanzato)
    8: { x: 25, y: 25, position: 'P' }, // Vinícius (sinistra)
    9: { x: 50, y: 25, position: 'SP' }, // Eto'o (centrale)
    10: { x: 75, y: 25, position: 'SP' } // Gullit (destra)
  }
}
```

**Caratteristiche**:
- **Mediani vicini**: slot 5-7 formano triangolo compatto (x: 40-50-60, y: 50-60)
- **Trequartista avanzato**: slot 6 a y: 50 (più avanzato di 4-2-3-1)
- **3 attaccanti**: slot 8-10 in linea (y: 25)

**Variazione "Compatto"** (mediani ancora più vicini):
```javascript
'4-2-1-3-compact': {
  name: '4-2-1-3 (Compatto)',
  category: 'variation',
  baseFormation: '4-2-1-3',
  variation: 'compact',
  slot_positions: {
    // ... stesso del base ma:
    5: { x: 50, y: 60, position: 'MED' }, // Vieira centrale
    6: { x: 42, y: 50, position: 'TRQ' }, // Sneijder più vicino al centro (x: 40→42)
    7: { x: 58, y: 50, position: 'CC' } // Davids più vicino al centro (x: 60→58)
  }
}
```

---

## 8. Checklist decisione

- [ ] **Quante formazioni base aggiungere?** (8 mancanti o solo 4-2-1-3?)
- [ ] **Quante variazioni per base?** (tutte o solo per formazioni principali?)
- [ ] **Organizzazione UI**: Tab, filtri, categorie?
- [ ] **Naming**: "4-2-1-3 (Compatto)" vs "4-2-1-3 Compatto"?
- [ ] **Priorità**: Formazioni base prima, variazioni dopo?

---

## 9. Prossimi passi (se approvato)

1. **Definire lista finale**: quali 8 formazioni base + quali variazioni
2. **Calcolare coordinate** per ogni formazione (basate su foto, ricerca, best practices)
3. **Implementare** in `formations` object in `gestione-formazione/page.jsx`
4. **Organizzare UI** con categorie/tab
5. **Test**: Verificare che salvataggio funzioni con nuove formazioni

---

**Nessuna modifica al codice è stata applicata.** Questo documento è solo analisi e proposta strutturata.
