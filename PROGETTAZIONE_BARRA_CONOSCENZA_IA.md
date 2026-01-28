# 🧠 Barra Conoscenza IA (documentazione mantenuta)

**Ultimo aggiornamento**: 2026-01-28  
**Stato**: ✅ Attivo / allineato al codice

Questo documento descrive **come funziona davvero** la Barra Conoscenza IA in produzione (calcolo, fonti dati, aggiornamento, cache).

---

## 🎯 Scopo (UX / vendita)

- Comunicare “quanto l’IA conosce il cliente” e cosa manca per rendere i consigli più precisi.
- Guidare onboarding (profilo, rosa, partite) con una progressione chiara.

---

## 🗄️ Fonti dati (Supabase)

- `user_profiles`
  - `ai_knowledge_score`, `ai_knowledge_level`, `ai_knowledge_breakdown`, `ai_knowledge_last_calculated`
- `team_tactical_patterns`
  - `formation_usage`, `playing_style_usage`, `recurring_issues`, `last_50_matches_count`
- `players`
- `team_tactical_settings`
- `matches`
- `coaches`
- `weekly_goals`

---

## 🧮 Formula e breakdown (allineati al codice)

Lo score totale è la somma dei componenti (cap a 100).

- **Profilo**: max 20
- **Rosa**: max 25
- **Partite**: max 30 (3 punti per match, fino a 10 match)
- **Pattern**: max 15
- **Allenatore**: max 10
- **Utilizzo**: max 10
- **Successi**: max 15

L’API ritorna sempre un breakdown con le chiavi:

```json
{
  "profile": 0,
  "roster": 0,
  "matches": 0,
  "patterns": 0,
  "coach": 0,
  "usage": 0,
  "success": 0
}
```

---

## 🧩 Pattern (calcolo reale)

Fonte: `team_tactical_patterns`.

- **+10** se almeno uno tra:
  - `formation_usage` non vuoto
  - `playing_style_usage` non vuoto
  - `recurring_issues` non vuoto
- **+5** bonus se `last_50_matches_count >= 5`

---

## 🧠 Utilizzo (stima attuale)

Attualmente non esiste un tracking “vero” dei messaggi chat in DB.  
Il punteggio “Utilizzo” è una **stima** basata su dati già disponibili:

- `interactions` = \(matches + players + completedGoals\)
- `chat_messages` stimati = \(\lfloor matches / 3 \rfloor\)

Se serve precisione per analytics/vendita, va introdotto un event log dedicato (decisione prodotto separata).

---

## 🔄 Quando si aggiorna (flusso reale)

### Pattern tattici
Calcolati e salvati in `team_tactical_patterns`:
- dopo `POST /api/supabase/save-match`
- dopo `POST /api/supabase/update-match`

### AI Knowledge score
Per evitare race condition, l’aggiornamento è **sequenziale**:
1) calcolo + upsert pattern  
2) ricalcolo score + update `user_profiles.ai_knowledge_*`

### UI
La dashboard chiama `GET /api/ai-knowledge` e visualizza:
- percentuale
- livello (beginner/intermediate/advanced/expert)
- breakdown (dettagli)

---

## 🧊 Cache (comportamento in UX)

`GET /api/ai-knowledge` usa una cache “soft” di 5 minuti basata su `ai_knowledge_last_calculated`.

Cosa aspettarsi:
- dopo un’azione rilevante (save/update match) lo score viene aggiornato **in background**
- se apri la dashboard entro la finestra di cache, potresti vedere ancora valori vecchi per qualche minuto

---

## ✅ Troubleshooting rapido

- **Pattern resta 0/15**:
  - verificare che esista una riga in `team_tactical_patterns` per l’utente
  - verificare che le partite abbiano `formation_played` / `playing_style_played` popolati (altrimenti `formation_usage`/`playing_style_usage` rimangono vuoti)
- **Score non cambia**:
  - può essere cache (< 5 min)
  - verificare `user_profiles.ai_knowledge_last_calculated`

