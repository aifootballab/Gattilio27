# 🚀 MIGRAZIONE RAPIDA - Istruzioni Step-by-Step

## ⚠️ IMPORTANTE
Supabase **NON supporta DDL (CREATE TABLE, DROP TABLE) via REST API**. 
Devi eseguire lo script SQL **manualmente** nel SQL Editor.

---

## 📋 METODO 1: SQL Editor (RACCOMANDATO - 2 minuti)

### Step 1: Apri Supabase Dashboard
1. Vai su https://supabase.com/dashboard
2. Seleziona il progetto `zliuuorrwdetylollrua` (o il tuo progetto)
3. Vai su **SQL Editor** (menu laterale)

### Step 2: Esegui Script
1. Apri il file `migration_semplificazione.sql` nel progetto
2. **Copia TUTTO il contenuto** (da riga 1 a 137)
3. **Incolla** nel SQL Editor di Supabase
4. Clicca **RUN** (o Ctrl+Enter)

### Step 3: Verifica
Dopo l'esecuzione, verifica che:
- ✅ Tabella `players` esista (vai su Table Editor)
- ✅ Non ci siano più `player_builds`, `players_base`, `user_rosa`

---

## 📋 METODO 2: Via API (Alternativo - Richiede setup)

Se vuoi automatizzare, puoi:
1. Creare una funzione SQL in Supabase che esegue lo script
2. Chiamarla via API

**Ma è più complesso e non necessario.**

---

## ✅ DOPO LA MIGRAZIONE

1. **Testa il login** → https://gattilio27.vercel.app/login
2. **Carica un giocatore** → `/rosa`
3. **Verifica** che appaia in `/my-players`

---

## 🐛 SE QUALCOSA VA MALE

1. **Verifica errori** nel SQL Editor
2. **Controlla** che non ci siano foreign key constraints attive
3. **Esegui** lo script step-by-step (commenta parti se necessario)

---

**Il metodo più semplice è SQL Editor - 2 minuti e fatto!** 🚀
