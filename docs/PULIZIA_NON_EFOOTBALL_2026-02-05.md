# Pulizia Supabase – Rimozione elementi non eFootball

**Data:** 5 Febbraio 2026  
**Migrazione:** `cleanup_non_efootball_tables`

---

## Incongruenze individuate

Il database Supabase conteneva **tabelle e trigger** provenienti da altri progetti (gamification, COD, sistemi crediti alternativi) che **non sono mai referenziate** dal codice eFootball Coach.

### Perché erano presenti

1. **Database condiviso** – Lo stesso progetto Supabase è stato usato per più app o esperimenti
2. **Migrazioni cumulative** – Le migrazioni creano tabelle senza rimuovere quelle obsolete
3. **Trigger su auth.users** – Alla registrazione venivano popolate tabelle gamification che l'app non usa

### Verifica effettuata

- **Grep sul codice**: nessun file `.js` / `.jsx` fa `from('profiles')`, `from('user_credits')`, `from('user_avatars')`, ecc.
- **Sistema crediti**: l'app usa solo `user_credit_usage` (periodo mensile), non `user_credits` / `credit_transactions`
- **Profilo**: l'app usa solo `user_profiles` (nome, squadra, AI knowledge), non `profiles` (rank, xp)

---

## Elementi rimossi

### Tabelle eliminate

| Tabella | Motivo | Riferimento nel codice |
|---------|--------|------------------------|
| **profiles** | Gamification (username, rank, xp). Profilo reale in user_profiles | Nessuno |
| **user_credits** | Sistema crediti alternativo (balance, tier). L'app usa user_credit_usage | Nessuno |
| **credit_transactions** | Storico transazioni del sistema user_credits | Nessuno |
| **user_avatars** | Catalogo avatar gamification (7 righe) | Nessuno |
| **user_avatar_selections** | Scelta avatar utente | Nessuno |
| **user_achievements** | Achievements/trofei (vuota) | Nessuno |
| **user_ai_knowledge** | Tabella legacy per knowledge score (vuota). Score in user_profiles | Nessuno |
| **ai_tasks** | Task IA da match (vuota). L'app usa weekly_goals | Nessuno |

### Trigger rimossi

| Trigger | Tabella | Effetto |
|---------|---------|---------|
| **create_profile_on_signup** | auth.users | Inseriva in profiles alla registrazione |
| **init_credits_on_signup** | auth.users | Inseriva in user_credits alla registrazione |
| **trg_update_credits_balance** | credit_transactions | Aggiornava user_credits.balance |
| **trigger_calculate_knowledge_score** | user_ai_knowledge | Calcolava score su tabella non usata |

### Funzioni rimosse

- `create_profile_for_user()`
- `initialize_user_credits()`
- `update_user_credits_balance()`
- `calculate_ai_knowledge_score()`

---

## Tabelle eFootball rimanenti (12)

| Tabella | Uso |
|---------|-----|
| playing_styles | Stili di gioco (lookup) |
| players | Rosa giocatori |
| formation_layout | Formazione e slot |
| coaches | Allenatori |
| team_tactical_settings | Impostazioni tattiche |
| opponent_formations | Formazioni avversarie |
| user_profiles | Profilo utente + AI knowledge |
| matches | Partite |
| team_tactical_patterns | Pattern tattici (ultime 50 partite) |
| weekly_goals | Obiettivi settimanali |
| user_credit_usage | Crediti mensili (OpenAI) |
| player_performance_aggregates | Aggregati performance (vuota, TODO) |

---

## Impatto su nuovi utenti

**Prima della pulizia:** Alla registrazione venivano create righe in `profiles` e `user_credits`.

**Dopo la pulizia:** Nessuna riga aggiuntiva alla registrazione. L'app continua a funzionare perché:

- **user_profiles** – Creata al primo salvataggio da Impostazioni profilo
- **user_credit_usage** – Creata al primo utilizzo di una funzione IA (recordUsage fa upsert)

---

## Riferimenti

- `docs/AUDIT_COMPLETO_TABELLE_FLUSSI_2026-02-05.md` – Audit completo tabelle e flussi
- `docs/PROFILES_VS_USER_PROFILES_2026-02-05.md` – Differenza profiles vs user_profiles (ora profiles rimosso)
