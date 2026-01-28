# 📌 Documentazione – Sezione “Consigli della settimana”

**Data**: 2026-01-28  
**Obiettivo**: fornire consigli **personalizzati** (ad hoc per cliente) che si aggiornano ogni **Lunedì** e **Giovedì**, tenendo conto dei cambi “settimana” (pool/pack + meta/CPU aggressiva) senza inventare informazioni o voci di menu.

---

## 1) Cos’è (in parole semplici)

È una card/sezione in Dashboard che dice:
- **Cosa sta succedendo questa settimana** (fonti ufficiali + trend)
- **Cosa significa per te** (in base alla tua rosa e al tuo allenatore)
- **Cosa fare adesso** (3 mosse concrete)

---

## 2) Principio “enterprise” (anti-invenzione)

Ogni consiglio deve avere un **ancoraggio dati**:
- dati cliente (rosa/coach/stile/pattern) oppure
- fonte ufficiale (Konami) per le meccaniche in-match

Se manca l’ancoraggio, il consiglio non si scrive.

---

## 3) Input dati (Supabase)

### Tabelle
- `players` (ruolo, overall, playing_style_id, original_positions, photo_slots)
- `coaches` (allenatore attivo + competenze stile)
- `team_tactical_settings` (team_playing_style + individual_instructions)
- `team_tactical_patterns` (formation_usage, recurring_issues, last_50_matches_count)
- `weekly_goals`

### Incoerenze da gestire (se presenti)
- `team_playing_style` null → mostra CTA “Imposta stile squadra”
- `individual_instructions` con `player_id` inesistenti → mostra CTA “Riallinea istruzioni”
- `players.position` con valori “stile” (es. Opportunista) → bloccare/normalizzare in UI

---

## 4) Input “settimana” (esterni)

### A) Konami-only (hard truth)
Usare solo fonti ufficiali per:
- patch notes / info detail
- descrizione meccaniche (Pressure, Call for Pressure, Match-up, ecc.)

Documento di riferimento: `KONAMI_MECCANICHE_UFFICIALI_EFOOTBALL.md`.

### B) Trend community (se usato)
Facoltativo: usato come “segnale”, sempre etichettato come *trend*, mai come certezza.

---

## 5) Output consigli (schema JSON suggerito)

```json
{
  "week_context": {
    "title": { "it": "...", "en": "..." },
    "updated_at": "2026-01-28T00:00:00Z",
    "sources": [
      { "type": "konami", "title": "...", "url": "..." },
      { "type": "community", "title": "...", "url": "...", "note": "trend" }
    ]
  },
  "for_you_summary": { "it": "...", "en": "..." },
  "actions": [
    {
      "type": "formation_change | playing_style | roster_adjustment | individual_instruction | in_match_mechanic",
      "instruction": { "it": "...", "en": "..." },
      "reason": { "it": "...", "en": "..." },
      "priority": "high | medium | low",
      "requires": ["..."]
    }
  ],
  "warnings": { "it": ["..."], "en": ["..."] }
}
```

---

## 6) UI (Dashboard)

Card “Consigli della settimana”:
- riga 1: “Cosa sta cambiando”
- riga 2: “Per te”
- riga 3: 3 azioni (high/medium/low)
- link “Fonti”
- bottone “Aggiorna ora”

---

## 7) Scheduling (Lun/Gio)

Due opzioni:
- **Manuale**: bottone “Aggiorna ora” genera e salva il contesto settimana e calcola i consigli.
- **Automatico**: job lun/giov che aggiorna `week_context`, mentre i consigli restano personalizzati (calcolati su richiesta).

---

## 8) Sicurezza e robustezza

- Non usare dati non verificati per affermazioni specifiche (stesso principio dei prompt IA già implementati).
- Se una voce non esiste nel menu dell’utente, non citarla come “impostazione”.
- Separare sempre: **pre-partita** (configurazioni) vs **in-match** (comandi).

