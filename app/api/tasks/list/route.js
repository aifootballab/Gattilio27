import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '../../../../lib/authHelper'
import { checkRateLimit } from '../../../../lib/rateLimiter'
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

    // 2. Rate limiting (solo per endpoint pesanti, lettura task è leggera)
    // Per ora disabilitato per /api/tasks/list (endpoint leggero, solo lettura)
    // const rateLimit = checkRateLimit(user_id, '/api/tasks/list')
    // if (!rateLimit.allowed) {
    //   return NextResponse.json(
    //     { error: 'Rate limit exceeded', resetAt: rateLimit.resetAt },
    //     { status: 429 }
    //   )
    // }

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
    const today = new Date()
    const dayOfWeek = today.getDay() // 0 = Domenica, 1 = Lunedì, ..., 6 = Sabato
    const isSunday = dayOfWeek === 0
    
    console.log(`[tasks/list] Current week: ${currentWeek.start}, Requested week: ${weekStartDate}, isCurrentWeek: ${isCurrentWeek}`)

    if (isCurrentWeek) {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (serviceKey) {
        try {
          // Se è domenica, elimina task vecchi e genera nuovi per la prossima settimana
          if (isSunday && tasks && tasks.length > 0) {
            const admin = createClient(supabaseUrl, serviceKey, {
              auth: { autoRefreshToken: false, persistSession: false }
            })
            
            // Elimina task vecchi della settimana corrente
            await admin
              .from('weekly_goals')
              .delete()
              .eq('user_id', user_id)
              .eq('week_start_date', weekStartDate)
            
            tasks = [] // Reset per rigenerare
          }
          
          // Se non ci sono task (o sono stati eliminati), generali
          if (!tasks || tasks.length === 0) {
            console.log(`[tasks/list] Auto-generating tasks for user ${user_id} (${userData?.user?.email || 'unknown'}), week ${weekStartDate}`)
            try {
              const generatedTasks = await generateWeeklyTasksForUser(
                user_id,
                supabaseUrl,
                serviceKey,
                currentWeek
              )
              
              console.log(`[tasks/list] generateWeeklyTasksForUser returned ${generatedTasks?.length || 0} tasks`)
              
              if (!generatedTasks || generatedTasks.length === 0) {
                console.warn(`[tasks/list] generateWeeklyTasksForUser returned empty array - this might indicate an issue`)
              }
              
              // Se generati, recuperali di nuovo (usa admin per bypassare RLS temporaneamente per debug)
              if (generatedTasks && generatedTasks.length > 0) {
                console.log(`[tasks/list] Attempting to fetch ${generatedTasks.length} generated tasks`)
                
                // Prova prima con anon key (RLS)
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
              } else {
                console.warn('[tasks/list] No tasks generated, user might not have enough data')
              }
            } catch (genErr) {
              console.error('[tasks/list] Error in generateWeeklyTasksForUser:', genErr)
              // Non bloccare, continua con array vuoto
            }
          }
        } catch (genError) {
          console.error('[tasks/list] Error auto-generating tasks:', genError)
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
