import React, { createContext, useContext, useState, useCallback } from 'react'

// Struttura dati Rosa
const initialRosaState = {
  id: null,
  name: null,
  players: [],
  possible_formations: [],
  squad_analysis: null,
  created_at: null,
  updated_at: null
}

const RosaContext = createContext(null)

export function RosaProvider({ children }) {
  const [rosa, setRosa] = useState(initialRosaState)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Crea nuova rosa
  const createRosa = useCallback(async (rosaData) => {
    setIsLoading(true)
    setError(null)
    try {
      // TODO: Chiamata API reale (ora mock)
      const newRosa = {
        id: `rosa_${Date.now()}`,
        name: rosaData.name || 'La mia squadra',
        players: rosaData.players || [],
        possible_formations: [],
        squad_analysis: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      setRosa(newRosa)
      return newRosa
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Aggiungi giocatore alla rosa
  const addPlayer = useCallback((player) => {
    setRosa(prev => ({
      ...prev,
      players: [...prev.players, player],
      updated_at: new Date().toISOString()
    }))
  }, [])

  // Rimuovi giocatore dalla rosa
  const removePlayer = useCallback((playerId) => {
    setRosa(prev => ({
      ...prev,
      players: prev.players.filter(p => p.player_id !== playerId),
      updated_at: new Date().toISOString()
    }))
  }, [])

  // Aggiorna giocatore nella rosa
  const updatePlayer = useCallback((playerId, updates) => {
    setRosa(prev => ({
      ...prev,
      players: prev.players.map(p => 
        p.player_id === playerId ? { ...p, ...updates } : p
      ),
      updated_at: new Date().toISOString()
    }))
  }, [])

  // Analizza rosa (trigger analisi automatica)
  const analyzeRosa = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      // TODO: Chiamata API reale per analisi
      // Per ora mock
      const analysis = {
        strengths: ['Difesa solida', 'Centrocampo creativo'],
        weaknesses: ['Attacco lento', 'Fasce deboli'],
        recommended_formations: ['4-3-3', '4-4-2'],
        player_synergies: [],
        tactical_suggestions: []
      }
      
      setRosa(prev => ({
        ...prev,
        squad_analysis: analysis,
        updated_at: new Date().toISOString()
      }))
      
      return analysis
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Reset rosa
  const resetRosa = useCallback(() => {
    setRosa(initialRosaState)
    setError(null)
  }, [])

  const value = {
    rosa,
    isLoading,
    error,
    createRosa,
    addPlayer,
    removePlayer,
    updatePlayer,
    analyzeRosa,
    resetRosa,
    hasRosa: rosa.id !== null,
    playerCount: rosa.players.length
  }

  return (
    <RosaContext.Provider value={value}>
      {children}
    </RosaContext.Provider>
  )
}

export function useRosa() {
  const context = useContext(RosaContext)
  if (!context) {
    throw new Error('useRosa must be used within RosaProvider')
  }
  return context
}
