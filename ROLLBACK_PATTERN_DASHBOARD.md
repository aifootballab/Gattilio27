# 📋 DOCUMENTO ROLLBACK: Visualizzazione Pattern Tattici in Dashboard

**Data**: 24 Gennaio 2026  
**Obiettivo**: Visualizzare pattern tattici (`formation_usage`, `playing_style_usage`, `recurring_issues`) nella card "AI Insights" della dashboard come info generali per il cliente, senza appesantire i prompt IA.

---

## 🎯 SCOPO DELLE MODIFICHE

### **Problema Risolto**
- I pattern tattici erano inclusi nei prompt IA, aumentando la complessità
- Il cliente non aveva visibilità diretta sui propri pattern tattici
- Mancava feedback visivo su formazioni/stili più efficaci

### **Soluzione Implementata**
- **Visualizzazione Dashboard**: Pattern mostrati nella card "AI Insights" come info generali
- **IA Discreta**: L'IA continua a usare i pattern per i consigli, ma NON li comunica esplicitamente nel testo
- **Placeholder Intelligente**: Se non ci sono pattern, mostra messaggio bilingue "Carica le tue partite per avere info"

---

## 📝 FILE MODIFICATI

### **1. `app/page.jsx`** (Dashboard)

#### **Modifiche State** (riga ~47)
**PRIMA**:
```javascript
const [savingOpponentName, setSavingOpponentName] = React.useState(false)
```

**DOPO**:
```javascript
const [savingOpponentName, setSavingOpponentName] = React.useState(false)
const [tacticalPatterns, setTacticalPatterns] = React.useState(null) // Pattern tattici per AI Insights
```

**Rollback**: Rimuovere la riga `const [tacticalPatterns, setTacticalPatterns] = React.useState(null)`

---

#### **Modifiche fetchData** (riga ~120-130)
**PRIMA**:
```javascript
// 3. Carica ultime partite
const { data: matches, error: matchesError } = await supabase
  .from('matches')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(10)

if (matchesError) {
  console.error('[Dashboard] Error loading matches:', matchesError)
} else {
  console.log('[Dashboard] Matches loaded:', matches?.length || 0, 'for user:', userId)
  setRecentMatches(matches || [])
}
```

**DOPO**:
```javascript
// 3. Carica ultime partite
const { data: matches, error: matchesError } = await supabase
  .from('matches')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(10)

if (matchesError) {
  console.error('[Dashboard] Error loading matches:', matchesError)
} else {
  console.log('[Dashboard] Matches loaded:', matches?.length || 0, 'for user:', userId)
  setRecentMatches(matches || [])
}

// 4. Carica pattern tattici (per AI Insights)
const { data: patterns, error: patternsError } = await supabase
  .from('team_tactical_patterns')
  .select('formation_usage, playing_style_usage, recurring_issues')
  .eq('user_id', userId)
  .maybeSingle()

if (patternsError && patternsError.code !== 'PGRST116') { // PGRST116 = no rows (normale)
  console.warn('[Dashboard] Error loading tactical patterns:', patternsError)
} else if (patterns) {
  setTacticalPatterns(patterns)
}
```

**Rollback**: Rimuovere il blocco "4. Carica pattern tattici" (righe dopo `setRecentMatches`)

---

#### **Modifiche Card AI Insights** (riga ~537-546)
**PRIMA**:
```javascript
{/* AI Insights (Placeholder) */}
<div className="card" style={{ padding: '24px' }}>
  <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
    <Brain size={24} color="var(--neon-orange)" />
    {t('aiInsights')}
  </h2>
  <div style={{ opacity: 0.7, fontSize: '14px' }}>
    {t('aiInsightsPlaceholder')}
  </div>
</div>
```

**DOPO**:
```javascript
{/* AI Insights */}
<div className="card" style={{ padding: '24px' }}>
  <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
    <Brain size={24} color="var(--neon-orange)" />
    {t('aiInsights')}
  </h2>
  
  {!tacticalPatterns || (
    (!tacticalPatterns.formation_usage || Object.keys(tacticalPatterns.formation_usage).length === 0) &&
    (!tacticalPatterns.playing_style_usage || Object.keys(tacticalPatterns.playing_style_usage).length === 0) &&
    (!tacticalPatterns.recurring_issues || tacticalPatterns.recurring_issues.length === 0)
  ) ? (
    <div style={{ 
      padding: '24px', 
      textAlign: 'center', 
      opacity: 0.7, 
      fontSize: '14px',
      lineHeight: '1.6'
    }}>
      {t('aiInsightsNoData')}
    </div>
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Formazioni più usate */}
      {tacticalPatterns.formation_usage && Object.keys(tacticalPatterns.formation_usage).length > 0 && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--neon-orange)' }}>
            {t('formationUsage')}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Object.entries(tacticalPatterns.formation_usage)
              .sort((a, b) => (b[1].matches || 0) - (a[1].matches || 0))
              .slice(0, 5)
              .map(([formation, stats]) => {
                const winRate = stats.win_rate ? (stats.win_rate * 100).toFixed(0) : 0
                const matches = stats.matches || 0
                return (
                  <div
                    key={formation}
                    style={{
                      padding: '12px',
                      background: 'rgba(255, 165, 0, 0.05)',
                      border: '1px solid rgba(255, 165, 0, 0.2)',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>{formation}</span>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '13px', opacity: 0.8 }}>
                      <span>{matches} {t('matches')}</span>
                      <span style={{ color: winRate >= 50 ? '#86efac' : '#fca5a5' }}>
                        {winRate}% {t('winRate')}
                      </span>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Stili di gioco più usati */}
      {tacticalPatterns.playing_style_usage && Object.keys(tacticalPatterns.playing_style_usage).length > 0 && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--neon-orange)' }}>
            {t('playingStyleUsage')}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Object.entries(tacticalPatterns.playing_style_usage)
              .sort((a, b) => (b[1].matches || 0) - (a[1].matches || 0))
              .slice(0, 5)
              .map(([style, stats]) => {
                const winRate = stats.win_rate ? (stats.win_rate * 100).toFixed(0) : 0
                const matches = stats.matches || 0
                return (
                  <div
                    key={style}
                    style={{
                      padding: '12px',
                      background: 'rgba(255, 165, 0, 0.05)',
                      border: '1px solid rgba(255, 165, 0, 0.2)',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>{style}</span>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '13px', opacity: 0.8 }}>
                      <span>{matches} {t('matches')}</span>
                      <span style={{ color: winRate >= 50 ? '#86efac' : '#fca5a5' }}>
                        {winRate}% {t('winRate')}
                      </span>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Problemi ricorrenti */}
      {tacticalPatterns.recurring_issues && Array.isArray(tacticalPatterns.recurring_issues) && tacticalPatterns.recurring_issues.length > 0 && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--neon-orange)' }}>
            {t('recurringIssues')}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {tacticalPatterns.recurring_issues.slice(0, 5).map((issue, idx) => {
              const issueText = typeof issue === 'string' ? issue : (issue.issue || issue)
              const frequency = typeof issue === 'object' ? (issue.frequency || 'media') : 'media'
              const severity = typeof issue === 'object' ? (issue.severity || 'media') : 'media'
              return (
                <div
                  key={idx}
                  style={{
                    padding: '12px',
                    background: 'rgba(239, 68, 68, 0.05)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>{issueText}</div>
                  <div style={{ fontSize: '12px', opacity: 0.7 }}>
                    {t('frequency')}: {frequency} | {t('severity')}: {severity}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )}
</div>
```

**Rollback**: Sostituire tutto il blocco "DOPO" con il blocco "PRIMA"

---

### **2. `lib/i18n.js`** (Traduzioni)

#### **Modifiche Sezione Italiano** (riga ~28-29)
**PRIMA**:
```javascript
aiInsights: 'Insight AI',
aiInsightsPlaceholder: 'Insights e suggerimenti AI verranno mostrati qui',
```

**DOPO**:
```javascript
aiInsights: 'Insight AI',
aiInsightsPlaceholder: 'Insights e suggerimenti AI verranno mostrati qui',
aiInsightsNoData: 'Carica le tue partite per avere informazioni sui tuoi pattern tattici e ricevere consigli personalizzati.',
formationUsage: 'Formazioni più usate',
playingStyleUsage: 'Stili di gioco più usati',
recurringIssues: 'Problemi ricorrenti',
matches: 'match',
winRate: 'vittorie',
frequency: 'Frequenza',
severity: 'Severità',
```

**Rollback**: Rimuovere le nuove chiavi (`aiInsightsNoData`, `formationUsage`, `playingStyleUsage`, `recurringIssues`, `matches`, `winRate`, `frequency`, `severity`)

---

#### **Modifiche Sezione Inglese** (riga ~756-757)
**PRIMA**:
```javascript
aiInsights: 'AI Insights',
aiInsightsPlaceholder: 'AI insights and suggestions will be shown here',
```

**DOPO**:
```javascript
aiInsights: 'AI Insights',
aiInsightsPlaceholder: 'AI insights and suggestions will be shown here',
aiInsightsNoData: 'Load your matches to get information about your tactical patterns and receive personalized advice.',
formationUsage: 'Most used formations',
playingStyleUsage: 'Most used playing styles',
recurringIssues: 'Recurring issues',
matches: 'matches',
winRate: 'win rate',
frequency: 'Frequency',
severity: 'Severity',
```

**Rollback**: Rimuovere le nuove chiavi (stesse di sopra, versione inglese)

---

## 🔄 PROCEDURA ROLLBACK COMPLETA

### **Step 1: Ripristinare `app/page.jsx`**
```bash
# Rimuovere state tacticalPatterns (riga ~48)
# Rimuovere query pattern in fetchData (dopo setRecentMatches)
# Ripristinare card AI Insights al placeholder originale
```

### **Step 2: Ripristinare `lib/i18n.js`**
```bash
# Rimuovere tutte le nuove chiavi di traduzione (8 chiavi IT + 8 chiavi EN)
```

### **Step 3: Verifica**
- ✅ Dashboard carica senza errori
- ✅ Card "AI Insights" mostra placeholder originale
- ✅ Nessun errore console
- ✅ Nessun riferimento a `tacticalPatterns` nel codice

---

## ✅ CHECKLIST POST-ROLLBACK

- [ ] `app/page.jsx` ripristinato (state, fetchData, card)
- [ ] `lib/i18n.js` ripristinato (chiavi rimosse)
- [ ] Nessun errore console
- [ ] Dashboard funziona correttamente
- [ ] Card "AI Insights" mostra placeholder originale
- [ ] Test su mobile (responsività OK)

---

## 📊 IMPATTO DELLE MODIFICHE

### **File Toccati**: 2
- `app/page.jsx` (3 modifiche: state, fetchData, card)
- `lib/i18n.js` (2 modifiche: sezione IT, sezione EN)

### **Rischio**: 🟢 BASSO
- Modifiche isolate, non toccano logica esistente
- Nessuna modifica a API routes
- Nessuna modifica a database
- Solo visualizzazione frontend

### **Test Richiesti**:
- ✅ Dashboard carica correttamente
- ✅ Pattern visualizzati se presenti
- ✅ Messaggio placeholder se assenti
- ✅ Responsività mobile
- ✅ Bilingue (IT/EN)

---

## 🎯 NOTE TECNICHE

### **Comportamento IA**
- L'IA continua a ricevere `tacticalPatterns` nei prompt (già implementato)
- L'IA NON comunica i pattern esplicitamente nel testo (già implementato)
- Questa modifica NON tocca la logica IA, solo visualizzazione frontend

### **Responsività**
- Card usa `flexWrap: 'wrap'` per adattarsi a schermi piccoli
- Gap e padding ottimizzati per mobile
- Font size responsive (14px base, 12px per dettagli)

### **Gestione Errori**
- Query pattern usa `.maybeSingle()` per gestire "no rows" (PGRST116)
- Controllo esistenza pattern prima di renderizzare
- Fallback a placeholder se pattern null/undefined

---

**Fine Documento Rollback**
