import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '../../../../lib/authHelper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey || !anonKey) {
      return NextResponse.json(
        { error: 'Supabase server env missing (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY)' },
        { status: 500 }
      )
    }

    // Estrai e valida token (supporta sia anon che email)
    const token = extractBearerToken(req)
    if (!token) {
      return NextResponse.json({ error: 'Missing Authorization bearer token' }, { status: 401 })
    }

    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
    
    if (authError || !userData?.user?.id) {
      const errorMsg = authError?.message || String(authError) || 'Unknown auth error'
      console.error('[reset-my-data] Auth validation failed:', { error: errorMsg })
      return NextResponse.json(
        {
          error: 'Invalid auth',
          details: errorMsg,
        },
        { status: 401 }
      )
    }
    
    const userId = userData.user.id
    const userEmail = userData.user.email
    console.log('[reset-my-data] Auth OK, userId:', userId, 'email:', userEmail || 'anon')
    const admin = createClient(supabaseUrl, serviceKey)

    // Cancella SOLO i giocatori dell'utente corrente dalla tabella players
    const { error: deleteErr, count } = await admin
      .from('players')
      .delete()
      .eq('user_id', userId)
      .select('id', { count: 'exact', head: true })

    if (deleteErr) {
      console.error('[reset-my-data] Delete error:', deleteErr.message)
      return NextResponse.json({ 
        error: 'Failed to delete players',
        details: deleteErr.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      user_id: userId,
      deleted_count: count || 0,
      message: `Deleted ${count || 0} player(s) for user ${userId}`
    })
  } catch (e) {
    console.error('[reset-my-data] Unhandled exception:', {
      message: e?.message || String(e),
      stack: e?.stack,
      name: e?.name,
    })
    return NextResponse.json(
      {
        error: e?.message || 'Errore server',
        details: process.env.NODE_ENV === 'development' ? String(e) : null,
      },
      { status: 500 }
    )
  }
}
