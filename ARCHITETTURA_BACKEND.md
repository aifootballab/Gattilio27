# 🏗️ Architettura Backend - Dove e Come Funziona

**Data**: 27 Gennaio 2026

---

## ❓ Domanda: Dove abbiamo il Backend?

### **Risposta Breve**

**Backend = Next.js API Routes** → Deploy su **Vercel** (serverless functions)  
**Database = Supabase PostgreSQL** → Solo storage dati

**NO, il backend NON è in PostgreSQL!** PostgreSQL è solo il database.

---

## 🎯 Architettura Completa

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Browser)                        │
│  Next.js 14 (React) - Componenti UI                         │
│  - TaskWidget.jsx                                           │
│  - Dashboard, Formazioni, ecc.                              │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ HTTP Requests
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              BACKEND (Vercel Serverless)                    │
│  Next.js 14 API Routes                                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  app/api/tasks/list/route.js                        │   │
│  │  app/api/tasks/generate/route.js                    │   │
│  │  app/api/supabase/save-match/route.js               │   │
│  │  app/api/analyze-match/route.js                     │   │
│  │  ... altri endpoint ...                             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ✅ Autenticazione (validateToken)                          │
│  ✅ Rate Limiting                                            │
│  ✅ Business Logic                                           │
│  ✅ Chiamate OpenAI (server-only)                            │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ API Calls
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              DATABASE (Supabase PostgreSQL)                 │
│  PostgreSQL Database                                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  weekly_goals                                        │   │
│  │  matches                                             │   │
│  │  players                                             │   │
│  │  user_profiles                                       │   │
│  │  ... altre tabelle ...                              │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ✅ Row Level Security (RLS)                                │
│  ✅ Indici ottimizzati                                       │
│  ✅ Foreign Keys                                             │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ API Calls
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              EXTERNAL SERVICES                              │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │  OpenAI API      │  │  Supabase Auth    │               │
│  │  (GPT-4o Vision) │  │  (JWT Tokens)     │               │
│  └──────────────────┘  └──────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📍 Dove si Trova Ogni Componente

### **1. Backend (Logica Business)**

**Dove**: **Vercel** (serverless functions)  
**Cosa**: Next.js API Routes  
**File**: `app/api/**/route.js`

**Esempio**:
```javascript
// app/api/tasks/list/route.js
export async function GET(request) {
  // ✅ Questo codice gira su Vercel (serverless)
  // ✅ NON in PostgreSQL!
  
  const token = extractBearerToken(request)
  const { userData } = await validateToken(token, ...)
  
  const tasks = await supabase
    .from('weekly_goals')
    .select('*')
    .eq('user_id', user_id)
  
  return NextResponse.json({ tasks })
}
```

**Caratteristiche**:
- ✅ Serverless (paga solo quando usato)
- ✅ Auto-scaling
- ✅ Edge network (veloce)
- ✅ HTTPS automatico

---

### **2. Database (Storage Dati)**

**Dove**: **Supabase** (PostgreSQL cloud)  
**Cosa**: Solo storage dati  
**NO logica business!**

**Esempio**:
```sql
-- Questo è SOLO storage, NON logica!
CREATE TABLE weekly_goals (
  id UUID PRIMARY KEY,
  user_id UUID,
  goal_type TEXT,
  target_value NUMERIC,
  ...
);
```

**Caratteristiche**:
- ✅ PostgreSQL (database relazionale)
- ✅ Row Level Security (RLS)
- ✅ Backup automatici
- ✅ Scalabile

---

### **3. Frontend (UI)**

**Dove**: **Vercel** (static + server-side rendering)  
**Cosa**: Next.js React components  
**File**: `app/**/page.jsx`, `components/**`

**Esempio**:
```jsx
// components/TaskWidget.jsx
export default function TaskWidget() {
  // ✅ Questo codice gira nel browser dell'utente
  // ✅ Chiama API routes per dati
  
  const response = await fetch('/api/tasks/list', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  
  return <div>{/* UI */}</div>
}
```

---

## 🔄 Flusso Completo Esempio

### **Scenario: Utente visualizza Task**

```
1. Browser (Frontend)
   └─> TaskWidget.jsx renderizza
       └─> fetch('/api/tasks/list')

2. Vercel (Backend)
   └─> app/api/tasks/list/route.js
       ├─> validateToken() ✅
       ├─> checkRateLimit() ✅
       └─> Query Supabase
           └─> supabase.from('weekly_goals').select()

3. Supabase (Database)
   └─> PostgreSQL esegue query
       ├─> RLS verifica user_id ✅
       └─> Ritorna dati

4. Vercel (Backend)
   └─> NextResponse.json({ tasks })

5. Browser (Frontend)
   └─> TaskWidget.jsx riceve dati
       └─> Renderizza UI
```

---

## 💡 Differenze Chiave

### **Backend (API Routes)**
- ✅ **Logica business**: validazione, calcoli, trasformazioni
- ✅ **Chiamate esterne**: OpenAI, altri servizi
- ✅ **Sicurezza**: rate limiting, validazione token
- ✅ **Dove**: Vercel serverless functions

### **Database (PostgreSQL)**
- ✅ **Solo storage**: tabelle, righe, colonne
- ✅ **Query SQL**: SELECT, INSERT, UPDATE, DELETE
- ✅ **Sicurezza**: RLS (Row Level Security)
- ✅ **Dove**: Supabase cloud PostgreSQL

---

## 🚀 Deploy

### **Backend Deploy**

```bash
# Push su GitHub
git push origin master

# Vercel auto-deploy
# ✅ Rileva app/api/**/route.js
# ✅ Crea serverless functions
# ✅ Deploy automatico
```

**Risultato**:
- `https://your-app.vercel.app/api/tasks/list` → Backend endpoint
- `https://your-app.vercel.app/api/tasks/generate` → Backend endpoint

### **Database**

- ✅ Già su Supabase (non serve deploy)
- ✅ Migration eseguite manualmente in Supabase Dashboard

---

## 📊 Confronto

| Componente | Dove | Cosa Fa | Tecnologia |
|------------|------|---------|------------|
| **Backend** | Vercel | Logica business, API | Next.js API Routes (Node.js) |
| **Database** | Supabase | Storage dati | PostgreSQL |
| **Frontend** | Vercel + Browser | UI React | Next.js + React |
| **Auth** | Supabase | Autenticazione | Supabase Auth (JWT) |

---

## ✅ Riassunto

**Backend = Next.js API Routes su Vercel**  
**Database = PostgreSQL su Supabase**  
**Frontend = Next.js React su Vercel**

**Il backend NON è in PostgreSQL!** PostgreSQL è solo il database dove salviamo i dati. Il backend (logica, API) gira su Vercel come serverless functions.

---

**Ultimo Aggiornamento**: 27 Gennaio 2026
