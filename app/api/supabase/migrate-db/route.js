import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ⚠️ ROUTE PER MIGRAZIONE DATABASE
// Esegue lo script SQL direttamente usando service role key

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

    const results = []
    
    // Usa fetch diretto con service role key per eseguire SQL
    // Supabase supporta SQL via REST API usando il formato corretto
    
    const sqlCommands = [
      // STEP 1: Rimuovi constraints
      `ALTER TABLE IF EXISTS player_builds DROP CONSTRAINT IF EXISTS player_builds_player_base_id_fkey;`,
      `ALTER TABLE IF EXISTS player_builds DROP CONSTRAINT IF EXISTS player_builds_user_id_fkey;`,
      `ALTER TABLE IF EXISTS players_base DROP CONSTRAINT IF EXISTS players_base_playing_style_id_fkey;`,
      `ALTER TABLE IF EXISTS screenshot_processing_log DROP CONSTRAINT IF EXISTS screenshot_processing_log_user_id_fkey;`,
      `ALTER TABLE IF EXISTS user_rosa DROP CONSTRAINT IF EXISTS user_rosa_user_id_fkey;`,
      
      // STEP 2: Cancella tabelle
      `DROP TABLE IF EXISTS player_builds CASCADE;`,
      `DROP TABLE IF EXISTS players_base CASCADE;`,
      `DROP TABLE IF EXISTS user_rosa CASCADE;`,
      `DROP TABLE IF EXISTS screenshot_processing_log CASCADE;`,
      
      // STEP 3: Crea tabella players
      `CREATE TABLE IF NOT EXISTS players (
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
      );`,
      
      // STEP 4: Index
      `CREATE INDEX IF NOT EXISTS idx_players_user_id ON players(user_id);`,
      `CREATE INDEX IF NOT EXISTS idx_players_slot_index ON players(user_id, slot_index) WHERE slot_index IS NOT NULL;`,
      `CREATE INDEX IF NOT EXISTS idx_players_created_at ON players(user_id, created_at DESC);`,
      
      // STEP 5: RLS
      `ALTER TABLE players ENABLE ROW LEVEL SECURITY;`,
      `DROP POLICY IF EXISTS "Users can view own players" ON players;`,
      `CREATE POLICY "Users can view own players" ON players FOR SELECT USING (auth.uid() = user_id);`,
      `DROP POLICY IF EXISTS "Users can insert own players" ON players;`,
      `CREATE POLICY "Users can insert own players" ON players FOR INSERT WITH CHECK (auth.uid() = user_id);`,
      `DROP POLICY IF EXISTS "Users can update own players" ON players;`,
      `CREATE POLICY "Users can update own players" ON players FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`,
      `DROP POLICY IF EXISTS "Users can delete own players" ON players;`,
      `CREATE POLICY "Users can delete own players" ON players FOR DELETE USING (auth.uid() = user_id);`,
      
      // STEP 6: Trigger
      `CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';`,
      `DROP TRIGGER IF EXISTS update_players_updated_at ON players;`,
      `CREATE TRIGGER update_players_updated_at
      BEFORE UPDATE ON players
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();`
    ]

    // Esegui ogni comando SQL usando Supabase Management API
    // Nota: Supabase non supporta DDL via REST API standard
    // Dobbiamo usare il PostgREST con estensioni o creare una funzione SQL custom
    
    // Prova con fetch diretto al database
    for (let i = 0; i < sqlCommands.length; i++) {
      const sql = sqlCommands[i]
      try {
        // Usa il client Supabase con service role per eseguire SQL
        // Nota: Questo richiede una funzione SQL custom o accesso diretto al database
        const admin = createClient(supabaseUrl, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        })
        
        // Prova a eseguire via rpc se esiste una funzione exec_sql
        const { data, error } = await admin.rpc('exec_sql', { query: sql })
        
        if (error) {
          // Se rpc non esiste, prova con fetch diretto
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': serviceKey,
              'Authorization': `Bearer ${serviceKey}`
            },
            body: JSON.stringify({ query: sql })
          })
          
          if (!response.ok) {
            results.push(`⚠️ Comando ${i + 1}: Non eseguibile via API (richiede SQL Editor)`)
            results.push(`SQL: ${sql.substring(0, 100)}...`)
          } else {
            results.push(`✅ Comando ${i + 1} eseguito`)
          }
        } else {
          results.push(`✅ Comando ${i + 1} eseguito`)
        }
      } catch (e) {
        results.push(`⚠️ Comando ${i + 1}: ${e.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Migrazione tentata. Alcuni comandi potrebbero richiedere SQL Editor.',
      results,
      note: 'Se alcuni comandi falliscono, esegui migration_semplificazione.sql manualmente in SQL Editor'
    })

  } catch (e) {
    console.error('[migrate-db] Error:', e)
    return NextResponse.json(
      { 
        error: e?.message || 'Errore migrazione',
        hint: 'Supabase non supporta DDL (CREATE/DROP TABLE) via REST API. Usa SQL Editor in Dashboard.'
      },
      { status: 500 }
    )
  }
}
