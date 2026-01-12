# 🚀 Deploy Edge Function scrape-players

**Problema**: L'Edge Function `scrape-players` non è ancora deployata su Supabase, causando errori CORS.

---

## ✅ SOLUZIONE: Deploy Edge Function

### Opzione 1: Supabase Dashboard (CONSIGLIATO) 🎯

1. **Vai su Supabase Dashboard**
   - URL: https://supabase.com/dashboard/project/zliuuorrwdetylollrua

2. **Vai su Edge Functions**
   - Menu laterale: **Edge Functions** → **Functions**

3. **Crea nuova Function**
   - Clicca **"Create a new function"** o **"New function"**
   - Nome: `scrape-players`

4. **Copia il codice**
   - Apri il file: `supabase/functions/scrape-players/index.ts`
   - Copia tutto il contenuto
   - Incolla nel code editor del dashboard

5. **Deploy**
   - Clicca **"Deploy"** o **"Save"**
   - Attendi il completamento del deploy

---

### Opzione 2: Supabase CLI (Avanzato) 🔧

Se hai Supabase CLI installato:

```bash
# Assicurati di essere nella directory del progetto
cd "C:\Users\Gaetano\Desktop\Progetto efootball"

# Login a Supabase (se non sei già loggato)
npx supabase login

# Link al progetto (se non già linkato)
npx supabase link --project-ref zliuuorrwdetylollrua

# Deploy della funzione
npx supabase functions deploy scrape-players
```

**Nota**: Se non hai Supabase CLI, usa l'**Opzione 1** (Dashboard) che è più semplice.

---

## ✅ VERIFICA

Dopo il deploy, verifica che la funzione sia attiva:

1. **Supabase Dashboard** → **Edge Functions** → **Functions**
2. Dovresti vedere `scrape-players` nella lista con status **ACTIVE**
3. Prova a cercare "kaka" nell'app - dovrebbe funzionare!

---

## 📝 NOTE

- L'Edge Function `scrape-players` è già creata nel codice (file: `supabase/functions/scrape-players/index.ts`)
- Il codice gestisce correttamente CORS (OPTIONS preflight)
- Deve solo essere deployata su Supabase
- Una volta deployata, lo scraping automatico funzionerà quando cerchi un giocatore non presente nel database
