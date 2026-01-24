# 🔄 Piano di Rollback - Input Manuale Opponent Name

**Data**: 23 Gennaio 2026  
**Scopo**: Rollback completo delle modifiche per input manuale `opponent_name`  
**Tempo Stimato**: 30-45 minuti

---

## ⚠️ QUANDO USARE QUESTO ROLLBACK

Usa questo piano se:
- ❌ Route `update-match` non funziona correttamente
- ❌ Campo wizard causa errori
- ❌ Edit dashboard rompe UI esistente
- ❌ Conflitti con codice esistente
- ❌ Errori imprevisti dopo deploy

---

## 📋 CHECKLIST PRE-ROLLBACK

Prima di procedere, verifica:
- [ ] Backup del codice attuale (git commit)
- [ ] Test di funzionalità esistenti (non devono rompersi)
- [ ] Documentazione errori riscontrati
- [ ] Identificazione file modificati

---

## 🔄 PROCEDURA ROLLBACK

### **FASE 1: Route `update-match`** (10 minuti)

**File**: `app/api/supabase/update-match/route.js`

#### **A. Rimuovere Logica `opponent_name` Diretto**

**Cerca** (dopo riga ~154, dopo `const { match_id, section, data, result } = await req.json()`):

```javascript
// ⚠️ ROLLBACK: Rimuovere questo blocco se presente
if (req.body.opponent_name !== undefined) {
  const opponentName = toText(req.body.opponent_name)
  
  if (opponentName && opponentName.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: `opponent_name exceeds maximum length (${MAX_TEXT_LENGTH} characters)` },
      { status: 400 }
    )
  }

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

  return NextResponse.json({ success: true, match: updatedMatch })
}
```

**Azione**: **ELIMINARE** tutto il blocco sopra.

**Verifica**: Il file deve continuare con la validazione `match_id, section, data` esistente.

---

### **FASE 2: Wizard "Aggiungi Partita"** (10 minuti)

**File**: `app/match/new/page.jsx`

#### **A. Rimuovere State `opponentName`**

**Cerca** (dopo riga ~34, dopo `const [showSummary, setShowSummary] = React.useState(false)`):

```javascript
// ⚠️ ROLLBACK: Rimuovere questa riga se presente
const [opponentName, setOpponentName] = React.useState('')
```

**Azione**: **ELIMINARE** la riga.

---

#### **B. Rimuovere Campo Input dal Modal Summary**

**Cerca** (nel modal Summary, dopo riga ~799, dopo il blocco "Risultato Estratto"):

```jsx
{/* ⚠️ ROLLBACK: Rimuovere tutto questo blocco se presente */}
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
    style={{...}}
  />
  <div style={{...}}>
    {t('opponentNameHint')}
  </div>
</div>
```

**Azione**: **ELIMINARE** tutto il blocco `<div>` sopra.

---

#### **C. Rimuovere `opponent_name` da `matchData`**

**Cerca** (riga ~259, in `handleSave`, dentro `const matchData = {`):

```javascript
// ⚠️ ROLLBACK: Rimuovere questa riga se presente
opponent_name: opponentName.trim() || null, // ⭐ NUOVO: Input manuale
```

**Azione**: **ELIMINARE** la riga.

**Verifica**: `matchData` deve iniziare con:
```javascript
const matchData = {
  result: matchResult,
  player_ratings: stepData.player_ratings || null,
  // ... resto dei campi
}
```

---

#### **D. Rimuovere `opponentName` da localStorage**

**Cerca** (in `saveProgress()`, riga ~59):

```javascript
// ⚠️ ROLLBACK: Rimuovere opponentName se presente
localStorage.setItem(STORAGE_KEY, JSON.stringify({
  stepData,
  stepImages,
  opponentName, // ⚠️ RIMUOVERE questa riga
  timestamp: Date.now()
}))
```

**Azione**: **RIMUOVERE** la riga `opponentName,` (lasciare solo `stepData`, `stepImages`, `timestamp`).

---

#### **E. Rimuovere Caricamento `opponentName` da localStorage**

**Cerca** (in `useEffect` che carica progresso, riga ~40-54):

```javascript
// ⚠️ ROLLBACK: Rimuovere questo blocco se presente
if (parsed.opponentName) {
  setOpponentName(parsed.opponentName)
}
```

**Azione**: **ELIMINARE** il blocco `if` sopra.

---

### **FASE 3: Dashboard - Edit Inline** (15 minuti)

**File**: `app/page.jsx`

#### **A. Rimuovere State per Edit**

**Cerca** (dopo riga ~44, dopo `const [deletingMatchId, setDeletingMatchId] = React.useState(null)`):

```javascript
// ⚠️ ROLLBACK: Rimuovere queste righe se presenti
const [editingOpponentId, setEditingOpponentId] = React.useState(null)
const [editingOpponentName, setEditingOpponentName] = React.useState('')
const [savingOpponentName, setSavingOpponentName] = React.useState(false)
```

**Azione**: **ELIMINARE** tutte e 3 le righe.

---

#### **B. Rimuovere Funzione `handleSaveOpponentName`**

**Cerca** (dopo `handleDeleteMatch`, riga ~150):

```javascript
// ⚠️ ROLLBACK: Rimuovere tutta questa funzione se presente
const handleSaveOpponentName = async (matchId, e) => {
  e.stopPropagation()
  
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

**Azione**: **ELIMINARE** tutta la funzione.

---

#### **C. Ripristinare UI Card Partita Originale**

**Cerca** (riga ~570, nel `map` delle partite, dentro il `<div>` con `displayOpponent`):

```jsx
// ⚠️ ROLLBACK: Sostituire tutto questo blocco con la versione originale
<div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--neon-orange)', marginBottom: '4px' }}>
  {editingOpponentId === match.id ? (
    // ... blocco edit inline ...
  ) : (
    // ... blocco view con click ...
  )}
</div>
```

**Sostituire con** (versione originale):

```jsx
<div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--neon-orange)', marginBottom: '4px' }}>
  {displayOpponent}
</div>
```

**Dove** `displayOpponent` è già definito come:
```javascript
const displayOpponent = match.opponent_name || t('unknownOpponent')
```

**Azione**: **SOSTITUIRE** tutto il blocco condizionale con la versione semplice sopra.

---

#### **D. Rimuovere Campi Aggiuntivi dalla Query (Opzionale)**

**Cerca** (riga ~109, query matches):

```javascript
// ⚠️ ROLLBACK: Se aggiunti, rimuovere questi campi
.select('id, match_date, opponent_name, result, photos_uploaded, missing_photos, data_completeness, formation_played, playing_style_played, client_team_name')
```

**Sostituire con** (versione originale):

```javascript
.select('id, match_date, opponent_name, result, photos_uploaded, missing_photos, data_completeness')
```

**Azione**: **RIMUOVERE** `formation_played, playing_style_played, client_team_name` dalla query (se aggiunti).

**Nota**: Questo è opzionale, non rompe nulla se lasciati.

---

### **FASE 4: Traduzioni (Opzionale)** (5 minuti)

**File**: `lib/i18n.js`

**Cerca** (nella sezione traduzioni IT/EN):

```javascript
// ⚠️ ROLLBACK: Rimuovere queste chiavi se aggiunte
opponentNameLabel: 'Nome Avversario',
optional: '(opzionale)',
opponentNamePlaceholder: 'Es: GONDİKLENDİNİZZZ, AC Milan, Amichevole vs Mario...',
opponentNameHint: 'Aiuta a identificare la partita. Se lasciato vuoto, verrà estratto automaticamente dalle immagini o usato un identificatore.',
clickToEditOpponentName: 'Clicca per modificare il nome avversario',
```

**Azione**: **RIMUOVERE** tutte le chiavi sopra (sia IT che EN).

**Nota**: Questo è opzionale, non rompe nulla se lasciate (solo chiavi inutilizzate).

---

## ✅ VERIFICA POST-ROLLBACK

Dopo il rollback, verifica:

### **1. Route `update-match`**
- [ ] Funziona con `section` normale (player_ratings, team_stats, ecc.)
- [ ] Non accetta `opponent_name` diretto (deve dare errore se passato)
- [ ] Logica merge esistente funziona

### **2. Wizard "Aggiungi Partita"**
- [ ] Modal Summary si apre correttamente
- [ ] Salvataggio partita funziona
- [ ] localStorage funziona (senza `opponentName`)
- [ ] Nessun errore console

### **3. Dashboard**
- [ ] Lista partite si carica correttamente
- [ ] Card partite cliccabili (aprono dettaglio)
- [ ] Nessun errore console
- [ ] UI non rotta

### **4. Funzionalità Esistenti**
- [ ] Salvataggio partita funziona
- [ ] Update partita funziona
- [ ] Visualizzazione partite funziona
- [ ] Nessun errore in console

---

## 🔧 COMANDI GIT (Se Usi Git)

### **Opzione 1: Revert Commit Specifico**

```bash
# Trova commit da revert
git log --oneline | grep "opponent_name\|input manuale"

# Revert commit (sostituisci <commit-hash>)
git revert <commit-hash>

# Push
git push
```

### **Opzione 2: Reset a Commit Precedente**

```bash
# ⚠️ ATTENZIONE: Questo cancella commit successivi
# Trova commit prima delle modifiche
git log --oneline

# Reset soft (mantiene modifiche in working directory)
git reset --soft <commit-hash-before-changes>

# O reset hard (cancella tutto)
git reset --hard <commit-hash-before-changes>

# Force push (solo se necessario)
git push --force
```

### **Opzione 3: Checkout File Specifici**

```bash
# Ripristina file specifici da commit precedente
git checkout <commit-hash-before-changes> -- app/api/supabase/update-match/route.js
git checkout <commit-hash-before-changes> -- app/match/new/page.jsx
git checkout <commit-hash-before-changes> -- app/page.jsx

# Commit
git commit -m "Rollback: rimozione input manuale opponent_name"
git push
```

---

## 📝 NOTE IMPORTANTI

1. **Backup Prima**: Fai sempre backup/commit prima del rollback
2. **Test Dopo**: Testa tutte le funzionalità dopo il rollback
3. **Documentazione**: Documenta perché hai fatto rollback
4. **Comunicazione**: Comunica il rollback al team se presente

---

## 🆘 SE IL ROLLBACK NON FUNZIONA

Se dopo il rollback ci sono ancora problemi:

1. **Verifica File**: Controlla che tutti i file siano stati ripristinati correttamente
2. **Clear Cache**: Pulisci cache browser e Next.js
   ```bash
   rm -rf .next
   npm run build
   ```
3. **Check Logs**: Controlla log server e console browser
4. **Ripristina da Git**: Usa `git checkout` per ripristinare file da commit precedente
5. **Contatta Supporto**: Se necessario, contatta supporto tecnico

---

## 📋 CHECKLIST FINALE

- [ ] Route `update-match` ripristinata
- [ ] Wizard ripristinato
- [ ] Dashboard ripristinata
- [ ] Traduzioni rimosse (opzionale)
- [ ] Test funzionalità esistenti
- [ ] Nessun errore console
- [ ] Commit rollback fatto (se usa Git)
- [ ] Documentazione aggiornata

---

**Ultimo Aggiornamento**: 23 Gennaio 2026  
**Versione**: 1.0
