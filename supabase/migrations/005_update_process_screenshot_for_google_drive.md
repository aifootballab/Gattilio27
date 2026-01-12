# Aggiornamento Edge Function process-screenshot
## Per supportare formato dati Google Drive

**Nota**: Questo è un documento di riferimento. L'Edge Function deve essere aggiornata manualmente o via redeploy.

---

## 🔄 MODIFICHE NECESSARIE

### **1. Import Helper**:

```typescript
// Aggiungi all'inizio del file
import { parseGoogleDriveData, ParsedPlayerData } from './parseGoogleDriveData.ts'
```

### **2. Aggiorna Salvataggio players_base**:

**PRIMA** (linea ~168):
```typescript
const { data: newPlayer, error: playerError } = await supabase
  .from('players_base')
  .insert({
    player_name: extractedData.player_name,
    position: extractedData.position,
    base_stats: extractedData.attacking ? {
      attacking: extractedData.attacking,
      defending: extractedData.defending,
      athleticism: extractedData.athleticism
    } : {},
    skills: extractedData.skills || [],
    com_skills: extractedData.comSkills || [],
    position_ratings: extractedData.positionRatings || {},
    source: 'user_upload'
  })
```

**DOPO**:
```typescript
// Se extractedData è già nel formato Google Drive
let parsedData: ParsedPlayerData
if (extractedData["Giocatori"]) {
  // Formato Google Drive - parse
  parsedData = parseGoogleDriveData(extractedData as any)
} else {
  // Formato OCR tradizionale - converti
  parsedData = {
    player_name: extractedData.player_name,
    position: extractedData.position,
    role: null,
    overall_rating: extractedData.overall_rating,
    height: null,
    weight: null,
    age: null,
    nationality: null,
    club_name: null,
    potential_max: null,
    cost: null,
    form: null,
    level_cap: null,
    base_stats: {
      overall_rating: extractedData.overall_rating,
      attacking: extractedData.attacking || {},
      defending: extractedData.defending || {},
      athleticism: extractedData.athleticism || {}
    }
  }
}

const { data: newPlayer, error: playerError } = await supabase
  .from('players_base')
  .insert({
    player_name: parsedData.player_name,
    position: parsedData.position,
    role: parsedData.role,
    height: parsedData.height,
    weight: parsedData.weight,
    age: parsedData.age,
    nationality: parsedData.nationality,
    club_name: parsedData.club_name,
    potential_max: parsedData.potential_max,
    cost: parsedData.cost,
    form: parsedData.form,
    base_stats: parsedData.base_stats,
    skills: extractedData.skills || [],
    com_skills: extractedData.comSkills || [],
    position_ratings: extractedData.positionRatings || {},
    source: 'user_upload'
  })
```

### **3. Aggiorna Salvataggio player_builds**:

**PRIMA** (linea ~193):
```typescript
await supabase
  .from('player_builds')
  .upsert({
    user_id,
    player_base_id: playerBaseId,
    development_points: extractedData.build.developmentPoints || {},
    current_level: extractedData.build.currentLevel,
    level_cap: extractedData.build.levelCap,
    active_booster_name: extractedData.build.activeBooster,
    source: 'screenshot',
    source_data: {
      screenshot_id: logEntry.id,
      confidence: extractedData.confidence || 0.8
    }
  }, {
    onConflict: 'user_id,player_base_id'
  })
```

**DOPO**:
```typescript
await supabase
  .from('player_builds')
  .upsert({
    user_id,
    player_base_id: playerBaseId,
    development_points: extractedData.build?.developmentPoints || {},
    current_level: extractedData.build?.currentLevel || null,
    level_cap: parsedData.level_cap || extractedData.build?.levelCap || null,
    active_booster_name: extractedData.build?.activeBooster || null,
    final_stats: parsedData.base_stats,
    final_overall_rating: parsedData.overall_rating,
    source: 'screenshot',
    source_data: {
      screenshot_id: logEntry.id,
      confidence: extractedData.confidence || 0.8,
      form: parsedData.form
    }
  }, {
    onConflict: 'user_id,player_base_id'
  })
```

---

## 📋 CHECKLIST AGGIORNAMENTO

- [ ] Aggiungere file `parseGoogleDriveData.ts` alla Edge Function
- [ ] Aggiornare import in `index.ts`
- [ ] Aggiornare salvataggio `players_base` con tutti i campi
- [ ] Aggiornare salvataggio `player_builds` con `level_cap` e `form`
- [ ] Testare con dati Google Drive reali
- [ ] Verificare che tutti i campi vengano salvati correttamente

---

**Status**: 📝 Documentazione creata - Edge Function da aggiornare
