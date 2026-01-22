import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '../../../../lib/authHelper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/hero-points/balance
 * 
 * Ritorna il balance crediti dell'utente.
 * Se starter_pack_claimed = false, assegna automaticamente 1000 HP (starter pack).
 * 
 * Response:
 * {
 *   hero_points_balance: number,
 *   euros_equivalent: number,
 *   starter_pack_claimed: boolean,
 *   starter_pack_just_claimed: boolean, // true se appena assegnato
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

    let heroPointsData = existingBalance
    let starterPackJustClaimed = false

    // Verifica coerenza balance: se esiste record, ricalcola balance dalle transazioni per sicurezza
    if (heroPointsData) {
      const { data: transactions } = await admin
        .from('hero_points_transactions')
        .select('transaction_type, hero_points_amount')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })

      if (transactions && transactions.length > 0) {
        const calculatedBalance = transactions.reduce((balance, tx) => {
          if (tx.transaction_type === 'purchase') {
            return balance + tx.hero_points_amount
          } else if (tx.transaction_type === 'spent') {
            return balance - tx.hero_points_amount
          }
          return balance
        }, 0)

        // Se balance calcolato è diverso da quello nel database, correggi
        if (calculatedBalance !== heroPointsData.hero_points_balance) {
          console.log(`[hero-points/balance] Balance mismatch detected. DB: ${heroPointsData.hero_points_balance}, Calculated: ${calculatedBalance}. Correcting...`)
          
          const { data: correctedBalance, error: correctError } = await admin
            .from('user_hero_points')
            .update({
              hero_points_balance: calculatedBalance,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .select()
            .single()

          if (!correctError && correctedBalance) {
            heroPointsData = correctedBalance
            console.log(`[hero-points/balance] Balance corrected to ${calculatedBalance}`)
          }
        }
      }
    }

    // Se non esiste record o starter_pack_claimed = false, assegna starter pack
    // IMPORTANTE: Se balance >= 1000, significa che l'utente ha già fatto acquisti, NON riassegnare starter pack
    const currentBalance = heroPointsData?.hero_points_balance || 0
    const shouldAssignStarterPack = !heroPointsData || (!heroPointsData.starter_pack_claimed && currentBalance < 1000)
    
    if (shouldAssignStarterPack) {
      console.log('[hero-points/balance] Assigning starter pack')
      
      const starterPackAmount = 1000
      const newBalance = currentBalance + starterPackAmount
      
      // Transazione atomica: crea/aggiorna balance + crea transazione
      // Usa upsert per idempotenza (ON CONFLICT DO UPDATE)
      // IMPORTANTE: Mantieni total_purchased esistente se presente (non sovrascrivere acquisti)
      const existingTotalPurchased = heroPointsData?.total_purchased || 0
      const newTotalPurchased = existingTotalPurchased >= starterPackAmount 
        ? existingTotalPurchased // Se già maggiore, mantieni (evita di sovrascrivere acquisti)
        : existingTotalPurchased + starterPackAmount // Altrimenti aggiungi starter pack
      
      const { data: upsertedBalance, error: upsertError } = await admin
        .from('user_hero_points')
        .upsert({
          user_id: userId,
          hero_points_balance: newBalance,
          starter_pack_claimed: true,
          starter_pack_amount: starterPackAmount,
          total_purchased: newTotalPurchased,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single()

      if (upsertError) {
        console.error('[hero-points/balance] Error upserting balance:', upsertError)
        return NextResponse.json({ error: 'Unable to initialize account. Please try again.' }, { status: 500 })
      }

      // Crea transazione per starter pack
      const { error: transactionError } = await admin
        .from('hero_points_transactions')
        .insert({
          user_id: userId,
          transaction_type: 'purchase',
          hero_points_amount: starterPackAmount,
          euros_amount: null, // Starter pack è gratuito
          operation_type: 'starter_pack',
          operation_id: null,
          balance_after: newBalance,
          description: 'Starter Pack - Benvenuto! 1000 Hero Points gratuiti'
        })

      if (transactionError) {
        console.error('[hero-points/balance] Error creating transaction:', transactionError)
        // Non fallire se la transazione non viene creata, ma logga l'errore
        // Il balance è già stato aggiornato
      }

      heroPointsData = upsertedBalance
      starterPackJustClaimed = true
      console.log(`[hero-points/balance] Starter pack assigned: ${starterPackAmount} HP, new balance: ${newBalance}`)
    }

    // Ritorna balance
    return NextResponse.json({
      hero_points_balance: heroPointsData.hero_points_balance || 0,
      euros_equivalent: heroPointsData.euros_equivalent || 0,
      starter_pack_claimed: heroPointsData.starter_pack_claimed || false,
      starter_pack_just_claimed: starterPackJustClaimed,
      last_purchase_at: heroPointsData.last_purchase_at || null,
      total_purchased: heroPointsData.total_purchased || 0,
      total_spent: heroPointsData.total_spent || 0
    })

  } catch (error) {
    console.error('[hero-points/balance] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
