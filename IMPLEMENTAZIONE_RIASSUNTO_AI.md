# Implementazione Riassunto AI Andamento Partita

**Data:** 23 Gennaio 2026  
**Obiettivo:** Implementare riassunto AI con gestione dati parziali e warning

---

## 📋 REQUISITI DAL FOCUS

### Dal Documento `ARCHITETTURA_MATCH_ANALISI.md`:

1. **Focus**: Decision Support System, non archivio dati
2. **Dati Parziali Supportati**: L'analisi AI funziona anche con dati parziali
3. **Confidence Score**: Indica confidenza analisi basata su dati disponibili
4. **Warning Messages**: Avvisa utente se dati parziali
5. **Conservative Insights**: Con dati parziali, essere più conservativi
6. **Messaggio Chiave**: "Più la IA sa, più ti aiuta"

---

## 🎯 IMPLEMENTAZIONE

### 1. Calcolo Confidence Score

**Logica:**
- Ogni sezione completa = +20% confidence
- 5 sezioni totali = 100% confidence
- Sezioni disponibili: `player_ratings`, `team_stats`, `attack_areas`, `ball_recovery_zones`, `formation_style`

```javascript
function calculateConfidence(matchData) {
  let score = 0
  const sections = [
    'player_ratings',
    'team_stats', 
    'attack_areas',
    'ball_recovery_zones',
    'formation_style'
  ]
  
  sections.forEach(section => {
    if (hasSectionData(matchData, section)) {
      score += 20 // 20% per sezione
    }
  })
  
  return score / 100 // 0.0 - 1.0
}

function hasSectionData(matchData, section) {
  if (section === 'player_ratings') {
    return matchData.player_ratings && (
      (matchData.player_ratings.cliente && Object.keys(matchData.player_ratings.cliente).length > 0) ||
      (matchData.player_ratings.avversario && Object.keys(matchData.player_ratings.avversario).length > 0) ||
      (typeof matchData.player_ratings === 'object' && Object.keys(matchData.player_ratings).length > 0)
    )
  }
  if (section === 'team_stats') {
    return matchData.team_stats && Object.keys(matchData.team_stats).length > 0
  }
  if (section === 'attack_areas') {
    return matchData.attack_areas && Object.keys(matchData.attack_areas).length > 0
  }
  if (section === 'ball_recovery_zones') {
    return matchData.ball_recovery_zones && Array.isArray(matchData.ball_recovery_zones) && matchData.ball_recovery_zones.length > 0
  }
  if (section === 'formation_style') {
    return matchData.formation_played || matchData.playing_style_played || matchData.team_strength
  }
  return false
}
```

---

### 2. Identificazione Dati Mancanti

```javascript
function getMissingSections(matchData) {
  const missing = []
  const sections = {
    'player_ratings': 'Pagelle Giocatori',
    'team_stats': 'Statistiche Squadra',
    'attack_areas': 'Aree di Attacco',
    'ball_recovery_zones': 'Aree di Recupero Palla',
    'formation_style': 'Formazione Avversaria'
  }
  
  Object.keys(sections).forEach(section => {
    if (!hasSectionData(matchData, section)) {
      missing.push(sections[section])
    }
  })
  
  return missing
}
```

---

### 3. Prompt OpenAI con Conservative Mode

**Prompt Base:**
```javascript
function generateAnalysisPrompt(matchData, confidence, missingSections) {
  const hasResult = matchData.result && matchData.result !== 'N/A'
  const missingText = missingSections.length > 0 
    ? `\n\n⚠️ DATI PARZIALI: Le seguenti sezioni non sono disponibili: ${missingSections.join(', ')}.`
    : ''
  
  const conservativeMode = confidence < 0.7
    ? `\n\n⚠️ MODALITÀ CONSERVATIVA: I dati disponibili sono limitati (${Math.round(confidence * 100)}% completezza). 
Sii CONSERVATIVO nelle conclusioni. Evita affermazioni categoriche. 
Indica chiaramente quando le tue analisi sono basate su dati limitati.
Suggerisci di caricare le foto mancanti per un'analisi più precisa.`
    : ''
  
  return `Analizza i dati di questa partita di eFootball e genera un riassunto dell'andamento.

${hasResult ? `RISULTATO: ${matchData.result}` : 'RISULTATO: Non disponibile'}

DATI DISPONIBILI:
${matchData.player_ratings ? `- Pagelle Giocatori: ${JSON.stringify(matchData.player_ratings)}` : '- Pagelle Giocatori: Non disponibile'}
${matchData.team_stats ? `- Statistiche Squadra: ${JSON.stringify(matchData.team_stats)}` : '- Statistiche Squadra: Non disponibile'}
${matchData.attack_areas ? `- Aree di Attacco: ${JSON.stringify(matchData.attack_areas)}` : '- Aree di Attacco: Non disponibile'}
${matchData.ball_recovery_zones ? `- Zone Recupero: ${matchData.ball_recovery_zones.length} zone` : '- Zone Recupero: Non disponibile'}
${matchData.formation_played ? `- Formazione: ${matchData.formation_played}` : '- Formazione: Non disponibile'}
${matchData.playing_style_played ? `- Stile di Gioco: ${matchData.playing_style_played}` : '- Stile di Gioco: Non disponibile'}

${missingText}
${conservativeMode}

ISTRUZIONI PER IL RIASSUNTO:
1. Genera un riassunto in italiano (max 300 parole)
2. Focus su: Decision Support System - cosa cambiare, non archivio dati
3. Includi:
   - Analisi del risultato (se disponibile)
   - Performance chiave dei giocatori (se disponibili)
   - Statistiche significative (se disponibili)
   - Punti di forza e debolezze (basati sui dati disponibili)
   - Suggerimenti tattici concreti (cosa cambiare)
4. ${conservativeMode ? 'SII CONSERVATIVO: Evita conclusioni categoriche con dati limitati.' : 'Puoi essere più specifico, hai dati completi.'}
5. ${missingSections.length > 0 ? `Alla fine, aggiungi una nota: "⚠️ Nota: Analisi basata su dati parziali (${Math.round(confidence * 100)}% completezza). Per suggerimenti più precisi, carica anche: ${missingSections.join(', ')}."` : ''}

Formato: Testo continuo, naturale, in italiano.`
}
```

---

### 4. Endpoint API `/api/analyze-match`

```javascript
// app/api/analyze-match/route.js
import { NextResponse } from 'next/server'
import { validateToken, extractBearerToken } from '../../../lib/authHelper'
import { callOpenAIWithRetry } from '../../../lib/openaiHelper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function calculateConfidence(matchData) {
  // ... implementazione sopra
}

function getMissingSections(matchData) {
  // ... implementazione sopra
}

function generateAnalysisPrompt(matchData, confidence, missingSections) {
  // ... implementazione sopra
}

export async function POST(req) {
  try {
    // Autenticazione
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: 'Supabase server env missing' }, { status: 500 })
    }

    const token = extractBearerToken(req)
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
    
    if (authError || !userData?.user?.id) {
      return NextResponse.json({ error: 'Invalid or expired authentication' }, { status: 401 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 })
    }

    const { matchData } = await req.json()
    
    if (!matchData || typeof matchData !== 'object') {
      return NextResponse.json({ error: 'matchData is required' }, { status: 400 })
    }

    // Verifica che ci sia almeno una sezione con dati
    const confidence = calculateConfidence(matchData)
    if (confidence === 0) {
      return NextResponse.json({ 
        error: 'Almeno una sezione deve avere dati per generare l\'analisi' 
      }, { status: 400 })
    }

    const missingSections = getMissingSections(matchData)
    const prompt = generateAnalysisPrompt(matchData, confidence, missingSections)

    // Chiama OpenAI
    const requestBody = {
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: confidence < 0.7 ? 0.5 : 0.7, // Più conservativo con dati parziali
      max_tokens: 500
    }

    const response = await callOpenAIWithRetry(apiKey, requestBody, 'analyze-match')
    const data = await response.json()
    
    const summary = data.choices?.[0]?.message?.content

    if (!summary) {
      return NextResponse.json({ error: 'Nessun riassunto generato' }, { status: 500 })
    }

    return NextResponse.json({
      summary,
      confidence: Math.round(confidence * 100), // 0-100
      missing_sections: missingSections,
      data_completeness: confidence === 1.0 ? 'complete' : 'partial'
    })
  } catch (err) {
    console.error('[analyze-match] Error:', err)
    
    let errorMessage = 'Errore durante la generazione dell\'analisi'
    let statusCode = 500
    
    if (err.type === 'rate_limit') {
      errorMessage = 'Quota OpenAI esaurita. Riprova tra qualche minuto.'
      statusCode = 429
    } else if (err.type === 'timeout') {
      errorMessage = 'Timeout durante la generazione. Riprova.'
      statusCode = 408
    } else if (err.message) {
      errorMessage = err.message
    }
    
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}
```

---

### 5. Integrazione nel Modal di Riepilogo

```javascript
// Nel modal di riepilogo (app/match/new/page.jsx)

const [generatingAnalysis, setGeneratingAnalysis] = useState(false)
const [analysisSummary, setAnalysisSummary] = useState(null)
const [analysisConfidence, setAnalysisConfidence] = useState(null)
const [missingSections, setMissingSections] = useState([])

const handleGenerateAnalysis = async () => {
  setGeneratingAnalysis(true)
  setError(null)
  
  try {
    const { data: session } = await supabase.auth.getSession()
    if (!session?.session?.access_token) {
      throw new Error('Sessione scaduta')
    }

    const token = session.session.access_token
    
    // Prepara dati match (stessa logica di handleSave)
    let matchResult = stepData.result || null
    if (!matchResult && stepData.team_stats && stepData.team_stats.result) {
      matchResult = stepData.team_stats.result
    }

    const matchData = {
      result: matchResult,
      player_ratings: stepData.player_ratings || null,
      team_stats: stepData.team_stats || null,
      attack_areas: stepData.attack_areas || null,
      ball_recovery_zones: stepData.ball_recovery_zones || null,
      formation_played: stepData.formation_style?.formation_played || null,
      playing_style_played: stepData.formation_style?.playing_style_played || null,
      team_strength: stepData.formation_style?.team_strength || null
    }

    const res = await fetch('/api/analyze-match', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ matchData })
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error || 'Errore generazione analisi')
    }

    setAnalysisSummary(data.summary)
    setAnalysisConfidence(data.confidence)
    setMissingSections(data.missing_sections || [])
  } catch (err) {
    console.error('[NewMatch] Analysis error:', err)
    setError(err.message || 'Errore generazione analisi')
  } finally {
    setGeneratingAnalysis(false)
  }
}
```

---

### 6. UI nel Modal

```javascript
{/* Nel modal di riepilogo */}
<div style={{ marginTop: '24px' }}>
  {!analysisSummary ? (
    <button
      onClick={handleGenerateAnalysis}
      disabled={generatingAnalysis || saving}
      style={{
        width: '100%',
        background: 'rgba(0, 212, 255, 0.2)',
        border: '1px solid rgba(0, 212, 255, 0.5)',
        borderRadius: '8px',
        padding: '12px',
        color: '#00d4ff',
        cursor: generatingAnalysis || saving ? 'not-allowed' : 'pointer',
        opacity: generatingAnalysis || saving ? 0.5 : 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontWeight: 600
      }}
    >
      {generatingAnalysis ? (
        <>
          <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
          Generazione analisi in corso...
        </>
      ) : (
        <>
          <Brain size={18} />
          Genera Analisi AI
        </>
      )}
    </button>
  ) : (
    <div style={{
      background: 'rgba(0, 212, 255, 0.1)',
      border: '1px solid rgba(0, 212, 255, 0.3)',
      borderRadius: '8px',
      padding: '16px',
      marginTop: '16px'
    }}>
      {/* Confidence Badge */}
      {analysisConfidence < 100 && (
        <div style={{
          background: 'rgba(255, 165, 0, 0.2)',
          border: '1px solid rgba(255, 165, 0, 0.5)',
          borderRadius: '6px',
          padding: '8px 12px',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          color: '#ffa500'
        }}>
          <AlertCircle size={16} />
          <span>
            <strong>Analisi basata su dati parziali ({analysisConfidence}% completezza)</strong>
            {missingSections.length > 0 && (
              <span style={{ display: 'block', marginTop: '4px', fontSize: '12px', opacity: 0.9 }}>
                Dati mancanti: {missingSections.join(', ')}. 
                Carica più foto per suggerimenti più precisi.
              </span>
            )}
          </span>
        </div>
      )}
      
      {/* Riassunto */}
      <div style={{
        fontSize: '14px',
        lineHeight: '1.6',
        color: '#fff',
        whiteSpace: 'pre-wrap'
      }}>
        {analysisSummary}
      </div>
    </div>
  )}
</div>
```

---

## 🔒 GARANZIE DI SICUREZZA

1. **Endpoint Isolato**: `/api/analyze-match` è separato, non modifica logica esistente
2. **On-Demand**: Cliente decide se generare, non blocca salvataggio
3. **Gestione Errori**: Se OpenAI fallisce, mostra messaggio, non blocca salvataggio
4. **Validazione**: Verifica che ci sia almeno una sezione con dati
5. **Conservative Mode**: Con dati parziali, prompt più conservativo

---

## 📊 CHECKLIST IMPLEMENTAZIONE

- [ ] Implementare `calculateConfidence()`
- [ ] Implementare `getMissingSections()`
- [ ] Implementare `generateAnalysisPrompt()` con conservative mode
- [ ] Creare endpoint `/api/analyze-match`
- [ ] Aggiungere bottone "Genera Analisi AI" nel modal
- [ ] Implementare chiamata API
- [ ] Mostrare spinner durante generazione
- [ ] Mostrare riassunto con confidence badge
- [ ] Mostrare warning se dati parziali
- [ ] Gestione errori (quota, timeout, ecc.)
- [ ] Testare con dati completi
- [ ] Testare con dati parziali (1-4 sezioni)
- [ ] Testare con solo risultato
- [ ] Testare con quota OpenAI esaurita

---

## ✅ CONCLUSIONE

**Implementazione:**
- ✅ Solo riassunto AI (non "Vedi Dettagli")
- ✅ Confidence score basato su dati disponibili
- ✅ Warning quando dati parziali
- ✅ Conservative mode nel prompt
- ✅ Avverte cosa manca e come migliorare
- ✅ Messaggio: "Più la IA sa, più ti aiuta"

**Tempo Stimato:** 3-4 ore  
**Rischio:** 🟢 **BASSO** - Endpoint isolato  
**Costo:** ~$0.004 per partita (solo se generato)
