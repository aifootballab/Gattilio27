# 📚 Documentazione eFootball AI Coach

**Ultimo aggiornamento:** 2026-02-13  
**Versione:** 1.0.0

---

## 🗺️ Indice Rapido

| Sezione | Descrizione | Link |
|---------|-------------|------|
| 🏗️ **Architettura** | Stack tecnico, database, API | [01-ARCHITETTURA/](./01-ARCHITETTURA/) |
| ⚽ **Funzionalità** | Feature, UX, flussi utente | [02-FUNZIONALITA/](./02-FUNZIONALITA/) |
| 💰 **Business** | Pricing, economia, monetizzazione | [03-BUSINESS/](./03-BUSINESS/) |
| ⚖️ **Legale** | Termini, Privacy, Cookie (GDPR) | [03-BUSINESS/](#documenti-legali-obbligatori) |
| 👨‍💻 **Guide Dev** | Guide sviluppatore, convenzioni | [04-GUIDE-DEV/](./04-GUIDE-DEV/) |
| 🔍 **Analisi** | Audit, ricerche, valutazioni | [05-ANALISI-AUDIT/](./05-ANALISI-AUDIT/) |
| 🗄️ **Archivio** | Documenti storici, obsoleti | [archivio/](./archivio/)

## ⚖️ Documenti Legali (Obbligatori GDPR)

| Documento | Scopo | Stato |
|-----------|-------|-------|
| **[Termini e Condizioni](./GUIDA_UTENTE_COMPLETA.md)** | Regole d'uso, pagamenti, rimborsi, classifiche | ✅ Pronto |
| **[Privacy Policy](./PRIVACY_POLICY.md)** | Dati raccolti, diritti GDPR, terze parti | ✅ Pronto |
| **[Cookie Policy](./COOKIE_POLICY.md)** | Cookie usati, gestione consenso | ✅ Pronto |

**Nota:** Questi documenti devono essere linkati in footer sito e presentati al momento registrazione.

---

## 🚀 Per Iniziare

### Sei uno sviluppatore?
→ Leggi [04-GUIDE-DEV/GUIDA_PROGRAMMATORE_COMPLETA.md](./04-GUIDE-DEV/GUIDA_PROGRAMMATORE_COMPLETA.md)

### Vuoi capire il pricing?
→ Vedi [03-BUSINESS/VALUTAZIONE_ECONOMICA_PIATTAFORMA.md](./03-BUSINESS/VALUTAZIONE_ECONOMICA_PIATTAFORMA.md)

### Ti interessa l'architettura?
→ Parti da [01-ARCHITETTURA/PANORAMICA_PROGETTO.md](./01-ARCHITETTURA/PANORAMICA_PROGETTO.md)

---

## 📚 Guida Utente Completa (NUOVA)

→ **[GUIDA_UTENTE_COMPLETA.md](./GUIDA_UTENTE_COMPLETA.md)** — Tutto quello che devi sapere per usare la piattaforma

### 🎯 Palestra Coach (Feature Principale)
- **Guida Utente**: Sezione "Palestra Coach" in [GUIDA_UTENTE_COMPLETA.md](./GUIDA_UTENTE_COMPLETA.md#5-palestra-coach-nuovo)
- Architettura Tecnica: [PALESTRA_COACH_ARCHITETTURA.md](./02-FUNZIONALITA/PALESTRA_COACH_ARCHITETTURA.md)
- Componente: `components/CoachFeedbackChat.jsx`
- API: `app/api/save-coach-feedback/route.js`
- Database: `user_tactical_feedback` (v. migrations/)

### 🤖 AI Knowledge Score
- Implementazione: `lib/aiKnowledgeHelper.js`
- Documentazione: [02-FUNZIONALITA/SISTEMA_CONOSCENZA_AI.md](./02-FUNZIONALITA/SISTEMA_CONOSCENZA_AI.md)

### 💬 Chat Widget
- Route: `app/api/assistant-chat/route.js`
- Contesto RAG: `lib/ragHelper.js` + `info_rag.md`
- Diagnostic/analisi: [01-ARCHITETTURA/IMPLEMENTAZIONE_DIAGNOSTIC_CHAT.md](./01-ARCHITETTURA/IMPLEMENTAZIONE_DIAGNOSTIC_CHAT.md)

### ⚽ Gestione Rosa
- Componente: `app/gestione-formazione/page.jsx`
- Logica: `lib/diagnosticBuilder.js` (sezione rosa)

### 🏆 Classifica Mensile (From Zero to Hero)
- API: `GET /api/leaderboard?month=YYYY-MM`
- Implementazione: [02-FUNZIONALITA/CLASSIFICA_MENSILE_IMPLEMENTAZIONE.md](./02-FUNZIONALITA/CLASSIFICA_MENSILE_IMPLEMENTAZIONE.md)
- Calcolo punti: `lib/leaderboardHelper.js`
- Pagine: Dashboard, `/classifica`

---

## 🔄 Flussi Principali

```
┌─────────────────────────────────────────────────────────────┐
│                    ONBOARDING UTENTE                        │
│  Registro → Profilo → Rosa (11 titolari) → Allenatore      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      GIORNO TIPO                            │
│  Partita → Analisi → Palestra Coach → Consigli AI          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Convenzioni Documentazione

### Struttura file
- `01-` numerazione per ordinare le cartelle
- Nomi in MAIUSCOLO_SNAKE_CASE.md
- Un concetto = un file (evitare file >30KB)

### Stato documenti
Ogni documento inizia con:
```markdown
---
Stato: [attivo | da aggiornare | obsoleto]
Creato: YYYY-MM-DD
Aggiornato: YYYY-MM-DD
Autore: Nome
---
```

---

## ⚠️ Documenti da tenere aggiornati

| Documento | Ultima verifica | Nota |
|-----------|-----------------|------|
| `03-BUSINESS/COSTI_API_E_PRICING_CREDITI.md` | 2026-02 | Verificare prezzi OpenAI su pricing page prima di stime commerciali |
| `05-ANALISI-AUDIT/DIAGNOSTIC_DOCUMENTO_ANALISI_DIFFICOLTA.md` | 2026-02 | Schema DB allineato a Supabase public |

---

## 🗄️ Archivio

Documenti storici mantenuti per tracciabilità: [archivio/](./archivio/)

---

## 📞 Riferimenti Rapidi

- **Stack**: Next.js 14 + React 18 + Supabase + OpenAI GPT-4o
- **Repo**: `Gattilio27-master/`
- **Deploy**: Vercel
- **Database**: Supabase PostgreSQL

---

*Per modifiche a questa struttura, aggiornare questo README e spostare i file di conseguenza.*
