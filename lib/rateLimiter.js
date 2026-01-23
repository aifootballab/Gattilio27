/**
 * Rate Limiter semplice per endpoint API
 * Usa in-memory store (per produzione, usare Redis)
 * 
 * TODO: Per produzione, implementare con Redis o database
 */

const rateLimitStore = new Map()

/**
 * Rate limiter per endpoint
 * @param {string} userId - User ID
 * @param {string} endpoint - Endpoint path
 * @param {number} maxRequests - Max richieste
 * @param {number} windowMs - Finestra temporale in millisecondi
 * @returns {Promise<{allowed: boolean, remaining: number, resetAt: number}>}
 */
export async function checkRateLimit(userId, endpoint, maxRequests = 10, windowMs = 60000) {
  const key = `${userId}:${endpoint}`
  const now = Date.now()
  
  // Recupera o crea entry
  let entry = rateLimitStore.get(key)
  
  if (!entry || now > entry.resetAt) {
    // Nuova finestra o scaduta
    entry = {
      count: 0,
      resetAt: now + windowMs
    }
    rateLimitStore.set(key, entry)
  }
  
  // Incrementa contatore
  entry.count++
  
  // Verifica limite
  const allowed = entry.count <= maxRequests
  const remaining = Math.max(0, maxRequests - entry.count)
  
  // Cleanup vecchie entry (ogni 1000 chiamate, per evitare memory leak)
  if (Math.random() < 0.001) {
    cleanupExpiredEntries(now)
  }
  
  return {
    allowed,
    remaining,
    resetAt: entry.resetAt
  }
}

/**
 * Pulisce entry scadute
 */
function cleanupExpiredEntries(now) {
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key)
    }
  }
}

/**
 * Configurazione rate limit per endpoint
 */
export const RATE_LIMIT_CONFIG = {
  '/api/analyze-match': {
    maxRequests: 20, // 20 richieste (aumentato per analisi più frequenti)
    windowMs: 60000 // per minuto
  },
  '/api/supabase/delete-match': {
    maxRequests: 5, // 5 richieste
    windowMs: 60000 // per minuto
  },
  '/api/supabase/save-match': {
    maxRequests: 20, // 20 richieste
    windowMs: 60000 // per minuto
  },
  '/api/supabase/update-match': {
    maxRequests: 30, // 30 richieste
    windowMs: 60000 // per minuto
  },
  '/api/generate-countermeasures': {
    maxRequests: 5, // 5 richieste
    windowMs: 60000 // per minuto
  }
}
