import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '../../../../lib/authHelper'
import { calculateBalanceFromTransactions, syncBalanceCache } from '../../../../lib/heroPointsHelper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/hero-points/spend
 * 
 * Consuma Hero Points per un'operazione.
 * Verifica balance sufficiente prima di sottrarre.
 * 
 * Input:
 * {
 *   amount: number, // Hero Points da sottrarre
 *   operation_type: string, // Es. "analyze_match", "extract_player", "realtime_coach"
 *   operation_id: string | null, // ID dell'operazione (es. match_id, session_id)
 *   description: string | null // Descrizione opzionale
 * }
 * 
 * Response:
 * {
 *   hero_points_spent: number,
 *   hero_points_balance: number,
 *   euros_equivalent: number,
 *   transaction_id: string
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
    
    const { amount, operation_type, operation_id, description } = await req.json()

    // Validazione input
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ 
        error: 'Invalid amount. Please enter a positive number.' 
      }, { status: 400 })
    }

    if (!operation_type || typeof operation_type !== 'string') {
      return NextResponse.json({ 
        error: 'Invalid operation type.' 
      }, { status: 400 })
    }

    const heroPointsToSpend = Math.round(amount)
    
    if (heroPointsToSpend <= 0) {
      return NextResponse.json({ 
        error: 'Amount must be at least 1 Hero Point.' 
      }, { status: 400 })
    }

    console.log(`[hero-points/spend] Attempting to spend ${heroPointsToSpend} HP for operation: ${operation_type}`)

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Calcola balance corrente dalle transazioni (fonte di verità - Event Sourcing)
    const currentData = await calculateBalanceFromTransactions(admin, userId)
    const currentBalance = currentData.balance

    // Verifica balance sufficiente
    if (currentBalance < heroPointsToSpend) {
      return NextResponse.json({ 
        error: 'Insufficient Hero Points balance',
        hero_points_balance: currentBalance,
        hero_points_required: heroPointsToSpend,
        euros_equivalent: currentBalance / 100
      }, { status: 402 }) // 402 Payment Required
    }

    // Calcola nuovo balance
    const newBalance = currentBalance - heroPointsToSpend
    const newTotalSpent = currentData.totalSpent + heroPointsToSpend

    // IMPORTANTE: Crea transazione PRIMA (fonte di verità)
    // Se la transazione fallisce, non aggiorniamo il balance
    const { data: transaction, error: transactionError } = await admin
      .from('hero_points_transactions')
      .insert({
        user_id: userId,
        transaction_type: 'spent',
        hero_points_amount: -heroPointsToSpend, // Negativo per spent
        euros_amount: null,
        operation_type: operation_type,
        operation_id: operation_id || null,
        balance_after: newBalance,
        description: description || `Consumo ${heroPointsToSpend} Hero Points per ${operation_type}`
      })
      .select()
      .single()

    if (transactionError) {
      console.error('[hero-points/spend] Error creating transaction:', transactionError)
      return NextResponse.json({ error: 'Unable to process transaction. Please try again.' }, { status: 500 })
    }

    // Sincronizza cache (user_hero_points) con nuovo balance
    const cacheData = await syncBalanceCache(admin, userId, {
      balance: newBalance,
      totalPurchased: currentData.totalPurchased,
      totalSpent: newTotalSpent,
      lastPurchaseAt: currentData.lastPurchaseAt
    })

    console.log(`[hero-points/spend] Spend completed: ${heroPointsToSpend} HP spent, new balance: ${newBalance}`)

    // Ritorna risultato
    return NextResponse.json({
      hero_points_spent: heroPointsToSpend,
      hero_points_balance: newBalance,
      euros_equivalent: cacheData?.euros_equivalent || (newBalance / 100),
      transaction_id: transaction?.id || null
    })

  } catch (error) {
    console.error('[hero-points/spend] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
