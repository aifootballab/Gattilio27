# Analisi Rischi: Modifiche UX Nomi Sezioni + Variazioni Formazioni

**Data**: 24 Gennaio 2026  
**Obiettivo**: Cambiare nomi sezioni foto e implementare gestione variazioni formazioni.

---

## 1. MODIFICA 1: Cambio nomi sezioni foto

### Cosa cambia
- **PRIMA**: "Card, Statistiche, Abilità/Booster" (3 sezioni, Card inclusa)
- **DOPO**: "Statistiche-Abilità-Booster" (3 sezioni, Card rimossa, Abilità e Booster separate)

### File da modificare
1. `app/giocatore/[id]/page.jsx` (riga 316-318)
2. `app/gestione-formazione/page.jsx` (righe 2152-2159, 2330, 2355)

### Modifiche specifiche

#### A. Logica `isProfileComplete`
**PRIMA**:
```javascript
const isProfileComplete = photoSlots.card && photoSlots.statistiche && (photoSlots.abilita || photoSlots.booster)
```

**DOPO**:
```javascript
const isProfileComplete = photoSlots.statistiche && photoSlots.abilita && photoSlots.booster
```

#### B. Array `completedSections`
**PRIMA**:
```javascript
const completedSections = [
  photoSlots.card && 'Card',
  photoSlots.statistiche && 'Statistiche',
  (photoSlots.abilita || photoSlots.booster) && 'Abilità/Booster'
].filter(Boolean).length
```

**DOPO**:
```javascript
const completedSections = [
  photoSlots.statistiche && 'Statistiche',
  photoSlots.abilita && 'Abilità',
  photoSlots.booster && 'Booster'
].filter(Boolean).length
```

#### C. Commenti
- Cambiare "3 foto (Card, Statistiche, Abilità/Booster)" → "3 foto (Statistiche, Abilità, Booster)"

---

## 2. RISCHI Modifica 1

### ⚠️ RISCHIO ALTO: Profili esistenti con solo Card

**Problema**: Se un giocatore ha solo `photoSlots.card = true` ma non ha Statistiche/Abilità/Booster, **PRIMA** era considerato incompleto (giusto), **DOPO** sarà ancora incompleto (giusto).

**Ma**: Se un giocatore aveva `photoSlots.card = true` e `photoSlots.statistiche = true` ma **NON** aveva `photoSlots.abilita` e `photoSlots.booster`, **PRIMA** era considerato completo (perché `abilita || booster`), **DOPO** sarà incompleto (perché richiede entrambi).

**Impatto**: 
- ✅ **POSITIVO**: Più rigore (richiede tutte e 3 le sezioni)
- ⚠️ **ATTENZIONE**: Profili che prima erano "completi" potrebbero diventare "incompleti"

**Soluzione**: 
- Il salvataggio di `photoSlots.card` **NON viene toccato** (righe 577, 966 continuano a funzionare)
- Solo la **logica di visualizzazione** cambia
- I dati esistenti **non vengono modificati**

### ⚠️ RISCHIO MEDIO: Conteggio "/3"

**Problema**: Il conteggio mostra "/3" ma ora conta 3 sezioni diverse (Statistiche, Abilità, Booster invece di Card, Statistiche, Abilità/Booster).

**Impatto**: 
- ✅ **OK**: Il conteggio rimane "/3" (corretto, sono sempre 3 sezioni)
- ✅ **OK**: La logica è più chiara (ogni sezione è separata)

### ✅ RISCHIO BASSO: Salvataggio dati

**Problema**: `photoSlots.card` viene ancora salvato quando si carica una foto di tipo 'card' (righe 577, 966).

**Impatto**: 
- ✅ **OK**: I dati vengono salvati correttamente
- ✅ **OK**: Non viene usato per la logica di completezza, ma rimane nel DB (compatibilità retroattiva)

---

## 3. MODIFICA 2: Gestione variazioni formazioni

### Cosa cambia
- Aggiungere struttura dati con `category: 'base' | 'variation'`
- Aggiungere `baseFormation` e `variation` per variazioni
- Modificare UI modal selector con tab "Base" / "Variazioni"
- Aggiungere raggruppamento per base nelle variazioni

### File da modificare
1. `app/gestione-formazione/page.jsx` (object `formations`, componente `FormationSelectorModal`)

### Modifiche specifiche

#### A. Struttura dati `formations`
**PRIMA**:
```javascript
const formations = {
  '4-3-3': {
    name: '4-3-3',
    slot_positions: { ... }
  }
}
```

**DOPO**:
```javascript
const formations = {
  '4-3-3': {
    name: '4-3-3',
    category: 'base',
    baseFormation: '4-3-3',
    slot_positions: { ... }
  },
  '4-3-3-wide': {
    name: '4-3-3 (Largo)',
    category: 'variation',
    baseFormation: '4-3-3',
    variation: 'wide',
    slot_positions: { ... }
  }
}
```

#### B. UI Modal
- Aggiungere tab "Moduli Base" / "Variazioni"
- Aggiungere ricerca opzionale
- Raggruppare variazioni per base (dropdown/espansione)

---

## 4. RISCHI Modifica 2

### ✅ RISCHIO BASSO: Struttura dati esistente

**Problema**: Le formazioni esistenti non hanno `category`, `baseFormation`, `variation`.

**Impatto**: 
- ✅ **OK**: Possiamo aggiungere questi campi alle formazioni esistenti (default: `category: 'base'`, `baseFormation: name`)
- ✅ **OK**: Le formazioni esistenti continuano a funzionare

**Soluzione**: 
- Aggiungere `category: 'base'` e `baseFormation: name` a tutte le formazioni esistenti
- Le nuove variazioni avranno `category: 'variation'`

### ✅ RISCHIO BASSO: Salvataggio formazione

**Problema**: Il salvataggio usa solo `formation` (string) e `slot_positions` (JSONB).

**Impatto**: 
- ✅ **OK**: Non cambia nulla nel salvataggio (usa solo `name` e `slot_positions`)
- ✅ **OK**: Le variazioni vengono salvate come formazioni normali

### ⚠️ RISCHIO MEDIO: UI Modal

**Problema**: Il modal attuale mostra tutte le formazioni in una griglia semplice. Con 40+ formazioni diventa ingestibile.

**Impatto**: 
- ✅ **POSITIVO**: Tab + raggruppamento migliora UX
- ⚠️ **ATTENZIONE**: Deve essere testato su mobile (tab potrebbero essere piccoli)

**Soluzione**: 
- Tab responsive (stack su mobile se necessario)
- Test su dispositivi diversi

---

## 5. COMPATIBILITÀ RETROATTIVA

### ✅ Dati esistenti
- `photo_slots.card` continua a essere salvato (non viene rimosso)
- `photo_slots.statistiche`, `photo_slots.abilita`, `photo_slots.booster` continuano a funzionare
- Formazioni esistenti continuano a funzionare (aggiungiamo solo campi opzionali)

### ⚠️ Profili "completi" esistenti
- Se un profilo aveva `card: true`, `statistiche: true`, `abilita: true` ma **NON** `booster: true`, **PRIMA** era completo, **DOPO** sarà incompleto
- **Impatto**: L'utente dovrà caricare anche la foto Booster per completare il profilo

---

## 6. CHECKLIST SICUREZZA

### Modifica 1 (Nomi sezioni)
- [x] `photoSlots.card` continua a essere salvato (non toccato)
- [x] Logica `isProfileComplete` più rigida (richiede tutte e 3)
- [x] Conteggio "/3" rimane corretto
- [x] Dati esistenti non vengono modificati
- [ ] **TEST**: Verificare che profili con solo Card+Statistiche+Abilità (senza Booster) diventino incompleti

### Modifica 2 (Variazioni formazioni)
- [x] Formazioni esistenti continuano a funzionare
- [x] Salvataggio non cambia (usa solo `name` e `slot_positions`)
- [x] Struttura dati retrocompatibile (campi opzionali)
- [ ] **TEST**: Verificare UI su mobile
- [ ] **TEST**: Verificare che selezione formazione funzioni con nuove variazioni

---

## 7. RACCOMANDAZIONI

### ✅ SICURO procedere con:
1. **Modifica 1 (Nomi sezioni)**: 
   - Cambio solo logica visualizzazione
   - Dati esistenti non toccati
   - **ATTENZIONE**: Alcuni profili potrebbero diventare "incompleti" (ma è corretto, richiedono tutte e 3 le sezioni)

2. **Modifica 2 (Variazioni formazioni)**:
   - Aggiunta struttura dati retrocompatibile
   - UI migliorata senza rompere funzionalità esistenti
   - **ATTENZIONE**: Testare su mobile

### ⚠️ DA TESTARE DOPO:
1. Profili esistenti: verificare che quelli con Card+Statistiche+Abilità (senza Booster) diventino incompleti
2. UI formazioni: verificare che tab funzionino su mobile
3. Salvataggio formazioni: verificare che variazioni vengano salvate correttamente

---

## 8. CONCLUSIONE

**RISCHIO TOTALE**: 🟡 **MEDIO-BASSO**

- **Modifica 1**: Cambio solo logica visualizzazione, dati non toccati. Alcuni profili potrebbero diventare "incompleti" (ma è corretto).
- **Modifica 2**: Aggiunta retrocompatibile, UI migliorata. Testare su mobile.

**RACCOMANDAZIONE**: ✅ **SICURO procedere**, ma testare dopo l'implementazione.
