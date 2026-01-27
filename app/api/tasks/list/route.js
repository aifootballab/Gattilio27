import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '../../../../lib/authHelper'
import { checkRateLimit } from '../../../../lib/rateLimiter'
import { getCurrentWeek } from '../../../../lib/taskHelper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/tasks/list
 * Restituisce task attivi per utente corrente
 * Query params: ?week_start_date=2026-01-26 (opzionale, default: settimana corrente)
 */
export async function GET(request) {
  try {
    // 1. Autenticazione (pattern enterprise coerente)
    const token = extractBearerToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validazione token (pattern coerente con altri endpoint)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
    
    if (authError || !userData?.user?.id) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    const user_id = userData.user.id

    // 2. Rate limiting
    const rateLimit = checkRateLimit(user_id, '/api/tasks/list')
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', resetAt: rateLimit.resetAt },
        { status: 429 }
      )
    }

    // 3. Parametri query
    const { searchParams } = new URL(request.url)
    let weekStartDate = searchParams.get('week_start_date') || getCurrentWeek().start

    // Validazione formato data (se fornita)
    if (weekStartDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(weekStartDate)) {
        return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
      }

      // Validazione: data non troppo vecchia (max 1 anno fa) o futura
      const weekStart = new Date(weekStartDate)
      const today = new Date()
      today.setHours(23, 59, 59, 999)
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
      oneYearAgo.setHours(0, 0, 0, 0)

      if (isNaN(weekStart.getTime())) {
        return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
      }

      if (weekStart > today) {
        // Data futura: usa settimana corrente
        weekStartDate = getCurrentWeek().start
      } else if (weekStart < oneYearAgo) {
        return NextResponse.json({ error: 'Date cannot be more than 1 year ago' }, { status: 400 })
      }
    }

    // 4. Recupera task da Supabase (query diretta con RLS)
    const supabase = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })

    const { data: tasks, error: tasksError } = await supabase
      .from('weekly_goals')
      .select('*')
      .eq('user_id', user_id)
      .eq('week_start_date', weekStartDate)
      .order('created_at', { ascending: true })

    if (tasksError) {
      console.error('[tasks/list] Error fetching tasks:', tasksError)
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
    }

    // 5. Restituisci task
    return NextResponse.json({
      success: true,
      tasks: tasks || [],
      week_start_date: weekStartDate,
      count: tasks?.length || 0
    }, {
      headers: {
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': rateLimit.resetAt.toISOString()
      }
    })
  } catch (error) {
    console.error('[tasks/list] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
