# 👤 Architettura Profilo Utente e Sistema Crediti

**Data**: Gennaio 2025  
**Versione**: 1.0  
**Focus**: Profilazione completa utente + Sistema crediti (Hero Points)

---

## 🎯 OBIETTIVO

### Profilo Utente Completo
**Domande per profilare meglio l'utente** e rendere l'IA più personale:
- Dati anagrafici e preferenze
- Esperienza di gioco
- Problemi riscontrati
- Preferenze comunicazione IA

**Barra Profilazione**: 0-100% basata su risposte complete

### Sistema Crediti (Hero Points)
- **1000 Hero Points = 10€**
- **Pay-per-use**: Ogni operazione costa crediti
- **Countdown numerico** (fase 1) → **Barra descrescente** (fase 2)
- **Monitoraggio costi**: Tutto quello che costa scende dai crediti

---

## 📊 DATABASE SCHEMA

### 1. Tabella `user_profiles`

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Dati Anagrafici (Opzionali)
  first_name TEXT, -- Nome
  last_name TEXT, -- Cognome
  
  -- Dati Gioco (Opzionali)
  current_division TEXT, -- Divisione attuale (es. "Division 1", "Division 3")
  favorite_team TEXT, -- Squadra del cuore
  team_name TEXT, -- Nome squadra nel gioco
  
  -- Preferenze IA (Opzionali)
  ai_name TEXT, -- Nome che vuoi dare all'IA (es. "Coach Mario", "Alex")
  how_to_remember TEXT, -- Come vuoi che ti ricordi l'IA (es. "Sono un giocatore competitivo", "Gioco per divertimento")
  
  -- Esperienza Gioco (Opzionali)
  hours_per_week INTEGER, -- Quante ore giochi a settimana
  common_problems TEXT[], -- Array di problemi riscontrati (es. ["passaggi", "difesa", "centrocampo"])
  
  -- Profilazione Completa
  profile_completion_score DECIMAL(5,2) DEFAULT 0.00 CHECK (profile_completion_score >= 0 AND profile_completion_score <= 100),
  profile_completion_level TEXT DEFAULT 'beginner' CHECK (profile_completion_level IN ('beginner', 'intermediate', 'complete')),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_user_profile UNIQUE (user_id)
);

-- Trigger per calcolo automatico profile_completion_score
CREATE OR REPLACE FUNCTION calculate_profile_completion_score()
RETURNS TRIGGER AS $$
DECLARE
  score DECIMAL(5,2) := 0;
  level TEXT;
  total_fields INTEGER := 8; -- Totale campi opzionali
  filled_fields INTEGER := 0;
BEGIN
  -- Conta campi compilati
  IF NEW.first_name IS NOT NULL AND NEW.first_name != '' THEN filled_fields := filled_fields + 1; END IF;
  IF NEW.last_name IS NOT NULL AND NEW.last_name != '' THEN filled_fields := filled_fields + 1; END IF;
  IF NEW.current_division IS NOT NULL AND NEW.current_division != '' THEN filled_fields := filled_fields + 1; END IF;
  IF NEW.favorite_team IS NOT NULL AND NEW.favorite_team != '' THEN filled_fields := filled_fields + 1; END IF;
  IF NEW.team_name IS NOT NULL AND NEW.team_name != '' THEN filled_fields := filled_fields + 1; END IF;
  IF NEW.ai_name IS NOT NULL AND NEW.ai_name != '' THEN filled_fields := filled_fields + 1; END IF;
  IF NEW.how_to_remember IS NOT NULL AND NEW.how_to_remember != '' THEN filled_fields := filled_fields + 1; END IF;
  IF NEW.hours_per_week IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  -- common_problems può essere array vuoto, quindi non conta se vuoto
  
  -- Calcola score (ogni campo = 12.5%, max 100%)
  score := (filled_fields::DECIMAL / total_fields::DECIMAL) * 100;
  
  -- Calcola livello
  IF score >= 87.5 THEN
    level := 'complete';
  ELSIF score >= 50 THEN
    level := 'intermediate';
  ELSE
    level := 'beginner';
  END IF;
  
  NEW.profile_completion_score := score;
  NEW.profile_completion_level := level;
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_profile_completion
BEFORE INSERT OR UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION calculate_profile_completion_score();

-- Indici
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_completion_score ON user_profiles(profile_completion_score DESC);

-- RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
ON user_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON user_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON user_profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### 2. Tabella `user_hero_points` (Sistema Crediti)

```sql
CREATE TABLE user_hero_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Balance
  hero_points_balance INTEGER DEFAULT 0 CHECK (hero_points_balance >= 0),
  euros_equivalent DECIMAL(10,2) GENERATED ALWAYS AS (hero_points_balance::DECIMAL / 100) STORED, -- 1000 points = 10€
  
  -- Starter Pack (Crediti Iniziali Gratuiti)
  starter_pack_claimed BOOLEAN DEFAULT false, -- Se utente ha già ricevuto starter pack
  starter_pack_amount INTEGER DEFAULT 1000, -- Quantità crediti starter pack (1000 HP = 10€)
  
  -- Metadata (Pagamento - FUTURO)
  last_purchase_at TIMESTAMPTZ,
  total_purchased INTEGER DEFAULT 0, -- Totale hero points acquistati (storico) - FUTURO
  total_spent INTEGER DEFAULT 0, -- Totale hero points spesi (storico)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_user_hero_points UNIQUE (user_id)
);

-- Trigger: Assegna Starter Pack automaticamente alla registrazione
CREATE OR REPLACE FUNCTION assign_starter_pack()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando viene creato un nuovo utente, assegna starter pack
  INSERT INTO user_hero_points (user_id, hero_points_balance, starter_pack_claimed, starter_pack_amount)
  VALUES (NEW.id, 1000, true, 1000)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger su auth.users (se possibile) o manuale alla prima login
-- NOTA: Supabase non permette trigger su auth.users direttamente
-- Quindi starter pack verrà assegnato alla prima chiamata a /api/hero-points/balance

-- Indici
CREATE INDEX idx_user_hero_points_user_id ON user_hero_points(user_id);
CREATE INDEX idx_user_hero_points_balance ON user_hero_points(hero_points_balance);

-- RLS
ALTER TABLE user_hero_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own hero points"
ON user_hero_points FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own hero points"
ON user_hero_points FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### 3. Tabella `hero_points_transactions`

```sql
CREATE TABLE hero_points_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Tipo Transazione
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'spent', 'refund')),
  
  -- Dettagli
  hero_points_amount INTEGER NOT NULL, -- Positivo per purchase/refund, negativo per spent
  euros_amount DECIMAL(10,2), -- Per purchase: quanto pagato
  
  -- Riferimento Operazione
  operation_type TEXT, -- "extract_player", "analyze_match", "realtime_coach", etc.
  operation_id UUID, -- ID dell'operazione (match_id, session_id, etc.)
  
  -- Balance Dopo Transazione
  balance_after INTEGER NOT NULL,
  
  -- Metadata
  description TEXT, -- Descrizione transazione
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici
CREATE INDEX idx_hero_points_transactions_user_id ON hero_points_transactions(user_id);
CREATE INDEX idx_hero_points_transactions_created_at ON hero_points_transactions(created_at DESC);
CREATE INDEX idx_hero_points_transactions_type ON hero_points_transactions(transaction_type);

-- RLS
ALTER TABLE hero_points_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
ON hero_points_transactions FOR SELECT
USING (auth.uid() = user_id);
```

---

## 💰 SISTEMA CREDITI - COSTI OPERAZIONI (PROPORZIONATI AI COSTI REALI)

### ⚠️ IMPORTANTE: Quando si Consumano Crediti?

**✅ NON Consumano Crediti** (Query Database - Gratis):
- **Visualizzazione rosa**: Caricare lista giocatori da DB (SELECT)
- **Visualizzazione giocatore**: Caricare dettagli giocatore da DB (SELECT)
- **Refresh pagina**: Ricaricare dati da DB
- **Sostituzione giocatore**: Assegnare giocatore esistente da riserve a slot (solo UPDATE DB)
- **Spostamento giocatore**: Spostare giocatore da slot a riserve (solo UPDATE DB)
- **Visualizzazione formazione**: Caricare formazione salvata da DB

**💰 CONSUMANO Crediti** (Chiamate API OpenAI - A Pagamento):
- **Estrazione da foto**: Caricare foto e chiamare `/api/extract-player` → **2 HP**
- **Estrazione formazione**: Caricare foto e chiamare `/api/extract-formation` → **2 HP**
- **Estrazione coach**: Caricare foto e chiamare `/api/extract-coach` → **2 HP**
- **Aggiornamento giocatore**: Caricare nuova foto per aggiornare giocatore esistente → **2 HP**

### 📊 Analisi Costi Reali API

**API Utilizzate**:
- **GPT-4o Vision**: Usato per `extract-player`, `extract-formation`, `extract-coach`
  - Costo: ~$0.01-0.03 per immagine (dipende da risoluzione)
  - Conversione: $0.01 = ~0.9€ = ~90 Hero Points (con margine)
  - **Ma**: Per essere competitivi, arrotondiamo a costi più bassi

**Calcolo Proporzionato**:
- 1000 Hero Points = 10€ = ~$11
- 1 Hero Point = 0.01€ = ~$0.011
- Margine operativo: ~50-70% (per sostenibilità)

### Costi per Operazione (Hero Points) - PROPORZIONATI

**Estrazione Dati** (GPT-4o Vision):
- `extract-player`: **2 hero points** (1 foto, costo reale ~$0.01-0.02)
- `extract-formation`: **2 hero points** (1 foto, costo reale ~$0.01-0.02)
- `extract-coach`: **2 hero points** (1 foto, costo reale ~$0.01-0.02)
- `extract-match-data`: **12 hero points** (6 foto, costo reale ~$0.06-0.12)
  - Se foto parziali: proporzionale (es. 3 foto = 6 hero points)

**Analisi AI** (GPT-5.2 Thinking/Pro - quando implementato):
- `analyze-match`: **5 hero points** (analisi complessa, costo reale ~$0.03-0.05)
- `analyze-roster`: **8 hero points** (analisi rosa completa, costo reale ~$0.05-0.08)
- `analyze-opponent`: **4 hero points** (contromisure, costo reale ~$0.02-0.04)

**Real-Time Coaching** (GPT-4o Realtime - Futuro):
- `realtime-coach`: **2 hero points/minuto** (streaming audio, costo reale ~$0.01-0.02/minuto)
  - Input: ~500 token/minuto × $4/1M = $0.002/minuto
  - Output: ~300 token/minuto × $16/1M = $0.0048/minuto
  - Totale: ~$0.007/minuto → arrotondato a 2 HP/minuto (con margine)

**Conversione**:
- 1000 hero points = 10€
- 1 hero point = 0.01€
- 100 hero points = 1€

### Esempio Costi Realistici
- **Analisi match completa**: 
  - Estrazione 6 foto: 12 hero points
  - Analisi AI: 5 hero points
  - **Totale: 17 hero points = 0.17€**
  
- **Real-time 10 minuti**: 
  - 10 minuti × 2 HP/minuto = **20 hero points = 0.20€**

- **Profilazione completa giocatore** (3 foto):
  - 3 × 2 hero points = **6 hero points = 0.06€**

### 📈 Test Durata 1000 Hero Points

**Scenario Test - Profilazione Iniziale Rosa**:
- 1 utente fa profilazione completa:
  - 11 giocatori titolari (11 × 2 = 22 HP) - **UNA VOLTA SOLA**
  - 10 giocatori riserve (10 × 2 = 20 HP) - **UNA VOLTA SOLA**
  - 1 formazione (2 HP) - **UNA VOLTA SOLA**
  - 1 coach (2 HP) - **UNA VOLTA SOLA**
  - **Totale profilazione iniziale: 46 HP**

**Dopo Profilazione Iniziale**:
- **Visualizzazione rosa**: 0 HP (query DB)
- **Visualizzazione giocatore**: 0 HP (query DB)
- **Sostituzione giocatore**: 0 HP (solo UPDATE DB)
- **Aggiornamento giocatore con nuova foto**: 2 HP (solo se carica nuova foto)

**Scenario Test - Uso Normale**:
- 1 utente dopo profilazione iniziale:
  - 2 sostituzioni giocatore (0 HP - solo DB)
  - 1 aggiornamento giocatore con nuova foto (2 HP)
  - 2 analisi match complete (2 × 17 = 34 HP)
  - **Totale uso normale: 36 HP**

**Con 1000 HP**:
- Profilazione iniziale: 46 HP
- Uso normale: 36 HP per settimana
- **1000 HP durano**: ~26 settimane (6 mesi) per utente attivo
- Oppure: **~27 sessioni di analisi match** (senza altre operazioni)

**Durata stimata**: 
- **Profilazione iniziale**: 46 HP (una volta)
- **Uso normale**: 36-50 HP/settimana (analisi match + occasionali aggiornamenti)
- **1000 HP durano**: **3-6 mesi** per utente attivo

---

## 🎨 UI SEZIONE IMPOSTAZIONI PROFILO

### Pagina: `/app/impostazioni-profilo/page.jsx`

**Mobile-First Design**:
- Scroll verticale
- Skip opzionale per ogni sezione
- Barra profilazione sempre visibile
- Niente obbligatorio

```
┌─────────────────────────────────────┐
│  [← Indietro]  Impostazioni Profilo│
│  ────────────────────────────────  │
│                                     │
│  📊 PROFILAZIONE                    │
│  ┌─────────────────────────────┐  │
│  │ ████████░░░░░░░░░░ 75%        │  │
│  └─────────────────────────────┘  │
│  Intermedio - Completa per 100%    │
│                                     │
│  💡 Più rispondi, più l'IA ti       │
│     conosce e ti aiuta meglio!     │
│                                     │
│  ────────────────────────────────  │
│                                     │
│  📝 DATI PERSONALI                  │
│  ────────────────────────────────  │
│  Nome [________________]            │
│  Cognome [________________]         │
│  [Salva] [Salta]                    │
│                                     │
│  🎮 DATI GIOCO                       │
│  ────────────────────────────────  │
│  Divisione attuale                   │
│  [Dropdown: Division 1-10]          │
│                                     │
│  Squadra del cuore                  │
│  [________________]                  │
│                                     │
│  Nome squadra nel gioco             │
│  [________________]                  │
│  [Salva] [Salta]                    │
│                                     │
│  🤖 PREFERENZE IA                    │
│  ────────────────────────────────  │
│  Nome IA (opzionale)                │
│  [________________]                 │
│  Es: "Coach Mario", "Alex"         │
│                                     │
│  Come vuoi che ti ricordi?          │
│  [Textarea multilinea]              │
│  Es: "Sono un giocatore             │
│      competitivo..."                │
│  [Salva] [Salta]                    │
│                                     │
│  ⏰ ESPERIENZA GIOCO                 │
│  ────────────────────────────────  │
│  Quante ore giochi a settimana?     │
│  [Slider: 0-50 ore]                 │
│                                     │
│  Quali problemi riscontri?          │
│  [Checkbox multipli]                │
│  ☐ Passaggi                         │
│  ☐ Difesa                           │
│  ☐ Centrocampo                      │
│  ☐ Attacco                          │
│  ☐ Formazione                        │
│  ☐ Istruzioni tattiche              │
│  [Salva] [Salta]                    │
│                                     │
│  [Completa Profilo]                 │
└─────────────────────────────────────┘
```

---

## 🔄 INTEGRAZIONE CON ANALISI IA

### Come i Dati Profilo Influenzano l'IA

**Prompt AI Modificato**:
```javascript
// Aggiungi al prompt AI
const userProfile = await getUserProfile(userId);

if (userProfile) {
  prompt += `
  
PROFILO UTENTE:
- Nome: ${userProfile.first_name || 'Non specificato'}
- Divisione: ${userProfile.current_division || 'Non specificato'}
- Squadra del cuore: ${userProfile.favorite_team || 'Non specificato'}
- Nome squadra: ${userProfile.team_name || 'Non specificato'}
- Come ricordare: ${userProfile.how_to_remember || 'Non specificato'}
- Ore settimanali: ${userProfile.hours_per_week || 'Non specificato'}
- Problemi comuni: ${userProfile.common_problems?.join(', ') || 'Nessuno specificato'}

${userProfile.ai_name ? `Chiama l'utente come "${userProfile.ai_name}" vuole essere chiamato.` : ''}

${userProfile.how_to_remember ? `Ricorda: ${userProfile.how_to_remember}` : ''}

${userProfile.common_problems?.length > 0 ? `Problemi ricorrenti utente: ${userProfile.common_problems.join(', ')}. Focalizzati su questi quando possibile.` : ''}
`;
}
```

**Tono IA Personalizzato**:
- Se `ai_name` presente: Usa il nome per rivolgersi all'utente
- Se `how_to_remember` presente: Adatta tono e consigli
- Se `common_problems` presente: Priorità su questi problemi
- Se `hours_per_week` alto: Tono più competitivo
- Se `hours_per_week` basso: Tono più rilassato

---

## 💳 SISTEMA CREDITI - IMPLEMENTAZIONE

### Endpoint `/api/hero-points/balance` (GET)
- Ritorna balance attuale
- Calcola `euros_equivalent` (hero_points / 100)

### Endpoint `/api/hero-points/purchase` (POST)
- Input: `{ amount_euros: 10 }` → Aggiunge 1000 hero points
- Crea transazione `purchase`
- Aggiorna balance

### Endpoint `/api/hero-points/spend` (POST) - Interno
- Input: `{ user_id, amount, operation_type, operation_id }`
- Verifica balance sufficiente
- Sottrae crediti
- Crea transazione `spent`
- Ritorna nuovo balance

### Endpoint `/api/hero-points/transactions` (GET)
- Ritorna storico transazioni utente
- Filtri: tipo, data, operazione

---

## 🎨 UI SISTEMA CREDITI

### Componente `HeroPointsBalance.jsx`

**Fase 1: Countdown Numerico** (Attuale):
```
┌─────────────────────────────────────┐
│  💎 HERO POINTS                     │
│  ────────────────────────────────  │
│                                     │
│  Balance: 1,250 punti               │
│  Equivalente: 12.50€                │
│                                     │
│  [Compra Crediti]                  │
│                                     │
│  📊 ULTIME TRANSAZIONI              │
│  ────────────────────────────────  │
│  • Analisi match: -100 punti        │
│  • Estrazione dati: -50 punti       │
│  • Acquisto: +1,000 punti           │
└─────────────────────────────────────┘
```

**Fase 2: Barra Descrescente** (Futuro):
```
┌─────────────────────────────────────┐
│  💎 HERO POINTS                     │
│  ────────────────────────────────  │
│                                     │
│  ┌─────────────────────────────┐  │
│  │ ████████████░░░░░░ 1,250/2,000│  │
│  └─────────────────────────────┘  │
│  12.50€ / 20.00€                   │
│                                     │
│  [Compra Crediti]                  │
│                                     │
│  ⚠️ Attenzione: Balance basso!     │
│     Considera di ricaricare        │
└─────────────────────────────────────┘
```

**Posizionamento**: Header/Navbar (sempre visibile)

---

## 🔄 FLUSSO COMPLETO

### 1. Utente Esegue Operazione
```
Utente → Endpoint (es. /api/extract-match-data)
  ↓
Verifica balance sufficiente
  ↓
Se sufficiente:
  - Esegue operazione
  - Sottrae crediti
  - Crea transazione
  - Ritorna risultato + nuovo balance
Se insufficiente:
  - Ritorna errore "Crediti insufficienti"
  - Mostra UI per acquistare crediti
```

### 2. Aggiornamento UI Real-Time
- Dopo ogni operazione: Aggiorna balance in header
- Countdown numerico: Mostra nuovo valore
- (Futuro) Barra descrescente: Aggiorna visualmente

---

## 📱 RESPONSIVE MOBILE-FIRST

### Impostazioni Profilo
- **Mobile**: Scroll verticale, sezioni stack
- **Desktop**: Layout a colonne (se necessario)
- **Skip sempre disponibile**: Ogni sezione ha bottone "Salta"
- **Salvataggio incrementale**: Salva dopo ogni sezione (non solo alla fine)

### Sistema Crediti
- **Mobile**: Balance compatto in header
- **Desktop**: Balance + transazioni in sidebar
- **Touch-friendly**: Bottoni grandi, facile tap

---

## 🎯 INTEGRAZIONE CON CONOSCENZA IA

### Barra Conoscenza IA + Profilo
- **Conoscenza IA**: Basata su dati caricati (partite, foto, etc.)
- **Profilo Utente**: Basata su risposte domande
- **Totale**: Somma delle due barre (pesata) per conoscenza completa

**Calcolo**:
```
Conoscenza Totale = (Conoscenza IA × 0.7) + (Profilo Utente × 0.3)
```

**Motivazione**: Dati caricati (70%) più importanti di risposte domande (30%), ma entrambi contribuiscono

---

## ⚠️ ENTERPRISE - CONSIDERAZIONI

### Sicurezza
- ✅ RLS su tutte le tabelle
- ✅ Verifica balance prima di ogni operazione
- ✅ Transazioni atomiche (rollback se operazione fallisce)

### Performance
- ✅ Indici su `user_id`, `balance`
- ✅ Caching balance in Redis (TTL 5 minuti)
- ✅ Aggiornamento balance in tempo reale

### Monitoraggio
- ✅ Dashboard costi per operazione
- ✅ Analytics utilizzo crediti
- ✅ Alert quando balance basso

---

**Documento in evoluzione - Modificare insieme durante sviluppo**
