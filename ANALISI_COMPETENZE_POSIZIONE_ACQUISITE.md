# 🎯 Analisi: Competenze Posizione Acquisite vs Ruoli Originali Card

**Problema**: Cliente carica card Ronaldinho (AMF/LWF/RWF evidenziati nella card) ma può aggiungere competenze posizione (es. DC), mantenendo overall alto ma "snaturando" la card originale.

**Data**: 24 Gennaio 2026

---

## 🔍 PROBLEMA IDENTIFICATO

### Scenario Completo:

1. **Card Originale** (come esce):
   - Giocatore: Ronaldinho Gaúcho
   - **Ruoli Originali** (evidenziati nel campo in alto a destra):
     - ✅ **AMF** (Alta competenza) - evidenziato in verde brillante
     - ✅ **LWF** (Alta competenza) - evidenziato in verde brillante
     - ✅ **RWF** (Alta competenza) - evidenziato in verde brillante
     - ✅ **SS** (Alta competenza) - evidenziato in verde brillante
     - ✅ **CMF** (Intermedio competenza) - evidenziato in verde sfumato
   - ❌ **DC** (NON evidenziato) - non è un ruolo originale
   - Overall: 99
   - Statistiche: Ottime per AMF/LWF/RWF (Dribbling, Passaggio, Velocità)

2. **Cliente Aggiunge Competenze**:
   - Cliente usa "Programmi Aggiunta Posizione" per acquisire competenza in **DC**
   - Risultato: Ronaldinho ora ha competenza **Intermedio** o **Alta** anche in DC
   - Overall: **Rimane 99** (perché overall non dipende solo da competenza posizione)

3. **Cliente Assegna in Formazione**:
   - Assegna Ronaldinho a slot che richiede **DC**
   - Discrepanza: Ruolo originale (AMF/LWF/RWF) vs Ruolo acquisito (DC)

4. **Problema**:
   - La card è "snaturata" (Ronaldinho non è fatto per essere DC)
   - Statistiche non sono ottimali per DC (manca Difesa, Contatto fisico)
   - Ma competenza posizione è Alta (acquisita)
   - L'IA non sa che DC non è un ruolo originale

---

## 📊 COME FUNZIONA ATTUALE

### 1. **Salvataggio Card Originale**

**Quando cliente carica card**:
```javascript
// extract-player/route.js o save-player/route.js
{
  player_name: "Ronaldinho Gaúcho",
  position: "AMF",  // Posizione principale dalla card
  base_stats: { 
    dribbling: 95, 
    passaggio: 92, 
    velocita: 88,
    difesa: 35,  // Bassa (non è un difensore!)
    contatto_fisico: 65  // Media (non è un difensore!)
  },
  skills: [...],
  // position_competence: "Alta" (AMF) - se disponibile
  // MA: Non salviamo ruoli originali evidenziati nella card!
}
```

**Problema**: Non salviamo quali ruoli erano evidenziati nella card originale!

---

### 2. **Aggiunta Competenze dal Cliente**

**Cliente può**:
- Usare "Programmi Aggiunta Posizione" per acquisire competenza in DC
- Risultato: `position_competence` diventa "Alta" anche per DC

**Ma**:
- Non distinguiamo tra "ruolo originale" e "ruolo acquisito"
- Non salviamo quali ruoli erano nella card originale

---

### 3. **Assegnazione in Formazione**

**Cliente assegna Ronaldinho come DC**:
- Slot richiede: DC
- Competenza posizione: Alta (acquisita)
- Ma statistiche: Difesa 35, Contatto fisico 65 (non adatte per DC!)

**Problema**: L'IA vede competenza Alta in DC e pensa che Ronaldinho sia adatto, ma statistiche dicono il contrario!

---

## 🎯 SOLUZIONI POSSIBILI

### Soluzione 1: Salvare Ruoli Originali Card (RACCOMANDATO) ⭐⭐⭐

**Concetto**: Distinguere tra "ruoli originali card" e "ruoli acquisiti dal cliente".

**Implementazione**:

#### 1.1 Aggiungere Campo `original_positions`

**Tabella `players`**:
```sql
ALTER TABLE players ADD COLUMN original_positions TEXT[]; 
-- Array di posizioni originali dalla card (AMF, LWF, RWF, SS, CMF)
-- Esempio: ['AMF', 'LWF', 'RWF', 'SS', 'CMF']

ALTER TABLE players ADD COLUMN acquired_positions JSONB;
-- Posizioni acquisite dal cliente: { "DC": "Alta", "TD": "Intermedio" }
-- Esempio: { "DC": "Alta", "TD": "Intermedio" }
```

**Quando cliente carica card**:
```javascript
// extract-player/route.js
// Estrai ruoli evidenziati dalla card (dal campo in alto a destra)
const originalPositions = extractOriginalPositions(cardImage) 
// ['AMF', 'LWF', 'RWF', 'SS', 'CMF']

const playerData = {
  player_name: "Ronaldinho Gaúcho",
  position: "AMF",  // Posizione principale
  original_positions: originalPositions,  // NUOVO: ruoli originali
  acquired_positions: {},  // Vuoto inizialmente
  // ...
}
```

**Quando cliente aggiunge competenza**:
```javascript
// API per aggiungere competenza posizione (da creare)
// add-position-competence/route.js

const { player_id, position, competence_level } = await req.json()
// position: "DC", competence_level: "Alta"

// Recupera giocatore
const player = await admin.from('players').select('*').eq('id', player_id).single()

// Verifica se posizione è originale
const isOriginal = player.original_positions?.includes(position)

if (!isOriginal) {
  // Aggiungi a acquired_positions
  const acquired = player.acquired_positions || {}
  acquired[position] = competence_level
  
  await admin
    .from('players')
    .update({ acquired_positions: acquired })
    .eq('id', player_id)
}
```

#### 1.2 Usare nel Prompt IA

**Nel prompt contromisure**:
```javascript
// countermeasuresHelper.js
titolari.forEach((p, idx) => {
  const realPosition = p.position // "AMF" (posizione principale)
  const formationPosition = p.position_in_formation || realPosition // "DC" (posizione in formazione)
  const originalPositions = p.original_positions || [] // ['AMF', 'LWF', 'RWF', 'SS', 'CMF']
  const acquiredPositions = p.acquired_positions || {} // { "DC": "Alta" }
  
  const isOriginalPosition = originalPositions.includes(formationPosition)
  const isAcquiredPosition = acquiredPositions[formationPosition]
  
  rosterText += `- [${p.id}] ${p.player_name} - Overall ${p.overall_rating}\n`
  
  // NUOVO: Mostra ruoli originali vs acquisiti
  rosterText += `  Ruoli Originali Card: ${originalPositions.join(', ')}\n`
  
  if (isAcquiredPosition) {
    rosterText += `  Ruoli Acquisiti: ${Object.keys(acquiredPositions).join(', ')}\n`
  }
  
  if (formationPosition && !isOriginalPosition && isAcquiredPosition) {
    rosterText += `  ⚠️ ATTENZIONE: Giocatore usato in ruolo ACQUISITO (${formationPosition}), non originale!\n`
    rosterText += `  → Ruolo originale: ${originalPositions.join(', ')}\n`
    rosterText += `  → Ruolo acquisito: ${formationPosition} (${isAcquiredPosition})\n`
    rosterText += `  → Statistiche non ottimali: Difesa ${stats.difesa || 'N/A'}, Contatto fisico ${stats.contatto_fisico || 'N/A'}\n`
    rosterText += `  → Performance ridotta: Competenza ${isAcquiredPosition} ma statistiche insufficienti per ruolo\n`
  } else if (isOriginalPosition) {
    rosterText += `  ✅ Ruolo Originale: ${formationPosition} (competenza ${p.position_competence || 'Alta'})\n`
  }
  
  // Statistiche
  const stats = p.base_stats || {}
  rosterText += `  Stats: Velocità ${stats.velocita}, Dribbling ${stats.dribbling}, Passaggio ${stats.passaggio_rasoterra}, `
  rosterText += `Difesa ${stats.difesa || 'N/A'}, Contatto fisico ${stats.contatto_fisico || 'N/A'}\n`
})
```

**Vantaggi**:
- ✅ Distingue ruoli originali vs acquisiti
- ✅ L'IA sa che DC non è un ruolo originale
- ✅ L'IA valuta che statistiche non sono ottimali per DC
- ✅ L'IA può suggerire di usare ruoli originali

**Svantaggi**:
- ⚠️ Richiede estrazione ruoli originali dalla card (OCR/IA)
- ⚠️ Richiede modifica DB (aggiungere campi)
- ⚠️ Richiede API per aggiungere competenze

---

### Soluzione 2: Valutare Statistiche vs Ruolo (Alternativa) ⭐⭐

**Concetto**: Valutare se statistiche sono adatte per ruolo, indipendentemente da competenza.

**Implementazione**:

```javascript
// Funzione per valutare se statistiche sono adatte per ruolo
function evaluateStatsForPosition(stats, position) {
  const requirements = {
    'DC': { difesa: 80, contatto_fisico: 80, comportamento_difensivo: 75 },
    'TS': { velocita: 75, passaggio: 75, cross: 70 },
    'AMF': { passaggio: 80, dribbling: 75, comportamento_offensivo: 75 },
    'P': { finalizzazione: 80, velocita: 75, comportamento_offensivo: 75 },
    // ... altri ruoli
  }
  
  const req = requirements[position]
  if (!req) return { suitable: true } // Ruolo non in lista, assume OK
  
  const missing = []
  Object.entries(req).forEach(([stat, minValue]) => {
    const actualValue = stats[stat] || 0
    if (actualValue < minValue) {
      missing.push({ stat, required: minValue, actual: actualValue })
    }
  })
  
  return {
    suitable: missing.length === 0,
    missing: missing,
    score: missing.length === 0 ? 100 : Math.max(0, 100 - (missing.length * 20))
  }
}

// Nel prompt
titolari.forEach((p, idx) => {
  const formationPosition = p.position_in_formation || p.position
  const stats = p.base_stats || {}
  const evaluation = evaluateStatsForPosition(stats, formationPosition)
  
  if (!evaluation.suitable) {
    rosterText += `  ⚠️ ATTENZIONE: Statistiche non ottimali per ruolo ${formationPosition}!\n`
    evaluation.missing.forEach(m => {
      rosterText += `  → ${m.stat}: ${m.actual} (richiesto: ${m.required})\n`
    })
    rosterText += `  → Performance ridotta: -${100 - evaluation.score}% rispetto a giocatore ideale\n`
  }
})
```

**Vantaggi**:
- ✅ Non richiede salvare ruoli originali
- ✅ Valuta se statistiche sono adatte per ruolo
- ✅ Funziona anche se cliente non ha aggiunto competenze

**Svantaggi**:
- ⚠️ Richiede definire requisiti per ogni ruolo
- ⚠️ Non distingue tra ruolo originale vs acquisito
- ⚠️ Potrebbe essere troppo rigido

---

### Soluzione 3: Combinazione (RACCOMANDATO) ⭐⭐⭐

**Concetto**: Salvare ruoli originali + Valutare statistiche.

**Implementazione**:

1. **Salvare ruoli originali** (Soluzione 1)
2. **Valutare statistiche** (Soluzione 2)
3. **Nel prompt, mostrare entrambi**:
   - Se ruolo acquisito → avvisa
   - Se statistiche insufficienti → avvisa
   - Se entrambi → avvisa fortemente

**Esempio nel prompt**:
```
- [id] Ronaldinho - Overall 99
  Ruoli Originali Card: AMF, LWF, RWF, SS, CMF
  Ruoli Acquisiti: DC (Alta)
  
  ⚠️ ATTENZIONE: Giocatore usato in ruolo ACQUISITO (DC), non originale!
  → Ruolo originale: AMF, LWF, RWF, SS, CMF
  → Ruolo acquisito: DC (Alta competenza)
  
  ⚠️ ATTENZIONE: Statistiche non ottimali per ruolo DC!
  → Difesa: 35 (richiesto: 80) ❌
  → Contatto fisico: 65 (richiesto: 80) ❌
  → Comportamento difensivo: 40 (richiesto: 75) ❌
  
  → Performance ridotta: -60% rispetto a difensore ideale
  → Suggerimento: Usa ruoli originali (AMF, LWF, RWF) per performance ottimale
```

---

## 📊 ESTRAZIONE RUOLI ORIGINALI DALLA CARD

### Come Estrarre Ruoli Evidenziati

**Dalla card** (campo in alto a destra):
- Ruoli evidenziati in **verde brillante** = Competenza **Alta**
- Ruoli evidenziati in **verde sfumato** = Competenza **Intermedio**
- Ruoli non evidenziati = Competenza **Bassa** o non acquisita

**Implementazione**:

```javascript
// extract-player/route.js
// Usa visione IA per identificare ruoli evidenziati

const prompt = `
Analizza questa card giocatore e identifica:
1. Ruoli evidenziati nel campo in alto a destra (verde brillante = Alta, verde sfumato = Intermedio)
2. Posizione principale giocatore

Rispondi in formato JSON:
{
  "main_position": "AMF",
  "original_positions": [
    { "position": "AMF", "competence": "Alta" },
    { "position": "LWF", "competence": "Alta" },
    { "position": "RWF", "competence": "Alta" },
    { "position": "SS", "competence": "Alta" },
    { "position": "CMF", "competence": "Intermedio" }
  ]
}
`

// Dopo estrazione
const extractedData = await extractWithOpenAI(cardImage, prompt)

const originalPositions = extractedData.original_positions
  .filter(p => p.competence === 'Alta' || p.competence === 'Intermedio')
  .map(p => p.position) // ['AMF', 'LWF', 'RWF', 'SS', 'CMF']
```

---

## 🔧 IMPLEMENTAZIONE COMPLETA

### 1. Modifica DB

```sql
-- Aggiungi campi per ruoli originali e acquisiti
ALTER TABLE players ADD COLUMN original_positions TEXT[];
-- Array di posizioni originali dalla card: ['AMF', 'LWF', 'RWF', 'SS', 'CMF']

ALTER TABLE players ADD COLUMN acquired_positions JSONB;
-- Posizioni acquisite dal cliente: { "DC": "Alta", "TD": "Intermedio" }

ALTER TABLE players ADD COLUMN position_in_formation TEXT;
-- Posizione in cui giocatore è usato in formazione (da slot_positions)

-- Commenti
COMMENT ON COLUMN players.original_positions IS 'Ruoli originali evidenziati nella card (verde brillante/sfumato)';
COMMENT ON COLUMN players.acquired_positions IS 'Ruoli acquisiti dal cliente tramite Programmi Aggiunta Posizione';
COMMENT ON COLUMN players.position_in_formation IS 'Posizione in cui giocatore è usato in formazione (da slot_positions)';
```

---

### 2. Modifica `extract-player` per Estrarre Ruoli Originali

```javascript
// app/api/extract-player/route.js

// Aggiungi estrazione ruoli originali
const extractionPrompt = `
... prompt esistente ...

IMPORTANTE: Identifica anche i ruoli evidenziati nel campo in alto a destra della card:
- Verde brillante = Competenza Alta
- Verde sfumato = Competenza Intermedio
- Non evidenziato = Competenza Bassa o non acquisita

Rispondi in formato JSON includendo:
{
  ... dati esistenti ...
  "original_positions": [
    { "position": "AMF", "competence": "Alta" },
    { "position": "LWF", "competence": "Alta" },
    ...
  ]
}
`

// Dopo estrazione
const originalPositions = extractedData.original_positions
  ?.filter(p => p.competence === 'Alta' || p.competence === 'Intermedio')
  .map(p => p.position) || []

const playerData = {
  // ... dati esistenti ...
  original_positions: originalPositions,  // NUOVO
  acquired_positions: {},  // NUOVO: vuoto inizialmente
}
```

---

### 3. API per Aggiungere Competenza Posizione

```javascript
// app/api/supabase/add-position-competence/route.js (NUOVO)

export async function POST(req) {
  // ... autenticazione ...
  
  const { player_id, position, competence_level } = await req.json()
  // position: "DC", competence_level: "Alta"
  
  // Recupera giocatore
  const { data: player } = await admin
    .from('players')
    .select('original_positions, acquired_positions')
    .eq('id', player_id)
    .eq('user_id', userId)
    .single()
  
  // Verifica se posizione è originale
  const isOriginal = player.original_positions?.includes(position)
  
  if (isOriginal) {
    return NextResponse.json(
      { error: 'Posizione già presente come ruolo originale' },
      { status: 400 }
    )
  }
  
  // Aggiungi a acquired_positions
  const acquired = player.acquired_positions || {}
  acquired[position] = competence_level
  
  const { error } = await admin
    .from('players')
    .update({ acquired_positions: acquired })
    .eq('id', player_id)
    .eq('user_id', userId)
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json({ success: true })
}
```

---

### 4. Modifica Prompt IA

```javascript
// lib/countermeasuresHelper.js

titolari.forEach((p, idx) => {
  const realPosition = p.position // "AMF" (posizione principale)
  const formationPosition = p.position_in_formation || realPosition // "DC" (posizione in formazione)
  const originalPositions = p.original_positions || [] // ['AMF', 'LWF', 'RWF', 'SS', 'CMF']
  const acquiredPositions = p.acquired_positions || {} // { "DC": "Alta" }
  const stats = p.base_stats || {}
  
  const isOriginalPosition = originalPositions.includes(formationPosition)
  const acquiredCompetence = acquiredPositions[formationPosition]
  const isAcquiredPosition = !!acquiredCompetence
  
  rosterText += `- [${p.id}] ${p.player_name} - Overall ${p.overall_rating}\n`
  
  // Mostra ruoli originali
  if (originalPositions.length > 0) {
    rosterText += `  Ruoli Originali Card: ${originalPositions.join(', ')}\n`
  }
  
  // Mostra ruoli acquisiti
  if (Object.keys(acquiredPositions).length > 0) {
    rosterText += `  Ruoli Acquisiti: ${Object.keys(acquiredPositions).map(pos => 
      `${pos} (${acquiredPositions[pos]})`
    ).join(', ')}\n`
  }
  
  // Valuta se ruolo è originale o acquisito
  if (formationPosition && !isOriginalPosition && isAcquiredPosition) {
    rosterText += `  ⚠️ ATTENZIONE: Giocatore usato in ruolo ACQUISITO (${formationPosition}), non originale!\n`
    rosterText += `  → Ruoli originali: ${originalPositions.join(', ')}\n`
    rosterText += `  → Ruolo acquisito: ${formationPosition} (${acquiredCompetence})\n`
    
    // Valuta statistiche
    const evaluation = evaluateStatsForPosition(stats, formationPosition)
    if (!evaluation.suitable) {
      rosterText += `  ⚠️ Statistiche non ottimali per ruolo ${formationPosition}:\n`
      evaluation.missing.forEach(m => {
        rosterText += `    → ${m.stat}: ${m.actual} (richiesto: ${m.required})\n`
      })
      rosterText += `  → Performance ridotta: -${100 - evaluation.score}% rispetto a giocatore ideale\n`
    }
    
    rosterText += `  → Suggerimento: Usa ruoli originali (${originalPositions.join(', ')}) per performance ottimale\n`
  } else if (isOriginalPosition) {
    rosterText += `  ✅ Ruolo Originale: ${formationPosition} (competenza ${p.position_competence || 'Alta'})\n`
  }
  
  // Statistiche
  if (stats && Object.keys(stats).length > 0) {
    rosterText += `  Stats: Velocità ${stats.velocita || 'N/A'}, Dribbling ${stats.dribbling || 'N/A'}, `
    rosterText += `Passaggio ${stats.passaggio_rasoterra || 'N/A'}, Difesa ${stats.difesa || 'N/A'}, `
    rosterText += `Contatto fisico ${stats.contatto_fisico || 'N/A'}\n`
  }
})
```

---

## 📊 ESEMPIO PROMPT FINALE

### Con Soluzione Implementata:

```
TITOLARI (in campo, 11):
- [id-1] Ronaldinho Gaúcho - Overall 99 slot 2
  Ruoli Originali Card: AMF, LWF, RWF, SS, CMF
  Ruoli Acquisiti: DC (Alta)
  
  ⚠️ ATTENZIONE: Giocatore usato in ruolo ACQUISITO (DC), non originale!
  → Ruoli originali: AMF, LWF, RWF, SS, CMF
  → Ruolo acquisito: DC (Alta competenza)
  
  ⚠️ Statistiche non ottimali per ruolo DC:
    → Difesa: 35 (richiesto: 80) ❌
    → Contatto fisico: 65 (richiesto: 80) ❌
    → Comportamento difensivo: 40 (richiesto: 75) ❌
  → Performance ridotta: -60% rispetto a difensore ideale
  
  → Suggerimento: Usa ruoli originali (AMF, LWF, RWF) per performance ottimale
  
  Stats: Velocità 88, Dribbling 95, Passaggio 92, Difesa 35, Contatto fisico 65
  Competenza Posizione: Alta (DC acquisita, non originale)
  Stile Gioco: Ala prolifica (compatibile con LWF/RWF, non con DC)
```

**L'IA può ora**:
- ✅ Valutare che DC non è un ruolo originale
- ✅ Valutare che statistiche non sono ottimali per DC
- ✅ Suggerire di usare ruoli originali (AMF, LWF, RWF)
- ✅ Considerare performance ridotta nei suggerimenti

---

## ⚠️ ACCORTEZZE

### 1. **Estrazione Ruoli Originali**

**Problema**: Estrazione ruoli dalla card può essere imprecisa.

**Soluzione**:
- Usa visione IA (GPT-4o Vision) per identificare ruoli evidenziati
- Fallback: Se estrazione fallisce, usa solo posizione principale
- Permetti modifica manuale ruoli originali (se cliente sa meglio)

---

### 2. **Gestione Retrocompatibilità**

**Problema**: Giocatori esistenti non hanno `original_positions`.

**Soluzione**:
```javascript
// Se original_positions è null/vuoto, assume che position principale sia l'unico ruolo originale
const originalPositions = p.original_positions && p.original_positions.length > 0
  ? p.original_positions
  : [p.position] // Fallback: usa posizione principale
```

---

### 3. **UI per Gestire Competenze**

**Aggiungere UI**:
- Mostra ruoli originali vs acquisiti
- Permetti aggiungere/rimuovere competenze acquisite
- Mostra impatto statistiche per ogni ruolo

---

## ✅ CHECKLIST IMPLEMENTAZIONE

- [ ] Aggiungere campi `original_positions`, `acquired_positions`, `position_in_formation` a tabella `players`
- [ ] Modificare `extract-player` per estrarre ruoli originali dalla card
- [ ] Creare API `add-position-competence` per aggiungere competenze acquisite
- [ ] Modificare `assign-player-to-slot` per salvare `position_in_formation`
- [ ] Modificare prompt IA per mostrare ruoli originali vs acquisiti
- [ ] Implementare `evaluateStatsForPosition` per valutare statistiche vs ruolo
- [ ] Aggiungere warning frontend quando assegni giocatore in ruolo acquisito
- [ ] Testare con giocatore in ruolo acquisito
- [ ] Verificare che IA valuti performance corretta

---

## 🎯 CONCLUSIONE

**Problema**: Cliente può aggiungere competenze posizione che "snaturano" la card originale.

**Soluzione Raccomandata**: 
1. ✅ Salvare ruoli originali dalla card (estrazione da campo evidenziato)
2. ✅ Salvare ruoli acquisiti dal cliente
3. ✅ Valutare statistiche vs ruolo richiesto
4. ✅ Mostrare nel prompt IA ruoli originali vs acquisiti + valutazione statistiche
5. ✅ L'IA valuta performance corretta considerando entrambi

**Risultato**: L'IA sa che Ronaldinho in DC è "snaturato" (ruolo acquisito + statistiche insufficienti) e suggerisce di usare ruoli originali.

---

**Ultimo Aggiornamento**: 24 Gennaio 2026  
**Stato**: 📝 **ANALISI COMPLETA - Pronta per Implementazione**
