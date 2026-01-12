'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import * as rosaService from '@/services/rosaService'
import * as playerService from '@/services/playerService'

// Tipo per lo stato della rosa
interface RosaState {
  id: string | null
  name: string | null
  players: (any | null)[]
  possible_formations: string[]
  squad_analysis: any | null
  created_at: string | null
  updated_at: string | null
}

// Struttura dati Rosa
const initialRosaState: RosaState = {
  id: null,
  name: null,
  players: Array(21).fill(null), // Inizializza con 21 slot null
  possible_formations: [],
  squad_analysis: null,
  created_at: null,
  updated_at: null
}

const RosaContext = createContext<any>(null)

export function RosaProvider({ children }: { children: React.ReactNode }) {
  const [rosa, setRosa] = useState<RosaState>(initialRosaState)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Carica rosa principale all'avvio (se esiste)
  useEffect(() => {
    loadMainRosa()
  }, [])

  const loadMainRosa = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      if (!supabase) {
        setRosa(initialRosaState)
        setIsLoading(false)
        return
      }

      // TEMPORANEO: Login disabilitato per sviluppo - usa user_id di default
      // const { data: { session } } = await supabase.auth.getSession()
      // if (!session) {
      //   setRosa(initialRosaState)
      //   setIsLoading(false)
      //   return
      // }

      const rosas = await rosaService.getUserRosas()
      if (rosas && rosas.length > 0) {
        const mainRosa = rosas.find(r => r.name === 'La mia squadra') || rosas[0]
        if (mainRosa) {
          const fullRosa = await rosaService.getRosaById(mainRosa.id)
          setRosa({
            id: fullRosa.id,
            name: fullRosa.name,
            players: fullRosa.players || Array(21).fill(null),
            possible_formations: [],
            squad_analysis: fullRosa.squad_analysis,
            created_at: fullRosa.created_at,
            updated_at: fullRosa.updated_at
          })
        }
      } else {
        // Se non esiste una rosa, ne crea una di default
        const newRosa = await rosaService.createRosa({ name: 'La mia squadra' })
        const fullRosa = await rosaService.getRosaById(newRosa.id)
        setRosa({
          id: fullRosa.id,
          name: fullRosa.name,
          players: fullRosa.players || Array(21).fill(null),
          possible_formations: [],
          squad_analysis: fullRosa.squad_analysis,
          created_at: fullRosa.created_at,
          updated_at: fullRosa.updated_at
        })
      }
    } catch (err: any) {
      console.warn('Errore caricamento rosa:', err)
      setError(err.message)
      setRosa(initialRosaState)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Crea nuova rosa
  const createRosa = useCallback(async (rosaData: any) => {
    setIsLoading(true)
    setError(null)
    try {
      const newRosa = await rosaService.createRosa(rosaData)
      setRosa({
        id: newRosa.id,
        name: newRosa.name,
        players: Array(21).fill(null),
        possible_formations: [],
        squad_analysis: newRosa.squad_analysis,
        created_at: newRosa.created_at,
        updated_at: newRosa.updated_at
      })
      return newRosa
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Aggiungi giocatore alla rosa
  const addPlayer = useCallback(async (player: any) => {
    if (!rosa.id) {
      await createRosa({ name: 'La mia squadra' })
      await loadMainRosa()
    }

    try {
      let buildIdToAdd = player.build_id
      if (!buildIdToAdd && player.player_base_id) {
        if (!supabase) throw new Error('Supabase non configurato')
        // TEMPORANEO: Login disabilitato per sviluppo
        // const { data: { session } } = await supabase.auth.getSession()
        // if (!session) throw new Error('Utente non autenticato')
        const tempUserId = '00000000-0000-0000-0000-000000000001' // UUID fisso per sviluppo (user_id deve essere UUID)

        const buildData = {
          user_id: tempUserId, // session.user.id,
          player_base_id: player.player_base_id,
          development_points: player.development_points || {},
          final_stats: player.final_stats || player.stats,
          final_overall_rating: player.overall_rating,
          source: player.source || 'manual',
          source_data: player.extracted_data || {}
        }
        const build = await playerService.upsertPlayerBuild(buildData)
        buildIdToAdd = build.id
      }

      if (buildIdToAdd) {
        await rosaService.addPlayerToRosa(rosa.id, buildIdToAdd)
        await loadMainRosa()
      }
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }, [rosa.id, createRosa, loadMainRosa])

  // Rimuovi giocatore dalla rosa
  const removePlayer = useCallback(async (playerBuildId: string) => {
    if (!rosa.id) {
      setRosa(prev => ({
        ...prev,
        players: prev.players.map(p => p?.build_id === playerBuildId ? null : p),
        updated_at: new Date().toISOString()
      }))
      return
    }

    try {
      await rosaService.removePlayerFromRosa(rosa.id, playerBuildId)
      await loadMainRosa()
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }, [rosa.id, loadMainRosa])

  // Aggiorna dettagli rosa
  const updateRosaDetails = useCallback(async (updates: any) => {
    if (!rosa.id) throw new Error("Rosa non caricata.")
    setIsLoading(true)
    setError(null)
    try {
      const updatedRosa = await rosaService.updateRosa(rosa.id, updates)
      setRosa(prev => ({
        ...prev,
        name: updatedRosa.name,
        description: updatedRosa.description,
        preferred_formation: updatedRosa.preferred_formation,
        updated_at: updatedRosa.updated_at
      }))
      return updatedRosa
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [rosa.id])

  // Analizza rosa corrente
  const analyzeCurrentRosa = useCallback(async () => {
    if (!rosa.id || !supabase) throw new Error("Rosa non caricata o utente non autenticato.")
    setIsLoading(true)
    setError(null)
    try {
      // TEMPORANEO: Login disabilitato per sviluppo
      // const { data: { session } } = await supabase.auth.getSession()
      // if (!session) throw new Error("Utente non autenticato.")
      const tempUserId = '00000000-0000-0000-0000-000000000001' // UUID fisso per sviluppo (user_id deve essere UUID)

      const analysisResult = await rosaService.analyzeRosa(rosa.id, tempUserId) // session.user.id
      setRosa(prev => ({ ...prev, squad_analysis: analysisResult.analysis }))
      return analysisResult
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [rosa.id])

  // Salva rosa
  const saveRosa = useCallback(async () => {
    if (!rosa.id) {
      return await createRosa({
        name: rosa.name || 'La mia squadra',
        player_build_ids: rosa.players.map(p => p?.build_id).filter(Boolean)
      })
    } else {
      return await rosaService.updateRosa(rosa.id, {
        name: rosa.name,
        player_build_ids: rosa.players.map(p => p?.build_id).filter(Boolean),
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
    updateRosaDetails,
    analyzeCurrentRosa,
    saveRosa,
    resetRosa,
    loadMainRosa,
    hasRosa: rosa.id !== null,
    playerCount: rosa.players.filter(Boolean).length
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
