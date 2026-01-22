import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '../../../../lib/authHelper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/hero-points/balance
 * 
 * Ritorna il balance crediti dell'utente.
 * Il balance viene sempre calcolato dalle transazioni per garantire coerenza.
 * 
 * Response:
 * {
 *   hero_points_balance: number,
 *   euros_equivalent: number,
 *   last_purchase_at: string | null,
 *   total_purchased: number,
 *   total_spent: number
 * }
 */
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
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
    
    if (authError || !userData?.user?.id) {
      return NextResponse.json({ error: 'Invalid or expired authentication' }, { status: 401 })
    }

    const userId = userData.user.id
    
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Verifica se esiste record user_hero_points
    const { data: existingBalance, error: fetchError } = await admin
      .from('user_hero_points')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found (ok)
      console.error('[hero-points/balance] Error fetching balance:', fetchError)
      return NextResponse.json({ error: 'Unable to retrieve balance. Please try again.' }, { status: 500 })
    }

    // Calcola balance sempre dalle transazioni per garantire coerenza
    const { data: transactions } = await admin
      .from('hero_points_transactions')
      .select('transaction_type, hero_points_amount, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    let calculatedBalance = 0
    let totalPurchased = 0
    let totalSpent = 0
    let lastPurchaseAt = null

    if (transactions && transactions.length > 0) {
      calculatedBalance = transactions.reduce((balance, tx) => {
        if (tx.transaction_type === 'purchase') {
          totalPurchased += Math.abs(tx.hero_points_amount)
          return balance + tx.hero_points_amount
        } else if (tx.transaction_type === 'spent') {
          totalSpent += Math.abs(tx.hero_points_amount)
          return balance - Math.abs(tx.hero_points_amount)
        }
        return balance
      }, 0)

      // Trova ultimo acquisto
      const lastPurchase = transactions
        .filter(tx => tx.transaction_type === 'purchase')
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
      
      if (lastPurchase) {
        lastPurchaseAt = lastPurchase.created_at
      }
    }

    // Aggiorna o crea record user_hero_points con balance calcolato
    const { data: updatedBalance, error: upsertError } = await admin
      .from('user_hero_points')
      .upsert({
        user_id: userId,
        hero_points_balance: calculatedBalance,
        total_purchased: totalPurchased,
        total_spent: totalSpent,
        last_purchase_at: lastPurchaseAt,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (upsertError) {
      console.error('[hero-points/balance] Error upserting balance:', upsertError)
      return NextResponse.json({ error: 'Unable to retrieve balance. Please try again.' }, { status: 500 })
    }

    const heroPointsData = updatedBalance

    // Ritorna balance
    return NextResponse.json({
      hero_points_balance: heroPointsData.hero_points_balance || 0,
      euros_equivalent: heroPointsData.euros_equivalent || 0,
      last_purchase_at: heroPointsData.last_purchase_at || null,
      total_purchased: heroPointsData.total_purchased || 0,
      total_spent: heroPointsData.total_spent || 0
    })

  } catch (error) {
    console.error('[hero-points/balance] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
