# ✅ Cose da fare – Sezione “Consigli della settimana”

**Data**: 2026-01-28  
**Obiettivo**: aggiungere una sezione strategica che esce **Lunedì** e **Giovedì**, con consigli **ad hoc** per ogni cliente, basati su rosa/coach/stile e su segnali “settimana” (Konami + meta).

---

## 1) Definizione prodotto (UX)
- Sezione nuova in Dashboard: **“Consigli della settimana”**
- Update cadence: **Lun** + **Gio**
- Output: breve, operativo, “enterprise” (3 azioni massimo)

---

## 2) Dati necessari (per personalizzazione)

### Dati cliente (Supabase)
- `players` (rosa: ruoli, overall, playing_style_id, original_positions, photo_slots)
- `coaches` (allenatore attivo + competenze stile)
- `team_tactical_settings` (team_playing_style + individual_instructions)
- `team_tactical_patterns` (formation_usage, recurring_issues, last_50_matches_count)
- `matches` (solo se serve: trend recenti, completezza)
- `weekly_goals` (obiettivi della settimana)

### Dati settimana (esterni)
- **Konami-only** (hard truth): link/news/patch notes
- **Community/meta** (trend, etichettato): cosa viene percepito come “forte” (es. CPU aggressiva)

---

## 3) Logica consigli (anti-invenzione)

### Regola d’oro
Ogni consiglio deve avere **ancoraggio dati**:
- “hai questo giocatore/ruolo/stile”
- “coach ha competenza >= 70”
- “pattern storico mostra X”
Se manca, il consiglio non si scrive.

### Separazione pre-partita vs in-match
- **Pre-partita**: formazione/stile squadra/istruzioni/cambi rosa.
- **In-match**: meccaniche Konami (Pressure, Match-up, ecc.) → solo come “comandi”.

---

## 4) Output (schema JSON consigliato)
- `week_context` (fonti + breve sintesi)
- `for_you_summary` (diagnosi 1–2 righe)
- `actions` (max 3) con:
  - `type` (formation_change | playing_style | roster_adjustment | individual_instruction | in_match_mechanic)
  - `instruction` (it/en)
  - `reason` (it/en) 1 riga
  - `requires` (es. “serve un DMF”, “coach >= 70”, “solo se presente nel menu”)
- `warnings` (dati mancanti / incoerenze)

---

## 5) Implementazione (backend + frontend)
- API: `GET /api/weekly-advice` (genera/ritorna consigli personalizzati)
- Cache: breve (es. 1h) + invalidazione quando cambia rosa/coach/stile
- UI: card in Dashboard + bottone “Aggiorna ora”
- Scheduler (opzionale): job lun/giov che aggiorna “week_context”

---

## 6) Audit e qualità dati (bloccanti)
- Fix/gestione `individual_instructions` che puntano a `player_id` inesistenti (orphan)
- Fix “position” che contiene uno stile (es. `Opportunista`) invece di una posizione
- Gestire `team_playing_style` null (fallback + CTA “imposta stile squadra”)

