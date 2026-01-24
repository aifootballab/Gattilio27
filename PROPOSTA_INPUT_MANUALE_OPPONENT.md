# 💡 Proposta: Input Manuale Nome Avversario

**Data**: 23 Gennaio 2026  
**Obiettivo**: Permettere al cliente di inserire manualmente il nome dell'avversario/match

---

## 🎯 VANTAGGI

1. ✅ **Controllo Utente**: Il cliente decide come identificare la partita
2. ✅ **Priorità Massima**: Input manuale > Estrazione AI > Identificatore Intelligente
3. ✅ **Retrocompatibilità**: Funziona anche per partite vecchie (edit)
4. ✅ **Velocità**: Più veloce dell'estrazione AI
5. ✅ **Flessibilità**: Può essere un nome personalizzato (es: "Amichevole vs Mario")

---

## 📋 IMPLEMENTAZIONE

### **Strategia a 2 Punti**:

1. **Wizard "Aggiungi Partita"** → Campo opzionale nel modal Summary
2. **Lista Partite Dashboard** → Edit inline (click per modificare)

---

## 🎨 1. WIZARD "AGGIUNGI PARTITA"

### **Dove**: Modal Summary (prima del salvataggio)

**File**: `app/match/new/page.jsx`

**Modifiche**:

#### **A. Aggiungere State**:
```javascript
const [opponentName, setOpponentName] = React.useState('')
```

#### **B. Aggiungere Campo nel Modal Summary** (dopo riga ~780):
```jsx
{/* Campo Nome Avversario - Opzionale */}
<div style={{ marginBottom: '16px' }}>
  <label style={{
    display: 'block',
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--neon-blue)',
    marginBottom: '8px'
  }}>
    {t('opponentNameLabel')} <span style={{ opacity: 0.6, fontWeight: 400 }}>({t('optional')})</span>
  </label>
  <input
    type="text"
    value={opponentName}
    onChange={(e) => setOpponentName(e.target.value)}
    placeholder={t('opponentNamePlaceholder')}
    maxLength={255}
    style={{
      width: '100%',
      padding: '12px',
      background: 'rgba(0, 212, 255, 0.1)',
      border: '1px solid rgba(0, 212, 255, 0.3)',
      borderRadius: '8px',
      color: '#00d4ff',
      fontSize: '14px',
      outline: 'none',
      transition: 'all 0.2s ease'
    }}
    onFocus={(e) => {
      e.target.style.borderColor = 'rgba(0, 212, 255, 0.6)'
      e.target.style.boxShadow = '0 0 10px rgba(0, 212, 255, 0.3)'
    }}
    onBlur={(e) => {
      e.target.style.borderColor = 'rgba(0, 212, 255, 0.3)'
      e.target.style.boxShadow = 'none'
    }}
  />
  <div style={{
    fontSize: '12px',
    opacity: 0.7,
    marginTop: '4px',
    color: '#00d4ff'
  }}>
    {t('opponentNameHint')}
  </div>
</div>
```

#### **C. Includere in `matchData` quando si salva** (riga ~259):
```javascript
const matchData = {
  result: matchResult,
  opponent_name: opponentName.trim() || null, // ⭐ NUOVO: Input manuale
  player_ratings: stepData.player_ratings || null,
  // ... resto dei campi
}
```

#### **D. Salvare in localStorage** (per persistenza durante wizard):
```javascript
// In saveProgress()
localStorage.setItem(STORAGE_KEY, JSON.stringify({
  stepData,
  stepImages,
  opponentName, // ⭐ NUOVO
  timestamp: Date.now()
}))

// In useEffect che carica progresso
if (parsed.opponentName) {
  setOpponentName(parsed.opponentName)
}
```

---

## 🎨 2. LISTA PARTITE - EDIT INLINE

### **Dove**: Dashboard (`app/page.jsx`)

**Modifiche**:

#### **A. Aggiungere State per Edit**:
```javascript
const [editingOpponentId, setEditingOpponentId] = React.useState(null)
const [editingOpponentName, setEditingOpponentName] = React.useState('')
const [savingOpponentName, setSavingOpponentName] = React.useState(false)
```

#### **B. Funzione per Salvare Nome**:
```javascript
const handleSaveOpponentName = async (matchId, e) => {
  e.stopPropagation() // Evita click sulla card
  
  if (!editingOpponentName.trim()) {
    setEditingOpponentId(null)
    return
  }

  setSavingOpponentName(true)
  try {
    const { data: session } = await supabase.auth.getSession()
    if (!session?.session?.access_token) {
      throw new Error('Sessione scaduta')
    }

    const token = session.session.access_token

    // Update via API
    const updateRes = await fetch(`/api/supabase/update-match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        match_id: matchId,
        opponent_name: editingOpponentName.trim()
      })
    })

    if (!updateRes.ok) {
      throw new Error('Errore nel salvataggio')
    }

    // Aggiorna localmente
    setRecentMatches(prev => prev.map(m => 
      m.id === matchId 
        ? { ...m, opponent_name: editingOpponentName.trim() }
        : m
    ))

    setEditingOpponentId(null)
    setEditingOpponentName('')
  } catch (err) {
    console.error('[Dashboard] Error saving opponent name:', err)
    alert('Errore nel salvataggio. Riprova.')
  } finally {
    setSavingOpponentName(false)
  }
}
```

#### **C. Modificare UI Card Partita** (riga ~570):
```jsx
<div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--neon-orange)', marginBottom: '4px' }}>
  {editingOpponentId === match.id ? (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <input
        type="text"
        value={editingOpponentName}
        onChange={(e) => setEditingOpponentName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleSaveOpponentName(match.id, e)
          } else if (e.key === 'Escape') {
            setEditingOpponentId(null)
            setEditingOpponentName('')
          }
        }}
        autoFocus
        maxLength={255}
        style={{
          flex: 1,
          padding: '6px 10px',
          background: 'rgba(255, 165, 0, 0.2)',
          border: '1px solid rgba(255, 165, 0, 0.5)',
          borderRadius: '6px',
          color: '#ffa500',
          fontSize: '14px',
          outline: 'none'
        }}
        disabled={savingOpponentName}
      />
      <button
        onClick={(e) => handleSaveOpponentName(match.id, e)}
        disabled={savingOpponentName}
        style={{
          padding: '6px 10px',
          background: 'rgba(34, 197, 94, 0.2)',
          border: '1px solid rgba(34, 197, 94, 0.5)',
          borderRadius: '6px',
          color: '#86efac',
          cursor: savingOpponentName ? 'not-allowed' : 'pointer',
          fontSize: '12px'
        }}
      >
        {savingOpponentName ? '...' : '✓'}
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation()
          setEditingOpponentId(null)
          setEditingOpponentName('')
        }}
        style={{
          padding: '6px 10px',
          background: 'rgba(239, 68, 68, 0.2)',
          border: '1px solid rgba(239, 68, 68, 0.5)',
          borderRadius: '6px',
          color: '#fca5a5',
          cursor: 'pointer',
          fontSize: '12px'
        }}
      >
        ✕
      </button>
    </div>
  ) : (
    <div 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        cursor: 'pointer'
      }}
      onClick={(e) => {
        e.stopPropagation()
        setEditingOpponentId(match.id)
        setEditingOpponentName(match.opponent_name || '')
      }}
      title={t('clickToEditOpponentName')}
    >
      <span>{getMatchDisplayName(match, match.client_team_name || stats.teamName, index)}</span>
      <span style={{ fontSize: '12px', opacity: 0.6 }}>✏️</span>
    </div>
  )}
</div>
```

---

## 🔄 3. API UPDATE-MATCH

### **File**: `app/api/supabase/update-match/route.js`

**Aggiungere supporto per `opponent_name` diretto**:

```javascript
// Se viene passato opponent_name direttamente (non in una sezione)
if (req.body.opponent_name !== undefined) {
  const opponentName = toText(req.body.opponent_name)
  
  // Validazione lunghezza
  if (opponentName && opponentName.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: `opponent_name exceeds maximum length (${MAX_TEXT_LENGTH} characters)` },
      { status: 400 }
    )
  }

  // Update diretto
  const { data: updatedMatch, error: updateError } = await admin
    .from('matches')
    .update({ 
      opponent_name: opponentName || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', match_id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message || 'Error updating opponent name' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    match: updatedMatch
  })
}
```

---

## 🌐 4. TRADUZIONI

### **File**: `lib/i18n.js`

**Aggiungere nuove chiavi**:

```javascript
// Italian
opponentNameLabel: 'Nome Avversario',
optional: '(opzionale)',
opponentNamePlaceholder: 'Es: GONDİKLENDİNİZZZ, AC Milan, Amichevole vs Mario...',
opponentNameHint: 'Aiuta a identificare la partita. Se lasciato vuoto, verrà estratto automaticamente dalle immagini o usato un identificatore.',
clickToEditOpponentName: 'Clicca per modificare il nome avversario',

// English
opponentNameLabel: 'Opponent Name',
optional: '(optional)',
opponentNamePlaceholder: 'E.g.: GONDİKLENDİNİZZZ, AC Milan, Friendly vs Mario...',
opponentNameHint: 'Helps identify the match. If left empty, will be extracted automatically from images or use an identifier.',
clickToEditOpponentName: 'Click to edit opponent name',
```

---

## 📊 PRIORITÀ FINALE

**Ordine di priorità per `opponent_name`**:

1. ⭐ **Input Manuale Utente** (Wizard o Edit Dashboard)
2. 🎯 **Estrazione AI** (da `team_names.opponent_team` nelle immagini)
3. 🔄 **Identificatore Intelligente** (Risultato + Formazione + Stile)

**Logica in `save-match`**:
```javascript
// Estrai opponent_name dai dati estratti
let opponentName = null

// Priorità 1: Input manuale utente (se passato esplicitamente)
if (matchData.opponent_name) {
  opponentName = toText(matchData.opponent_name)
}

// Priorità 2: Da team_names.opponent_team (se estratto dalle immagini)
if (!opponentName && matchData.team_names?.opponent_team) {
  opponentName = toText(matchData.team_names.opponent_team)
}

// Priorità 3: Da extracted_data.team_names (se presente)
if (!opponentName && matchData.extracted_data?.team_names?.opponent_team) {
  opponentName = toText(matchData.extracted_data.team_names.opponent_team)
}

// Salva opponent_name
opponent_name: opponentName || null
```

---

## ✅ VANTAGGI IMPLEMENTAZIONE

1. ✅ **Controllo Utente**: Il cliente decide come identificare la partita
2. ✅ **Flessibilità**: Può essere un nome personalizzato
3. ✅ **Velocità**: Più veloce dell'estrazione AI
4. ✅ **Retrocompatibilità**: Funziona anche per partite vecchie (edit)
5. ✅ **UX Migliorata**: Edit inline nella lista partite
6. ✅ **Priorità Chiara**: Manuale > AI > Identificatore

---

## 🎨 ESEMPI UI

### **Wizard Summary**:
```
┌─────────────────────────────────────────┐
│ 📋 Riepilogo Partita                    │
├─────────────────────────────────────────┤
│                                         │
│ Nome Avversario (opzionale)             │
│ ┌─────────────────────────────────────┐ │
│ │ GONDİKLENDİNİZZZ                    │ │
│ └─────────────────────────────────────┘ │
│ Aiuta a identificare la partita...     │
│                                         │
│ [Salva Partita]                        │
└─────────────────────────────────────────┘
```

### **Lista Partite - Edit Mode**:
```
┌─────────────────────────────────────────┐
│ ┌─────────────────────┐ ✓ ✕          │ ← Input edit
│ │ GONDİKLENDİNİZZZ     │                │
│ └─────────────────────┘                │
│ 22 Gen 2026 • 16:15                    │
│ Risultato: 6-1                          │
└─────────────────────────────────────────┘
```

### **Lista Partite - View Mode**:
```
┌─────────────────────────────────────────┐
│ GONDİKLENDİNİZZZ ✏️                    │ ← Click per edit
│ 22 Gen 2026 • 16:15                     │
│ Risultato: 6-1                          │
└─────────────────────────────────────────┘
```

---

## 🚀 PRIORITÀ IMPLEMENTAZIONE

1. **Alta**: Campo input nel wizard summary
2. **Alta**: Salvare `opponent_name` in `save-match`
3. **Media**: Edit inline nella lista partite
4. **Media**: API update per `opponent_name` diretto
5. **Bassa**: Traduzioni

---

**Raccomandazione**: Implementare tutte le modifiche per soluzione completa e flessibile.

---

**Ultimo Aggiornamento**: 23 Gennaio 2026
