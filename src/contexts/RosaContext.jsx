import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import * as rosaService from '../services/rosaService'
import * as playerService from '../services/playerService'

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

  // Carica rosa principale all'avvio (se esiste)
  useEffect(() => {
    loadMainRosa()
  }, [])

  const loadMainRosa = useCallback(async () => {
    try {
      const rosas = await rosaService.getUserRosas()
      if (rosas && rosas.length > 0) {
        // Carica la prima rosa o quella principale
        const mainRosa = rosas.find(r => r.name === 'La mia squadra') || rosas[0]
        if (mainRosa) {
          const fullRosa = await rosaService.getRosaById(mainRosa.id)
          setRosa({
            id: fullRosa.id,
            name: fullRosa.name,
            players: fullRosa.players || [],
            possible_formations: [],
            squad_analysis: fullRosa.squad_analysis,
            created_at: fullRosa.created_at,
            updated_at: fullRosa.updated_at
          })
        }
      }
    } catch (err) {
      console.warn('Errore caricamento rosa:', err)
      // Non bloccare l'app se non c'è rosa
    }
  }, [])

  // Crea nuova rosa
  const createRosa = useCallback(async (rosaData) => {
    setIsLoading(true)
    setError(null)
    try {
      const newRosa = await rosaService.createRosa(rosaData)
      setRosa({
        id: newRosa.id,
        name: newRosa.name,
        players: [],
        possible_formations: [],
        squad_analysis: newRosa.squad_analysis,
        created_at: newRosa.created_at,
        updated_at: newRosa.updated_at
      })
      return newRosa
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Aggiungi giocatore alla rosa
  const addPlayer = useCallback(async (player) => {
    if (!rosa.id) {
      // Crea rosa se non esiste
      await createRosa({ name: 'La mia squadra' })
      // Ricarica rosa
      await loadMainRosa()
    }

    try {
      // Se il player ha un build_id, aggiungilo direttamente
      if (player.build_id) {
        await rosaService.addPlayerToRosa(rosa.id, player.build_id)
      } else if (player.player_base_id) {
        // Crea build se necessario
        const buildData = {
          player_base_id: player.player_base_id,
          development_points: player.development_points || {},
          final_stats: player.final_stats || player.stats,
          final_overall_rating: player.overall_rating,
          source: player.source || 'manual',
          source_data: player.extracted_data || {}
        }
        const build = await playerService.upsertPlayerBuild(buildData)
        await rosaService.addPlayerToRosa(rosa.id, build.id)
      }

      // Ricarica rosa completa
      if (rosa.id) {
        const updatedRosa = await rosaService.getRosaById(rosa.id)
        setRosa(prev => ({
          ...prev,
          players: updatedRosa.players || [],
          updated_at: updatedRosa.updated_at
        }))
      } else {
        // Aggiorna localmente se rosa non ancora salvata
        setRosa(prev => ({
          ...prev,
          players: [...prev.players, player],
          updated_at: new Date().toISOString()
        }))
      }
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [rosa.id, createRosa, loadMainRosa])

  // Rimuovi giocatore dalla rosa
  const removePlayer = useCallback(async (playerBuildId) => {
    if (!rosa.id) {
      // Rimuovi solo localmente
      setRosa(prev => ({
        ...prev,
        players: prev.players.filter(p => p.build_id !== playerBuildId),
        updated_at: new Date().toISOString()
      }))
      return
    }

    try {
      await rosaService.removePlayerFromRosa(rosa.id, playerBuildId)
      
      // Ricarica rosa
      const updatedRosa = await rosaService.getRosaById(rosa.id)
      setRosa(prev => ({
        ...prev,
        players: updatedRosa.players || [],
        updated_at: updatedRosa.updated_at
      }))
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [rosa.id])

  // Aggiorna giocatore nella rosa
  const updatePlayer = useCallback(async (playerBuildId, updates) => {
    try {
      // Aggiorna build
      if (updates.development_points || updates.final_stats) {
        const build = await playerService.getPlayerBuild(updates.player_base_id)
        if (build) {
          await playerService.upsertPlayerBuild({
            ...build,
            ...updates
          })
        }
      }

      // Ricarica rosa
      if (rosa.id) {
        const updatedRosa = await rosaService.getRosaById(rosa.id)
        setRosa(prev => ({
          ...prev,
          players: updatedRosa.players || [],
          updated_at: updatedRosa.updated_at
        }))
      } else {
        // Aggiorna localmente
        setRosa(prev => ({
          ...prev,
          players: prev.players.map(p => 
            p.build_id === playerBuildId ? { ...p, ...updates } : p
          ),
          updated_at: new Date().toISOString()
        }))
      }
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [rosa.id])

  // Analizza rosa (trigger analisi automatica)
  const analyzeRosa = useCallback(async () => {
    if (!rosa.id) {
      throw new Error('Rosa non salvata. Salva la rosa prima di analizzarla.')
    }

    setIsLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Utente non autenticato')
      }

      // Chiama Edge Function analyze-rosa
      const { data, error } = await supabase.functions.invoke('analyze-rosa', {
        body: {
          rosa_id: rosa.id,
          user_id: session.user.id
        }
      })

      if (error) {
        throw new Error(`Errore analisi: ${error.message}`)
      }

      const analysis = data.analysis
      const suggestions = data.suggestions || []

      // Aggiorna rosa con analisi
      await rosaService.updateRosa(rosa.id, { squad_analysis: analysis })
      
      setRosa(prev => ({
        ...prev,
        squad_analysis: analysis,
        updated_at: new Date().toISOString()
      }))
      
      return { analysis, suggestions }
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [rosa.id])

  // Salva rosa (sincronizza con database)
  const saveRosa = useCallback(async () => {
    if (!rosa.id) {
      return await createRosa({
        name: rosa.name || 'La mia squadra',
        player_build_ids: rosa.players.map(p => p.build_id).filter(Boolean)
      })
    } else {
      return await rosaService.updateRosa(rosa.id, {
        name: rosa.name,
        player_build_ids: rosa.players.map(p => p.build_id).filter(Boolean),
        squad_analysis: rosa.squad_analysis
      })
    }
  }, [rosa, createRosa])

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
    saveRosa,
    resetRosa,
    loadMainRosa,
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
