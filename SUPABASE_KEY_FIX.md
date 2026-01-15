# Fix Supabase Service Role Key

## Problema
La chiave `sb_secret_...` moderna non è supportata dal client JS `@supabase/supabase-js`, anche con versione aggiornata.

## Soluzione Consigliata (Più Semplice)

Usa la **chiave legacy JWT `service_role`** da Supabase Dashboard:

1. Vai su **Supabase Dashboard** → **Settings** → **API** → tab **"Legacy anon, service_role API keys"**
2. Clicca **"Reveal"** sulla chiave `service_role secret`
3. Copia la chiave JWT completa (formato: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)
4. In **Vercel** → **Environment Variables** → `SUPABASE_SERVICE_ROLE_KEY`
5. Sostituisci `sb_secret_...` con la chiave JWT legacy copiata
6. **Redeploy** su Vercel

## Alternativa (Se vuoi mantenere sb_secret_)

Se preferisci mantenere `sb_secret_`, devo implementare fetch diretto invece del client JS. Richiede più modifiche al codice.

## Verifica

Dopo il cambio, nei log Vercel dovresti vedere:
- `[save-player] Service key kind: jwt` (invece di `sb_secret`)
- `[save-player] Admin client OK, test query successful`
