/**
 * Servizio crediti: tracciamento utilizzo OpenAI per utente/periodo (mensile).
 * Usato dalle route che chiamano OpenAI e dalla API GET /api/credits/usage.
 * Enterprise: non blocca la risposta se il tracciamento fallisce (fire-and-forget).
 * Doc: docs/SISTEMA_CREDITI_AI.md (Supabase + codice + flusso).
 */

/** Crediti inclusi nel piano base (es. 20€/mese) – configurabile */
export const CREDITS_INCLUDED_DEFAULT = 200

/** Pesi in crediti per operazione (allineati a docs/COSTI_API_E_PRICING_CREDITI.md) */
export const CREDIT_WEIGHTS = {
  'assistant-chat': 1,
  'extract-player': 2,
  'extract-coach': 2,
  'extract-match-data': 2,
  'generate-countermeasures': 3,
  'extract-formation': 3,
  'analyze-match': 4
}

/**
 * Restituisce la chiave periodo per il mese corrente (YYYY-MM) in UTC.
 * UTC evita mismatch tra server (es. Vercel UTC) e righe scritte in altro fuso:
 * stesso period_key ovunque per lettura/scrittura.
 * @returns {string}
 */
export function getCurrentPeriodKey() {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/**
 * Registra l'utilizzo di crediti per l'utente nel periodo corrente.
 * Upsert: inserisce riga se assente, altrimenti incrementa credits_used.
 * Non lancia: in caso di errore logga e ritorna (non bloccare la risposta API).
 * @param {import('@supabase/supabase-js').SupabaseClient} admin - Client Supabase con service role
 * @param {string} userId - user_id (auth.users.id)
 * @param {number} credits - numero crediti da aggiungere (uso CREDIT_WEIGHTS)
 * @param {string} [operationType] - tipo operazione per log (es. 'assistant-chat')
 */
export async function recordUsage(admin, userId, credits, operationType = '') {
  if (!admin || !userId || credits == null || credits < 0) return
  const periodKey = getCurrentPeriodKey()
  try {
    const { data: existing } = await admin
      .from('user_credit_usage')
      .select('id, credits_used')
      .eq('user_id', userId)
      .eq('period_key', periodKey)
      .maybeSingle()

    if (existing) {
      const { error } = await admin
        .from('user_credit_usage')
        .update({
          credits_used: (existing.credits_used || 0) + credits,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
      if (error) {
        console.error('[creditService] recordUsage update error:', error.message, 'userId:', userId, 'op:', operationType)
        return
      }
    } else {
      const { error } = await admin
        .from('user_credit_usage')
        .insert({
          user_id: userId,
          period_key: periodKey,
          credits_used: credits,
          credits_included: CREDITS_INCLUDED_DEFAULT
        })
      if (error) {
        console.error('[creditService] recordUsage insert error:', error.message, 'userId:', userId, 'op:', operationType)
        return
      }
    }
    await recordTransaction(admin, userId, -credits, 'usage', operationType || 'usage', null)
  } catch (err) {
    console.error('[creditService] recordUsage exception:', err?.message || err, 'userId:', userId, 'op:', operationType)
  }
}

/**
 * Registra una transazione Hero Points (per Attività recente).
 * Fire-and-forget: non blocca se la tabella non esiste o errore.
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} userId
 * @param {number} amount - positivo acquisto, negativo utilizzo
 * @param {'purchase'|'usage'} type
 * @param {string} [description]
 * @param {string} [referenceId]
 */
export async function recordTransaction(admin, userId, amount, type, description = '', referenceId = null) {
  if (!admin || !userId || amount == null) return
  try {
    const { error } = await admin.from('credit_transactions').insert({
      user_id: userId,
      amount: Number(amount),
      type: type === 'purchase' ? 'purchase' : 'usage',
      description: description || null,
      reference_id: referenceId || null
    })
    if (error) console.error('[creditService] recordTransaction error:', error.message)
  } catch (err) {
    console.error('[creditService] recordTransaction exception:', err?.message || err)
  }
}

/**
 * Ultime transazioni crediti per l'utente (Attività recente).
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} userId
 * @param {number} [limit]
 * @returns {Promise<Array<{ id: string, amount: number, type: string, description: string|null, reference_id: string|null, created_at: string }>>}
 */
export async function getRecentTransactions(admin, userId, limit = 20) {
  if (!admin || !userId) return []
  try {
    const { data, error } = await admin
      .from('credit_transactions')
      .select('id, amount, type, description, reference_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 50))
    if (error) {
      console.error('[creditService] getRecentTransactions error:', error.message)
      return []
    }
    return Array.isArray(data) ? data : []
  } catch (err) {
    console.error('[creditService] getRecentTransactions exception:', err?.message || err)
    return []
  }
}

/**
 * Restituisce la chiave periodo del mese precedente (YYYY-MM) in UTC.
 * @returns {string}
 */
function getPreviousPeriodKey() {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth() // 0-11
  const prevY = m === 0 ? y - 1 : y
  const prevM = m === 0 ? 11 : m - 1
  return `${prevY}-${String(prevM + 1).padStart(2, '0')}`
}

/**
 * Restituisce l'utilizzo crediti per l'utente nel periodo corrente (o ultimo con dati).
 * Con currentPeriodOnly: true restituisce solo il mese corrente (0 se nessuna riga), così
 * la barra non mostra mai un valore "vecchio" del mese precedente (es. 5 che resta fisso).
 * @param {import('@supabase/supabase-js').SupabaseClient} admin - Client con service role
 * @param {string} userId
 * @param {{ currentPeriodOnly?: boolean }} [opts] - currentPeriodOnly: true = solo periodo corrente, no fallback mese prima
 * @returns {Promise<{ period_key: string, credits_used: number, credits_included: number, overage: number }>}
 */
export async function getCurrentUsage(admin, userId, opts = {}) {
  const periodKey = getCurrentPeriodKey()
  const currentPeriodOnly = opts.currentPeriodOnly === true
  const fallback = {
    period_key: periodKey,
    credits_used: 0,
    credits_included: CREDITS_INCLUDED_DEFAULT,
    overage: 0
  }
  if (!admin || !userId) return fallback
  try {
    const { data, error } = await admin
      .from('user_credit_usage')
      .select('credits_used, credits_included, period_key')
      .eq('user_id', userId)
      .eq('period_key', periodKey)
      .maybeSingle()

    if (error) {
      console.error('[creditService] getCurrentUsage error:', error.message)
      return fallback
    }
    if (data && (data.credits_used != null || data.credits_included != null)) {
      const used = Number(data.credits_used)
      const included = Number(data.credits_included)
      return {
        period_key: String(data.period_key || periodKey),
        credits_used: Number.isFinite(used) ? used : 0,
        credits_included: Number.isFinite(included) && included > 0 ? included : CREDITS_INCLUDED_DEFAULT,
        overage: Math.max(0, (Number.isFinite(used) ? used : 0) - (Number.isFinite(included) && included > 0 ? included : CREDITS_INCLUDED_DEFAULT))
      }
    }
    if (currentPeriodOnly) return fallback
    const prevKey = getPreviousPeriodKey()
    const { data: prevData, error: prevError } = await admin
      .from('user_credit_usage')
      .select('credits_used, credits_included, period_key')
      .eq('user_id', userId)
      .eq('period_key', prevKey)
      .maybeSingle()
    if (!prevError && prevData) {
      const used = Number(prevData.credits_used)
      const included = Number(prevData.credits_included)
      return {
        period_key: String(prevData.period_key || prevKey),
        credits_used: Number.isFinite(used) ? used : 0,
        credits_included: Number.isFinite(included) && included > 0 ? included : CREDITS_INCLUDED_DEFAULT,
        overage: Math.max(0, (Number.isFinite(used) ? used : 0) - (Number.isFinite(included) && included > 0 ? included : CREDITS_INCLUDED_DEFAULT))
      }
    }
    return fallback
  } catch (err) {
    console.error('[creditService] getCurrentUsage exception:', err?.message || err)
    return fallback
  }
}
