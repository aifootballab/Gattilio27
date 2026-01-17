import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ⚠️ ROUTE PER ESEGUIRE MIGRAZIONE DIRETTAMENTE
// Esegue lo script SQL migration_semplificazione.sql passo per passo

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
      results.push({ step: 1, status: 'success', message: 'Constraints rimossi' })
    } catch (e) {
      results.push({ step: 1, status: 'error', message: e.message })
    }

    // STEP 2: Cancella tabelle
    try {
      await admin.rpc('exec_sql', { 
        sql: `
          DROP TABLE IF EXISTS player_builds CASCADE;
          DROP TABLE IF EXISTS players_base CASCADE;
          DROP TABLE IF EXISTS user_rosa CASCADE;
          DROP TABLE IF EXISTS screenshot_processing_log CASCADE;
        `
      })
      results.push({ step: 2, status: 'success', message: 'Tabelle vecchie cancellate' })
    } catch (e) {
      results.push({ step: 2, status: 'error', message: e.message })
    }

    // STEP 3: Crea tabella players
    try {
      await admin.rpc('exec_sql', { 
        sql: `
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
      })
      results.push({ step: 3, status: 'success', message: 'Tabella players creata' })
    } catch (e) {
      results.push({ step: 3, status: 'error', message: e.message })
    }

    // STEP 4: Crea index
    try {
      await admin.rpc('exec_sql', { 
        sql: `
          CREATE INDEX IF NOT EXISTS idx_players_user_id ON players(user_id);
          CREATE INDEX IF NOT EXISTS idx_players_slot_index ON players(user_id, slot_index) WHERE slot_index IS NOT NULL;
          CREATE INDEX IF NOT EXISTS idx_players_created_at ON players(user_id, created_at DESC);
        `
      })
      results.push({ step: 4, status: 'success', message: 'Index creati' })
    } catch (e) {
      results.push({ step: 4, status: 'error', message: e.message })
    }

    // STEP 5: RLS
    try {
      await admin.rpc('exec_sql', { 
        sql: `
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
      })
      results.push({ step: 5, status: 'success', message: 'RLS policies create' })
    } catch (e) {
      results.push({ step: 5, status: 'error', message: e.message })
    }

    // STEP 6: Trigger
    try {
      await admin.rpc('exec_sql', { 
        sql: `
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
        `
      })
      results.push({ step: 6, status: 'success', message: 'Trigger creato' })
    } catch (e) {
      results.push({ step: 6, status: 'error', message: e.message })
    }

    const hasErrors = results.some(r => r.status === 'error')
    
    return NextResponse.json({
      success: !hasErrors,
      message: hasErrors ? 'Migrazione completata con errori' : 'Migrazione completata!',
      results
    })

  } catch (e) {
    console.error('[execute-migration-direct] Error:', e)
    return NextResponse.json(
      { 
        error: e?.message || 'Errore migrazione',
        hint: 'Supabase non supporta DDL via REST API. Esegui migration_semplificazione.sql in SQL Editor.'
      },
      { status: 500 }
    )
  }
}
