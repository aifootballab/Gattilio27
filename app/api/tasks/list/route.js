import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '../../../../lib/authHelper'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '../../../../lib/rateLimiter'
import { getCurrentWeek, generateWeeklyTasksForUser } from '../../../../lib/taskHelper'

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

    // 2. Rate limiting (riattivato con limite alto - endpoint leggero)
    const rateLimitConfig = RATE_LIMIT_CONFIG['/api/tasks/list']
    const rateLimit = await checkRateLimit(
      user_id,
      '/api/tasks/list',
      rateLimitConfig.maxRequests,
      rateLimitConfig.windowMs
    )
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Please try again later.',
          resetAt: rateLimit.resetAt 
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitConfig.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetAt.toString()
          }
        }
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

    let { data: tasks, error: tasksError } = await supabase
      .from('weekly_goals')
      .select('*')
      .eq('user_id', user_id)
      .eq('week_start_date', weekStartDate)
      .order('created_at', { ascending: true })

    if (tasksError) {
      console.error('[tasks/list] Error fetching tasks:', tasksError)
      console.error('[tasks/list] Error details:', JSON.stringify(tasksError, null, 2))
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
    }
    
    console.log(`[tasks/list] Found ${tasks?.length || 0} existing tasks for user ${user_id}, week ${weekStartDate}`)
    console.log(`[tasks/list] User email: ${userData?.user?.email || 'unknown'}`)

    // 5. Auto-generazione task: se non ci sono per la settimana corrente, generali
    const currentWeek = getCurrentWeek()
    const isCurrentWeek = weekStartDate === currentWeek.start
    
    console.log(`[tasks/list] Current week: ${currentWeek.start}, Requested week: ${weekStartDate}, isCurrentWeek: ${isCurrentWeek}`)

    // Genera task se è la settimana corrente e non ci sono task
    // (per settimane passate o future, non generiamo automaticamente)
    // NOTA: Per test, genera anche per utenti con partite che non hanno mai avuto task
    if (isCurrentWeek && (!tasks || tasks.length === 0)) {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (serviceKey) {
        try {
          // Calcola week end per la settimana richiesta (pattern coerente con generate)
          const weekStart = new Date(weekStartDate)
          // Assicura che sia lunedì (normalizza)
          const dayOfWeek = weekStart.getDay()
          const diff = weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
          weekStart.setDate(diff)
          weekStart.setHours(0, 0, 0, 0)

          const weekEnd = new Date(weekStart)
          weekEnd.setDate(weekEnd.getDate() + 6) // Domenica
          weekEnd.setHours(23, 59, 59, 999)

          const week = {
            start: weekStart.toISOString().split('T')[0],
            end: weekEnd.toISOString().split('T')[0]
          }
          
          console.log(`[tasks/list] Auto-generating tasks for user ${user_id} (${userData?.user?.email || 'unknown'}), week ${week.start}`)
          
          const generatedTasks = await generateWeeklyTasksForUser(
            user_id,
            supabaseUrl,
            serviceKey,
            week
          )
          
          console.log(`[tasks/list] generateWeeklyTasksForUser returned ${generatedTasks?.length || 0} tasks`)
          
          if (!generatedTasks || generatedTasks.length === 0) {
            console.warn(`[tasks/list] generateWeeklyTasksForUser returned empty array - this might indicate an issue`)
            console.warn(`[tasks/list] User ${userData?.user?.email || user_id} might not have enough data for personalized tasks, but should still get generic tasks`)
          } else {
            // Se generati, recuperali di nuovo (usa RLS)
            console.log(`[tasks/list] Attempting to fetch ${generatedTasks.length} generated tasks`)
            
            const { data: newTasks, error: fetchError } = await supabase
              .from('weekly_goals')
              .select('*')
              .eq('user_id', user_id)
              .eq('week_start_date', weekStartDate)
              .order('created_at', { ascending: true })
            
            if (!fetchError && newTasks && newTasks.length > 0) {
              tasks = newTasks
              console.log(`[tasks/list] Successfully retrieved ${tasks.length} tasks via RLS`)
            } else {
              console.warn(`[tasks/list] RLS query returned ${newTasks?.length || 0} tasks, error:`, fetchError)
              
              // Fallback: usa admin per verificare se i task esistono
              const admin = createClient(supabaseUrl, serviceKey, {
                auth: { autoRefreshToken: false, persistSession: false }
              })
              
              const { data: adminTasks, error: adminError } = await admin
                .from('weekly_goals')
                .select('*')
                .eq('user_id', user_id)
                .eq('week_start_date', weekStartDate)
                .order('created_at', { ascending: true })
              
              if (!adminError && adminTasks && adminTasks.length > 0) {
                console.warn(`[tasks/list] Found ${adminTasks.length} tasks via admin (RLS might be blocking), using admin results`)
                tasks = adminTasks
              } else {
                console.error('[tasks/list] Admin query also failed:', adminError)
              }
            }
          }
        } catch (genError) {
          console.error('[tasks/list] Error auto-generating tasks:', genError)
          console.error('[tasks/list] Error stack:', genError.stack)
          // Non bloccare, restituisci task esistenti o array vuoto
        }
      }
    }

    // 6. Restituisci task
    return NextResponse.json({
      success: true,
      tasks: tasks || [],
      week_start_date: weekStartDate,
      count: tasks?.length || 0
    })
  } catch (error) {
    console.error('[tasks/list] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
