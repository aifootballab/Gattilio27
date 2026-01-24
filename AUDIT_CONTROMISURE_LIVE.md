# Audit Contromisure Live – Allineamento dati, priorità, UX pre-partita

**Data**: 24 Gennaio 2026  
**Scope**: Contromisure Live (`/contromisure-live`), API `generate-countermeasures`, `countermeasuresHelper`, flusso dati titolari/riserve.

---

## 1. Contesto e obiettivi utente

- **Tempo pre-partita**: Il cliente ha **poco tempo** prima del fischio. Servono **azioni immediate**, non lunghe spiegazioni.
- **Output desiderato**:
  - **Contromisure tattiche** (linea, pressing, possesso, eventuale cambio formazione/stile).
  - **Cambi suggeriti** tra **titolari** e **riserve** (rosa salvata dal cliente), con motivazione chiara.
- **Problema attuale**: L’AI **“allucina”** sui giocatori: indica in panchina chi è titolare (o viceversa). Causa: **mancato allineamento** titolari/riserve tra DB, API e prompt.

---

## 2. Allineamento dati – Dove sta l’errore

### 2.1 Fonte di verità: `players.slot_index`

- **`slot_index` 0–10** → **titolare** (in campo).
- **`slot_index` NULL** → **riserva** (panchina).
- Assegnazione tramite `assign-player-to-slot` / `remove-player-from-slot`; persistenza in `players`.

### 2.2 Cosa passa a `generate-countermeasures`

| Dato | Query | Campi | Problema |
|------|--------|-------|----------|
| **Roster** | `players` | `id, player_name, position, overall_rating, base_stats, skills, com_skills, playing_style_id` | **Manca `slot_index`**. Non si distingue titolare vs riserva. |
| **Formazione** | `formation_layout` | `formation, slot_positions` | `slot_positions` = **solo schema** (coordinate slot 0–10). **Non** contiene chi è in quale slot. |
| **Formazione cliente** nel prompt | derivato da `formation_layout` | “Titolari: X” | X = `Object.keys(slot_positions).filter(0–10).length` → **sempre 11** (numero di slot). Non è la lista dei titolari. |

### 2.3 Cosa vede il prompt (`countermeasuresHelper`)

- **ROSA CLIENTE**: lista piatta `Nome - Ruolo - Overall - Skills`. **Nessuna** indicazione “titolare” / “riserva”.
- **FORMazione CLIENTE**: “Formazione: 4-3-3”, “Titolari: 11”. **Nessun** elenco “questi 11 sono i titolari”.
- **player_suggestions**: si chiede `action`: `add_to_starting_xi` | `remove_from_starting_xi`, ma **non** si fornisce chi è già in XI e chi in panchina.

**Conseguenza**: Il modello **non sa** chi è titolare e chi riserva. Deve indovinare (es. primi 11 per rating) → **allucinazioni** (“Mario in panchina” quando Mario è titolare).

---

## 3. Altri disallineamenti

### 3.1 `player_ratings` negli storico match

- **Salvataggio** (save-match): `player_ratings` può essere `{ cliente: { "Nome": { rating } }, avversario: { ... } }` (chiavi = **nomi**).
- **Utilizzo** in generate-countermeasures: `Object.entries(match.player_ratings)` trattato come `[playerId, rating]`; `roster.find(p => p.id === playerId)`. Se le chiavi sono **nomi**, il match per `id` fallisce → `playerPerformanceAgainstSimilar` con chiavi sbagliate o mancanti.
- **Rischio**: analisi “performance vs formazioni simili” non allineata a rosa reale (id vs nome).

### 3.2 Output richiesto vs uso reale

- Il prompt chiede `player_suggestions` con `player_id`, `action`, `position`, `reason`, `priority`.
- La UI mostra “Aggiungi ai titolari / Rimuovi dai titolari” + nome + posizione. Se `player_id` non corrisponde ai nostri `id` (o il modello inventa id), **nessun** collegamento robusto con la rosa reale.

---

## 4. UX e “tempo pre-partita”

- **Prompt**: Molte istruzioni (“analisi dettagliata”, “spiega perché”, “best practices community”, ecc.) → output verboso.
- **Output JSON**: `analysis.opponent_formation_analysis`, `why_weaknesses`, `reason` ovunque → **molto testo**.
- **Esigenza**: Andare **dritti al punto**: poche righe, **contromisure tattiche** + **cambi titolari ↔ riserve** concreti, con motivazione breve.

---

## 5. Riepilogo problemi

| # | Problema | Impatto |
|---|----------|---------|
| 1 | Roster senza `slot_index` | AI non sa chi è titolare / riserva |
| 2 | Nessun elenco esplicito “TITOLARI” / “RISERVE” nel prompt | Allucinazioni su chi inserire/togliere |
| 3 | “Titolari: 11” da `slot_positions` | Fuorviante: sono gli slot, non i giocatori |
| 4 | `player_ratings` per nome vs uso per `id` | Performance vs formazioni simili inaffidabile |
| 5 | Output troppo lungo e analitico | Poco adatto a uso pre-partita, tempo limitato |

---

## 6. Raccomandazioni (da implementare solo dopo tuo via)

### 6.1 Dati e prompt (allineamento titolari/riserve)

1. **Roster**  
   - Includere `slot_index` nella query `players` per generate-countermeasures.  
   - In passaggio a `generateCountermeasuresPrompt`: inviare **liste distinte** `titolari` e `riserve` (es. titolari = `slot_index` 0–10, riserve = `null`).

2. **Prompt**  
   - Aggiungere sezioni esplicite tipo:
     - `TITOLARI (in campo): [id] Nome - Ruolo - Overall - Slot`
     - `RISERVE (panchina): [id] Nome - Ruolo - Overall`
   - Istruzione chiara: “Usa **solo** queste liste per `add_to_starting_xi` / `remove_from_starting_xi`. Non dedurre da overall o ordine.”

3. **Formazione cliente**  
   - “Titolari” = giocatori con `slot_index` 0–10 (e magari slot → ruolo da `formation_layout` se utile).  
   - Non usare il conteggio delle chiavi di `slot_positions` come “numero titolari”.

### 6.2 Output e UX pre-partita

4. **Prompt**  
   - Istruzioni per risposta **breve**: contromisure tattiche essenziali + cambi suggeriti; **motivazioni in 1–2 righe**.  
   - Opzionale: sezione dedicata “PRE-PARTITA – azioni prioritarie” (max N punti).

5. **Schema JSON**  
   - Valutare blocchi compatti, es. `tactical_quick` (linea, pressing, possesso, 1 riga ciascuno) e `swaps` (sostituzioni titolare ↔ riserva con motivazione breve).  
   - Mantenere `player_id` allineato ai nostri `id` (e solo per giocatori in rosa).

### 6.3 Storico e performance

6. **`player_ratings`**  
   - Decidere formato univoco (id vs nome).  
   - Se si usano i **nomi**: in generate-countermeasures fare match nome → `id` (o assimilarlo in un layer unico) prima di costruire `playerPerformanceAgainstSimilar`.  
   - Documentare in codice come vengono interpretati `player_ratings` (cliente/avversario, flat, ecc.).

---

## 7. Checklist audit

- [x] Roster: campi utilizzati e presenza di `slot_index`
- [x] Formazione: uso di `formation_layout` vs `players.slot_index`
- [x] Prompt: esistenza di TITOLARI / RISERVE espliciti
- [x] `player_suggestions`: coerenza con titolari/riserve e uso di `player_id`
- [x] `player_ratings` negli storico: formato (nome/id) vs uso in generate-countermeasures
- [x] Lunghezza e stile output vs tempo pre-partita

---

## 8. File toccati (per implementazione futura)

| File | Modifiche suggerite |
|------|---------------------|
| `app/api/generate-countermeasures/route.js` | Query `players` con `slot_index`; costruire `titolari` / `riserve`; passarli all’helper. |
| `lib/countermeasuresHelper.js` | Sezioni TITOLARI/RISERVE nel prompt; regole per `add_to_starting_xi` / `remove_from_starting_xi`; prompt “pre-partita” breve. |
| `app/contromisure-live/page.jsx` | Eventuale riordino UI (es. “azioni subito” in cima); nessun cambio logica finché dati non allineati. |

---

---

## 9. Implementazione (24 gen 2026)

Le raccomandazioni §6.1 (dati + prompt) e parte di §6.3 (player_ratings) sono state implementate:

- **Route** `generate-countermeasures`: query `players` con `slot_index`; costruzione `titolari`/`riserve`; parsing `player_ratings` (cliente/nome→id); passaggio a helper.
- **Helper**: sezioni TITOLARI/RISERVE nel prompt; istruzioni obbligatorie per `add_to_starting_xi` (solo riserve) e `remove_from_starting_xi` (solo titolari).

**Rollback**: vedere `ROLLBACK_CONTROMISURE.md` (branch `backup/pre-contromisure-2026-01-24`, copie in `rollback/`).

**Fix 500 (ReferenceError)**: `titolari` / `riserve` / `hasTitolariRiserve` in helper definiti **prima** dell’uso (spostati subito dopo `opponentText`).

---

## 10. Verifica allineamento (controllo ricorrente)

| Livello | Cosa | Stato |
|--------|------|-------|
| **Supabase** | `players`: `id`, `slot_index`, `player_name`, `position`, `overall_rating`, `skills`, `com_skills` | ✅ usati in route |
| | `formation_layout`: `formation`, `slot_positions` | ✅ |
| | `team_tactical_settings`: `team_playing_style`, `individual_instructions` | ✅ |
| | `coaches`: `playing_style_competence`, `stat_boosters`, `connection`, `is_active` | ✅ |
| | `opponent_formations`: `*` (formation_name, playing_style, …) | ✅ |
| | `matches`: `player_ratings`, `opponent_formation_id`, … | ✅ |
| **API → Helper** | Route passa `titolari`, `riserve` in `playerPerformance` | ✅ |
| | Helper definisce e usa `titolari`/`riserve`/`hasTitolariRiserve` prima dell’uso | ✅ (fix 500) |
| **API → Frontend** | `POST /api/generate-countermeasures` con `opponent_formation_id` | ✅ contromisure-live |
| | Risposta `{ success, countermeasures }`; UI legge `analysis`, `countermeasures.*`, `player_suggestions` | ✅ |
| **player_suggestions** | `action`: `add_to_starting_xi` \| `remove_from_starting_xi`; `player_name`, `position` | ✅ UI e prompt |
