# 📚 Indice Documentazione - eFootball AI Coach

**Ultimo aggiornamento**: 2026-01-29

Questo indice elenca **solo i documenti mantenuti** e coerenti con il codice attuale.  
I documenti storici/temporanei (piani, check “completato”, fix deploy, pre-implementazione) sono stati rimossi per evitare confusione: restano recuperabili via Git history.

---

## 📌 Start qui (sempre aggiornati)

### **1) `README.md`**
- **Quando usarlo**: overview prodotto, setup, lista endpoint principali.

### **2) `DOCUMENTAZIONE_MASTER_COMPLETA.md`**
- **Quando usarlo**: reference tecnica “ampia” (architettura + DB + API + flussi). Aggiornata 29 gen 2026: Assistant Chat, contesto personale, stili fissi, RAG, lib/ragHelper.

### **3) `DOCUMENTAZIONE_RIFERIMENTO.md`**
- **Quando usarlo**: riferimento rapido per programmatore (ogni pagina, API, componente, lib) e per chi legge (cosa fa ogni schermata). Contesto e glossario.

---

## 🧠 Barra Conoscenza IA

### **4) `PROGETTAZIONE_BARRA_CONOSCENZA_IA.md`**
- **Quando usarlo**: come viene calcolata e aggiornata la barra in produzione.
- **Nota**: include i comportamenti reali (pattern da `team_tactical_patterns`, aggiornamento sequenziale dopo save/update match, cache 5 min).

---

## ✅ Task / Obiettivi Settimanali

### **5) `DOCUMENTAZIONE_TASK_SISTEMA.md`**
- **Quando usarlo**: reference completa (DB, API, helper, troubleshooting).

### **5) `GUIDA_SVILUPPATORI_TASK.md`**
- **Quando usarlo**: quick-start e guida pratica per estendere il sistema task.

---

## 🧩 UX: formazione / drag-drop / assistente

### **7) `DOCUMENTAZIONE_DRAG_DROP.md`**
- **Quando usarlo**: drag & drop posizioni, salvataggio layout, edge cases.

### **8) `DOCUMENTAZIONE_GUIDA_INTERATTIVA.md`**
- **Quando usarlo**: Assistant Chat (prompting, auth, rate limit, flusso UX).

---

## 🔌 Supabase / sicurezza

### **9) `VERIFICA_ENTERPRISE_SUPABASE.md`**
- **Quando usarlo**: audit sicurezza/coerenza Supabase (RLS, pattern auth, service role).

---

## 📝 Convenzioni (snelle)

- **Fonte di verità**: `README.md` + `DOCUMENTAZIONE_MASTER_COMPLETA.md` + `DOCUMENTAZIONE_RIFERIMENTO.md` (riferimento rapido pagine/API/componenti/lib)
- **Doc feature**: un solo documento “attivo” per feature (no piani duplicati)
- **Documenti storici**: non mantenuti; usare Git history se serve

