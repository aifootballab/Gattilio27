# ⚡ ESEGUI MIGRAZIONE ADESSO

## Metodo 1: SQL Editor (CONSIGLIATO)

1. Vai su **Supabase Dashboard** → **SQL Editor**
2. Copia e incolla TUTTO il contenuto di `migration_semplificazione.sql`
3. Clicca **RUN** (o premi F5)
4. Verifica che non ci siano errori

## Metodo 2: Via API (se hai accesso MCP)

Se hai accesso MCP Supabase configurato, posso eseguire lo script direttamente.

## ⚠️ IMPORTANTE

- **Cancella TUTTI i dati esistenti** (player_builds, players_base, user_rosa, screenshot_processing_log)
- **Crea la nuova tabella `players`** con struttura semplificata
- **Mantiene solo `playing_styles`** (non viene cancellata)

## Dopo la migrazione

1. Verifica che la tabella `players` esista
2. Verifica che le RLS policies siano attive
3. Testa il salvataggio di un giocatore
4. Testa il recupero dei giocatori
