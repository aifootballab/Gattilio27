# Flussi di Riconoscimento e Gestione Giocatori

## Panoramica

Questo documento spiega in dettaglio come funzionano i flussi di riconoscimento, raggruppamento e salvataggio dei giocatori nella piattaforma.

---

## 1. Flusso di Estrazione Batch (`/api/extract-batch`)

### Fase 1: Fingerprint (Riconoscimento Rapido)

**Input**: Array di 1-6 immagini (screenshot di giocatori)

**Processo**:
1. Per ogni immagine, viene eseguita una chiamata rapida a OpenAI Vision per estrarre:
   - `player_name` (nome giocatore)
   - `overall_rating` (OVR)
   - `position` (posizione: DC, CC, ATT, etc.)
   - `screen_type` (tipo schermata: profile, skills, stats, boosters, unknown)
   - `confidence` (livello di confidenza)

**Normalizzazione Nome**:
```javascript
function normName(name) {
  if (!name) return null
  return String(name).trim().toLowerCase()
}
```

**Esempio**:
- `"Franz Beckenbauer"` → `"franz beckenbauer"`
- `"  RONALDINHO  "` → `"ronaldinho"`
- `"Kaka"` → `"kaka"`

### Fase 2: Raggruppamento

**Logica**:
- Le immagini vengono raggruppate per `normName(player_name)`
- Se il nome non è riconosciuto, usa fallback: `unknown-{ovr}-{position}`
- Ogni gruppo contiene tutte le immagini dello stesso giocatore

**Esempio**:
```
Input: [Beckenbauer-profile.jpg, Beckenbauer-skills.jpg, Ronaldinho-profile.jpg]
Output:
  - Gruppo 1: "franz beckenbauer" → [Beckenbauer-profile.jpg, Beckenbauer-skills.jpg]
  - Gruppo 2: "ronaldinho" → [Ronaldinho-profile.jpg]
```

### Fase 3: Estrazione Completa

**Per ogni gruppo**:
1. Vengono inviate tutte le immagini del gruppo (1-3 immagini) a OpenAI Vision
2. Il prompt richiede di fondere le informazioni da tutte le immagini
3. Viene estratto un oggetto `player` completo con tutti i campi disponibili
4. Viene generato un array `missing_screens` che indica quali schermate mancano

**Output**:
```json
{
  "groups": [
    {
      "group_id": "g1",
      "label": "Franz Beckenbauer",
      "image_ids": ["img1", "img2"],
      "player": { ... },
      "missing_screens": ["skills_screen", "additional_positions_screen"],
      "notes": []
    }
  ]
}
```

---

## 2. Flusso di Salvataggio (`/api/supabase/save-player`)

### Fase 1: Ricerca Giocatore Esistente

**Problema Risolto**: In precedenza, la ricerca era case-sensitive, quindi:
- `"Franz Beckenbauer"` ≠ `"franz beckenbauer"` (non matchava!)

**Soluzione Implementata**:
```javascript
const normName = (name) => {
  if (!name) return null
  return String(name).trim().toLowerCase()
}

// Cerca con ilike (case-insensitive in PostgreSQL)
let q = admin.from('players_base').select('id, player_name, team')
q = q.ilike('player_name', normalizedName)
if (team) {
  const normalizedTeam = normName(team)
  q = q.ilike('team', normalizedTeam)
}
```

**Logica di Match**:
1. Normalizza `player_name` e `team` (se presente)
2. Cerca in `players_base` con `ilike` (case-insensitive)
3. Se ci sono più match, preferisce quello con `team` esatto
4. Se non trova match, crea nuovo record in `players_base`

### Fase 2: Gestione Build Diverse

**Scenario**: Cliente carica lo stesso giocatore con build diverse (nuove abilità, booster diversi)

**Confronto Build**:
```javascript
const compareBuilds = (existingBuildData, newPlayer) => {
  // 1. Confronta skills (array ordinato)
  const existingSkills = existingBuildData?.source_data?.extracted?.skills?.sort().join(',') || ''
  const newSkills = newPlayer?.skills?.sort().join(',') || ''
  if (existingSkills !== newSkills) return false
  
  // 2. Confronta booster attivo
  const existingBooster = existingBuildData?.active_booster_name || null
  const newBooster = newPlayer?.boosters?.[0]?.name || null
  if (existingBooster !== newBooster) return false
  
  // 3. Confronta OVR (differenza > 2 punti)
  const existingOVR = existingBuildData?.final_overall_rating || null
  const newOVR = newPlayer?.overall_rating || null
  if (existingOVR !== null && newOVR !== null && Math.abs(existingOVR - newOVR) > 2) return false
  
  // 4. Confronta level
  const existingLevel = existingBuildData?.current_level || null
  const newLevel = newPlayer?.level_current || null
  if (existingLevel !== null && newLevel !== null && existingLevel !== newLevel) return false
  
  return true // Build identico
}
```

**Comportamento**:
- **Build identico**: Aggiorna build esistente e sposta in slot nuovo se necessario
- **Build diverso**: Crea nuovo `player_builds` (stesso `player_base_id`, nuovo `id`)
- **Risultato**: Permette di avere più versioni dello stesso giocatore con build diverse

### Fase 3: Aggiornamento Rosa

**Logica**:
1. Se giocatore già presente in rosa:
   - Se build identico: aggiorna e sposta
   - Se build diverso: crea nuovo build e inserisci in slot
2. Se giocatore non presente:
   - Crea nuovo build e inserisci in slot
3. Se slot già occupato:
   - Sostituisce il giocatore esistente (in futuro: sposta in slot disponibile)

---

## 3. Problemi Risolti

### Problema 1: Riconoscimento Giocatori Già Caricati

**Causa**: Ricerca case-sensitive in `save-player`

**Sintomo**: Cliente carica "Franz Beckenbauer" ma non riconosce "franz beckenbauer" già salvato

**Fix**: Implementato `ilike` per ricerca case-insensitive + normalizzazione nome

### Problema 2: Build Diverse Stesso Giocatore

**Causa**: Logica aggiornava sempre build esistente, anche se build diversa

**Sintomo**: Cliente carica giocatore con nuove abilità, ma build precedente viene sovrascritto

**Fix**: Implementato confronto build (skills, booster, OVR, level) e creazione nuovo build se diverso

### Problema 3: Visualizzazione Mancanze

**Causa**: Stringa semplice con `join(', ')`

**Sintomo**: UI poco chiara, non coerente con design system

**Fix**: Badge/icone con traduzioni, design coerente

---

## 4. Flusso Completo (Esempio)

### Scenario: Cliente carica 3 screenshot di Beckenbauer

1. **Upload**: Cliente carica 3 immagini
2. **Fingerprint**: 
   - Immagine 1: `player_name="Franz Beckenbauer"`, `screen_type="profile"`
   - Immagine 2: `player_name="Franz Beckenbauer"`, `screen_type="skills"`
   - Immagine 3: `player_name="Franz Beckenbauer"`, `screen_type="stats"`
3. **Raggruppamento**: Tutte e 3 le immagini → Gruppo "franz beckenbauer"
4. **Estrazione Completa**: OpenAI fonde info da 3 immagini → `player` completo
5. **Salvataggio**:
   - Cerca in `players_base` con `ilike('player_name', 'franz beckenbauer')`
   - Se non trova: crea nuovo `players_base`
   - Se trova: riutilizza `player_base_id` esistente
   - Confronta build esistente (se presente)
   - Se build diverso: crea nuovo `player_builds`
   - Se build identico: aggiorna build esistente
   - Inserisce/aggiorna `user_rosa`

---

## 5. Note Tecniche

### Normalizzazione Nome

**Sempre usare** `normName()` prima di confrontare nomi:
- Rimuove spazi iniziali/finali
- Converte in lowercase
- Gestisce `null`/`undefined`

### Ricerca Case-Insensitive

**PostgreSQL `ilike`**:
- `ilike` è case-insensitive
- Supporta pattern matching (ma non usiamo pattern qui)
- Più lento di `eq`, ma necessario per match affidabili

### Confronto Build

**Criteri di confronto**:
1. Skills (array ordinato, case-sensitive)
2. Booster attivo (nome esatto)
3. OVR (differenza > 2 punti = build diverso)
4. Level (deve essere identico)

**Se anche solo uno è diverso** → Crea nuovo build

---

## 6. Traduzioni e UI

### Visualizzazione Mancanze

**Prima** (stringa):
```
⚠️ Manca: detailed_stats_table, skills_screen
```

**Dopo** (badge):
```
⚠️ Dati Mancanti
[Statistiche Dettagliate] [Schermata Abilità]
```

### Caratteristiche Giocatore

**Tutte tradotte** in IT/EN:
- `weak_foot_frequency` → "Frequenza Piede Debole" / "Weak Foot Frequency"
- `weak_foot_accuracy` → "Precisione Piede Debole" / "Weak Foot Accuracy"
- `form_detailed` → "Forma Dettagliata" / "Detailed Form"
- `injury_resistance` → "Resistenza Infortuni" / "Injury Resistance"
- `ai_playstyles` → "Stili di Gioco IA" / "AI Playstyles"

---

## 7. Testing

### Test Case 1: Giocatore Nuovo
- Input: Screenshot di giocatore mai visto
- Expected: Crea nuovo `players_base` + nuovo `player_builds`

### Test Case 2: Giocatore Esistente, Build Identico
- Input: Screenshot di giocatore già salvato con stesso build
- Expected: Aggiorna build esistente

### Test Case 3: Giocatore Esistente, Build Diverso
- Input: Screenshot di giocatore già salvato ma con nuove abilità
- Expected: Crea nuovo `player_builds` (stesso `player_base_id`)

### Test Case 4: Nome Case-Sensitive
- Input: "Franz Beckenbauer" quando esiste "franz beckenbauer"
- Expected: Riconosce e riutilizza `player_base_id` esistente

---

## 8. Prossimi Miglioramenti

1. **Fuzzy Matching**: Match anche con variazioni nome (es: "Ronaldinho" = "Ronaldinho Gaúcho")
2. **Spostamento Automatico**: Se slot occupato, sposta giocatore esistente in slot disponibile
3. **Merge Build**: Opzione per fondere build diverse dello stesso giocatore
4. **Storico Build**: Tracciare tutte le versioni di un giocatore nel tempo
