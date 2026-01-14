// Implementazioni delle funzioni per GPT Realtime API
// Queste funzioni gestiscono la logica business

/**
 * Salva giocatore in Supabase
 */
export async function savePlayerToSupabase(
  supabase: any,
  userId: string,
  playerData: any,
  rosaId?: string
) {
  try {
    // 1. Salva in players_base (se nuovo)
    let playerBaseId = null
    
    if (playerData.player_name) {
      // Cerca se esiste già
      const { data: existing, error: existingError } = await supabase
        .from('players_base')
        .select('id')
        .eq('player_name', playerData.player_name)
        .maybeSingle()

      if (existing && !existingError) {
        playerBaseId = existing.id
      } else {
        // Crea nuovo
        const { data: newPlayer, error } = await supabase
          .from('players_base')
          .insert({
            player_name: playerData.player_name,
            position: playerData.position,
            base_stats: playerData.base_stats || {},
            skills: playerData.skills || [],
            com_skills: playerData.com_skills || [],
            height: playerData.height,
            weight: playerData.weight,
            age: playerData.age,
            nationality: playerData.nationality,
            club_name: playerData.club_name
          })
          .select('id')
          .single()

        if (error) throw error
        playerBaseId = newPlayer.id
      }
    }

    // 2. Crea player_build (build utente)
    let playerBuildId = null
    if (playerBaseId && playerData.build) {
      const { data: build, error } = await supabase
        .from('player_builds')
        .upsert({
          user_id: userId,
          player_base_id: playerBaseId,
          development_points: playerData.build.development_points || {},
          current_level: playerData.build.current_level,
          level_cap: playerData.build.level_cap,
          final_stats: playerData.build.final_stats,
          final_overall_rating: playerData.build.final_overall_rating,
          source: 'voice_coaching'
        }, {
          onConflict: 'user_id,player_base_id'
        })
        .select('id')
        .single()

      if (error) throw error
      playerBuildId = build.id
    }

    // 3. Aggiungi a rosa se rosaId fornito
    if (rosaId && playerBuildId) {
      const { data: rosa, error: rosaError } = await supabase
        .from('user_rosa')
        .select('player_build_ids')
        .eq('id', rosaId)
        .eq('user_id', userId)
        .maybeSingle()

      if (rosa && !rosaError) {
        const currentIds = rosa.player_build_ids || []
        if (!currentIds.includes(playerBuildId)) {
          await supabase
            .from('user_rosa')
            .update({
              player_build_ids: [...currentIds, playerBuildId]
            })
            .eq('id', rosaId)
        }
      }
    }

    return {
      success: true,
      player_base_id: playerBaseId,
      player_build_id: playerBuildId,
      message: `Giocatore ${playerData.player_name || 'salvato'} salvato con successo`
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Carica rosa da Supabase
 */
export async function loadRosa(
  supabase: any,
  userId: string,
  rosaId?: string
) {
  try {
    let query = supabase
      .from('user_rosa')
      .select(`
        *,
        player_builds:player_build_ids (
          *,
          players_base:player_base_id (
            *
          )
        )
      `)
      .eq('user_id', userId)

    if (rosaId) {
      query = query.eq('id', rosaId)
    } else {
      // Carica rosa principale o prima disponibile
      query = query.order('created_at', { ascending: false }).limit(1)
    }

    const { data: rosa, error } = await query.maybeSingle()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    if (!rosa) {
      return {
        success: false,
        error: 'Rosa not found'
      }
    }

    return {
      success: true,
      rosa: {
        id: rosa.id,
        name: rosa.name,
        player_count: rosa.player_build_ids?.length || 0,
        players: rosa.player_builds || []
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Cerca giocatori nel database
 */
export async function searchPlayer(
  supabase: any,
  query: string
) {
  try {
    const { data: players, error } = await supabase
      .from('players_base')
      .select('*')
      .ilike('player_name', `%${query}%`)
      .limit(10)

    if (error) throw error

    return {
      success: true,
      players: players || [],
      count: players?.length || 0
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Aggiorna rosa con nuovi giocatori
 */
export async function updateRosa(
  supabase: any,
  userId: string,
  rosaId: string,
  playerBuildIds: string[]
) {
  try {
    const { data, error } = await supabase
      .from('user_rosa')
      .update({
        player_build_ids: playerBuildIds,
        updated_at: new Date().toISOString()
      })
      .eq('id', rosaId)
      .eq('user_id', userId)
      .select()

    if (error) throw error

    return {
      success: true,
      message: `Rosa aggiornata con ${playerBuildIds.length} giocatori`
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Analizza screenshot
 */
export async function analyzeScreenshot(
  supabase: any,
  userId: string,
  imageUrl: string,
  imageType: string
) {
  try {
    // Chiama process-screenshot-gpt Edge Function
    const { data, error } = await supabase.functions.invoke('process-screenshot-gpt', {
      body: {
        image_url: imageUrl,
        image_type: imageType,
        user_id: userId
      }
    })

    if (error) throw error

    return {
      success: true,
      analysis: data.candidate_profile,
      confidence: data.confidence_score
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}
