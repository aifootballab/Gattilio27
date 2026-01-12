-- =====================================================
-- MIGRAZIONE 003: Sistema Suggerimenti Completo
-- =====================================================
-- Data: 2025-01-12
-- Descrizione: Aggiunge tutte le tabelle necessarie per il sistema
--              di suggerimenti basato su regole eFootball ufficiali
-- =====================================================

-- =====================================================
-- 1. TEAM PLAYING STYLES (Stili di Gioco Squadra)
-- =====================================================
-- Definisce gli stili di gioco disponibili per la squadra
-- (es: Possesso palla, Contropiede veloce, etc.)

CREATE TABLE IF NOT EXISTS team_playing_styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,  -- "Possesso palla", "Contropiede veloce", etc.
  category TEXT NOT NULL,     -- "offensive", "defensive", "build-up", "special"
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_team_playing_styles_category ON team_playing_styles(category);
CREATE INDEX IF NOT EXISTS idx_team_playing_styles_name ON team_playing_styles(name);

-- Inserimento stili base
INSERT INTO team_playing_styles (name, category, description) VALUES
  -- Offensivi
  ('Possesso palla', 'offensive', 'Gioco costruito con passaggi corti e pazienti per mantenere il controllo'),
  ('Contropiede rapido', 'offensive', 'Ripartenze veloci sfruttando spazi lasciati dagli avversari'),
  ('Attacco diretto', 'offensive', 'Passaggi verticali rapidi per superare le linee difensive'),
  ('Cross e finalizzazione', 'offensive', 'Strategia basata su cross dalle fasce per attaccanti forti di testa'),
  ('Gioco sulle fasce', 'offensive', 'Concentrato sul coinvolgimento degli esterni per allargare la difesa avversaria'),
  ('Attacco centrale', 'offensive', 'Costruzione di gioco attraverso combinazioni corte e scambi centrali'),
  -- Difensivi
  ('Pressing alto', 'defensive', 'Difesa aggressiva per recuperare palla in zona avanzata'),
  ('Difesa bassa', 'defensive', 'Linea difensiva arretrata per ridurre gli spazi agli avversari'),
  ('Pressing selettivo', 'defensive', 'Intercettazione delle linee di passaggio anziché pressing costante'),
  ('Contenimento difensivo', 'defensive', 'Lasciare il possesso agli avversari e ripartire con contropiedi'),
  -- Costruzione
  ('Costruzione posizionale', 'build-up', 'Manovra ragionata con passaggi corti'),
  ('Lancio lungo', 'build-up', 'Passaggi lunghi per scavalcare il pressing avversario'),
  ('Costruzione a triangoli', 'build-up', 'Passaggi tra centrocampisti per superare le linee di pressing'),
  -- Speciali
  ('Gegenpressing', 'special', 'Recupero palla immediato dopo averla persa'),
  ('Tiki-Taka', 'special', 'Passaggi corti continui per disorganizzare la difesa avversaria'),
  ('Catenaccio', 'special', 'Difesa stretta e ripartenze rapide'),
  ('Pressing costante', 'special', 'Squadra sempre aggressiva senza abbassare il ritmo'),
  ('Attacco con esterni alti', 'special', 'Gli esterni rimangono larghi per sfruttare gli spazi'),
  ('Tagli interni', 'special', 'Gli esterni convergono verso il centro per creare occasioni')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 2. PLAYING STYLES (Stili di Gioco Giocatori)
-- =====================================================
-- Definisce gli stili di gioco dei giocatori (comportamento senza palla)
-- Ogni stile ha posizioni compatibili specifiche

CREATE TABLE IF NOT EXISTS playing_styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,  -- "Opportunista", "Senza palla", "Incontrista", etc.
  compatible_positions TEXT[] NOT NULL,  -- ["P"], ["P", "SP", "TRQ"], etc.
  description TEXT,
  category TEXT,  -- "attacking", "midfield", "defensive", "fullback", "goalkeeper"
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_playing_styles_category ON playing_styles(category);
CREATE INDEX IF NOT EXISTS idx_playing_styles_name ON playing_styles(name);
CREATE INDEX IF NOT EXISTS idx_playing_styles_positions ON playing_styles USING GIN(compatible_positions);

-- Inserimento stili base
INSERT INTO playing_styles (name, compatible_positions, description, category) VALUES
  -- Attaccanti
  ('Opportunista', ARRAY['P'], 'Rapace d''area che gioca a contatto con l''ultimo difensore', 'attacking'),
  ('Senza palla', ARRAY['P', 'SP', 'TRQ'], 'Si muove per creare spazi per i compagni', 'attacking'),
  ('Rapace d''area', ARRAY['P'], 'Sempre in agguato per finalizzare in area', 'attacking'),
  ('Fulcro di gioco', ARRAY['P'], 'Usa il fisico per proteggere la palla e fungere da riferimento offensivo', 'attacking'),
  -- Centrocampisti e Ali
  ('Specialista di cross', ARRAY['EDA', 'ESA', 'CLD', 'CLS'], 'Gioca sulle fasce e cerca il cross verso il centro', 'midfield'),
  ('Classico n°10', ARRAY['SP', 'TRQ'], 'Playmaker che evita corse inutili per risparmiare energia', 'midfield'),
  ('Regista creativo', ARRAY['SP', 'EDA', 'ESA', 'TRQ', 'CLD', 'CLS'], 'Sfrutta spazi tra le linee per creare occasioni da gol', 'midfield'),
  ('Ala prolifica', ARRAY['EDA', 'ESA'], 'Gioca sulle fasce e taglia al centro per ricevere passaggi filtranti', 'midfield'),
  ('Taglio al centro', ARRAY['EDA', 'ESA'], 'Si muove dalle fasce verso l''interno per ricevere passaggi', 'midfield'),
  ('Giocatore chiave', ARRAY['SP', 'TRQ', 'CLD', 'CLS', 'CC'], 'Fiuto del gol, punta direttamente la porta avversaria', 'midfield'),
  -- Centrocampisti Difensivi
  ('Tra le linee', ARRAY['CC', 'MED'], 'Centrocampista che gioca tra difesa e attacco, pronto a inserirsi', 'midfield'),
  ('Onnipresente', ARRAY['CLD', 'CLS', 'CC', 'MED'], 'Giocatore che copre ogni zona del campo', 'midfield'),
  ('Collante', ARRAY['MED'], 'Centrocampista arretrato che opera davanti alla difesa', 'midfield'),
  ('Incontrista', ARRAY['CC', 'MED', 'DC'], 'Centrocampista che respinge gli attacchi con pressing aggressivo', 'midfield'),
  -- Difensori
  ('Sviluppo', ARRAY['DC'], 'Difensore che imposta da dietro, cercando lanci lunghi in avanti', 'defensive'),
  ('Frontale extra', ARRAY['DC'], 'Difensore che partecipa all''attacco e si sovrappone in fase offensiva', 'defensive'),
  -- Terzini
  ('Terzino offensivo', ARRAY['TD', 'TS'], 'Si unisce all''attacco in profondità', 'fullback'),
  ('Terzino difensivo', ARRAY['TD', 'TS'], 'Rimane arretrato per difendere', 'fullback'),
  ('Terzino mattatore', ARRAY['TD', 'TS'], 'Si inserisce nelle azioni offensive centrali', 'fullback'),
  -- Portieri
  ('Portiere offensivo', ARRAY['PT'], 'Interpreta il ruolo di libero', 'goalkeeper'),
  ('Portiere difensivo', ARRAY['PT'], 'Resta sulla linea di porta', 'goalkeeper')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 3. MANAGERS (Allenatori)
-- =====================================================
-- Catalogo allenatori con playing style e competenze

CREATE TABLE IF NOT EXISTS managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  efootballhub_id TEXT UNIQUE,  -- ID da efootballhub.net
  overall_rating INTEGER,  -- Overall rating allenatore
  preferred_formation TEXT,  -- Formazione preferita (es: "4-3-3")
  tactics JSONB DEFAULT '{}',  -- Tactics dettagliate
  skills TEXT[] DEFAULT '{}',  -- Skills allenatore
  metadata JSONB DEFAULT '{}',  -- Altri dati
  source TEXT DEFAULT 'efootballhub',  -- 'efootballhub', 'manual', etc.
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_managers_name ON managers(name);
CREATE INDEX IF NOT EXISTS idx_managers_overall ON managers(overall_rating);
CREATE INDEX IF NOT EXISTS idx_managers_formation ON managers(preferred_formation);

-- =====================================================
-- 4. MANAGER STYLE COMPETENCY (Competenza Allenatore per Stile)
-- =====================================================
-- Definisce la competenza di ogni allenatore per ogni stile di gioco
-- REGOLA: "L'attitudine dell'allenatore influisce direttamente sulla competenza dello stile di gioco dei giocatori"

CREATE TABLE IF NOT EXISTS manager_style_competency (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL REFERENCES managers(id) ON DELETE CASCADE,
  team_playing_style_id UUID NOT NULL REFERENCES team_playing_styles(id) ON DELETE CASCADE,
  competency_level INTEGER NOT NULL DEFAULT 0,  -- 0-100 (competenza)
  is_primary BOOLEAN DEFAULT false,  -- Se è lo stile principale dell'allenatore
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(manager_id, team_playing_style_id)
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_manager_style_competency_manager ON manager_style_competency(manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_style_competency_style ON manager_style_competency(team_playing_style_id);
CREATE INDEX IF NOT EXISTS idx_manager_style_competency_level ON manager_style_competency(competency_level);
CREATE INDEX IF NOT EXISTS idx_manager_style_competency_primary ON manager_style_competency(is_primary) WHERE is_primary = true;

-- =====================================================
-- 5. PLAYER LINKS (Collegamenti tra Giocatori)
-- =====================================================
-- Definisce collegamenti e sinergie tra giocatori
-- (nazionalità, club, era, etc.)

CREATE TABLE IF NOT EXISTS player_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_1_id UUID NOT NULL REFERENCES players_base(id) ON DELETE CASCADE,
  player_2_id UUID NOT NULL REFERENCES players_base(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL,  -- "nationality", "club", "era", "position", "playing_style"
  link_value TEXT,  -- Valore del collegamento (es: "Brazil", "Real Madrid", "2024")
  synergy_bonus NUMERIC DEFAULT 0,  -- Bonus overall da sinergia (es: +2)
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CHECK (player_1_id != player_2_id),  -- Un giocatore non può essere collegato a se stesso
  UNIQUE(player_1_id, player_2_id, link_type)  -- Un collegamento unico per tipo
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_player_links_player1 ON player_links(player_1_id);
CREATE INDEX IF NOT EXISTS idx_player_links_player2 ON player_links(player_2_id);
CREATE INDEX IF NOT EXISTS idx_player_links_type ON player_links(link_type);
CREATE INDEX IF NOT EXISTS idx_player_links_value ON player_links(link_value);

-- =====================================================
-- 6. POSITION COMPETENCY (Competenza Posizione Giocatori)
-- =====================================================
-- Definisce la competenza di ogni giocatore per ogni posizione
-- Livelli: Basso (0), Intermedio (1), Alto (2)

CREATE TABLE IF NOT EXISTS position_competency (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_base_id UUID NOT NULL REFERENCES players_base(id) ON DELETE CASCADE,
  position TEXT NOT NULL,  -- "CF", "LWF", "RWF", etc.
  competency_level INTEGER NOT NULL DEFAULT 0,  -- 0=Basso, 1=Intermedio, 2=Alto
  is_primary BOOLEAN DEFAULT false,  -- Se è la posizione principale
  is_learned BOOLEAN DEFAULT false,  -- Se è stata appresa con "Programmi aggiunta posizione"
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(player_base_id, position),
  CHECK (competency_level >= 0 AND competency_level <= 2)
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_position_competency_player ON position_competency(player_base_id);
CREATE INDEX IF NOT EXISTS idx_position_competency_position ON position_competency(position);
CREATE INDEX IF NOT EXISTS idx_position_competency_level ON position_competency(competency_level);
CREATE INDEX IF NOT EXISTS idx_position_competency_primary ON position_competency(is_primary) WHERE is_primary = true;

-- =====================================================
-- 7. AGGIORNAMENTI TABELLE ESISTENTI
-- =====================================================

-- Aggiungi playing_style a players_base
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'players_base' AND column_name = 'playing_style_id'
  ) THEN
    ALTER TABLE players_base 
    ADD COLUMN playing_style_id UUID REFERENCES playing_styles(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_players_base_playing_style ON players_base(playing_style_id);
  END IF;
END $$;

-- Aggiungi manager_id a user_rosa
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_rosa' AND column_name = 'manager_id'
  ) THEN
    ALTER TABLE user_rosa 
    ADD COLUMN manager_id UUID REFERENCES managers(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_user_rosa_manager ON user_rosa(manager_id);
  END IF;
END $$;

-- Aggiungi team_playing_style_id a user_rosa
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_rosa' AND column_name = 'team_playing_style_id'
  ) THEN
    ALTER TABLE user_rosa 
    ADD COLUMN team_playing_style_id UUID REFERENCES team_playing_styles(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_user_rosa_team_style ON user_rosa(team_playing_style_id);
  END IF;
END $$;

-- Aggiungi campi calcolo forza complessiva a user_rosa
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_rosa' AND column_name = 'base_strength'
  ) THEN
    ALTER TABLE user_rosa 
    ADD COLUMN base_strength INTEGER DEFAULT 0,  -- Forza base (somma stats)
    ADD COLUMN overall_strength INTEGER DEFAULT 0,  -- Forza complessiva (con alchimia, competenza, stile)
    ADD COLUMN synergy_bonus NUMERIC DEFAULT 0,  -- Bonus sinergie
    ADD COLUMN position_competency_bonus NUMERIC DEFAULT 0,  -- Bonus competenza posizione
    ADD COLUMN playing_style_bonus NUMERIC DEFAULT 0,  -- Bonus compatibilità playing style
    ADD COLUMN manager_bonus NUMERIC DEFAULT 0;  -- Bonus manager
    
    CREATE INDEX IF NOT EXISTS idx_user_rosa_base_strength ON user_rosa(base_strength);
    CREATE INDEX IF NOT EXISTS idx_user_rosa_overall_strength ON user_rosa(overall_strength);
  END IF;
END $$;

-- =====================================================
-- 8. FUNZIONI HELPER
-- =====================================================

-- Funzione per calcolare competenza posizione di default
CREATE OR REPLACE FUNCTION get_default_position_competency(
  p_player_base_id UUID,
  p_position TEXT
) RETURNS INTEGER AS $$
DECLARE
  v_primary_position TEXT;
BEGIN
  -- Ottieni posizione principale del giocatore
  SELECT position INTO v_primary_position
  FROM players_base
  WHERE id = p_player_base_id;
  
  -- Se è la posizione principale, competenza alta (2)
  IF v_primary_position = p_position THEN
    RETURN 2;
  END IF;
  
  -- Altrimenti, competenza bassa (0)
  RETURN 0;
END;
$$ LANGUAGE plpgsql;

-- Funzione per verificare compatibilità playing style
CREATE OR REPLACE FUNCTION is_playing_style_compatible(
  p_playing_style_id UUID,
  p_position TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_compatible_positions TEXT[];
BEGIN
  SELECT compatible_positions INTO v_compatible_positions
  FROM playing_styles
  WHERE id = p_playing_style_id;
  
  -- Verifica se la posizione è nell'array compatibile
  RETURN p_position = ANY(v_compatible_positions);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. RLS POLICIES
-- =====================================================

-- Abilita RLS su tutte le nuove tabelle
ALTER TABLE team_playing_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE playing_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_style_competency ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE position_competency ENABLE ROW LEVEL SECURITY;

-- Policies: lettura pubblica per cataloghi
CREATE POLICY "Public read access for team_playing_styles" ON team_playing_styles
  FOR SELECT USING (true);

CREATE POLICY "Public read access for playing_styles" ON playing_styles
  FOR SELECT USING (true);

CREATE POLICY "Public read access for managers" ON managers
  FOR SELECT USING (true);

CREATE POLICY "Public read access for manager_style_competency" ON manager_style_competency
  FOR SELECT USING (true);

CREATE POLICY "Public read access for player_links" ON player_links
  FOR SELECT USING (true);

CREATE POLICY "Public read access for position_competency" ON position_competency
  FOR SELECT USING (true);

-- =====================================================
-- 10. COMMENTS
-- =====================================================

COMMENT ON TABLE team_playing_styles IS 'Stili di gioco di squadra (Possesso palla, Contropiede veloce, etc.)';
COMMENT ON TABLE playing_styles IS 'Stili di gioco dei giocatori (Opportunista, Incontrista, etc.) con posizioni compatibili';
COMMENT ON TABLE managers IS 'Catalogo allenatori con playing style e competenze';
COMMENT ON TABLE manager_style_competency IS 'Competenza di ogni allenatore per ogni stile di gioco (0-100)';
COMMENT ON TABLE player_links IS 'Collegamenti e sinergie tra giocatori (nazionalità, club, era)';
COMMENT ON TABLE position_competency IS 'Competenza di ogni giocatore per ogni posizione (Basso=0, Intermedio=1, Alto=2)';

COMMENT ON COLUMN manager_style_competency.competency_level IS 'Competenza allenatore per stile (0-100). Influisce direttamente sulla competenza dello stile di gioco dei giocatori.';
COMMENT ON COLUMN position_competency.competency_level IS 'Livello competenza: 0=Basso (nessun colore), 1=Intermedio (verde sfumato), 2=Alto (verde brillante)';
COMMENT ON COLUMN player_links.synergy_bonus IS 'Bonus overall da sinergia tra giocatori (es: +2 per stessa nazionalità)';
COMMENT ON COLUMN user_rosa.base_strength IS 'Forza base: somma delle abilità individuali dei giocatori';
COMMENT ON COLUMN user_rosa.overall_strength IS 'Forza complessiva: tiene conto di alchimia, competenza posizione, stile di gioco e manager';
