# Audit Enterprise Documentazione – Febbraio 2026

**Data**: 3 Febbraio 2026  
**Obiettivo**: Verifica coerenza documenti ↔ codice, rimozione obsoleti, documentazione gestione rosa per funzione.

---

## 1. Verifica API ↔ DOCUMENTAZIONE_RIFERIMENTO

| API documentata | Path effettivo | Stato |
|-----------------|----------------|-------|
| save-player | `/api/supabase/save-player` | ✅ Esiste |
| save-formation-layout | `/api/supabase/save-formation-layout` | ✅ Esiste |
| assign-player-to-slot | `/api/supabase/assign-player-to-slot` | ✅ Esiste |
| remove-player-from-slot | `/api/supabase/remove-player-from-slot` | ✅ Esiste |
| delete-player | `/api/supabase/delete-player` | ✅ Esiste |
| save-match | `/api/supabase/save-match` | ✅ Esiste |
| update-match | `/api/supabase/update-match` | ✅ Esiste |
| delete-match | `/api/supabase/delete-match` | ✅ Esiste |
| save-profile | `/api/supabase/save-profile` | ✅ Esiste |
| save-coach | `/api/supabase/save-coach` | ✅ Esiste |
| set-active-coach | `/api/supabase/set-active-coach` | ✅ Esiste |
| save-tactical-settings | `/api/supabase/save-tactical-settings` | ✅ Esiste |
| save-opponent-formation | `/api/supabase/save-opponent-formation` | ✅ Esiste |
| extract-formation | `/api/extract-formation` | ✅ Esiste |
| extract-player | `/api/extract-player` | ✅ Esiste |
| extract-match-data | `/api/extract-match-data` | ✅ Esiste |
| extract-coach | `/api/extract-coach` | ✅ Esiste |
| assistant-chat | `/api/assistant-chat` | ✅ Esiste |
| analyze-match | `/api/analyze-match` | ✅ Esiste |
| generate-countermeasures | `/api/generate-countermeasures` | ✅ Esiste |
| ai-knowledge | `/api/ai-knowledge` | ✅ Esiste |
| tasks/list | `/api/tasks/list` | ✅ Esiste |
| tasks/generate | `/api/tasks/generate` | ✅ Esiste |
| credits/usage | `/api/credits/usage` | ✅ Esiste (non in doc) |
| admin/recalculate-patterns | `/api/admin/recalculate-patterns` | ✅ Esiste |

**Azione**: `credits/usage` – documentato in DOCUMENTAZIONE_RIFERIMENTO e SISTEMA_CREDITI_AI.

---

## 1.1 Audit cartella app/api/ (3 feb 2026)

| Verifica | Stato |
|----------|-------|
| Tutte le API chiamate dal frontend esistono | ✅ |
| Auth (validateToken/extractBearerToken) su route protette | ✅ |
| Rate limiting configurato (rateLimiter.js) | ✅ |
| CreditsBar usa POST (non GET) per /api/credits/usage | ✅ (fix commento) |
| tasks/generate non chiamato da frontend | OK – endpoint test/manuale |

---

## 1.2 Verifica Supabase End-to-End

Vedi **`docs/VERIFICA_SUPABASE_END_TO_END.md`** – mappatura API → tabelle → migrazioni.  
Tabelle senza migrazione in `migrations/`: `formation_layout`, `players`, `opponent_formations`, `playing_styles`, `team_tactical_patterns` – verosimilmente create da setup Supabase iniziale. Consigliato verificare in Supabase Dashboard.

---

## 2. Documenti da MANTENERE (verificati vs codice)

| Documento | Verifica | Note |
|-----------|----------|------|
| README.md | ✅ | Overview, setup |
| DOCUMENTAZIONE_MASTER_COMPLETA.md | Da verificare | Architettura |
| DOCUMENTAZIONE_RIFERIMENTO.md | ✅ | API/componenti allineati |
| INDICE_DOCUMENTAZIONE.md | ✅ | Numerazione corretta, convenzione rollback (3 feb 2026) |
| info_rag.md | ✅ | Usato da ragHelper.js |
| DOCUMENTAZIONE_GUIDA_INTERATTIVA.md | Da verificare | Assistant Chat |
| DOCUMENTAZIONE_DRAG_DROP.md | ✅ | Drag & drop formazione |
| DOCUMENTAZIONE_TASK_SISTEMA.md | Da verificare | Task |
| GUIDA_SVILUPPATORI_TASK.md | Da verificare | Task |
| PROGETTAZIONE_BARRA_CONOSCENZA_IA.md | Da verificare | Barra IA |
| VERIFICA_ENTERPRISE_SUPABASE.md | Da verificare | Supabase |
| COERENZA_FOCUS_BILINGUE_E_RISPOSTA_IA.md | ✅ | Focus prodotto |
| CHIAREZZA_GIOCATORI_E_DOCUMENTAZIONE.md | ✅ | Solo rosa |
| PIANO_INTEGRAZIONE_RAG_E_PROMPT.md | ✅ | RAG vs prompt |
| MEMORIA_ATTILA_BRAINSTORM.md | ✅ | Brainstorm (non runtime) |
| CONTENUTI_INTERNET_DA_INTEGRARE.md | ✅ | Backlog contenuti |
| INTEGRAZIONE_ROSA_CHAT_PERSONALIZZATA.md | ✅ | Contesto chat |
| TEST_GUIDE_CLOUD.md | ✅ | Test cloud |
| TEST_CHAT_ASSISTANT.md | ✅ | Test chat |
| docs/SISTEMA_CREDITI_AI.md | ✅ | Crediti |
| docs/COSTI_API_E_PRICING_CREDITI.md | ✅ | Costi API |
| docs/DESIGN_UNIFICATO_FOTO_GIOCATORE.md | ✅ | Design foto |
| docs/CHECK_COERENZA_CREDITI_END_TO_END.md | ✅ | Check crediti |
| docs/PALETTI_IA_COERENZA.md | ✅ | Paletti IA |
| docs/INTEGRAZIONI_RAG_MANCANTI_DETTAGLIO.md | ✅ | Integrazioni RAG |
| docs/VERIFICA_STILI_EFOOTBALL.md | ✅ | Stili eFootball |
| docs/VERIFICA_SUPABASE_END_TO_END.md | ✅ | API → tabelle Supabase → migrazioni |

---

## 3. Documenti rimossi

**Audit 2026-02-02**: 54+ documenti obsoleti (piani superseduti, migrazioni completate). Elenco in Git history.

**Pulizia 2026-02-03**: documentazione obsoleta o non utile:
- `docs/AUDIT_DOCUMENTAZIONE_2026.md` (sostituito da AUDIT_ENTERPRISE_2026)
- `docs/AUDIT_ENTERPRISE_CREDITI_PERCHÉ_SOLO_5.md` (one-off storico)
- `docs/BRAINSTORM_DOCUMENTO.md`, `docs/ANALISI_BRAINSTORM_RIGA_PER_RIGA.md` (contenuto confluito in info_rag)
- `docs/AUDIT_CODICE_MORTO_E_DOCUMENTI.md` (azioni eseguite)
- `docs/ESEMPIO_RISPOSTA_ABILITA_SBAGLIATE.md` (esempio one-off)
- `docs/INTRECCI_IA_E_MIGLIORAMENTI.md`, `docs/FLUSSO_DATI_IA_E_SUGGERIMENTI.md`
- `docs/VERIFICA_RAG_STILI_E_ABILITA.md`, `docs/AUDIT_STILI_GIOCATORE_CREARE_RICEVERE.md`
- `docs/AUDIT_ALLINEAMENTO_SUPABASE_ISTRUZIONI_PALETTI.md`, `docs/AUDIT_DATI_IA_E_SUPABASE.md`
- `docs/AUDIT_ENTERPRISE_IA_PROMPTI_2026.md`
- `memoria_attila_backup/` (intera cartella, backup)

---

## 4. Mappatura codice ↔ documentazione (aggiornata)

| Codice | Documento |
|--------|-----------|
| `app/gestione-formazione/page.jsx` | `docs/GESTIONE_ROSA_FUNZIONI.md` (per funzione) |
| `app/api/assistant-chat/route.js` | `DOCUMENTAZIONE_GUIDA_INTERATTIVA.md`, `docs/PALETTI_IA_COERENZA.md`, `docs/ANALISI_PROMPT_ASSISTANT_CHAT.md` |
| `lib/ragHelper.js` | `info_rag.md`, `PIANO_INTEGRAZIONE_RAG_E_PROMPT.md` |
| `components/AssistantChat.jsx` | `DOCUMENTAZIONE_GUIDA_INTERATTIVA.md` |
| Sistema crediti/economia | `docs/SISTEMA_CREDITI_AI.md`, `docs/COSTI_API_E_PRICING_CREDITI.md`, `docs/VALUTAZIONE_ECONOMICA_PIATTAFORMA.md` |
| Validazione completa (cartelle, file, flusso) | `docs/GUIDA_VALIDAZIONE_PROGRAMMATORE.md` |
| Coerenza Supabase end-to-end | `docs/VERIFICA_SUPABASE_END_TO_END.md` |
| Cartelle app, api, components, lib | README.md in ciascuna cartella |

## 4.1 Audit components/ (3 feb 2026)

| Fix | File | Dettaglio |
|-----|------|-----------|
| Bug lingua etichette | PositionSelectionModal.jsx | t('lang') → lang da useTranslation |
| Bug navigazione | AssistantChat.jsx | usePathname() al posto di popstate |
| i18n breakdown | AIKnowledgeBar.jsx, lib/i18n.js | Profilo, Rosa, Partite ecc. tradotte |
| i18n gruppi posizioni | lib/i18n.js | positionGroupGoalkeeper, Defense, Midfield, Attack |
| Fix shadowing | TaskWidget.jsx | filter(t =>) → filter(task =>) |

Rollback: `rollback/FIX_COMPONENTS_2026-02-03/README.md`

## 4.2 Audit lib/ (3 feb 2026)

| Fix | File | Dettaglio |
|-----|------|-----------|
| Doc inesistente | lib/README.md, DOCUMENTAZIONE_RIFERIMENTO, GUIDA_VALIDAZIONE, README, DOCUMENTAZIONE_MASTER | Rimosso normalize.js (file non esiste, normalizzazione inline nelle route) |
| Dead code | lib/errorHelper.js | Rimosse showUserFriendlyError, withErrorHandling (mai importate) |

Rollback: `rollback/FIX_LIB_2026-02-03/README.md`

## 4.3 Audit gestione-formazione/ (3 feb 2026)

| Fix | File | Dettaglio |
|-----|------|-----------|
| i18n | gestione-formazione/page.jsx, lib/i18n.js | formationCustom, ATTACCO→attacking, DIFESA→defending, FORZA→athleticism |
| Codice duplicato | gestione-formazione/page.jsx | Unificati handleDeletePlayerConfirm e handleDeleteReserveConfirm; fix reset modal per riserve |

Rollback: `rollback/FIX_GESTIONE_FORMazione_2026-02-03/README.md`, `rollback/FIX_GESTIONE_DELETE_2026-02-03/README.md`

## 4.4 Fix Hydration Mismatch (3 feb 2026)

| Fix | File | Dettaglio |
|-----|------|-----------|
| Hydration | lib/i18n.js | LanguageProvider: state iniziale sempre 'it', localStorage letto in useEffect dopo mount |

Rollback: `rollback/FIX_HYDRATION_2026-02-03/README.md`

## 5. Gestione Rosa – Documentazione per funzione

Vedi `docs/GESTIONE_ROSA_FUNZIONI.md` – ogni funzione della pagina `gestione-formazione/page.jsx` documentata separatamente.

---

## 6. Incoerenze rilevate (aggiornato 3 feb 2026)

1. **INDICE_DOCUMENTAZIONE.md** – Verificato: PROGETTAZIONE_BARRA_CONOSCENZA_IA, DOCUMENTAZIONE_TASK_SISTEMA, DOCUMENTAZIONE_DRAG_DROP esistono. Numero duplicato (5, 7, 9, 11) – corretto.
2. **DOCUMENTAZIONE_RIFERIMENTO** – Glossario OK. Box-to-Box e Onnipresente distinti.
3. **Gestione formazione** – Doc per funzione in `docs/GESTIONE_ROSA_FUNZIONI.md`.

---

## 7. Rollback (fix 3 feb 2026)

| Cartella | Fix |
|----------|-----|
| `rollback/FIX_COMPONENTS_2026-02-03/` | PositionSelectionModal, AssistantChat, AIKnowledgeBar, TaskWidget |
| `rollback/FIX_LIB_2026-02-03/` | normalize.js doc, errorHelper dead code |
| `rollback/FIX_GESTIONE_FORMazione_2026-02-03/` | i18n formationCustom, attacking, defending, athleticism |
| `rollback/FIX_HYDRATION_2026-02-03/` | LanguageProvider hydration |
| `rollback/FIX_DEAD_CODE_2026-02-03/` | safeFetch, calculateWeightedTasksScore, PHOTO_TYPE_ICONS, parseOpenAIResponse (extract-coach) |
| `rollback/FIX_DOC_OBSOLETI_2026-02-03/` | Rimozione 14 doc obsoleti + memoria_attila_backup |
| `rollback/FIX_GESTIONE_DELETE_2026-02-03/` | Unificazione handleDeletePlayerConfirm/handleDeleteReserveConfirm, fix reset modal |
