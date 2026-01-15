import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function GET(req) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: 'Supabase server env missing' },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') // 'skills', 'teams', 'nationalities', 'positions', 'playstyles', 'boosters'
    const query = searchParams.get('q') || ''
    
    if (!type) {
      return NextResponse.json({ error: 'type parameter required' }, { status: 400 })
    }

    // Minimo 2 caratteri per cercare
    if (query.length < 2) {
      return NextResponse.json({ suggestions: [] })
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    let suggestions = []

    try {
      switch (type) {
        case 'skills': {
          // Cerca in players_base.skills (array)
          const { data: players, error } = await admin
            .from('players_base')
            .select('skills')
            .not('skills', 'is', null)
          
          if (!error && players) {
            const allSkills = new Set()
            players.forEach(p => {
              if (Array.isArray(p.skills)) {
                p.skills.forEach(skill => {
                  if (typeof skill === 'string' && skill.toLowerCase().includes(query.toLowerCase())) {
                    allSkills.add(skill.trim())
                  }
                })
              }
            })
            suggestions = Array.from(allSkills).slice(0, 10)
          }
          break
        }

        case 'teams': {
          // Cerca in players_base.team
          const { data: players, error } = await admin
            .from('players_base')
            .select('team')
            .ilike('team', `%${query}%`)
            .not('team', 'is', null)
            .limit(50)
          
          if (!error && players) {
            const allTeams = new Set()
            players.forEach(p => {
              if (p.team && typeof p.team === 'string') {
                allTeams.add(p.team.trim())
              }
            })
            suggestions = Array.from(allTeams).slice(0, 10)
          }
          break
        }

        case 'nationalities': {
          // Cerca in players_base.nationality
          const { data: players, error } = await admin
            .from('players_base')
            .select('nationality')
            .ilike('nationality', `%${query}%`)
            .not('nationality', 'is', null)
            .limit(50)
          
          if (!error && players) {
            const allNationalities = new Set()
            players.forEach(p => {
              if (p.nationality && typeof p.nationality === 'string') {
                allNationalities.add(p.nationality.trim())
              }
            })
            suggestions = Array.from(allNationalities).slice(0, 10)
          }
          break
        }

        case 'positions': {
          // Cerca in players_base.position e position_ratings
          const { data: players, error } = await admin
            .from('players_base')
            .select('position, position_ratings')
            .or(`position.ilike.%${query}%,position_ratings.ilike.%${query}%`)
            .limit(50)
          
          if (!error && players) {
            const allPositions = new Set()
            players.forEach(p => {
              if (p.position && typeof p.position === 'string') {
                allPositions.add(p.position.trim())
              }
              if (p.position_ratings && typeof p.position_ratings === 'object') {
                Object.keys(p.position_ratings).forEach(pos => {
                  if (pos.toLowerCase().includes(query.toLowerCase())) {
                    allPositions.add(pos.trim())
                  }
                })
              }
            })
            suggestions = Array.from(allPositions).slice(0, 10)
          }
          break
        }

        case 'playstyles': {
          // Cerca in players_base.metadata.ai_playstyles (array)
          const { data: players, error } = await admin
            .from('players_base')
            .select('metadata')
            .not('metadata', 'is', null)
            .limit(100)
          
          if (!error && players) {
            const allPlaystyles = new Set()
            players.forEach(p => {
              if (p.metadata && typeof p.metadata === 'object') {
                const playstyles = p.metadata.ai_playstyles
                if (Array.isArray(playstyles)) {
                  playstyles.forEach(ps => {
                    if (typeof ps === 'string' && ps.toLowerCase().includes(query.toLowerCase())) {
                      allPlaystyles.add(ps.trim())
                    }
                  })
                }
              }
            })
            suggestions = Array.from(allPlaystyles).slice(0, 10)
          }
          break
        }

        case 'boosters': {
          // Cerca in players_base.available_boosters[].name
          const { data: players, error } = await admin
            .from('players_base')
            .select('available_boosters')
            .not('available_boosters', 'is', null)
            .limit(100)
          
          if (!error && players) {
            const allBoosters = new Set()
            players.forEach(p => {
              if (Array.isArray(p.available_boosters)) {
                p.available_boosters.forEach(booster => {
                  if (booster && typeof booster === 'object' && booster.name) {
                    const name = typeof booster.name === 'string' ? booster.name : String(booster.name)
                    if (name.toLowerCase().includes(query.toLowerCase())) {
                      allBoosters.add(name.trim())
                    }
                  }
                })
              }
            })
            suggestions = Array.from(allBoosters).slice(0, 10)
          }
          break
        }

        default:
          return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
      }
    } catch (dbErr) {
      console.error('[suggestions] DB query failed:', dbErr)
      return NextResponse.json(
        { error: 'Database query failed', details: dbErr?.message },
        { status: 500 }
      )
    }

    // Ordina per rilevanza (match all'inizio prima)
    suggestions.sort((a, b) => {
      const aLower = a.toLowerCase()
      const bLower = b.toLowerCase()
      const qLower = query.toLowerCase()
      const aStarts = aLower.startsWith(qLower)
      const bStarts = bLower.startsWith(qLower)
      if (aStarts && !bStarts) return -1
      if (!aStarts && bStarts) return 1
      return aLower.localeCompare(bLower)
    })

    return NextResponse.json({ suggestions: suggestions.slice(0, 10) })
  } catch (e) {
    console.error('[suggestions] Unhandled exception:', e)
    return NextResponse.json(
      {
        error: e?.message || 'Errore server',
        details: process.env.NODE_ENV === 'development' ? String(e) : null,
      },
      { status: 500 }
    )
  }
}
