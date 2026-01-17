import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ⚠️ ROUTE TEMPORANEA PER MIGRAZIONE
// Usa solo una volta, poi elimina questa route!

export async function POST(req) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Supabase env missing' }, { status: 500 })
    }

    // Verifica chiave segreta per sicurezza (usa una password temporanea)
    const { secret } = await req.json()
    if (secret !== process.env.MIGRATION_SECRET || !process.env.MIGRATION_SECRET) {
      // Se MIGRATION_SECRET non è configurato, richiedi una password
      const defaultSecret = 'MIGRATE_NOW_2025'
      if (secret !== defaultSecret) {
        return NextResponse.json({ 
          error: 'Invalid migration secret. Set MIGRATION_SECRET in Vercel or use default.',
          hint: 'Add ?secret=YOUR_SECRET to the request body'
        }, { status: 401 })
      }
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const results = []

    // STEP 1: Rimuovi constraints
    try {
      await admin.rpc('exec_sql', {
        sql: `
          ALTER TABLE IF EXISTS player_builds DROP CONSTRAINT IF EXISTS player_builds_player_base_id_fkey;
          ALTER TABLE IF EXISTS player_builds DROP CONSTRAINT IF EXISTS player_builds_user_id_fkey;
          ALTER TABLE IF EXISTS players_base DROP CONSTRAINT IF EXISTS players_base_playing_style_id_fkey;
          ALTER TABLE IF EXISTS screenshot_processing_log DROP CONSTRAINT IF EXISTS screenshot_processing_log_user_id_fkey;
          ALTER TABLE IF EXISTS user_rosa DROP CONSTRAINT IF EXISTS user_rosa_user_id_fkey;
        `
      })
      results.push('✅ Constraints rimossi')
    } catch (e) {
      results.push(`⚠️ Constraints: ${e.message}`)
    }

    // STEP 2: Cancella tabelle vecchie
    const tablesToDrop = ['player_builds', 'players_base', 'user_rosa', 'screenshot_processing_log']
    for (const table of tablesToDrop) {
      try {
        const { error } = await admin.from(table).select('id').limit(0)
        if (!error) {
          // Tabella esiste, cancellala
          await admin.rpc('exec_sql', { sql: `DROP TABLE IF EXISTS ${table} CASCADE;` })
          results.push(`✅ Tabella ${table} cancellata`)
        } else {
          results.push(`ℹ️ Tabella ${table} non esiste`)
        }
      } catch (e) {
        results.push(`⚠️ ${table}: ${e.message}`)
      }
    }

    // STEP 3: Crea nuova tabella players
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS players (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        player_name TEXT NOT NULL,
        position TEXT,
        card_type TEXT,
        team TEXT,
        overall_rating INTEGER,
        base_stats JSONB DEFAULT '{}',
        skills TEXT[] DEFAULT '{}',
        com_skills TEXT[] DEFAULT '{}',
        position_ratings JSONB DEFAULT '{}',
        available_boosters JSONB DEFAULT '[]',
        height INTEGER,
        weight INTEGER,
        age INTEGER,
        nationality TEXT,
        club_name TEXT,
        form TEXT,
        role TEXT,
        playing_style_id UUID REFERENCES playing_styles(id),
        current_level INTEGER,
        level_cap INTEGER,
        active_booster_name TEXT,
        development_points JSONB DEFAULT '{}',
        slot_index INTEGER CHECK (slot_index IS NULL OR (slot_index >= 0 AND slot_index < 21)),
        metadata JSONB DEFAULT '{}',
        extracted_data JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, slot_index) WHERE slot_index IS NOT NULL,
        CONSTRAINT valid_slot CHECK (slot_index IS NULL OR (slot_index >= 0 AND slot_index < 21))
      );
    `

    try {
      await admin.rpc('exec_sql', { sql: createTableSQL })
      results.push('✅ Tabella players creata')
    } catch (e) {
      // Se exec_sql non esiste, usa fetch diretto
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`
        },
        body: JSON.stringify({ sql: createTableSQL })
      })
      
      if (!response.ok) {
        // Prova con query diretta usando Supabase REST API
        // Nota: Supabase non supporta DDL via REST, dobbiamo usare SQL Editor
        results.push('⚠️ Impossibile creare tabella via API. Usa SQL Editor in Supabase Dashboard.')
        results.push('📋 Esegui manualmente lo script in migration_semplificazione.sql')
      }
    }

    // STEP 4: Crea index
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_players_user_id ON players(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_players_slot_index ON players(user_id, slot_index) WHERE slot_index IS NOT NULL;',
      'CREATE INDEX IF NOT EXISTS idx_players_created_at ON players(user_id, created_at DESC);'
    ]

    for (const indexSQL of indexes) {
      try {
        await admin.rpc('exec_sql', { sql: indexSQL })
        results.push(`✅ Index creato`)
      } catch (e) {
        results.push(`⚠️ Index: ${e.message}`)
      }
    }

    // STEP 5: RLS
    const rlsSQL = `
      ALTER TABLE players ENABLE ROW LEVEL SECURITY;
      
      DROP POLICY IF EXISTS "Users can view own players" ON players;
      CREATE POLICY "Users can view own players" ON players FOR SELECT USING (auth.uid() = user_id);
      
      DROP POLICY IF EXISTS "Users can insert own players" ON players;
      CREATE POLICY "Users can insert own players" ON players FOR INSERT WITH CHECK (auth.uid() = user_id);
      
      DROP POLICY IF EXISTS "Users can update own players" ON players;
      CREATE POLICY "Users can update own players" ON players FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
      
      DROP POLICY IF EXISTS "Users can delete own players" ON players;
      CREATE POLICY "Users can delete own players" ON players FOR DELETE USING (auth.uid() = user_id);
    `

    try {
      await admin.rpc('exec_sql', { sql: rlsSQL })
      results.push('✅ RLS policies create')
    } catch (e) {
      results.push(`⚠️ RLS: ${e.message}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Migrazione completata (parzialmente - alcuni step richiedono SQL Editor)',
      results
    })

  } catch (e) {
    console.error('[migrate] Error:', e)
    return NextResponse.json(
      { 
        error: e?.message || 'Errore migrazione',
        hint: 'Supabase non supporta DDL via REST API. Usa SQL Editor in Dashboard.'
      },
      { status: 500 }
    )
  }
}
