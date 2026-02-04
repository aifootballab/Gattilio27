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
| INDICE_DOCUMENTAZIONE.md | ⚠️ | Aggiornare riferimenti a doc rimossi |
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

## 3. Documenti rimossi (audit 2026-02-02)

Rimossi 54+ documenti obsoleti (audit one-off, piani superseduti, migrazioni completate). Elenco in Git history.

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

## 5. Gestione Rosa – Documentazione per funzione

Vedi `docs/GESTIONE_ROSA_FUNZIONI.md` – ogni funzione della pagina `gestione-formazione/page.jsx` documentata separatamente.

---

## 6. Incoerenze rilevate

1. **INDICE_DOCUMENTAZIONE.md** – Riferisce a `PROGETTAZIONE_BARRA_CONOSCENZA_IA.md`, `DOCUMENTAZIONE_TASK_SISTEMA.md`, `DOCUMENTAZIONE_DRAG_DROP.md` – verificare esistenza.
2. **DOCUMENTAZIONE_RIFERIMENTO** – Glossario: "Box-to-Box" citato; correttamente Box-to-Box e Onnipresente sono distinti. "Ala prolifica, Collante, Box-to-Box" – ok.
3. **Gestione formazione** – Nessun doc dedicato per funzione; creato `GESTIONE_ROSA_FUNZIONI.md`.
