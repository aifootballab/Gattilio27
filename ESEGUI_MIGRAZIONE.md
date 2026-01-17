# 🚀 ESECUZIONE MIGRAZIONE - 2 STEP

## ⚡ METODO RAPIDO (2 minuti)

### STEP 1: Crea la funzione SQL in Supabase

1. Vai su **Supabase Dashboard** → **SQL Editor**
2. Apri il file `create_migration_function.sql`
3. **Copia TUTTO** e **incolla** nel SQL Editor
4. Clicca **RUN**

Questo crea la funzione `migrate_to_players_table()` che esegue tutta la migrazione.

### STEP 2: Esegui la migrazione via API

Dopo il deploy su Vercel, chiama:

```bash
curl -X POST https://gattilio27.vercel.app/api/supabase/run-migration \
  -H "Content-Type: application/json" \
  -d '{"secret": "MIGRATE_2025"}'
```

Oppure usa Postman/Thunder Client con:
- URL: `POST /api/supabase/run-migration`
- Body: `{"secret": "MIGRATE_2025"}`

---

## ✅ VERIFICA

Dopo l'esecuzione:
1. Vai su **Supabase Dashboard** → **Table Editor**
2. Verifica che esista la tabella `players`
3. Verifica che non ci siano più `player_builds`, `players_base`, ecc.

---

## 🐛 SE FALLISCE

Se la funzione non esiste ancora:
- Esegui `create_migration_function.sql` in SQL Editor
- Riprova la chiamata API

Se ci sono errori:
- Controlla i log Vercel
- Verifica che il service role key sia corretto

---

**Pronto!** 🚀
