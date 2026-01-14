# 🔐 Abilitare Autenticazione Anonymous in Supabase

## 📋 Problema
L'app richiede autenticazione per usare le Edge Functions, ma non tutti gli utenti hanno un account. L'autenticazione anonymous permette di creare utenti temporanei senza email/password.

---

## ✅ Soluzione Implementata

Il componente `VoiceCoachingPanel.jsx` ora:
1. Verifica se l'utente è già autenticato
2. Se non lo è, fa login automatico come utente anonymous
3. Usa l'ID utente anonymous per chiamare le Edge Functions

---

## 🔧 Come Abilitare in Supabase

### **Step 1: Abilita Anonymous Sign-In**

1. Vai su [Supabase Dashboard](https://supabase.com/dashboard)
2. Seleziona il tuo progetto
3. Vai su **Authentication** → **Providers**
4. Cerca **"Anonymous"** nella lista
5. **Abilita** il toggle per "Anonymous Sign-In"
6. Clicca **Save**

### **Step 2: (Opzionale) Configura Rate Limits**

Per prevenire abusi, puoi configurare rate limits:

1. Vai su **Authentication** → **Rate Limits**
2. Configura limiti per "Anonymous Sign-In"
3. **Raccomandato**: Abilita CAPTCHA o Cloudflare Turnstile

---

## 📝 Note Importanti

### **Anonymous Users**
- ✅ Creano un utente reale nel database
- ✅ Hanno un JWT token valido
- ✅ Possono chiamare Edge Functions con `verify_jwt: true`
- ⚠️ Se l'utente cancella i dati del browser, perde l'accesso
- ⚠️ Non possono accedere da altri dispositivi

### **RLS Policies**
Gli utenti anonymous usano il ruolo `authenticated`, quindi:
- ✅ Le RLS policies per `authenticated` si applicano anche a loro
- ✅ Puoi distinguere utenti anonymous controllando `auth.jwt()->>'is_anonymous'` in SQL

**Esempio RLS Policy**:
```sql
-- Permetti solo utenti permanenti (non anonymous) di inserire dati
create policy "Only permanent users can insert"
on your_table as restrictive for insert
to authenticated
with check (
  (select (auth.jwt()->>'is_anonymous')::boolean) is false
);

-- Permetti tutti gli utenti autenticati (inclusi anonymous) di leggere
create policy "All authenticated users can read"
on your_table for select
to authenticated
using ( true );
```

---

## 🧪 Test

Dopo aver abilitato anonymous sign-in:

1. Apri l'app
2. Apri Voice Coaching Panel
3. **Verifica**: Nessun errore "User not authenticated"
4. **Verifica**: Sessione si inizializza correttamente
5. **Verifica**: Puoi inviare messaggi

---

## 🔍 Debug

Se vedi ancora errori "User not authenticated":

1. **Verifica** che anonymous sign-in sia abilitato nel dashboard
2. **Controlla** console browser per errori di autenticazione
3. **Verifica** che le variabili d'ambiente Supabase siano configurate correttamente

**Errori comuni**:
- ❌ "Anonymous sign-in is disabled" → Abilita nel dashboard
- ❌ "Rate limit exceeded" → Configura rate limits o CAPTCHA
- ❌ "Invalid API key" → Verifica variabili d'ambiente

---

## 📚 Risorse

- [Supabase Anonymous Sign-In Docs](https://supabase.com/docs/guides/auth/auth-anonymous)
- [JavaScript Reference](https://supabase.com/docs/reference/javascript/auth-signinanonymously)
- [RLS Policies per Anonymous Users](https://supabase.com/docs/guides/auth/auth-anonymous#access-control)

---

**Status**: ✅ **IMPLEMENTATO** - Richiede abilitazione nel dashboard Supabase
