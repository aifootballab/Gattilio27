import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ⚠️ ROUTE PER ESEGUIRE MIGRAZIONE
// PRIMA: Esegui create_migration_function.sql in SQL Editor
// POI: Chiama questa route

export async function POST(req) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Supabase env missing' }, { status: 500 })
    }

    // Verifica secret per sicurezza
    const { secret } = await req.json()
    const expectedSecret = process.env.MIGRATION_SECRET || 'MIGRATE_2025'
    
    if (secret !== expectedSecret) {
      return NextResponse.json({ 
        error: 'Invalid migration secret',
        hint: `Use secret: ${expectedSecret}`
      }, { status: 401 })
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Chiama la funzione SQL che esegue la migrazione
    const { data, error } = await admin.rpc('migrate_to_players_table')

    if (error) {
      console.error('[run-migration] Error:', error)
      return NextResponse.json({
        error: 'Migration failed',
        details: error.message,
        hint: 'Assicurati di aver eseguito create_migration_function.sql prima in SQL Editor'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Migrazione completata!',
      results: data
    })

  } catch (e) {
    console.error('[run-migration] Error:', e)
    return NextResponse.json(
      { 
        error: e?.message || 'Errore migrazione',
        hint: 'Verifica che la funzione migrate_to_players_table() esista in Supabase'
      },
      { status: 500 }
    )
  }
}
