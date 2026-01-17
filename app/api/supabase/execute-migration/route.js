import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ⚠️ ROUTE PER ESEGUIRE MIGRAZIONE COMPLETA
// Esegue tutto lo script SQL in una volta

export async function POST(req) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Supabase env missing' }, { status: 500 })
    }

    // Verifica secret
    const { secret } = await req.json()
    if (secret !== 'MIGRATE_2025' && secret !== process.env.MIGRATION_SECRET) {
      return NextResponse.json({ 
        error: 'Invalid migration secret',
        hint: 'Use secret: MIGRATE_2025'
      }, { status: 401 })
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      db: { schema: 'public' }
    })

    const results = []

    // STEP 1: Crea la funzione SQL se non esiste
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION migrate_to_players_table()
      RETURNS JSONB
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        result JSONB := '[]'::JSONB;
        step_result TEXT;
      BEGIN
        -- STEP 1: Rimuovi constraints
        BEGIN
          ALTER TABLE IF EXISTS player_builds DROP CONSTRAINT IF EXISTS player_builds_player_base_id_fkey;
          ALTER TABLE IF EXISTS player_builds DROP CONSTRAINT IF EXISTS player_builds_user_id_fkey;
          ALTER TABLE IF EXISTS players_base DROP CONSTRAINT IF EXISTS players_base_playing_style_id_fkey;
          ALTER TABLE IF EXISTS screenshot_processing_log DROP CONSTRAINT IF EXISTS screenshot_processing_log_user_id_fkey;
          ALTER TABLE IF EXISTS user_rosa DROP CONSTRAINT IF EXISTS user_rosa_user_id_fkey;
          step_result := 'Constraints rimossi';
        EXCEPTION WHEN OTHERS THEN
          step_result := 'Errore constraints: ' || SQLERRM;
        END;
        result := result || jsonb_build_object('step', 1, 'result', step_result);

        -- STEP 2: Cancella tabelle vecchie
        BEGIN
          DROP TABLE IF EXISTS player_builds CASCADE;
          DROP TABLE IF EXISTS players_base CASCADE;
          DROP TABLE IF EXISTS user_rosa CASCADE;
          DROP TABLE IF EXISTS screenshot_processing_log CASCADE;
          step_result := 'Tabelle vecchie cancellate';
        EXCEPTION WHEN OTHERS THEN
          step_result := 'Errore cancellazione: ' || SQLERRM;
        END;
        result := result || jsonb_build_object('step', 2, 'result', step_result);

        -- STEP 3: Crea tabella players
        BEGIN
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
          step_result := 'Tabella players creata';
        EXCEPTION WHEN OTHERS THEN
          step_result := 'Errore creazione tabella: ' || SQLERRM;
        END;
        result := result || jsonb_build_object('step', 3, 'result', step_result);

        -- STEP 4: Crea index
        BEGIN
          CREATE INDEX IF NOT EXISTS idx_players_user_id ON players(user_id);
          CREATE INDEX IF NOT EXISTS idx_players_slot_index ON players(user_id, slot_index) WHERE slot_index IS NOT NULL;
          CREATE INDEX IF NOT EXISTS idx_players_created_at ON players(user_id, created_at DESC);
          step_result := 'Index creati';
        EXCEPTION WHEN OTHERS THEN
          step_result := 'Errore index: ' || SQLERRM;
        END;
        result := result || jsonb_build_object('step', 4, 'result', step_result);

        -- STEP 5: RLS
        BEGIN
          ALTER TABLE players ENABLE ROW LEVEL SECURITY;
          
          DROP POLICY IF EXISTS "Users can view own players" ON players;
          CREATE POLICY "Users can view own players" ON players FOR SELECT USING (auth.uid() = user_id);
          
          DROP POLICY IF EXISTS "Users can insert own players" ON players;
          CREATE POLICY "Users can insert own players" ON players FOR INSERT WITH CHECK (auth.uid() = user_id);
          
          DROP POLICY IF EXISTS "Users can update own players" ON players;
          CREATE POLICY "Users can update own players" ON players FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
          
          DROP POLICY IF EXISTS "Users can delete own players" ON players;
          CREATE POLICY "Users can delete own players" ON players FOR DELETE USING (auth.uid() = user_id);
          
          step_result := 'RLS policies create';
        EXCEPTION WHEN OTHERS THEN
          step_result := 'Errore RLS: ' || SQLERRM;
        END;
        result := result || jsonb_build_object('step', 5, 'result', step_result);

        -- STEP 6: Trigger
        BEGIN
          CREATE OR REPLACE FUNCTION update_updated_at_column()
          RETURNS TRIGGER AS $$
          BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
          END;
          $$ language 'plpgsql';

          DROP TRIGGER IF EXISTS update_players_updated_at ON players;
          CREATE TRIGGER update_players_updated_at
          BEFORE UPDATE ON players
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
          
          step_result := 'Trigger creato';
        EXCEPTION WHEN OTHERS THEN
          step_result := 'Errore trigger: ' || SQLERRM;
        END;
        result := result || jsonb_build_object('step', 6, 'result', step_result);

        RETURN jsonb_build_object('success', true, 'steps', result);
      END;
      $$;
    `

    // Prova a creare la funzione usando una query diretta
    // Nota: Supabase non supporta DDL via REST API, ma possiamo provare
    try {
      // Metodo 1: Prova con rpc se esiste una funzione exec_sql
      const { error: funcError } = await admin.rpc('exec_sql', { sql: createFunctionSQL })
      if (funcError) {
        results.push('⚠️ Impossibile creare funzione via API (richiede SQL Editor)')
      } else {
        results.push('✅ Funzione creata')
      }
    } catch (e) {
      results.push('⚠️ exec_sql non disponibile')
    }

    // STEP 2: Chiama la funzione se esiste
    try {
      const { data, error } = await admin.rpc('migrate_to_players_table')
      
      if (error) {
        return NextResponse.json({
          error: 'Migration function not found',
          details: error.message,
          hint: 'Esegui create_migration_function.sql in SQL Editor prima, poi richiama questa route'
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Migrazione completata!',
        results: data
      })
    } catch (e) {
      return NextResponse.json({
        error: 'Cannot execute migration',
        details: e.message,
        hint: 'Supabase non supporta DDL via REST API. Esegui migration_semplificazione.sql in SQL Editor.'
      }, { status: 500 })
    }

  } catch (e) {
    console.error('[execute-migration] Error:', e)
    return NextResponse.json(
      { 
        error: e?.message || 'Errore migrazione',
        hint: 'Esegui migration_semplificazione.sql manualmente in Supabase SQL Editor'
      },
      { status: 500 }
    )
  }
}
