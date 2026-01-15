# Struttura Formazione Avversaria - Dove e Come Viene Salvata

## 📍 Dove Viene Salvata

La formazione avversaria viene salvata nella tabella **`squad_formations`** in Supabase con il flag **`is_opponent = true`**.

### Tabella: `squad_formations`

```sql
SELECT * FROM squad_formations WHERE is_opponent = true;
```

**Campi principali:**
- `id` (UUID) - ID univoco della formazione
- `user_id` (UUID) - ID utente anonimo che ha salvato la formazione
- `is_opponent` (BOOLEAN) - **`true`** per formazioni avversarie
- `name` (TEXT) - Nome/descrizione formazione (es: "Corinthians S.C. Paulista" o "Formazione Avversaria - Match 1")
- `formation` (TEXT) - Formazione numerica (es: "4-2-1-3")
- `overall_strength` (INTEGER) - Forza complessiva (es: 3245)
- `tactical_style` (TEXT) - Stile tattico (es: "Contrattacco")
- `team_name` (TEXT) - Nome squadra
- `manager_name` (TEXT) - Nome manager/coach (se visibile)
- `players` (JSONB) - Array di 11 giocatori titolari con:
  - `name`: Nome completo
  - `position`: Ruolo abbreviato (P, SP, TRQ, MED, CC, TS, DC, PT)
  - `rating`: Rating complessivo
  - `field_position`: **Posizione precisa nel campo** (goalkeeper, left_back, left_center_back, right_center_back, right_back, left_midfielder, center_midfielder, right_midfielder, left_forward, center_forward, right_forward)
  - `team_logo`: Squadra del giocatore (opzionale)
  - `nationality_flag`: Nazionalità (opzionale)
- `metadata` (JSONB) - Dati aggiuntivi:
  - `substitutes`: Array sostituti
  - `reserves`: Array riserve
  - `extracted_at`: Data estrazione
  - `source`: "screenshot_extractor"
- `screenshot_url` (TEXT) - URL screenshot originale (opzionale)
- `extracted_at` (TIMESTAMP) - Data/ora estrazione

## 🎯 Importanza delle Posizioni Precise

Nel gioco eFootball, la **posizione precisa nel campo** (`field_position`) è fondamentale perché:

1. **Tattica**: Determina come i giocatori si muovono e interagiscono
2. **Matchup**: Permette all'IA di identificare chi marca chi
3. **Contromisure**: Consente di analizzare zone di superiorità/inferiorità numerica
4. **Strategia**: Aiuta a capire punti deboli e punti di forza della formazione avversaria

### Mappatura Posizioni

| `field_position` | Italiano | Descrizione |
|------------------|----------|-------------|
| `goalkeeper` | Portiere | Portiere |
| `left_back` | Terzino Sinistro | Difensore laterale sinistro |
| `left_center_back` | Difensore Centrale Sinistro | Difensore centrale sinistro |
| `right_center_back` | Difensore Centrale Destro | Difensore centrale destro |
| `right_back` | Terzino Destro | Difensore laterale destro |
| `left_midfielder` | Centrocampista Sinistro | Centrocampista sinistro |
| `center_midfielder` | Centrocampista Centrale | Centrocampista centrale |
| `right_midfielder` | Centrocampista Destro | Centrocampista destro |
| `left_forward` | Ala Sinistra | Attaccante esterno sinistro |
| `center_forward` | Attaccante Centrale | Attaccante centrale |
| `right_forward` | Ala Destra | Attaccante esterno destro |

## 📊 Struttura Dati Esempio

```json
{
  "id": "64526fca-4008-4667-afe5-fb6fc0780295",
  "user_id": "197def36-6c6b-42c0-8574-b9db01dc73fe",
  "is_opponent": true,
  "name": "Corinthians S.C. Paulista",
  "formation": "4-2-1-3",
  "overall_strength": 3245,
  "tactical_style": "Contrattacco",
  "team_name": "Corinthians S.C. Paulista",
  "manager_name": null,
  "players": [
    {
      "name": "Gianluigi Buffon",
      "position": "PT",
      "rating": 105,
      "field_position": "goalkeeper",
      "team_logo": "Parma",
      "nationality_flag": null
    },
    {
      "name": "Javier Zanetti",
      "position": "TS",
      "rating": 103,
      "field_position": "left_back",
      "team_logo": "Inter Milan",
      "nationality_flag": null
    },
    // ... altri 9 giocatori
  ],
  "metadata": {
    "substitutes": [],
    "reserves": [],
    "extracted_at": "2026-01-15T20:48:44.404Z",
    "source": "screenshot_extractor"
  },
  "extracted_at": "2026-01-15T20:48:44.404Z"
}
```

## 🔍 Come Recuperare le Formazioni Salvate

### Endpoint API

**GET** `/api/supabase/get-opponent-formations`

**Headers:**
```
Authorization: Bearer <anon_token>
```

**Response:**
```json
{
  "success": true,
  "formations": [
    {
      "id": "...",
      "name": "...",
      "formation": "4-2-1-3",
      "overall_strength": 3245,
      "players": [...]
    }
  ],
  "count": 1
}
```

### Query SQL Diretta

```sql
SELECT 
  id,
  name,
  formation,
  overall_strength,
  tactical_style,
  team_name,
  players,
  extracted_at
FROM squad_formations
WHERE is_opponent = true
  AND user_id = '<user_id>'
ORDER BY extracted_at DESC;
```

## 🎨 UX Migliorata - Elenco Organizzato per Linee

La nuova UX mostra i giocatori organizzati per linee:

1. **Portiere** (1 giocatore)
2. **Difesa** (4 giocatori, ordinati: TS → DC Sx → DC Dx → TD)
3. **Centrocampo** (3 giocatori, ordinati: Sx → Centro → Dx)
4. **Attacco** (3 giocatori, ordinati: Sx → Centro → Dx)

Ogni giocatore mostra:
- **Nome** (evidenziato)
- **Rating** (con icona stella)
- **Posizione precisa nel campo** (es: "Terzino Sinistro", "Centrocampista Centrale")
- **Ruolo** (es: "TS", "MED", "P")
- **Squadra** (se disponibile)
- **Nazionalità** (se disponibile)

## 🚀 Prossimi Passi per Contromisure IA

Quando implementeremo l'analisi IA, useremo:

1. **Rosa Utente** (`user_rosa` + `player_builds` + `players_base`)
2. **Formazione Avversaria** (`squad_formations` con `is_opponent=true`)
3. **Intersezione**:
   - Confronto formazioni
   - Matchup giocatori basato su `field_position`
   - Analisi zone di gioco
   - Suggerimenti tattici

La struttura è già pronta per l'integrazione IA! 🎯
