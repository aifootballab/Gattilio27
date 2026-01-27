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
    const today = new Date()
    const dayOfWeek = today.getDay() // 0 = Domenica, 1 = Lunedì, ..., 6 = Sabato
    const isSunday = dayOfWeek === 0
    
    // Se è domenica, calcola la PROSSIMA settimana (non quella corrente)
    let targetWeek = currentWeek
    if (isSunday) {
      // Calcola prossima settimana (lunedì prossimo)
      const nextMonday = new Date(today)
      nextMonday.setDate(nextMonday.getDate() + 1) // Lunedì prossimo
      nextMonday.setHours(0, 0, 0, 0)
      
      const nextSunday = new Date(nextMonday)
      nextSunday.setDate(nextSunday.getDate() + 6)
      nextSunday.setHours(23, 59, 59, 999)
      
      targetWeek = {
        start: nextMonday.toISOString().split('T')[0],
        end: nextSunday.toISOString().split('T')[0]
      }
    }
    
    const isCurrentWeek = weekStartDate === currentWeek.start
    const isTargetWeek = weekStartDate === targetWeek.start
    
    console.log(`[tasks/list] Today: ${today.toISOString().split('T')[0]}, Day: ${dayOfWeek} (${isSunday ? 'Sunday' : 'Not Sunday'})`)
    console.log(`[tasks/list] Current week: ${currentWeek.start}, Target week: ${targetWeek.start}, Requested week: ${weekStartDate}`)
    console.log(`[tasks/list] isCurrentWeek: ${isCurrentWeek}, isTargetWeek: ${isTargetWeek}`)

    // Genera task se:
    // 1. È la settimana corrente (non domenica) O
    // 2. È domenica e stiamo richiedendo la prossima settimana
    if (isCurrentWeek || (isSunday && isTargetWeek)) {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (serviceKey) {
        try {
          // Se è domenica, elimina task vecchi della settimana corrente (quella che sta finendo)
          if (isSunday && tasks && tasks.length > 0 && weekStartDate === currentWeek.start) {
            console.log(`[tasks/list] Sunday detected: cleaning up tasks for ending week ${currentWeek.start}`)
            const admin = createClient(supabaseUrl, serviceKey, {
              auth: { autoRefreshToken: false, persistSession: false }
            })
            
            // Elimina task vecchi della settimana corrente (quella che sta finendo)
            await admin
              .from('weekly_goals')
              .delete()
              .eq('user_id', user_id)
              .eq('week_start_date', currentWeek.start)
            
            tasks = [] // Reset per rigenerare
          }
          
          // Se non ci sono task (o sono stati eliminati), generali
          // Usa targetWeek (prossima settimana se domenica, altrimenti corrente)
          if (!tasks || tasks.length === 0) {
            const weekToGenerate = isSunday ? targetWeek : currentWeek
            console.log(`[tasks/list] Auto-generating tasks for user ${user_id} (${userData?.user?.email || 'unknown'}), week ${weekToGenerate.start}`)
            try {
              const generatedTasks = await generateWeeklyTasksForUser(
                user_id,
                supabaseUrl,
                serviceKey,
                weekToGenerate
              )
              
              console.log(`[tasks/list] generateWeeklyTasksForUser returned ${generatedTasks?.length || 0} tasks`)
              
              if (!generatedTasks || generatedTasks.length === 0) {
                console.warn(`[tasks/list] generateWeeklyTasksForUser returned empty array - this might indicate an issue`)
                console.warn(`[tasks/list] User ${userData?.user?.email || user_id} might not have enough data for personalized tasks, but should still get generic tasks`)
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
                    .eq('week_start_date', weekToFetch)
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
                // Se non ci sono task generati, dovrebbe comunque esserci almeno 3 task generici
                // Questo indica un problema nella logica di generazione
                console.error(`[tasks/list] CRITICAL: generateWeeklyTasksForUser returned empty array for user ${user_id} (${userData?.user?.email || 'unknown'})`)
                console.error('[tasks/list] This should never happen - even users with no data should get 3 generic tasks')
              }
            } catch (genErr) {
              console.error('[tasks/list] Error in generateWeeklyTasksForUser:', genErr)
              console.error('[tasks/list] Error stack:', genErr.stack)
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
