import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '../../../../lib/authHelper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !anonKey) {
      return NextResponse.json(
        { error: 'Supabase env missing' },
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
      console.error('[get-opponent-formations] Auth validation failed:', { error: errorMsg })
      return NextResponse.json(
        { error: 'Invalid auth', details: errorMsg },
        { status: 401 }
      )
    }
    
    const userId = userData.user.id
    const userEmail = userData.user.email
    console.log('[get-opponent-formations] Auth OK, userId:', userId, 'email:', userEmail || 'anon')

    // Crea client per query (anon key con RLS)
    const supabase = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })

    const { data: formations, error: fetchErr } = await supabase
      .from('squad_formations')
      .select('*')
      .eq('user_id', userId)
      .eq('is_opponent', true)
      .order('extracted_at', { ascending: false })

    if (fetchErr) {
      console.error('[get-opponent-formations] Fetch failed:', fetchErr)
      return NextResponse.json(
        { error: `Fetch failed: ${fetchErr.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      formations: formations || [],
      count: formations?.length || 0,
    })
  } catch (e) {
    console.error('[get-opponent-formations] Unhandled exception:', e)
    return NextResponse.json(
      { error: e?.message || 'Errore server' },
      { status: 500 }
    )
  }
}
