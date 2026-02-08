# Audit Supabase: diagnostic e stile squadra (Attilio Mazzetti)

**Data audit**: 2026-02-08  
**Oggetto**: Verifica perché il diagnostic non mostra "Contrattacco" nonostante l’utente lo abbia impostato in Gestione formazione.

---

## 1. Risultato audit

In Supabase risultano **due profili** con nome "Attilio":

| user_id (short) | first_name | team_name | formazione | team_playing_style (Gestione formazione) | Ha diagnostic in cache? |
|-----------------|------------|-----------|------------|------------------------------------------|--------------------------|
| `66152cb2...` | attilio | **natural born game** | 4-1-2-3 | **contrattacco** ✅ | **No** (0 righe in `user_diagnostic_cache`) |
| `357c0b71...` | Attilio | **Juve** | 5-3-2 | **null** (nessuna riga in `team_tactical_settings`) | **Sì** (generated_at 2026-02-08 18:09:27) |

---

## 2. Conclusione

- **Contrattacco è salvato correttamente** in Supabase sull’account **attilio / natural born game** (`team_tactical_settings.team_playing_style = 'contrattacco'`).
- Il **diagnostic salvato** (dopo i due click su "Aggiorna analisi") appartiene all’account **Attilio / Juve**, che **non ha alcuna riga** in `team_tactical_settings`. Per questo account lo stile squadra non è mai stato salvato da Gestione formazione (o è stato salvato da un altro profilo).
- Sul profilo **natural born game** (dove c’è contrattacco) non risulta mai premuto "Aggiorna analisi": non c’è riga in `user_diagnostic_cache` per quel `user_id`.

Quindi:
- **Se usi l’account Juve**: vai in **Gestione formazione**, imposta **Stile squadra → Contrattacco** e salva, poi premi di nuovo **Aggiorna analisi** in dashboard. Da quel momento il diagnostic per Juve includerà "Contrattacco".
- **Se usi l’account natural born game**: lì contrattacco c’è già; premi **Aggiorna analisi** dalla dashboard (con quel profilo loggato) per generare il diagnostic con contrattacco incluso.

---

## 3. Bug corretto nel codice

Nel diagnostic veniva mostrato **"Stile squadra: 5-3-2"** quando `team_playing_style` era null, perché si usava la **formazione** come fallback. Il modulo (5-3-2) e lo stile (es. Contrattacco) sono cose diverse. È stato corretto in `lib/diagnosticBuilder.js`: se `team_playing_style` è assente si scrive **"non impostato"** (o "not set" in EN) invece della formazione.

---

## 4. Query di verifica (Supabase)

```sql
-- Profili Attilio con formazione, stile e diagnostic
SELECT 
  p.user_id,
  p.first_name,
  p.team_name,
  f.formation AS formazione_salvata,
  t.team_playing_style AS stile_squadra_gestione_formazione,
  (SELECT count(*) FROM user_diagnostic_cache c WHERE c.user_id = p.user_id) AS ha_diagnostic,
  (SELECT c.generated_at FROM user_diagnostic_cache c WHERE c.user_id = p.user_id LIMIT 1) AS diagnostic_generated_at
FROM user_profiles p
LEFT JOIN formation_layout f ON f.user_id = p.user_id
LEFT JOIN team_tactical_settings t ON t.user_id = p.user_id
WHERE p.first_name ILIKE '%attilio%';
```

---

## 5. Riferimenti

- Tabella stile: `team_tactical_settings` (colonna `team_playing_style`: possibili valori `possesso_palla`, `contropiede_veloce`, `contrattacco`, `passaggio_lungo`, `vie_laterali`).
- Salvataggio stile: **Gestione formazione** → pannello impostazioni tattiche → **API** `POST /api/supabase/save-tactical-settings`.
- Cache diagnostic: `user_diagnostic_cache` (popolata da `POST /api/refresh-diagnostic` quando l’utente preme "Aggiorna analisi").
