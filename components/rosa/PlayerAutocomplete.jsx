'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Search, Loader2, User } from 'lucide-react'
import { searchPlayer } from '../../services/playerService'
import './PlayerAutocomplete.css'

function PlayerAutocomplete({ value, onSelect, onInputChange, placeholder = "Cerca giocatore..." }) {
  const [query, setQuery] = useState(value || '')
  const [results, setResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)
  const debounceTimer = useRef(null)

  useEffect(() => {
    setQuery(value || '')
  }, [value])

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      setShowDropdown(false)
      return
    }

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    setIsLoading(true)
    debounceTimer.current = setTimeout(async () => {
      try {
        const players = await searchPlayer(query)
        setResults(players)
        setShowDropdown(players.length > 0)
        setSelectedIndex(-1)
      } catch (error) {
        console.error('Errore ricerca:', error)
        setResults([])
        setShowDropdown(false)
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [query])

  const handleInputChange = (e) => {
    const newValue = e.target.value
    setQuery(newValue)
    onInputChange?.(newValue)
    setShowDropdown(true)
  }

  const handleSelect = (player) => {
    setQuery(player.player_name)
    setShowDropdown(false)
    setResults([])
    onSelect?.(player)
    inputRef.current?.blur()
  }

  const handleKeyDown = (e) => {
    if (!showDropdown || results.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleSelect(results[selectedIndex])
        } else if (results.length === 1) {
          handleSelect(results[0])
        }
        break
      case 'Escape':
        setShowDropdown(false)
        inputRef.current?.blur()
        break
    }
  }

  const getPlayerDisplay = (player) => {
    const position = player.position || 'N/A'
    const rating = player.base_stats?.overall_rating || player.base_stats?.attacking ? 
      Math.round(Object.values(player.base_stats?.attacking || {}).reduce((a, b) => a + b, 0) / 10) : null
    return `${player.player_name} (${position})${rating ? ` - ${rating}` : ''}`
  }

  return (
    <div className="player-autocomplete">
      <div className="autocomplete-input-wrapper">
        <Search size={18} className="search-icon" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && results.length > 0 && setShowDropdown(true)}
          onBlur={() => {
            // Delay per permettere click su dropdown
            setTimeout(() => setShowDropdown(false), 200)
          }}
          placeholder={placeholder}
          className="autocomplete-input"
        />
        {isLoading && <Loader2 size={18} className="loading-icon" />}
      </div>

      {showDropdown && results.length > 0 && (
        <div ref={dropdownRef} className="autocomplete-dropdown">
          {results.map((player, index) => (
            <div
              key={player.id}
              className={`autocomplete-item ${index === selectedIndex ? 'selected' : ''}`}
              onClick={() => handleSelect(player)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <User size={16} />
              <div className="item-content">
                <div className="item-name">{getPlayerDisplay(player)}</div>
                {player.card_type && (
                  <div className="item-meta">{player.card_type}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showDropdown && query.length >= 2 && !isLoading && results.length === 0 && (
        <div className="autocomplete-dropdown">
          <div className="autocomplete-empty">Nessun giocatore trovato</div>
        </div>
      )}
    </div>
  )
}

export default PlayerAutocomplete
