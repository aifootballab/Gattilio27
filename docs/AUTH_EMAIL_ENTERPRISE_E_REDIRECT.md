# Auth: email enterprise e fix redirect (niente più localhost)

## Perché il link "Conferma la tua email" portava a localhost

Il link nella email di conferma (o di recupero password) viene generato da Supabase. La destinazione è:

1. **Se l’app passa `emailRedirectTo` / `redirectTo`** → Supabase usa quell’URL.
2. **Altrimenti** → Supabase usa il **Site URL** del progetto (in Dashboard).

Se l’utente si è registrato da **localhost** (o il Site URL in Supabase era ancora `http://localhost:3000`), il link nella email punta a localhost. Cliccando da un altro dispositivo o da produzione, localhost non esiste → **errore**.

### Cosa è stato sistemato in codice

- **Registrazione**: l’app ora invia a Supabase `emailRedirectTo: window.location.origin + '/'`. Quindi:
  - utente su **https://tuodominio.com** → link nella email → **https://tuodominio.com/**
  - utente su **localhost** (solo dev) → link → localhost (corretto per sviluppo).
- **Recupero password**: si usa già `window.location.origin + '/reset-password'`, stesso criterio.

Così il link nella email segue sempre il dominio da cui l’utente sta usando l’app (produzione o dev).

### Variabile d’ambiente per il link nelle email (niente più localhost)

Se apri **Recupera password** (o **Registrati**) da **localhost**, il link nell’email andrebbe a localhost e, cliccando da telefono o da un altro PC, darebbe errore.

L’app ora usa **`NEXT_PUBLIC_APP_URL`**: se è impostata, tutti i link nelle email (conferma iscrizione, recupero password) puntano a quell’URL invece che a `window.location.origin`.

- **In produzione (Vercel / tuo hosting):** imposta la variabile d’ambiente  
  `NEXT_PUBLIC_APP_URL=https://tuodominio.com`  
  (senza slash finale). Così, anche se qualcuno chiede il reset da localhost, il link nell’email sarà comunque `https://tuodominio.com/reset-password`.
- **In sviluppo:** puoi impostare in `.env.local`  
  `NEXT_PUBLIC_APP_URL=https://tuodominio.com`  
  così quando provi da localhost i link nelle email puntano al sito reale.

In Vercel (o `.env.production` / `.env.local`) imposta:

```bash
NEXT_PUBLIC_APP_URL=https://tuodominio.com
```

(È già documentato in `.env.example`.)

**Sicurezza:** `NEXT_PUBLIC_APP_URL` è esposta nel frontend (prefisso `NEXT_PUBLIC_`), ma non è un segreto: è l’URL pubblico del sito. Usarla per i redirect nelle email non introduce rischi; evita solo che il link punti a localhost.

### Cosa fare in Supabase (obbligatorio in produzione)

1. **Authentication** → **URL Configuration**.
2. **Site URL**: metti l’URL pubblico dell’app, es. `https://tuodominio.com` (non lasciare `http://localhost:3000` in produzione).
3. **Redirect URLs**: aggiungi tutte le destinazioni che usi:
   - `https://tuodominio.com/`
   - `https://tuodominio.com/reset-password`
   - In dev: `http://localhost:3000/`, `http://localhost:3000/reset-password`

Se Site URL è sbagliato (es. localhost), anche le email già inviate continueranno a puntare lì; le **nuove** registrazioni/recuperi andranno invece sull’URL giusto grazie al codice sopra (e a Site URL corretto).

---

## Perché non è “enterprise” (Supabase Auth, spam, mittente)

Oggi le email arrivano da **Supabase Auth** (`noreply@mail.app.supabase.io`), con testo generico e spesso finiscono in **spam**. Per un setup enterprise servono:

1. **Custom SMTP** (tuo dominio e tuo server email)
2. **Template email** personalizzati (marchio, testo in italiano, link chiari)
3. **Redirect URL** di produzione (sopra) così il link non è mai localhost

### 1. Custom SMTP (Supabase Dashboard)

- **Project Settings** → **Auth** → **SMTP Settings**.
- Attiva **Custom SMTP** e configura:
  - Server (es. SMTP del tuo dominio o servizio tipo SendGrid, Mailgun, Postmark).
  - Mittente: es. `noreply@tuodominio.com` o `auth@tuodominio.com`.
  - Autenticazione richiesta dal provider.

Le email usciranno dal **tuo** dominio e avranno meno probabilità di finire in spam se il dominio è configurato bene (SPF, DKIM, ecc.).

### 2. Template email (Supabase Dashboard)

- **Authentication** → **Email Templates**.
- Personalizza:
  - **Confirm signup** (conferma iscrizione)
  - **Reset password** (recupero password)
- Puoi cambiare:
  - Oggetto e corpo (anche in italiano).
  - Testo del pulsante/link (es. "Conferma la tua email").
  - Branding (nome app, colori, disclaimer).

Così le email non sembrano più “generiche Supabase” e risultano più enterprise.

### 3. Riassunto

| Problema | Causa | Soluzione |
|----------|--------|-----------|
| Link conferma → localhost | Site URL o redirect da localhost | Codice: redirect da `window.location.origin`. Dashboard: Site URL e Redirect URLs = URL di produzione. |
| Email da "Supabase Auth" / spam | SMTP default Supabase, template default | Custom SMTP (tuo dominio) + template personalizzati in Dashboard. |

Dopo queste modifiche, le **nuove** conferme e recuperi password useranno l’URL giusto (niente localhost) e, con SMTP e template configurati, le email saranno enterprise e meno a rischio spam.
