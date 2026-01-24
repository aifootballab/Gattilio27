# Rollback Contromisure Live – Ripristino in caso di rottura

**Data**: 24 Gennaio 2026  
**Modifiche**: Fix audit contromisure (titolari/riserve, prompt, player_ratings).

---

## 1. Cosa è stato modificato

| File | Modifiche |
|------|-----------|
| `app/api/generate-countermeasures/route.js` | Query `players` con `slot_index`; costruzione `titolari`/`riserve`; parsing `player_ratings` (cliente/nome→id); passaggio `titolari`/`riserve` all’helper. |
| `lib/countermeasuresHelper.js` | Sezioni esplicite TITOLARI/RISERVE nel prompt; istruzioni per usare **solo** queste liste in `add_to_starting_xi`/`remove_from_starting_xi`. |

**Supabase**: nessuna migration, nessuna modifica schema. Solo lettura `players.slot_index` (già esistente).

---

## 2. Ripristino tramite branch di backup

```bash
# Torna al codice pre-modifica (stato al 24 gen 2026)
git checkout backup/pre-contromisure-2026-01-24

# Oppure, per annullare le modifiche ma restare su master:
git checkout master
git show backup/pre-contromisure-2026-01-24:app/api/generate-countermeasures/route.js > app/api/generate-countermeasures/route.js
git show backup/pre-contromisure-2026-01-24:lib/countermeasuresHelper.js > lib/countermeasuresHelper.js
```

**Nota**: Il branch `backup/pre-contromisure-2026-01-24` è stato creato **prima** delle modifiche; non include i file in `rollback/`.

---

## 3. Ripristino tramite copie in `rollback/`

Se il branch non è disponibile, sovrascrivi i file con le copie di backup:

```bash
# Dalla root del progetto (Gattilio27-master)
Copy-Item rollback\generate-countermeasures-route.js app\api\generate-countermeasures\route.js
Copy-Item rollback\countermeasuresHelper.js lib\countermeasuresHelper.js
```

Su macOS/Linux:

```bash
cp rollback/generate-countermeasures-route.js app/api/generate-countermeasures/route.js
cp rollback/countermeasuresHelper.js lib/countermeasuresHelper.js
```

Poi riavvia dev server / redeploy.

---

## 4. Verifica Supabase

- **Tabelle**: `players`, `formation_layout`, `opponent_formations`, `matches`, ecc. non sono state modificate.
- **Colonna** `players.slot_index`: già presente; check `0–10` o `NULL`. Nessuna migration aggiunta.
- In caso di dubbi: verificare che `formation_layout`, `team_tactical_settings`, `coaches` rispondano alle query come prima.

---

## 5. Test dopo rollback

1. Aprire **Contromisure Live** (`/contromisure-live`).
2. Selezionare una formazione avversaria e generare contromisure.
3. Controllare che l’API `POST /api/generate-countermeasures` risponda 200 e che la UI mostri le contromisure (anche se con il bug titolari/riserve precedente).

Se qualcosa non torna, ripristina con §2 o §3 e segnala l’errore.

---

## 6. Test dopo le modifiche (non rollback)

1. **Dev**: `npm run dev` → apri `/contromisure-live`, scegli formazione avversaria, genera contromisure.
2. **API**: `POST /api/generate-countermeasures` con `{ "opponent_formation_id": "uuid" }` e Bearer token → 200, `countermeasures` in risposta.
3. **Log**: in console `[generate-countermeasures] Data summary` deve includere `titolariCount` e `riserveCount`.
4. **Prompt**: l’AI riceve TITOLARI e RISERVE espliciti; i `player_suggestions` devono usare solo id da quelle liste e `add_to_starting_xi` solo per riserve, `remove_from_starting_xi` solo per titolari.
