import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '../../../lib/authHelper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceKey || !anonKey) {
      return NextResponse.json({ error: 'Supabase server env missing' }, { status: 500 })
    }

    const token = extractBearerToken(req)
    if (!token) {
      return NextResponse.json({ error: 'Missing Authorization bearer token' }, { status: 401 })
    }

    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
    
    if (authError || !userData?.user?.id) {
      return NextResponse.json({ error: 'Invalid auth' }, { status: 401 })
    }

    const userId = userData.user.id
    const email = userData.user.email || null
    
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Invalid user ID format' }, { status: 401 })
    }
    
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Conta giocatori per questo user_id
    const { data: players, error: playersErr } = await admin
      .from('players')
      .select('id, player_name')
      .eq('user_id', userId)

    if (playersErr) {
      console.error('[whoami] Query error:', playersErr.message, playersErr)
      return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 })
    }

    const players_count = players?.length || 0
    const players_names = (players || []).map(p => p.player_name).filter(Boolean)
    
    // Estrai project ID da URL Supabase per verifica ambiente
    // Es: https://xxxxx.supabase.co -> xxxxx
    let supabase_project_id = null
    if (supabaseUrl) {
      const match = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)
      if (match) {
        supabase_project_id = match[1]
      }
    }
    
    return NextResponse.json({
      user_id: userId,
      email: email,
      players_count: players_count,
      players_names: players_names,
      supabase_project_id: supabase_project_id
    })
  } catch (e) {
    console.error('[whoami] Error:', e)
    return NextResponse.json(
      { error: e?.message || 'Errore server' },
      { status: 500 }
    )
  }
}
