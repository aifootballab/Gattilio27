import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '../../../../lib/authHelper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/hero-points/reset
 * 
 * Reset completo transazioni e crediti per l'utente autenticato.
 * SOLO PER DEBUG - Usare con cautela!
 * 
 * Cancella:
 * - Tutte le transazioni hero_points_transactions per l'utente
 * - Record user_hero_points per l'utente
 * 
 * Response:
 * {
 *   success: boolean,
 *   deleted_transactions: number,
 *   deleted_balance: boolean,
 *   message: string
 * }
 */
export async function POST(req) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceKey || !anonKey) {
      return NextResponse.json({ error: 'Supabase server env missing' }, { status: 500 })
    }

    const token = extractBearerToken(req)
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
    
    if (authError || !userData?.user?.id) {
      return NextResponse.json({ error: 'Invalid or expired authentication' }, { status: 401 })
    }

    const userId = userData.user.id
    const userEmail = userData.user.email
    
    console.log(`[hero-points/reset] Resetting hero points for user ${userId} (${userEmail})`)

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // 1. Conta transazioni prima della cancellazione (per log)
    const { data: transactionsBefore, error: countError } = await admin
      .from('hero_points_transactions')
      .select('id')
      .eq('user_id', userId)

    if (countError) {
      console.error('[hero-points/reset] Error counting transactions:', countError)
    }

    const transactionCount = transactionsBefore?.length || 0

    // 2. Cancella tutte le transazioni per l'utente
    const { error: deleteTxError } = await admin
      .from('hero_points_transactions')
      .delete()
      .eq('user_id', userId)

    if (deleteTxError) {
      console.error('[hero-points/reset] Error deleting transactions:', deleteTxError)
      return NextResponse.json({ 
        error: 'Error deleting transactions',
        details: deleteTxError.message 
      }, { status: 500 })
    }

    // 3. Cancella record user_hero_points per l'utente
    const { error: deleteBalanceError } = await admin
      .from('user_hero_points')
      .delete()
      .eq('user_id', userId)

    if (deleteBalanceError) {
      console.error('[hero-points/reset] Error deleting balance:', deleteBalanceError)
      // Non fallire se non esiste, è ok
    }

    console.log(`[hero-points/reset] Reset completed: ${transactionCount} transactions deleted for user ${userId}`)

    return NextResponse.json({
      success: true,
      deleted_transactions: transactionCount,
      deleted_balance: true,
      message: `Reset completato: ${transactionCount} transazioni cancellate per ${userEmail}`
    })

  } catch (error) {
    console.error('[hero-points/reset] Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}
