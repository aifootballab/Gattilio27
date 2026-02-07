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
