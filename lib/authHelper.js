/**
 * Helper per validazione token Supabase (anon + email)
 * Funziona sia per token anonimi che per token email
 */

import { createClient } from '@supabase/supabase-js'

/**
 * Valida un token Supabase e restituisce userData
 * Supporta sia token anonimi che email
 * 
 * @param {string} token - Bearer token
 * @param {string} supabaseUrl - URL Supabase
 * @param {string} anonKey - Anon key (JWT legacy o publishable)
 * @returns {Promise<{userData: object|null, error: Error|null}>}
 */
export async function validateToken(token, supabaseUrl, anonKey) {
  if (!token || !supabaseUrl || !anonKey) {
    return { userData: null, error: new Error('Missing required parameters') }
  }

  let userData = null
  let userErr = null

  // Legacy JWT key (più affidabile per token anonimi, ma funziona anche per email)
  const legacyAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsaXV1b3Jyd2RldHlsb2xscnVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MDk0MTksImV4cCI6MjA4MzQ4NTQxOX0.pGnglOpSQ4gJ1JClB_zyBIB3-94eKHJfgveuCfoyffo'
  
  try {
    // Prova PRIMA con legacy JWT (funziona per anon e email)
    const legacyAuthClient = createClient(supabaseUrl, legacyAnonKey)
    const legacyResult = await legacyAuthClient.auth.getUser(token)
    userData = legacyResult.data
    userErr = legacyResult.error
    
    if (!userErr && userData?.user?.id) {
      return { userData, error: null }
    }
  } catch (legacyErr) {
    userErr = legacyErr
  }

  // Fallback: se legacy fallisce e anonKey è JWT, prova con anonKey configurato
  if (userErr && anonKey?.includes('.') && !anonKey?.startsWith('sb_publishable_')) {
    try {
      const authClient = createClient(supabaseUrl, anonKey)
      const authResult = await authClient.auth.getUser(token)
      if (!authResult.error && authResult.data?.user?.id) {
        userData = authResult.data
        userErr = null
        return { userData, error: null }
      } else {
        userErr = authResult.error || userErr
      }
    } catch (fallbackErr) {
      userErr = fallbackErr
    }
  }

  // Se fallisce con "Invalid API key" e anonKey è publishable, prova ancora con legacy
  if (userErr?.message?.includes('Invalid API key') && anonKey?.startsWith('sb_publishable_')) {
    // Già provato sopra, ma riproviamo per sicurezza
    try {
      const legacyAuthClient = createClient(supabaseUrl, legacyAnonKey)
      const legacyResult = await legacyAuthClient.auth.getUser(token)
      if (!legacyResult.error && legacyResult.data?.user?.id) {
        userData = legacyResult.data
        userErr = null
        return { userData, error: null }
      }
    } catch (retryErr) {
      // Ignora
    }
  }

  return { userData: null, error: userErr || new Error('Token validation failed') }
}

/**
 * Estrae il token Bearer dall'header Authorization
 * 
 * @param {Request} req - Next.js Request object
 * @returns {string|null}
 */
export function extractBearerToken(req) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : null
  return token
}
