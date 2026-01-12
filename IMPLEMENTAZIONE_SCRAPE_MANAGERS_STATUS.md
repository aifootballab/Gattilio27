# ✅ Implementazione scrape-managers - Status

**Data**: 2025-01-12  
**Status**: 🟡 **STRUTTURA BASE COMPLETATA - Parsing HTML da completare**

---

## ✅ COSA È STATO FATTO

### 1. Edge Function `scrape-managers` ✅

**File**: `supabase/functions/scrape-managers/index.ts`

**Implementato**:
- ✅ Pattern coerente con altri endpoint (CORS, error handling, logging)
- ✅ Test mode per verificare struttura senza scraping reale
- ✅ Integrazione database (`managers` e `manager_style_competency`)
- ✅ Mapping stili di gioco (`team_playing_styles`)
- ✅ Batch processing (configurabile)
- ✅ Upsert logic (create/update esistente)
- ✅ Gestione style competencies (competenza per ogni stile)

**Struttura**:
```typescript
- serve() handler con CORS
- Test mode (ritorna struttura attesa)
- Fetch HTML da efootballhub.net
- Parsing HTML (placeholder - da completare)
- Salvataggio database
- Creazione style competencies
```

### 2. Integrazione `managerService.js` ✅

**File**: `services/managerService.js`

**Funzione aggiunta**:
```javascript
export async function scrapeManagers(options = {})
```

**Pattern**:
- Coerente con `importPlayersFromJSON`
- Invocazione Edge Function tramite `supabase.functions.invoke`
- Error handling uniforme

---

## ⏳ COSA MANCA (Per Parsing HTML Reale)

### 1. URL Corretto efootballhub.net/managers

**Problema**: 
- `/efootball23/managers` restituisce 404
- URL corretto da verificare manualmente

**Possibili URL**:
- `https://efootballhub.net/managers`
- `https://efootballhub.net/efootball2024/managers`
- `https://efootballhub.net/managers/search`
- Altro formato

**Soluzione**: 
- Navigare manualmente su efootballhub.net
- Trovare sezione "Managers" / "Allenatori"
- Copiare URL corretto

### 2. Parsing HTML Reale

**Funzione**: `parseManagersHTML(html: string, filterName?: string)`

**Cosa deve fare**:
1. Analizzare struttura HTML di efootballhub.net/managers
2. Estrarre dati per ogni manager:
   - Nome
   - Overall rating
   - Preferred formation
   - Tactics (defensive line, compactness, build up, etc.)
   - Skills
   - Team playing styles (stili di gioco)
   - Metadata (altre info)
3. Filtrare per nome se fornito
4. Ritornare array di oggetti manager

**Esempio struttura attesa**:
```typescript
{
  name: string,
  efootballhub_id?: string,
  overall_rating?: number,
  preferred_formation?: string,
  tactics: {
    defensive_line?: string,
    compactness?: string,
    build_up?: string,
    attacking_area?: string,
    positioning?: string,
    support_range?: number,
    compactness_attacking?: number,
    compactness_defending?: number,
    number_of_players_in_box?: number,
    corner_kicks?: string,
    free_kicks?: string
  },
  skills: string[],
  team_playing_styles: string[], // Nomi stili (es: "Possesso palla", "Contropiede rapido")
  metadata: {}
}
```

---

## 🧪 TEST MODE

**Funzione**: Test mode già implementato

**Uso**:
```javascript
// Dal service
const result = await scrapeManagers({ test_mode: true })

// Ritorna struttura attesa senza fare scraping reale
```

**Output**:
```json
{
  "success": true,
  "test_mode": true,
  "message": "Test mode - structure ready for scraping",
  "expected_structure": { ... }
}
```

---

## 📋 COME COMPLETARE IL PARSING

### Step 1: Trovare URL Corretto

1. Apri efootballhub.net nel browser
2. Cerca sezione "Managers" o "Allenatori"
3. Copia URL completo
4. Aggiorna `baseURL` in `scrape-managers/index.ts`

### Step 2: Analizzare Struttura HTML

1. Apri pagina managers in browser
2. Ispeziona HTML (F12)
3. Identifica:
   - Container lista managers (es: `<div class="managers-list">`)
   - Card/Item manager (es: `<div class="manager-card">`)
   - Nome manager (es: `<h2 class="manager-name">`)
   - Rating (es: `<span class="rating">`)
   - Formazione (es: `<span class="formation">`)
   - Tactics (es: `<div class="tactics">`)
   - Skills (es: `<div class="skills">`)
   - Styles (es: `<div class="playing-styles">`)

### Step 3: Implementare Parsing

**Opzioni**:

**Opzione A: Parsing HTML Manuale (Regex/DOM)**
```typescript
// Esempio con regex (semplice ma fragile)
function parseManagersHTML(html: string): any[] {
  const managers: any[] = []
  const managerPattern = /<div class="manager-card">(.*?)<\/div>/gs
  // ... parsing logic
  return managers
}
```

**Opzione B: Usare Libreria Parsing HTML**
- Deno non supporta direttamente librerie come cheerio
- Possibile usare `deno_dom` o parsing manuale

**Opzione C: API JSON (se disponibile)**
- Se efootballhub.net espone API JSON
- Più affidabile e performante

### Step 4: Test e Debug

1. Testa parsing con HTML reale
2. Verifica estrazione dati corretta
3. Testa salvataggio database
4. Verifica style competencies create correttamente

---

## 🔧 STRUTTURA ATTUALE (Pronta per Parsing)

### Edge Function Structure

```typescript
serve(async (req) => {
  // 1. CORS handling ✅
  // 2. Test mode ✅
  // 3. Fetch HTML ✅
  // 4. Parse HTML ⏳ (placeholder)
  // 5. Save to database ✅
  // 6. Create style competencies ✅
  // 7. Return results ✅
})
```

### Database Integration

```typescript
// Salvataggio manager
await supabase.from('managers').upsert(managerRecord)

// Creazione style competencies
await createStyleCompetencies(
  supabase,
  managerId,
  styleNames,
  styleMap
)
```

---

## ✅ CONCLUSIONI

**Stato**: 
- ✅ Struttura base completa e funzionante
- ✅ Integrazione service completa
- ✅ Test mode disponibile
- ⏳ Parsing HTML da implementare (serve URL corretto e analisi HTML)

**Prossimi Step**:
1. Trovare URL corretto efootballhub.net/managers
2. Analizzare struttura HTML
3. Implementare parsing HTML reale
4. Testare con dati reali

**Pronto per**: 
- Test mode (funziona subito)
- Integrazione in frontend (funziona in test mode)
- Parsing HTML (da completare quando abbiamo URL corretto)

---

## 📝 NOTE

**Approccio Modulare**: 
- La struttura è progettata per essere estesa facilmente
- Il parsing HTML è isolato in funzione separata
- Può essere completato senza rompere logica esistente

**Coerenza**: 
- Segue pattern degli altri endpoint
- Non rompe flussi esistenti
- Integrazione pulita con service layer
