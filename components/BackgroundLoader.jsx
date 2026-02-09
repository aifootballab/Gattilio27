'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

const BACKGROUND_URLS = {
  default: '/backgrounds/sfondo.png',
  sfondo2: '/backgrounds/sfondo%202.jpg',
  sfondo3: '/backgrounds/sfondo%203.jpg'
}

/**
 * Carica background_key dal profilo utente e applica lo sfondo al layer .custom-background.
 * Esegue solo lato client dopo login; senza sessione resta lo sfondo di default (CSS).
 */
export default function BackgroundLoader() {
  const [applied, setApplied] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    let cancelled = false

    const apply = async (keyFromEvent) => {
      const el = document.querySelector('.custom-background')
      if (!el || !(el instanceof HTMLElement)) return

      // Se l'evento ha passato la chiave (es. dopo salvataggio in Profilo), applica subito senza rileggere da DB
      if (keyFromEvent != null && BACKGROUND_URLS[keyFromEvent]) {
        el.style.backgroundImage = `url(${BACKGROUND_URLS[keyFromEvent]})`
        setApplied(true)
        return
      }

      try {
        const { data: session } = await supabase?.auth.getSession() ?? {}
        if (cancelled || !session?.session?.access_token) {
          el.style.backgroundImage = `url(${BACKGROUND_URLS.default})`
          setApplied(true)
          return
        }

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('background_key')
          .maybeSingle()

        if (cancelled) return
        const key = profile?.background_key && BACKGROUND_URLS[profile.background_key]
          ? profile.background_key
          : 'default'
        el.style.backgroundImage = `url(${BACKGROUND_URLS[key]})`
        setApplied(true)
      } catch (err) {
        if (!cancelled) {
          const el = document.querySelector('.custom-background')
          if (el && el instanceof HTMLElement) el.style.backgroundImage = `url(${BACKGROUND_URLS.default})`
          setApplied(true)
        }
      }
    }

    apply()
    const unsub = supabase?.auth?.onAuthStateChange?.(() => apply())
    const onBackgroundChanged = (e) => {
      const key = e?.detail?.background_key
      apply(key)
    }
    window.addEventListener('background-changed', onBackgroundChanged)
    return () => {
      cancelled = true
      unsub?.subscription?.unsubscribe?.()
      window.removeEventListener('background-changed', onBackgroundChanged)
    }
  }, [])

  return null
}
