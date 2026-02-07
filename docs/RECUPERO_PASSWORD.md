# Recupero password (enterprise)

Flusso per utenti che hanno dimenticato la password (es. Zongaro Nicolò).

## Flusso utente

1. **Login** → link "Password dimenticata?" → **/forgot-password**
2. Inserisce **email** → clic "Invia link" → messaggio generico di successo (non si rivela se l’email esiste).
3. Riceve **email da Supabase** con link di reset (controllare anche spam).
4. Clic sul link → redirect a **/reset-password** con token in URL → form **Nuova password** + **Conferma password**.
5. Invia → password aggiornata → redirect alla **dashboard** (/).

## Configurazione Supabase (obbligatoria)

Per far funzionare il link nella email, in **Supabase Dashboard**:

1. **Authentication** → **URL Configuration**
2. In **Redirect URLs** aggiungi (in sviluppo e produzione):
   - `http://localhost:3000/reset-password` (locale)
   - `https://tuodominio.com/reset-password` (produzione)
3. **Site URL** deve essere la base della tua app (es. `https://tuodominio.com`).

Senza queste URL il redirect dopo il clic sul link nella email fallirà.

### Evitare link localhost nell’email

Se l’utente chiede il link da **localhost** (es. `http://localhost:3000/forgot-password`), il link nell’email punterebbe a localhost e, cliccando da telefono o da un altro PC, darebbe errore. L’app usa **`NEXT_PUBLIC_APP_URL`**: se la imposti (es. in Vercel o in `.env.local`), i link nelle email di recupero (e conferma iscrizione) useranno sempre quell’URL. In produzione imposta ad es. `NEXT_PUBLIC_APP_URL=https://tuodominio.com`. Vedi anche `docs/AUTH_EMAIL_ENTERPRISE_E_REDIRECT.md`.

## Sicurezza (enterprise)

- **Cooldown**: dopo "Invia link" non si può rinviare per **60 secondi** (stesso indirizzo), per limitare abuso e spam.
- **Messaggio generico**: dopo l’invio si mostra sempre lo stesso messaggio di successo, senza indicare se l’email è registrata (evita enumerazione utenti).
- **Link monouso**: il link nella email è a uso singolo; dopo l’impostazione della nuova password non è più valido.
- **Validazione**: nuova password minimo 6 caratteri; obbligatoria conferma password; stesso stile e validazione del login/registrazione.

## File coinvolti

- **app/login/page.jsx** – link "Password dimenticata?" (solo in modalità login)
- **app/forgot-password/page.jsx** – form email + `resetPasswordForEmail` + cooldown
- **app/reset-password/page.jsx** – gestione token da URL, form nuova password, `updateUser({ password })`
- **lib/i18n.js** – chiavi IT/EN per tutto il flusso

## Per sbloccare subito un utente (Zongaro Nicolò)

1. L’utente va su **Login** → **Password dimenticata?**.
2. Inserisce la sua **email** (quella con cui è registrato).
3. Clicca **Invia link**.
4. Controlla la **casella email** (e cartella spam) e clicca sul link ricevuto.
5. Imposta una **nuova password** (e conferma) → salva.

Se non riceve l’email: verificare in Supabase **Authentication** → **Users** che l’email sia corretta e che l’utente esista; controllare **Authentication** → **Email Templates** (template "Reset password"); verificare che in **Redirect URLs** ci sia l’URL di produzione (es. `https://.../reset-password`).

---

## Se non arriva nessuna email (conferma o recupero password)

1. **Controlla spam / posta indesiderata**  
   Le email da Supabase (`noreply@mail.app.supabase.io`) spesso finiscono lì. Cerca “Supabase” o “Conferma” / “Reset” e segnala come “Non spam” se le trovi.

2. **Attendi 2–5 minuti**  
   A volte l’invio è in coda; riprova a controllare la casella (e lo spam) dopo qualche minuto.

3. **Supabase Dashboard – Auth**  
   - **Authentication** → **Providers** → **Email**: verifica che “Confirm email” sia attivo se usi la conferma iscrizione.  
   - **Authentication** → **Email Templates**: controlla che i template “Confirm signup” e “Reset password” non siano vuoti o disabilitati.  
   - **Project Settings** → **Auth** → **SMTP**: se non è configurato Custom SMTP, Supabase usa il proprio server; alcuni provider (Gmail, Outlook, aziendali) possono bloccare o mettere in spam queste email.

4. **Usa Custom SMTP (consigliato in produzione)**  
   In **Project Settings** → **Auth** → **SMTP** configura un server email tuo (o servizi come SendGrid, Mailgun, Resend) con il **tuo dominio**. Le email partiranno da te e avranno meno probabilità di finire in spam o di essere bloccate.

5. **Utente già registrato (es. Zongaro Nicolò)**  
   Se l’utente è già in **Authentication** → **Users**, non deve registrarsi di nuovo: deve usare **Password dimenticata?** e inserire **l’email esatta** con cui è stato creato l’account. Controlla in Supabase che l’indirizzo in **Users** sia quello giusto (es. nessun .it vs .com).

6. **Riprova “Invia link”**  
   Dopo aver verificato l’email in Supabase e aver controllato spam/attesa, riprova da **Recupera password**; assicurati che l’URL dell’app sia quello di produzione (non localhost) così il link nella email punta al sito reale.
