# Audit documentazione – 30 Gennaio 2026

Documento unico che classifica i file `.md` e mappa **codice ↔ documentazione**. Dopo l’audit: tenuti solo documenti coerenti col codice e di semplice gestione.

---

**Nota**: Sostituito da `docs/AUDIT_ENTERPRISE_2026.md` (audit Feb 2026). Questo file mantiene la mappatura storica.

---

## 1. Mappatura codice ↔ documentazione

| Codice / funzione | Documento di riferimento |
|-------------------|--------------------------|
| `app/api/assistant-chat/route.js` (prompt, RAG, contesto) | `DOCUMENTAZIONE_GUIDA_INTERATTIVA.md`, `PIANO_INTEGRAZIONE_RAG_E_PROMPT.md`, `COERENZA_FOCUS_BILINGUE_E_RISPOSTA_IA.md` |
| `lib/ragHelper.js` (getRelevantSections, classifyQuestion, needsPersonalContext) | `info_rag.md`, `PIANO_INTEGRAZIONE_RAG_E_PROMPT.md` |
| `components/AssistantChat.jsx` | `DOCUMENTAZIONE_GUIDA_INTERATTIVA.md` |
| `lib/aiKnowledgeHelper.js`, barra conoscenza | `PROGETTAZIONE_BARRA_CONOSCENZA_IA.md` |
| Task settimanali (API, DB, helper) | `DOCUMENTAZIONE_TASK_SISTEMA.md`, `GUIDA_SVILUPPATORI_TASK.md` |
| Formazione 2D, drag & drop | `DOCUMENTAZIONE_DRAG_DROP.md` |
| Supabase, RLS, auth | `VERIFICA_ENTERPRISE_SUPABASE.md`, `DOCUMENTAZIONE_MASTER_COMPLETA.md` |
| Credit bar / costi API | `docs/SISTEMA_CREDITI_AI.md`, `docs/COSTI_API_E_PRICING_CREDITI.md` |
| Foto giocatore, design | `docs/DESIGN_UNIFICATO_FOTO_GIOCATORE.md` |
| Contenuti eFootball per RAG | `info_rag.md` (fonte usata da `ragHelper`) |
| Regole prodotto e bilingue | `COERENZA_FOCUS_BILINGUE_E_RISPOSTA_IA.md` |
| Solo rosa cliente (nomi) | `CHIAREZZA_GIOCATORI_E_DOCUMENTAZIONE.md` |
| Brainstorm / memoria utente | `MEMORIA_ATTILA_BRAINSTORM.md`, `CONTENUTI_INTERNET_DA_INTEGRARE.md` |
| Contesto personale (rosa in chat) | `INTEGRAZIONE_ROSA_CHAT_PERSONALIZZATA.md` |

---

## 2. Documenti mantenuti (KEEP)

- **README.md** – Overview, setup, endpoint
- **DOCUMENTAZIONE_MASTER_COMPLETA.md** – Architettura, DB, API, flussi
- **DOCUMENTAZIONE_RIFERIMENTO.md** – Riferimento rapido pagine/API/componenti/lib
- **INDICE_DOCUMENTAZIONE.md** – Indice “pulito” + mappatura codice ↔ doc
- **info_rag.md** – Contenuto RAG (usato da `lib/ragHelper.js`)
- **DOCUMENTAZIONE_GUIDA_INTERATTIVA.md** – Assistant Chat (route, prompt, flusso)
- **DOCUMENTAZIONE_DRAG_DROP.md** – Drag & drop formazione
- **DOCUMENTAZIONE_TASK_SISTEMA.md** – Task/obiettivi settimanali
- **GUIDA_SVILUPPATORI_TASK.md** – Guida pratica task
- **PROGETTAZIONE_BARRA_CONOSCENZA_IA.md** – Barra conoscenza IA
- **VERIFICA_ENTERPRISE_SUPABASE.md** – Sicurezza Supabase
- **COERENZA_FOCUS_BILINGUE_E_RISPOSTA_IA.md** – Focus prodotto, bilingue, risposta IA
- **CHIAREZZA_GIOCATORI_E_DOCUMENTAZIONE.md** – Solo rosa cliente
- **PIANO_INTEGRAZIONE_RAG_E_PROMPT.md** – Cosa va in RAG vs prompt, checklist
- **MEMORIA_ATTILA_BRAINSTORM.md** – Memoria brainstorm (non runtime)
- **CONTENUTI_INTERNET_DA_INTEGRARE.md** – Backlog contenuti (non runtime)
- **INTEGRAZIONE_ROSA_CHAT_PERSONALIZZATA.md** – Contesto personale in chat
- **TEST_GUIDE_CLOUD.md**, **TEST_CHAT_ASSISTANT.md** – Guide test
- **docs/SISTEMA_CREDITI_AI.md**, **docs/COSTI_API_E_PRICING_CREDITI.md**
- **docs/DESIGN_UNIFICATO_FOTO_GIOCATORE.md**
- **docs/CHECK_COERENZA_CREDITI_END_TO_END.md**
- **public/backgrounds/README.md**
- **docs/AUDIT_DOCUMENTAZIONE_2026.md** – Questo file

---

## 3. Documenti rimossi (DELETE) – incoerenti o obsoleti

- Audit/verifica/check one-off: AUDIT_*, VERIFICA_*, CHECK_* (eccetto quelli in “mantenuti”), CONTROLLO_*, RIEPILOGO_*, CORREZIONI_*, RISULTATI_*, CHANGELOG_*, VOTO_*, ALLINEAMENTO_*
- Piani/analisi superseduti: ELENCO_BRAINSTORM_E_PROMPT_ATTUALE, DATI_DOMANDE_E_PREPARAZIONE_DETTAGLIATA, PIANO_DI_AZIONE_RAG_E_FLUSSI, PIANO_PROMPT_RAG_E_ALLINEAMENTO_ATTILA, COERENZA_MEMORIA_ATTILA_VS_RAG, INCOERENZE_E_INTEGRAZIONI_CONTENUTI_INTERNET, COSA_FARE_CHAT_GUIDA, PIANO_ENTERPRISE_*, PIANO_IMPLEMENTAZIONE_*, PIANO_CORREZIONE_*, PIANO_MIGLIORAMENTO_*
- Migrazioni/completamenti: MIGRAZIONE_*_COMPLETATA, INTEGRAZIONE_MEMORIA_MODULARE_*, IMPLEMENTAZIONE_MODULARE_*, OTTIMIZZAZIONE_*, STRATEGIA_FINALE_*
- Analisi/riepiloghi datati: ANALISI_*, RIEPILOGO_ANALISI_*, ANALISI_LUNGHEZZA_PROMPT_IA, CORREZIONE_*, VERIFICA_COERENZA_*, RIEPILOGO_VERIFICA_*, SIMULAZIONE_200_DOMANDE, PREPARAZIONE_RAG_*, BEST_PRACTICES_*, DOCUMENTAZIONE_CONSIGLI_*, COSE_DA_FARE_*, DOCUMENTAZIONE_SUPABASE_PER_KIMI_*, CURSOR_TASKS, TASK_PROGRESS
- Alert (progettazione/audit non allineati): PROGETTAZIONE_SISTEMA_ALERT_*, INTEGRAZIONE_SISTEMA_ALERT, ESEMPIO_MIGRAZIONE_ALERT, AUDIT_ALERT_*, RIEPILOGO_SISTEMA_ALERT_*
- docs/ audit crediti (mantenuti solo SISTEMA_CREDITI, COSTI_API, DESIGN_UNIFICATO, CHECK_COERENZA_CREDITI): AUDIT_ENTERPRISE_RAG_E_ASSISTANT_CHAT, ALLINEAMENTO_SUPABASE_CREDITI_*, AUDIT_FLUSSO_CREDITI_*, AUDIT_CREDITI_*, AUDIT_ENTERPRISE_CREDITI_*, AUDIT_CREDITI_UX_*
- Altri: PROTOCOLLO_SICUREZZA_*, KONAMI_MECCANICHE_*, DOCUMENTO_PERFETTO_TERMINOLOGIA_*, ESEMPIO_RISPOSTA_IA_*, ANALISI_FLUSSO_*, TEST_COERENZA_* (test one-off), VERIFICA_DATI_VALUTATI_IA

*(Elenco completo e script PowerShell per la rimozione: **`docs/ELENCO_DOCUMENTI_DA_RIMUOVERE.md`**. Dopo aver rimosso i file, eliminare anche quel file.)*

---

## 4. Convenzioni

- **Un documento attivo per feature**: niente piani duplicati; RAG+prompt = `PIANO_INTEGRAZIONE_RAG_E_PROMPT.md` + `info_rag.md`.
- **Storici**: non mantenuti in repo; recuperabili da Git history.
- **Aggiornamento**: quando si modifica una funzione, aggiornare il doc indicato nella tabella §1.
