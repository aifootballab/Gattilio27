# 🎯 MIGRAZIONE FINALE - Istruzioni Definite

## ⚠️ IMPORTANTE

**Supabase NON supporta DDL (CREATE TABLE, DROP TABLE) via REST API.**

L'unico modo per eseguire la migrazione è tramite **SQL Editor** in Supabase Dashboard.

---

## ✅ PROCEDURA (2 minuti)

### STEP 1: Apri Supabase Dashboard
1. Vai su https://supabase.com/dashboard
2. Seleziona progetto: `zliuuorrwdetylollrua`
3. Vai su **SQL Editor** (menu laterale sinistro)

### STEP 2: Esegui Script
1. Apri il file `migration_semplificazione.sql` nel progetto
2. **Seleziona TUTTO** (Ctrl+A)
3. **Copia** (Ctrl+C)
4. **Incolla** nel SQL Editor di Supabase
5. Clicca **RUN** (o premi Ctrl+Enter)

### STEP 3: Verifica
1. Vai su **Table Editor**
2. Verifica che esista la tabella `players`
3. Verifica che NON ci siano più:
   - `player_builds`
   - `players_base`
   - `user_rosa`
   - `screenshot_processing_log`

---

## 🧪 TEST DOPO MIGRAZIONE

1. **Login** → https://gattilio27.vercel.app/login
2. **Carica giocatore** → `/rosa` → Upload screenshot
3. **Verifica** → `/my-players` → Dovrebbe apparire il giocatore

---

## 📋 COSA FA LO SCRIPT

1. ✅ Cancella tabelle vecchie (`player_builds`, `players_base`, `user_rosa`, `screenshot_processing_log`)
2. ✅ Crea nuova tabella `players` (unificata, semplice)
3. ✅ Crea index per performance
4. ✅ Configura RLS (Row Level Security)
5. ✅ Crea trigger per `updated_at`

---

## 🐛 SE QUALCOSA VA MALE

1. **Controlla errori** nel SQL Editor
2. **Verifica** che non ci siano foreign key constraints attive
3. **Esegui** lo script step-by-step (commenta parti se necessario)

---

**Esegui lo script SQL e testa!** 🚀
