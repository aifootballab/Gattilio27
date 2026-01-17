# ⚡ ESEGUI MIGRAZIONE ORA

## ✅ METODO PIÙ VELOCE

1. **Apri Supabase Dashboard** → https://supabase.com/dashboard
2. **SQL Editor** (menu laterale)
3. **Copia TUTTO** il contenuto di `migration_semplificazione.sql`
4. **Incolla** nel SQL Editor
5. **RUN** (o Ctrl+Enter)

## 📋 COSA FA

- ✅ Cancella tabelle vecchie (`player_builds`, `players_base`, `user_rosa`, `screenshot_processing_log`)
- ✅ Crea nuova tabella `players` (unificata)
- ✅ Crea index per performance
- ✅ Configura RLS (Row Level Security)
- ✅ Crea trigger per `updated_at`

## 🧪 DOPO LA MIGRAZIONE

1. Verifica che la tabella `players` esista
2. Testa salvataggio giocatore
3. Testa recupero giocatori

---

**Esegui lo script SQL e dimmi quando hai finito!** 🚀
