# Controllo end-to-end: Diagnostic, Save Player, Chat

**Data**: 2026-02-08  
**Scope**: Flusso completo da salvataggio giocatore → DB → diagnostic → chat; sicurezza e coerenza dati.

---

## 1. Autenticazione e sicurezza

| Endpoint | Auth | Filtro dati |
|----------|------|--------------|
| **POST /api/supabase/save-player** | Bearer token → `validateToken` → `userId` | Tutti gli insert/update usano `user_id: userId` (da token). Nessun body.user_id accettato. |
| **POST /api/refresh-diagnostic** | Bearer token → `validateToken` → `userId` | Letture e upsert su `user_diagnostic_cache` e tabelle correlate sempre con `.eq('user_id', userId)`. Rate limit 2/min. |
| **POST /api/assistant-chat** | Bearer token → `validateToken` → `userId` | `buildAssistantContext` e lettura cache/`buildPersonalContext` usano solo `userId`. Rate limit da `RATE_LIMIT_CONFIG`. |

- **RLS**: `players` e `user_diagnostic_cache` hanno policy per `auth.uid() = user_id`. Le API usano **service role** (bypass RLS) ma **filtrano sempre per userId** ricavato dal token; nessun dato cross-user.
- **Conclusione**: Controllo end-to-end sulla sicurezza **OK**.

---

## 2. Flusso dati: ruolo e stile (Collante, ecc.)

### 2.1 Scrittura (save-player)

- **Input**: `player.playing_style` (nome stile) e/o `player.role` (testo, spesso uguale allo stile).
- **Logica**: Lookup su `playing_styles` per nome; il nome usato per il lookup è `player.playing_style || player.role` (se il client manda solo `role`, viene usato quello).
- **Scrittura**: `players.role` = testo inviato; `players.playing_style_id` = id da catalogo se trovato.
- **Risultato**: Stili come "Collante" finiscono sia in `role` sia in `playing_style_id` quando il nome è nel catalogo; i successivi salvataggi allineano anche i record legacy che avevano solo `role`.

### 2.2 Lettura (refresh-diagnostic → diagnosticBuilder)

- **refresh-diagnostic**: Legge `players` (con `playing_style_id` e **`role`**) e `playing_styles`, costruisce `stylesLookup`, passa tutto a `buildDiagnostic`.
- **diagnosticBuilder**: Per ogni giocatore lo stile mostrato è `(playing_style_id && stylesLookup[id]) || sanitizeForPrompt(role) || '-'` (fallback su `role` per righe legacy senza FK).
- **Connection/Focal/Key Man**: `matchConnectionToRoster` usa `pStyle = stylesLookup[playing_style_id] || role` per il match con connection.
- **Build/sintesi**: `styleNameForPlayer(p, stylesLookup)` usa `playing_style_id` + fallback su `role`.

### 2.3 Lettura (assistant-chat)

- Se c’è **cache diagnostic**: usa il contenuto già generato (con stili corretti da diagnosticBuilder).
- **Fallback buildPersonalContext**: Legge `players` (con `playing_style_id` e **`role`**); per ogni giocatore `styleName = stylesLookup[playing_style_id] || role || '-'`.

**Modifiche applicate in questo controllo**:
- save-player: lookup `playing_style_id` da `player.playing_style` **o** `player.role`.
- refresh-diagnostic: aggiunto `role` nella select di `players`.
- diagnosticBuilder: fallback su `p.role` dove si mostra lo stile; introdotta `styleNameForPlayer`; `matchConnectionToRoster` considera `role` se manca FK.
- assistant-chat: aggiunto `role` nella select; fallback su `p.role` per `styleName` in titolari e riserve.

**Conclusione**: Flusso dati ruolo/stile **end-to-end coerente** (scrittura nel posto giusto, lettura con fallback per legacy).

---

## 3. Coerenza campi e validazioni

- **team_playing_style**: API `save-tactical-settings` ammette solo i 5 valori (snake_case). Il prompt chat elenca i 5 stili in forma leggibile; il DB usa gli stessi valori. **OK**.
- **Limiti testo**: save-player (e altre route) limitano campi stringa a 255 caratteri; diagnosticBuilder usa `sanitizeForPrompt` (troncamento + rimozione newline) per tutto ciò che va in prompt. **OK**.
- **Contesto chat**: Il blocco contesto personale (diagnostic o buildPersonalContext) è troncato a `MAX_PERSONAL_CONTEXT_CHARS` (6200) prima di essere inserito nel prompt. **OK**.
- **Vincoli in prompt**: REGOLA ORO, VINCOLI (solo nomi rosa, 5 stili squadra, istruzioni §5, limiti moduli, divieti Tattica/Tornante su MED Collante, ecc.) sono presenti nel system prompt. **OK**.

---

## 4. Riepilogo

| Area | Esito |
|------|--------|
| Auth e isolamento dati per utente | OK |
| Salvataggio ruolo/stile (Collante, ecc.) nel posto giusto | OK (con fix lookup da role) |
| Lettura diagnostic e chat con fallback per legacy (solo role) | OK (con fix select + fallback) |
| Coerenza team_playing_style e vincoli prompt | OK |
| Sanitizzazione e limiti lunghezza per prompt/DB | OK |

Il controllo end-to-end è stato superato. Le modifiche introdotte garantiscono che ruolo e stile siano salvati e letti in modo coerente su tutto il flusso (save-player → DB → refresh-diagnostic → diagnosticBuilder → cache → assistant-chat).
