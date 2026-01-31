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
  } catch (err) {
    console.error('[creditService] recordUsage exception:', err?.message || err, 'userId:', userId, 'op:', operationType)
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
 * Se il mese corrente non ha riga (es. primo giorno mese nuovo), usa il mese precedente
 * così la barra non mostra 0 quando ci sono crediti nel mese prima.
 * @param {import('@supabase/supabase-js').SupabaseClient} admin - Client con service role
 * @param {string} userId
 * @returns {Promise<{ period_key: string, credits_used: number, credits_included: number, overage: number }>}
 */
export async function getCurrentUsage(admin, userId) {
  const periodKey = getCurrentPeriodKey()
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
      const used = data.credits_used ?? 0
      const included = data.credits_included ?? CREDITS_INCLUDED_DEFAULT
      return {
        period_key: data.period_key || periodKey,
        credits_used: used,
        credits_included: included,
        overage: Math.max(0, used - included)
      }
    }
    const prevKey = getPreviousPeriodKey()
    const { data: prevData, error: prevError } = await admin
      .from('user_credit_usage')
      .select('credits_used, credits_included, period_key')
      .eq('user_id', userId)
      .eq('period_key', prevKey)
      .maybeSingle()
    if (!prevError && prevData) {
      const used = prevData.credits_used ?? 0
      const included = prevData.credits_included ?? CREDITS_INCLUDED_DEFAULT
      return {
        period_key: prevData.period_key || prevKey,
        credits_used: used,
        credits_included: included,
        overage: Math.max(0, used - included)
      }
    }
    return fallback
  } catch (err) {
    console.error('[creditService] getCurrentUsage exception:', err?.message || err)
    return fallback
  }
}
