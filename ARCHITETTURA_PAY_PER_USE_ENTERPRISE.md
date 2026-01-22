# 💎 Architettura Enterprise: Pay-Per-Use + Conoscenza IA Progressiva

**Data**: Gennaio 2025  
**Obiettivo**: Prodotto premium a consumo con analisi top-grade  
**Filosofia**: "Meglio spendere di più ma che funzioni" → Qualità massima

---

## 🎯 1. MODELLO PAY-PER-USE

### 1.1 Filosofia: Qualità > Costo

**Principio**: Il cliente paga solo per quello che usa, ma riceve analisi di qualità massima.

**Vantaggi**:
- ✅ Trasparenza: Cliente vede esattamente cosa paga
- ✅ Flessibilità: Nessun abbonamento fisso
- ✅ Scalabilità: Costi proporzionali all'uso
- ✅ Qualità: Possiamo usare GPT-5.2 senza limiti di budget

### 1.2 Unità di Consumo (Credits)

**Sistema Credits**:
- 1 Credit = 1 operazione AI
- Cliente compra crediti (es. 10, 50, 100, 500)
- Ogni operazione consuma crediti in base alla complessità

**Tabella Prezzi Credits** (Esempio):
| Pacchetto | Credits | Prezzo | Prezzo/Credit |
|-----------|---------|--------|---------------|
| Starter | 10 | €5 | €0.50 |
| Pro | 50 | €20 | €0.40 |
| Expert | 100 | €35 | €0.35 |
| Master | 500 | €150 | €0.30 |

### 1.3 Costo per Operazione

**Operazioni Disponibili**:

| Operazione | Provider | Costo Reale | Credits Richiesti | Margine |
|------------|----------|-------------|-------------------|---------|
| **Analisi Rosa Base** | Regole (gratis) | $0 | 0 | - |
| **Analisi Rosa Full** | GPT-5.2 Thinking | ~$0.03 | 1 credit | 90% |
| **Analisi Meta** | Gemini 2.0 Pro | ~$0.012 | 1 credit | 95% |
| **Chat Realtime** | GPT-4o Realtime | ~$0.035 | 1 credit | 88% |
| **Contromisure Avversario** | GPT-5.2 Pro | ~$0.04 | 2 credits | 92% |
| **Analisi Mappa Calore** | GPT-5.2 Vision | ~$0.05 | 2 credits | 90% |
| **Statistiche Partita** | GPT-5.2 Thinking | ~$0.03 | 1 credit | 90% |

**Margine Medio**: ~90% (assumendo €0.35/credit)

---

## 📊 2. SISTEMA "CONOSCENZA IA" PROGRESSIVA

### 2.1 Concetto

**Barra Progressiva** che mostra quanto l'IA "conosce" il cliente:
- Inizia a 0% quando cliente si registra
- Aumenta man mano che cliente carica dati
- Massima qualità analisi quando conoscenza > 80%

### 2.2 Fattori che Aumentano Conoscenza

**Profilazione Base** (0% → 50%):
- ✅ Rosa completa (21 giocatori): +20%
- ✅ Formazione salvata: +10%
- ✅ Coach attivo: +10%
- ✅ Istruzioni individuali: +10%

**Profilazione Avanzata** (50% → 80%):
- ✅ Statistiche partite (min 5 partite): +15%
- ✅ Mappe di calore (min 3 mappe): +10%
- ✅ Formazioni avversarie analizzate (min 3): +5%

**Profilazione Completa** (80% → 100%):
- ✅ Statistiche partite (min 20 partite): +10%
- ✅ Mappe di calore multiple per giocatore: +5%
- ✅ Pattern di gioco identificati: +5%

### 2.3 Database Schema

**Tabella `user_ai_knowledge`**:
```sql
CREATE TABLE user_ai_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Profilazione Base
  roster_complete BOOLEAN DEFAULT false,
  formation_saved BOOLEAN DEFAULT false,
  coach_active BOOLEAN DEFAULT false,
  instructions_set BOOLEAN DEFAULT false,
  
  -- Profilazione Avanzata
  matches_analyzed INTEGER DEFAULT 0,
  heatmaps_uploaded INTEGER DEFAULT 0,
  opponent_formations_analyzed INTEGER DEFAULT 0,
  
  -- Calcolo Progressivo
  knowledge_score DECIMAL(5,2) DEFAULT 0.00 CHECK (knowledge_score >= 0 AND knowledge_score <= 100),
  knowledge_level TEXT DEFAULT 'beginner' CHECK (knowledge_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  
  -- Metadata
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_user_knowledge UNIQUE (user_id)
);

-- Trigger per calcolo automatico knowledge_score
CREATE OR REPLACE FUNCTION calculate_ai_knowledge_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Calcolo base (0-50%)
  NEW.knowledge_score := 0.0;
  IF NEW.roster_complete THEN NEW.knowledge_score := NEW.knowledge_score + 20.0; END IF;
  IF NEW.formation_saved THEN NEW.knowledge_score := NEW.knowledge_score + 10.0; END IF;
  IF NEW.coach_active THEN NEW.knowledge_score := NEW.knowledge_score + 10.0; END IF;
  IF NEW.instructions_set THEN NEW.knowledge_score := NEW.knowledge_score + 10.0; END IF;
  
  -- Calcolo avanzato (50-80%)
  IF NEW.matches_analyzed >= 5 THEN NEW.knowledge_score := NEW.knowledge_score + 15.0; END IF;
  IF NEW.matches_analyzed >= 20 THEN NEW.knowledge_score := NEW.knowledge_score + 5.0; END IF;
  IF NEW.heatmaps_uploaded >= 3 THEN NEW.knowledge_score := NEW.knowledge_score + 10.0; END IF;
  IF NEW.opponent_formations_analyzed >= 3 THEN NEW.knowledge_score := NEW.knowledge_score + 5.0; END IF;
  
  -- Cap a 100%
  IF NEW.knowledge_score > 100.0 THEN NEW.knowledge_score := 100.0; END IF;
  
  -- Calcolo knowledge_level
  IF NEW.knowledge_score < 30 THEN
    NEW.knowledge_level := 'beginner';
  ELSIF NEW.knowledge_score < 60 THEN
    NEW.knowledge_level := 'intermediate';
  ELSIF NEW.knowledge_score < 80 THEN
    NEW.knowledge_level := 'advanced';
  ELSE
    NEW.knowledge_level := 'expert';
  END IF;
  
  NEW.last_calculated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_knowledge_score
  BEFORE INSERT OR UPDATE ON user_ai_knowledge
  FOR EACH ROW
  EXECUTE FUNCTION calculate_ai_knowledge_score();

-- Indici
CREATE INDEX idx_user_ai_knowledge_user_id 
ON user_ai_knowledge(user_id);

CREATE INDEX idx_user_ai_knowledge_score 
ON user_ai_knowledge(knowledge_score DESC);
```

### 2.4 UI: Barra Progressiva

**Componente `AIKnowledgeProgress.jsx`**:
```javascript
// Mostra barra progressiva conoscenza IA
// Colori: Rosso (0-30%), Arancione (30-60%), Giallo (60-80%), Verde (80-100%)
// Tooltip: "Completa la profilazione per migliorare le analisi"
```

**Posizionamento**:
- Dashboard: Card prominente
- Gestione Formazione: Badge in alto
- Profilo Utente: Sezione dedicata

---

## 🎮 3. FEATURE FUTURE: ARCHITETTURA

### 3.1 Statistiche Fine Partita

**Concetto**:
- Cliente carica screenshot statistiche partita
- IA estrae: gol, assist, passaggi, contrasti, etc. per ogni giocatore
- Salva in database per analisi trend

**Database Schema**:
```sql
CREATE TABLE match_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_date TIMESTAMPTZ DEFAULT NOW(),
  opponent_name TEXT,
  result TEXT, -- "3-1", "2-2", etc.
  player_stats JSONB NOT NULL, -- { "player_id": { "goals": 2, "assists": 1, ... } }
  team_stats JSONB, -- { "possession": 65, "shots": 12, ... }
  extracted_data JSONB, -- Raw data from AI
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_match_statistics_user_date 
ON match_statistics(user_id, match_date DESC);
```

**Endpoint**: `/api/extract-match-stats`
- Provider: **GPT-5.2 Vision** (massima precisione)
- Costo: ~$0.03 per screenshot
- Credits: 1 credit

### 3.2 Mappe di Calore

**Concetto**:
- Cliente carica mappa di calore giocatore (screenshot)
- IA analizza zone di campo più frequentate
- Salva pattern per analisi trend

**Database Schema**:
```sql
CREATE TABLE player_heatmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  match_date TIMESTAMPTZ DEFAULT NOW(),
  heatmap_data JSONB NOT NULL, -- { "zones": [{ "x": 50, "y": 30, "intensity": 0.8 }, ...] }
  extracted_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_player_heatmaps_user_player 
ON player_heatmaps(user_id, player_id, match_date DESC);
```

**Endpoint**: `/api/extract-heatmap`
- Provider: **GPT-5.2 Vision** (analisi spaziale avanzata)
- Costo: ~$0.05 per mappa
- Credits: 2 credits

**Analisi Trend**:
- Confronta mappe multiple dello stesso giocatore
- Identifica pattern di movimento
- Suggerisce ottimizzazioni posizione

### 3.3 Contromisure Avversario

**Concetto**:
- Cliente carica formazione avversaria (2D)
- IA analizza: formazione, giocatori chiave, punti deboli
- Genera contromisure basate su:
  - Formazione cliente
  - Stile di gioco cliente
  - Giocatori disponibili
  - Pattern identificati

**Database Schema**:
```sql
CREATE TABLE opponent_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opponent_formation TEXT NOT NULL,
  opponent_players JSONB, -- { "slot_index": { "name": "...", "position": "...", ... } }
  countermeasures JSONB NOT NULL, -- { "formation_suggested": "4-3-3", "instructions": [...], "key_points": [...] }
  ai_analysis JSONB, -- Full AI analysis
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_opponent_analysis_user 
ON opponent_analysis(user_id, created_at DESC);
```

**Endpoint**: `/api/ai/analyze-opponent`
- Provider: **GPT-5.2 Pro** (ragionamento complesso)
- Input: Formazione avversaria + Rosa cliente + Stile gioco
- Costo: ~$0.04 per analisi
- Credits: 2 credits

**Output**:
```json
{
  "countermeasures": {
    "formation_suggested": "4-3-3",
    "tactical_instructions": [
      {
        "type": "exploit_weakness",
        "description": "Avversario debole su ali, usa attaccanti veloci",
        "players_affected": ["player_id_1", "player_id_2"]
      }
    ],
    "individual_instructions": {
      "attacco_1": { "instruction": "attacco_spazio", "player_id": "..." }
    },
    "key_points": [
      "Avversario usa pressing alto → usa passaggi lunghi",
      "Difesa lenta → sfrutta velocità attaccanti"
    ]
  }
}
```

---

## 🏗️ 4. ARCHITETTURA ENTERPRISE COMPLETA

### 4.1 Stack Tecnologico (Top Quality)

**AI Providers**:
- **GPT-5.2 Thinking/Pro**: Analisi complesse, contromisure, suggerimenti
- **GPT-5.2 Vision**: Statistiche partita, mappe calore, screenshot
- **GPT-4o Realtime**: Chat streaming (velocità)
- **Gemini 2.0 Pro**: Meta analysis, web search (costo-efficienza)

**Filosofia**: "Meglio spendere di più ma che funzioni"
- ✅ Qualità massima dove serve (GPT-5.2)
- ✅ Velocità dove serve (GPT-4o)
- ✅ Costo-efficienza dove possibile (Gemini)

### 4.2 Database Schema Completo

**Tabella `user_credits`**:
```sql
CREATE TABLE user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits_balance INTEGER DEFAULT 0 CHECK (credits_balance >= 0),
  total_purchased INTEGER DEFAULT 0,
  total_used INTEGER DEFAULT 0,
  last_purchase_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_user_credits UNIQUE (user_id)
);

CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'usage', 'refund')),
  credits_amount INTEGER NOT NULL,
  operation_type TEXT, -- 'analysis', 'chat', 'countermeasure', etc.
  operation_id UUID, -- Reference to operation (analysis_id, conversation_id, etc.)
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_credit_transactions_user 
ON credit_transactions(user_id, created_at DESC);
```

### 4.3 Endpoint API Pay-Per-Use

**1. `/api/credits/balance`** (GET)
- Restituisce: `{ credits_balance: 50, knowledge_score: 75.5 }`
- Costo: $0 (solo query DB)

**2. `/api/credits/purchase`** (POST)
- Input: `{ package: 'pro', payment_method: 'stripe' }`
- Output: `{ credits_added: 50, new_balance: 100, transaction_id: '...' }`
- Integrazione: Stripe/PayPal

**3. `/api/ai/analyze-roster`** (POST) - **Pay-Per-Use**
- Input: `{ user_id, analysis_type: 'full' }`
- Verifica credits: `CHECK credits_balance >= 1`
- Esegue analisi: GPT-5.2 Thinking
- Consuma credit: `UPDATE credits_balance = credits_balance - 1`
- Log: `INSERT credit_transactions`
- Output: `{ insights: [...], credits_remaining: 49 }`

**4. `/api/ai/analyze-opponent`** (POST) - **Pay-Per-Use**
- Input: `{ opponent_formation_image, user_id }`
- Verifica credits: `CHECK credits_balance >= 2`
- Esegue analisi: GPT-5.2 Pro
- Consuma credits: `UPDATE credits_balance = credits_balance - 2`
- Output: `{ countermeasures: {...}, credits_remaining: 48 }`

**5. `/api/extract-match-stats`** (POST) - **Pay-Per-Use**
- Input: `{ match_stats_image, user_id }`
- Verifica credits: `CHECK credits_balance >= 1`
- Esegue estrazione: GPT-5.2 Vision
- Consuma credit: `UPDATE credits_balance = credits_balance - 1`
- Output: `{ stats: {...}, credits_remaining: 47 }`

**6. `/api/extract-heatmap`** (POST) - **Pay-Per-Use**
- Input: `{ heatmap_image, player_id, user_id }`
- Verifica credits: `CHECK credits_balance >= 2`
- Esegue estrazione: GPT-5.2 Vision
- Consuma credits: `UPDATE credits_balance = credits_balance - 2`
- Output: `{ heatmap_data: {...}, credits_remaining: 45 }`

### 4.4 UI Pay-Per-Use

**Componente `CreditsBalance.jsx`**:
- Mostra credits rimanenti
- Bottone "Compra Credits"
- Storico transazioni
- Warning quando credits < 5

**Componente `AIKnowledgeProgress.jsx`**:
- Barra progressiva 0-100%
- Tooltip con dettagli
- Badge livello (Beginner/Intermediate/Advanced/Expert)
- Suggerimenti per aumentare conoscenza

**Componente `OperationCard.jsx`**:
- Mostra costo in credits
- Verifica disponibilità credits
- Disabilita se credits insufficienti
- Mostra "Conoscenza IA: 75% → Analisi più precisa"

---

## 💰 5. PRICING E MARGINI

### 5.1 Costi Reali vs Prezzo Cliente

**Esempio: Pacchetto Pro (50 credits = €20)**

| Operazione | Costo Reale | Credits | Prezzo Cliente | Margine |
|------------|-------------|---------|----------------|---------|
| Analisi Rosa Full | $0.03 | 1 | €0.40 | 92% |
| Contromisure | $0.04 | 2 | €0.80 | 90% |
| Statistiche Partita | $0.03 | 1 | €0.40 | 92% |
| Mappa Calore | $0.05 | 2 | €0.80 | 88% |
| Chat Realtime | $0.035 | 1 | €0.40 | 90% |

**Margine Medio**: ~90%

### 5.2 ROI Scenario

**1000 Utenti Attivi**:
- 30% comprano pacchetto Pro (50 credits): 300 × €20 = €6.000
- 20% comprano pacchetto Expert (100 credits): 200 × €35 = €7.000
- 10% comprano pacchetto Master (500 credits): 100 × €150 = €15.000
- **Revenue**: €28.000/mese

**Costi AI** (assumendo uso medio):
- Analisi: 5000 × $0.03 = $150
- Contromisure: 2000 × $0.04 = $80
- Statistiche: 3000 × $0.03 = $90
- Mappe: 1000 × $0.05 = $50
- Chat: 2000 × $0.035 = $70
- **Totale**: ~$440/mese (~€400/mese)

**ROI**: €28.000 - €400 = **€27.600/mese** (98.6% margin)

---

## 🎯 6. QUALITÀ ANALISI: GPT-5.2 TOP GRADE

### 6.1 Perché GPT-5.2 per Tutto?

**Filosofia**: "Meglio spendere di più ma che funzioni"

**Vantaggi**:
- ✅ **Precisione**: 70.9% vs 38.8% (GPT-4o) = +82% accuratezza
- ✅ **Errori**: -30% rispetto a GPT-4o
- ✅ **Semantica**: Comprensione contesto superiore
- ✅ **Ragionamento**: Modalità Thinking/Pro per analisi complesse
- ✅ **Soddisfazione Cliente**: Analisi migliori → retention più alta

**Costo Extra**:
- GPT-5.2: ~$0.03-0.05 per analisi
- GPT-4o: ~$0.02-0.03 per analisi
- **Differenza**: ~$0.01-0.02 per analisi (+33-50%)

**Valore Aggiunto**:
- Cliente paga €0.40 per analisi
- Costo extra: €0.02
- **Margine ancora 95%** → Vale la pena per qualità

### 6.2 Quando Usare Quale Provider

**GPT-5.2 Thinking/Pro** (Analisi Complesse):
- ✅ Analisi rosa full
- ✅ Contromisure avversario
- ✅ Suggerimenti tattici avanzati
- ✅ Analisi pattern di gioco

**GPT-5.2 Vision** (Analisi Immagini):
- ✅ Statistiche partita (screenshot)
- ✅ Mappe di calore (screenshot)
- ✅ Formazione avversaria (screenshot)

**GPT-4o Realtime** (Chat):
- ✅ Conversazioni streaming
- ✅ Quick questions
- ✅ Quando velocità > profondità

**Gemini 2.0 Pro** (Meta Analysis):
- ✅ Web search integration
- ✅ Trend community
- ✅ Batch processing

---

## 📋 7. ROADMAP IMPLEMENTAZIONE

### 7.1 Fase 1: Pay-Per-Use Base (Settimana 1-2)
- ✅ Database: `user_credits`, `credit_transactions`
- ✅ Endpoint: `/api/credits/balance`, `/api/credits/purchase`
- ✅ Integrazione: Stripe/PayPal
- ✅ UI: Credits balance, purchase flow
- ✅ Middleware: Verifica credits prima di operazioni AI

### 7.2 Fase 2: Conoscenza IA (Settimana 2-3)
- ✅ Database: `user_ai_knowledge`
- ✅ Trigger: Calcolo automatico knowledge_score
- ✅ UI: Barra progressiva, badge livello
- ✅ Logica: Aggiorna conoscenza dopo ogni operazione

### 7.3 Fase 3: Analisi Rosa (Settimana 3-4)
- ✅ Endpoint: `/api/ai/analyze-roster` (pay-per-use)
- ✅ Provider: GPT-5.2 Thinking/Pro
- ✅ UI: Insights panel, credit consumption
- ✅ Integrazione: Conoscenza IA per personalizzazione

### 7.4 Fase 4: Statistiche Partita (Settimana 5-6)
- ✅ Database: `match_statistics`
- ✅ Endpoint: `/api/extract-match-stats` (pay-per-use)
- ✅ Provider: GPT-5.2 Vision
- ✅ UI: Upload screenshot, visualizzazione statistiche
- ✅ Analytics: Trend partite, performance giocatori

### 7.5 Fase 5: Mappe di Calore (Settimana 7-8)
- ✅ Database: `player_heatmaps`
- ✅ Endpoint: `/api/extract-heatmap` (pay-per-use)
- ✅ Provider: GPT-5.2 Vision
- ✅ UI: Upload mappa, visualizzazione heatmap
- ✅ Analytics: Pattern movimento, ottimizzazioni

### 7.6 Fase 6: Contromisure Avversario (Settimana 9-10)
- ✅ Database: `opponent_analysis`
- ✅ Endpoint: `/api/ai/analyze-opponent` (pay-per-use)
- ✅ Provider: GPT-5.2 Pro
- ✅ UI: Upload formazione avversaria, visualizzazione contromisure
- ✅ Integrazione: Applica contromisure automaticamente

---

## ✅ 8. RACCOMANDAZIONE FINALE

### 8.1 Stack Tecnologico

**AI Providers**:
- **GPT-5.2 Thinking/Pro**: Analisi complesse (qualità massima)
- **GPT-5.2 Vision**: Analisi immagini (precisione massima)
- **GPT-4o Realtime**: Chat streaming (velocità)
- **Gemini 2.0 Pro**: Meta analysis (web search)

**Filosofia**: Qualità > Costo
- ✅ Cliente paga a consumo → possiamo usare best-in-class
- ✅ Margine 90%+ → sostenibile
- ✅ Soddisfazione cliente → retention alta

### 8.2 Sistema Conoscenza IA

**Implementazione**:
- ✅ Barra progressiva visibile
- ✅ Calcolo automatico basato su dati caricati
- ✅ Personalizzazione analisi in base a conoscenza
- ✅ Gamification: Cliente vuole raggiungere 100%

### 8.3 Pay-Per-Use

**Vantaggi**:
- ✅ Trasparenza totale
- ✅ Flessibilità cliente
- ✅ Scalabilità business
- ✅ Qualità massima sostenibile

**Pricing**:
- Starter: 10 credits = €5
- Pro: 50 credits = €20
- Expert: 100 credits = €35
- Master: 500 credits = €150

### 8.4 Feature Future

**Priorità**:
1. **Statistiche Partita** (Fase 4) - Aumenta conoscenza IA
2. **Mappe di Calore** (Fase 5) - Analisi pattern
3. **Contromisure Avversario** (Fase 6) - Feature premium

**Tutte implementate con**:
- ✅ GPT-5.2 per qualità massima
- ✅ Pay-per-use per sostenibilità
- ✅ Integrazione conoscenza IA

---

## 🚀 READY TO IMPLEMENT

**Filosofia**: "Meglio spendere di più ma che funzioni"  
**Stack**: GPT-5.2 top-grade per analisi  
**Model**: Pay-per-use trasparente  
**UX**: Conoscenza IA progressiva  
**ROI**: 98.6% margin  

**Prossimo Step**: Implementare Fase 1 (Pay-Per-Use Base)
