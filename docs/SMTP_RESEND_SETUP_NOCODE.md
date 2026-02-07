# Configurare SMTP con Resend (guida no-code)

Usa questa guida per far arrivare le email di recupero password. Resend è gratuito fino a 3000 email/mese.

---

## Passo 1: Account Resend

1. Vai su **https://resend.com** e clicca **Sign up**.
2. Registrati con **info.aifootballab@gmail.com** (o la stessa email che hai messo in Supabase come “Sender email”).
3. Entra nella dashboard.

---

## Passo 2: Creare la API Key (questa sarà la “password” SMTP)

1. Nel menu a sinistra clicca **API Keys** (chiavi API).
2. Clicca **Create API Key**.
3. Dai un nome, es. `Supabase Auth`.
4. Clicca **Add**.
5. **Copia subito** la chiave che appare (tipo `re_123abc...`). Resend la mostra una sola volta: se la perdi devi crearne un’altra.

---

## Passo 3: Verificare il dominio (o usare il dominio di test)

- Se vuoi che le email partano da **info.aifootballab@gmail.com**, su Resend devi **verificare il dominio** (es. `aifootballab.com` o quello che usi). In dashboard: **Domains** → Add domain → segui i passi (aggiungere record DNS).
- In alternativa, Resend ti dà un **dominio di test** (es. `onboarding@resend.dev`) per provare subito; le email vanno bene ma il mittente sarà @resend.dev. Per produzione è meglio verificare il tuo dominio.

Per **fare subito una prova** puoi usare il dominio di test: in Supabase come “Sender email” metti l’indirizzo che Resend ti assegna per il dominio di test (lo trovi in Resend in **Domains** o nelle email di benvenuto).

---

## Passo 4: Compilare Supabase (Authentication → E-mail → Impostazioni SMTP)

Apri la pagina che hai in screenshot e compila così:

| Campo | Cosa scrivere |
|--------|----------------|
| **Sender email address** | Lascia `info.aifootballab@gmail.com` (o l’indirizzo del dominio verificato su Resend). Se usi il dominio di test Resend, metti l’indirizzo che ti dà Resend. |
| **Sender name** | `AI Football Lab` (o il nome che vuoi vedere come mittente) |
| **Host** | `smtp.resend.com` |
| **Port number** | `465` (va bene così) |
| **Username** | `resend` (esattamente così, tutto minuscolo) |
| **Password** | Incolla la **API Key** che hai copiato da Resend (es. `re_xxxxxxxx...`) |
| **Minimum interval per user** | Lascia `60` |

Poi:

1. Clicca **Salva le modifiche** (o **Save**).
2. Attiva il toggle **Abilita SMTP personalizzato** se non è già attivo.

---

## Passo 5: Verifica

1. Vai sulla tua app → pagina **Recupera password**.
2. Inserisci la tua email e clicca **Invia link**.
3. Controlla la posta (e la cartella **Spam**): dovrebbe arrivare l’email con il link per reimpostare la password.

---

## Riepilogo valori da copiare in Supabase

- **Sender name:** `AI Football Lab`
- **Host:** `smtp.resend.com`
- **Port:** `465`
- **Username:** `resend`
- **Password:** *(la API Key di Resend, es. re_...)*

Se qualcosa non va, controlla in Supabase **Authentication → Logs** che dopo “Invia link” compaia un evento **mail.send**.
