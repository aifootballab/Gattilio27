# profiles vs user_profiles – Dove sono salvati gli utenti

**Data:** 5 Febbraio 2026

---

## Problema

Nella tabella `profiles` vedi solo 1 riga (es. username "ciao"). Gli altri utenti dove sono?

---

## Risposta: due tabelle diverse

| Tabella | Scopo | Usata da eFootball | Contenuto tipico |
|---------|-------|--------------------|------------------|
| **profiles** | Gamification (rank, xp) – schema da altro progetto | ❌ No | 1 riga: "ciao" (RECRUIT, xp=0) |
| **user_profiles** | Profilo app (nome, squadra, AI knowledge) | ✅ Sì | 8 righe: Attilio, Raphael, Giovanni, Matteo... |

**Gli utenti eFootball sono in `user_profiles`**, non in `profiles`.

---

## Perché solo "ciao" in profiles?

- **profiles** è popolata dal trigger `create_profile_on_signup` su `auth.users` (alla registrazione).
- Lo schema (username, rank, xp) è da gamification/altro progetto – non eFootball.
- Il trigger è stato a lungo rotto (errore su `profiles` o `user_credits`), quindi la maggior parte degli utenti non ha mai ricevuto una riga in `profiles`.
- Solo gli utenti registrati **dopo** il fix (es. ciao@gmail.it → username "ciao") hanno una riga in `profiles`.

---

## Dove vengono salvati i dati eFootball?

1. **auth.users** (Supabase Auth): email, id – tutti gli utenti registrati.
2. **user_profiles**: first_name, last_name, team_name, ai_knowledge_score, ecc. – creato/aggiornato quando l’utente salva il profilo da **Impostazioni profilo** (`/impostazioni-profilo`).
3. **profiles**: username, rank, xp – **non usata** dall’app eFootball, solo dal trigger di signup.

---

## Codice che usa user_profiles

- `save-profile` – salva/aggiorna profilo
- `assistant-chat` – contesto persona
- `ai-knowledge` – score conoscenza IA
- `analyze-match` – contesto utente
- `save-match` – team_name per tracciabilità
- `update-match` – client_team_name
- `impostazioni-profilo` – pagina profilo
- `guida` – onboarding

**Nessun file** legge o scrive in `profiles`.

---

## Cosa è stato rimosso

- **analysis_results** – tabella COD (kills, deaths, kd_ratio, headshot_percentage, best_weapon) non usata. Eliminata con migrazione `drop_analysis_results_cod_table`.

---

## Raccomandazione

- **profiles** può essere eliminata o sostituita se non si usa gamification: il trigger va adattato per scrivere in `user_profiles` (o disattivato).
- Fino a quella modifica, `profiles` resta innocua: l’app continua a usare solo `user_profiles`.
