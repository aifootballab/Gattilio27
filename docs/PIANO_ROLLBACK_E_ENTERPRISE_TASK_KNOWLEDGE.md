# Rollback e piano enterprise: Task (obiettivi) e barra conoscenza

## Parte 0 – Sicurezza (obbligatorio)

Tutte le modifiche devono rispettare i seguenti punti. In implementazione: validare input, non fidarsi del client per dati sensibili, usare sempre l’utente dal token.

### 0.1 Autenticazione e autorizzazione

- **userId**: usare **solo** l’id ottenuto da `validateToken` (o equivalente) nelle API. **Mai** prendere `user_id` da body, query o header per operazioni di scrittura o per decidere “chi” vede/modifica dati.
- **tasks/list**: già corretto (userId da token). Mantenere: generazione task e lettura `weekly_goals` solo per quell’userId.
- **save-match / update-match**: già corretto (userId da token, insert/update con quel userId). Quando si aggiunge `recommended_formation_used`, inserirlo nell’oggetto da persistere **senza** mai sovrascrivere `user_id` con valori dal body.
- **taskHelper** (server-only): riceve `userId` dalla route che ha già validato il token. Non accettare userId da parametri “esterni” non validati (es. non passare userId da query string alla generazione task).

### 0.2 Validazione input

- **recommended_formation_used** (save-match / update-match):
  - Accettare **solo** valore booleano. Se presente nel body: `if (matchData.recommended_formation_used === true)` allora impostare colonna a `true`, altrimenti (assente, null, stringa, numero, oggetto) impostare a `false` o non includere (default DB).
  - **Non** usare il valore così com’è: evitare che un client invii `"true"`, `1`, o oggetti che potrebbero essere serializzati male. Whitelist: solo `=== true` → true, tutto il resto → false.
- **lang** (tasks/list):
  - Estrarre da header `Accept-Language` o query `?lang=`. **Whitelist**: solo `'it'` e `'en'`. Se valore non in whitelist, fallback a `'it'` (o `'en'` se preferite). **Nessuna** concatenazione di `lang` in query SQL o in stringhe esposte (evitare injection). In taskHelper usare `lang` solo come chiave per `translations[lang]` (oggetto statico).
- **week_start_date** (tasks/list): già validato (formato YYYY-MM-DD, non futura, non oltre 1 anno). Mantenere validazione.

### 0.3 Dati self-reported e “trust”

- **recommended_formation_used** è un dato **autodichiarato** dall’utente (ha usato la formazione consigliata). Un utente malevolo può inviare `true` senza averlo fatto → l’obiettivo si completa comunque. È una scelta di prodotto:
  - **Accettabile** se l’obiettivo è gamification/engagement e non ha premi esterni critici. Documentare in sicurezza che il flag è “honor system”.
  - Se in futuro servisse anti-abuse: si potrebbe (solo server-side) confrontare `formation_played` con un “recommended formation” salvato in sessione/analisi, ma richiede design aggiuntivo. Per questa fase: validazione stretta (solo boolean) + RLS su `matches` (utente vede/salva solo le proprie partite) è sufficiente.

### 0.4 RLS e scope dati

- **matches**: RLS già per `auth.uid() = user_id`. La nuova colonna `recommended_formation_used` non richiede policy aggiuntive; le policy esistenti si applicano alla riga intera.
- **weekly_goals**: RLS per `user_id`. La generazione task usa service role (inserisce per conto dell’utente); il re-fetch dopo insert deve essere con token utente: verificare che le policy permettano SELECT sulle righe appena inserite (stesso `user_id`).
- **credit_transactions**: in taskHelper, il conteggio per `use_ai_recommendations` deve usare **solo** `userId` passato dalla route (dal token). Query: `.eq('user_id', userId)` — nessun altro filtro da input utente. Whitelist fissa per `description` (es. `['generate-countermeasures','analyze-match','assistant-chat']`) definita nel codice, **mai** da request.

### 0.5 Rate limiting e DoS

- **tasks/list** e **ai-knowledge**: già protetti da rate limit. Mantenerli.
- **save-match**: già protetto. Aggiungere `recommended_formation_used` non aumenta superficie attacco; il payload resta validato (dimensione, tipi, whitelist boolean).

### 0.6 taskHelper (server-side)

- Nessun input utente diretto oltre `userId` e `week` (entrambi già validati dalla route). Parametro `lang`: ricevuto dalla route, validato in whitelist prima di passarlo.
- Le stringhe per i task vengono da `translate(key, lang, params)` con `key` e `params` generati nel codice (nessuna key da client). Evitare di passare chiavi o parametri da request a `translate`.
- Query Supabase: sempre con client service role e `userId` dalla chiamata; nessuna concatenazione di stringhe utente nelle query.

### 0.7 Checklist implementazione sicurezza

- [ ] save-match: `recommended_formation_used` solo se `matchData.recommended_formation_used === true`, altrimenti false/default.
- [ ] tasks/list: `lang` in whitelist `['it','en']`; default se assente o non valido.
- [ ] taskHelper: `lang` usato solo per `translations[lang]`; nessun userId da body/query.
- [ ] Conteggio use_ai_recommendations: whitelist fissa di `description` nel codice; userId solo da parametro (token).
- [ ] update-match (se modificato): stesse regole di save-match per `recommended_formation_used` e userId.

---

## Parte 1 – Rollback

### 1.1 Cosa si intende per rollback

- **Non** eliminare le funzionalità Task e Conoscenza IA: restano in prodotto.
- **Rollback** = avere uno **stato reversibile e sicuro** prima di applicare le correzioni enterprise (branch, tag, script SQL reversibili, feature flag se necessario).

### 1.2 Strategia rollback consigliata

1. **Git**
   - Creare un **tag** prima di qualsiasi modifica:  
     `git tag -a pre-enterprise-task-knowledge-YYYYMMDD -m "Stato prima correzioni task e knowledge"`  
     e push del tag.
   - Lavorare su **branch** (es. `fix/enterprise-task-knowledge`). Merge in `master` solo dopo test e review.

2. **Supabase**
   - Le modifiche DB vanno in **migration incremental** (solo ADD, niente DROP di colonne/tabelle in uso).
   - Per ogni migration aggiungere in `docs/` o in commento SQL uno **script di rollback** (es. rimozione colonna/tabella aggiunta), da eseguire **solo** in caso di rollback esplicito.
   - **Non** rieseguire `rollback_ai_knowledge.sql` in produzione se Task e barra conoscenza sono già live (quello script droppa `weekly_goals` e colonne AI knowledge).

3. **Codice**
   - Nessun “revert” totale del codice attuale: si **corregge in place** (task reali, i18n, effect barra).  
   - In caso di problemi post-deploy: revert dei commit sul branch/master e redeploy; DB lasciato com’è se le migration sono additive.

4. **Checklist pre-deploy**
   - Tag creato e pushato.
   - Branch di fix creato.
   - Migration SQL testate in staging/branch DB.
   - Test: generazione task, aggiornamento progresso (inclusi i tre tipi oggi “non reali”), barra conoscenza, lingua EN/IT.

---

## Parte 2 – Modifiche Supabase

### 2.1 Obiettivi “reali”: cosa serve in DB

| Goal type                     | Fonte dati attuale                    | Cosa serve per renderlo “reale” |
|------------------------------|----------------------------------------|----------------------------------|
| `complete_matches`           | `matches.data_completeness = 'complete'` | Già coperto, nessuna modifica.   |
| `reduce_goals_conceded`      | `matches` (team_stats / result)        | Già coperto.                     |
| `improve_possession`        | `matches.team_stats.possession`        | Già coperto.                     |
| `increase_wins`              | `matches.result`                      | Già coperto.                     |
| `improve_defense`            | Oggi non calcolato                    | Derivare da `matches.formation_played` (liste formazioni “difensive”). Nessuna nuova colonna. |
| `use_recommended_formation`  | Oggi non tracciato                    | Tracciare “ha usato formazione consigliata in questa partita”. **Nuova colonna** (vedi sotto). |
| `use_ai_recommendations`     | Oggi non tracciato                    | Contare utilizzi da **`credit_transactions`** (usage in settimana). Nessuna nuova colonna. |

### 2.2 Migration 1: `matches.recommended_formation_used` (solo additive)

- **File**: `migrations/add_matches_recommended_formation_used.sql`
- **Contenuto**:
  - `ALTER TABLE matches ADD COLUMN IF NOT EXISTS recommended_formation_used BOOLEAN DEFAULT false;`
  - `COMMENT ON COLUMN matches.recommended_formation_used IS 'True se l''utente ha indicato di aver usato la formazione consigliata (obiettivo settimanale)';`
- **Rollback** (solo se necessario, da non fare in produzione “a cuor leggero”):
  - `ALTER TABLE matches DROP COLUMN IF EXISTS recommended_formation_used;`

Nessun’altra nuova tabella: `use_ai_recommendations` si ricava da `credit_transactions` (filtro per settimana, tipo usage, descrizioni rilevanti).

### 2.3 Verifica RLS e indici

- **weekly_goals**: policy SELECT/INSERT/UPDATE/DELETE per `auth.uid() = user_id` già presenti. Dopo INSERT da service role, il re-fetch con client utente deve vedere i task: verificare che non ci siano policy che escludono righe appena inserite (es. filtri su `created_by` se presenti).
- **user_profiles**: colonne `ai_knowledge_*` già presenti; nessuna modifica necessaria per il piano.
- **credit_transactions**: già esistente; usato in sola lettura per contare utilizzi nella settimana (indice su `user_id, created_at` già adatto).

---

## Parte 3 – Piano enterprise (correzioni codice)

### 3.1 Lingua utente per i task (descrizioni in IT/EN)

- **API**  
  - `GET /api/tasks/list`: accettare lingua da header `Accept-Language` (es. `en`, `it`) o query `?lang=en`. Normalizzare a `it` o `en`.
  - Quando si chiama la generazione task (stesso endpoint o helper), passare la lingua alla funzione di generazione.

- **taskHelper.js**
  - Aggiungere parametro `lang` (es. `'it' | 'en'`) a `generateWeeklyTasksForUser(userId, supabaseUrl, serviceKey, week, lang)`.
  - In `generateTasksBasedOnData` e nel fallback hardcoded usare `translate(key, lang, params)` al posto di `translate(key, 'it', params)`.
  - Verificare che `lib/i18n.js` esponga `translations.it` e `translations.en` con tutte le chiavi `goal*` (già presenti da grep). Se `taskHelper` importa una struttura diversa, allineare l’import alla stessa struttura (it/en).

- **tasks/list route**
  - Estrarre `lang` da request (header o query), passarla a `generateWeeklyTasksForUser(..., lang)`.
  - Non generare task due volte: generazione solo quando `isCurrentWeek && (!tasks || tasks.length === 0)` come oggi.

### 3.2 TaskWidget – i18n e testi

- **Difficulty**
  - Aggiungere in i18n (IT/EN): `goalDifficultyEasy`, `goalDifficultyMedium`, `goalDifficultyHard`.
  - In TaskWidget sostituire i testi fissi `'🟢 Facile'` / `'🟢 Easy'` ecc. con `t('goalDifficultyEasy')` e simili (mantenendo emoji se desiderato).

- **Messaggi completato / fallito**
  - Usare chiavi esistenti o nuove: `goalCompleted`, `goalFailed` (IT/EN).
  - In TaskWidget: messaggio “Completato” e “Non completato” tramite `t('goalCompleted')`, `t('goalFailed')` (e data già localizzata con `lang`).

- **Altri testi**
  - Verificare che tutti i fallback (`'Obiettivi Settimanali'`, `'attivi'`, `'Nessun obiettivo questa settimana'`, ecc.) siano sostituiti da `t('key')` con chiavi presenti in it/en.

### 3.3 Progresso “reale” per i tre tipi di task

- **improve_defense**
  - In `calculateTaskProgress` (taskHelper): per `goal_type === 'improve_defense'` contare le partite nella settimana del task con `formation_played` in una lista di formazioni considerate “difensive” (es. `['5-3-2','5-4-1','3-5-2','4-1-4-1', ...]`). Includere `newMatch` se nella settimana.
  - `current_value` = numero di partite in settimana con formazione difensiva (stesso formato usato in `complete_matches` per coerenza).
  - `target_value` è già un intero (es. 2): completamento quando `current_value >= target_value`.

- **use_recommended_formation**
  - In `calculateTaskProgress`: per `goal_type === 'use_recommended_formation'` contare le partite nella settimana del task con `recommended_formation_used === true` (nuova colonna).
  - Includere `newMatch` se ha `matchData.recommended_formation_used === true` e `match_date` nella settimana.
  - Backend che salva la partita: in **save-match** (e se necessario **update-match**) accettare nel body un campo opzionale `recommended_formation_used`. **Sicurezza**: accettare **solo** se `matchData.recommended_formation_used === true` (boolean stretto); altrimenti salvare `false` o default. Mai fidarsi di stringhe o altri tipi. Persistere in `matches.recommended_formation_used`. Solo il client può impostarlo (honor system: l’utente conferma di aver usato la formazione consigliata).

- **use_ai_recommendations**
  - In `calculateTaskProgress`: per `goal_type === 'use_ai_recommendations'` contare il numero di utilizzi “consigli IA” nella settimana del task.
  - Fonte: `credit_transactions` dove `user_id = userId` (solo da token!), `type = 'usage'`, `created_at` nella finestra `[task.week_start_date, task.week_end_date]`, e `description` in una **whitelist fissa nel codice** (es. `['generate-countermeasures','analyze-match','assistant-chat']` — usare le descrizioni effettive della vostra app). **Non** costruire la whitelist da input utente. `current_value` = conteggio; `target_value` è già intero (es. 2).
  - Query: `admin.from('credit_transactions').select('id').eq('user_id', userId).eq('type', 'usage').in('description', WHITELIST_FISSA).gte('created_at', weekStart).lte('created_at', weekEnd)` e contare le righe.

### 3.4 Chiamate a updateTasksProgressAfterMatch

- **save-match** (e, se applicabile, **update-match**): già chiamano `updateTasksProgressAfterMatch`. Passare sempre l’oggetto match completo incluso il nuovo campo `recommended_formation_used` quando presente nel body, così `calculateTaskProgress` può usare `newMatch.recommended_formation_used` per il task `use_recommended_formation`.

### 3.5 AIKnowledgeBar – effect e retry

- **Problema**: `useEffect(..., [score])` ri-registra listener e interval a ogni cambio di `score`; rischio di comportamenti strani con i retry dopo `match-saved`.
- **Correzione**:
  - Rimuovere `score` dalle dipendenze dell’effect. Dipendenze possibili: `[]` (solo mount) o al massimo un ref stabile.
  - Per il confronto “score prima/dopo save”: all’arrivo dell’evento `match-saved` leggere lo score attuale da un **ref** (es. `scoreRef.current = score`) e usare quel ref dentro la closure di retry, senza che l’effect dipenda da `score`. In alternativa: un ref “matchJustSaved” che la callback di retry legge una sola volta per decidere se continuare i tentativi.
  - Mantenere un solo `setInterval` e un solo listener per mount; cleanup in unmount. Così non si creano più interval o listener quando `score` cambia.

### 3.6 Verifica taskHelper e i18n

- **taskHelper** importa `translations` da `./i18n.js`: verificare che l’export sia del tipo `{ it: {...}, en: {...} }` e che le chiavi `goal*` esistano in entrambe le lingue (già confermato per le chiavi usate). Se l’helper usa un altro path o altro formato, allineare.
- **Typo EN**: in i18n, `goalReduceGoalsConceded` EN ha "per match" invece di "per match" (ok); `goalImprovePossession` EN ha "from {from}% to {to}%" – verificare che i placeholder siano coerenti con i parametri passati (`from`, `to`).

---

## Parte 4 – Ordine di esecuzione consigliato

1. **Git**: tag + branch.
2. **Supabase**: applicare solo la migration additive `add_matches_recommended_formation_used.sql` (e documentare lo script di rollback).
3. **Backend**  
   - taskHelper: parametro `lang` e `translate(..., lang, ...)`; implementare `improve_defense`, `use_recommended_formation`, `use_ai_recommendations` in `calculateTaskProgress`; passare `newMatch` con `recommended_formation_used` dove disponibile.  
   - save-match (e update-match): accettare e salvare `recommended_formation_used`.
4. **API tasks/list**: leggere lingua e passarla a `generateWeeklyTasksForUser`.
5. **Frontend TaskWidget**: i18n per difficulty e messaggi completato/fallito; nessun testo fisso per obiettivi.
6. **Frontend AIKnowledgeBar**: effect senza dipendenza da `score` e retry basato su ref.
7. **Test**: generazione task, salvataggio partita con/senza “formazione consigliata”, utilizzi crediti, cambio lingua; verifica barra conoscenza e aggiornamento task.
8. **Test sicurezza**: (1) save-match con `recommended_formation_used: "true"` o `1` → deve essere salvato come false; (2) tasks/list con `?lang=../` o `lang=fr` → fallback a it/en; (3) nessun userId da body in nessuna route.

---

## Parte 5 – Rollback operativo (solo se serve)

- **Codice**: revert dei commit sul branch e redeploy; oppure ritorno al tag `pre-enterprise-task-knowledge-*`.
- **DB**: eseguire **solo** lo script di rollback della migration (drop colonna `recommended_formation_used`) se avete davvero bisogno di tornare indietro. **Non** eseguire `rollback_ai_knowledge.sql` se volete mantenere Task e barra conoscenza.

Fine del piano.
