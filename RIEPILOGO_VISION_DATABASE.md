# 📋 Riepilogo: Vision OCR & Database
## Risposte Dirette alle Domande

---

## ❓ DOMANDE E RISPOSTE

### **1. Come prendi le info dalle foto con Google Vision?**

**RISPOSTA:**

Utilizziamo **Google Cloud Vision API** con 3 servizi principali:

#### **A. OCR (Text Detection)**
```typescript
// Estrae tutto il testo visibile
const [result] = await vision.textDetection(imageBuffer);
// Output: Array di testo con posizioni (bounding boxes)
```

**Cosa estrae:**
- Numeri: Rating (98), Statistiche (85, 82, ecc.)
- Testo: Nomi giocatori, Attributi ("Offensive Awareness")
- Layout: Posizione testo nell'immagine

#### **B. Document Text Detection**
```typescript
// Per tabelle e layout strutturati
const [result] = await vision.documentTextDetection(imageBuffer);
// Output: Struttura gerarchica (blocks → paragraphs → words)
```

**Cosa estrae:**
- Tabelle statistiche (più preciso di OCR base)
- Layout strutturato (sezioni, colonne)
- Relazioni spaziali tra elementi

#### **C. Label Detection**
```typescript
// Identifica tipo immagine
const [result] = await vision.labelDetection(imageBuffer);
// Output: ["screenshot", "user interface", "statistics", ...]
```

**Cosa estrae:**
- Tipo screenshot (profilo giocatore, formazione, stats)
- Contesto generale dell'immagine

#### **Processo Completo:**
1. **Upload** → Supabase Storage
2. **Download** → Edge Function
3. **Vision API** → OCR + Document + Labels
4. **Parsing** → Pattern matching, layout analysis
5. **Normalizzazione** → Dati strutturati TypeScript
6. **Matching** → Confronta con database giocatori
7. **Salvataggio** → Database Supabase

---

### **2. Cosa dobbiamo fare?**

**RISPOSTA:**

#### **FASE 1: Setup Infrastruttura**
1. ✅ Creare progetto Google Cloud
2. ✅ Abilitare Vision API
3. ✅ Creare service account
4. ✅ Salvare credentials in Supabase Secrets
5. ✅ Creare storage bucket `player-screenshots`

#### **FASE 2: Database**
1. ✅ Eseguire migrazioni SQL (`001_initial_schema.sql`)
2. ✅ Verificare tabelle create
3. ✅ Testare RLS (Row Level Security)

#### **FASE 3: Edge Function**
1. ⏳ Creare `process-screenshot` function
2. ⏳ Implementare parsing OCR
3. ⏳ Implementare matching giocatori
4. ⏳ Test con screenshot reali

#### **FASE 4: Frontend**
1. ⏳ Componente upload screenshot
2. ⏳ Preview dati estratti
3. ⏳ Correzione manuale
4. ⏳ Integrazione con Rosa

---

### **3. Cosa si deve salvare?**

**RISPOSTA:**

#### **A. Screenshot Originale**
- **Dove**: Supabase Storage
- **Bucket**: `player-screenshots`
- **Path**: `{user_id}/{timestamp}_{filename}.{ext}`
- **Formato**: JPG, PNG, WebP
- **Access**: Privato (solo utente)

#### **B. Dati Estratti (JSONB)**
- **Dove**: `screenshot_processing_log.extracted_data`
- **Contenuto**:
  ```json
  {
    "player_name": "Kylian Mbappé",
    "overall_rating": 98,
    "position": "CF",
    "attacking": { "offensiveAwareness": 85, ... },
    "defending": { ... },
    "athleticism": { ... },
    "skills": ["Long Ball Expert", ...],
    "build": { "levelCap": 34, "developmentPoints": {...} }
  }
  ```

#### **C. Giocatore Base**
- **Dove**: `players_base`
- **Quando**: Se giocatore non esiste
- **Cosa**: Dati base (stats, skills, position ratings)

#### **D. Build Utente**
- **Dove**: `player_builds`
- **Quando**: Sempre (ogni utente ha la sua build)
- **Cosa**: Punti sviluppo, booster, livello, stats finali

#### **E. Log Processing**
- **Dove**: `screenshot_processing_log`
- **Cosa**: 
  - Dati grezzi OCR
  - Dati estratti
  - Confidence score
  - Errori (se presenti)
  - Timestamp processing

#### **F. Rosa**
- **Dove**: `user_rosa`
- **Cosa**: Array di `player_build_ids` (riferimenti a build)

---

### **4. Che tabelle creare in Supabase?**

**RISPOSTA:**

#### **TABELLE PRINCIPALI:**

1. **`players_base`** (Database giocatori base)
   - Dati base da Konami/Google Drive
   - Statistiche base (senza build)
   - Skills, position ratings
   - **Chiave**: `id`, `player_name`, `konami_id`

2. **`player_builds`** (Build utenti)
   - Come ogni utente ha buildato il giocatore
   - Punti sviluppo, booster, livello
   - Statistiche finali calcolate
   - **Chiave**: `id`, `user_id`, `player_base_id` (UNIQUE)

3. **`user_rosa`** (Rose utenti)
   - Squadre degli utenti
   - Array di `player_build_ids`
   - Formazione preferita
   - **Chiave**: `id`, `user_id`, `name` (UNIQUE)

4. **`screenshot_processing_log`** (Log processing)
   - Audit trail processing screenshot
   - Dati grezzi OCR
   - Dati estratti
   - Confidence scores
   - **Chiave**: `id`, `user_id`

5. **`boosters`** (Database booster)
   - Tutti i booster disponibili
   - Effetti, rarità, disponibilità
   - **Chiave**: `id`, `name` (UNIQUE)

6. **`unified_match_contexts`** (Contesti partita)
   - Contesti multimodali (immagine + voce)
   - Riferimento a rosa
   - **Chiave**: `id`, `user_id`

7. **`coaching_suggestions`** (Suggerimenti)
   - Suggerimenti coaching generati
   - Riferimento a context o rosa
   - **Chiave**: `id`, `context_id`, `rosa_id`

#### **RELAZIONI:**

```
players_base (1) ──< (N) player_builds
player_builds (N) ──< (1) user_rosa (array)
user_rosa (1) ──< (N) unified_match_contexts
unified_match_contexts (1) ──< (N) coaching_suggestions
boosters (1) ──< (N) player_builds
```

#### **INDICI CREATI:**
- `idx_players_name` (ricerca per nome)
- `idx_players_position` (filtro per posizione)
- `idx_builds_user_id` (build utente)
- `idx_rosa_user_id` (rose utente)
- `idx_screenshot_user_id` (screenshot utente)
- `idx_contexts_user_id` (contesti utente)

#### **SICUREZZA (RLS):**
- **Pubblico**: `players_base`, `boosters` (tutti possono leggere)
- **Privato**: Tutte le altre (utente vede solo i suoi dati)

---

## 🎯 FLUSSO COMPLETO

```
UTENTE carica screenshot
  ↓
FRONTEND upload a Storage
  ↓
FRONTEND chiama Edge Function
  ↓
EDGE FUNCTION:
  1. Download immagine
  2. Google Vision API (OCR + Document + Labels)
  3. Parsing dati
  4. Matching giocatore
  5. Salva in DB:
     - players_base (se nuovo)
     - player_builds (sempre)
     - screenshot_processing_log (audit)
  ↓
FRONTEND riceve dati estratti
  ↓
FRONTEND mostra preview
  ↓
UTENTE conferma/corregge
  ↓
FRONTEND aggiunge a Rosa
```

---

## 📁 FILE CREATI

1. **`VISION_OCR_DATABASE_DESIGN.md`**
   - Design completo sistema
   - Dettagli tecnici
   - Esempi codice

2. **`supabase/migrations/001_initial_schema.sql`**
   - Schema database completo
   - Tabelle, indici, RLS
   - Triggers

3. **`RIEPILOGO_VISION_DATABASE.md`** (questo file)
   - Risposte dirette
   - Riepilogo esecutivo

---

## ✅ PROSSIMI STEP IMMEDIATI

1. **Setup Google Cloud**
   - Creare progetto
   - Abilitare Vision API
   - Service account + credentials

2. **Eseguire Migrazioni**
   ```bash
   supabase migration up
   ```

3. **Creare Storage Bucket**
   - Nome: `player-screenshots`
   - Access: Privato

4. **Implementare Edge Function**
   - `process-screenshot`
   - Test con screenshot reali

5. **Frontend Integration**
   - Componente upload
   - Preview dati

---

**Status**: 🟢 Design completato, pronto per implementazione
