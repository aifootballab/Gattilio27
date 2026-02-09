/**
 * GET /api/leaderboard?month=YYYY-MM
 * Classifica mensile From Zero to Hero.
 * Sicurezza: in classifica solo rank, nickname, punti. Nessun user_id né breakdown per altri.
 * Se Authorization presente: aggiunge currentUser (rank, points, pointsBreakdown) solo per l'utente loggato.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/rateLimiter'
import {
  computeLeaderboardForMonth,
  saveLeaderboardSnapshot,
  getMonthBounds
} from '@/lib/leaderboardHelper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/
const MONTH_MAX_LENGTH = 7

function getCurrentMonth() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export async function GET(req) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
  }

  const { searchParams } = new URL(req.url)
  let month = searchParams.get('month') || getCurrentMonth()
  if (typeof month !== 'string') month = getCurrentMonth()
  month = month.trim().slice(0, MONTH_MAX_LENGTH)
  if (!MONTH_REGEX.test(month)) {
    return NextResponse.json({ error: 'Invalid month; use YYYY-MM' }, { status: 400 })
  }

  const token = extractBearerToken(req)
  let authUserId = null
  if (token && anonKey) {
    const { userData } = await validateToken(token, supabaseUrl, anonKey)
    authUserId = userData?.user?.id ?? null
  }
  const rateLimitKey = authUserId ?? (token ? 'auth' : 'anon')
  const rlConfig = RATE_LIMIT_CONFIG['/api/leaderboard'] || { maxRequests: 60, windowMs: 60000 }
  const rateLimit = await checkRateLimit(rateLimitKey, '/api/leaderboard', rlConfig.maxRequests, rlConfig.windowMs)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.', resetAt: rateLimit.resetAt },
      {
        status: 429,
        headers: {
          'Cache-Control': 'no-store',
          'X-RateLimit-Limit': String(rlConfig.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(rateLimit.resetAt.getTime())
        }
      }
    )
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  let rankings = []
  let computedForCurrentUser = null
  const { data: snapshots } = await admin
    .from('leaderboard_snapshots')
    .select('user_id, points, rank, points_breakdown')
    .eq('month', month)
    .order('rank', { ascending: true })

  const snapshotUserIds = new Set((snapshots || []).map(s => s.user_id))
  const authUserHasConsentButNotInSnapshot = authUserId &&
    snapshotUserIds.size > 0 &&
    !snapshotUserIds.has(authUserId)

  // Retroattivo: se l'utente loggato ha consenso ma non è in classifica, ricalcola il mese per includerlo
  let snapshotsToUse = snapshots
  if (authUserHasConsentButNotInSnapshot) {
    const { data: profile } = await admin
      .from('user_profiles')
      .select('leaderboard_consent')
      .eq('user_id', authUserId)
      .maybeSingle()
    if (profile?.leaderboard_consent) {
      const computed = await computeLeaderboardForMonth(month, admin)
      if (computed.length) {
        await saveLeaderboardSnapshot(month, computed, admin)
        snapshotsToUse = computed.map(r => ({
          user_id: r.user_id,
          rank: r.rank,
          points: r.points,
          points_breakdown: r.points_breakdown || {}
        }))
      }
    }
  }

  const snapshotByUserForCurrent = {} // rank/points per currentUser dopo eventuale filtro consenso
  if (snapshotsToUse?.length) {
    const { data: profiles } = await admin
      .from('user_profiles')
      .select('user_id, nickname')
      .in('user_id', snapshotsToUse.map(s => s.user_id))
      .eq('leaderboard_consent', true)
    const consentedIds = new Set((profiles || []).map(p => p.user_id))
    const nicknameByUser = {}
    ;(profiles || []).forEach(p => { nicknameByUser[p.user_id] = p.nickname || null })
    const filtered = snapshotsToUse.filter(s => consentedIds.has(s.user_id))
    rankings = filtered.map((s, idx) => {
      snapshotByUserForCurrent[s.user_id] = { rank: idx + 1, points: s.points, points_breakdown: s.points_breakdown || {} }
      return {
        rank: idx + 1,
        nickname: nicknameByUser[s.user_id] ?? '—',
        points: s.points
      }
    })
  } else {
    const computed = await computeLeaderboardForMonth(month, admin)
    if (computed.length) {
      await saveLeaderboardSnapshot(month, computed, admin)
    }
    rankings = computed.map(r => ({
      rank: r.rank,
      nickname: r.nickname ?? '—',
      points: r.points
    }))
    computedForCurrentUser = computed
  }

  let currentUser = null
  if (authUserId) {
    const uid = authUserId
    if (Object.keys(snapshotByUserForCurrent).length > 0) {
      const from = snapshotByUserForCurrent[uid]
      if (from) currentUser = { rank: from.rank, points: from.points, pointsBreakdown: from.points_breakdown || {} }
    } else {
      const snapshotRow = snapshotsToUse?.find(s => s.user_id === uid)
      if (snapshotRow) {
        currentUser = { rank: snapshotRow.rank, points: snapshotRow.points, pointsBreakdown: snapshotRow.points_breakdown || {} }
      }
      if (!currentUser && computedForCurrentUser) {
        const me = computedForCurrentUser.find(r => r.user_id === uid)
        if (me) currentUser = { rank: me.rank, points: me.points, pointsBreakdown: me.points_breakdown || {} }
      }
    }
  }

  const endOfMonth = getMonthBounds(month)
  const daysLeft = endOfMonth ? Math.max(0, Math.ceil((new Date(endOfMonth.end) - new Date()) / (24 * 60 * 60 * 1000))) : null

  return NextResponse.json(
    {
      month,
      rankings,
      ...(currentUser && { currentUser }),
      daysLeftInMonth: daysLeft
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-RateLimit-Remaining': String(Math.max(0, rateLimit.remaining - 1))
      }
    }
  )
}
