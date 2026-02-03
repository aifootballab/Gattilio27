# 📚 Indice Documentazione - eFootball AI Coach

**Ultimo aggiornamento**: 2026-02-03

Questo indice elenca **solo i documenti mantenuti** e coerenti con il codice attuale.  
Mappatura **codice ↔ documentazione**: vedi **`docs/AUDIT_ENTERPRISE_2026.md`**.

---

## 📌 Start qui (sempre aggiornati)

### **1) `README.md`**
- **Quando usarlo**: overview prodotto, setup, lista endpoint principali.

### **2) `DOCUMENTAZIONE_MASTER_COMPLETA.md`**
- **Quando usarlo**: reference tecnica “ampia” (architettura + DB + API + flussi).

### **3) `DOCUMENTAZIONE_RIFERIMENTO.md`**
- **Quando usarlo**: riferimento rapido per programmatore (ogni pagina, API, componente, lib) e per chi legge (cosa fa ogni schermata). Contesto e glossario.

### **4) `docs/GUIDA_VALIDAZIONE_PROGRAMMATORE.md`**
- **Quando usarlo**: validazione piattaforma completa. Ogni cartella, ogni file, flusso dati IA, checklist. Per programmatore che deve conoscere tutta la piattaforma.

---

## 🤖 Assistant Chat, RAG e prompt

### **5) `DOCUMENTAZIONE_GUIDA_INTERATTIVA.md`**
- **Quando usarlo**: Assistant Chat (architettura, flusso, `route.js`, `AssistantChat.jsx`).

### **5) `info_rag.md`**
- **Quando usarlo**: contenuto RAG eFootball (usato da `lib/ragHelper.js`). Modifiche qui si riflettono nelle risposte IA.

### **7) `PIANO_INTEGRAZIONE_RAG_E_PROMPT.md`**
- **Quando usarlo**: cosa va in RAG vs prompt, checklist integrazioni, gestione system/user.

### **7) `COERENZA_FOCUS_BILINGUE_E_RISPOSTA_IA.md`**
- **Quando usarlo**: focus prodotto, bilingue IT/EN, come deve rispondere l’IA, cosa non deve dire.

### **9) `CHIAREZZA_GIOCATORI_E_DOCUMENTAZIONE.md`**
- **Quando usarlo**: regola “solo rosa cliente” (l’IA cita solo i giocatori caricati dall’utente).

### **9) `INTEGRAZIONE_ROSA_CHAT_PERSONALIZZATA.md`**
- **Quando usarlo**: contesto personale (rosa, partite, tattica, allenatore) caricato on-demand in chat.

### **11) `MEMORIA_ATTILA_BRAINSTORM.md`** e **`CONTENUTI_INTERNET_DA_INTEGRARE.md`** (backlog, non runtime)
- **Quando usarlo**: memoria brainstorm e backlog contenuti (non usati a runtime dall’API).

---

## 🧠 Barra Conoscenza IA

### **11) `PROGETTAZIONE_BARRA_CONOSCENZA_IA.md`**
- **Quando usarlo**: come viene calcolata e aggiornata la barra in produzione.

---

## ✅ Task / Obiettivi Settimanali

### **12) `DOCUMENTAZIONE_TASK_SISTEMA.md`**
- **Quando usarlo**: reference completa (DB, API, helper, troubleshooting).

### **13) `GUIDA_SVILUPPATORI_TASK.md`**
- **Quando usarlo**: quick-start e guida pratica per estendere il sistema task.

---

## 🧩 UX: formazione / drag-drop / gestione rosa

### **14) `DOCUMENTAZIONE_DRAG_DROP.md`**
- **Quando usarlo**: drag & drop posizioni, salvataggio layout, edge cases.

### **15) `docs/GESTIONE_ROSA_FUNZIONI.md`**
- **Quando usarlo**: documentazione gestione formazione divisa per funzione (fetchData, handleSlotClick, handleAssignFromReserve, upload, ecc.). Ogni funzione con API, input, stato.

---

## 🔌 Supabase / sicurezza / crediti / design

### **16) `VERIFICA_ENTERPRISE_SUPABASE.md`**
- **Quando usarlo**: audit sicurezza/coerenza Supabase (RLS, pattern auth, service role).

### **17) Documenti in `docs/`**
- **`docs/SISTEMA_CREDITI_AI.md`** – Sistema crediti e barra.
- **`docs/COSTI_API_E_PRICING_CREDITI.md`** – Costi API e pricing.
- **`docs/DESIGN_UNIFICATO_FOTO_GIOCATORE.md`** – Design foto giocatore.
- **`docs/CHECK_COERENZA_CREDITI_END_TO_END.md`** – Check coerenza crediti.
- **`docs/AUDIT_ENTERPRISE_2026.md`** – Audit doc, verifica API↔codice, mappatura.
- **`docs/PALETTI_IA_COERENZA.md`** – Paletti IA (chat, analyze-match, contromisure).
- **`docs/INTEGRAZIONI_RAG_MANCANTI_DETTAGLIO.md`** – Integrazioni RAG da completare.
- **`docs/VERIFICA_STILI_EFOOTBALL.md`** – Verifica stili di gioco vs fonti.
- **`docs/ANALISI_PROMPT_ASSISTANT_CHAT.md`** – Analisi prompt chat, miglioramenti (tono, Ala prolifica, %).
- **`docs/VALUTAZIONE_ECONOMICA_PIATTAFORMA.md`** – Valutazione economica: costi, limiti, proiezioni, raccomandazioni.
- **`docs/AUDIT_STILI_GIOCATORE_CREARE_RICEVERE.md`** – Audit stili giocatore (creare vs ricevere).
- **`docs/AUDIT_ALLINEAMENTO_SUPABASE_ISTRUZIONI_PALETTI.md`** – Allineamento Supabase, istruzioni, paletti IA.
- **`docs/AUDIT_ENTERPRISE_IA_PROMPTI_2026.md`** – Audit enterprise prompt e RAG.
- **`docs/AUDIT_CODICE_MORTO_E_DOCUMENTI.md`** – Codice morto e documenti inutili/ridondanti.
- **`docs/VERIFICA_SUPABASE_END_TO_END.md`** – Coerenza API → tabelle Supabase → migrazioni.

---

## 🧪 Test

### **18) `TEST_GUIDE_CLOUD.md`**, **`TEST_CHAT_ASSISTANT.md`**
- **Quando usarlo**: guide per test cloud e chat assistant.

---

## 📝 Convenzioni

- **Fonte di verità**: `README.md` + `DOCUMENTAZIONE_MASTER_COMPLETA.md` + `DOCUMENTAZIONE_RIFERIMENTO.md`.
- **Codice ↔ doc**: un solo documento “attivo” per feature; vedi **`docs/AUDIT_ENTERPRISE_2026.md`** per la mappatura completa.
- **Documenti storici**: non mantenuti; usare Git history se serve.