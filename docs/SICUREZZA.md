# Sicurezza – Riepilogo

Riepilogo misure di sicurezza dell’app e avvisi Supabase da considerare.

---

## Auth e recupero password (app)

- **Cooldown** (60 s) su “Invia link” in forgot-password → limita abuso e spam.
- **Messaggio generico** dopo l’invio → nessuna indicazione se l’email è registrata (anti-enumerazione).
- **Link monouso** nel reset password → dopo l’uso il link non è più valido.
- **Validazione** password (min 6 caratteri, conferma obbligatoria).
- **Redirect:** uso di `NEXT_PUBLIC_APP_URL` per i link nelle email (nessun segreto esposto; l’URL pubblico è lecito in frontend).

Dettagli: `docs/RECUPERO_PASSWORD.md`, `docs/AUTH_EMAIL_ENTERPRISE_E_REDIRECT.md`.

---

## Variabili d’ambiente

- **Mai in frontend:** `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `CREDITS_ACCREDIT_API_KEY` (solo server-side).
- **Pubbliche (ok):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL` (URL pubblico, non segreto).

---

## Avvisi Supabase (Security Advisors)

Controlla periodicamente **Supabase Dashboard** → avvisi di sicurezza. In particolare:

### 1. Leaked password protection (Auth)

- **Problema:** protezione contro password compromesse (HaveIBeenPwned) disabilitata.
- **Azione:** in **Authentication** → **Providers** → **Email** (o **Auth** → impostazioni) abilita **Leaked password protection**.
- **Riferimento:** [Password strength and leaked password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

### 2. Function search_path (Database)

- **Problema:** alcune funzioni PostgreSQL hanno `search_path` non fissato (rischio di chiamate involontarie a oggetti in altri schema).
- **Azione:** per ogni funzione segnalata imposta esplicitamente `search_path` (es. `SET search_path = public`) nella definizione della funzione.
- **Riferimento:** [Database linter – function search path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable).

Funzioni attualmente segnalate (da sistemare quando possibile):  
`update_coaches_updated_at`, `update_opponent_formations_updated_at`, `set_initial_division`, `update_user_credit_usage_updated_at`, `update_weekly_goals_updated_at`, `update_team_tactical_settings_updated_at`, `atomic_slot_assignment`, `calculate_profile_completion_score`, `cleanup_orphan_individual_instructions`, `update_matches_updated_at`.

---

## Checklist rapida

- [ ] In produzione: **Site URL** e **Redirect URLs** in Supabase = dominio reale (no localhost).
- [ ] In produzione: **NEXT_PUBLIC_APP_URL** impostata (Vercel / env).
- [ ] **Leaked password protection** abilitata in Supabase Auth (consigliato).
- [ ] Chiavi segrete solo server-side; mai `NEXT_PUBLIC_` per API key o service role.
- [ ] Custom SMTP e template email (opzionale ma consigliato per deliverability e branding).
