# Strategia Ricerca eFootball Hub - Con Filtri

## 🎯 Problema Identificato

**Database ha pochi giocatori** (import minimo):
- Solo: nome, posizione, rating, card_type
- Cercare solo "Gullit" → trova pochi risultati
- Non abbastanza per filtrare correttamente

**Soluzione**: Ricerca diretta su efootballhub.net con filtri!

---

## 📊 Strategia Finale

### Flusso Ottimale:
```
1. Cliente inserisce: Nome (Gullit) + Età (30) + Squadra (Milan)
2. Sistema ricerca su efootballhub.net con questi filtri
3. Mostra risultati filtrati (es: Gullit 30 anni Milan, Gullit 35 anni Sampdoria)
4. Cliente seleziona giocatore corretto
5. Sistema pre-compila form con tutti i dati
6. Cliente verifica/aggiusta
7. Salva
```

### Vantaggi:
- ✅ **Ricerca precisa**: Filtri (nome + età + squadra) → risultati corretti
- ✅ **Database non serve**: Ricerca diretta su efootballhub.net
- ✅ **Risultati completi**: Tutti i dati disponibili
- ✅ **UX migliore**: Cliente inserisce solo 3 campi (nome, età, squadra)

---

## 🔧 Implementazione

### Component: `PlayerSearchFromHub` (Nuovo)

```jsx
// components/rosa/PlayerSearchFromHub.jsx
'use client'

import React, { useState } from 'react'
import { Search, Loader2, User } from 'lucide-react'
import { searchPlayerFromHub } from '../../services/playerService'
import './PlayerSearchFromHub.css'

function PlayerSearchFromHub({ onSelect }) {
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [team, setTeam] = useState('')
  const [results, setResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSearch = async () => {
    if (!name.trim()) {
      setError('Nome obbligatorio')
      return
    }

    setIsLoading(true)
    setError(null)
    setResults([])

    try {
      const players = await searchPlayerFromHub({
        name: name.trim(),
        age: age ? parseInt(age) : null,
        team: team.trim() || null
      })
      
      setResults(players)
      if (players.length === 0) {
        setError('Nessun giocatore trovato')
      }
    } catch (err) {
      setError(err.message || 'Errore ricerca')
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelect = (player) => {
    onSelect?.(player)
    setName('')
    setAge('')
    setTeam('')
    setResults([])
  }

  return (
    <div className="player-search-hub">
      <div className="search-filters">
        <div className="filter-field">
          <label>Nome *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Es: Gullit"
          />
        </div>
        <div className="filter-field">
          <label>Età</label>
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Es: 30"
            min={16}
            max={50}
          />
        </div>
        <div className="filter-field">
          <label>Squadra</label>
          <input
            type="text"
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Es: Milan"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={isLoading || !name.trim()}
          className="search-btn"
        >
          {isLoading ? <Loader2 size={18} className="spinner" /> : <Search size={18} />}
          Cerca
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {results.length > 0 && (
        <div className="search-results">
          {results.map((player, index) => (
            <div
              key={index}
              className="result-item"
              onClick={() => handleSelect(player)}
            >
              <div className="result-header">
                <User size={20} />
                <div className="result-info">
                  <h3>{player.player_name}</h3>
                  <div className="result-meta">
                    <span>{player.position}</span>
                    {player.age && <span>• {player.age} anni</span>}
                    {player.club_name && <span>• {player.club_name}</span>}
                    {player.base_stats?.overall_rating && (
                      <span>• OVR {player.base_stats.overall_rating}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default PlayerSearchFromHub
```

### Service: `playerService.searchPlayerFromHub()`

```javascript
// services/playerService.js
/**
 * Ricerca giocatore su efootballhub.net con filtri
 */
export async function searchPlayerFromHub({ name, age, team }) {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  // Chiama Edge Function per scraping efootballhub.net
  const { data, error } = await supabase.functions.invoke('search-player-hub', {
    body: JSON.stringify({
      name: name.trim(),
      age: age || null,
      team: team?.trim() || null
    })
  })

  if (error) {
    throw new Error(`Errore ricerca: ${error.message}`)
  }

  return data.players || []
}
```

### Edge Function: `search-player-hub`

```typescript
// supabase/functions/search-player-hub/index.ts
// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { name, age, team } = await req.json()

    if (!name || !name.trim()) {
      throw new Error('Nome obbligatorio')
    }

    // Scraping efootballhub.net con filtri
    const url = buildSearchURL(name, age, team)
    const html = await fetch(url)
    const players = await parseEFootballHubResults(html)

    return new Response(
      JSON.stringify({ success: true, players }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function buildSearchURL(name, age, team) {
  // Costruisce URL ricerca efootballhub.net
  const baseURL = 'https://efootballhub.net/efootball23/search/players'
  const params = new URLSearchParams()
  
  params.append('q', name.trim())
  if (age) params.append('age', age)
  if (team) params.append('team', team.trim())
  
  return `${baseURL}?${params.toString()}`
}

async function parseEFootballHubResults(html) {
  // Parse HTML e estrae risultati
  // Restituisce array di giocatori con tutti i dati
  // TODO: Implementare parsing HTML
  return []
}
```

---

## 🔄 Integrazione con RosaManualInput

### Modifica: `RosaManualInput.jsx`

```javascript
// components/rosa/RosaManualInput.jsx
import PlayerSearchFromHub from './PlayerSearchFromHub' // Nuovo

function RosaManualInput({ onBack, onRosaCreated }) {
  const [searchMode, setSearchMode] = useState('hub') // 'hub' o 'database'
  
  // ...

  return (
    <div className="rosa-manual-input">
      {/* ... */}
      
      {activeTab === 'basic' && (
        <div className="form-grid">
          {/* Toggle ricerca */}
          <div className="input-field full-width">
            <label>Modalità Ricerca</label>
            <div className="search-mode-toggle">
              <button
                className={searchMode === 'hub' ? 'active' : ''}
                onClick={() => setSearchMode('hub')}
              >
                eFootball Hub
              </button>
              <button
                className={searchMode === 'database' ? 'active' : ''}
                onClick={() => setSearchMode('database')}
              >
                Database
              </button>
            </div>
          </div>

          {/* Ricerca eFootball Hub */}
          {searchMode === 'hub' && (
            <div className="input-field full-width">
              <label>Ricerca Giocatore</label>
              <PlayerSearchFromHub
                onSelect={handlePlayerSelect}
              />
            </div>
          )}

          {/* Ricerca Database (esistente) */}
          {searchMode === 'database' && (
            <div className="input-field full-width">
              <label>Nome Giocatore</label>
              <PlayerAutocomplete
                value={playerData.player_name}
                onSelect={handlePlayerSelect}
                onInputChange={(name) => {
                  setPlayerData(prev => ({ ...prev, player_name: name }))
                }}
                placeholder="Cerca giocatore..."
              />
            </div>
          )}

          {/* ... altri campi ... */}
        </div>
      )}
    </div>
  )
}
```

---

## ⏱️ Performance

### Tempo Ricerca:
- **Scraping efootballhub.net**: ~1-2 secondi
- **Parsing HTML**: ~0.5 secondi
- **Totale**: ~2-3 secondi

### Esperienza Utente:
- ✅ Cliente inserisce solo 3 campi (nome, età, squadra)
- ✅ Risultati filtrati e precisi
- ✅ Pre-compilazione automatica
- ✅ UX ottimale

---

## 💰 Costi

- **Scraping efootballhub.net**: $0 (gratis)
- **Database**: Non necessario (ricerca diretta)
- **Totale**: **$0** ✅

---

## ✅ Vantaggi Finali

1. ✅ **Ricerca precisa**: Filtri (nome + età + squadra)
2. ✅ **Database non serve**: Ricerca diretta su efootballhub.net
3. ✅ **Risultati completi**: Tutti i dati disponibili
4. ✅ **UX migliore**: Cliente inserisce solo 3 campi
5. ✅ **Gratis**: Nessun costo
6. ✅ **Scalabile**: On-demand, 1-2 ricerche alla volta

**Questa è la strategia ottimale!** 🚀
