# 🔍 Analisi Completa Progetto (Next.js)

**Data**: 2026-01-14  
**Framework**: Next.js 14 (App Router)  
**Status**: 🟢 **PROGETTO PULITO E COERENTE**

---

## 📦 Struttura (cartella per cartella)

### **`app/` (UI + routing)**
- Pagine: `app/page.tsx`, `app/dashboard/page.tsx`, `app/rosa/page.tsx`, `app/statistiche/page.tsx`, ecc.
- Layout: `app/layout.tsx` integra `RosaProvider`
- Stili globali: `app/globals.css`

### **`components/` (componenti UI)**
- `components/coaching/VoiceCoachingPanel.jsx` (voice coaching realtime)
- `components/rosa/*` (rosa, upload screenshot, input manuale, ecc.)
- `components/dashboard/*` (dashboard)

### **`services/` (logica applicativa)**
- Tutti i servizi importano `supabase` da `@/lib/supabase`
- `services/realtimeCoachingServiceV2.js`: realtime websocket + chiamate Edge Function
- `services/realtimeCoachingService.js`: flusso alternativo via `supabase.functions.invoke`

### **`lib/`**
- `lib/supabase.ts`: client Supabase (usa `process.env.NEXT_PUBLIC_*`)

### **`contexts/`**
- `contexts/RosaContext.tsx`: stato globale rosa (client component)

### **`supabase/` (backend)**
- `supabase/functions/*`: Edge Functions (TypeScript)
- `supabase/migrations/*`: migrazioni SQL

---

## 🔑 Variabili d’ambiente (unico standard)

### **Frontend (Next.js / Vercel / locale)**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_OPENAI_API_KEY` *(necessaria se il realtime websocket gira nel browser)*

### **Backend (Supabase Secrets)**
- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## 🔄 Flussi critici (coerenza)

### **1) Autenticazione**
- Il frontend usa Supabase Auth.
- Se non esiste sessione, il pannello coaching esegue login anonimo (se abilitato in Supabase).

### **2) Edge Function `voice-coaching-gpt`**
- Chiamata dal client con:
  - `Authorization: Bearer <JWT utente>`
  - `apikey: <anon/publishable key>`

### **3) Realtime WebSocket**
- `realtimeCoachingServiceV2` apre il WS e configura la sessione (`session.update`)
- Gestione robusta dei messaggi (no crash su eventi inattesi)

---

## ✅ Pulizia effettuata

- Rimossa cartella legacy non utilizzata (`src/`)
- Rimossi file legacy non utilizzati (entry HTML e config legacy)
- `next.config.js` semplificato (rimossi workaround inutili)
- `services/realtimeCoachingServiceV2.js` allineato a Next.js: nessun uso di `import.meta.env`
- Documentazione aggiornata per usare solo `NEXT_PUBLIC_*`

---

## ✅ Stato finale

- **Codice attivo**: coerente con Next.js
- **Env**: un solo set (`NEXT_PUBLIC_*`)
- **Repo**: ripulito da file legacy non utilizzati

