# Verifica Allineamento Supabase - Endpoint, Gestione e Flussi Dati

## 📋 Obiettivo
Verificare che Supabase sia allineato e coerente con:
- Endpoint/Service layer
- Gestione dati
- Flussi di salvataggio/caricamento

---

## ✅ Schema Database

### Tabella `players_base`
```sql
CREATE TABLE players_base (
  -- ...
  metadata JSONB DEFAULT '{}',
  skills TEXT[] DEFAULT '{}',
  com_skills TEXT[] DEFAULT '{}',
  -- ...
);
```

**✅ Supporto completo**: Il campo `metadata` è `JSONB`, quindi può contenere qualsiasi struttura JSON annidata.

---

## 🔄 Flusso Salvataggio

### 1. Frontend (RosaManualInput.jsx)
```javascript
// Struttura dati nel componente
playerData = {
  playingStyles: [],        // Array di stringhe
  aiPlaystyles: [],         // Array di stringhe  
  additionalSkills: [],     // Array di stringhe
  skills: [],               // Skills standard
  // ...
}
```

### 2. Salvataggio in handleSave()
```javascript
const result = await playerService.createPlayerWithBuild({
  // ...
  skills: [...playerData.skills, ...playerData.additionalSkills], // Skills standard + aggiuntive
  metadata: { 
    preferred_foot: playerData.preferredFoot,
    team_playstyle_competency: playerData.team_playstyle_competency || {},
    booster_secondary: playerData.boosters?.secondary || null,
    playing_styles: playerData.playingStyles || [],        // ✅
    ai_playstyles: playerData.aiPlaystyles || [],          // ✅
    additional_skills: playerData.additionalSkills || []   // ✅
  }
})
```

### 3. Service Layer (playerService.js)
```javascript
// createPlayerWithBuild() → upsertPlayerBase()
const playerBase = await upsertPlayerBase({
  // ...
  skills: playerData.skills || [],         // Array con skills standard + aggiuntive
  metadata: playerData.metadata || {},     // ✅ Passa direttamente (include playing_styles, ai_playstyles, additional_skills)
  // ...
})
```

### 4. Database
```sql
-- Supabase riceve e salva:
skills = ['Heading', 'Long Range Drive', 'SkillPersonalizzata1', ...]  -- ✅ TEXT[]
metadata = {
  "preferred_foot": "right",
  "team_playstyle_competency": {...},
  "booster_secondary": null,
  "playing_styles": ["Giocatore chiave", "Incontrista"],      -- ✅ Array in JSONB
  "ai_playstyles": ["Esperto palle lunghe", "Tiratore"],      -- ✅ Array in JSONB
  "additional_skills": ["SkillPersonalizzata1"]               -- ✅ Array in JSONB
}
```

**✅ Coerenza**: Il flusso è corretto e coerente.

---

## 🔄 Flusso Caricamento

### 1. Service Layer (playerService.js)
```javascript
// getPlayerBase() restituisce:
{
  id: "...",
  player_name: "...",
  skills: [...],           // Array TEXT[]
  metadata: {              // JSONB
    playing_styles: [...],
    ai_playstyles: [...],
    additional_skills: [...],
    // ...
  }
}
```

### 2. Frontend - handlePlayerSelect()
```javascript
const fullPlayerData = await playerService.getPlayerBase(selectedPlayer.id)
const baseData = playerService.extractBaseData(fullPlayerData)

setPlayerData(prev => ({
  ...baseData,
  // ...
  // ✅ Carica direttamente da metadata
  playingStyles: fullPlayerData.metadata?.playing_styles || prev.playingStyles || [],
  aiPlaystyles: fullPlayerData.metadata?.ai_playstyles || prev.aiPlaystyles || [],
  additionalSkills: fullPlayerData.metadata?.additional_skills || prev.additionalSkills || []
}))
```

### 3. Nota su extractBaseData()
`extractBaseData()` NON estrae `playing_styles`, `ai_playstyles`, `additional_skills` perché:
- Questi dati sono **carta-specifici** (non base del giocatore)
- Vengono caricati direttamente in `handlePlayerSelect()` da `metadata`
- ✅ **Coerenza mantenuta**: I dati base (stats, skills standard) sono separati dai dati carta-specifici (playing styles, booster, etc.)

**✅ Coerenza**: Il caricamento è corretto.

---

## 📊 Struttura Metadata

### Campi in `metadata` (JSONB):
```json
{
  "preferred_foot": "right" | "left" | "both",
  "team_playstyle_competency": {
    "possession_game": 0-99,
    "quick_counter": 0-99,
    // ...
  },
  "booster_secondary": "nome_booster" | null,
  "playing_styles": ["Giocatore chiave", "Incontrista", ...],     // Array stringhe
  "ai_playstyles": ["Esperto palle lunghe", "Tiratore", ...],     // Array stringhe
  "additional_skills": ["SkillPersonalizzata1", ...]              // Array stringhe
}
```

**✅ Coerenza**: Tutti i campi sono supportati da JSONB.

---

## 🔍 Verifiche Specifiche

### ✅ Skills vs Additional Skills
- **Skills standard**: Salvate in campo `skills TEXT[]`
- **Additional skills**: 
  - Salvate in `metadata.additional_skills` (per chiarezza)
  - **Aggiunte anche a** `skills` (per compatibilità con query esistenti)
- ✅ **Doppio salvataggio intenzionale**: Mantiene coerenza con query esistenti che usano `skills`

### ✅ Playing Styles
- Salvati in `metadata.playing_styles` (Array)
- Caricati da `metadata.playing_styles`
- ✅ **Coerente**

### ✅ AI Playstyles
- Salvati in `metadata.ai_playstyles` (Array)
- Caricati da `metadata.ai_playstyles`
- ✅ **Coerente**

### ✅ Booster
- **Booster primary**: Salvato in `player_builds.active_booster_name`
- **Booster secondary**: Salvato in `metadata.booster_secondary`
- ✅ **Coerente** (primary è build-specific, secondary è metadata)

---

## ✅ Conclusioni

### Tutto è Allineato e Coerente

1. **Schema Database**: ✅ `JSONB` supporta tutte le strutture necessarie
2. **Salvataggio**: ✅ Dati salvati correttamente in `metadata` e `skills`
3. **Caricamento**: ✅ Dati caricati correttamente da `metadata`
4. **Separazione Dati**: ✅ Dati base (stats) vs dati carta-specifici (metadata)
5. **Endpoint/Service**: ✅ `createPlayerWithBuild` e `getPlayerBase` gestiscono correttamente i dati

### Nessuna Modifica Necessaria

Il sistema è **coerente** e **allineato**. Non ci sono problemi di flusso dati o endpoint.

---

## 📝 Note

- `additional_skills` è salvato sia in `metadata.additional_skills` che aggiunto a `skills`: ✅ **Intenzionale** per compatibilità
- `extractBaseData()` non estrae playing styles: ✅ **Corretto** (sono carta-specifici, non base)
- `metadata` è JSONB: ✅ **Flessibile** e supporta qualsiasi struttura futura
