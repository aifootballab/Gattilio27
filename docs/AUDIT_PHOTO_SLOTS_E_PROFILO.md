# Audit photo_slots e completezza profilo – 4 Feb 2026

## Problema segnalato
1. Conteggio completezza profilo sbagliato (es. 0/3 o 2/3 quando i dati ci sono)
2. Pagina "Completa Profilo" non mostra i dati già caricati
3. Abilità e Booster caricati ma non riconosciuti

---

## Struttura attesa

### photo_slots (JSONB su `players`)
| Chiave      | Significato                    | Quando si imposta              |
|-------------|--------------------------------|--------------------------------|
| `card`      | Card/identità giocatore        | Prima foto (Card + Statistiche)|
| `statistiche` | Tabella statistiche (base_stats) | Prima foto O sezione Statistiche |
| `abilita`   | Player Skills                  | Seconda foto O sezione Abilità |
| `booster`   | Boosters attivi                | Terza foto O sezione Booster   |

### Logica isProfileComplete
```javascript
photoSlots.card && photoSlots.statistiche && (photoSlots.abilita || photoSlots.booster)
```
Tre blocchi: 1) Card+Statistiche, 2) Abilità, 3) Booster.

### Design (DESIGN_UNIFICATO_FOTO_GIOCATORE.md)
- **card** = Statistiche/Card (slot 1)
- **stats** = Abilità (slot 2)
- **skills** = Booster (slot 3)

---

## BUG 1: Mapping invertito in gestione-formazione

**File:** `app/gestione-formazione/page.jsx` (handleUploadPlayerToSlot, handleUploadReserve)

**Labels del modal:**
- Slot 1 `card`: "Foto Statistiche" / "Carta con statistiche numeriche"
- Slot 2 `stats`: "Foto Abilità"
- Slot 3 `skills`: "Foto Booster"

**Mapping attuale (SBAGLIATO):**
```javascript
if (img.type === 'card')   photoSlots.card = true
if (img.type === 'stats')  photoSlots.statistiche = true   // ← SBAGLIATO
if (img.type === 'skills') photoSlots.abilita = true       // ← SBAGLIATO
```

**Mapping corretto:**
- `card` → `card` + `statistiche` (se base_stats estratto)
- `stats` → `abilita` (l’utente carica Abilità)
- `skills` → `booster` (+ `abilita` se la foto booster contiene anche skills)

---

## BUG 2: Prima foto non imposta statistiche

Quando si carica la foto "Carta con statistiche numeriche":
- Si estrae `base_stats`
- Si imposta solo `photoSlots.card = true`
- Non si imposta `photoSlots.statistiche = true`

Conseguenza: in pagina giocatore `hasStats = photoSlots.statistiche && baseStats` è `false` anche con `base_stats` presenti → "Statistiche non disponibili".

**Fix:** se `img.type === 'card'` e `extractData.player?.base_stats` è presente, impostare anche `photoSlots.statistiche = true`.

---

## BUG 3: Pagina giocatore – logica di visualizzazione

**File:** `app/giocatore/[id]/page.jsx`

- `hasStats = photoSlots.statistiche && baseStats`
- `hasSkills = photoSlots.abilita && (skills.length > 0 || comSkills.length > 0)`
- `hasBoosters = photoSlots.booster && boosters.length > 0`

Se `photo_slots` è sbagliato (Bug 1 e 2), questi check falliscono e si mostrano "non disponibili" anche quando i dati ci sono.

**Opzione di robustezza:** usare i dati reali come fallback quando `photo_slots` è incoerente:
- Se `baseStats` ha dati → mostrare le statistiche (anche se `photoSlots.statistiche` è false)
- Se `skills` o `comSkills` hanno dati → mostrare le abilità
- Se `boosters` ha dati → mostrare i booster

Così l’utente vede sempre i dati che ha caricato; `photo_slots` serve per il conteggio di completezza, non per nascondere i dati.

---

## BUG 4: Conteggio completezza – doppia fonte di verità

**AssignModal e pagina giocatore** usano:
```javascript
completedSections = [
  photoSlots.card && 'Card',
  photoSlots.statistiche && 'Statistiche',
  (photoSlots.abilita || photoSlots.booster) && 'Abilità/Booster'
].filter(Boolean).length
```

Se `photo_slots` è errato (mapping sbagliato, mancato aggiornamento di `statistiche`), il conteggio non riflette i dati reali.

**Opzione alternativa:** calcolare `completedSections` dai dati effettivi:
- Statistiche: `base_stats` con almeno una chiave
- Abilità/Booster: `(skills.length || comSkills.length || boosters?.length) > 0`
- Card: può restare legato a `photoSlots.card` o a un’esistenza minima di dati (es. `overall_rating`)

---

## Flusso API e salvataggio

### Gestione-formazione → save-player
1. `handleUploadPlayerToSlot` costruisce `photoSlots` (attualmente con mapping sbagliato)
2. Invia `player: { ...extractedPlayerData, photo_slots: photoSlots }` a `/api/supabase/save-player`
3. `save-player` scrive `photo_slots` così com’è (o fa merge in update)

### Pagina giocatore → Supabase diretto
1. `performUpdate` aggiorna `photo_slots` per tipo:
   - `stats` → `photoSlots.statistiche = true`
   - `skills` → `photoSlots.abilita = true` (+ `booster` se estratti)
   - `booster` → `photoSlots.booster = true`
2. Usa `supabase.from('players').update(updateData)` senza passare da save-player

Nota: qui il mapping `stats`→`statistiche`, `skills`→`abilita`, `booster`→`booster` è coerente con la pagina giocatore. In gestione-formazione il mapping è invece errato.

---

## Riepilogo interventi

| # | Problema                        | File                       | Azione                                                  |
|---|---------------------------------|----------------------------|---------------------------------------------------------|
| 1 | Mapping card/stats/skills       | gestione-formazione        | `stats`→`abilita`, `skills`→`booster`, `card`→`card`+`statistiche` |
| 2 | Prima foto senza statistiche    | gestione-formazione        | Se `card` e `base_stats` → `statistiche = true`         |
| 3 | Visualizzazione dati mancanti   | giocatore/page.jsx         | Fallback sui dati reali se `photo_slots` incoerente     |
| 4 | Conteggio completezza           | AssignModal + giocatore    | Usare dati reali o correggere `photo_slots` (vedi Bug 1–2) |

---

## Test da fare dopo i fix
1. Caricare le 3 foto dalla gestione formazione → verificare 3/3
2. Caricare solo Card → verificare che Statistiche mostri i dati e che il conteggio sia corretto
3. Caricare Abilità dalla pagina giocatore → verificare spunta verde in Abilità
4. Caricare Booster dalla pagina giocatore → verificare spunta verde in Booster
5. Giocatori già creati con `photo_slots` sbagliato → verificare che i dati reali vengano comunque mostrati (con Bug 3 fix)
