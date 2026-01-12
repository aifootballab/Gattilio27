// Service per gestire operazioni Rosa (squadre) su Supabase
// Endpoint coerenti e gestione salvataggi

import { supabase } from '@/lib/supabase'

/**
 * Crea nuova rosa
 */
export async function createRosa(rosaData) {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  // TEMPORANEO: Login disabilitato per sviluppo
  // const { data: { session } } = await supabase.auth.getSession()
  // if (!session) {
  //   throw new Error('Utente non autenticato')
  // }
  const tempUserId = '00000000-0000-0000-0000-000000000001' // UUID fisso per sviluppo (user_id deve essere UUID)

  const { data, error } = await supabase
    .from('user_rosa')
    .insert({
      user_id: tempUserId, // session.user.id,
      name: rosaData.name || 'La mia squadra',
      description: rosaData.description || null,
      player_build_ids: rosaData.player_build_ids || [],
      preferred_formation: rosaData.preferred_formation || null,
      squad_analysis: rosaData.squad_analysis || {}
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Errore creazione rosa: ${error.message}`)
  }

  return data
}

/**
 * Ottieni tutte le rose dell'utente
 */
export async function getUserRosas() {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  // TEMPORANEO: Login disabilitato per sviluppo
  // const { data: { session } } = await supabase.auth.getSession()
  // if (!session) {
  //   throw new Error('Utente non autenticato')
  // }
  const tempUserId = '00000000-0000-0000-0000-000000000001' // UUID fisso per sviluppo (user_id deve essere UUID)

  const { data, error } = await supabase
    .from('user_rosa')
    .select('*')
    .eq('user_id', tempUserId) // session.user.id
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Errore recupero rose: ${error.message}`)
  }

  return data || []
}

/**
 * Ottieni rosa specifica con giocatori completi
 */
export async function getRosaById(rosaId) {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  // TEMPORANEO: Login disabilitato per sviluppo
  // const { data: { session } } = await supabase.auth.getSession()
  // if (!session) {
  //   throw new Error('Utente non autenticato')
  // }
  const tempUserId = '00000000-0000-0000-0000-000000000001' // UUID fisso per sviluppo (user_id deve essere UUID)

  // Ottieni rosa
  const { data: rosa, error: rosaError } = await supabase
    .from('user_rosa')
    .select('*')
    .eq('id', rosaId)
    .eq('user_id', tempUserId) // session.user.id
    .single()

  if (rosaError || !rosa) {
    throw new Error(`Errore recupero rosa: ${rosaError?.message}`)
  }

  // Ottieni giocatori completi MANTENENDO L'ORDINE DEGLI SLOT
  if (rosa.player_build_ids && rosa.player_build_ids.length > 0) {
    // Filtra solo gli ID validi (rimuovi null/undefined)
    const validIds = rosa.player_build_ids.filter(id => id !== null && id !== undefined)
    
    if (validIds.length > 0) {
      const { data: builds, error: buildsError } = await supabase
        .from('player_builds')
        .select(`
          *,
          players_base:player_base_id (
            id,
            player_name,
            position,
            base_stats,
            skills,
            com_skills,
            position_ratings
          )
        `)
        .in('id', validIds)

      if (!buildsError && builds) {
        // Crea mappa per lookup veloce
        const buildsMap = new Map(builds.map(build => [build.id, build]))
        
        // Mantieni l'ordine degli slot: crea array di 21 elementi
        rosa.players = rosa.player_build_ids.map((buildId, slotIndex) => {
          if (!buildId) {
            // Slot vuoto
            return null
          }
          
          const build = buildsMap.get(buildId)
          if (!build) {
            // Build non trovata (dovrebbe non succedere)
            return null
          }
          
          return {
            build_id: build.id,
            player_base_id: build.player_base_id,
            player_name: build.players_base?.player_name,
            position: build.players_base?.position,
            overall_rating: build.final_overall_rating,
            base_stats: build.players_base?.base_stats,
            final_stats: build.final_stats,
            development_points: build.development_points,
            active_booster: build.active_booster_name,
            current_level: build.current_level,
            level_cap: build.level_cap,
            skills: build.players_base?.skills || [],
            com_skills: build.players_base?.com_skills || [],
            slot_index: slotIndex // Aggiungi indice slot per riferimento
          }
        }) // Mantieni tutti gli elementi (inclusi null) per preservare ordine slot
      } else {
        // Se errore o nessun build, crea array di 21 null
        rosa.players = Array(21).fill(null)
      }
    } else {
      // Nessun ID valido, crea array di 21 null
      rosa.players = Array(21).fill(null)
    }
  } else {
    // Nessun player_build_ids, crea array di 21 null
    rosa.players = Array(21).fill(null)
  }

  return rosa
}

/**
 * Aggiorna rosa
 */
export async function updateRosa(rosaId, updates) {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  // TEMPORANEO: Login disabilitato per sviluppo
  // const { data: { session } } = await supabase.auth.getSession()
  // if (!session) {
  //   throw new Error('Utente non autenticato')
  // }
  const tempUserId = '00000000-0000-0000-0000-000000000001' // UUID fisso per sviluppo (user_id deve essere UUID)

  const { data, error } = await supabase
    .from('user_rosa')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', rosaId)
    .eq('user_id', tempUserId) // session.user.id
    .select()
    .single()

  if (error) {
    throw new Error(`Errore aggiornamento rosa: ${error.message}`)
  }

  return data
}

/**
 * Elimina rosa
 */
export async function deleteRosa(rosaId) {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  // TEMPORANEO: Login disabilitato per sviluppo
  // const { data: { session } } = await supabase.auth.getSession()
  // if (!session) {
  //   throw new Error('Utente non autenticato')
  // }
  const tempUserId = '00000000-0000-0000-0000-000000000001' // UUID fisso per sviluppo (user_id deve essere UUID)

  const { error } = await supabase
    .from('user_rosa')
    .delete()
    .eq('id', rosaId)
    .eq('user_id', tempUserId) // session.user.id

  if (error) {
    throw new Error(`Errore eliminazione rosa: ${error.message}`)
  }

  return true
}

/**
 * Aggiungi giocatore a rosa
 */
export async function addPlayerToRosa(rosaId, playerBuildId) {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  // TEMPORANEO: Login disabilitato per sviluppo
  // const { data: { session } } = await supabase.auth.getSession()
  // if (!session) {
  //   throw new Error('Utente non autenticato')
  // }
  const tempUserId = '00000000-0000-0000-0000-000000000001' // UUID fisso per sviluppo (user_id deve essere UUID)

  // Ottieni rosa corrente
  const { data: rosa, error: rosaError } = await supabase
    .from('user_rosa')
    .select('player_build_ids')
    .eq('id', rosaId)
    .eq('user_id', tempUserId) // session.user.id
    .single()

  if (rosaError || !rosa) {
    throw new Error(`Rosa non trovata: ${rosaError?.message}`)
  }

  // Aggiungi player_build_id se non presente
  const currentIds = rosa.player_build_ids || []
  if (!currentIds.includes(playerBuildId)) {
    const updatedIds = [...currentIds, playerBuildId]

    const { data, error } = await supabase
      .from('user_rosa')
      .update({
        player_build_ids: updatedIds,
        updated_at: new Date().toISOString()
      })
      .eq('id', rosaId)
      .eq('user_id', tempUserId) // session.user.id
      .select()
      .single()

    if (error) {
      throw new Error(`Errore aggiunta giocatore: ${error.message}`)
    }

    return data
  }

  return rosa
}

/**
 * Rimuovi giocatore da rosa
 */
export async function removePlayerFromRosa(rosaId, playerBuildId) {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  // TEMPORANEO: Login disabilitato per sviluppo
  // const { data: { session } } = await supabase.auth.getSession()
  // if (!session) {
  //   throw new Error('Utente non autenticato')
  // }
  const tempUserId = '00000000-0000-0000-0000-000000000001' // UUID fisso per sviluppo (user_id deve essere UUID)

  // Ottieni rosa corrente
  const { data: rosa, error: rosaError } = await supabase
    .from('user_rosa')
    .select('player_build_ids')
    .eq('id', rosaId)
    .eq('user_id', tempUserId) // session.user.id
    .single()

  if (rosaError || !rosa) {
    throw new Error(`Rosa non trovata: ${rosaError?.message}`)
  }

  // Rimuovi player_build_id
  const currentIds = rosa.player_build_ids || []
  const updatedIds = currentIds.filter(id => id !== playerBuildId)

  const { data, error } = await supabase
    .from('user_rosa')
    .update({
      player_build_ids: updatedIds,
      updated_at: new Date().toISOString()
    })
    .eq('id', rosaId)
    .eq('user_id', tempUserId) // session.user.id
    .select()
    .single()

  if (error) {
    throw new Error(`Errore rimozione giocatore: ${error.message}`)
  }

  return data
}

/**
 * Aggiungi giocatore a rosa in slot specifico
 * @param {string} rosaId - ID rosa
 * @param {string} playerBuildId - ID build giocatore
 * @param {string} destination - 'titolare' | 'riserva'
 * @param {number} slot - Indice slot (0-10 per titolari, 11-20 per riserve)
 */
export async function addPlayerToRosaInSlot(rosaId, playerBuildId, destination, slot) {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  // TEMPORANEO: Login disabilitato per sviluppo
  // const { data: { session } } = await supabase.auth.getSession()
  // if (!session) {
  //   throw new Error('Utente non autenticato')
  // }
  const tempUserId = '00000000-0000-0000-0000-000000000001' // UUID fisso per sviluppo (user_id deve essere UUID)

  // Ottieni rosa corrente
  const { data: rosa, error: rosaError } = await supabase
    .from('user_rosa')
    .select('player_build_ids')
    .eq('id', rosaId)
    .eq('user_id', tempUserId) // session.user.id
    .single()

  if (rosaError || !rosa) {
    throw new Error(`Rosa non trovata: ${rosaError?.message}`)
  }

  // Crea array di 21 slot (inizializza con null se necessario)
  // IMPORTANTE: Mantieni l'ordine degli slot (0-10 titolari, 11-20 riserve)
  let currentIds = [...(rosa.player_build_ids || [])]
  
  // Assicura che l'array abbia esattamente 21 elementi (0-20)
  while (currentIds.length < 21) {
    currentIds.push(null)
  }
  
  // Tronca a 21 elementi se più lunghi (non dovrebbe succedere)
  if (currentIds.length > 21) {
    currentIds = currentIds.slice(0, 21)
  }

  if (destination === 'titolare') {
    // Validazione slot titolare
    if (slot === null || slot < 0 || slot >= 11) {
      throw new Error('Slot titolare non valido (deve essere 0-10)')
    }

    // Se lo slot è occupato, sposta il giocatore esistente in riserva
    if (currentIds[slot]) {
      const existingBuildId = currentIds[slot]
      // Trova primo slot riserva libero
      const firstFreeReserveSlot = currentIds.slice(11, 21).findIndex(id => !id)
      if (firstFreeReserveSlot !== -1) {
        currentIds[11 + firstFreeReserveSlot] = existingBuildId
      } else {
        // Se riserve piene, rimuovi giocatore esistente
        currentIds[slot] = null
      }
    }
    
    // Inserisci nuovo giocatore nello slot
    currentIds[slot] = playerBuildId
  } else if (destination === 'riserva') {
    // Validazione slot riserva
    if (slot === null || slot < 11 || slot >= 21) {
      // Se slot non specificato, trova primo libero
      const firstFreeSlot = currentIds.slice(11, 21).findIndex(id => !id)
      if (firstFreeSlot === -1) {
        throw new Error('Riserve piene. Rimuovi un giocatore prima di aggiungerne uno nuovo.')
      }
      slot = 11 + firstFreeSlot
    }
    
    // Inserisci in riserva
    currentIds[slot] = playerBuildId
  } else {
    throw new Error('Destinazione non valida (deve essere "titolare" o "riserva")')
  }

  // Rimuovi null dall'array (mantieni solo gli ID validi)
  const cleanedIds = currentIds.filter(id => id !== null && id !== undefined)

  // Aggiorna rosa
  const { data, error } = await supabase
    .from('user_rosa')
    .update({
      player_build_ids: cleanedIds,
      updated_at: new Date().toISOString()
    })
    .eq('id', rosaId)
    .eq('user_id', tempUserId) // session.user.id
    .select()
    .single()

  if (error) {
    throw new Error(`Errore aggiunta giocatore: ${error.message}`)
  }

  return data
}

/**
 * Analizza rosa e genera suggerimenti coaching
 * Chiama Edge Function analyze-rosa
 */
export async function analyzeRosa(rosaId, userId) {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  // TEMPORANEO: Login disabilitato per sviluppo
  // const { data: { session } } = await supabase.auth.getSession()
  // if (!session) {
  //   throw new Error('Utente non autenticato')
  // }
  const tempUserId = '00000000-0000-0000-0000-000000000001' // UUID fisso per sviluppo (user_id deve essere UUID)

  // Chiama Edge Function analyze-rosa
  const { data, error } = await supabase.functions.invoke('analyze-rosa', {
    body: {
      rosa_id: rosaId,
      user_id: userId || tempUserId // session.user.id
    }
  })

  if (error) {
    throw new Error(`Errore analisi rosa: ${error.message}`)
  }

  return data
}