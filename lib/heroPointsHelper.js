/**
 * Hero Points Helper Functions
 * 
 * Funzioni condivise per gestione Hero Points con approccio Event Sourcing.
 * Le transazioni sono la fonte di verità, il balance viene sempre calcolato dalle transazioni.
 */

/**
 * Calcola balance dalle transazioni (fonte di verità)
 * 
 * @param {Object} admin - Supabase admin client
 * @param {string} userId - User ID
 * @returns {Promise<Object>} { balance, totalPurchased, totalSpent, lastPurchaseAt }
 */
export async function calculateBalanceFromTransactions(admin, userId) {
  const { data: transactions, error } = await admin
    .from('hero_points_transactions')
    .select('transaction_type, hero_points_amount, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[heroPointsHelper] Error fetching transactions:', error)
    // In caso di errore, ritorna valori di default
    return {
      balance: 0,
      totalPurchased: 0,
      totalSpent: 0,
      lastPurchaseAt: null
    }
  }

  let balance = 0
  let totalPurchased = 0
  let totalSpent = 0
  let lastPurchaseAt = null

  if (transactions && transactions.length > 0) {
    balance = transactions.reduce((acc, tx) => {
      if (tx.transaction_type === 'purchase') {
        totalPurchased += Math.abs(tx.hero_points_amount)
        return acc + tx.hero_points_amount
      } else if (tx.transaction_type === 'spent') {
        totalSpent += Math.abs(tx.hero_points_amount)
        return acc - Math.abs(tx.hero_points_amount)
      } else if (tx.transaction_type === 'refund') {
        return acc + Math.abs(tx.hero_points_amount)
      }
      return acc
    }, 0)

    // Trova ultimo acquisto
    const purchases = transactions.filter(tx => tx.transaction_type === 'purchase')
    if (purchases.length > 0) {
      purchases.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      lastPurchaseAt = purchases[0].created_at
    }
  }

  return {
    balance,
    totalPurchased,
    totalSpent,
    lastPurchaseAt
  }
}

/**
 * Sincronizza cache (user_hero_points) con balance calcolato dalle transazioni
 * 
 * @param {Object} admin - Supabase admin client
 * @param {string} userId - User ID
 * @param {Object} calculatedData - Dati calcolati da calculateBalanceFromTransactions
 * @returns {Promise<Object|null>} Record aggiornato o null se errore
 */
export async function syncBalanceCache(admin, userId, calculatedData) {
  try {
    const { data, error } = await admin
      .from('user_hero_points')
      .upsert({
        user_id: userId,
        hero_points_balance: calculatedData.balance,
        total_purchased: calculatedData.totalPurchased,
        total_spent: calculatedData.totalSpent,
        last_purchase_at: calculatedData.lastPurchaseAt,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (error) {
      console.error('[heroPointsHelper] Error syncing cache:', error)
      return null
    }

    return data
  } catch (err) {
    console.error('[heroPointsHelper] Unexpected error syncing cache:', err)
    return null
  }
}

/**
 * Legge balance dalla cache (per performance, quando si sa che è sincronizzata)
 * 
 * @param {Object} admin - Supabase admin client
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Record cache o null se non esiste
 */
export async function getBalanceFromCache(admin, userId) {
  try {
    const { data, error } = await admin
      .from('user_hero_points')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found (ok)
      console.error('[heroPointsHelper] Error reading cache:', error)
      return null
    }

    return data
  } catch (err) {
    console.error('[heroPointsHelper] Unexpected error reading cache:', err)
    return null
  }
}
