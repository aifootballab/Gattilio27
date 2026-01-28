# ✅ Audit Supabase (MCP) – 2026-01-28

**Metodo**: Query dirette via MCP (`execute_sql`) su schema `public`  
**Obiettivo**: trovare incoerenze dati che impattano IA/UX (rosa, coach, impostazioni, task).

---

## 1) Problema critico: `individual_instructions` con `player_id` orfani

Query (estrazione di `player_id` da `team_tactical_settings.individual_instructions` e join su `players`):
- Risultato: trovati `player_id` presenti in `individual_instructions` ma **inesistenti** in `players` per lo stesso `user_id`.

Esempio reale (utente `a2aaec95-1e8a-402f-8ff4-19711dfd2390`):
- `attacco_1` → `43a2cbe4-4898-4b47-abff-9e3040984426` (orfano)
- `attacco_2` → `b588bf63-17a7-4d79-8acf-19df0ae3fa7e` (orfano)
- `difesa_1` → `43a2cbe4-4898-4b47-abff-9e3040984426` (orfano)
- `difesa_2` → `b588bf63-17a7-4d79-8acf-19df0ae3fa7e` (orfano)

**Impatto**:
- UI può mostrare istruzioni “rotte”
- IA può basarsi su istruzioni che non corrispondono a giocatori reali

**Fix consigliato**:
- Normalizzare/validare in salvataggio: prima di salvare `individual_instructions`, verificare che ogni `player_id` esista per quell’utente.
- Tool di riparazione: endpoint/azione “Riallinea istruzioni” che rimuove o sostituisce player_id non validi.

---

## 2) Problema dati: `players.position` usato per contenere “stili”

Query: giocatori con `players.position` uguale a un nome in `playing_styles.name`.

Risultati trovati (esempi):
- Eden Hazard → `position = "Ala prolifica"` (stile, non posizione)
- A. Pirlo → `position = "Tra le linee"` (stile, non posizione)
- Kylian Mbappé → `position = "Opportunista"` (stile, non posizione)

**Impatto**:
- Suggerimenti IA e UI formazione possono diventare incoerenti
- Match di logiche basate su posizione (PT/DC/TS/TD/CC/MED/P/SP/TRQ/CLD/CLS) si rompe

**Fix consigliato**:
- Definire e validare un set di posizioni consentite
- Spostare “stile” su `playing_style_id` (già esiste) e usare `role` per etichette tipo Collante/Giocatore chiave

---

## 3) `team_playing_style` mancante (null) in `team_tactical_settings`

Query: conteggio record con `team_playing_style` null.

Risultato:
- Esiste almeno 1 utente con `team_playing_style` null (es. `a2aaec95-1e8a-402f-8ff4-19711dfd2390`)

**Impatto**:
- IA non può usare “stile squadra” come contesto
- Moduli Attila condizionali su team_playing_style possono non caricarsi

**Fix consigliato**:
- UI: CTA chiara “Imposta stile squadra”
- Backend: fallback sicuro (non inferire stile)

---

## 4) Integrità `playing_style_id`

Query: `players.playing_style_id` non null ma senza match in `playing_styles`.

Risultato:
- Nessun caso trovato (OK).

---

## ✅ Conclusione

**Problemi reali trovati (da correggere)**:
1. `individual_instructions` con `player_id` orfani (critico)
2. `players.position` contiene stili (critico)
3. `team_playing_style` null per almeno 1 utente (medio)

**Problemi NON trovati**:
- `playing_style_id` orfani (OK)

