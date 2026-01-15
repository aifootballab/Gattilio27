'use client'

import React from 'react'
import { ChevronDown, X } from 'lucide-react'

export default function AutocompleteInput({ 
  value, 
  onChange, 
  placeholder, 
  type = 'skills',
  style = {},
  disabled = false,
  t,
  lang 
}) {
  const [suggestions, setSuggestions] = React.useState([])
  const [showSuggestions, setShowSuggestions] = React.useState(false)
  const [selectedIndex, setSelectedIndex] = React.useState(-1)
  const [loading, setLoading] = React.useState(false)
  const inputRef = React.useRef(null)
  const suggestionsRef = React.useRef(null)
  const timeoutRef = React.useRef(null)

  // Debounce per cercare dopo 200ms
  React.useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    if (!value || value.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    setLoading(true)
    timeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/supabase/suggestions?type=${type}&q=${encodeURIComponent(value)}`)
        const data = await res.json()
        
        if (res.ok && Array.isArray(data.suggestions)) {
          setSuggestions(data.suggestions)
          setShowSuggestions(data.suggestions.length > 0)
          setSelectedIndex(-1)
        } else {
          setSuggestions([])
          setShowSuggestions(false)
        }
      } catch (err) {
        console.error('[AutocompleteInput] Fetch failed:', err)
        setSuggestions([])
        setShowSuggestions(false)
      } finally {
        setLoading(false)
      }
    }, 200)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [value, type])

  // Chiudi dropdown quando si clicca fuori
  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        inputRef.current && 
        suggestionsRef.current &&
        !inputRef.current.contains(e.target) &&
        !suggestionsRef.current.contains(e.target)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = (e) => {
    const newValue = e.target.value
    onChange(newValue)
    setSelectedIndex(-1)
  }

  const handleSelect = (suggestion) => {
    onChange(suggestion)
    setShowSuggestions(false)
    setSelectedIndex(-1)
    inputRef.current?.blur()
  }

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault()
        return
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelect(suggestions[selectedIndex])
        } else if (suggestions.length > 0) {
          handleSelect(suggestions[0])
        }
        break
      case 'Escape':
        e.preventDefault()
        setShowSuggestions(false)
        setSelectedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  const highlightMatch = (text, query) => {
    if (!query || query.length < 2) return text
    
    const index = text.toLowerCase().indexOf(query.toLowerCase())
    if (index === -1) return text
    
    const before = text.substring(0, index)
    const match = text.substring(index, index + query.length)
    const after = text.substring(index + query.length)
    
    return (
      <>
        {before}
        <strong style={{ color: 'var(--neon-blue)', fontWeight: 700 }}>{match}</strong>
        {after}
      </>
    )
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          value={value || ''}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true)
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            width: '100%',
            padding: '10px',
            paddingRight: '40px',
            background: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px',
            fontFamily: 'inherit',
            ...style
          }}
        />
        {loading && (
          <div style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '16px',
            height: '16px',
            border: '2px solid rgba(0, 212, 255, 0.3)',
            borderTop: '2px solid var(--neon-blue)',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite'
          }} />
        )}
        {showSuggestions && suggestions.length > 0 && (
          <div style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--neon-blue)',
            pointerEvents: 'none'
          }}>
            <ChevronDown size={16} />
          </div>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            background: 'rgba(10, 14, 39, 0.98)',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5), var(--glow-blue)',
            zIndex: 1000,
            maxHeight: '200px',
            overflowY: 'auto',
            backdropFilter: 'blur(10px)'
          }}
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => handleSelect(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: selectedIndex === index 
                  ? 'rgba(0, 212, 255, 0.2)' 
                  : 'transparent',
                border: 'none',
                color: 'white',
                fontSize: '14px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                borderBottom: index < suggestions.length - 1 
                  ? '1px solid rgba(0, 212, 255, 0.1)' 
                  : 'none',
                transition: 'background 0.2s ease'
              }}
            >
              {highlightMatch(suggestion, value)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
